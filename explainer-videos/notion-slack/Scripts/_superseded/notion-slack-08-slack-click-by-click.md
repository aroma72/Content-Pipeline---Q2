# Video 8 — Slack, Click by Click — draft

**Format: SCREENCAST (not the Ali illustration format).** Same treatment as video 7 — `card` + `ui` beats
only, real interface screens, no Imagen art, TTS-only cost. Ali appears in voice at the open and close.

**Teaches:** the exact eight steps — across fifteen screens — that take a Slack app from "created" to
"posting in one channel".
**One move:** add the scope, reinstall, copy the bot token, invite the bot to the channel.
**Real project / everyday spine:** the second half of Ali's order agent — giving it a voice in one shop
channel, and only that one.

Built for following, not watching. The video's spine is the pattern it shares with video 7:
**permission, then membership** — a scope is not access, and neither is an installed app. That sentence is
the reason these two walkthroughs are a pair rather than one long video.

Deferred: Notion (video 7), everything conceptual (videos 1–6). Block Kit layout, slash-command payloads,
modals and distributing an app to other workspaces are out of scope.

## Script (one beat per line · [card] = full-screen card · [ui] = interface screen · [ali] = character)

1.  [card] Eight steps, and your agent can post in one channel — only that one. *(title card)*
2.  [ali]  Same project, other half. Now Ali's agent gets a voice in the shop channel.
3.  [ui]   Go to a p i dot slack dot com slash apps, and click Create New App. *(S1 · cursor to the button)*
4.  [ui]   Choose From scratch, name it after the job, and pick your workspace. *(S1b · the modal filling in)*
5.  [ui]   If your workspace needs an admin to approve apps, ask them now, not on Friday. *(S1c · the approval notice held)*
6.  [ui]   Open OAuth and Permissions, and scroll down to Bot Token Scopes. *(S2 · sidebar click, page scrolling)*
7.  [ui]   Add chat colon write. That is permission to speak at all. *(S2 · scope typed and added)*
8.  [ui]   Add chat colon write dot public only if it must post in channels it has not joined. *(S2b · second scope added)*
9.  [ui]   Every new scope makes Slack ask you to reinstall. Do it, or you get missing scope. *(S2c · the yellow reinstall banner)*
10. [ui]   Click Install to Workspace, and actually read what you are agreeing to. *(S3 · the consent screen held)*
11. [ui]   Copy the Bot User OAuth Token — the one beginning x o x b. *(S4 · masked token, Copy clicked)*
12. [ui]   It goes into dot env, beside your Notion key, and dot env stays in dot gitignore. *(S5 · both files on screen)*
13. [card] QUESTION · Your bot has chat colon write and a valid token, and posting to your private test channel returns not_in_channel. What is missing? A — another scope · B — the bot is not a member of that channel · C — a paid Slack plan · D — the app was never installed. Write your answer down. *(quiz card, no answer shown, holdAfter)*
14. [ui]   Make a test channel first. Not general, not the channel your team actually reads. *(S6 · new channel dialog, an invented test name)*
15. [ui]   Type slash invite, then your bot's name, and send it. *(S6b · the composer, typed character by character)*
16. [ui]   Slack confirms it joined. That is the step people miss. *(S6c · the joined confirmation in the channel)*
17. [card] It is the same pattern as Notion — permission, then membership. *(hinge card, two columns: scope / invite · shared / connected)*
18. [ui]   Now post one line from your code, and watch it arrive with the APP badge. *(S7 · the first bot message appearing)*
19. [card] REVEAL · B. The scope lets it speak; membership lets it speak *here*. *(same quiz card, B highlighted)*
20. [ui]   Working on your own laptop with no public address? Turn on Socket Mode. *(S8 · the Socket Mode toggle, then the app-level token beginning x a p p)*
21. [ui]   And put that first message in a thread, not straight into the channel. *(S7b · the same message, threaded)*
22. [card] Create · scopes · reinstall · install · token · env · invite · first message. *(checklist card, the eight steps, ticking in sequence)*
23. [ali]  Ali's agent now reads one table and speaks in one channel.
24. [ali]  That is the whole integration. Everything after this is what you choose to do with it.

## Screens to capture or re-create — fifteen screens across the eight steps

