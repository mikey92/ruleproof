/** Rules text as Ruleproof keeps it: Unix line breaks, no trailing spaces, at most one blank line in a row. */
export function tidyRules(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
