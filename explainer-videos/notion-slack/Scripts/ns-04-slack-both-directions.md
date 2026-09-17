# Video 4 — Slack, Both Directions — draft

**Format: technical how-to walkthrough.** No protagonist. Real Slack screens, `card` + `ui` beats, cursor visible.
**Covers:** guide §4a **and** §4b — merged, because speaking and listening are one app configured in one
sitting, and splitting them leaves a learner holding a half-built Slack app across two videos.
**Teaches:** outbound first (scopes, install, `xoxb-`, `/invite`, channel ID), then inbound (Event
Subscriptions, the Request URL, the challenge echo, the signing secret) — and why the second half is
what makes it two-way.
**One move:** get four values and put the bot in the channel.
**Spine:** the agent posts its first message, then answers when you @-mention it.

**The longest video in the module (~4 min), and the only one with a deliberate hand-off:** the Request
URL cannot be filled in until video 6 gives them a public address. The script says so out loud at beat
19 rather than letting anyone sit stuck on a form they cannot complete yet.

## Script (one beat per line · [card] = full-screen card · [ui] = interface screen · [info] = spoken point on a card)

1.  [card] Two halves: let it speak, then let it listen. *(title card)*
2. [info] Most people do the first half and stop, and then wonder why it never replies.
3.  [card] Half one — outbound. *(signpost)*
4.  [ui]   Go to a p i dot slack dot com slash apps, and click Create New App. *(S1)*
5.  [ui]   From scratch, name it, pick the workspace. *(S2)*
6.  [ui]   Open OAuth and Permissions, and scroll to Bot Token Scopes. *(S3)*
7.  [ui]   Add chat colon write — that is permission to send messages. *(S4)*
8.  [ui]   Add app underscore mentions colon read — so it sees when it is @-mentioned. *(S5)*
9.  [ui]   Add channels colon history — so it can read the channel it is watching. *(S6)*
10. [ui]   Scroll up, Install to Workspace, and approve. *(S7)*
11. [ui]   Copy the Bot User OAuth Token — the one starting x o x b. *(S8)*
12. [card] The step everybody misses, again. *(signpost — hold)*
13. [ui]   In Slack itself, go to the channel and type slash invite, then your bot's name. *(S9)*
14. [ui]   A token does not put the bot in a channel. Somebody has to invite it. *(S9 held)*
15. [info] Same rule as Notion's Connections. The credential is necessary. It is not sufficient.
16. [ui]   Right-click the channel, view channel details, copy the Channel ID from the bottom. *(S10)*
17. [checkpoint] *(nothing on screen — the player pauses, the LMS asks, gives feedback, resumes)*
18. [card] Half two — inbound. This is what makes it two-way. *(signpost)*
19. [ui]   Event Subscriptions, toggle on — and here you need something we do not have yet. *(S11)*
20. [info] The Request URL has to be a real, public address that is already running your code.
21. [info] That comes in video six. Leave this tab open and come back to it.
22. [ui]   Under Subscribe to bot events, add app underscore mention. *(S12)*
23. [ui]   And message dot channels, so it reacts to any message in a channel it is in. *(S13)*
24. [ui]   The moment you paste the URL, Slack sends a one-time challenge. *(S14)*
25. [ui]   Your server has to echo that challenge value back, or the URL never verifies. *(S15 — the code)*
26. [ui]   Last value: Basic Information, copy the Signing Secret. *(S16)*
27. [ui]   That secret is how your server proves a request really came from Slack. *(S17 — the HMAC check)*
28. [info] Anyone can POST to a public URL. The signature is what makes it trustworthy.
29. [card] Four values: bot token, signing secret, channel ID — and the bot, invited. *(checklist)*
30. [ui]   Outbound is one call: chat dot postMessage with your token and channel. *(S18)*
31. [info] Speak, then listen. Do both, and you have a colleague instead of a printer.
32. [info] Your turn. Get the three values and invite the bot; the URL waits for video six.

## The checkpoint (beat 17)

**Stem.** Your bot has `chat:write`, the app is installed, and the token is correct — but posting to
your channel fails with `not_in_channel`. What is missing?

**Options.**
- A — The `channels:history` scope
- B — The bot was never invited to that channel
- C — The app needs reinstalling after adding scopes
- D — The channel ID is wrong

**Answer.** B.

**If they get it right.** Exactly, and the error name says it plainly once you read it as a statement of
fact rather than a failure: the bot is *not in the channel*. Scopes say what it is allowed to do
anywhere; membership says where it is allowed to do it. `/invite @your-bot` is the whole fix.