| ID | Screen | Must be visible | Must NOT be visible |
|----|--------|-----------------|---------------------|
| S1 | `api.slack.com/apps` → **Create New App** | The Create New App button | Other apps in the list, the real workspace name |
| S1b | **From scratch** modal | App name field filled with the job name, workspace picker | The real workspace name |
| S1c | Admin-approval notice | The wording that an admin must approve the install | — |
| S2 | **OAuth & Permissions** → Bot Token Scopes | `chat:write` being added from the scope picker | Any user-token scopes — do not show that section at all |
| S2b | Same, second scope | `chat:write.public` added beneath it | — |
| S2c | The **reinstall** banner | The yellow "you changed permission scopes, reinstall your app" strip | — |
| S3 | **Install to Workspace** consent screen | The list of what the app will be able to do, the Allow button | The real workspace name and icon |
| S4 | **Bot User OAuth Token** | `xoxb-` prefix then dots, the Copy control | Any real token characters, even partially |
| S5 | Editor: `.env` and `.gitignore` | `SLACK_BOT_TOKEN=` masked, `NOTION_TOKEN=` masked above it, `.env` inside `.gitignore` | Real tokens |
| S6 | New channel dialog | An invented test channel name, set to private | Real channel names from the sidebar |
| S6b | Channel composer | `/invite @order-agent` typed out character by character | Real colleagues' names or avatars in the member list |
| S6c | Channel after the invite | The "added to the channel" confirmation line | — |
| S7 | The bot's first message | The message with the **APP** badge next to the bot name | Real message history above it — use invented lines |
| S7b | The same message, threaded | The thread reply count / thread view | — |
| S8 | **Socket Mode** toggle + App-Level Token | The toggle switched on, `xapp-` prefix then dots | Any real token characters |

**Production route:** same as video 7 — recommend re-creating these in `animation/walkthrough.html`
(plain text wordmarks, no vendor logos, invented shop data, values masked in the render itself). Real
captures are only worth it for S3 and S6c, and every real frame needs a pass for colleague names, channel
names and token characters.

## Gate check

**READY** · 24 beats · 16 [ui] (67%) · 5 [card] · 3 [ali] · average ~13 words per line

- **Format exception, deliberate:** as with video 7, the evals-grade visual standard does not apply to the
  screencast format — flagging it so the visuals gate is not run against this file. The bar here is one
  action per screen, a visible cursor, and every element named before it is clicked.
- **One move:** scope → reinstall → token → invite. New concepts: none conceptually; the only new *facts*
  are the two token prefixes (`xoxb-`, `xapp-`) and where each lives.
- **Leads with the answer:** beat 1 states the job, the length and the blast radius ("only that one").
- **Before → after:** before is an app that exists and cannot speak; after is a threaded message with the
  APP badge (18, 21) in the viewer's own test channel.
- **Emotional checkpoints:** beat 5 stops them being blocked by an admin on Friday, beat 16 tells them the
  missed step is normal rather than careless, beat 24 hands the project back to them. Three.
- **Interactive pair:** QUESTION at beat 13 (~½ through — placed early on purpose so the invite steps play
  *while* the answer is still open, `holdAfter: 6`), REVEAL at beat 19.
- **Exact strings on screen:** `chat:write`, `chat:write.public`, `missing_scope`, `not_in_channel`,
  `/invite`, `xoxb-`, `xapp-`, Socket Mode, `.env`, `.gitignore` — all verified in `research.md`
  (F5, F11, F13).
- **Numbers:** eight steps (1, 22) shot across fifteen screens, two scopes (7, 8), one channel (1, 23).
  The spoken count is always *steps*; the capture table counts *screens*.
- **No assignments.** Beat 24 closes the module's practical half.

## Build notes

- **No Imagen art, no i2v, no `animateIds`.** Movement is cursor travel, click pulses, typed text and the
  reinstall banner sliding in. A still interface screen is a failed beat.
- **Step counter** in the corner (`4 / 8`), advancing on beats 3, 6, 9, 10, 11, 12, 15, 18.
- Beat 17 is the hinge frame of both walkthroughs: a two-column card, Notion on the left (shared → 
  connected), Slack on the right (scope → invited), with the shared word **membership** landing last. It
  is the frame that justifies videos 7 and 8 being a pair. Give it the most care in this file.
- Beats 14–16 run as one continuous Slack frame, cursor moving, no cuts — the invite is the step that
  fails silently for people, so it must be seen happening in one motion.
- Beat 9's banner is the only yellow element in the video. Do not decorate anything else in that colour.
- Beat 20 is a quiet aside for local development; keep it visually calm so it does not compete with the
  close.
- Beat 22's checklist wording matches the step counter labels exactly, and ticks in performed order.
- Ali's beats (2, 23–24) use the illustrated shop frames; beat 23 should reuse video 6's closing composition
  so the module lands on the same picture it ended on.
- Every masked value is masked **in the render**, never blurred afterwards.
