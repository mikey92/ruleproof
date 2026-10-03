// The shape of one reading of a contest's rules, as the AI returns it (see worker/reader.ts for the schema), and of a
// contest as the page keeps it.

export type Section = 'submit' | 'build' | 'eligibility' | 'watch'

export interface Deadline {
  label: string
  kind: 'submission' | 'registration' | 'other'
  /** YYYY-MM-DD */
  date: string
  /** 24-hour HH:MM, or '' when the rules give no time */
  time: string
  /** The time zone exactly as the rules write it, or '' */
  zone_written: string
  /** IANA zone name for it, or '' when the rules give none */
  zone: string
  quote: string
}

export interface Item {
  section: Section
  title: string
  detail: string
  quote: string
}

export interface Criterion {
  name: string
  weight: string
  quote: string
}

export interface Reading {
  contest: string
  deadlines: Deadline[]
  items: Item[]
  judging: Criterion[]
}

/** What /api/read returns. */
export interface ReadResult {
  reading: Reading
  model: string
  cached: boolean
}

export interface Contest {
  /** First 16 hex characters of the SHA-256 of the rules text, so the same rules map to the same contest. */
  id: string
  addedAt: string
  source: { kind: 'paste' | 'link'; url?: string }
  text: string
  reading: Reading
  model: string
  /** Indexes into reading.items */
  ticked: number[]
  dismissed: number[]
}

export const SECTIONS: { key: Section; title: string }[] = [
  { key: 'submit', title: 'Submit' },
  { key: 'build', title: 'Build' },
  { key: 'eligibility', title: 'Can you enter?' },
  { key: 'watch', title: 'Watch out' },
]

export const MIN_RULES_CHARS = 300
export const MAX_RULES_CHARS = 200_000
