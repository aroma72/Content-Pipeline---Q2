# Video 4 — Rows, Not Paragraphs — draft

**Teaches:** give your agent a table to write rows into, not a page to write essays on — and target that
table by its **data source**, not by the id sitting in your browser address bar.
**One move:** ask the database what it contains, save the `data_source_id`, and write one row per event.
**Real project / everyday spine:** Ali's agent writes a beautiful paragraph about the day's orders, and
the following week he cannot answer a single question with it.

The concept is "structured output the API can query", and the ID discovery step is the mechanism that
makes it work — they are taught as one move, not two. The video shows the *cost* of prose first (a
question that cannot be answered) so that named columns feel like relief rather than bureaucracy. The
2025-09-03 database/data-source split is the single most current fact in the module and is stated once,
plainly, with the exact discovery call.

Deferred: permissions (video 3 — assume the table is already shared), posting to Slack (video 5),
webhooks, secrets and approval (video 6). Relations, rollups and multi-source databases are named at
most in passing and never taught.

## Script (one beat per line · [ali] = character · [scene] = shop scene · [info] = infographic)

1.  [info]  Give your agent rows to fill, not a page to write on.
2.  [scene] Ali's agent writes a beautiful paragraph about today's orders. *(act: prose filling a Notion page on the laptop screen)*
3.  [ali]   It reads well. It is also completely useless.
4.  [scene] A week later he needs every order above five thousand rupees. *(act: Ali scrolling back through walls of prose, mug forgotten)*
5.  [info]  A page holds words. A table holds answers. *(contrast card)*
6.  [scene] So Ali builds one table with five named columns instead. *(act: crisp empty table with headers on screen)*
7.  [info]  Date · item · quantity · amount · status *(properties card, five named properties)*
8.  [scene] One row per order, written by the agent, filterable by any of his staff. *(act: rows landing one after another)*
9.  [scene] He copies the id from the browser address bar, queries it, and it fails. *(act: red validation error on screen)*
10. [info]  That id is the box. It is not what is inside the box.
11. [info]  Since the 2025-09-03 version, a database holds one or more data sources. *(concept card: database as container, data source inside)*
12. [ali]   You query the data source. The database is only the box around it.
13. [info]  Step one · ask the database what it contains. *(steps card: GET /v1/databases/:id → data_sources[])*
14. [info]  Step two · query the data source you found. *(same card, step two lighting up: POST /v1/data_sources/:id/query)*
15. [scene] Ali saves that data source id in his config once, and stops guessing forever. *(act: pasting it into a config file on screen)*
16. [info]  QUESTION · You have a database id copied from a Notion URL. What do you do first? A — query that id directly · B — call GET /v1/databases/:id and read its data sources · C — paste it into the page · D — ask an admin for access. Write your answer down. *(quiz card, no answer shown, holdAfter)*
17. [info]  Pin your Notion-Version header, and read the upgrade guide before you change it. *(rule card)*
18. [ali]   Versions keep shipping. A pinned version is a project that still works next month.
19. [scene] The rows are there, and he filters for orders over five thousand in one click. *(act: filtered table, Ali sitting back)*
20. [info]  REVEAL · B. A database id and a data source id are not interchangeable. *(same quiz card, B highlighted)*
21. [ali]   One more limit: Notion allows about three requests a second.
22. [info]  Three per second · on a 429, read Retry-After and wait that long. *(limits card)*
23. [scene] So he writes his sixty rows in a queue, and not one of them fails. *(act: steady rows appearing, wall clock ticking)*
24. [info]  One table. Named columns. One row per event. *(closing card, spoken in full)*
25. [ali]   Your turn. Name the five columns your agent's output would fill.
26. [ali]   If you cannot name them, your agent is about to write prose again.

## Gate check

**READY** · 26 beats · 8 [scene] (31%) · 8 [ali] · 10 [info] · average ~12 words per line

- **One move:** discover the data source, then write rows. New concepts: table-not-page, named
  properties, database-as-container, data source, the discovery call, pinned version, three per second.
  Seven — under the eight ceiling.
- **Leads with the answer:** beat 1, before any story.
- **Everyday picture:** a shopkeeper who wrote his day up in sentences and then could not add up his own
  takings. The pain is arithmetic, not abstraction.
- **Before → after:** before is prose he has to scroll through (2–4) and a failed query (9); after is a
  one-click filter (19) and sixty clean rows (23). Same table, same question, visible difference.
- **Character:** Ali is proud of the paragraph, is defeated by his own question a week later, rebuilds as
  a table, hits the ID trap, learns the two-step discovery, and ends able to answer in one click.
- **Emotional checkpoints:** beat 3 lets him be wrong without shame, beat 10 reframes the failure as a
  naming problem rather than a coding one, beat 18 reassures that pinning is protection not pedantry.
- **Interactive pair:** QUESTION at beat 16 (~⅔ through, `holdAfter: 6`), REVEAL at beat 20.
- **Exact strings on screen:** `2025-09-03`, `GET /v1/databases/:id`, `data_sources[]`,
  `POST /v1/data_sources/:id/query`, `Notion-Version`, `Retry-After`, `429` — all verified in
  `research.md` (F6, F7, F8).
- **Numbers:** five columns (6, 7, 25), five thousand rupees (4, 19), three requests per second (21, 22),
  sixty rows (23).
- **Data templates:** contrast card (5), properties card (7), concept card (11), two-step evolving steps
  card (13–14), rule card (17), limits card (22), quiz card (16, 20), closing card (24). Seven distinct.
  Plain statement cards: 10 and 24 — two, at the ceiling.
- **No assignments.** Beat 25 is a spoken naming exercise, done in the viewer's head.

## Build notes

- `animateIds = ['02', '08', '19']` — beat 2 (prose pouring onto the page: the mistake, made attractive
  on purpose), beat 8 (rows landing one after another — the metaphor of the whole video), beat 19 (the
  filter snapping to three rows and Ali sitting back: the payoff). Stills plus slow pan everywhere else.
- **Setting const** in every `scene` prompt: *the back room of Ali's stationery shop — cream walls, a
  wooden desk, a laptop with a plain blank screen, a fat paper order file, a chipped blue mug, a wall
  clock, boxes of notebooks stacked behind.* The pinned error card from video 3 stays above the desk.
- Beats 13–14 are **one evolving card**, not two: step one appears, then step two lights up beneath it
  with the arrow between them. This card is the takeaway frame of the video — proofread it against
  `research.md` section D, character by character.
- Beat 11: draw the container relationship literally — one outer box labelled by overlay as the database,
  one inner card as the data source. Overlay labels only; nothing baked into the art.
- Beat 9: the validation error is crisp HTML on the laptop screen, same card geometry as video 3's error
  cards so the viewer recognises the shape.
- Beat 6 and beat 19 must be the **same table, same position on screen** — empty then filtered — so the
  before and after read as one object.
- Beat 23: the queue is shown as steady, evenly spaced rows with the wall clock visible. Never a burst.
- Leave air after beat 5 and after beat 20.
- **No text in any generated scene art.** Column names, endpoints and ids are `info` layers only.
