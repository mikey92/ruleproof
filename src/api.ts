// Calls to Ruleproof's server, with its error codes turned into the messages people see.

import type { ReadResult } from '../shared/types'

const MESSAGES: Record<string, string> = {
  too_short: "That's too short to be a rules page. Paste the whole rules text.",
  too_long: "That's more than Ruleproof can read at once. Paste just the official rules.",
  reader_offline: 'The rules reader is offline right now. Try again in a minute.',
  rate_limited: 'Too many readings in a row. Wait a minute and try again.',
  nothing_found: 'No requirements found. Is this the official rules page?',
  bad_url: "That doesn't look like a web page address. It should start with https://",
  fetch_failed: "Couldn't read that page. Copy the rules text and paste it instead.",
}

export class ApiError extends Error {
  constructor(readonly code: string) {
    super(MESSAGES[code] ?? MESSAGES.reader_offline)
  }
}

export async function readRules(text: string): Promise<ReadResult> {
  let res: Response
  try {
    res = await fetch('/api/read', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch {
    throw new ApiError('reader_offline')
  }
  const data = (await res.json().catch(() => ({}))) as Partial<ReadResult> & { error?: string }
  if (!res.ok || !data.reading) throw new ApiError(data.error ?? 'reader_offline')
  return data as ReadResult
}

/** The HTML of a rules page, fetched by the server (browsers may not read other sites directly). */
export async function fetchPage(url: string): Promise<{ html: string; finalUrl: string }> {
  let res: Response
  try {
    res = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`)
  } catch {
    throw new ApiError('fetch_failed')
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(data.error === 'bad_url' || data.error === 'rate_limited' ? data.error : 'fetch_failed')
  }
  return { html: await res.text(), finalUrl: res.headers.get('x-final-url') || url }
}