**If they get it wrong.** The bot is not a member of the channel. This is the single most common Slack
error, and it catches people because everything else is genuinely correct — the token works, the scope
is granted, the app is installed. But a scope is a permission, not a presence: `chat:write` means "may
send messages", not "is in this room". `channels:history` governs reading, not posting. Reinstalling
matters when you *add* a scope, which is a different error (`missing_scope`). And a wrong channel ID
gives `channel_not_found`, not `not_in_channel` — the error is telling you it found the channel fine and
your bot simply is not in it.

## Screens to capture or re-create

| ID | Screen | Must be visible | Must NOT be visible |
|----|--------|-----------------|---------------------|
| S1 | `api.slack.com/apps` | The **Create New App** button | Other apps, the real workspace name |
| S2 | **From scratch** modal | App name filled, workspace picker | The real workspace name |
| S3 | **OAuth & Permissions** → Bot Token Scopes | The scope section, the Add button | Any user-token scopes — do not show that section |
| S4–S6 | Each scope added in turn | `chat:write`, then `app_mentions:read`, then `channels:history` | — |
| S7 | **Install to Workspace** → consent | What the app will be able to do, the Allow button | The real workspace name and icon |
| S8 | **Bot User OAuth Token** | `xoxb-` prefix then dots, the Copy control | Any real token characters |
| S9 | The channel composer | `/invite @your-bot` typed out, then the "added to the channel" line | Real colleagues' names or avatars |
| S10 | Channel details, scrolled to the bottom | The **Channel ID** (`C0…`) | Real channel names in the sidebar |
| S11 | **Event Subscriptions** toggled on | The Request URL box, empty, with its "we'll verify" note | — |
| S12–S13 | Subscribe to bot events | `app_mention`, then `message.channels` | — |
| S14 | The URL verification moment | Slack's one-time challenge request, the green Verified tick | A real public URL |
| S15 | Editor: the challenge echo | The `url_verification` branch returning `challenge` — 3 lines | — |
| S16 | **Basic Information** → Signing Secret | The Show/Copy control, value masked | Any real secret characters |
| S17 | Editor: the signature check | `v0:timestamp:body`, HMAC-SHA256, `compare_digest`, 403 on mismatch | — |
| S18 | Editor: sending a message | `chat.postMessage` with the token as a name, channel, text | Any real token |

**Production:** re-create in `animation/walkthrough.html` (recommended) or capture real screens with a
scrub pass. Never show a real workspace, channel or colleague.

## Gate check

**READY** · 32 beats · 19 [ui] · 5 [card] · 7 [info] · 1 [checkpoint] · ~3:45

- **Longest in the module, deliberately.** Splitting it left the learner with a Slack app that could talk
  but not hear, across a video boundary — the merge is the fix, and beats 3 and 18 signpost the halves
  so it never feels like one undifferentiated slog.
- **The hand-off is explicit** (19–21): the Request URL needs video 6. Said out loud, with an instruction
  to leave the tab open, rather than leaving a learner stuck on a form.
- **Checkpoint:** beat 17, at the seam between the two halves, 4 options, both halves authored; the
  wrong-answer feedback distinguishes `not_in_channel` from `missing_scope` and `channel_not_found`,
  which is the actual confusion.
- **Covers §4a and §4b completely:** create (4–5), three scopes (6–9), install (10), token (11), invite
  (12–15), channel ID (16), Event Subscriptions (19), the two events (22–23), the challenge (24–25), the
  signing secret and HMAC (26–28), the outbound call (30).
- **The repeated pattern is named** at beat 15 (credential ≠ access, same as Notion) and again at 28
  (a secret proves who is calling) — video 5 calls back to it.

## Build notes

- **No Imagen art, no i2v.** Motion is cursor travel, click pulses, typed text, the verification tick.
- **Step counter** (`4 / 9`), advancing on 4, 6, 10, 11, 13, 19, 22, 26, 30.
- **Beats 12–15 run as one continuous Slack frame**, no cuts — the invite is the step that fails silently.
- Beats 25 and 27 show **three to five lines of code each**, no more. They are recognition aids, not
  listings; the same shape returns in video 5 for GitHub.
- Beat 24's challenge/verify moment should land as a single satisfying tick — it is the only moment in
  the module where a form tells you it worked.
- The spoken-point beats are plain typographic cards — one sentence, set large, no illustration.
- Every masked value is masked **in the render**.
