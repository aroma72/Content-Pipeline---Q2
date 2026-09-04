# Video 7 — Notion, Click by Click — draft

**Format: SCREENCAST (not the Ali illustration format).** Every step is a real Notion / editor screen,
rendered the way the Module 11 assessment guide is rendered — `card` + `ui` beats only, no Imagen art,
TTS-only cost. Ali appears in voice at the open and close so the series still holds together.

**Teaches:** the exact seven steps — across ten screens — that take a Notion integration from "created" to "returning my rows".
**One move:** create it, share the page under Connections, then discover the data source id.
**Real project / everyday spine:** we are wiring the key for Ali's order agent, and the viewer follows
along in their own workspace.

This is the video learners will pause and replay, so it is built for **following, not for watching**: one
action per beat, the cursor visible, and every field named out loud before it is typed. It teaches nothing
new conceptually — videos 3 and 4 already earned the ideas. Its only job is that the viewer's own
integration returns rows by the end.

Deferred: Slack (video 8), everything conceptual (videos 1–6). Public OAuth integrations, webhooks and
multi-source databases are out of scope.

## Script (one beat per line · [card] = full-screen card · [ui] = interface screen · [ali] = character)

1.  [card] Five minutes, seven steps, and your agent can read your Notion table. *(title card)*
2.  [ali]  We are making the key for Ali's order agent — do it in your own workspace as we go.
3.  [ui]   Go to notion dot so slash my dash integrations, and click New integration. *(N1 · cursor to the button)*
4.  [ui]   Name it after the job, choose your workspace, and leave the type as internal. *(N1 · form filling in)*
5.  [ui]   Give it three capabilities — read content, update content, insert content. *(N3 · three checkboxes ticking one at a time)*
6.  [ui]   Nothing more than that. A key should open as little as possible. *(N3 · the unticked boxes held)*
7.  [ui]   Copy the secret once, and paste it straight into your dot env file. *(N2 → N2b · secret revealed then landing in .env)*
8.  [ui]   Not into your code. A scanner will find it there, and your key will be cancelled. *(N2b · .gitignore visible below)*
9.  [card] That is the easy half. The half everyone skips is next. *(signpost card)*
10. [ui]   Open the page you want it to read, and click the three dots, top right. *(N4 · cursor to the dots, menu opening)*
11. [ui]   Scroll down to Connections, and click it. *(N4 · menu scrolling, Connections highlighted)*
12. [ui]   Search your integration by name, and confirm. *(N5 · name typed, result selected)*
13. [ui]   Read that confirmation. This is the exact moment access is granted. *(N5 · the confirm dialog held)*
14. [ui]   If your table sits inside another page, do this on the parent page too. *(N4b · a nested page tree, parent highlighted)*
15. [card] QUESTION · You added your integration under Connections on the child page, and you still get object_not_found. What is the most likely cause? A — the secret is wrong · B — the parent page was never shared · C — Notion is down · D — the integration needs reinstalling. Write your answer down. *(quiz card, no answer shown, holdAfter)*
16. [ui]   Now the id. It is in the address bar, and it is the part before the question mark. *(N6 · address bar, the id segment highlighted)*
17. [ui]   The part after v equals is the view. That is the one beginners copy by mistake. *(N6 · the ?v= segment highlighted in a different colour)*
18. [ui]   Ask the database what it holds, and read the data source id out of the reply. *(N7 · the GET call and the data_sources array on screen)*
19. [ui]   Then query that data source, and your rows come back. *(N7b · rows printing in the terminal)*
20. [card] REVEAL · B. Sharing the child page is not enough — the parent has to be shared too. *(same quiz card, B highlighted)*
21. [card] Create · capabilities · secret · Connections · confirm · id · first rows. *(checklist card, the seven steps, ticking in sequence)*
22. [ali]  Ali's agent can read the order table now, and nothing else in the workspace.
23. [ali]  Your turn. Do those seven steps, then come back for the Slack half.

## Screens to capture or re-create — ten screens across the seven steps

