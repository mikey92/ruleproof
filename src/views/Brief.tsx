import { useEffect, useMemo, useState } from 'react'
import { contestName } from '../../shared/text'
import { SECTIONS, type Contest, type Criterion, type Item } from '../../shared/types'
import { checkAll, indexText, type Checked } from '../../shared/verify'
import { progress } from '../progress'
import { setDismissed, setTicked, useSettings } from '../store'
import { DeadlineHeader } from './DeadlineHeader'
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

export function Brief({ contest }: { contest: Contest }) {
  const { reading } = contest
  const [settings] = useSettings()
  const ix = useMemo(() => indexText(contest.text), [contest.text])
  const items = useMemo(() => checkAll(ix, reading.items), [ix, reading.items])
  const dates = useMemo(() => checkAll(ix, reading.deadlines), [ix, reading.deadlines])
  const judging = useMemo(() => checkAll(ix, reading.judging), [ix, reading.judging])
  const marks = useMemo<Mark[]>(() => {
    const out: Mark[] = []
    for (const [prefix, list] of [['i', items], ['d', dates], ['j', judging]] as const) {
      for (const c of list) if (c.span) out.push({ key: `${prefix}${c.index}`, span: c.span })
    }
    return out
  }, [items, dates, judging])
  const provenKeys = useMemo(() => new Set(marks.map((m) => m.key)), [marks])
  const proven = items.filter((i) => i.span)
  const unproven = items.filter((i) => !i.span && !contest.dismissed.includes(i.index))
  const ticked = new Set(contest.ticked)
  const { done, total } = progress(contest)
  const [selected, setSelected] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const wide = useWide()

  function select(key: string) {
    setSelected(key)
    if (!wide) setSheetOpen(true)
  }

  // A highlight clicked in the rules brings its entry into view in the checklist.
  function selectFromRules(key: string) {
    setSelected(key)
    document.getElementById(`entry-${key}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const pane = (
    <RulesPane text={contest.text} marks={marks} selected={selected} onSelect={selectFromRules} sourceUrl={contest.source.url} />
  )

  return (
    <div className="brief">
      <header className="masthead">
        <a className="wordmark link" href="#/">
          Ruleproof
        </a>
        <a className="back" href="#/">
          Your contests
        </a>
      </header>
      <div className="brief-grid">
        <main className="brief-main">
          <h1 className="contest-name">{contestName(reading.contest)}</h1>
          <DeadlineHeader contest={contest} zone={settings.zone} isProven={(k) => provenKeys.has(k)} onSelect={select} />
          <div className="progress-line" aria-live="polite">
            <span className="bar">
              <span style={{ width: `${total ? (100 * done) / total : 0}%` }} />
            </span>
            <span>
              {done} of {total} done
            </span>
            <span className="tally">
              {proven.length} of {items.length} items found word for word in the rules
            </span>
          </div>
          {SECTIONS.map(({ key, title }) => {
            const list = proven.filter((i) => i.value.section === key)
            if (!list.length) return null
            return (
              <section key={key} className="group">
                <h2>{title}</h2>
                <ul>
                  {list.map((c) => (
                    <ItemRow
                      key={c.index}
                      c={c}
                      selected={selected === `i${c.index}`}
                      onSelect={select}
                      ticked={ticked.has(c.index)}
                      onTick={(on) => setTicked(contest.id, c.index, on)}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
          {judging.length > 0 && (
            <section className="group judging">
              <h2>How it&rsquo;s judged</h2>
              <ul>
                {judging.map((c) => (
                  <CriterionRow key={c.index} c={c} selected={selected === `j${c.index}`} onSelect={select} />
                ))}
              </ul>
            </section>
          )}
          {unproven.length > 0 && (
            <section className="group unproven">
              <h2>Not found in the rules</h2>
              <p className="note">The rules don&rsquo;t say these word for word. Check before you rely on them.</p>
              <ul>
                {unproven.map((c) => (
                  <ItemRow key={c.index} c={c} selected={false} onDismiss={() => setDismissed(contest.id, c.index, true)} />
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

function Proof({ quote, found, onClick }: { quote: string; found: boolean; onClick?: () => void }) {
  return found ? (
    <button className="proof found" onClick={onClick} aria-label={`Show in the rules: ${quote}`}>
      <span className="proof-status">In the rules</span>
      <q>{quote}</q>
    </button>
  ) : (
    <div className="proof missing">
      <span className="proof-status">Not found in the rules</span>
      <q>{quote}</q>
    </div>
  )
}

function ItemRow({
  c,
  selected,
  onSelect,
  ticked,
  onTick,
  onDismiss,
}: {
  c: Checked<Item>
  selected: boolean
  onSelect?: (key: string) => void
  ticked?: boolean
  onTick?: (on: boolean) => void
  onDismiss?: () => void
}) {
  const key = `i${c.index}`
  return (
    <li id={`entry-${key}`} className={`item${selected ? ' selected' : ''}${ticked ? ' ticked' : ''}`}>
      {onTick && (
        <label className="tick">
          <input type="checkbox" checked={Boolean(ticked)} onChange={(e) => onTick(e.target.checked)} aria-label={c.value.title} />
          <span className="box" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M3.5 8.5l3 3 6-7" />
            </svg>
          </span>
        </label>
      )}
      <div className="item-body">
        <div className="item-title">{c.value.title}</div>
        {c.value.detail && <div className="item-detail">{c.value.detail}</div>}
        <Proof quote={c.value.quote} found={Boolean(c.span)} onClick={() => onSelect?.(key)} />
        {onDismiss && (
          <button className="dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </li>
  )
}

function CriterionRow({ c, selected, onSelect }: { c: Checked<Criterion>; selected: boolean; onSelect: (key: string) => void }) {
  const key = `j${c.index}`
  return (
    <li id={`entry-${key}`} className={`item criterion${selected ? ' selected' : ''}`}>
      <div className="item-body">
        <div className="item-title">
          {c.value.name}
          {c.value.weight && <span className="weight">{c.value.weight}</span>}
        </div>
        <Proof quote={c.value.quote} found={Boolean(c.span)} onClick={() => onSelect(key)} />
      </div>
    </li>
  )
}
