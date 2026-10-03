// A fetched rules page to plain text, the way a person would copy it: the page's main content (found by Mozilla's
// Readability, as in Firefox's Reader View), with paragraphs and list items kept on their own lines.

import { Readability } from '@mozilla/readability'
import { tidyRules } from '../shared/text'

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'IFRAME', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'NAV', 'FORM'])
const BLOCK = new Set([
  'P', 'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'ASIDE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI', 'DL', 'DT', 'DD', 'TABLE', 'THEAD', 'TBODY', 'TR', 'BLOCKQUOTE', 'PRE', 'FIGURE', 'FIGCAPTION', 'HR',
])

function toText(root: Node): string {
  let out = ''
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node as Text).data.replace(/\s+/g, ' ')
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const tag = (node as Element).tagName
    if (SKIP.has(tag)) return
    if (tag === 'BR') {
      out += '\n'
      return
    }
    const block = BLOCK.has(tag)
    if (block) out += tag === 'P' || /^H\d$/.test(tag) ? '\n\n' : '\n'
    if (tag === 'LI') out += '- '
    if (tag === 'TD' || tag === 'TH') out += ' '
    node.childNodes.forEach(walk)
    if (block) out += tag === 'P' || /^H\d$/.test(tag) ? '\n\n' : '\n'
  }
  walk(root)
  // A list item that wraps a paragraph leaves its "- " alone on a line; join it to the item's text.
  return tidyRules(out.replace(/[ \t]*\n[ \t]*/g, '\n').replace(/^-\n+(?=\S)/gm, '- '))
}

export function htmlToRulesText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  let main = ''
  try {
    const article = new Readability(doc.cloneNode(true) as Document, { charThreshold: 300 }).parse()
    if (article?.content) main = toText(new DOMParser().parseFromString(article.content, 'text/html').body)
  } catch {
    // Readability gave up: fall back to the whole page.
  }
  if (main.length >= 300) return main
  return doc.body ? toText(doc.body) : ''
}
