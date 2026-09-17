# Video 6 — The Body You Already Have — draft

**Format: technical how-to walkthrough.** No protagonist. The learner's own hosting dashboard, `card` + `ui` beats.
**Covers:** guide §6, all three steps plus the sleeping-tier warning
**Teaches:** you do not set up a new host. You already have a live app somewhere — Railway, Render,
Vercel, Fly — and that app is the body this module keeps talking about. Three things to do to it.
**One move:** paste the secrets, give Slack and GitHub your app's address, add a check-in loop.
**Spine:** you paste your app's URL into the Slack tab you left open in video 4, and it verifies.

**Deliberately platform-agnostic.** The reference system runs on Railway, so the code shapes are
Railway/Python — but every screen is described by what it *does* ("the page where you paste private
values"), not by one vendor's layout. A learner on Render or Vercel must not feel this video is for
somebody else.

## Script (one beat per line · [card] = full-screen card · [ui] = interface screen · [info] = spoken point on a card)

1.  [card] You do not need a new host. You already have one. *(title card)*
2. [info] You have a project deployed somewhere — Railway, Render, Vercel, Fly. That is the body.
3. [info] Three things left to do to it, and only one is code.
4.  [card] One — tell it the secrets. *(signpost)*
5.  [ui]   Every platform has one page for private values. *(H1 — Variables / Environment)*
6.  [ui]   Paste in everything you collected: the Notion key, the Slack tokens, the GitHub token. *(H2)*
7. [info] Your code reads these by name. They are never typed into the code itself.
8.  [card] Two — give Slack and GitHub your address. *(signpost)*
9.  [ui]   Copy your app's normal web address — the link you would send a person. *(H3)*
10. [ui]   Paste it into Slack's Event Subscriptions box, the tab you left open. *(H4)*
11. [ui]   Slack sends its challenge, and the URL verifies. *(H5 — the green tick)*
12. [ui]   Paste it into GitHub's webhook payload URL as well. *(H6)*
13. [info] That one step is what actually connects everything.
14. [info] It is you telling Slack and GitHub: when something happens, call this app.
15. [checkpoint] *(nothing on screen — the player pauses, the LMS asks, gives feedback, resumes)*
16. [card] Three — add a check-in loop. *(signpost)*
17. [ui]   A few lines that run every minute and ask: is there anything new for me? *(H7 — the scheduler line)*
18. [info] In Python that is one line. In Node, a cron library does the same.
19. [info] This is what makes it check in on its own, instead of only reacting to you.
20. [ui]   How to know it worked: open your logs, send a test message, watch it arrive. *(H8 — logs)*
21. [info] Within a second or two. If nothing appears, nothing is listening.
22. [ui]   One thing to watch: some free tiers fall asleep after a quiet period. *(H9)*
23. [info] A sleeping app misses the message until it wakes, so expect a delay, or upgrade the tier.
24. [card] Secrets in · address out · check in every minute. *(checklist)*
25. [info] Your turn. Three steps on the host you already have, then send yourself a test message.

## The checkpoint (beat 15)

**Stem.** You are setting up Slack's Event Subscriptions and you paste in
`http://localhost:8000/slack/events`. Slack refuses to verify it. Why?

**Options.**
- A — Slack requires HTTPS, so `https://localhost:8000` would work
- B — Slack is calling your server from the internet and cannot reach an address that only exists on your laptop
- C — The endpoint path must be exactly `/slack/events`
- D — Event Subscriptions must be toggled on before the URL is accepted

**Answer.** B.

**If they get it right.** Exactly, and this is the concrete reason a deployment stops being optional the
moment you want inbound events. Outbound calls work fine from a laptop — you are calling Slack. Inbound
means Slack calls *you*, and `localhost` is a name that only means anything on the machine you are
sitting at.

**If they get it wrong.** `localhost` means "this machine" — and the machine Slack is calling from is
Slack's, not yours. Their servers resolve it to themselves, find nothing, and the verification fails.
Switching to `https` does not help because the problem is reachability, not the protocol; the path can be
anything you like as long as your app serves it; and toggling Event Subscriptions is what produced the
URL box in the first place. This is precisely why you can post messages from your laptop all day but
cannot receive a single one until the app lives at a public address — and it is why this video comes
after the Slack one rather than before it.

## Screens to capture or re-create

| ID | Screen | Must be visible | Must NOT be visible |
|----|--------|-----------------|---------------------|
| H1 | The host's variables page | The page where private values are pasted, generically framed | A real project name; anything vendor-specific enough to exclude other platforms |
| H2 | Variables filled | `NOTION_API_KEY`, `NOTION_GOALS_DB_ID`, `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_CHANNEL_ID`, `GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET` — names visible, values masked | Any real value |
| H3 | The app's public URL | The ordinary address bar of the deployed app | A real deployment URL |
| H4 | Slack Event Subscriptions, URL pasted | The Request URL box now filled | — |
| H5 | Slack's verification tick | The green **Verified** state | — |
| H6 | GitHub webhook payload URL | The same address plus `/webhooks/github` | — |
| H7 | Editor: the check-in loop | `scheduler.add_job(run_session, "interval", seconds=60)` and a one-line Node equivalent beside it | — |
| H8 | The host's logs | A test Slack message arriving, timestamped | Real message content |
| H9 | A free-tier sleep notice | Any platform's "instance spins down when idle" wording, generically framed | Vendor-specific branding that implies only one host |

**Production:** re-create in `animation/walkthrough.html` — strongly preferred here, because a real
capture would inevitably be one vendor's dashboard and the whole point is that it does not matter which.

## Gate check

**READY** · 25 beats · 9 [ui] · 5 [card] · 10 [info] · 1 [checkpoint] · ~2:20

- **Platform-agnostic throughout.** No beat says "click the Railway button". Every screen is named by
  what it does. Railway appears once, in beat 2, in a list of four.
- **Checkpoint:** beat 15, between two spoken beats (14 → 16), 4 options, both halves authored. The
  wrong-answer feedback explains the outbound/inbound asymmetry, which is the actual insight.
- **Covers §6 completely:** the three steps (4–19), the log test (20–21), the sleeping-tier warning
  (22–23) — and it closes the loop opened in video 4 by filling in the Request URL at beat 10.
- **The hand-off pays off:** beat 10 explicitly returns to "the tab you left open", so the two videos
  read as one continuous build rather than two separate tasks.

## Build notes

- **No Imagen art, no i2v.** Cursor travel, typed text, the verification tick, log lines arriving.
- **Step counter** (`1 / 3`, `2 / 3`, `3 / 3`) — only three steps, so the counter is a reassurance rather
  than navigation.
- **Beat 11 is the payoff frame** of two videos: the green tick that video 4 could not reach. Give it a
  beat of silence after.
- H1 and H9 must be drawn **generically** — if a learner on Render sees a Railway dashboard, the video
  has failed its own premise.
- Beat 17 shows Python and Node **side by side**, three lines total, so neither language feels like the
  default.
- The spoken-point beats are plain typographic cards — one sentence, set large, no illustration.
