# Module 14 — Connecting Your Agent to Notion and Slack

**Series:** 8 videos — **6 concept videos** (~2 min each, the illustrated Ali format) plus **2 screencast
walkthroughs** (~2.5 min each, real Notion and Slack interfaces, click by click) · one protagonist (Ali) ·
one setting (the back room of his stationery shop) · one running project (his order agent).

**Module promise:** by the end, a beginner can connect their own agentic project to Notion and Slack
without hitting the four errors that stop everyone, and knows which of the two doors — connector or
token — their project actually needs.

---

## Why this module exists

Beginners do not fail at this because the code is hard. They fail on five specific things, in this order:

1. They never decide what should cross the boundary, so they wire everything and own nothing.
2. They reach for raw API code for a job the built-in connector would have done in one command.
3. They create the integration and assume it can see the workspace. It cannot. `object_not_found`.
4. They copy an ID out of the browser URL and query the wrong kind of object.
5. They do the work before acknowledging Slack, and the same action fires three times.

Each video owns exactly one of those, stages the real error on screen, and hands over the single fix.

---

## The videos

**Concept videos 1–6** — why, and what goes wrong. Illustrated Ali format.

| # | Title | Teaches (one concept) | The one move | The error it kills |
|---|-------|----------------------|--------------|--------------------|
| 1 | **Locked Out of the Room** | An agent becomes useful when it can read where the team's memory lives and write where the team's attention is | Name one thing to read, one thing to write — one door each side | The great agent nobody uses |
| 2 | **Two Doors In** | Hosted MCP connector vs API token, and how to choose | Ask "am I at the keyboard, or is it running without me?" | Weeks lost hand-coding what one command does |
| 3 | **The Key Only Opens One Room** | Tokens and scopes are a hotel key card — and Notion makes you hand the card to the room | Share the page, add the scope, reinstall, invite the bot | `object_not_found` · `not_in_channel` · `missing_scope` |
| 4 | **Rows, Not Paragraphs** | Write structured properties into a data source, not prose onto a page | Discover the `data_source_id` from the database, then query that | Wrong-ID 400s and unfilterable notes |
| 5 | **Speaking Without Spamming** | Acknowledge in three seconds, work after, dedupe, reply in thread | `ack()` first, then do the job, keyed on `event_id` | Triple-posting and self-reply loops |
| 6 | **Safe, Then Let It Run** | Secrets in the environment, a human before the irreversible action, a log of everything | Read-only in a test channel today, one write tomorrow | Revoked tokens and unrecoverable actions |

**Walkthroughs 7–8** — the actual click path, on the actual screens. Screencast format: `card` + `ui`
beats on real Notion and Slack interfaces, no illustrated art, TTS-only cost (the same format as the
Module 11 assessment guide, rendered by an `animation/walkthrough.html` built on `assessment.html`).

| # | Title | Screens | The one move | What the viewer has at the end |
|---|-------|---------|--------------|-------------------------------|
| 7 | **Notion, Click by Click** | 10 screens: new integration → capabilities → secret → `.env` → the three-dot menu → Connections → confirm → parent page → the two ids in the address bar → first rows | Create it, share the page under Connections, discover the `data_source_id` | Their own rows printing in their own terminal |
| 8 | **Slack, Click by Click** | 15 screens: create app → From scratch → admin notice → Bot Token Scopes → reinstall banner → Install to Workspace → `xoxb-` token → `.env` → test channel → `/invite` → joined → first message with the APP badge → threaded → Socket Mode | Add the scope, reinstall, copy the token, invite the bot | A threaded message from their own bot in their own test channel |

Both walkthroughs turn on the same sentence — **permission, then membership** — which is the frame that
makes them a pair instead of one long video. Video 8, beat 17 is that frame.

**Watch order.** 1 → 2 → 3 → **7** → 4 → 5 → **8** → 6. Concepts 3 and 4 earn the ideas that walkthrough 7
executes; 5 earns what 8 executes; 6 closes on safety once the thing actually runs. The videos are also
built to stand alone, so a learner who only wants the click path can watch 7 and 8 back to back.

Videos 3, 4, 5, 7 and 8 are the ones learners will come back to — 7 and 8 will be the most-replayed in the
whole module, so they carry a step counter (`3 / 7`) and hold the two pause-worthy frames longer than the
voiceover needs.

---

## What a learner needs BEFORE video 3

Lives on the module page and in the video descriptions. Only the admin-approval line is spoken on camera
(video 2, beat 14) — the rest would cost story time for no teaching gain.

- A Notion workspace they can create an integration in, and one page they are willing to share with it.
- A Slack workspace where they are allowed to install an app — **or an admin who will approve it**. The
  official Slack MCP server requires workspace-admin approval.
- Node or Python installed, an editor, and a `.env` file that is already in `.gitignore`.
- A **test** Slack channel and a **test** Notion page. Not `#general`. Not the real order table.

---

## Series continuity rules (locked)

- **Protagonist:** Ali, the same shopkeeper from the evals and autonomy series. Same face, same outfit,
  clean-shaven, one skin tone, across all six videos. Never renamed.
- **Setting const** (repeated verbatim in every `scene` art prompt):
  *the back room of Ali's stationery shop — cream walls, a wooden desk, a laptop with a plain blank
  screen, a fat paper order file, a chipped blue mug, a wall clock, boxes of notebooks stacked behind.*
- **The AI is the laptop.** A real laptop with a plain blank screen; its output is crisp on-screen HTML.
  Never a glowing orb, never a robot, never a floating brain.
- **Three staff** appear as illustrated figures in the shop, never named, never speaking lines.
- **No text baked into generated scene art.** Every error string, scope name and URL lives on an `info`
  card so it can be proofread.
- **Every video ends on one action the viewer can take today**, spoken, never a homework file.
- **The two walkthroughs are the one exception to the visual standard.** No illustrated setting, no
  real-laptop art, no `scene` quota, no Imagen spend and no `animateIds` — motion comes from the renderer
  (cursor travel, click pulses, typed text). Ali still opens and closes each one in the illustrated shop
  frame so the module reads as one series. Do not run `qa-visuals.js` against videos 7 and 8.
- **Nothing real on screen in the walkthroughs.** Invented shop data, invented channel names, masked
  tokens (masked in the render, never blurred afterwards), plain text wordmarks rather than vendor logos.

---

## Module close

Video 6 closes the module on a go-live checklist the learner can run on their own project. The module
does not end on "now you know how APIs work" — it ends on *your agent is reading one real table and
posting one real line into one real channel, and you can undo everything it does.*
