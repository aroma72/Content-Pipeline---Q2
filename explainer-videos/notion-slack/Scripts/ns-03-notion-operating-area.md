# Video 3 — Notion, The Operating Area — draft

**Format: technical how-to walkthrough.** No protagonist. Real Notion screens, `card` + `ui` beats, cursor visible, no illustrated art.
**Covers:** guide §3, every step
**Teaches:** the agent gets a task board it can read and write, which means an integration, a database
with four columns, the sharing step everybody misses, and exactly two values handed over.
**One move:** create it, build the board, **share it under Connections**, copy the two values.
**Spine:** by the end of this video a card the agent created appears on your board while you watch.

Built for following, not watching: one action per beat, every field named before it is typed. Nothing
conceptual — videos 1 and 2 earned the ideas.

Deferred: Slack (video 4), GitHub (video 5), where the values are pasted (video 6).

## Script (one beat per line · [card] = full-screen card · [ui] = interface screen · [info] = spoken point on a card)

1.  [card] Five steps, and the agent has a board it can read and write. *(title card)*
2. [info] We are building the place your agent keeps track of its own work.
3.  [ui]   Go to notion dot so slash my dash integrations, and click New integration. *(N1)*
4.  [ui]   Name it after the agent, pick the workspace, and submit. *(N2)*
5.  [ui]   Copy the Internal Integration Secret. This is the agent's key — treat it like a password. *(N3)*
6.  [card] One down. The next two are the board itself. *(signpost)*
7.  [ui]   Make the database that will be the task board. *(N4)*
8.  [ui]   Four columns, and the names matter: Name, Status, Priority, Notes. *(N5)*
9.  [ui]   Status is a select — to do, in progress, done, blocked. *(N6)*
10. [ui]   Priority is a select too — low, medium, high — so it knows what to pick up first. *(N6b)*
11. [ui]   Notes is where the agent writes its own log as it works. *(N7)*
12. [card] Now the step everybody misses. *(signpost — hold)*
13. [ui]   Open the board, click the three dots, top right. *(N8)*
14. [ui]   Choose Connections, and add the integration by name. *(N9)*
15. [ui]   The key alone does nothing. Notion also needs you to share the page with it. *(N9 held)*
16. [info] Same as inviting a person. Having a key is not the same as being let in.
17. [checkpoint] *(nothing on screen — the player pauses, the LMS asks, gives feedback, resumes)*
18. [ui]   Last, the database ID — the thirty-two characters in the URL, before the question mark. *(N10)*
19. [ui]   The part after v equals is the view, not the board. *(N10, second highlight)*
20. [card] Two values go to the agent: the secret, and the database ID. *(checklist)*
21. [ui]   Test it by having the agent create one card. *(N11 — code, then the card appearing)*
22. [ui]   If it appears on your board, the connection is real. *(N12 — the board with the new row)*
23. [info] That card was not typed by a person. That is the whole point.
24. [info] Your turn. Build the board, share it, and make one card appear.

## The checkpoint (beat 17)

**Stem.** You created the integration, copied the secret, and your code returns a 404 saying the
database does not exist — but you are looking straight at it in your browser. What is wrong?

**Options.**
- A — The secret was copied incorrectly
- B — The database was never shared with the integration under Connections
- C — The database ID includes the view ID
- D — Notion needs a paid plan for API access

**Answer.** B.

**If they get it right.** Exactly — and note how the error lies to you. It says "does not exist", which
sends people hunting for a typo in the ID, when the real meaning is "exists, but not for you". Creating
an integration grants it nothing until you open the page, choose Connections, and add it by name.

**If they get it wrong.** It is the sharing step, and the reason it catches everyone is that you can see
the database perfectly well — but you are signed in as *you*, and the integration is not you. It has its
own identity with access to nothing until a human explicitly shares a page with it. A mistyped secret
would fail as an authentication error, not a missing object; a view ID in the database ID gives a
different, clearer error; and none of this requires a paid plan. Whenever Notion says something does not
exist while you are staring at it, check Connections first.

## Screens to capture or re-create

| ID | Screen | Must be visible | Must NOT be visible |
|----|--------|-----------------|---------------------|
| N1 | `notion.so/my-integrations` | The **New integration** button | Other integrations, the real workspace name |
| N2 | New integration form | Name field filled with the agent's name, workspace picker, Submit | The real workspace name |
| N3 | Integration → **Internal Integration Secret** | The Show/Copy control, the secret masked as dots, the `ntn_`/`secret_` prefix only | Any real secret characters |
| N4 | A new Notion database | The empty board/table view | Real page titles in the sidebar |
| N5 | The four columns | `Name` (title), `Status`, `Priority`, `Notes` — added one at a time | — |
| N6 | `Status` select options | To Do · In Progress · Done · Blocked | — |
| N6b | `Priority` select options | Low · Medium · High | — |
| N7 | `Notes` rich-text column | An invented agent log line | Real project data |
| N8 | The board → `···` menu open | The three-dot button, the open menu | Real page titles |
| N9 | **Connections** → search → confirm | The typed integration name, the result row, the confirmation about access | — |
| N10 | The board's URL in the address bar | The 32-character ID highlighted; the `?v=…` view ID highlighted separately, in a different colour | The real workspace subdomain |
| N11 | Editor/terminal: create-or-update | The query-then-create shape; `NOTION_API_KEY` and `NOTION_GOALS_DB_ID` as names only | Any real key |
| N12 | The board with the agent's card | One new row: Name, Status = In Progress, a Notes line | Real customer or task data |

**Production:** re-create in `animation/walkthrough.html` (recommended — proofread-able, re-renders when
a vendor moves a button, cannot leak) or capture real screens with a scrub pass for names and tokens.

## Gate check

**READY** · 24 beats · 15 [ui] · 4 [card] · 4 [info] · 1 [checkpoint] · ~2:15

- ** skips this automatically** — no character art, so its §3d rules do not apply. The bar here: one action per screen, a visible cursor, every element named
  before it is clicked.
- **Checkpoint:** beat 17, between two spoken beats (16 → 18), 4 options, both halves authored,
  wrong-answer feedback explains why the error message misleads. Passes `qa-checkpoint`.
- **Covers §3 completely:** integration (3–5), the four columns with their options (7–11), Connections (12–15), database ID
  and the view-ID trap (18–19), the two values (20), the create-or-update test (21–22).
- **No assignments.** Beat 23 is a spoken instruction to do the thing they just watched.

## Build notes

- **No Imagen art, no i2v.** Motion is cursor travel, click pulses, typed text, menus opening.
- **Step counter** in the corner (`3 / 5`), advancing on beats 3, 7, 13, 18, 21.
- **Beats 12–15 are the heart of the video** — one continuous browser frame, no cuts, the cursor moving
  from the three dots to Connections to the confirmation. That path is what people skip.
- Beat 19 must **contrast both IDs in one frame**, two highlight colours, the wrong one marked.
- Beat 21's code is shown as four or five lines maximum — the query-then-create shape, not the full file.
- The spoken-point beats are plain typographic cards — one sentence, set large, no illustration.
- Every masked value is masked **in the render**, never blurred afterwards.
