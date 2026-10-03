---
doc: prd
status: approved
---

# Ruleproof — Product Requirements

Ruleproof turns a contest's official rules into a checklist where every item carries the sentence of the rules that requires it, with deadlines shown in the reader's own time. It is for a solo builder entering several online hackathons at once, often from another time zone than the organizers.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
1. **Arrive.** The home page says what Ruleproof does in one line and shows the input card: two ways in ("Paste the rules" and "Rules page link"), the time zone Ruleproof will use (detected from the browser, changeable), and "Try it with this hackathon's rules". Below it, "Your contests" lists contests already checked, or says none yet.
2. **Give it the rules.** They paste the rules text, or paste a link to the rules page, and press **Check the rules**.
3. **Wait briefly.** The button turns into a progress line ("Reading the rules…", then "Checking every quote against the rules…"). A reading usually takes 15 to 40 seconds. Pressing again does nothing while a reading runs.
4. **See the brief.** The contest opens on its own page:
   - the contest name;
   - **Due**: the submission deadline in their time, large, with weekday, date, time and zone, and a countdown ("23 days, 4 hours left");
   - the deadline as the rules wrote it, quoted, with its proof;
   - **Add to calendar**;
   - other key dates (registration, judging, winners) in small type, also in their time;
   - progress ("3 of 11 done");
   - the checklist, grouped as **Submit**, **Build**, **Can you enter?** and **Watch out**, then **How it's judged** for reference;
   - **Not found in the rules**, a separate group for anything whose quote could not be verified.
5. **Check the proof.** Beside the checklist sits the full rules text. Every verified quote is lightly highlighted in it. Clicking an item (or its proof) scrolls the rules to that sentence and marks it strongly.
6. **Work through it.** They tick items as they finish them. Ticks are saved at once; closing and reopening the page keeps them.
7. **Come back.** On the home page, "Your contests" shows each contest with its due time, countdown and progress, soonest deadline first. Opening one returns to its brief.

Success: from pasting the rules to seeing a brief they can trust, with each item one click away from its sentence. Source: `scope.md > What "Working" Looks Like`.

## Screens and Layout
- **Home**: one centered column (about 860px). Header with the name "Ruleproof" and the one-line promise; the input card; "Your contests" below.
- **Contest brief**: on wide screens (1024px and up) two columns: the checklist on the left (about 45%) and the rules text on the right (about 55%), each scrolling on its own, with the deadline header above the checklist. On narrow screens the checklist fills the screen, and tapping a proof opens the rules as a full-screen sheet scrolled to the sentence, with a close button.
- Moving between them: the name in the header returns home; each contest in "Your contests" opens its brief. Each brief has its own address so the browser's back button works.

