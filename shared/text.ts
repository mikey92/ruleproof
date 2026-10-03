/** Rules text as Ruleproof keeps it: Unix line breaks, no trailing spaces, at most one blank line in a row. */
export function tidyRules(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const SMALL = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'])

/** Contest names in rules are often set in capitals ("BUILD WITH AI HACKATHON"); show them in title case, keeping short
 *  acronyms ("AI", "API") as they are. Names that already mix cases are left alone. */
export function contestName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return 'Untitled contest'
  if (trimmed !== trimmed.toUpperCase() || !/[A-Z]/.test(trimmed)) return trimmed
  return trimmed
    .split(/(\s+)/)
    .map((word, i) => {
      if (/^\s+$/.test(word)) return word
      const lower = word.toLowerCase()
      if (SMALL.has(lower)) return i === 0 ? lower[0].toUpperCase() + lower.slice(1) : lower
      if (/^[A-Z]{2,3}$/.test(word)) return word
      return lower.replace(/(^|[-/(])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase())
    })
    .join('')
}
