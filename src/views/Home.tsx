import { useEffect, useState } from 'react'
import { countdown, resolve, target } from '../../shared/time'
import { tidyRules } from '../../shared/text'
import { MAX_RULES_CHARS, MIN_RULES_CHARS } from '../../shared/types'
import { ApiError, fetchPage, readRules } from '../api'
import { htmlToRulesText } from '../extract'
import { go } from '../nav'
import { progress } from '../progress'
import { deleteContest, getContest, putContest, useContests, useSettings } from '../store'
import { describeWhen, mainDeadline, useNow } from './DeadlineHeader'
import { ZonePicker } from './ZonePicker'

async function contestId(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** This hackathon's own official rules: the example anyone can try without pasting anything. */
export const EXAMPLE_URL = 'https://learn-ai-basics.devpost.com/rules'

type Mode = 'paste' | 'link'

export function Home() {
  const [mode, setMode] = useState<Mode>('paste')
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState<'' | 'fetching' | 'reading'>('')
  const [error, setError] = useState('')
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!busy) return
    setSeconds(0)
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [busy === ''])

  async function check(how: Mode, value: string) {
    if (busy) return
    setError('')
    let rules = tidyRules(value)
    let url: string | undefined
    try {
      if (how === 'link') {
        if (!value.trim()) return setError(new ApiError('bad_url').message)
        setBusy('fetching')
        const page = await fetchPage(value.trim())
        rules = htmlToRulesText(page.html)
        url = page.finalUrl
        if (rules.length < MIN_RULES_CHARS) {
          setMode('paste')
          throw new ApiError('fetch_failed')
        }
      }
      if (rules.length < MIN_RULES_CHARS) throw new ApiError('too_short')
      if (rules.length > MAX_RULES_CHARS) throw new ApiError('too_long')
      const id = await contestId(rules)
      // The same rules again: open the saved contest, ticks and all.
      if (getContest(id)) return go(`#/c/${id}`)
      setBusy('reading')
      const { reading, model } = await readRules(rules)
      if (!reading.items.length) throw new ApiError('nothing_found')
      putContest({
        id,
        addedAt: new Date().toISOString(),
        source: url ? { kind: 'link', url } : { kind: 'paste' },
        text: rules,
        reading,
        model,
        ticked: [],
        dismissed: [],
      })
      go(`#/c/${id}`)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'fetch_failed') setMode('paste')
      setError(e instanceof ApiError ? e.message : new ApiError('reader_offline').message)
    } finally {
      setBusy('')
    }
  }

  function tryExample() {
    setMode('link')
    setLink(EXAMPLE_URL)
    void check('link', EXAMPLE_URL)
  }

  return (
    <div className="home">
      <header className="masthead">
        <a className="wordmark link" href="#/">
          Ruleproof
        </a>
      </header>
      <section className="hero">
        <h1>Every contest hides a checklist in its rules.</h1>
        <p>
          Paste the official rules. Ruleproof lists what to submit, what to build, who can enter and when it&rsquo;s due in your
          time, and pins every item to the sentence that says so.
        </p>
      </section>
      <section className="card input-card">
        <div className="modes" role="tablist" aria-label="How to give Ruleproof the rules">
          <button role="tab" aria-selected={mode === 'paste'} className={mode === 'paste' ? 'on' : ''} onClick={() => setMode('paste')} disabled={Boolean(busy)}>
            Paste the rules
          </button>
          <button role="tab" aria-selected={mode === 'link'} className={mode === 'link' ? 'on' : ''} onClick={() => setMode('link')} disabled={Boolean(busy)}>
            Rules page link
          </button>
        </div>
        {mode === 'paste' ? (
          <textarea
            aria-label="The rules"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Copy everything on the contest's official rules page and paste it here."
            disabled={Boolean(busy)}
            spellCheck={false}
          />
        ) : (
          <input
            type="url"
            className="link-input"
            aria-label="Rules page link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && check('link', link)}
            placeholder="https://contest.example.com/rules"
            disabled={Boolean(busy)}
            spellCheck={false}
          />
        )}
        <div className="actions">
          <button className="primary" onClick={() => check(mode, mode === 'paste' ? text : link)} disabled={Boolean(busy)}>
            {busy ? 'Working…' : 'Check the rules'}
          </button>
          {busy ? (
            <span className="progress" role="status">
              {busy === 'fetching'
                ? 'Fetching the page…'
                : seconds < 4
                  ? 'Reading the rules…'
                  : `Reading the rules and copying the proof… ${seconds}s (usually 20–40s)`}
            </span>
          ) : (
            <ZonePicker />
          )}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
      <p className="example">
        No rules handy?{' '}
        <button className="text-button" onClick={tryExample} disabled={Boolean(busy)}>
          Try it with this hackathon&rsquo;s rules
        </button>{' '}
        <span className="muted">(Build With AI: Basics on Devpost)</span>
      </p>
      <YourContests />
      <footer className="footer">
        Your contests and ticks stay in this browser. Rules are sent to the reader only to be read.{' '}
        <a href="https://github.com/mikey92/ruleproof" target="_blank" rel="noreferrer">
          Source on GitHub
        </a>
      </footer>
    </div>
  )
}

