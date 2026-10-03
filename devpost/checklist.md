---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [ ] **1. Paste the rules and get a checklist where every item shows its proof**
  Becomes usable: A running app where pasted rules come back as checklist items grouped as Submit, Build, Can you enter? and Watch out, each marked "In the rules" or set apart under "Not found in the rules".
  Why now: This is the kernel and the biggest unknown (will the AI's quotes match the rules exactly?), so it goes first, with the project scaffold folded in.
  PRD ref: `prd.md > Reading the Rules`, `prd.md > Proof for Every Item`
  Spec ref: `spec.md > Quote checker (shared/verify.ts) — the kernel`, `spec.md > Reader (worker/reader.ts)`, `spec.md > AI client (worker/llm.ts)`, `spec.md > Worker routes (worker/index.ts)`, `spec.md > File Structure`
  Build: Scaffold Vite + React + the Cloudflare plugin, Worker routes and `wrangler.jsonc`; write `shared/types.ts`, `shared/verify.ts` with unit tests, `worker/llm.ts`, `worker/reader.ts`; a first Home with the paste box and a first Brief listing items with their proof status.
  Verify (mechanical): `npm test` passes the quote-checker tests; `npm run typecheck` is clean; the dev server starts; `POST /api/read` with three real rules pages returns readings, and the share of verified quotes for each is recorded under Revisions.
  Learner check: Paste the Build With AI: Basics rules, press Check the rules, and see the grouped items with "In the rules" on each.
  Commit: `Read pasted rules into a checklist with verified quotes`

- [ ] **2. Click any item to see its sentence lit up in the rules**
  Becomes usable: The brief shows the rules beside the checklist; every proven quote is highlighted, clicking an item scrolls to its sentence and marks it, and clicking a highlight selects its item. On a phone the rules open as a sheet.
  Why now: Completes the kernel's visible half while the reading format is fresh; everything after builds around this two-pane layout.
  PRD ref: `prd.md > Proof for Every Item`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Rules pane (src/views/RulesPane.tsx)`, `spec.md > Brief view (src/views/Brief.tsx)`
  Build: `RulesPane.tsx` with segment-split highlights and scroll-to, selection state in `Brief.tsx`, the two-column layout and the narrow-screen sheet.
  Verify (mechanical): A browser script opens a brief, clicks every proven item and confirms the strongly marked passage is in view and contains the item's quote; repeat at phone width.
  Learner check: Open a brief, click three items and one highlight, and see the rules jump to the right sentence each time.
  Commit: `Show the rules beside the checklist with linked highlights`

- [ ] **3. The deadline shows in your own time, with a countdown and a calendar file**
  Becomes usable: The brief header shows the submission deadline in the reader's zone with the rules' wording quoted, a live countdown, the other key dates, and Add to calendar; the zone can be changed on the home page.
  Why now: The second half of "what do I do and by when"; depends only on the reading format from slice 1.
  PRD ref: `prd.md > Deadline in Your Time`
  Spec ref: `spec.md > Time (shared/time.ts)`, `spec.md > Calendar file (shared/ics.ts)`, `spec.md > Brief view (src/views/Brief.tsx)`
  Build: `shared/time.ts` and `shared/ics.ts` with unit tests; the deadline header, countdown, other dates, zone setting and calendar download.
  Verify (mechanical): Unit tests show the Build With AI: Basics deadline as Mon, Oct 26, 2:00 PM PDT for America/Los_Angeles and Tue, Oct 27, 6:00 AM KST for Asia/Seoul, and a valid calendar file with three alarms; the header shows the same in the browser.
  Learner check: Open a brief, read the due time, switch the zone to Seoul and back, and download the calendar file.
  Commit: `Show deadlines in the reader's time with countdown and calendar file`

- [ ] **4. Ticks and contests survive a reload**
  Becomes usable: Ticking items updates the progress and is saved; the home page lists saved contests by soonest deadline with countdowns and progress; contests can be deleted; the same rules twice open the same contest.
  Why now: Turns a one-off reading into the core loop of coming back; needs the brief and deadlines in place to list them.
  PRD ref: `prd.md > Checklist and Progress`, `prd.md > Your Contests`
  Spec ref: `spec.md > Store (src/store.ts)`, `spec.md > Data Model`, `spec.md > Home view (src/views/Home.tsx)`
  Build: `src/store.ts` with `localStorage`, hash routes, progress, the Your contests list and delete, dismissing unverified items.
  Verify (mechanical): A browser script ticks two items, reloads, and finds the same two ticked and the same progress; with two contests saved, the sooner deadline is listed first; deleting one removes it after reload.
  Learner check: Tick two items, reload, go home, and see the contest listed with its progress.
  Commit: `Save ticks and list saved contests`

- [ ] **5. Paste a link instead of the text**
  Becomes usable: A rules page link (and the "Try it with this hackathon's rules" example) produces the same brief as pasting its text.
  Why now: Removes the copy-paste chore and powers the example; it depends on the whole reading path already working.
  PRD ref: `prd.md > Reading the Rules` (Link, Example)
  Spec ref: `spec.md > Worker routes (worker/index.ts)`, `spec.md > Page text extractor (src/extract.ts)`
  Build: `GET /api/fetch` with its limits, `src/extract.ts` with Readability, the link field, the example, and the paste fallback message.
  Verify (mechanical): The Build With AI: Basics rules link produces a brief whose items verify against the extracted text; an unreachable link shows the fallback message and opens the paste box.
  Learner check: Press "Try it with this hackathon's rules" and get a brief without pasting anything.
  Commit: `Read rules from a page link`

- [ ] **6. Every state looks finished**
  Becomes usable: The full look and feel (Plex fonts, palette, spacing), the first-use, reading, offline, rate-limited and nothing-found states, the reading cache, and a phone layout.
  Why now: Polish lands last, once every behavior it dresses exists; the cache makes the example instant for reviewers.
  PRD ref: `prd.md > Look and Feel`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Look and Feel`, `spec.md > Important Failure Modes`, `spec.md > Reader (worker/reader.ts)`
  Build: Styles per the tokens, the state messages, KV cache and rate limits, the reading progress line, responsive layout.
  Verify (mechanical): Screenshots at 1440×900 and 390×844 of home (empty and with contests), reading, brief and an error state; a second reading of the same text returns `cached: true` instantly; typecheck and tests pass.
  Learner check: Try the whole journey on a laptop and a phone-sized window and note anything that looks unfinished.
  Commit: `Finish the look and every state`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2 (the kernel is visible end to end)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence:
Route and stops:
Edit outcome:
Reflection:
Activity mode:

## Revisions
