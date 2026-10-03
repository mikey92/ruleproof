import { DateTime } from 'luxon'
import { useEffect, useState } from 'react'
import { deadlineIcs } from '../../shared/ics'
import { countdown, formatDate, formatInZone, resolve, target, type When } from '../../shared/time'
import { contestName } from '../../shared/text'
import type { Contest } from '../../shared/types'
import { ZonePicker } from './ZonePicker'

export function useNow(everyMs = 30_000): DateTime {
  const [now, setNow] = useState(() => DateTime.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(DateTime.now()), everyMs)
    return () => clearInterval(timer)
  }, [everyMs])
  return now
}

export function describeWhen(w: When, zone: string): { main: string; caveat?: string } {
  switch (w.kind) {
    case 'exact':
      return { main: formatInZone(w.instant, zone) }
    case 'no-zone':
      return { main: `${formatDate(w.local)} · ${w.local.toFormat('h:mm a')}`, caveat: 'Time zone not stated in the rules' }
    case 'no-time':
      return { main: formatDate(w.local), caveat: 'Time not stated in the rules' }
    default:
      return { main: 'Date unclear', caveat: "Couldn't read this date" }
  }
}

/** The submission deadline, or the first date if the rules name no submission deadline. */
export function mainDeadline(contest: Contest): number {
  const i = contest.reading.deadlines.findIndex((d) => d.kind === 'submission')
  return i >= 0 ? i : contest.reading.deadlines.length ? 0 : -1
}

function download(name: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'contest'
  )
}

export function DeadlineHeader({
  contest,
  zone,
  isProven,
  onSelect,
}: {
  contest: Contest
  zone: string
  isProven: (key: string) => boolean
  onSelect: (key: string) => void
}) {
  const now = useNow()
  const { deadlines } = contest.reading
  const main = mainDeadline(contest)

  if (main < 0) {
    return (
      <section className="due">
        <p className="due-missing">No dates found in the rules. Check the contest page for the deadline.</p>
        <ZonePicker />
      </section>
    )
  }

  const d = deadlines[main]
  const when = resolve(d, zone)
  const to = target(when)
  const shown = describeWhen(when, zone)
  const left = to ? countdown(to, now) : null
  const proven = isProven(`d${main}`)

  function addToCalendar() {
    if (!to) return
    download(
      `${slug(contestName(contest.reading.contest))}-deadline.ics`,
      deadlineIcs({ uid: `${contest.id}-${main}`, contest: contestName(contest.reading.contest), deadline: to, quote: d.quote, url: contest.source.url, now: DateTime.now() }),
    )
  }

  return (
    <section className="due" id={`entry-d${main}`}>
      <div className="due-label">
        <span>{d.kind === 'submission' ? 'Due' : d.label}</span>
        <ZonePicker />
      </div>
      <div className={`due-time${left?.urgent ? ' urgent' : ''}${left?.closed ? ' closed' : ''}`}>{shown.main}</div>
      {left && <div className={`countdown${left.urgent ? ' urgent' : ''}`}>{left.text}</div>}
      {shown.caveat && <div className="caveat">{shown.caveat}</div>}
      <button className={`due-quote proof ${proven ? 'found' : 'missing'}`} onClick={() => proven && onSelect(`d${main}`)} disabled={!proven}>
        <span className="proof-status">{proven ? 'The rules say' : 'Not found in the rules'}</span>
        <q>{d.quote}</q>
      </button>
      <div className="due-actions">
        <button className="secondary" onClick={addToCalendar} disabled={!to}>
          Add to calendar
        </button>
      </div>
      {deadlines.length > 1 && (
        <ul className="other-dates">
          {deadlines.map((o, i) => {
            if (i === main) return null
            const w = describeWhen(resolve(o, zone), zone)
            const key = `d${i}`
            return (
              <li key={key} id={`entry-${key}`}>
                <button className="link-like" onClick={() => isProven(key) && onSelect(key)} disabled={!isProven(key)}>
                  <span className="other-label">{o.label}</span>
                  <span className="other-time">
                    {w.main}
                    {w.caveat ? ` (${w.caveat.toLowerCase()})` : ''}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
