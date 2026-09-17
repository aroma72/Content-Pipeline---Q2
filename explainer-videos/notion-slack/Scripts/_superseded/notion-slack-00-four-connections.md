# Module Intro — Four Connections, Four Jobs — draft

**Teaches:** an agentic system is only as useful as the four places it can reach — Slack, where work is
asked for; Notion, where it is remembered; GitHub, where it lands reviewably; Railway, where it keeps
running — and each one does a job none of the others can do.
**One move:** name which of the four your project is missing, and what specifically breaks without it.
**Real project / everyday spine:** Ali's order agent works perfectly, and only ever for Ali, only while
his laptop is open.

This is the module opener, so it teaches no setup at all — no tokens, no scopes, no endpoints, no
commands. Its whole job is to make four connections feel like four *jobs* rather than four logos, so
that when videos 1–8 go deep on each one the learner already knows why they are there. The four-part
frame ("asked for · remembered · lands · keeps running") is planted here and reused throughout.

Deferred: everything mechanical. Which door to use (video 2), permissions and errors (video 3),
structured rows (video 4), acknowledgement and duplicates (video 5), secrets and approval (video 6),
the click-by-click setup (videos 7 and 8), the harness itself (the assessment).

## Script (one beat per line · [ali] = character · [scene] = shop scene · [info] = infographic)

1.  [info]  An agent is only as useful as the places it can reach.
2.  [scene] Ali built an agent that reads his orders and drafts the replies.
3.  [scene] It works perfectly, at his desk, while he is sitting there watching it.
4.  [ali]   Which means it is a demo, not a system.
5.  [info]  A system needs four connections, and each does one job. *(fourparts card, building)*
6.  [scene] The first job is being asked. His staff ask in the shop chat, not at his desk. *(Slack)*
7.  [ali]   If work cannot arrive where people already are, it does not arrive at all.
8.  [scene] The second job is remembering. Last Tuesday's answer is nowhere anyone can find it. *(Notion)*
9.  [info]  A chat scrolls away. A record stays and can be searched. *(twocard)*
10. [ali]   The third job is landing somewhere you can check, and undo.
11. [info]  Not a file it overwrote. A change you can read, approve, or refuse. *(GitHub)*
12. [info]  Of thirty-three thousand agent-written changes studied, sixty-one percent had no human review at all. *(bignum — 33,596 · 61%)*
13. [ali]   That is not an argument against agents. It is an argument for a place to review them.
14. [scene] The fourth job is simply carrying on after Ali closes the laptop. *(Railway)*
15. [info]  An agent that only runs while you watch it is a demo with extra steps. *(statement)*
16. [info]  Hosted, it stays up between requests, for about the price of one lunch a month. *(screen — 99.96% uptime · $10–20/mo)*
17. [ali]   Four connections, four jobs, and not one of them is optional.
18. [checkpoint] *(nothing on screen — the player pauses, the LMS asks, gives feedback, resumes)*
19. [scene] Ali wires the first one, and the shop chat starts reaching his agent.
20. [ali]   He does not build all four at once. Nobody does.
21. [info]  Asked for · remembered · lands · keeps running. *(fourparts, complete)*
22. [ali]   Take your own project and ask which of the four is missing today.
23. [ali]   Whatever breaks when you close your laptop, that is the one to build next.

## The checkpoint (beat 18)

**Stem.** Ali closes his laptop at six in the evening and goes home. His agent is connected to Slack,
Notion and GitHub. What stops working?

**Options.**
- A — Nothing; it keeps running
- B — Everything; it only runs while his laptop is on
- C — Only the Slack part
- D — Only the writing to Notion

**Answer.** B.

**If they get it right.** Exactly. Slack, Notion and GitHub are places the agent *reaches* — they do not
run it. Something has to host the agent itself, and until it is hosted, "agentic" ends when you shut the
lid.

**If they get it wrong.** All three of those connections are destinations, not engines. They tell the
agent where to listen, what to remember and where to put the result — but the agent is still a process
running on Ali's laptop, so closing it stops everything, including the parts that look like they live
somewhere else. That is the job the fourth connection does, and it is the one beginners leave out.

## Gate check

**READY** · 23 beats · 7 [scene] (30%) · 8 [ali] · 7 [info] · 1 [checkpoint] · average ~12 words per line

- **One move:** name the missing connection. New concepts: asked-for, remembered, lands-reviewably,
  keeps-running. Four — well under the eight ceiling, and they are the same four the module is built on.
- **Leads with the answer:** beat 1 states the thesis before any story.
- **Everyday picture:** a shopkeeper whose helper only works while he stands over it. No jargon required
  to feel the problem.
- **Before → after:** before is an agent that works only at the desk (2–4); after is one connection wired
  and work arriving on its own (19). Deliberately *not* all four — that would be a lie about week one.
- **Emotional checkpoints:** beat 4 names the demo problem without blame, beat 13 defends agents while
  making the case for review, beat 20 removes the pressure to build everything at once. Three.
- **Checkpoint:** beat 18, between two spoken beats (17 → 19), both feedback halves authored.
- **Numbers on screen:** 33,596 changes and 61% unreviewed (12), 99.96% uptime and $10–20/month (16),
  four connections throughout. All trace to `research.md` F16 and F18.
- **Data templates:** fourparts (5, 21 — same card, built then completed), twocard (9), bignum (12),
  statement (15), screen (16). Five distinct; one plain statement card, under the limit of two.
- **No assignments.** Beat 22 is a spoken reflection prompt.

## Build notes

- **Same locked Ali, same back room** as videos 1–8 (`art/_ref.png` seeds every image). This is the first
  thing a learner sees in the module, so the setting must be identical to what follows.
- **Beat 5 and beat 21 are the same card**, built and then completed — the four-part frame opens and
  closes the video. Give it the strongest composition in the file; it recurs across the module.
- **Beat 12 is the hinge.** The 61% figure is what stops GitHub sounding like storage. Hold it, and let
  beat 13 land in the clear.
- `animateIds = ['03', '14', '19']` — the agent working while Ali watches (03), the laptop closing at six
  (14), and work arriving on its own (19). All three are dense compositions: **no beat with a large plain
  wall gets i2v**, per the invention failure on video 1.
- Beat 14 is the only low-light frame; match video 2's six-a.m. lighting so the module reads as one world.
- **No text baked into any art.** Every figure, URL and label lives on an `info` card.
- Gates before any spend: `node qa-info.js` · `node qa-visuals.js` · `node qa-cutouts.js`.

## Note on the checkpoint format

Written to the current standard (§3b): the question is **never drawn and never spoken**, the player
pauses at the beat boundary, the LMS asks it and shows the feedback, then playback resumes. If that
changes again, only beat 18 and the checkpoint block above move — the other 22 beats are unaffected.
