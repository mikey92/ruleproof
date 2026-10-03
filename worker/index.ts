// Ruleproof's server: reads rules with the AI (the key must never reach the page) and serves the built page.

import { MAX_RULES_CHARS, MIN_RULES_CHARS } from '../shared/types'
import { LlmError, llmConfigured, type LlmEnv } from './llm'
import { readRules } from './reader'

export interface Env extends LlmEnv {
  READINGS?: KVNamespace
  READ_LIMIT?: RateLimit
  ASSETS: Fetcher
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
    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404)
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
