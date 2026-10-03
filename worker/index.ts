// Ruleproof's server: reads rules with the AI (the key must never reach the page) and serves the built page.

import { MAX_RULES_CHARS, MIN_RULES_CHARS } from '../shared/types'
import { LlmError, llmConfigured, type LlmEnv } from './llm'
import { readRules } from './reader'

export interface Env extends LlmEnv {
  READINGS?: KVNamespace
  READ_LIMIT?: RateLimit
  FETCH_LIMIT?: RateLimit
  ASSETS: Fetcher
}

/** Rules pages are rarely over 1 MB; anything far bigger is not a rules page. */
const MAX_PAGE_BYTES = 3_000_000

/** Only public web addresses: no local machines or private networks. */
function publicHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (!h.includes('.') && !h.includes(':')) return false
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false
  const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return false
  }
  if (h.includes(':') && (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80'))) return false
  return true
}

/** Fetches a rules page and passes its HTML through untouched; the page itself extracts the text (src/extract.ts),
 *  which keeps this Worker far inside its CPU budget. */
async function handleFetch(request: Request, env: Env): Promise<Response> {
  let target: URL
  try {
    target = new URL(new URL(request.url).searchParams.get('url') ?? '')
  } catch {
    return json({ error: 'bad_url' }, 400)
  }
  if (!/^https?:$/.test(target.protocol) || !publicHost(target.hostname)) return json({ error: 'bad_url' }, 400)
  if (env.FETCH_LIMIT && !(await env.FETCH_LIMIT.limit({ key: visitor(request) })).success) {
    return json({ error: 'rate_limited' }, 429)
  }
  let res: Response
  try {
    res = await fetch(target.toString(), {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; Ruleproof/1.0; reads contest rules for one person)',
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    return json({ error: 'fetch_failed' }, 502)
  }
  const type = res.headers.get('content-type') ?? ''
  if (!res.ok || !res.body) return json({ error: 'fetch_failed', status: res.status }, 502)
  if (!/text\/html|application\/xhtml\+xml|text\/plain/i.test(type)) return json({ error: 'fetch_failed', type }, 415)
  if (Number(res.headers.get('content-length') ?? 0) > MAX_PAGE_BYTES) return json({ error: 'fetch_failed' }, 413)
  return new Response(res.body, {
    headers: { 'content-type': type, 'x-final-url': res.url || target.toString(), 'cache-control': 'no-store' },
  })
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function visitor(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? 'local'
}

async function handleRead(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  let text: unknown
  try {
    text = ((await request.json()) as { text?: unknown }).text
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  if (typeof text !== 'string') return json({ error: 'bad_request' }, 400)
  if (text.trim().length < MIN_RULES_CHARS) return json({ error: 'too_short' }, 400)
  if (text.length > MAX_RULES_CHARS) return json({ error: 'too_long' }, 413)
  if (!llmConfigured(env)) return json({ error: 'reader_offline' }, 503)
  if (env.READ_LIMIT && !(await env.READ_LIMIT.limit({ key: visitor(request) })).success) {
    return json({ error: 'rate_limited' }, 429)
  }
  try {
    return json(await readRules(env, text, ctx))
  } catch (e) {
    console.error('reading failed', e instanceof LlmError ? e.status : '', String(e).slice(0, 300))
    return json({ error: 'reader_offline' }, 503)
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/read' && request.method === 'POST') return handleRead(request, env, ctx)
    if (url.pathname === '/api/fetch' && request.method === 'GET') return handleFetch(request, env)
    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404)
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
