# Video 5 — Speaking Without Spamming — draft

**Teaches:** Slack expects an acknowledgement within three seconds, so your agent must say "coming"
first and do the work second — otherwise Slack retries and the same action happens three times.
**One move:** acknowledge on the first line, then work; deduplicate on the event id.
**Real project / everyday spine:** Ali's agent answers one question in the shop channel — three times —
and then starts replying to itself.

This video owns the duplicate-and-loop failure class, which is the most confusing one for beginners
because *nothing in their code looks wrong*. The doorbell is used for exactly one thing — the three-second
acknowledgement — and not stretched into a general webhooks lesson. Rate limits and threading are taught
as the etiquette that keeps the channel usable, not as trivia.

Deferred: permissions and the invite (video 3), what gets written to Notion (video 4), secrets and human
approval (video 6). Block Kit layout, modals, slash-command payload shapes and polling-versus-webhooks
theory are all out of scope.

## Script (one beat per line · [ali] = character · [scene] = shop scene · [info] = infographic)

1.  [info]  Say "coming" in three seconds, then do the work.
2.  [scene] Ali's agent can finally answer questions in the shop channel.
3.  [scene] A staff member asks about last Tuesday, and three identical answers arrive. *(act: three duplicate replies stacking on screen)*
4.  [ali]   He did not send it three times. Slack asked three times.
5.  [info]  Slack expects an OK within three seconds. *(rule card with a three-second clock)*
6.  [ali]   Slack rings the doorbell. If nobody calls back, it rings again.
7.  [info]  No answer in three seconds, then three retries over a few minutes. *(timeline card)*
8.  [scene] His handler was writing the Notion row first, and replying afterwards. *(act: the two lines highlighted on screen in the wrong order)*
9.  [info]  Acknowledge first. Do the work after. *(hinge card)*
10. [ali]   The fix is not faster code. It is the order of two lines.
11. [info]  Then still check the event id Slack sends, and skip what you have already done. *(card: dedupe on event_id, never on the retry count)*
12. [ali]   Same event id, work already finished, so ignore it and carry on.
13. [scene] One answer arrives now, inside the thread where the question was asked. *(act: a single threaded reply)*
14. [info]  Reply in the thread, not the channel. Attention is not free. *(rule card)*
15. [info]  QUESTION · Your agent posted the same summary three times. What is the most likely cause? A — the network duplicated the message · B — the handler did the work before acknowledging Slack · C — two people asked at the same moment · D — Slack is rate limiting you. Write your answer down. *(quiz card, no answer shown, holdAfter)*
16. [scene] The next morning, the agent replies to its own message and starts a loop. *(act: messages escalating down the screen)*
17. [info]  Ignore messages that came from your own bot. Always.
18. [scene] Twenty messages in twenty seconds, and his staff mute the channel. *(act: a phone face-down on the desk, notifications piling up)*
19. [info]  REVEAL · B. Working before you acknowledge means Slack retries while you are still working. *(same quiz card, B highlighted)*
20. [info]  One message per second per channel is the ceiling. *(limits card: 429 · read Retry-After · wait)*
21. [scene] So the agent posts one line, once, and waits when it is told to wait. *(act: a single calm line on screen, clock visible)*
22. [info]  Building on your own laptop? Use Socket Mode — no public address needed. *(practical card)*
23. [scene] The channel is quiet again, and one useful line arrives at closing time. *(act: Ali reading it with his mug, staff nodding through the doorway)*
24. [info]  Acknowledge. Deduplicate. Thread. One message. *(closing checklist card, spoken in full)*
25. [ali]   Your turn. Find the line in your handler that acknowledges Slack.
26. [ali]   If it is not the first thing that runs, your duplicates are already on the way.

## Gate check

**READY** · 26 beats · 8 [scene] (31%) · 7 [ali] · 11 [info] · average ~12 words per line

- **One move:** acknowledge first, then work, keyed on the event id. New concepts: three-second
  acknowledgement, three retries, duplicates, dedupe on event id, thread replies, ignore your own bot,
  one message per second, Socket Mode. Eight — at the ceiling, and beats 22 is deliberately the lightest
  of them (one practical card, no story weight).
- **Leads with the answer:** beat 1 is the whole fix in nine words.
- **Everyday picture:** a doorbell, used for one job only — you must shout "coming" before you walk to
  the door, or the visitor keeps ringing.
- **Before → after:** before is three identical answers (3) and a twenty-message loop (16–18); after is
  one threaded reply (13) and one calm closing-time line (21, 23). Both failures are seen, not described.
- **Character:** Ali is embarrassed by his own agent in front of his staff twice, learns that the fault
  is an ordering mistake rather than bad code, fixes the order, kills the loop, and earns the quiet
  channel back.
- **Emotional checkpoints:** beat 4 removes the blame immediately ("he did not send it three times"),
  beat 10 reassures that the fix is small, beat 23 lands the relief. Three.
- **Interactive pair:** QUESTION at beat 15 (~⅔ through, `holdAfter: 6`), REVEAL at beat 19.
- **Exact facts on screen:** three seconds to acknowledge, three retries, `event_id`, one message per
  second per channel, `429`, `Retry-After`, Socket Mode — all verified in `research.md` (F9, F10, F11).
- **Numbers:** three identical answers (3), three seconds and three retries (5, 7), two lines (10),
  twenty messages in twenty seconds (18), one per second (20).
- **Data templates:** rule card with clock (5), retry timeline (7), hinge card (9), dedupe card (11),
  thread rule (14), limits card (20), practical card (22), quiz card (15, 19), closing checklist (24).
  Eight distinct. Plain statement cards: 9 and 17 — two, at the ceiling.
- **No assignments.** Beat 25 is a spoken one-minute check inside the viewer's own handler.

## Build notes

- `animateIds = ['03', '16', '23']` — beat 3 (three duplicate answers stacking: the mystery that opens
  the video), beat 16 (the self-reply loop escalating — the metaphor and the fear, both alive), beat 23
  (the quiet channel and one useful line: the emotional close). Stills plus slow pan elsewhere.
- **Setting const** in every `scene` prompt: *the back room of Ali's stationery shop — cream walls, a
  wooden desk, a laptop with a plain blank screen, a fat paper order file, a chipped blue mug, a wall
  clock, boxes of notebooks stacked behind.* The pinned error card from video 3 is still above the desk.
- Beat 3 and beat 13 must use the **same channel view, same position** — three stacked replies, then one
  threaded reply — so the contrast reads instantly.
- Beat 8: highlight the two lines of the handler in the wrong order, then in video-terms *do not* animate
  the fix here; beat 9's card is the fix. Keep the code shown to two lines. It is crisp screen HTML.
- Beat 7 is an **evolving timeline**: the three-second window, then retry one, two, three appearing along
  it. Never a static diagram.
- Beat 16–18: the loop must feel physically uncomfortable — accelerate the stacking, then cut to the
  face-down phone. Do not caption it with a joke; the cost is real.
- Beat 20 shares the geometry of video 4's limits card. Same shape, different numbers, on purpose.
- Beat 22 is a small practical aside; keep it visually quiet so it does not compete with the close.
- Leave air after beat 10 and after beat 19.
- **No text in any generated scene art.** Message bubbles are drawn empty and filled by `info` overlays.
