# Ruleproof

**Every contest hides a checklist in its rules.** Ruleproof reads a contest's official rules and gives you that checklist: what to submit, what to build, who can enter and when it's due *in your own time zone*. Every item is pinned to the sentence of the rules that requires it.

Live app: **https://ruleproof.mikey9220.workers.dev** (no sign-up; press "Try it with this hackathon's rules")

## Why proof matters

An AI reads the rules, and it is good at finding requirements in 500 lines of legal text. It is not trusted on its own. Every item it returns must quote the rules, and plain code (`shared/verify.ts`) looks for each quote in the rules text before the item counts:

- **In the rules**: the quote was found. Click the item and the rules beside the checklist scroll to the sentence and highlight it.
- **Not found in the rules**: the quote wasn't found word for word. The item is set apart with its claimed quote, can't be ticked, and can be dismissed. An invented requirement never passes as a real one.

Matching ignores only differences that never change meaning: letter case, spacing and line breaks, curly versus straight quote marks, dash styles, list bullets and invisible characters. Nothing fuzzier, because a near miss is exactly what an invented requirement looks like. On three real rules pages (Build With AI: Basics, IEEE ClimateChain, PayPal AI Hackathon), every quote the reader returned matched.

Deadlines get the same treatment: the AI reports the date, time and zone *as the rules state them*, and Luxon turns them into an exact moment shown in your zone (with daylight saving handled). If the rules give no time zone or no time, Ruleproof says so instead of guessing.

## What you can do

- Paste the rules, or give a link to the rules page.
- See the deadline in your zone with a countdown, the rules' own wording beneath it, and the other key dates.
- Work through the checklist (Submit, Build, Can you enter?, Watch out) and see how entries are judged.
- Click any item, date or criterion to see its sentence in the rules, or click a highlight in the rules to find its item.
- Tick items as you finish them; add the deadline to your calendar (with reminders 3 days, 1 day and 3 hours before).
- Come back later: your contests stay in this browser, soonest deadline first.

## Run it locally

Requirements: Node 20+ and npm, and either an OpenAI API key or a relay that forwards Responses API calls.

```sh
npm install
cp .dev.vars.example .dev.vars   # set OPENAI_API_KEY (or LLM_RELAY_URL and LLM_RELAY_KEY)
npm run dev                      # http://localhost:5190
```

Checks: `npm test` (quote checker, time math, calendar file) and `npm run typecheck`.

## Deploy (Cloudflare Workers, free plan)

```sh
npx wrangler kv namespace create READINGS   # put the id in wrangler.jsonc
npx wrangler secret put OPENAI_API_KEY      # or LLM_RELAY_URL and LLM_RELAY_KEY
npm run deploy
```

Optional: `LLM_MODEL` (default `gpt-5.5`).

## How it is built

| Piece | What it does |
| --- | --- |
| `src/` | The page (React + Vite): home, brief, rules pane, the browser store (`localStorage`) and the page-text extractor (Mozilla Readability). |
| `shared/verify.ts` | The quote checker: normalizes the rules and finds every quote, mapping it back to the original text for highlighting. |
| `shared/time.ts`, `shared/ics.ts` | Deadlines as exact moments in any zone, countdowns, and the calendar file. |
| `worker/` | A Cloudflare Worker: `POST /api/read` asks the AI to read the rules (one call per rules text, cached in Workers KV), `GET /api/fetch` fetches a public rules page for the link option. |
| `tests/` | Unit tests for the parts that must be exact. |

The live app's reader runs on the maintainer's ChatGPT plan through a small relay on their own machine; anyone else can run it with an OpenAI API key.

Nothing about you leaves the browser: contests, rules text and ticks are stored locally. Rules text is sent to the server only to be read.

## How it was planned

Built for [Build With AI: Basics](https://learn-ai-basics.devpost.com/) with the [Devpost Learn Skill Pack](https://github.com/challengepost/learn-ai-basics) (`skills-lock.json`). The planning documents the skills produced are in [`devpost/`](devpost/): [scope](devpost/scope.md), [product requirements](devpost/prd.md), [technical spec](devpost/spec.md) and the [build checklist](devpost/checklist.md), with every slice, check and plan revision recorded.

## License

[MIT](LICENSE)
