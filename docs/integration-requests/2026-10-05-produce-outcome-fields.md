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

The `9b12b753…` video itself exists and is on the Taleemabad University Drive. Its job record was
written before this change and still reads `written` + `lastError`; stored records are not
rewritten. Since Part 2 below, `GET /demo/make-video/9b12b753…/video` streams it; do not press
**Make the video** again on that job.

---

# Part 2 — watching a finished lesson: "There is no video to preview" was also wrong

## What happened

Course *project management for dummies* (your course `a3f61f43…`, 1 lesson, $3.09 spent) reached
review. Your build page showed, on one card, "Ready for you", "The video is finished and waiting for
someone to watch it", **and** "There is no video to preview — this lesson stopped before it was
made. Approving it will not publish anything; it has to be rebuilt." The instructor could not watch
a video that exists and was paid for.

Cause, on our side:

1. Within minutes of a lesson reaching `review`, we move the mp4 to the Taleemabad University Drive
   and delete our copy. That is by design, for durability and disk.
2. After that move, `items[].deliverableAvailable` on `GET /courses/:id` went `false`, and
   `GET .../lessons/:id/file` answered **200 with a JSON record** (`saved2drive`, `driveUrl`) instead
   of the mp4. Neither matched the contract we gave you, which says `deliverableAvailable` means
   "`GET .../file` will serve bytes right now" and that `review` means the video exists.
3. Your page follows that contract: it archives our bytes into your own store only when
   `deliverableAvailable === true` (`content-course-poll.ts`), plays only from your archive
   (`LessonPreview`, `driveFileId`), treats any 2xx from `/file` as an mp4 (`openLessonFile`), and
   shows "stopped before it was made" when the field is `false` and you hold no copy
   (`courses/build/[id]/page.tsx`). The `driveUrl` we sent would not have helped: the file sits on a
   private Shared Drive that only four named accounts can open.

## What changed on our side (no client change needed to get the bytes)

| Field or route | Now |
|---|---|
| `GET .../lessons/:lessonId/file` | Streams the mp4 **from Drive through us** when our copy is gone: `200`/`206` `video/mp4`, full `Range`, `X-Served-From: drive` or `volume`. Same bytes, same md5. |
| `GET /demo/make-video/:jobId/video`, `GET /demo/videos/:slug/file` | Same behaviour for single videos. |
| The Drive record | Opt-in: `Accept: application/json` or `?format=json` → `{saved2drive, driveFileId, driveUrl, md5, verified, video{}, status, blockedBy}`. |
| `503 drive_unavailable` | New. The video exists but Drive could not be reached (`driveStatus` carries Drive's HTTP code, the record rides along). **Retry later; this is not a 404 and not a missing video.** |
| `items[].deliverableAvailable` | `true` whenever `/file` will serve bytes — including after our offload. |
| `items[].videoLocal` | New. `false` once offloaded. Informational. |
| `items[].saved2drive`, `driveFileId`, `driveUrl`, `driveSavedAt` | Now present for every offloaded lesson (a flag was missing for some). |
| `404 no_deliverable.renderExists` | `true` for `blockedBy: review`; the message no longer says a review-blocked lesson "never rendered". |

Full rows: `docs/CONTRACT-CHANGELOG.md` ("1.2, additive — 2026-10-05", second table).

## What we ask you to change

1. **Nothing, to get the video.** With `CONTENT_QUEEN_LESSON_FILE_ENABLED=true`, your poller will see
   `deliverableAvailable: true` for *project management for dummies* after our deploy, queue the
   archive, fetch bytes from `/file`, verify the mp4 header, and the page will play it. If you ever
   special-cased a `200` JSON body from `/file`, remove that; ask with `Accept: application/json`
   when you want the record.
2. **Set the flag on the API service too.** We read your Render production environment (read-only,
   2026-10-05): `CONTENT_QUEEN_LESSON_FILE_ENABLED=true` is set on `capacitylab-worker` but **not on
   `capacitylab-api`**. The worker's poller will therefore queue the archive, but the API's
   `previewEnabled` (`routes/content-courses.ts`, from `lessonFileEnabled()`) reads `false`, so once
   the field flips the page's third branch says "Watching before approval is switched off here" until
   the archive lands, and any API-side gate on the stream routes stays closed. Both services were last
   deployed 2026-09-29 (`e075b22`). Your worker's `content-course-poll` ran successfully every one to
   two minutes through the morning of 2026-10-05, so the poller itself is fine; it saw `false` from us.
3. **Treat `503 drive_unavailable` as a retry in `content-video-archive.ts`**, not as a terminal
   `archiveError`. Everything else you already do (header check, `not_a_video`) stays right.
4. **The build page's three sentences should not contradict each other.** Suggested rule, in
   `courses/build/[id]/page.tsx` and `blocked-by.ts`:
   - "The video is finished and waiting for someone to watch it" only when
     `deliverableAvailable === true` (or your `driveFileId` is set).
   - "There is no video to preview — this lesson stopped before it was made" only when
     `deliverableAvailable === false` **and** `blockedBy !== 'review'`.
   - For `blockedBy === 'review'` with `deliverableAvailable === false` (should not happen now),
     show "The video exists but could not be fetched yet — retrying" rather than "stopped".
5. **Your staging talks to our production and spends real money.** `CONTENT_QUEEN_API_URL` is unset
   on your Railway Staging, so its produce and approve buttons buy art and speech on our
   `cohort2-lms` tenant. Point it at nothing, or at a test tenant we can give you, before the launch.

## The lesson from that day

`project-management-for-dummies/task-and-how-to-break-it-down-into-smallest-units` is on Drive,
verified md5. After our deploy its `/file` route streams it and `deliverableAvailable` reads `true`.
No rebuild is needed; **do not** press Approve until the preview has played, and do not Reject it.
