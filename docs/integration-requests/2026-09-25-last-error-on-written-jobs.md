---
type: reference
last_verified: 2026-09-27
owner: aroma
---

# For the LMS team — why "Make the video" did nothing, and what changed

*Sent alongside commit `af467b4` on your `feat/script-approval-gate` branch, which carries the
page change described here. Nothing below requires a schema migration.*

## What happened on 2026-09-25

Your video `e80c9572…` (our job `43a782dd45dd`) sat at *"Script written and passed review.
Nothing has been bought."* Clicking **Make the video** showed "processing" and returned the same
page. The cause was on our side:

1. Two redeploys of our service (10:22Z and 10:39Z) replaced the container while the job was
   `written`. The script file lived on the container filesystem, so it went with it.
2. Your click at 10:27Z reached us, reserved $4 against your tenant, and failed **9 ms later**
   with *"this video has no gated script yet"* — before any money moved. The reservation was
   settled at $0.
3. We put the job back to `written` (the script *was* fine as far as we knew) with the reason in
   a field your page did not read. Your page draws the button from `status === 'written'`, so
   it drew the button.
4. Our idempotency layer treated the failed attempt's key as a replay, so every later click on
   that video was answered with the cached 202 and did no work.

All four are fixed on our side and live (`/health.build.commit` = `86cc40a…`).

## What your side gets now

**A new field on `GET /demo/make-video/:jobId`** while a job is `written` and its last produce
did not start:

```json
"lastError": { "at": "2026-09-25T10:27:32Z", "stage": "produce", "message": "…", "runId": null }
```

`status` stays `written` and `error` stays `null` — the job is not over. The `af467b4` commit on
your branch:

- adds `lastError` to the partner job type, the known-field allowlist and the projection
  (`content-queen-jobs.ts`);
- has the poller lift `lastError.message` into your existing `error` column while the partner
  status is `written` (`content-video-poll.ts`) — no migration;
- shows it on the video page under the "Script written" panel: *"The last attempt did not
  start: … Nothing was bought. You can try again."* (`videos/[id]/page.tsx`).

Two poller tests cover it; `tsc` is clean on both apps.

**A retry with the same `Idempotency-Key` now works** after a failed attempt. You do not need
to change how you mint keys.

**A job whose script truly cannot be recovered** now answers `409 {"error":"script_lost"}` and
moves to `failed` with a reason that tells the person to create the video again. Your page
already renders `failed` with its reason.

## The two videos from that day

- `43a782dd45dd` (*"Distinguish between a task, a goal, and an outcome…"*): the record we kept was
  a summary (info-card templates without their data), so the script is **not** recoverable. The
  next click will fail it honestly with the message above. Please create it again — the script
  write costs no media spend.
- `cdb890a5b40f` (the "straight talking, pie charts" variant): killed mid-write by the same
  redeploy; already shows `failed: interrupted by a server restart` on your side. Create it again.

## What we changed so this cannot recur

- Written scripts are persisted to the volume the moment they are written, and rebuilt before
  produce from the volume or from a complete copy in the job record.
- Our deploy path refuses to run while any lesson **or one-video job** is in flight, and proves
  a deploy by the new build's commit stamp — "Triggered a deploy" is no longer taken as success.
- `SIGTERM` marks in-flight jobs `interrupted` immediately instead of at the next boot.
