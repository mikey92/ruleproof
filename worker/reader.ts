// The reader: one AI call that turns a contest's rules into dates, checklist items and judging criteria, each with a
// quote copied from the rules. The page checks every quote (shared/verify.ts); nothing here is trusted on its own.
// Readings are kept in KV by a fingerprint of the rules text, so the same rules are read once.

import type { Reading } from '../shared/types'
import { modelName, outputText, respond, type LlmEnv } from './llm'

/** Bump when the instructions or schema change, so cached readings from older instructions are not reused. */
export const PROMPT_VERSION = 'r3'

const INSTRUCTIONS = `You read the official rules of a contest, usually an online hackathon, for someone who wants to enter it. List what they must do and by when, and copy the proof from the rules.

Return:
- contest: the contest's name as the rules give it, in normal capitalization.
- deadlines: the dates an entrant must meet or will want to know. The submission deadline first (kind "submission"), then registration (kind "registration"), then others such as the end of judging or the winners announcement (kind "other"). For a period ("September 22 to October 26, 2026 (5:00 pm ET)") use its end. date is YYYY-MM-DD. time is 24-hour HH:MM, or "" if the rules give no time. zone_written is the time zone exactly as written ("Eastern Time", "PT", "UTC+3"), or "". zone is the IANA name for it ("America/New_York" for Eastern Time, "America/Los_Angeles" for Pacific Time, "Asia/Seoul" for KST, "Etc/GMT-3" for UTC+3), or "" when the rules state no zone. Never assume a zone the rules do not state.
- items: everything an entrant has to do, provide or satisfy, each in one section:
  submit: what to hand in and how (video, repository, description, links, forms, formats, lengths, where to upload).
  build: what the project itself must be or include (new work, required tools, files, platforms, licenses).
  eligibility: who may and may not enter (age, residence, employers, teams, number of entries).
  watch: easy-to-miss conditions that can disqualify an entry or cost points (what judges will not do, content that is not allowed, disclosures, limits on changes).
  title: one instruction in plain words, at most 70 characters ("Keep the demo video under 3 minutes").
  detail: one sentence with the specifics that matter (numbers, formats, places), at most 160 characters.
  This is the checklist a careful entrant will actually work through: no more than 24 items in all. When there are more candidates, keep the ones most likely to cost a typical entrant their entry: the requirements that change what someone builds or hands in, and the conditions that could exclude or disqualify them. One requirement per item, never the same requirement twice. Leave out steps everyone does anyway with no catch (registering, filling in the form), legal boilerplate (liability, publicity, privacy, taxes, prize paperwork) and the obvious (no malware). Exclusions that only concern the organizers, sponsors, judges and their staff or families get one item at most.
- judging: the judging criteria, with weight as written ("equally weighted", "30%") or "".

Every deadline, item and criterion has a quote: the exact words from the rules that support it, copied character for character. One sentence or clause, 20 to 300 characters. No ellipses, no paraphrase, no added, dropped or changed words. Each quote is checked against the rules, and one that is not found word for word is shown as unproven.
Include only what the rules say.`

const QUOTED = { quote: { type: 'string' } }

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['contest', 'deadlines', 'items', 'judging'],
  properties: {
    contest: { type: 'string' },
    deadlines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'kind', 'date', 'time', 'zone_written', 'zone', 'quote'],
        properties: {
          label: { type: 'string' },
          kind: { type: 'string', enum: ['submission', 'registration', 'other'] },
          date: { type: 'string' },
          time: { type: 'string' },
          zone_written: { type: 'string' },
          zone: { type: 'string' },
          ...QUOTED,
        },
      },
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['section', 'title', 'detail', 'quote'],
        properties: {
          section: { type: 'string', enum: ['submit', 'build', 'eligibility', 'watch'] },
          title: { type: 'string' },
          detail: { type: 'string' },
          ...QUOTED,
        },
      },
    },
    judging: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'weight', 'quote'],
        properties: { name: { type: 'string' }, weight: { type: 'string' }, ...QUOTED },
      },
    },
  },
}

export interface ReaderEnv extends LlmEnv {
  READINGS?: KVNamespace
}

interface Stored {
  reading: Reading
  model: string
  readAt: string
}

async function fingerprint(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Trims strings and drops entries the page could not show. */
function tidy(r: Reading): Reading {
  const t = (s: unknown) => (typeof s === 'string' ? s.trim() : '')
  return {
    contest: t(r.contest),
    deadlines: (r.deadlines ?? [])
      .map((d) => ({ ...d, label: t(d.label), date: t(d.date), time: t(d.time), zone_written: t(d.zone_written), zone: t(d.zone), quote: t(d.quote) }))
      .filter((d) => d.label && d.date),
    items: (r.items ?? []).map((i) => ({ ...i, title: t(i.title), detail: t(i.detail), quote: t(i.quote) })).filter((i) => i.title),
    judging: (r.judging ?? []).map((c) => ({ name: t(c.name), weight: t(c.weight), quote: t(c.quote) })).filter((c) => c.name),
  }
}

export async function readRules(env: ReaderEnv, text: string, ctx?: ExecutionContext): Promise<{ reading: Reading; model: string; cached: boolean }> {
  const model = modelName(env)
  const key = `${PROMPT_VERSION}:${await fingerprint(`${PROMPT_VERSION}\n${model}\n${text}`)}`
  const hit = await env.READINGS?.get<Stored>(key, 'json').catch(() => null)
  if (hit) return { reading: hit.reading, model: hit.model, cached: true }

  const output = await respond(env, {
    model,
    instructions: INSTRUCTIONS,
    input: [{ role: 'user', content: [{ type: 'input_text', text: `Official rules:\n\n${text}` }] }],
    reasoning: { effort: 'low' },
    text: { format: { type: 'json_schema', name: 'rules_reading', strict: true, schema: SCHEMA } },
  })
  const reading = tidy(JSON.parse(outputText(output)) as Reading)
  const stored: Stored = { reading, model, readAt: new Date().toISOString() }
  const save = env.READINGS?.put(key, JSON.stringify(stored), { expirationTtl: 30 * 24 * 3600 }).catch(() => undefined)
  if (save) ctx ? ctx.waitUntil(save) : await save
  return { reading, model, cached: false }
}
