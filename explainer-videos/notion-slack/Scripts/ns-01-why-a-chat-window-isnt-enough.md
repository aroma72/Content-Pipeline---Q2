# Video 1 — Why a Chat Window Isn't Enough — draft

**Format: technical how-to.** No protagonist. Diagrams and screens only.
**Covers:** guide §1
**Teaches:** an agent you have to open and talk to is a chat window with extra steps; three specific
capabilities are missing, and four services supply them.
**One move:** name which of the three your setup is missing today.
**Runtime:** ~2 min · no art, no cutouts, no i2v — HTML and voice only.

Teaches no setup. Its job is to replace "I chat with my agent" with "I ask, and it works without me", so
videos 3–6 feel like four jobs rather than four logos.

## Script (one beat per line · [card] = full-screen card · [info] = diagram/data card · [ui] = real screen)

1.  [card] If you have to open it and talk to it, it is a chat window with extra steps. *(title)*
2.  [ui]   This is the normal setup: an editor open, a prompt typed, an answer coming back. *(U1)*
3.  [ui]   It works. It works well. And it only works while you are sitting there. *(U1 held)*
4.  [info] Close the laptop and the agent stops existing. *(statement)*
5.  [info] That is not an agent doing your work. That is you, doing your work, faster.
6.  [info] Three capabilities are missing, and none of them is intelligence. *(threepart, empty)*
7.  [info] One — somewhere to keep track of what it is doing. *(threepart, panel one)*
8.  [info] Not in its context window, and not in a chat history that scrolls away. *(panel one detail)*
9.  [info] Two — a way to talk to you, in both directions. *(panel two)*
10. [info] You tell it what to do. It tells you what happened, or that it is blocked. *(panel two detail)*
11. [info] Three — a process that is running when you are not there. *(panel three)*
12. [info] Four services supply those three. *(fourparts — Notion · Slack · GitHub · your deployment)*
13. [info] Notion is the task board: what it is doing, and what it did. *(fourparts, panel one lit)*
14. [info] Slack is the two-way line: your instructions in, its reports out. *(panel two lit)*
15. [info] GitHub is where the work lands, as commits and pull requests you can read. *(panel three lit)*
16. [info] Your deployment is the process that stays up. *(panel four lit)*
17. [info] You already have that last one. It is whatever your project is deployed on today.
18. [checkpoint] *(nothing on screen — the player pauses, the LMS asks, gives feedback, resumes)*
19. [info] None of the four is the point. The loop between them is the point. *(statement)*
20. [ui]   Here is the whole thing in one sentence. *(U2 — the premise on screen)*
21. [info] You ask in Slack. It works in the background. It tracks itself in Notion.
22. [info] And it comes back to you when it is done, or when it is stuck.
23. [card] Which of the three is your setup missing right now? *(closing question card)*

## The checkpoint (beat 18)

**Stem.** Your agent answers correctly every time you open the project and type a prompt. Which of the
three capabilities does it have?

**Options.**
- A — Somewhere to track its work
- B — A two-way line to you
- C — A process running when you are not there
- D — None of them

**Answer.** D.

**If they get it right.** Correct — and that is why "just connect one thing" never feels like enough.
When the only way to reach it is to open the project, the chat scrollback *is* its tracking, your typing
*is* the entire conversation, and your laptop *is* the process. All three jobs are being done by you
being present. Each needs handing to something that outlives the session.

**If they get it wrong.** It has none of them, which surprises most people because the setup clearly
works. Look at what happens when you walk away: the task history disappears with the session, so there
is no tracking; nothing can reach you — and you cannot reach it — without you opening the editor, so
there is no two-way line; and the process itself is your laptop, so there is nothing running at all.
Answering well while you watch is not the same as having any of the three. That is the gap the next six
videos close.

## Screens

| ID | Screen | Must be visible | Must NOT be visible |
|----|--------|-----------------|---------------------|
| U1 | An editor with an agent session | A typed prompt, an answer streaming back, nothing else running | Real project code, real file names |
| U2 | The premise, as a full-width card | The four sentences, one per line, set large | — |

## Gate check

**READY** · 23 beats · 2 [ui] · 18 [info] · 2 [card] · 1 [checkpoint] · ~2:00

- **`qa-visuals` skips this automatically** — no `ali` or `scene` beats, so the character rules do not
  apply. `qa-info` and `qa-checkpoint` are the gates that matter.
- **Checkpoint:** beat 18, between two spoken beats (17 → 19), 4 options, both halves authored; the
  wrong-answer feedback works through all three capabilities rather than just naming the answer.
- **Data templates:** threepart built across 6–11, fourparts built across 12–16, statement ×2 (4, 19).
  Two distinct diagrams plus two statement cards — at the statement limit, which is fine here because
  the diagrams carry the teaching.
- **Covers §1 completely:** the three needs (7–11), the four services mapped to them (12–16), the
  "you already have the fourth" point (17), and the premise verbatim (20–22).

## Build notes

- **Beats 6–11 are ONE diagram built in three passes**, and **beats 12–16 are ONE diagram lit panel by
  panel**. Not eleven cards. The whole video is two diagrams and a screen.
- **Beats 21–22 are the module thesis** — unhurried, with air between the sentences. Quoted again in the
  assessment.
- The fourparts card recurs in every later video as a "you are here" marker; this is where its geometry
  is set.
- No Imagen, no segmentation, no kie. Build is: `qa-info` → `qa-checkpoint` → TTS → compile → stitch →
  `verify`.
