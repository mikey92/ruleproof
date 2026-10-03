import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import { countdown, formatInZone, resolve, target } from '../shared/time'
import type { Deadline } from '../shared/types'

const bwai: Deadline = {
  label: 'Submission deadline',
  kind: 'submission',
  date: '2026-10-26',
  time: '17:00',
  zone_written: 'Eastern Time',
  zone: 'America/New_York',
  quote: 'October 26, 2026 (5:00 pm Eastern Time)',
}

describe('resolve and formatInZone', () => {
  it('shows the Build With AI: Basics deadline in Pacific and Korea time', () => {
    const w = resolve(bwai, 'America/Los_Angeles')
    expect(w.kind).toBe('exact')
    const t = target(w)!
    expect(formatInZone(t, 'America/Los_Angeles')).toBe('Mon, Oct 26 · 2:00 PM PDT')
    expect(formatInZone(t, 'Asia/Seoul')).toBe('Tue, Oct 27 · 6:00 AM KST')
    expect(formatInZone(t, 'America/New_York')).toBe('Mon, Oct 26 · 5:00 PM EDT')
  })

  it('follows daylight saving: the same wall time a week after the US change is an hour later in Seoul', () => {
    const t = target(resolve({ ...bwai, date: '2026-11-02' }, 'Asia/Seoul'))!
    expect(formatInZone(t, 'Asia/Seoul')).toBe('Tue, Nov 3 · 7:00 AM KST')
  })

  it('handles UTC offsets written as Etc zones', () => {
    const t = target(resolve({ ...bwai, time: '23:59', zone: 'Etc/GMT-3' }, 'UTC'))!
    expect(t.toUTC().toISO()).toBe('2026-10-26T20:59:00.000Z')
  })

  it('flags a missing zone or time instead of guessing', () => {
    expect(resolve({ ...bwai, zone: '' }, 'Asia/Seoul').kind).toBe('no-zone')
    expect(resolve({ ...bwai, zone: 'Mars/Olympus' }, 'Asia/Seoul').kind).toBe('no-zone')
    expect(resolve({ ...bwai, time: '' }, 'Asia/Seoul').kind).toBe('no-time')
    expect(resolve({ ...bwai, date: 'October 26' }, 'Asia/Seoul').kind).toBe('invalid')
    expect(resolve({ ...bwai, date: '2026-02-30' }, 'Asia/Seoul').kind).toBe('invalid')
  })
})

describe('countdown', () => {
  const deadline = DateTime.fromISO('2026-10-26T17:00', { zone: 'America/New_York' })
  const at = (iso: string) => DateTime.fromISO(iso, { zone: 'America/New_York' })

  it('counts days and hours, and turns urgent under 72 hours', () => {
    expect(countdown(deadline, at('2026-10-03T12:00'))).toEqual({ text: '23 days, 5 hours left', urgent: false, closed: false })
    expect(countdown(deadline, at('2026-10-24T16:00')).urgent).toBe(true)
    expect(countdown(deadline, at('2026-10-26T12:30')).text).toBe('4 hours, 30 minutes left')
    expect(countdown(deadline, at('2026-10-26T16:59:30')).text).toBe('1 minute left')
  })

  it('says how long ago it closed', () => {
    expect(countdown(deadline, at('2026-10-29T18:00'))).toEqual({ text: 'Closed 3 days ago', urgent: false, closed: true })
    expect(countdown(deadline, at('2026-10-26T19:00')).text).toBe('Closed 2 hours ago')
  })
})