| ID | Screen | Must be visible | Must NOT be visible |
|----|--------|-----------------|---------------------|
| N1 | `notion.so/my-integrations` → **New integration** form | The "New integration" button, then name field, workspace picker, type = Internal | Other integrations in the list, the real workspace name |
| N2 | Integration created → **Internal Integration Secret** | The Show / Copy control, the secret masked as dots | Any real secret characters, even blurred |
| N2b | Editor: `.env` and `.gitignore` side by side | `NOTION_TOKEN=` with a masked value, `.env` listed inside `.gitignore` | A real token |
| N3 | Integration **Capabilities** section | Read content, Update content, Insert content ticking one at a time; user-information options left off | — |
| N4 | The order database page → `...` menu open → **Connections** | The three-dot button, the open menu, Connections highlighted | Real customer or order data — use invented rows |
| N4b | Same page inside a **parent** page | The sidebar tree showing parent → child, parent highlighted | Real page titles from the workspace |
| N5 | **Connections** → search → confirm dialog | The typed integration name, the result row, the confirmation wording about access | — |
| N6 | Browser address bar of the database page | The 32-character id segment highlighted; the `?v=…` view id highlighted separately | The real workspace subdomain |
| N7 | Terminal / editor: `GET /v1/databases/:id` response | `Notion-Version` header, the `data_sources` array, one `id` inside it | A real token in the header — mask it |
| N7b | Terminal: `POST /v1/data_sources/:id/query` response | Three or four invented order rows printing | — |

**Two production routes.** *(recommended: re-create)*
- **Re-create in HTML** — a new `animation/walkthrough.html` built on `assessment.html`'s chrome, with a
  browser frame instead of the IDE window. Costs nothing, is proofread-able, re-renders in seconds when a
  vendor moves a button, and keeps the house rule that no text is ever baked into art. Use plain text
  wordmarks, no vendor logos, and invented shop data throughout.
- **Real screengrabs** — Aroma captures the ten screens from her own workspace. More authentic, but every
  frame needs a pass for real names, real page titles and real token characters, and it goes stale
  silently when the UI changes. Worth it for N4 and N5 only, if we want two hero frames.

## Gate check

**READY** · 23 beats · 15 [ui] (65%) · 5 [card] · 3 [ali] · average ~13 words per line

- **Format exception, deliberate:** the evals-grade visual standard (28% `scene`, illustrated setting,
  real-laptop art) does not apply to the screencast format — the same exception the Module 11 assessment
  guide runs under. The visual standard here is: one action per screen, a visible cursor, and every
  element named before it is clicked. Flagging it so the visuals gate is not run against this file.
- **One move:** create → share under Connections → discover the data source. New concepts: none. Every
  idea here was earned in videos 3 and 4; this is execution only.
- **Leads with the answer:** beat 1 states the whole job and its length.
- **Before → after:** before is a created integration that returns nothing; after is rows printing in a
  terminal (19). The viewer's own workspace is the before-and-after.
- **Emotional checkpoints:** beat 2 invites them to follow along at their own pace, beat 9 warns them that
  the skipped step is coming (rather than letting them fail), beat 17 names the mistake as normal. Three.
- **Interactive pair:** QUESTION at beat 15 (~⅔ through, `holdAfter: 6`), REVEAL at beat 20.
- **Exact strings on screen:** `object_not_found`, `Notion-Version`, `data_sources`,
  `GET /v1/databases/:id`, `POST /v1/data_sources/:id/query`, `.env`, `.gitignore` — all verified in
  `research.md` (F4, F6, F13).
- **Numbers:** seven steps (1, 21) shot across ten screens, three capabilities (5), five minutes (1).
  The spoken count is always *steps*; the capture table counts *screens*.
- **No assignments.** Beat 23 is a spoken hand-off to video 8.

## Build notes

- **No Imagen art, no i2v, no `animateIds`.** Movement comes from the renderer: cursor travel, click
  pulses, typed text appearing character by character, and menus scrolling. Every beat must contain one of
  those — a still interface screen is a failed beat in this format.
- Add a **step counter** in the corner (`3 / 7`) that advances on beats 3, 5, 7, 10, 12, 16, 18 — this is a
  follow-along video and people need to know where they are.
- `holdAfter` on beat 15 as usual; also **hold beats 13 and 16 longer than the voiceover** — those are the
  two frames viewers will pause on.
- Beats 10–13 are the heart of the video. One continuous browser frame, no cuts, cursor moving between
  them, so the whole Connections path reads as a single motion.
- Beat 17 must **contrast the two ids in one frame** — same address bar, two different highlight colours,
  the wrong one clearly marked. Do not show it as two separate screens.
- Beat 21's checklist ticks in the same order the video performed the steps, and its wording matches the
  step counter labels exactly.
- Ali's two beats (2, 22–23) use the standard illustrated shop frame from the concept videos, so the
  series bookends visually. They are the only illustrated frames in this video.
- Every masked value must be masked **in the render**, not blurred afterwards.
