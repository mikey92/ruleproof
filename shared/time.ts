// Deadlines as exact moments, shown in the reader's own time zone. The AI only reports the date, time and zone the
// rules state; turning them into a moment and converting it is done here, with Luxon's time zone data.

import { DateTime } from 'luxon'
import type { Deadline } from './types'

export type When =
  /** Date, time and zone all stated */
  | { kind: 'exact'; instant: DateTime }
  /** A time, but no zone: shown as written, counted down in the reader's zone */
  | { kind: 'no-zone'; local: DateTime }
  /** A date only: counted down to the start of that day */
  | { kind: 'no-time'; local: DateTime; zone: string }
  | { kind: 'invalid' }

export function validZone(zone: string): boolean {
  return Boolean(zone) && DateTime.now().setZone(zone).isValid
}

export function resolve(d: Deadline, readerZone: string): When {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return { kind: 'invalid' }
  const time = /^\d{1,2}:\d{2}$/.test(d.time) ? d.time.padStart(5, '0') : ''
  const zone = validZone(d.zone) ? d.zone : ''
  if (!time) {
    const local = DateTime.fromISO(d.date, { zone: zone || readerZone })
    return local.isValid ? { kind: 'no-time', local, zone } : { kind: 'invalid' }
  }
  if (!zone) {
    const local = DateTime.fromISO(`${d.date}T${time}`, { zone: readerZone })
    return local.isValid ? { kind: 'no-zone', local } : { kind: 'invalid' }
  }
  const instant = DateTime.fromISO(`${d.date}T${time}`, { zone })
  return instant.isValid ? { kind: 'exact', instant } : { kind: 'invalid' }
}

/** The moment a countdown runs to, if there is one. */
export function target(w: When): DateTime | null {
  if (w.kind === 'exact') return w.instant
  if (w.kind === 'no-zone' || w.kind === 'no-time') return w.local
  return null
}

// en-US has no short names for some zones and would print "GMT+9"; these read better.
const SHORT: Record<string, string> = {
  'Asia/Seoul': 'KST',
  'Asia/Tokyo': 'JST',
  'Asia/Kolkata': 'IST',
  'Asia/Singapore': 'SGT',
  'Asia/Hong_Kong': 'HKT',
  'Asia/Taipei': 'CST',
  'Europe/Istanbul': 'TRT',
  'Australia/Sydney': 'AET',
}

export function zoneShort(instant: DateTime): string {
  return SHORT[instant.zoneName ?? ''] ?? instant.toFormat('ZZZZ')
}

/** "Mon, Oct 26 · 2:00 PM PDT" */
export function formatInZone(instant: DateTime, zone: string): string {
  const t = instant.setZone(zone)
  return `${t.toFormat('ccc, LLL d')} · ${t.toFormat('h:mm a')} ${zoneShort(t)}`
}

/** "Sun, Oct 25" */
export function formatDate(local: DateTime): string {
  return local.toFormat('ccc, LLL d')
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export interface Countdown {
  text: string
  /** Under 72 hours to go */
  urgent: boolean
  closed: boolean
}

export function countdown(to: DateTime, now: DateTime): Countdown {
  const ms = to.toMillis() - now.toMillis()
  const minutes = Math.floor(Math.abs(ms) / 60_000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (ms <= 0) {
    if (days >= 1) return { text: `Closed ${plural(days, 'day')} ago`, urgent: false, closed: true }
    if (hours >= 1) return { text: `Closed ${plural(hours, 'hour')} ago`, urgent: false, closed: true }
    return { text: 'Closed just now', urgent: false, closed: true }
  }
  const urgent = ms < 72 * 3600_000
  if (days >= 1) return { text: `${plural(days, 'day')}, ${plural(hours, 'hour')} left`, urgent, closed: false }
  if (hours >= 1) return { text: `${plural(hours, 'hour')}, ${plural(mins, 'minute')} left`, urgent, closed: false }
  return { text: `${plural(Math.max(mins, 1), 'minute')} left`, urgent, closed: false }
}
