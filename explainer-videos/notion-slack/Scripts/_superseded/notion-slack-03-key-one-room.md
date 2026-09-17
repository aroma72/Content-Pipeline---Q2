# Video 3 — The Key Only Opens One Room — draft

**Teaches:** creating an integration grants your agent nothing — a token is a hotel key card, and in
Notion you must hand the card to the room, while in Slack you must add the scope and invite the bot.
**One move:** share the page, add the scope, reinstall the app, invite the bot — in that order.
**Real project / everyday spine:** Ali's key is made, his code is correct, and his order table still
returns nothing.

This is the video learners will come back to, so it is deliberately **error-first**: both real error
strings appear on screen, exactly as they arrive, and each is paired with the single setting that causes
it. It teaches no endpoints and no data shapes — video 4 owns those. The hotel key card is introduced
here and reused in video 6 for rotation and least privilege.

Deferred: which door to pick (video 2 — assume the learner chose a token here), data sources and IDs
(video 4), acknowledgement and duplicates (video 5), where the key is stored and who approves actions
(video 6). OAuth for public integrations is out of scope; this is an internal integration.

## Script (one beat per line · [ali] = character · [scene] = shop scene · [info] = infographic)

1.  [info]  Your agent's key opens only the rooms you hand it to.
2.  [scene] Ali creates his integration and copies the key into his project.
3.  [scene] He runs it, and his order table comes back completely empty. *(act: blank result on the laptop screen, Ali frowning)*
4.  [info]  404 · object_not_found *(error card, exact string)*
5.  [scene] He reads his four lines of code four times. The code is fine. *(act: finger tracing the screen)*
6.  [ali]   Then he reads the message properly: "has not been shared with your integration."
7.  [info]  Everybody hits this one. It is not a bug in your code. It is a permission.
8.  [info]  A key is a hotel key card, never a master key. *(analogy card: one room, one stay, cancellable)*
9.  [ali]   The front desk gives you one room, for one stay, and can cancel it any time.
10. [scene] In Notion you also have to walk the card to the room yourself. *(act: opening the page menu on screen)*
11. [info]  Open the page · the three dots · Connections · add your integration. *(steps card, 4 steps)*
12. [scene] Ali shares his order table, runs it again, and the rows finally appear. *(act: crisp table filling the screen)*
13. [info]  Parent pages count too. Sharing one child page is not enough. *(gotcha card)*
14. [scene] Then he tries to post the summary in the shop channel, and Slack refuses. *(act: a red refusal on screen, staff visible through the doorway)*
15. [info]  not_in_channel *(error card, exact string)*
16. [ali]   His bot is allowed to write. It is simply not in that room.
17. [info]  Two scopes, then one invite. *(steps card: chat:write · chat:write.public · /invite @yourbot)*
18. [info]  Every new scope needs the app reinstalled, or you get missing_scope.
19. [info]  QUESTION · Your integration returns object_not_found for a database you can see in your own browser. What is wrong? A — the token has expired · B — the database was never shared with the integration · C — your connection dropped · D — you need a paid Notion plan. Write your answer down. *(quiz card, no answer shown, holdAfter)*
20. [ali]   Ali hands the key one table and one channel, and nothing else.
21. [ali]   Not the whole workspace, because a key that opens everything cannot be trusted with anything.
22. [info]  REVEAL · B. Creating an integration gives it zero access until you share. *(same quiz card, B highlighted)*
23. [scene] Two errors cost him forty minutes today. Tomorrow they cost him forty seconds. *(act: Ali writing the two error names on a card and pinning it above the desk)*
24. [info]  Share the page. Add the scope. Reinstall. Invite the bot. *(closing checklist card, spoken in full)*
25. [ali]   Your turn. Open the one page your agent must read and look at its Connections.
26. [ali]   If your integration is not listed there, that is your 404 already waiting.

## Gate check

**READY** · 26 beats · 8 [scene] (31%) · 8 [ali] · 10 [info] · average ~12 words per line

- **One move:** the four-step permission sequence. New concepts: key-as-key-card, sharing a page,
  parent pages, scopes, reinstall-on-new-scope, channel membership, least privilege. Seven — under the
  eight ceiling, and every one of them is a setting the learner must actually touch.
- **Leads with the answer:** beat 1 names the rule; the story then earns it twice.
- **Everyday picture:** a hotel key card that has to be walked to the room. Chosen over "the agent joins
  your team" precisely because a key card *fails closed and silently*, which is what a 404 is.
- **Before → after:** before is an empty table and a red refusal (3–5, 14–15); after is rows on screen
  (12) and the posted summary (implicit at 20–23). Both errors shown, both fixed on camera.
- **Character:** Ali doubts his code, is told plainly it is not his code, learns the sharing step, hits
  the second error, fixes that too, ends by pinning the two error names above his desk.
- **Emotional checkpoints:** beat 7 normalises hard ("everybody hits this one, it is not a bug in your
  code"), beat 16 removes blame from the bot, beat 23 converts the pain into competence. Three.
- **Interactive pair:** QUESTION at beat 19 (~⅔ through, `holdAfter: 6`), REVEAL at beat 22.
- **Exact strings on screen:** `object_not_found`, `not_in_channel`, `missing_scope`, `chat:write`,
  `chat:write.public`, `/invite @yourbot` — all verified in `research.md` (F4, F5) and reproduced
  character for character.
- **Numbers:** four lines read four times (5), four steps (11), two scopes plus one invite (17), forty
  minutes to forty seconds (23).
- **Data templates:** error card x2 (4, 15), key-card analogy card (8), steps card x2 (11, 17), gotcha
  card (13), quiz card (19, 22), closing checklist (24). Six distinct. Plain statement cards: 7 and 18 —
  two, at the ceiling.
- **No assignments.** Beat 25 is a spoken, thirty-second check the viewer can do in the browser.

## Build notes

- `animateIds = ['03', '10', '12']` — beat 3 (the empty result: the failure that starts everything),
  beat 10 (walking the key card to the room — the metaphor coming alive, and the single most important
  action in the module), beat 12 (rows finally appearing: the relief beat). Everything else is a still
  with a slow pan plus cutout micro-motion.
- **Setting const** in every `scene` prompt: *the back room of Ali's stationery shop — cream walls, a
  wooden desk, a laptop with a plain blank screen, a fat paper order file, a chipped blue mug, a wall
  clock, boxes of notebooks stacked behind.*
- Beats 4 and 15 are **error cards and must be typo-perfect**; render them in a mono face on the cream
  card, red only on the error name. Identical geometry for both so the viewer learns the shape.
- Beat 8: draw the key card as a real card in Ali's hand, one room number on it — **the number is an
  `info` overlay**, not baked art.
- Beats 11 and 17 must **evolve step by step** as the line is spoken, one row lighting at a time. No
  static four-item list.
- Beat 14: the refusal is crisp HTML on the laptop screen; show two of the three staff through the
  doorway waiting for a message that never came. That is the cost, and it must be visible.
- Beat 23: the pinned card above the desk becomes a recurring prop in videos 4, 5 and 6 — establish it
  clearly here.
- Leave air after beat 7 (the normalising beat) and after beat 22.
- **No text in any generated scene art.** Every error string, scope and menu label is an `info` layer.
