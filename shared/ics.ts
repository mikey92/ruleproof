// A calendar file (RFC 5545) for one deadline: an event ending at the deadline, with reminders before it.

import type { DateTime } from 'luxon'

function stamp(t: DateTime): string {
  return t.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'")
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Lines longer than 75 octets continue on the next line after a space, without splitting a character. */
function fold(line: string): string {
  const enc = new TextEncoder()
  const out: string[] = []
  let current = ''
  let size = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    if (size + n > (out.length ? 74 : 75)) {
      out.push(current)
      current = ''
      size = 0
    }
    current += ch
    size += n
  }
  out.push(current)
  return out.join('\r\n ')
}

export interface IcsInput {
  uid: string
  contest: string
  deadline: DateTime
  quote: string
  url?: string
  now: DateTime
}

export function deadlineIcs({ uid, contest, deadline, quote, url, now }: IcsInput): string {
  const name = contest || 'Contest'
  const notes = `The rules say: "${quote}"${url ? `\n${url}` : ''}\nChecklist by Ruleproof.`
  const alarm = (trigger: string, when: string) => [
    'BEGIN:VALARM',
    `TRIGGER;RELATED=END:${trigger}`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`${name} closes in ${when}`)}`,
    'END:VALARM',
  ]
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ruleproof//Deadline//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}@ruleproof`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(deadline.minus({ minutes: 30 }))}`,
    `DTEND:${stamp(deadline)}`,
    `SUMMARY:${escapeText(`${name} closes`)}`,
    `DESCRIPTION:${escapeText(notes)}`,
    ...(url ? [`URL:${url}`] : []),
    ...alarm('-P3D', '3 days'),
    ...alarm('-P1D', '1 day'),
    ...alarm('-PT3H', '3 hours'),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}
