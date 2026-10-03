import { useEffect, useState } from 'react'
import { tidyRules } from '../../shared/text'
import { MAX_RULES_CHARS, MIN_RULES_CHARS, type Contest } from '../../shared/types'
import { ApiError, readRules } from '../api'
import { ZonePicker } from './ZonePicker'

async function contestId(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function Home({ onRead }: { onRead: (c: Contest) => void }) {
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
    setBusy(true)
    try {
      const { reading, model } = await readRules(rules)
      if (!reading.items.length) throw new ApiError('nothing_found')
      onRead({
        id: await contestId(rules),
        addedAt: new Date().toISOString(),
        source: { kind: 'paste' },
        text: rules,
        reading,
        model,
        ticked: [],
        dismissed: [],
      })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : new ApiError('reader_offline').message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="home">
      <header className="masthead">
        <span className="wordmark">Ruleproof</span>
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
          <ZonePicker />
          <button className="primary" onClick={check} disabled={busy}>
            {busy ? 'Reading…' : 'Check the rules'}
          </button>
          {busy && (
            <span className="progress" role="status">
              {seconds < 4 ? 'Reading the rules…' : `Reading the rules and copying the proof… ${seconds}s`}
            </span>
          )}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  )
}
