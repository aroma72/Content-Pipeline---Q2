# Video 2 — Two Doors In: Connector or Key — draft

**Teaches:** there are exactly two ways to connect an agentic project to Notion or Slack — a hosted MCP
connector, or an API token — and which one you need is decided by one question, not by taste.
**One move:** ask "am I at the keyboard, or is it running without me?" — at the keyboard means connector,
running without you means token.
**Real project / everyday spine:** Ali wants two things this week: to question his order records himself
in the evening, and a digest waiting in the shop chat at six in the morning.

This video does not teach permissions or code. It only has to stop the beginner from hand-writing API
calls for a job the built-in connector does in one command — the most expensive wrong turn in the
module — and to plant the sentence that decides it. The two named servers are given exactly, because a
beginner cannot guess a URL.

Deferred: tokens, scopes and the errors (video 3), writing structured rows (video 4), events and
acknowledgement (video 5), secrets and approval (video 6). Building your own MCP server is out of scope
for the whole module.

## Script (one beat per line · [ali] = character · [scene] = shop scene · [info] = infographic)

1.  [info]  If you are at the keyboard, use a connector. If it runs without you, use a token.
2.  [scene] Ali wants two things from his agent this week.
3.  [scene] In the evening, he wants to ask his order records questions himself.
4.  [scene] At six in the morning, he wants a digest already waiting in the shop chat.
5.  [info]  Same two tools. Two completely different doors. *(two-job table card: evening / six a.m.)*
6.  [ali]   He starts where most beginners start, writing his own code for both.
7.  [scene] Three evenings later, he still has not asked a single question. *(act: notebook of half-written code, cold mug, clock late)*
8.  [ali]   That was not a coding failure. He picked the harder door for the easier job.
9.  [info]  Door one is a connector, already built and kept up to date for you.
10. [info]  One line adds it. *(command card: claude mcp add --transport http notion https://mcp.notion.com/mcp)*
11. [ali]   He signs in through the browser once, and there is no token to keep anywhere.
12. [scene] That same evening he asks his records a question and reads the answer aloud. *(act: crisp answer on the laptop screen, Ali leaning in)*
13. [info]  Slack has an official one too. *(card: mcp.slack.com/mcp · generally available 17 February 2026)*
14. [info]  A workspace admin must approve it, so ask on day one, not on day three.
15. [ali]   But the six o'clock digest has a problem the connector cannot solve.
16. [scene] At six in the morning the back room is dark and the chair is empty. *(act: clock at 6, nobody there)*
17. [info]  A connector needs a person signed in. A token does not. *(contrast card — the hinge frame)*
18. [info]  QUESTION · Which of these needs an API token, not a connector? A — asking your notes a question while you work · B — posting a digest at six a.m. with nobody watching · C — drafting a page you will review right now · D — searching the workspace during a call. Write your answer down. *(quiz card, no answer shown, holdAfter)*
19. [ali]   So Ali keeps the connector for himself, and adds a token for the schedule.
20. [info]  Tokens are also the only door for reacting the moment something changes. *(list card: runs on a schedule · reacts to an event · runs on a server)*
21. [ali]   A connector waits to be asked. It cannot be woken up by a change.
22. [info]  REVEAL · B, because at six in the morning nobody is there to sign in. *(same quiz card, B highlighted)*
23. [scene] One project, two doors, chosen job by job. *(act: Ali writes two lines on the back-room whiteboard)*
24. [info]  Ask one thing. Am I at the keyboard, or is it running without me? *(closing card, spoken in full)*
25. [ali]   Your turn. Name the one job of yours that runs while you sleep.
26. [ali]   That job needs a token. Everything else can start tonight with a connector.

## Gate check

**READY** · 26 beats · 8 [scene] (31%) · 9 [ali] · 9 [info] · average ~12 words per line

- **One move:** apply the keyboard-or-not question. New concepts: connector, token, one-line install,
  admin approval, needs-a-person, schedules-and-events. Six — under the eight ceiling.
- **Leads with the answer:** beat 1 is the rule, before the story.
- **Everyday picture:** two jobs, one done sitting at the desk in the evening, one that has to happen
  while he is asleep. Concrete, and it *is* the technical distinction.
- **Before → after:** before is three evenings of half-written code and zero questions asked (6–8);
  after is a question answered the same evening (12) and a token added only where it earns its place
  (19). Both in the shop, both countable.
- **Character:** Ali picks the hard door, loses three evenings, is told plainly it was not a coding
  failure, switches, wins the evening back, then meets the one job the connector genuinely cannot do.
- **Emotional checkpoints:** beat 6 normalises the wrong turn, beat 8 explicitly removes the shame
  ("not a coding failure"), beat 21 reassures that the connector is not defective, just asleep. Three.
- **Interactive pair:** QUESTION at beat 18 (~⅔ through, `holdAfter: 6`), REVEAL at beat 22.
- **Numbers / names on screen:** three evenings lost (7), one line (10), `mcp.notion.com/mcp` (10),
  `mcp.slack.com/mcp` and 17 February 2026 (13), six a.m. (4, 16, 22). All verified in `research.md`
  (F1–F3).
- **Data templates:** two-job table (5), command card (10), named-server card (13), contrast card (17),
  list card (20), quiz card (18, 22). Six distinct. Plain statement cards: 9 and 14 — two, at the ceiling.
- **No assignments.** Beat 25 is a spoken reflection prompt.

## Build notes

- `animateIds = ['07', '12', '16']` — beat 7 (three lost evenings: the cold mug, the clock, the
  half-written page), beat 12 (the answer landing on screen and Ali leaning in — the emotional turn of
  the video), beat 16 (the dark empty back room at six a.m., the beat the whole second half rests on).
- **Setting const** in every `scene` prompt: *the back room of Ali's stationery shop — cream walls, a
  wooden desk, a laptop with a plain blank screen, a fat paper order file, a chipped blue mug, a wall
  clock, boxes of notebooks stacked behind.*
- Beat 16 is the only night-lit frame in the module: same room, same angle as beat 12, lights off, chair
  empty, clock readable. It must be recognisably the *same* desk — that is the whole point.
- **Beat 17 is the hinge frame.** "A connector needs a person signed in. A token does not." Clean
  two-column card, held. This sentence is quoted again in video 6.
- Beat 10 and 13 are **command / URL cards — proofread character by character** against `research.md`
  section D. A mistyped URL in a beginner video is a support ticket.
- Beat 14 (admin approval) also carries the module's prerequisite reminder: say it warmly, not as
  bureaucracy.
- Beat 23: the whiteboard is written on but **the words are added as an `info` overlay**, never baked
  into the generated art.
- Reuse the four-door grid art from video 1 beat 15 if a recap frame is wanted — do not draw a new one.
- Leave air after beat 8 and after beat 17.
- **No text in any generated scene art.**
