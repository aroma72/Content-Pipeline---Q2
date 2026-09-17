# Video 2 — One Loop, Four Places — draft

**Covers:** guide §2 (the loop, and what each place is *for*)
**Teaches:** one request travels a fixed path — you ask in Slack, a card appears in Notion, the work
lands in GitHub as a pull request, and the answer comes back to you in Slack — with the whole circuit
running on something that never turns off.
**One move:** trace your own next request around the same four places before you build any of them.
**Real project / everyday spine:** Ali types one sentence into the shop chat and then goes to serve a
customer; by the time he comes back the work exists as a reviewable change.

Still no setup — no keys, no scopes, no URLs. This is the map the next four videos fill in, so the
learner should finish it able to *say* where a request goes and what each place is responsible for. The
four roles are stated in the guide's own words: operating area, conversation, workshop, body.

Deferred: every credential and click (videos 3–6), the mistakes (video 7).

## Script (one beat per line · [ali] = character · [scene] = shop scene · [info] = infographic)

1.  [info]  One request, four places, and a path it always takes.
2.  [scene] Ali types one sentence into the shop chat: add a login page.
3.  [scene] Then he puts his phone down and goes to serve a customer.
4.  [info]  Slack is the conversation — the only place he has to touch. *(fourparts, panel one)*
5.  [ali]   Everything after that happens without him.
6.  [info]  A card appears on the board: add a login page, status to do. *(screen — Name · Status · Priority · Notes)*
7.  [info]  Notion is the operating area, where the work is tracked. *(fourparts, panel two)*
8.  [ali]   Not in the agent's head, and not in a chat that scrolls away by Friday.
9.  [info]  The agent picks the top card and moves it to in progress. *(screen, status changing)*
10. [scene] It writes the code, commits it, and opens a pull request.
11. [info]  GitHub is the workshop — where the work actually lands. *(fourparts, panel three)*
12. [ali]   A change you can read, question, approve, or refuse.
13. [info]  The card moves to done, and a message arrives back in the chat. *(screen — "login page is up, PR #42")*
14. [scene] Ali reads one line on his phone between customers.
15. [checkpoint] *(nothing on screen — the player pauses, the LMS asks, gives feedback, resumes)*
16. [ali]   One thing is missing from that picture, and it is the one nobody mentions.
17. [info]  Something has to be awake to do any of it. *(fourparts, panel four — your deployment)*
18. [ali]   A small server that never turns off, checking for new work every minute.
19. [info]  And waking the instant GitHub says something happened. *(twocard — every 60 seconds · the moment it fires)*
20. [ali]   Four places, one loop, and only the first one needs you.
21. [scene] Ali never opened the project once.
22. [info]  Ask · track · build · report. *(fourparts, complete)*
23. [ali]   Your turn. Take the next thing you would ask for, and trace it around the four.

## The checkpoint (beat 15)

**Stem.** Ali's agent is connected to Slack, Notion and GitHub, and the loop you just watched works
perfectly. He shuts his laptop and goes home. What happens to the next request someone sends?

**Options.**
- A — It queues up and runs when he opens the laptop again
- B — Nothing happens at all; there is nothing running to receive it
- C — Slack holds it and retries until the agent answers
- D — Notion creates the card, and the rest waits

**Answer.** B.

**If they get it right.** Exactly. Slack, Notion and GitHub are places the agent *reaches* — none of
them runs it. The code doing the reading, deciding and committing has to be executing somewhere, and if
that somewhere is Ali's laptop, closing it ends the loop. That is why the fourth place is not optional.

**If they get it wrong.** Nothing happens, and that surprises almost everyone. It is tempting to think
Slack queues the message, or that Notion would at least make the card — but those services only respond
when something asks them to. The agent is a program, and a program that is not running cannot be
notified, cannot poll, and cannot create anything. Slack will not retry into a void, and Notion never
hears about the request at all. Until the agent lives somewhere that stays awake, every connection you
build reaches a thing that is switched off.

## Gate check

**READY** · 23 beats · 6 [scene] (26% — see note) · 8 [ali] · 8 [info] · 1 [checkpoint] · ~12 words/line

- **One move:** trace a request around the four places.
- **Leads with the answer:** beat 1 states the shape before the walk-through of it.
- **Before → after:** before is Ali typing and waiting (2–3); after is a finished pull request he never
  opened a project to get (21). The contrast is the whole video.
- **Emotional checkpoints:** beat 5 relieves the "do I have to watch it?" worry, beat 16 admits the
  picture was incomplete rather than pretending it was not, beat 20 lands the payoff. Three.
- **Checkpoint:** beat 15, between two spoken beats (14 → 16), both halves authored, wrong-answer
  feedback names all three wrong models explicitly.
- **Data templates:** fourparts built across 4/7/11/17 and completed at 22, screen ×3 (6, 9, 13),
  twocard (19). Three distinct; zero plain statement cards.
- **Scene share note:** 26% is under the 28% bar, so `qa-visuals` will fail this as authored —
  **fix before art** by making beat 10 (writing the code, committing, opening the PR) a `scene` rather
  than leaving it as one. That is the natural candidate: it is the only physical act in the middle third.

## Build notes

- **Beats 6, 9 and 13 are one evolving board**, not three cards: the same four columns, the status cell
  changing To Do → In Progress → Done, and the PR link appearing. It is the spine of the video and the
  clearest thing to animate as HTML.
- **Beat 22 reuses the four-place card from video 1 beat 14** — identical art, now complete. The module
  should feel like one diagram being filled in across seven videos.
- `animateIds = ['03', '10', '14']` — putting the phone down and walking off (03), the work landing (10),
  reading one line between customers (14). Dense compositions only.
- No product logos anywhere; names appear as text on `info` cards only.
- Gates before spend: `qa-info.js` · `qa-checkpoint.js` · `qa-visuals.js` · `qa-cutouts.js`.
