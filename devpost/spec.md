---
doc: spec
status: approved
---

# Ruleproof — Technical Spec

## How This Works, In Plain Language
Ruleproof is a web page with a small server behind it.

- **The page** (runs in your browser) takes the rules, shows the brief, and keeps your contests and ticks in the browser's own storage (`localStorage`, a notebook the browser keeps for one site). It also does the two jobs that must be exact: it **checks every quote** against the rules text, and it **converts times** between zones.
- **The server** (a Cloudflare Worker, a small program that runs on Cloudflare's machines when the page asks) does two things the page cannot do safely by itself: it **asks the AI to read the rules** (the AI key must never be in the page), and it **fetches a rules page from a link** (browsers block pages from reading other sites directly).
- **The AI** reads the whole rules text once and answers in a fixed JSON shape: dates, checklist items and judging criteria, each with a quote copied from the rules. It is never trusted on its own: the page finds every quote in the rules text before showing the item as proven.

Why this shape: the AI is good at reading 500 lines and picking out what matters; plain code is better at checking text and doing time-zone math. Each does the part it is good at. Everything else (accounts, a database) is left out because one person's browser is enough to prove the idea.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. You paste the rules and press **Check the rules** → the page measures the text, then sends it to the server at `POST /api/read`.
   - With a link instead: the page asks `GET /api/fetch?url=…`; the server fetches the page and passes its HTML back untouched; the page keeps only the readable text (`src/extract.ts`) and continues as if you had pasted it.
2. The server makes a fingerprint of the text (SHA-256). If it has read the same text before, it returns the saved reading from its cache (Workers KV). Otherwise it sends the text to the AI with the reading instructions and the JSON shape, waits for the answer, saves it in the cache and returns it.
3. The page receives the reading and runs the checks: every quote is searched for in the rules text (`shared/verify.ts`), and every date is turned into an exact moment and shown in your zone (`shared/time.ts`).
4. The page saves the contest (rules text, reading, no ticks yet) in `localStorage` and opens `#/c/<id>`, the brief.
5. Clicking an item tells the rules pane which passage to scroll to and mark. Ticking an item writes the tick to `localStorage` straight away.
6. **Add to calendar** builds a calendar file in the page (`shared/ics.ts`) and downloads it. Nothing goes to the server.
7. Coming back later, the home page reads the saved contests from `localStorage` and shows them with fresh countdowns.

## Stack
- **TypeScript ~5.9** throughout. https://www.typescriptlang.org/docs/
- **React 19.3** for the page. https://react.dev
- **Vite 8.3** to run and build it, with **@cloudflare/vite-plugin 1.62** so one `npm run dev` runs the page and the Worker together. https://vite.dev · https://developers.cloudflare.com/workers/vite-plugin/
- **Cloudflare Workers** (free plan) with **Workers KV** for the reading cache and **rate limiting** bindings, deployed with **wrangler 4.147**. https://developers.cloudflare.com/workers/ · https://developers.cloudflare.com/kv/ · https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- **Luxon 3.7** for time zones (IANA zone names, daylight saving). https://moment.github.io/luxon/
- **@mozilla/readability 0.6** to find the main text of a fetched page. https://github.com/mozilla/readability
- **IBM Plex Sans, Mono and Serif** via `@fontsource` 5.3, served with the app (no font CDN). https://fontsource.org/fonts/ibm-plex-sans
- **Vitest 5** for the unit tests of the exact parts (quote checks, time math, calendar file). https://vitest.dev
- **The AI**: the OpenAI Responses API shape with a strict JSON schema (`text.format: json_schema`). Two ways to reach it, chosen by which secrets are set: an `OPENAI_API_KEY` (anyone running the repo), or the entrant's relay (`LLM_RELAY_URL` + `LLM_RELAY_KEY`), which runs the same request on their ChatGPT plan from their own Mac. Model from `LLM_MODEL`, default `gpt-5.5`, reasoning effort `low`. https://platform.openai.com/docs/api-reference/responses · https://platform.openai.com/docs/guides/structured-outputs
- Routing is two hash routes (`#/` and `#/c/<id>`), written by hand: no router library for two screens.
- Versions above were checked with `npm view` on 2026-10-03.

## Where It Runs and How Someone Tries It
- **Requirements**: Node 20+ and npm. For new readings, one of: `OPENAI_API_KEY`, or `LLM_RELAY_URL` and `LLM_RELAY_KEY`.
- **Run locally**:
  1. `npm install`
  2. `cp .dev.vars.example .dev.vars` and fill in one of the options above
  3. `npm run dev`, then open http://localhost:5190
- **Tests**: `npm test` (Vitest) and `npm run typecheck`.
- **Live app (optional deployment, chosen)**: https://ruleproof.mikey9220.workers.dev, on the Workers free plan. Deploy with `npx wrangler kv namespace create READINGS` once (its id goes in `wrangler.jsonc`), `npx wrangler secret put LLM_RELAY_URL` and `LLM_RELAY_KEY` (or `OPENAI_API_KEY`), then `npm run deploy`.
- **Demo recording**: the live app in a clean browser window at 1440×900. Show the example (this hackathon's rules link), the brief, clicking items into the rules, ticking and reloading, the deadline in two zones, and the calendar file.
- **Public repository**: https://github.com/mikey92/ruleproof (MIT).
- **Demo video**: https://youtu.be/BnzQTBH97G0 (public on YouTube, about 2 minutes).
- **Devpost submission**: https://devpost.com/software/ruleproof-9iw4ac

## Look and Feel
From `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`, as CSS custom properties in `src/styles.css`:
- `--paper #F7F5EF` (page), `--card #FFFFFF`, `--line #E4E0D6`, `--ink #1D1C1A`, `--muted #6B675E`, `--proof #FFE873` (highlighter), `--proof-strong #F5CF2E` (selected highlight underline), `--due #D9481C`, `--done #2E7D4F`, `--warn #B26B00`.
- Fonts: `--sans "IBM Plex Sans"` for the interface (400/500/600), `--mono "IBM Plex Mono"` for times, countdowns and labels (400/500), `--serif "IBM Plex Serif"` for the rules pane (400, italic 400).
- 4px radii, 1px hairlines, no shadows except a hairline under sticky headers, no gradients, no emoji or icon fonts; small inline SVG only for the checkbox tick and status marks.
- Density: the checklist is spacious (16px body, 1.5 line height); the rules pane is document-dense (15px serif, 1.6). The due time is large mono (32–40px).
- Copy is short and plain; labels in sentence case.

## Components

### Home view (`src/views/Home.tsx`)
The input card (paste box or link field, **Check the rules**, progress line), the time zone line with a zone picker (`Intl.supportedValuesOf('timeZone')`), the example link and **Your contests**.
PRD ref: `prd.md > Reading the Rules`, `prd.md > Your Contests`, `prd.md > States and Boundaries`.

### Brief view (`src/views/Brief.tsx`)
Deadline header (due time in the reader's zone, countdown, quoted wording, other dates, **Add to calendar**), progress, the checklist groups and **Not found in the rules**. Holds which item is selected and passes it to the rules pane.
PRD ref: `prd.md > Deadline in Your Time`, `prd.md > Checklist and Progress`, `prd.md > Proof for Every Item`.

### Rules pane (`src/views/RulesPane.tsx`)
Renders the rules text in the serif face, split into segments at every highlight boundary so found quotes are marked (`<mark data-items="…">`). Scrolls the selected item's passage into view and marks it strongly; clicking a mark selects its item. On narrow screens it opens as a full-screen sheet.
PRD ref: `prd.md > Proof for Every Item`.

### Quote checker (`shared/verify.ts`) — the kernel
`indexText(text)` builds a normalized copy of the rules (lowercase; curly quotes and primes to straight quotes; en/em dashes and minus signs to `-`; `…` to `...`; non-breaking and other special spaces to spaces; zero-width characters removed; every run of whitespace to one space) and a map from each normalized character back to its position in the original text.
`locate(index, quote)` normalizes the quote the same way and finds it: exact match first; then, if the quote contains `...`, each part (at least 8 characters) in order within 400 characters of the previous one. A quote shorter than 15 normalized characters never counts as proof. Returns the start and end in the original text, or nothing.
PRD ref: `prd.md > Proof for Every Item`.

### Time (`shared/time.ts`)
`deadlineInstant(d)`: builds the exact moment from the reading's date, time and IANA zone with Luxon; rejects unknown zones and impossible dates. `formatInZone(instant, zone)` gives "Mon, Oct 26 · 2:00 PM PDT". `countdown(instant, now)` gives "23 days, 4 hours left", "5 hours, 12 minutes left" or "Closed 3 days ago", and whether it is under 72 hours. A deadline without a zone or time gets a flag instead of a converted time.
PRD ref: `prd.md > Deadline in Your Time`.

### Calendar file (`shared/ics.ts`)
`deadlineIcs(contest, deadline)`: one event ending at the deadline (30 minutes long), titled "<Contest> closes", with alarms 3 days, 1 day and 3 hours before the end (`TRIGGER;RELATED=END`), the quote and rules link in the notes; text escaped and lines folded per RFC 5545.
PRD ref: `prd.md > Deadline in Your Time`.

### Page text extractor (`src/extract.ts`)
`htmlToRulesText(html, url)`: parses the HTML with `DOMParser`, takes Readability's main content (falling back to `<body>`), removes scripts, styles, navigation, headers, footers and forms, and walks the elements to plain text with paragraph breaks and "- " list items.
PRD ref: `prd.md > Reading the Rules` (Link).

### Store (`src/store.ts`)
Reads and writes contests and settings in `localStorage` (see Data Model), with a `useContests()` hook so views update on change. A contest's id is the first 16 hex characters of the SHA-256 of its rules text, so the same rules map to the same contest.
PRD ref: `prd.md > Checklist and Progress`, `prd.md > Your Contests`.

### API client (`src/api.ts`)
`readRules(text)` → `POST /api/read`; `fetchPage(url)` → `GET /api/fetch`. Turns error codes into the PRD's messages.

### Worker routes (`worker/index.ts`)
- `POST /api/read`: validates length (300–200,000 characters), applies the `READ_LIMIT` rate limit per visitor IP, then `reader.ts`.
- `GET /api/fetch?url=`: accepts only `http`/`https` URLs with a public host name, applies `FETCH_LIMIT`, fetches with a 15-second timeout, refuses non-HTML responses and bodies over 3 MB, and streams the HTML back with `x-final-url`.
- Everything else: the built page (Workers static assets).

### Reader (`worker/reader.ts`)
The reading instructions, the JSON schema and the KV cache. Cache key: SHA-256 of `PROMPT_VERSION + model + text`; entries kept 30 days.
PRD ref: `prd.md > Reading the Rules`.

### AI client (`worker/llm.ts`)
`respond(env, body)`: relay when `LLM_RELAY_URL`/`LLM_RELAY_KEY` are set (same call shape as the entrant's other project: `POST {LLM_RELAY_URL}/responses` with `x-relay-key` and `x-relay-collect: 1`, body with `stream: true, store: false`); otherwise `POST https://api.openai.com/v1/responses` with `Authorization: Bearer OPENAI_API_KEY` and `store: false`. 90-second timeout. `outputText()` joins the answer's text parts.

## Data Model
```ts
// shared/types.ts
type Section = 'submit' | 'build' | 'eligibility' | 'watch'
interface Deadline { label: string; kind: 'submission' | 'registration' | 'other'; date: string /* YYYY-MM-DD */; time: string /* HH:MM or '' */; zone_written: string; zone: string /* IANA or '' */; quote: string }
interface Item { section: Section; title: string; detail: string; quote: string }
interface Criterion { name: string; weight: string; quote: string }
interface Reading { contest: string; deadlines: Deadline[]; items: Item[]; judging: Criterion[] }
interface Contest { id: string; addedAt: string; source: { kind: 'paste' | 'link'; url?: string }; text: string; reading: Reading; model: string; ticked: number[] /* indexes into reading.items */; dismissed: number[] }
interface Settings { zone: string }
```
- `localStorage['ruleproof:contests']`: `Contest[]`. Added after a reading; ticks and dismissals updated on click; removed on delete. Survives reloads and restarts; cleared only with site data.
- `localStorage['ruleproof:settings']`: `{ zone }`, defaulting to the browser's zone.
- Verification results are not stored: they are recomputed from `text` and `reading` when a brief opens (fast, and always consistent with the code).
- Server side, KV `READINGS`: key = cache hash, value = `{ reading, model, readAt }`, 30-day expiry.

## File Structure
```
ruleproof/
├── index.html               # page shell
├── package.json             # scripts: dev, build, test, typecheck, deploy
├── vite.config.ts           # React + Cloudflare plugins, port 5190
├── vitest.config.ts         # unit tests, no Worker runtime
├── wrangler.jsonc           # Worker, static assets, KV, rate limits
├── tsconfig.json            # page + shared code
├── tsconfig.worker.json     # Worker code
├── .dev.vars.example        # which secrets to set, no values
├── src/
│   ├── main.tsx             # fonts, mount
│   ├── App.tsx              # hash routes: home and brief
│   ├── styles.css           # look-and-feel tokens and layout
│   ├── api.ts               # calls to /api/read and /api/fetch
│   ├── extract.ts           # fetched HTML → rules text
│   ├── store.ts             # localStorage contests and settings
│   └── views/
│       ├── Home.tsx         # input card, zone, example, your contests
│       ├── Brief.tsx        # deadline header, checklist, progress
│       └── RulesPane.tsx    # rules text with highlights
├── shared/
│   ├── types.ts             # Reading, Item, Deadline, Contest
│   ├── verify.ts            # quote checker (the kernel)
│   ├── time.ts              # deadline moments, formatting, countdowns
│   └── ics.ts               # calendar file
├── worker/
│   ├── index.ts             # routes
│   ├── reader.ts            # instructions, schema, cache
│   └── llm.ts               # relay or OpenAI API
├── tests/
│   ├── verify.test.ts
│   ├── time.test.ts
│   └── ics.test.ts
├── devpost/                 # planning documents from the Skill Pack
├── skills-lock.json         # Skill Pack source and hashes
├── LICENSE                  # MIT
└── README.md
```

## External Services and Dependencies
- **AI, OpenAI Responses API**: `POST https://api.openai.com/v1/responses`, header `Authorization: Bearer <OPENAI_API_KEY>`, body `{ model, instructions, input: [{ role: 'user', content: [{ type: 'input_text', text }] }], reasoning: { effort: 'low' }, text: { format: { type: 'json_schema', name: 'rules_reading', strict: true, schema } }, store: false }`. Response: `{ output: [{ type: 'message', content: [{ type: 'output_text', text: '<json>' }] }] }`. Paid per token by whoever owns the key; one reading of a 35,000-character rules page is roughly 10,000 input and 3,000 output tokens. Docs: https://platform.openai.com/docs/api-reference/responses
- **AI, the entrant's relay**: same body (`stream: true`), `POST {LLM_RELAY_URL}/responses` with `x-relay-key`, `x-relay-collect: 1`; returns the finished `{ output }`. Runs on the entrant's ChatGPT plan; limited to 60 calls a minute at the relay. No cost beyond the plan.
- **Cloudflare Workers free plan**: 100,000 requests a day, 10 ms CPU per request (waiting on the AI does not count). KV free tier: 100,000 reads and 1,000 writes a day. Rate limiting: `READ_LIMIT` 6 readings per 60 s per IP, `FETCH_LIMIT` 20 fetches per 60 s per IP.
- **Rules pages** fetched by `/api/fetch`: whatever site the reader links to; some may block automated requests (see failure modes).

## Important Failure Modes
- **The AI is slow or down** → the progress line shows elapsed seconds; after 90 s, or on an AI error, "The rules reader is offline right now. Try again in a minute." Saved contests keep working.
- **A quote doesn't match the rules** → the item goes to **Not found in the rules** with its claimed quote. Never shown as proven.
- **A site blocks the fetch or returns a script-only page** → "Couldn't read that page. Copy the rules text and paste it instead." and the paste box opens.
- **The AI returns a zone Luxon doesn't know** → treated as "Time zone not stated in the rules"; the time is shown as written.

## What Was Simplified and Why
- **Browser storage** instead of accounts and a database: one person's checklist is the proof; a server database would need sign-in. The fuller version would add accounts and a contests table.
- **One AI reading per rules text, cached by fingerprint** instead of re-reading or streaming partial results: simpler, cheaper, and identical rules give identical briefs.
- **Hash routes written by hand** instead of a router library: two screens.
- **The server passes fetched HTML through and the page extracts the text** instead of parsing on the server: keeps the Worker well inside its 10 ms CPU budget, and the browser's HTML parser is the best one available.
- **Calendar file download** instead of reminders: no sending service needed.

## Decisions and Open Issues
- Stack (React + Vite + Cloudflare Worker, Luxon, Readability): chosen by the agent on the entrant's behalf because it matches the entrant's other projects, deploys free, and keeps AI keys off the page.
- Deployment: chosen, so reviewers can try the example themselves; the video remains the main proof.
- AI access: the entrant's ChatGPT plan through their relay for the live app (no paid services), an `OPENAI_API_KEY` for anyone else.
- **The genuine uncertainty**: will the model copy quotes exactly enough for strict matching on real rules pages, or will normal-looking quotes fail on small differences? Agreed investigation in slice 1: read three real rules pages (Build With AI: Basics, IEEE ClimateChain, the PayPal AI hackathon) and record how many quotes verify. Loosen normalization only for systematic, harmless differences (spacing, quote marks, bullets), never into fuzzy matching, which would let invented text pass.
- **Open**: whether a Worker can fetch Devpost rules pages; checked in the link slice, with paste as the fallback. Carried from `prd.md > Open Questions`.
