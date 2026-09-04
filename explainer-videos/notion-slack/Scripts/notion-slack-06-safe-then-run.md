# Video 6 — Safe, Then Let It Run — draft

**Teaches:** before an agent gets real keys, the secret belongs in the environment, a human belongs in
front of anything you cannot undo, and every action belongs in a log.
**One move:** move the key out of the code, name the one action that needs approval, and write down what
the agent did.
**Real project / everyday spine:** Ali pushes his project at eleven at night, proud of it, and wakes up
to a dead Slack token.

This is the module close, so it converts the whole series into something Ali can leave running. The leak
story is told as a *lucky escape* rather than a disaster, because the honest lesson is that the revocation
was the system protecting him. Human-in-the-loop is taught with one word — **before** — and one action, not
as a governance framework. The hotel key card from video 3 returns for rotation.

Deferred: nothing. This video may reference every earlier video and closes the module. Secrets managers,
audit tooling, staging environments and confidence scoring are named at most once and never taught.

## Script (one beat per line · [ali] = character · [scene] = shop scene · [info] = infographic)

1.  [info]  Move the secret out of the code, and put a person in front of anything you cannot undo.
2.  [scene] At eleven at night, Ali pushes his project to GitHub, pleased with it. *(act: the push completing on the laptop screen)*
3.  [scene] By morning, his Slack token is dead. *(act: a revoked-token message on screen, Ali's mug untouched)*
4.  [info]  The key was in the code. A scanner found it and Slack cancelled it. *(fact card)*
5.  [ali]   And that was the good outcome. A stranger could have found it first.
6.  [info]  The secret lives in a .env file, and .env lives in .gitignore. *(steps card, two lines)*
7.  [ali]   The code reads the key from the environment, and never holds it.
8.  [info]  Then rotate it, because a key you cannot cancel is not a key. *(callback card: the hotel key card from video three)*
9.  [scene] Before testing anything, Ali makes a test channel and a test page. *(act: two new empty spaces on screen)*
10. [ali]   Nobody should learn on the real order table, or in the channel everyone reads.
11. [info]  Read-only on day one. One write on day two. *(progression card)*
12. [scene] His agent may read what it needs, and write in exactly one place. *(act: one table lit, everything else dim)*
13. [info]  QUESTION · Which of these should the agent never do without a human approving first? A — read the orders table · B — post a summary in the test channel · C — delete a customer's page · D — list the channels it can see. Write your answer down. *(quiz card, no answer shown, holdAfter)*
14. [scene] A week in, the agent proposes deleting a duplicate customer page. *(act: a proposal card waiting on screen, nothing happening yet)*
15. [info]  It proposes. A person approves. Then it happens. *(hinge card, three steps in order)*
16. [ali]   The word that matters is "before". Approval afterwards is just news.
17. [info]  Put the human where a mistake is expensive, or cannot be undone. *(rule card)*
18. [info]  REVEAL · C. A deleted page is the one thing Ali cannot get back in a click. *(same quiz card, C highlighted)*
19. [scene] Everything the agent does gets written down, whether it worked or not. *(act: log lines appearing steadily on screen)*
20. [info]  What it did · what it touched · when · who approved it. *(log card, four fields)*
21. [scene] When something looks wrong, Ali reads the log instead of guessing. *(act: finger on one log line, expression clearing)*
22. [ali]   You cannot fix what you cannot see.
23. [scene] One table read, one line posted, every action recorded, and the shop closes on time. *(act: calm back room at closing, staff leaving, laptop screen tidy)*
24. [info]  Secret in the environment. Human before the irreversible. A log of everything. *(closing card, spoken in full)*
25. [ali]   Your turn. Say out loud the one action your agent must never take alone.
26. [ali]   Put a person in front of that one, and you are ready to let it run.

## Gate check

**READY** · 26 beats · 8 [scene] (31%) · 7 [ali] · 11 [info] · average ~12 words per line

- **One move:** secret out, human before the irreversible, log it. New concepts: env file, gitignore,
  scanners revoke leaked keys, rotation, test channel and test page, read-only first, propose-approve-act,
  log fields. Eight — at the ceiling, and three of them are single-card practicalities.
- **Leads with the answer:** beat 1 states both halves of the fix.
- **Everyday picture:** a shopkeeper who left a key taped to the shop window, and the locksmith who
  changed the lock before a stranger tried it.
- **Before → after:** before is a token revoked overnight (2–4) and an agent that could delete a customer
  page unasked (14); after is a key in the environment (6–7), one write in one place (12), a proposal
  waiting for a person (15), and a log to read (21). Countable and all on screen.
- **Character:** Ali is proud, then punished mildly, then told he was lucky, then rebuilds carefully, then
  meets the irreversible action and is *ready* for it, and finally closes the shop on time. The arc of
  the whole module lands on him, not on a diagram.
- **Emotional checkpoints:** beat 5 reframes the loss as protection, beat 10 makes caution normal rather
  than timid, beat 22 gives him a sentence to keep, beat 23 pays off the module. Four.
- **Interactive pair:** QUESTION at beat 13 (~½ through by design — the approval discussion needs the
  answer held across it, `holdAfter: 6`), REVEAL at beat 18.
- **Exact facts on screen:** `.env`, `.gitignore`, leaked keys are detected and revoked by the provider,
  rotate, propose-approve-act, four log fields — all verified in `research.md` (F13, F14).
- **Numbers:** eleven at night to morning (2–3), one test channel and one test page (9), day one and day
  two (11), one write location (12), four log fields (20).
- **Data templates:** fact card (4), steps card (6), key-card callback (8), progression card (11), hinge
  three-step card (15), rule card (17), log card (20), quiz card (13, 18), closing card (24). Eight
  distinct. Plain statement cards: 17 and 24 — two, at the ceiling.
- **No assignments.** Beat 25 is spoken aloud by the viewer; the module's graded work lives in the
  separate assessment, never in the video body.

## Build notes

- `animateIds = ['03', '15', '23']` — beat 3 (the dead token: the shock that opens the video), beat 15
  (propose, approve, act — the module's most important mechanism, and it must be seen as three steps in
  time), beat 23 (the shop closing on time: the emotional close of the whole module). Stills plus slow
  pan everywhere else.
- **Setting const** in every `scene` prompt: *the back room of Ali's stationery shop — cream walls, a
  wooden desk, a laptop with a plain blank screen, a fat paper order file, a chipped blue mug, a wall
  clock, boxes of notebooks stacked behind.* The pinned error card from video 3 is still above the desk;
  by beat 23 the paper order file is closed and pushed aside — the module's silent before-and-after.
- Beat 2 is the only night-lit frame besides video 2 beat 16; match that lighting exactly.
- Beat 8 **reuses video 3's key-card art** with the room number swapped, so rotation reads as "new card,
  same room". Do not draw a new key.
- Beat 15 is the hinge frame and must **evolve in three stages** as the line is spoken: proposal appears,
  a hand approves, the action completes. If any single frame in this module gets extra care, it is this one.
- Beat 14: the proposal card sits there **doing nothing** for the whole beat. The stillness is the point;
  resist adding motion beyond a slow pan.
- Beat 20's four fields appear one at a time, matching the four spoken phrases.
- Beat 23 is the module's last shop frame: same angle as video 1 beat 2, but tidy, lit, and empty of
  paper. Shoot it as the deliberate bookend.
- Leave air after beat 5, after beat 16, and after beat 22.
- **No text in any generated scene art.** File names, log fields and the revoked-token message are all
  `info` overlays.
