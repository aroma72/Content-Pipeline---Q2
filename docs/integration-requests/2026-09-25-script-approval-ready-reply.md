---
type: reference
last_verified: 2026-09-25
owner: Aroma Tahir
---

# Good — and it is on one machine. Push it, and we will deploy into your window

**To:** the Cohort 2 LMS team (Abdulrehman Siddiqi / Nazim)
**From:** Content Automation — Drawing Room / Content Queen
**Re:** `feat/script-approval-gate` / `75464b4`
**Date:** 2026-09-25

---

## 1 · The work is right

We looked at `75464b4` before replying, the same way we looked before writing you the guide. It does
what you said it does, and a few things we did not ask for:

- All four routes, and **`sha` read from the response and never re-fetched** — that was the line we
  most expected to be quietly optimised away, because re-fetching it is more convenient and looks
  identical until the day it is not. Thank you for taking it seriously.
- The two gates kept apart, with their own label and their own buttons. `build-library.ts` no longer
  sends a script to a video's Approve.
- `0062_script_approval_gate.sql`, the five fields through the poller each tick,
  `VENDORED_CONTRACT_VERSION` at 1.2, and our frozen contract vendored beside 1.1.
- A test asserting a script-blocked lesson **must never read "Ready for review."** That is the exact
  failure we traced through your code last week, and you have pinned it so it cannot come back.

Verifying additively rather than click-testing was the correct call, and it is the reason your side
was safe to write before ours shipped.

## 2 · It has not left this machine

This is the whole of the problem, and we would rather say it plainly than dance around it:

```
$ git branch -r --contains 75464b4
(nothing)

$ git for-each-ref --contains 75464b4
refs/heads/feat/script-approval-gate      ← the only one

$ git log -1 --format='%h %ad' origin/main
ff5f814  Tue Sep 22
```

`75464b4` is committed and has never been pushed. Your `origin/main` is three days old and predates
the work, and your Railway service deploys from that same GitHub repo — so what is running today
still cannot answer `/script/approve`.

We do not read this as anyone overstating anything. On the machine where you wrote it, *done* and
*live* are the same afternoon and genuinely feel like the same event; the ladder only separates into
rungs when somebody else is standing on the far end of it waiting. We are just the far end, so we
noticed.

If we deployed now, your next course would stop at lesson one — the identical failure we have both
been holding this deploy to avoid, arrived by a different road.

## 3 · Three things, then we go

1. **Push, merge, deploy your side.** Our §6 still holds: nothing on 1.1 ever emits
   `script-approval`, so your new branch is inert until we deploy. Shipping it to your production
   first carries no risk and is the ordering we recommend.
2. **A real window.** Item 2 of your note arrived as `[earliest we can watch it together]` — the
   placeholder never got filled. Name a time and we will take it; we will run `predeploy-check`,
   deploy, and confirm `contractVersion: "1.2"` on `/health` while you watch.
3. **The interrupted lesson.** You said you would decide
   `lms-e2e-2026-09-23/where-the-error-actually-happened` before our deploy — it is still open.
   Either answer is fine; we just do not want it inheriting a contract change mid-decision.

Once your deploy is up, tell us and we will confirm it from our side before we touch ours — the
check takes a minute and means neither of us is deploying on an assumption.

## 4 · Yes to the call

We will be on it. One module, two lessons, let it stop at lesson one: read the script, send one
revision, approve, and watch it through to `review`. The revision is worth doing deliberately rather
than skipping to the approve — it is the path that exercises the new `sha`, and it costs cents.

Our side is ready and waiting on the same single redeploy: the gate, and your ceiling at
`monthlyUsd: 50` with `maxRunUsd` at 4.
