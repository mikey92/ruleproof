// The AI is reached through the OpenAI Responses API shape, in one of two ways, chosen by which secrets are set:
//   LLM_RELAY_URL + LLM_RELAY_KEY  the maintainer's relay, which runs the same request on their ChatGPT plan from their
//                                  own machine (the plan's sign-in never leaves it)
//   OPENAI_API_KEY                 the OpenAI API directly, for anyone else running this project
// LLM_MODEL picks the model.

export interface LlmEnv {
  LLM_RELAY_URL?: string
  LLM_RELAY_KEY?: string
  OPENAI_API_KEY?: string
  LLM_MODEL?: string
}

export type ResponseItem = Record<string, any>

export class LlmError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export function modelName(env: LlmEnv): string {
  return env.LLM_MODEL || 'gpt-5.5'
}

export function llmConfigured(env: LlmEnv): boolean {
  return Boolean((env.LLM_RELAY_URL && env.LLM_RELAY_KEY) || env.OPENAI_API_KEY)
}

async function post(url: string, headers: Record<string, string>, body: unknown, signal: AbortSignal): Promise<ResponseItem[]> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new LlmError(res.status, `model HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = (await res.json()) as { output?: ResponseItem[] }
  return data.output ?? []
}

/** A reading usually comes back in 15 to 45 seconds, but now and then one takes far longer. When an answer is that
 *  late, the same request goes out again and whichever answer arrives first is used. */
const HEDGE_AFTER_MS = 50_000

/** One Responses call, sent a second time if the first is slow; returns the first answer's output items. */
export async function respond(env: LlmEnv, body: Record<string, unknown>, timeoutMs = 110_000): Promise<ResponseItem[]> {
  const deadline = AbortSignal.timeout(timeoutMs)
  const calls: AbortController[] = []
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await new Promise<ResponseItem[]>((resolve, reject) => {
      let running = 0
      const start = () => {
        const c = new AbortController()
        calls.push(c)
        running++
        once(env, body, AbortSignal.any([deadline, c.signal])).then(resolve, (e) => {
          // A failure counts only when no other call is still on its way.
          if (--running === 0) reject(e)
        })
      }
      start()
      timer = setTimeout(start, HEDGE_AFTER_MS)
    })
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    for (const c of calls) c.abort()
  }
}

async function once(env: LlmEnv, body: Record<string, unknown>, signal: AbortSignal): Promise<ResponseItem[]> {
  if (env.LLM_RELAY_URL && env.LLM_RELAY_KEY) {
    // The plan's endpoint only streams; the relay reads the stream and returns the finished answer (x-relay-collect).
    return post(
      `${env.LLM_RELAY_URL}/responses`,
      { 'x-relay-key': env.LLM_RELAY_KEY, 'x-relay-collect': '1', 'user-agent': 'ruleproof-worker/1.0' },
      { ...body, store: false, stream: true },
      signal,
    )
  }
  if (env.OPENAI_API_KEY) {
    return post('https://api.openai.com/v1/responses', { authorization: `Bearer ${env.OPENAI_API_KEY}` }, { ...body, store: false }, signal)
  }
  throw new LlmError(503, 'no model configured')
}

export function outputText(output: ResponseItem[]): string {
  return output
    .filter((item) => item.type === 'message')
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .filter((part) => part.type === 'output_text')
    .map((part) => part.text)
    .join('')
}
