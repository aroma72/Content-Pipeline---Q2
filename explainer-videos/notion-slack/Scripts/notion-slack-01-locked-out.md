# Video 1 — Locked Out of the Room — draft

**Teaches:** an agentic project only becomes useful when it can read where the team's memory lives and
write where the team's attention is — so you decide what crosses that boundary before you touch a single
settings page.
**One move:** name one thing your agent should read, and one thing it should write. One door each side.
**Real project / everyday spine:** Ali's order agent writes perfect summaries into a terminal window
that nobody in his shop ever opens.

This video does not teach any setup. No tokens, no scopes, no endpoints — those are videos 2 and 3. Its
whole job is to break the beginner instinct of "connect everything" and replace it with two named doors.
The words **read** and **write**, and the pairing *Notion = memory / Slack = attention*, are planted here
and reused in all five later videos.

Deferred: connector vs token (video 2), permissions and the errors (video 3), how to write a row
(video 4), how to post without spamming (video 5), secrets and approval (video 6).

## Script (one beat per line · [ali] = character · [scene] = shop scene · [info] = infographic)

1.  [info]  Your agent is only useful where your team already works.
2.  [scene] Ali runs a stationery shop with three staff and one laptop in the back.
3.  [scene] Every evening his agent reads the day's orders and writes a clean summary.
4.  [scene] The summary lands in a black terminal window on his laptop. *(act: the screen fills, nobody is looking at it)*
5.  [info]  Twelve summaries this month. Nobody but Ali opened one. *(number card: 12 written · 1 reader)*
6.  [ali]   If you have built something good that nobody uses, this is why.
7.  [ali]   His staff keep asking the same questions in the shop group chat.
8.  [scene] And the answers sit in a fat paper file on the corner of his desk. *(act: a hand flipping pages)*
9.  [info]  The agent cannot see the file, and cannot speak in the chat.
10. [info]  The team's memory lives in one place. Their attention lives in another. *(two-panel card)*
11. [info]  Notion is memory. It stays, and you can search it. *(card, left panel filling in)*
12. [info]  Slack is attention. It is read now, then it scrolls away. *(same card, right panel filling in)*
13. [scene] Ali types the paper file into a Notion table on the laptop screen. *(act: crisp table appears on screen)*
14. [ali]   Now his agent can read the exact records his staff read.
15. [info]  Reading and writing, across two tools, is four doors. *(2x2 grid card: read/write x Notion/Slack)*
16. [ali]   Beginners open all four at once, and then trust none of them.
17. [info]  QUESTION · Your agent has just made a decision the team will need again in six months. Where should it put it? A — post it in the Slack channel · B — write it as a row in the Notion table · C — leave it in the terminal log · D — keep it in the agent's memory. Write your answer down. *(quiz card, no answer shown, holdAfter)*
18. [ali]   Ali opens one door first, and only one.
19. [ali]   The agent may read the orders table. Nothing else, not yet.
20. [scene] A staff member asks about last Tuesday, and the answer arrives in the chat. *(act: Ali looks up from his mug, relieved)*
21. [info]  REVEAL · B, the Notion row. Slack scrolls away; Notion is still findable in six months. *(same quiz card, B highlighted)*
22. [ali]   Nothing about his agent changed today. Only what it could reach.
23. [info]  One thing to read. One thing to write. Start there. *(closing card)*
24. [ali]   Your turn. Name the one question your team asks every single week.
25. [ali]   That question tells you which door to open first.

## Gate check

**READY** · 25 beats · 8 [scene] (32%) · 7 [ali] · 10 [info] · average ~11 words per line

- **One move:** name one read and one write. New concepts across the whole script: read vs write,
  Notion-as-memory, Slack-as-attention, four doors, open one first. Five — under the eight ceiling.
- **Leads with the answer:** beat 1 states the whole thesis before any story.
- **Everyday picture:** a paper file on a desk and a group chat. Demonstrated (beats 7–8, 13), never
  defined. A beginner with no vocabulary can restate it.
- **Before → after:** before is twelve unread summaries in a terminal (4–5); after is a staff question
  answered in the chat from the Notion table (20). Both shown in the shop, both countable.
- **Character:** Ali built something good, watched it go unused, felt that, moved the file, opened one
  door, got the payoff. He travels; he never recites a definition.
- **Emotional checkpoints:** beat 6 normalises ("if you have built something good that nobody uses"),
  beat 16 forgives the over-connecting instinct, beat 22 reassures that no rebuild was needed. Three.
- **Interactive pair:** QUESTION at beat 17 (~⅔ through, `holdAfter: 6`), REVEAL at beat 21.
- **Numbers on screen:** 12 summaries / 1 reader (5), four doors (15). Countable stakes, no invented
  statistics.
- **Data templates:** number card (5), two-panel memory/attention card (10–12), 2x2 door grid (15),
  quiz card (17, 21). Four distinct templates. Plain statement cards: 9 and 23 — two, at the ceiling.
- **No assignments.** Beat 24 is a spoken reflection prompt.

## Build notes

- `animateIds = ['04', '13', '20']` — beat 4 (the summary filling a terminal nobody watches), beat 13
  (the paper file becoming a crisp table on the laptop screen — the visual hinge of the video), beat 20
  (the answer arriving in the chat while Ali looks up). Motion teaches in all three; every other beat is
  a still with a slow pan plus cutout micro-motion on Ali.
- **Setting const** in every `scene` prompt: *the back room of Ali's stationery shop — cream walls, a
  wooden desk, a laptop with a plain blank screen, a fat paper order file, a chipped blue mug, a wall
  clock, boxes of notebooks stacked behind.*
- **This video sets the module's look.** Beat 2 is the palette pilot; beats 2, 8, 13, 20 lock the desk,
  the file and the laptop angle for all six videos.
- Beat 4: show the actual bad outcome — a wall of terminal text, Ali's chair empty, the three staff
  visible through the doorway looking at their phones. Not "the summary was unused" in the abstract.
- Beats 10–12 must be **one evolving card**, not three cards: the frame appears empty, the memory panel
  fills, then the attention panel fills. Same geometry all three beats.
- Beat 15 is the door grid and it recurs in videos 2 and 6 — give it a strong, memorable composition and
  reuse the identical art there.
- Beats 17 and 21 are the same quiz card art; 21 only adds the highlight on B.
- Leave air after beat 9 (the locked-out landing) and after beat 22.
- **No text in any generated scene art.** "Notion", "Slack" and every label live only on `info` cards.
