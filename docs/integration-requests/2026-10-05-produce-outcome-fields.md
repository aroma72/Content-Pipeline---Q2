---
type: reference
last_verified: 2026-10-05
owner: aroma
---

# For the LMS team — "Nothing was bought" was wrong, and the fields that make it right

*Additive only. `contractVersion` stays `1.2`. Nothing below needs a migration.*

## What happened on 2026-10-05

An instructor pressed **Make the video** on *product thinking for beginners* (our job
`9b12b753…`). Your page then showed:

> The last attempt did not start: produce blocked: grammar and clarity … (eval-text.js, exit 1) …
> Nothing was bought. You can try again.

Our logs show the opposite. The run bought art and speech (about $1.60), rendered the video, saved
it (27.2 MB), and was then **blocked after the render** by a grammar check that replayed a cached
verdict about one sentence. We reported that as a plain failure, put the job back to `written`,
settled the spend at $0, and your page drew the sentence above from `written` + `lastError`.
Pressing again would have bought it a second time.

Four things were wrong on our side and all are fixed:

1. The single-video flow never ran our free script checks before telling you "passed review".
   It does now, the same five checks the course flow runs before it asks anyone.
2. The grammar check ran twice on identical text; the second run could only repeat the first.
   It no longer re-runs on unchanged text, and after the spend only the checks that detect a
   broken render can stop a run.
3. A run that stopped after making the video was reported as a run that never started.
4. The ledger was settled at $0 for a run that had spent.

## What your side gets now (`GET /demo/make-video/:jobId`)

| Field | When | Meaning |
|---|---|---|
| `deliverableAvailable` | always, once the job has a script | `true` when a finished video exists on our disk **or** on Drive. Read this, not `status`, to decide whether to say "nothing was bought". |
| `script.scriptSha` | from `written` | The 16-hex fingerprint of the checked script. `produce` approves exactly these bytes. |
| `script.unresolvedChecks[]` | from `written` | Findings the free checks could not settle in two redrafts; usually empty. Informational. |
| `produce.warnings[]` | `awaiting_review` | Findings a check accepted rather than blocked on, each `{sensor, what, findings}`. Show them with the review controls. Usually empty. |
| `produce.blocked` | `awaiting_review` after a post-render block | `{stage, code, message}` — present only when a post-render check asked for a person. |
| `lastError.kind` | any stop | `"blocked"` (a check wants a decision) or `"failed"` (the run broke). |
| `lastError.code` | any stop | Our `blockedBy` code when `kind` is `blocked`, e.g. `post-render-check`, `spend-approval`; else `null`. |
| `lastError.spentUsd` | any stop | What the stopped run actually spent. |
| `lastError.deliverableAvailable` | any stop | Whether a video existed when the run stopped. |

### Status after a stop

| Case | `status` | Suggested copy |
|---|---|---|
| video made, check wants a look | `awaiting_review` | "Your video is ready and waiting for your review." If `produce.warnings.length`, add "A check noted: …" |
| video made, run died afterwards | `interrupted` (`resumable: true`) | "The video was made but the run was interrupted. Press again to resume (nothing is bought twice)." |
| nothing made | `written` | "The last attempt did not start … Nothing was bought." — **only when** `lastError.spentUsd === 0 && !deliverableAvailable` |

A retried `POST …/produce` on an `awaiting_review` or `interrupted` job still answers `202` with
`idempotent: true` and starts no second paid run, as before.

## Where this lands in your code

- `content-queen-jobs.ts`: add the fields above to the partner job type and allowlist.
- `content-video-poll.ts`: lift `lastError.message` into `error` **only** when `status === 'written'`
  and `lastError.spentUsd === 0`; otherwise surface `produce.warnings`.
- `videos/[id]/page.tsx`: branch the banner on the table above instead of on `written` + `lastError`.

The `9b12b753…` video exists and is on Drive; its job record will show `awaiting_review` once your
poller reads it after our deploy.
