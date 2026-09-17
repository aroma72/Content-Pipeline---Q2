# Video 7 — The Four Mistakes — draft

**Format: technical how-to.** No protagonist. Error screens and diagnosis cards.
**Covers:** guide §7, all four
**Teaches:** four mistakes account for almost every hour lost on this build, and each has a tell you can
recognise in seconds — before you open any code.
**One move:** when it fails, identify which of the four it is first.
**Runtime:** ~2:15 · HTML and voice only.

Placed last on purpose: the learner has now built the thing, so these land as recognition rather than
warning. Every error string appears exactly as it arrives.

## Script (one beat per line · [card] = full-screen card · [info] = diagram/data card · [ui] = real screen)

1.  [card] Four mistakes. Each has a tell. *(title)*
2.  [info] Learn the tells and you stop debugging by guesswork. *(fourparts, empty)*
3.  [card] One — the credential is set, but the thing was never shared. *(signpost)*
4.  [ui]   Your Notion call returns object not found, on a database you are looking straight at. *(M1)*
5.  [info] 404 · object_not_found *(error card, exact string)*
6.  [info] The credential is necessary. It is not sufficient. *(statement)*
7.  [info] Notion needs Connections. Slack needs an invite. *(twocard)*
8.  [info] Both ask you to say: let this integration see this specific thing. *(twocard detail)*
9.  [card] Two — the webhook points somewhere the internet cannot reach. *(signpost)*
10. [ui]   Slack refuses to verify your Request URL, and the error says nothing useful. *(M2)*
11. [info] You gave it localhost. Slack is calling you, from outside. *(diagram — their server → your laptop, blocked)*
12. [info] Outbound works from anywhere. Inbound needs a public address. *(twocard)*
13. [checkpoint] *(nothing on screen — the player pauses, the LMS asks, gives feedback, resumes)*
14. [card] Three — the secret is set in one place, not both. *(signpost)*
15. [ui]   Every delivery comes back 403, and both dashboards look perfectly fine. *(M3)*
16. [info] Nothing can show you that two strings differ. Only the signature check knows. *(diagram — dashboard vs env var)*
17. [info] Set it in the dashboard AND as the environment variable. Then confirm it really got set. *(checks)*
18. [card] Four — a real key ended up in a tracked file. *(signpost)*
19. [ui]   You push, and by morning the token is dead. *(M4 — a revocation notice)*
20. [info] That is the good outcome. Someone else could have found it first. *(statement)*
21. [info] Only dot env — and dot env is gitignored. *(checks — .env · .gitignore · rotate)*
22. [info] It stays in git history after you fix the file, so rotate the key too. *(checks, third item lit)*
23. [info] Key without access · localhost · half-set secret · committed key. *(fourparts, complete)*
24. [card] Name the tell before you open the code. *(closing)*

## The checkpoint (beat 13)

**Stem.** Your agent posts to Slack perfectly, but has never once received a message. Which mistake is
this?

**Options.**
- A — The credential is set but the channel was never shared
- B — The Request URL points somewhere the internet cannot reach
- C — The signing secret is set in only one place
- D — A key was committed and has been revoked

**Answer.** B.

**If they get it right.** Exactly — and the tell is the asymmetry. Sending working proves the token and
scopes are fine, because you are the one calling Slack. Receiving nothing points at reachability: either
the Request URL is `localhost`, or it points at something that is not running.

**If they get it wrong.** It is the reachability one, and the giveaway is that *sending works*. If the
credential were unshared or the bot uninvited, you could not post at all — so the thing that is working
rules that out. A half-set signing secret produces requests that arrive and get rejected, which shows up
as 403s in your logs, not silence. A revoked key breaks sending too, loudly and immediately. Silence in
one direction while the other is healthy nearly always means nothing is listening at a public address:
outbound calls out from anywhere, inbound has to be called *at* somewhere.

## Screens

| ID | Screen | Must be visible | Must NOT be visible |
|----|--------|-----------------|---------------------|
| M1 | Terminal + Notion side by side | The 404 `object_not_found` response, and the database visible in the browser behind it | Real database content |
| M2 | Slack Event Subscriptions | The Request URL box with `localhost`, and the red verification failure | A real workspace |
| M3 | Webhook deliveries list | A column of 403 responses; the dashboard's secret field showing "set" | Any real secret |
| M4 | A token revocation notice | The provider's "this token was disabled" message, generically framed | A real token or repo |

## Gate check

**READY** · 24 beats · 4 [ui] · 14 [info] · 5 [card] · 1 [checkpoint] · ~2:15

- **`qa-visuals` skips this automatically** — no character art. `qa-info` + `qa-checkpoint` are the gates.
- **Checkpoint:** beat 13, between two spoken beats (12 → 14), 4 options, both halves authored. The
  wrong-answer feedback teaches the diagnostic move — *what is working tells you what is not broken* —
  which is more durable than the answer itself.
- **Covers §7 completely:** all four mistakes with their tells, "necessary but not sufficient" (6), the
  localhost reason stated as direction-of-call (11–12), the both-places rule (17), and git history
  outliving the fix (22).
- **Data templates:** fourparts (2, 23 — one card, empty then complete), error card (5), twocard ×3
  (7, 8, 12), diagram ×2 (11, 16), checks (17, 21, 22), statement ×2 (6, 20). Five distinct; two
  statement cards, at the limit.

## Build notes

- **Beat 5 is the only exact error string** on screen: mono, red only on the error name, same treatment
  as every other error card in the module.
- **Beat 11's diagram is the one people remember** — their server, an arrow, your laptop, and the arrow
  stopping at a wall. It explains localhost better than any sentence can.
- **Beat 23 reuses the fourparts geometry** used throughout the module, now listing mistakes rather than
  services. The visual rhyme is intentional.
- No Imagen, no segmentation, no kie. Build is: `qa-info` → `qa-checkpoint` → TTS → compile → stitch →
  `verify`.