## Look and Feel
Source: `scope.md > Inspiration & Identity`.
- **Feel**: a preflight checklist next to a printed contract with highlighter marks. Calm, plain, high contrast.
- **Colors**: warm paper background (#F7F5EF), white cards with hairline borders (#E4E0D6), near-black ink (#1D1C1A), muted secondary text (#6B675E). Highlighter yellow (#FFE873) for proof. Signal red-orange (#D9481C) for the deadline, used sparingly, and for countdowns under three days. A quiet green (#2E7D4F) for ticked items and progress. Amber (#B26B00) for "Not found in the rules".
- **Type**: IBM Plex Sans for the interface, IBM Plex Mono for times, countdowns and small labels, IBM Plex Serif for the rules text so it reads like a document.
- **Shape**: small radii (4px), hairlines instead of shadows, no gradients, no emoji, no sparkle icons, no chat bubbles.
- **Copy**: short and plain. "Check the rules", "In the rules", "Not found in the rules", "Add to calendar".

## Features and Behavior

### Reading the Rules
Source: `scope.md > The Core Loop` (step 1), `scope.md > The POC Boundary`.
- **Paste**: a large text box. Fewer than 300 characters → "That's too short to be a rules page. Paste the whole rules text."
- **Link**: a web address field. Ruleproof fetches the page and keeps only its readable text. If the page can't be fetched or yields too little text → "Couldn't read that page. Copy the rules text and paste it instead." and the paste box opens.
- **Too long**: more than 200,000 characters → "That's more than Ruleproof can read at once. Paste just the official rules."
- **The reading**: the AI returns the contest name; every key date with its label, the date and time as written, the time zone as written and the quote it came from; the checklist items, each with a short title (an instruction), one line of detail with the specific limits (lengths, formats, places) and a word-for-word quote; and the judging criteria with weights when stated.
- **Same rules twice**: pasting rules already checked opens the existing brief, ticks intact.
- **Example**: "Try it with this hackathon's rules" checks the official rules page of Build With AI: Basics through the link path, so it shows the real flow.
- Acceptance:
  - [ ] Pasting the Build With AI: Basics rules produces a brief with at least one item in each of Submit, Build and Can you enter?
  - [ ] Too-short and too-long input show their messages and nothing is sent.
  - [ ] A rules page link produces the same kind of brief as pasting its text.

### Proof for Every Item
Source: `scope.md > The Unique Kernel`.
- Each item shows its quote under the title, shortened to two lines, with a status: **In the rules** when the quote is found in the rules text, ignoring differences in spacing, letter case, curly versus straight quote marks and dash styles.
- Items whose quote is not found go to **Not found in the rules** with the line "The rules don't say this word for word. Check before you rely on it." They have no checkbox, and they can be dismissed.
- Every found quote is lightly highlighted in the rules text; selecting an item scrolls to its quote and marks it strongly; clicking a highlight in the rules text selects its item.
- Acceptance:
  - [ ] Every item in the main checklist, when clicked, scrolls the rules to a highlighted passage that contains its quote.
  - [ ] An item whose quote has been altered (for testing) appears under Not found in the rules, not in the checklist.

### Deadline in Your Time
Source: `scope.md > What "Working" Looks Like`.
- The submission deadline is shown in the reader's time zone first ("Mon, Oct 26 · 2:00 PM PDT"), with the rules' own wording quoted underneath ("October 26, 2026 (5:00 pm Eastern Time)").
- The countdown updates every minute; under 72 hours it turns red-orange; after the deadline it reads "Closed 3 days ago".
- If the rules give a date but no time zone → "Time zone not stated in the rules", the time shown as written, no conversion. If no time → "Time not stated".
- The time zone used is shown on the home page and can be changed; all times follow it.
- **Add to calendar** downloads a calendar file for the submission deadline, titled "<Contest> closes", with reminders three days, one day and three hours before, and the quote and rules link in its notes.
- Acceptance:
  - [ ] With the reader's zone set to America/Los_Angeles, the Build With AI: Basics deadline shows as Mon, Oct 26, 2:00 PM PDT; set to Asia/Seoul it shows Tue, Oct 27, 6:00 AM KST.
  - [ ] The calendar file imports into a calendar app at the correct time.

### Checklist and Progress
Source: `scope.md > The Core Loop` (step 3).
- Submit, Build, Can you enter? and Watch out items have checkboxes; How it's judged does not.
- Progress counts ticked items over all checkable items with proof.
- Acceptance:
  - [ ] Ticking two items, reloading the page and reopening the contest shows the same two ticked and the same progress.

### Your Contests
Source: `scope.md > The Core Loop` (step 4).
- Each saved contest shows its name, due time in the reader's zone, countdown and progress. Soonest open deadline first; closed contests last.
- A contest can be deleted after a confirmation.
- Acceptance:
  - [ ] Two contests with different deadlines are listed soonest first, and deleting one removes it after reload.

## States and Boundaries
- **First use**: no contests yet; the home page shows the input card, the example link and three short lines on how it works.
- **Reading**: progress line in place of the button; the input stays visible but locked.
- **Reader unavailable** (no AI configured, or the service is down) → "The rules reader is offline right now. Try again in a minute." Saved contests still open.
- **Too many readings** from one visitor in a minute → "Too many readings in a row. Wait a minute and try again."
- **Nothing found** (the AI returns no items) → "No requirements found. Is this the official rules page?"
- **What persists**: contests, their rules text, readings and ticks, in this browser only. Clearing site data removes them. Nothing is shared between devices.

## Product Decisions
- Every item must carry a word-for-word quote, and the app checks it: trust is the product, so proof is not optional. (Agent decision on the entrant's behalf, from the kernel.)
- Unverified items stay visible in their own group instead of disappearing, so the reader sees what the AI claimed and can judge it.
- The reader's time comes first and the rules' wording second: the question people ask is "when is that for me?"
- The original rules text stays on screen beside the checklist; Ruleproof never replaces the rules.
- Everything is stored in the browser; no accounts.
- The example uses this hackathon's own rules page, so the demo is a real reading rather than canned data.

## What We're Building
- Home page with paste and link input, time zone setting, example and "Your contests".
- One AI reading per new rules text, returning dates, grouped items with quotes, and judging criteria.
- Quote verification against the rules text; verified items in the checklist, unverified ones set apart.
- Side-by-side rules view with highlights and click-to-scroll in both directions; a full-screen sheet on narrow screens.
- Deadline conversion to the reader's zone, countdown, other dates, and a calendar file.
- Ticks and progress saved in the browser; a list of saved contests with delete.
- The error and empty states above.

## Deferred From the POC
- Accounts and syncing between devices: needs sign-in and storage on a server; one browser proves the idea.
- Automatic eligibility checks against a personal profile: needs a profile and judgement about residency rules; the Can you enter? group already surfaces the conditions with proof.
- Watching rules pages for changes: needs scheduled re-reading; out of a single-visit proof.
- Reminders by email or phone: needs a sending service; the calendar file covers reminders for now.

## Possible Later Enhancements
- Reading rules written in Korean and other languages.
- A browser extension that runs on the contest page itself.
- A rule-based reader that works with no AI, for offline use.
- Sharing a contest brief with teammates.

## Non-Goals
- Legal advice or interpretation of unclear rules: Ruleproof shows what the rules say and where.
- Finding or recommending contests.
- Reading PDFs or images directly.
- Grading a submission or predicting results.

## Open Questions
- Can the server fetch common rules pages (Devpost) directly, or will some block it? Investigate during the build; the paste path covers any page that blocks it. Does not block `4-spec`.
- How often will the AI's quotes fail verification on real rules pages? Measure during the build on a few real pages; the Not found group handles failures either way. Does not block `4-spec`.