function YourContests() {
  const contests = useContests()
  const [settings] = useSettings()
  const now = useNow()
  const rows = contests.map((c) => {
    const main = mainDeadline(c)
    const when = main >= 0 ? resolve(c.reading.deadlines[main], settings.zone) : null
    const to = when ? target(when) : null
    const left = to ? countdown(to, now) : null
    return { c, when, to, left, p: progress(c) }
  })
  // Soonest open deadline first; closed and undated contests after.
  const rank = (r: (typeof rows)[number]) => (!r.to ? 2 : r.left?.closed ? 1 : 0)
  rows.sort((a, b) => rank(a) - rank(b) || (a.to && b.to ? a.to.toMillis() - b.to.toMillis() : 0))

  return (
    <section className="your-contests">
      <h2 className="label">Your contests</h2>
      {rows.length === 0 ? (
        <>
          <p className="empty">Contests you check stay here, in this browser, with their deadlines and your progress.</p>
          <ol className="how">
            <li>
              <strong>Give it the rules.</strong> Paste the official rules, or a link to the rules page.
            </li>
            <li>
              <strong>An AI reads them</strong> and lists what to submit, what to build, who can enter and the deadline,
              quoting the rules for every item.
            </li>
            <li>
              <strong>Ruleproof checks every quote</strong> against the rules before it shows the item. Anything it can&rsquo;t
              find word for word is set apart, never passed off as a requirement.
            </li>
          </ol>
        </>
      ) : (
        <ul>
          {rows.map(({ c, when, left, p }) => (
            <li key={c.id} className="contest-row">
              <a href={`#/c/${c.id}`} className="contest-link">
                <span className="contest-title">{c.reading.contest || 'Untitled contest'}</span>
                <span className="contest-due">
                  {when ? describeWhen(when, settings.zone).main : 'No deadline found'}
                  {when && (when.kind === 'no-time' || when.kind === 'no-zone') && <span className="muted"> · {when.kind === 'no-time' ? 'time' : 'zone'} not stated</span>}
                </span>
                {left && <span className={`contest-left${left.urgent ? ' urgent' : ''}`}>{left.text}</span>}
                <span className="contest-progress">
                  <span className="bar">
                    <span style={{ width: `${p.total ? (100 * p.done) / p.total : 0}%` }} />
                  </span>
                  {p.done} of {p.total} done
                </span>
              </a>
              <button
                className="delete"
                aria-label={`Delete ${c.reading.contest}`}
                onClick={() => window.confirm(`Delete ${c.reading.contest || 'this contest'} and its ticks from this browser?`) && deleteContest(c.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
