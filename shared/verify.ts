// The quote checker: Ruleproof's kernel. The AI must back every checklist item with words copied from the rules, and
// nothing counts as proven until those words are found in the rules text here, by plain code.
//
// Matching is exact after removing differences that never change meaning: letter case, runs of spaces and line
// breaks, curly versus straight quote marks, dash styles, list bullets at the start of a line, and invisible
// characters. Nothing fuzzier: a near miss is exactly what an invented requirement looks like.

export interface Indexed {
  text: string
  /** The normalized rules text */
  norm: string
  /** For each character of norm, the position in text it came from; one extra entry holds text.length. */
  map: number[]
}

export interface Span {
  start: number
  end: number
}

/** A quote shorter than this, once normalized, is too generic to prove anything ("the video"). */
export const MIN_QUOTE = 15
/** With an ellipsis, each quoted part must be at least this long, and follow the previous part within GAP. */
const MIN_PART = 8
const GAP = 400

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

// Characters are listed by code point so the source stays plain ASCII.
const LINE_BREAKS = new Set([0x0a, 0x0b, 0x0c, 0x0d, 0x85, 0x2028, 0x2029])
const SPACES = new Set([0x09, 0x20, 0xa0, 0x1680, ...range(0x2000, 0x200a), 0x202f, 0x205f, 0x3000, ...LINE_BREAKS])
const INVISIBLE = new Set([0xad, 0x200b, 0x200c, 0x200d, 0x2060, 0xfeff])
// -, *, bullet, middle dot, small and large black squares/circles, en and em dash
const BULLETS = new Set([0x2d, 0x2a, 0x2022, 0xb7, 0x25aa, 0x25cf, 0x2013, 0x2014])

const FOLD = new Map<number, string>([
  // single quotes, primes, backtick, acute accent
  ...[0x2018, 0x2019, 0x201a, 0x201b, 0x2032, 0x60, 0xb4].map((c): [number, string] => [c, "'"]),
  // double quotes, double prime, guillemets
  ...[0x201c, 0x201d, 0x201e, 0x201f, 0x2033, 0xab, 0xbb].map((c): [number, string] => [c, '"']),
  // hyphens, figure dash, en and em dashes, horizontal bar, minus sign
  ...[0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212].map((c): [number, string] => [c, '-']),
  // ellipsis
  [0x2026, '...'],
])

function fold(ch: string): string {
  const mapped = FOLD.get(ch.charCodeAt(0))
  if (mapped) return mapped
  const lower = ch.toLowerCase()
  return lower.length === 1 ? lower : ch
}

export function indexText(text: string): Indexed {
  let norm = ''
  const map: number[] = []
  let spaceAt = -1
  let lineStart = true // the start of the text counts as the start of a line
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (INVISIBLE.has(code)) continue
    if (SPACES.has(code)) {
      if (spaceAt < 0) spaceAt = i
      if (LINE_BREAKS.has(code)) lineStart = true
      continue
    }
    // A list bullet at the start of a line ("- ", "* ") is layout, not wording: skip it and the space after it.
    if (lineStart && BULLETS.has(code) && i + 1 < text.length && SPACES.has(text.charCodeAt(i + 1))) {
      if (spaceAt < 0) spaceAt = i
      continue
    }
    if (spaceAt >= 0) {
      if (norm.length) {
        norm += ' '
        map.push(spaceAt)
      }
      spaceAt = -1
    }
    lineStart = false
    for (const c of fold(text[i])) {
      norm += c
      map.push(i)
    }
  }
  map.push(text.length)
  return { text, norm, map }
}

/** The quote as it will be searched for: normalized, without wrapping quote marks or trailing punctuation. */
export function normalizeQuote(quote: string): string {
  return trimEnd(indexText(quote).norm.replace(/^[ '"]+/, ''))
}

function trimEnd(s: string): string {
  return s.replace(/[ '".,;:!?)-]+$/, '')
}

function span(ix: Indexed, from: number, to: number): Span {
  return { start: ix.map[from], end: ix.map[to - 1] + 1 }
}

/** Where the quote appears in the rules text, or null if the rules do not say it word for word. */
export function locate(ix: Indexed, quote: string): Span | null {
  const q = normalizeQuote(quote)
  if (q.length < MIN_QUOTE) return null
  const at = ix.norm.indexOf(q)
  if (at >= 0) return span(ix, at, at + q.length)
  if (!q.includes('...')) return null
  // "First part ... second part": every part found, in order, close together.
  const parts = q
    .split('...')
    .map((p) => trimEnd(p.replace(/^[ '".,;:-]+/, '')))
    .filter((p) => p.length > 0)
  if (parts.length < 2 || parts.some((p) => p.length < MIN_PART)) return null
  let start = -1
  let end = -1
  for (const p of parts) {
    const k = ix.norm.indexOf(p, end < 0 ? 0 : end)
    if (k < 0 || (end >= 0 && k - end > GAP)) return null
    if (start < 0) start = k
    end = k + p.length
  }
  return span(ix, start, end)
}

export interface Checked<T> {
  value: T
  index: number
  span: Span | null
}

/** Locates the quote of every entry. */
export function checkAll<T extends { quote: string }>(ix: Indexed, entries: T[]): Checked<T>[] {
  return entries.map((value, index) => ({ value, index, span: locate(ix, value.quote) }))
}
