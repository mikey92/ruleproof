import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import { deadlineIcs } from '../shared/ics'

const ics = deadlineIcs({
  uid: 'abc123',
  contest: 'Build With AI: Basics, the hackathon',
  deadline: DateTime.fromISO('2026-10-26T17:00', { zone: 'America/New_York' }),
  quote: 'October 26, 2026 (5:00 pm Eastern Time); see the rules',
  url: 'https://learn-ai-basics.devpost.com/rules',
  now: DateTime.fromISO('2026-10-03T12:00:00Z'),
})
const lines = ics.split('\r\n')

describe('deadlineIcs', () => {
  it('ends the event at the deadline in UTC', () => {
    expect(lines).toContain('DTEND:20261026T210000Z')
    expect(lines).toContain('DTSTART:20261026T203000Z')
  })

  it('adds three reminders relative to the deadline', () => {
    expect(lines.filter((l) => l === 'BEGIN:VALARM')).toHaveLength(3)
    expect(lines).toContain('TRIGGER;RELATED=END:-P3D')
    expect(lines).toContain('TRIGGER;RELATED=END:-P1D')
    expect(lines).toContain('TRIGGER;RELATED=END:-PT3H')
  })

  it('escapes commas, semicolons and line breaks in text', () => {
    expect(lines).toContain('SUMMARY:Build With AI: Basics\\, the hackathon closes')
    const unfolded = ics.replace(/\r\n /g, '')
    expect(unfolded).toContain('(5:00 pm Eastern Time)\\; see the rules"\\nhttps://learn-ai-basics.devpost.com/rules')
  })

  it('folds every line to at most 75 octets and uses CRLF', () => {
    const enc = new TextEncoder()
    for (const l of lines) expect(enc.encode(l).length).toBeLessThanOrEqual(75)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.includes('\n') && !/[^\r]\n/.test(ics)).toBe(true)
  })
})
