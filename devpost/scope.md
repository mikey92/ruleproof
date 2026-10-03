---
doc: scope
status: approved
---

# Ruleproof

Paste a contest's official rules and get the checklist hiding inside them: what to submit, what to build, who can enter and when it is due in your own time, with every item pinned to the sentence of the rules that says so.

## The Unique Kernel
Nothing goes on the checklist without proof. An AI reads the rules, but every item it returns must quote the rules, and the app checks each quote against the original text. Items whose quote is found link straight to the highlighted sentence in the rules; items whose quote cannot be found are set apart as "not in the rules", so a hallucinated requirement never passes as a real one.

## Who It's For
A solo builder entering several online hackathons at once, often from a different time zone than the organizers (someone in California entering a contest that closes at "5:00 pm Eastern Time", or someone in Seoul entering one that closes at "11:59 PM PT"). The rules page runs to hundreds of lines, and the requirements that disqualify people are scattered through it: a video limit, a license that must show on the repository page, files that must be in the repo, who is excluded.
What they do today: skim the rules late at night, copy bits into a notes app, convert the deadline in their head, or paste the rules into a chatbot and get a summary they cannot check line by line.

## The Core Loop
1. They find a contest and paste its rules (or the rules page link) into Ruleproof.
2. Ruleproof reads them and shows a brief: the deadline in their own time with a countdown, then the checklist (submit, build, can you enter, watch out), each item with its proof.
3. They click an item to see the exact sentence lit up in the rules, and tick items off as they finish them.
4. They come back while building to see what is left and how long they have. Each contest they add stays in their list.

## Inspiration & Identity
- A pilot's preflight checklist: short, ordered, nothing decorative, you tick it before takeoff.
- A highlighter on a printed contract: the rules shown like a document, with the proof marked in yellow.
- Times set like a departures board, in monospace.
- Reference for summarizing long terms with sources: ToS;DR (https://tosdr.org).
- Calm and utilitarian. No purple gradients, no chat bubbles, no sparkle icons.

## Why This Matters to the Learner
The entrant is running about ten online contests in parallel this season from California, with deadlines written in Eastern, Pacific, Korea and UTC+3 time. Requirements such as "less than three (3) minutes", a license "visible at the top of the repository page", or identity and phone checks at registration are easy to miss in a skim, and missing one costs the entry. They want something that reads the rules alongside them and shows its work.

## What "Working" Looks Like
Open Ruleproof, paste the official rules of Build With AI: Basics, press the button. Within about half a minute the brief appears: "Due Mon, Oct 26 · 2:00 PM" in the viewer's time (with "5:00 pm Eastern Time" quoted beneath it) and a countdown, followed by items such as "Demo video under 3 minutes, public on YouTube or Vimeo", "Public repo with an open-source license shown in the About section" and "scope.md, prd.md and spec.md in the repo". Clicking an item scrolls the rules beside it to the highlighted sentence. Ticking items and reloading the page keeps the ticks. The deadline can be added to a calendar.
The "oh, that's cool" beat: a requirement you would have skimmed past ("Judges are not required to watch beyond three minutes") shows up with its sentence lit, and anything the AI claimed but the rules never said is visibly marked as not found.

## The POC Boundary
- Rules in by pasting text or giving a public rules page link.
- One AI reading that returns the brief: key dates, submit/build items, eligibility, watch-outs and how entries are judged, each with a verbatim quote.
- The app verifies every quote against the rules text, highlights it in a side-by-side view, and separates anything unverified.
- Deadlines converted from the organizer's time zone to the viewer's, with a countdown.
- Ticking items, saved in this browser, and a list of saved contests.
- Add the main deadline to a calendar (.ics file).
- A built-in example (this hackathon's own rules) so the app can be tried without pasting anything.

## Later
- A personal profile (country, age, student or not) that checks eligibility automatically.
- Watching a rules page and flagging changes after you saved it.
- Reading rules in other languages (Korean contests first).
- A browser extension that runs on a contest page.
- Reminders by email or phone.
- A rule-based reader that works with no AI at all.

## Explicitly Cut
- Accounts and login: one person's browser is enough to prove the idea, and sign-in adds nothing to the kernel.
- Finding or recommending contests: a different product; Ruleproof starts once you have picked one.
- Advice on how to interpret unclear rules: Ruleproof shows what the rules say and where; it does not give legal advice.
- PDF upload: copying the text out of a PDF covers it for now.
- Team sharing and sync: a single builder is the user for this proof of concept.
