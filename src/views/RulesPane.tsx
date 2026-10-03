import { useEffect, useMemo, useRef } from 'react'
import type { Span } from '../../shared/verify'

export interface Mark {
  /** What the quote belongs to: "i3" (item), "d0" (date) or "j1" (judging criterion) */
  key: string
  span: Span
}

interface Segment {
  start: number
  end: number
  /** Keys whose quote covers this stretch of text */
  keys: string[]
}

/** Cuts the text at every quote boundary, so overlapping quotes can each be highlighted. */
function segments(length: number, marks: Mark[]): Segment[] {
  const cuts = new Set([0, length])
  for (const m of marks) {
    cuts.add(m.span.start)
    cuts.add(m.span.end)
  }
  const points = [...cuts].sort((a, b) => a - b)
  const out: Segment[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]
    const end = points[i + 1]
    if (end <= start) continue
    const keys = marks.filter((m) => m.span.start <= start && m.span.end >= end).map((m) => m.key)
    out.push({ start, end, keys })
  }
  return out
}

export function RulesPane({
  text,
  marks,
  selected,
  onSelect,
  sourceUrl,
}: {
  text: string
  marks: Mark[]
  selected: string | null
  onSelect: (key: string) => void
  sourceUrl?: string
}) {
  const pane = useRef<HTMLDivElement>(null)
  const shown = useRef(false)
  const parts = useMemo(() => segments(text.length, marks), [text, marks])

  // Bring the selected quote into view, a third of the way down the pane. A pane that has just opened (the sheet on
  // phones) jumps straight there; one already on screen glides, so the reader sees where the passage sits.
  useEffect(() => {
    const box = pane.current
    if (selected === null || !box) return
    const el = box.querySelector<HTMLElement>(`[data-first~="${selected}"]`)
    if (!el) return
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
    box.scrollTo({ top: Math.max(0, top - box.clientHeight / 3), behavior: shown.current ? 'smooth' : 'auto' })
    shown.current = true
  }, [selected])

  const firstSeen = new Set<string>()
  return (
    <div className="rules" ref={pane}>
      <div className="rules-head">
        <span className="label">The rules</span>
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="source-link">
            Original page
          </a>
        )}
      </div>
      <div className="rules-text">
        {parts.map((p) => {
          const chunk = text.slice(p.start, p.end)
          if (!p.keys.length) return <span key={p.start}>{chunk}</span>
          // The quotes that start in this segment, so the pane can scroll to the start of each one.
          const first = p.keys.filter((k) => !firstSeen.has(k))
          first.forEach((k) => firstSeen.add(k))
          const on = selected !== null && p.keys.includes(selected)
          return (
            <mark
              key={p.start}
              className={on ? 'on' : undefined}
              data-keys={p.keys.join(' ')}
              data-first={first.length ? first.join(' ') : undefined}
              onClick={() => onSelect(on ? selected! : p.keys[0])}
            >
              {chunk}
            </mark>
          )
        })}
      </div>
    </div>
  )
}
