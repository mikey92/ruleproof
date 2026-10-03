import { useEffect, useMemo, useState } from 'react'
import { SECTIONS, type Contest, type Item } from '../../shared/types'
import { checkAll, indexText, type Checked } from '../../shared/verify'
import { RulesPane, type Mark } from './RulesPane'

const WIDE = '(min-width: 1024px)'

function useWide(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches)
  useEffect(() => {
    const mq = window.matchMedia(WIDE)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

export function Brief({ contest, onHome }: { contest: Contest; onHome: () => void }) {
  const { reading } = contest
  const ix = useMemo(() => indexText(contest.text), [contest.text])
  const items = useMemo(() => checkAll(ix, reading.items), [ix, reading.items])
  const marks = useMemo<Mark[]>(() => items.flatMap((c) => (c.span ? [{ index: c.index, span: c.span }] : [])), [items])
  const proven = items.filter((i) => i.span)
  const unproven = items.filter((i) => !i.span)
  const [selected, setSelected] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const wide = useWide()

  function select(index: number) {
    setSelected(index)
    if (!wide) setSheetOpen(true)
  }

  // A highlight clicked in the rules brings its item into view in the checklist.
  function selectFromRules(index: number) {
    setSelected(index)
    document.getElementById(`item-${index}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const pane = (
    <RulesPane
      text={contest.text}
      marks={marks}
      selected={selected}
      onSelect={selectFromRules}
      sourceUrl={contest.source.url}
    />
  )

  return (
    <div className="brief">
      <header className="masthead">
        <button className="wordmark link" onClick={onHome}>
          Ruleproof
        </button>
      </header>
      <div className="brief-grid">
        <main className="brief-main">
          <h1 className="contest-name">{reading.contest || 'Untitled contest'}</h1>
          <p className="tally">
            {proven.length} of {items.length} items found word for word in the rules
          </p>
          {SECTIONS.map(({ key, title }) => {
            const list = proven.filter((i) => i.value.section === key)
            if (!list.length) return null
            return (
              <section key={key} className="group">
                <h2>{title}</h2>
                <ul>
                  {list.map((c) => (
                    <ItemRow key={c.index} c={c} selected={selected === c.index} onSelect={select} />
                  ))}
                </ul>
              </section>
            )
          })}
          {unproven.length > 0 && (
            <section className="group unproven">
              <h2>Not found in the rules</h2>
              <p className="note">The rules don&rsquo;t say these word for word. Check before you rely on them.</p>
              <ul>
                {unproven.map((c) => (
                  <ItemRow key={c.index} c={c} selected={false} />
                ))}
              </ul>
            </section>
          )}
        </main>
        {wide && <aside className="brief-rules">{pane}</aside>}
      </div>
      {!wide && sheetOpen && (
        <div className="sheet" role="dialog" aria-label="The rules">
          <button className="sheet-close" onClick={() => setSheetOpen(false)}>
            Back to the checklist
          </button>
          {pane}
        </div>
      )}
    </div>
  )
}

function ItemRow({ c, selected, onSelect }: { c: Checked<Item>; selected: boolean; onSelect?: (index: number) => void }) {
  const proven = Boolean(c.span)
  return (
    <li id={`item-${c.index}`} className={`item${selected ? ' selected' : ''}`}>
      <div className="item-title">{c.value.title}</div>
      {c.value.detail && <div className="item-detail">{c.value.detail}</div>}
      {proven ? (
        <button className="proof found" onClick={() => onSelect?.(c.index)} aria-label={`Show in the rules: ${c.value.quote}`}>
          <span className="proof-status">In the rules</span>
          <q>{c.value.quote}</q>
        </button>
      ) : (
        <div className="proof missing">
          <span className="proof-status">Not found in the rules</span>
          <q>{c.value.quote}</q>
        </div>
      )}
    </li>
  )
}
