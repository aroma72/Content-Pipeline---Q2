# Video 2 — The Loop, End to End — draft

**Format: technical how-to.** No protagonist. One animated diagram, plus the real screens it describes.
**Covers:** guide §2 — the loop diagram and the four role definitions
**Teaches:** one request follows a fixed path — Slack in, Notion card, GitHub pull request, Slack out —
and the whole circuit runs on a process that polls every 60 seconds and reacts to webhooks instantly.
**One move:** trace your own next request around the four before building any of them.
**Runtime:** ~2 min · HTML and voice only.

This is the map videos 3–6 fill in. The learner should finish able to say where a request goes and what
each service is responsible for.

## Script (one beat per line · [card] = full-screen card · [info] = diagram/data card · [ui] = real screen)

1.  [card] One request. Four services. A path it always takes. *(title)*
2.  [ui]   It starts with a message: "add a login page". *(L1 — Slack composer)*
3.  [info] Slack is the conversation — the only place you touch. *(loop diagram, Slack lit)*
4.  [info] Everything after this happens without you. *(loop diagram, arrow moving)*
5.  [ui]   A card appears on the board: Add login page, status To Do. *(L2 — Notion board)*
6.  [info] Notion is the operating area — where the work is tracked. *(loop, Notion lit)*
7.  [info] Not in the agent's context, and not in a chat that scrolls away.
8.  [ui]   The agent picks the top card and moves it to In Progress. *(L3 — status changing)*
9.  [ui]   It writes the code, commits, and opens a pull request. *(L4 — the PR)*
10. [info] GitHub is the workshop — where the work actually lands. *(loop, GitHub lit)*
11. [info] A change you can read, question, approve, or refuse.
12. [ui]   The card moves to Done, and a message arrives back in the channel. *(L5 — "login page is up, PR #42")*
13. [info] That is the loop. You touched it once. *(loop diagram, complete)*
14. [checkpoint] *(nothing on screen — the player pauses, the LMS asks, gives feedback, resumes)*
15. [info] One thing is missing from that diagram, and it is the one nobody draws. *(loop, dimmed)*
16. [info] Something has to be running to do any of it. *(loop, the host layer appearing underneath)*
17. [info] A small server that never turns off. *(host layer detail)*
18. [info] It checks for new work every sixty seconds. *(twocard — the timer)*
19. [info] And reacts to a GitHub webhook the instant it fires. *(twocard — the trigger)*
20. [info] Polling finds work. Webhooks find it faster. You want both.
21. [info] Ask · track · build · report — on something that stays awake. *(loop, complete with host)*
22. [card] Take the next thing you would ask for, and trace it around the four. *(closing)*

## The checkpoint (beat 14)

**Stem.** Your agent is connected to Slack, Notion and GitHub, and the loop works exactly as shown. You
shut your laptop and go home. What happens to the next request someone sends?

**Options.**
- A — It queues and runs when you open the laptop again
- B — Nothing happens; there is no process running to receive it
- C — Slack retries until the agent responds
- D — Notion creates the card and the rest waits

**Answer.** B.

**If they get it right.** Exactly. Slack, Notion and GitHub are services the agent *calls* — none of them
runs it. The code doing the reading, deciding and committing has to be executing somewhere, and if that
somewhere is your laptop, closing it ends the loop.

**If they get it wrong.** Nothing happens at all, and the reason it is tempting to think otherwise is
that these services feel active. They are not. Slack delivers an event to a URL; if nothing answers, it
retries briefly and gives up — it does not hold messages for an app that is switched off. Notion only
creates a card when something calls its API, and nothing is calling. Your agent is a process, and a
process that is not running cannot poll, cannot be notified, and cannot create anything. Every
connection you build points at a thing that is off until the agent lives somewhere that stays awake.

## Screens

| ID | Screen | Must be visible | Must NOT be visible |
|----|--------|-----------------|---------------------|
| L1 | Slack composer | The typed request in a channel | Real colleagues, real channel names |
| L2 | Notion board | One new row: Name, Status = To Do, Priority, Notes | Real tasks |
| L3 | Same board, status changed | Status = In Progress, Notes line added by the agent | — |
| L4 | GitHub pull request | Title, author = the agent, Files changed tab | Real code |
| L5 | Slack channel | The agent's reply with a PR reference | Real message history |

## Gate check

**READY** · 22 beats · 5 [ui] · 14 [info] · 2 [card] · 1 [checkpoint] · ~2:00

- **`qa-visuals` skips this automatically** (no character art). `qa-info` + `qa-checkpoint` are the gates.
- **Checkpoint:** beat 14, between two spoken beats (13 → 15), 4 options, both halves authored; the
  wrong-answer feedback refutes each wrong model specifically rather than restating the right one.
- **Covers §2 completely:** the full path (2–12), all four role definitions in the guide's own words —
  operating area, conversation, workshop, body (3, 6, 10, 16) — the 60-second poll (18) and the webhook
  trigger (19).
- **Data templates:** the loop diagram (used 3, 4, 6, 10, 13, 15, 16, 21 — one evolving object), twocard
  (18–19). Two distinct; zero plain statement cards.

## Build notes

- **The loop diagram is the video.** One object, built and lit across eight beats, with the host layer
  appearing *underneath* it at beat 16 — that reveal is the whole point of the second half, so give it
  the strongest transition in the file.
- Beats 18–19 are **one card with two states** (timer, then trigger), not two cards.
- The five real screens (L1–L5) are the same five the learner will see in videos 3–6, so use identical
  invented data — same task name, same PR number — and the module reads as one continuous example.
- No Imagen, no segmentation, no kie. Build is: `qa-info` → `qa-checkpoint` → TTS → compile → stitch →
  `verify`.
