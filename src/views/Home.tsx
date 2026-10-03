import { useEffect, useState } from 'react'
import { countdown, resolve, target } from '../../shared/time'
import { tidyRules } from '../../shared/text'
import { MAX_RULES_CHARS, MIN_RULES_CHARS } from '../../shared/types'
import { ApiError, readRules } from '../api'
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

export function Home() {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!busy) return
    setSeconds(0)
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [busy])

  async function check() {
    if (busy) return
    const rules = tidyRules(text)
    if (rules.length < MIN_RULES_CHARS) return setError(new ApiError('too_short').message)
    if (rules.length > MAX_RULES_CHARS) return setError(new ApiError('too_long').message)
    setError('')
    const id = await contestId(rules)
    // The same rules again: open the saved contest, ticks and all.
    if (getContest(id)) return go(`#/c/${id}`)
    setBusy(true)
    try {
      const { reading, model } = await readRules(rules)
      if (!reading.items.length) throw new ApiError('nothing_found')
      putContest({
        id,
        addedAt: new Date().toISOString(),
        source: { kind: 'paste' },
        text: rules,
        reading,
        model,
        ticked: [],
        dismissed: [],
      })
      go(`#/c/${id}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : new ApiError('reader_offline').message)
    } finally {
      setBusy(false)
    }
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
        <label htmlFor="rules" className="label">
          Paste the rules
        </label>
        <textarea
          id="rules"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Copy everything on the contest's official rules page and paste it here."
          disabled={busy}
          spellCheck={false}
        />
        <div className="actions">
          <button className="primary" onClick={check} disabled={busy}>
            {busy ? 'Reading…' : 'Check the rules'}
          </button>
          {busy ? (
            <span className="progress" role="status">
              {seconds < 4 ? 'Reading the rules…' : `Reading the rules and copying the proof… ${seconds}s`}
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
      <YourContests />
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
        <p className="empty">Contests you check stay here, in this browser, with their deadlines and your progress.</p>
      ) : (
        <ul>
          {rows.map(({ c, when, left, p }) => (
            <li key={c.id} className="contest-row">
              <a href={`#/c/${c.id}`} className="contest-link">
                <span className="contest-title">{c.reading.contest || 'Untitled contest'}</span>
                <span className="contest-due">{when ? describeWhen(when, settings.zone).main : 'No deadline found'}</span>
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
