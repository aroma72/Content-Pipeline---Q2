---
type: reference
last_verified: 2026-10-20
owner: Aroma Tahir
---

# Course API — contract changelog

One entry per shipped change to the surface the LMS consumes. `GET /api/v1` and `GET /health`
carry `contractVersion`; when it differs from the version you vendored, read the entries above
your copy. Each entry names the field or route, an example, the commit, and **which of the LMS's
three client files** it lands in (`content-queen-courses.ts` for courses, `content-queen-jobs.ts`
for single videos, `content-queen-client.ts` for the catalogue) — the LMS asked for exactly that
on 2026-09-21 after learning of ten new fields by reading our repository.

Frozen copies: `docs/contracts/course-api-<version>.md`.

---

## 1.4, additive — 2026-10-20 — script-first single videos: context, $0 edits, scoped revise, create options

Reply: `docs/integration-requests/2026-10-20-content-queen-1.4-reply.md`. `contractVersion` is `1.4`.
Every new ability is **off by default** (`MAKE_VIDEO_CONTEXT`, `MAKE_VIDEO_SCRIPT_EDIT`,
`MAKE_VIDEO_SCRIPT_REVISE`) and advertised as `makeVideo` on `/health`, `GET /api/v1` and every job;
using one with its switch off is `400 capability_disabled`, never a silent no-op. All of it lands in
`content-queen-jobs.ts`.

| Change | Where | Example | Commit | LMS file |
|---|---|---|---|---|
| `context: { sources: [ {name, kind, text, truncated} ] }` — up to 5 sources / 120k chars, fed to research and script as fenced source material | `POST /demo/make-video` | `413 context_too_large {limitChars, gotChars}`, `400 bad_context` | this release | create body; `context` echoed on the job as names and sizes |
| `options: { style, lengthMinutes 1–6, voiceover, purpose lesson\|explainer\|marketing\|announcement }` | `POST /demo/make-video` | `400 bad_options {field}`; echoed as `options` | this release | create form |
| `script.estSeconds {id: s}`, `script.estTotalSeconds` — pre-TTS estimate | `GET /demo/make-video/:jobId` | `"estSeconds":{"01":4.9,"03":0}` | this release | script gate ("≈") |
| `script.estimateUsd` — the MEDIA bill (art, speech, animation at the 5 s floor) for one clean produce pass, priced from the beats (`estimateSpend`); `produce.spendUsd` also counts model calls of any produce-time redraft (reply-3); `null` if it cannot be made; `makeVideo.estimateUsd: true` | `GET /demo/make-video/:jobId` | `"estimateUsd":0.78` | 2026-10-21 | the produce button's figure (was a flat $2.50 on the LMS) |
| `POST …/script/edit {sha, by, edits:[{id, vo?, cap?, overlay?, info:{data}?, quiz?, holdAfter?}]}` — $0, synchronous | new route (owner) | `200 {scriptSha, script}`; `409 sha_mismatch {currentSha}`, `409 not_editable`, `422 check_failed {check, beatId, findings[]}`, `422 bad_edit` | this release | frame editor |
| `POST …/script/revise {sha, by, why?, beats?:[{id, why}]}` — whole script or named beats, 5 per job | new route (owner) | `202 {status:"revising", round, revisionsLeft, scope}`; `409 revision_cap`, `409 sha_mismatch`, `422 unknown_beat`, `400 no_notes` | this release | revise button |
| `revising` status; `script.humanRevisions`, `script.revisions[] {round, by, ids, fromSha, toSha, spentUsd}`, `script.lastRevise`, `script.edits[]` | job | `written → revising → written`; a restart or failure returns to `written` with `lastError.stage:"revise"` | this release | poll mirror, status map |
| `scriptSha` on produce | `POST …/produce` | `409 sha_mismatch {currentSha}` — nothing reserved | this release | produce call |
| `makeVideo` capabilities block | `/health`, `GET /api/v1`, every job | see the reply, §6 | this release | feature flags |
| A body over the route limit is JSON `413 payload_too_large`; bad JSON is `400 bad_json` | all routes (make-video takes 1 MB, others 32 kb) | — | this release | error handling |
| Beat cap 22 → 40 (`lengthMinutes` up to 6) | writer schema | — | this release | none |

---

## 1.3, clarification — 2026-10-20 — a failed redo returns to review; `reviewedSha256` always present

No version change; `contractVersion` stays `1.3`. Prompted by the first production scene redo
(2026-10-19), which failed in the last step and left the lesson `failed`, its course held, and the
reviewer with no `reviewedSha256` to approve against.

| Change | Where | Example | Commit | LMS file |
|---|---|---|---|---|
| A failed redo ends `blocked` at `review` with the **same** `reviewedSha256`, not `failed` | `GET /courses/:courseId` items | `"status":"blocked","blockedBy":"review","reviewedSha256":"7257…","redoRound":1,"redosLeft":2` and no `redoBeats`/`redoWhy` | this release | poll mirror: do not offer Retry/Skip; the review screen's Approve, redo and Reject all still apply |
| `redoFailed` | items while `blocked` at review | `{"round":1,"beats":["02"],"firstLine":"pthread_create failed: Resource temporarily unavailable…","error":"…","runId":"…","at":"…"}` | this release | `KNOWN_COURSE_ITEM_FIELDS`; show `firstLine` next to the review panel |
| `reason` on such a lesson says it in words | same | `"The redo of scene(s) 02 (round 1) failed before a new video was made: … The video you reviewed is unchanged …"` | this release | already mirrored |
| `reviewedSha256` is present for every lesson blocked at review, including when the file has already moved to Drive | same | — | this release | none; it was a defect (the fingerprint was taken after the offload) |
| A redo judges and re-buys **only the flagged scenes**; an unflagged image is never re-judged | behaviour | — | this release | none |

---

## 1.3, additive — 2026-10-15 — scene redo, cancel, and a build that can be stopped

Reply: `docs/integration-requests/2026-10-15-scene-redo-and-cancel.md`. Frozen copy:
`docs/contracts/course-api-v1.3.md`. `contractVersion` is `1.3`.

**New: a third decision at video review, and a lesson-level cancel.** At `review` a reviewer could
publish or reject, and reject stopped the course (1.1 §3). Now they can send ONE OR MORE SCENES
back with notes: only those beats change (their art, motion, caption or spoken line), everything
else is kept frame for frame, and the lesson pauses at review again — cents and minutes, not $1.50
and an hour. Separately, `cancel` drops one lesson without touching its siblings, and a build in
flight can now actually be stopped. **Both verbs are off by default** (`COURSE_VIDEO_REDO`); with the
switch off `video/revise` answers `409 not_enabled` and nothing else changes.

| Change | Where | Example | Commit | LMS file |
|---|---|---|---|---|
| `POST …/lessons/:lessonId/video/revise` `{why, beats?, spans?, by, fullRebuild?}` | new route (token) | `{"why":"the shop is a bank","beats":["07"],"spans":[{"fromSec":80,"toSec":95}],"by":"instructor"}` → `202 {"revising":"…","round":1,"redosLeft":2,"beats":["07","08"],"mappedFromSpans":[…],"reservedUsd":0.75}` | this release | `content-queen-courses.ts` (`reviseLessonVideo`), the review screen |
| `409 cannot_revise_video` with `reason` | same route | `not_enabled`, `not_at_review`, `building`, `already_published`, `no_notes`, `no_beats`, `unknown_beat`, `bad_span`, `no_script`, `no_residue`, `redo_cap`; `402 tenant_budget_exhausted` | this release | error handling |
| `POST …/lessons/:lessonId/cancel` `{why, by}` | new route (token) | `202 {"cancelled":"…","aborting":false}`; `200 {"alreadyFailed":true}` on repeat; `409 cannot_cancel` (`already_published`) | this release | `content-queen-courses.ts` (`cancelLesson`) |
| `redoRound`, `redoBeats[]`, `redoWhy` | `GET /courses/:courseId` items, once a redo happened | `"redoRound":1,"redoBeats":["07"]` | this release | `KNOWN_COURSE_ITEM_FIELDS`, poll mirror |
| `redosLeft`, `residueAvailable` | items while `blocked` | `"redosLeft":3,"residueAvailable":true` — false means a redo would be a full rebuild (`fullRebuild:true`) | this release | review screen (show the button only when true) |
| `cancelled`, `cancelledBy`, `cancelledAt` | items that are `failed` because of a cancel | `"cancelled":true,"cancelledBy":"instructor"` | this release | poll mirror; hide the row |
| `reviewedSha256` changes on every redo | items while `blocked` at review | — | this release | **re-archive** on change: a rebuilt video is a new file |
| `videoRedo {enabled, maxRounds, reserveUsd}` | `GET /api/v1` | `{"enabled":true,"maxRounds":3,"reserveUsd":0.75}` | this release | feature flag |
| Reject on a lesson that is **building** stops the build (it used to race it and lose) | `POST …/reject` | — | this release | none |
| Drive copy of a redone lesson is a new file `…_final.r<round>.mp4`; the previous one is kept unless `GDRIVE_TRASH_SUPERSEDED=1` | offload | — | this release | none (the LMS keeps its own copy) |

**Money.** The lesson's $2.50 reservation settled when it blocked at review. A redo takes its own
hold of `PIPELINE_COURSE_LESSON_REDO_RESERVE_USD` (default $0.75) and settles at what it bought —
a 2-beat redo measured $0.45–0.65. It does **not** count against the 5 script revisions; its own cap
is `PIPELINE_MAX_VIDEO_REDOS` (3). `spendUsdTotal` on the item includes every redo.

**What "everything else is kept" means.** Unchanged beats are frame-identical to the reviewed
video before one final re-encode of the bare lesson (a splice must decode through a cut; stream
copy is keyframe-bound), so the bytes differ while the pictures do not. Checkpoint times follow
`durations.json`; a re-voiced scene that changed length moves every later checkpoint, and
`GET …/checkpoints` says so through its ETag.

---

## 1.2, fix — 2026-10-12 — motion-graphics produce, Retry, draft ceiling

Reply to the LMS staging report of 2026-10-12. No field added or removed; `contractVersion` stays 1.2.

| Change | Where | Example | Commit | LMS file |
|---|---|---|---|---|
| A motion-graphics lesson now produces (it failed in `segment-all.py` with `no art/ folder`) | produce, both the course and single-video paths | — | this release | none |
| Retry on a lesson that failed **after** its script was approved resumes from that script (same sha, no re-write, no new approval), as long as the held copy is byte-identical | `POST /api/v1/courses/:courseId/lessons/:lessonId/requeue` | log: `resuming from the approved script ec3e8dedc07cf6c6` | this release | none |
| `draft-teaching` ends at 105 s as `504 {"error":"draft_failed"}` | `POST /api/v1/courses/draft-teaching` | `{"error":"draft_failed","message":"Drafting took longer than 105s. Try again."}` | this release | `content-queen-courses.ts` (keep `DRAFT_TIMEOUT_MS` ≥ 120 s) |
| `estimatedCostPerLessonUsd` is **all-in** (model + media): motion-graphics 0.5 → **2.0**. Character-arc stays 1.5 and has not yet been measured all-in | `GET /api/v1/styles`, `GET /api/v1` | `"estimatedCostPerLessonUsd": 2` | 3ef2ed3 | style picker |

**Second fix, same day** (the LMS's report #2). No field added or removed.

| Change | Where | Example | Commit | LMS file |
|---|---|---|---|---|
| Preflight now checks that Google **accepts** the media key, not just that it is set. A refused key blocks produce before anything is bought | produce → `blocked`, `blockedBy: preflight`; `GET /health/render` → 503 | `FAIL media credential -- Google refused the key (HTTP 400 …)` | this release | none (already mirrored as a block) |
| A voice clip that fell back to silence is never treated as finished; produce re-records it (was: a retry built a lesson of 0.4 s silent beats) | produce | — | this release | none |
| Videos with a music bed compile (`[narr]` was consumed twice in the mix graph). Course lessons and single videos use the same mixer | produce | — | this release | none |
| `lfOptions` beats fit the frame: a long option and its "Their choice" marker wrap instead of running off; at most 4 options | motion-graphics renderer; script check `qa-info` | — | this release | none |

---

## 1.2, additive — 2026-10-08 — video styles

Reply: `docs/integration-requests/2026-10-08-video-styles.md`.

**New: the instructor chooses a video style as the first step of creating a course.** Two styles:
`character-arc` (the original Ali story style, the default) and `motion-graphics` (flat motion
graphics, named models and walk-throughs, spoken to "you"). Sending no `style` changes nothing.

| Change | Where | Example | Commit | LMS file |
|---|---|---|---|---|
| `GET /api/v1/styles` (public) | new route | `{"default":"character-arc","styles":[{"id":"motion-graphics","label":"Flat Motion Graphics","previewUrl":"…/api/v1/styles/motion-graphics/preview.mp4","previewSeconds":12,…}]}` | this release | `content-queen-client.ts` + the new style-picker screen |
| `styles[].writingStyle` | `GET /api/v1/styles`, `GET /api/v1` | `{"narrator":"A calm, composed woman speaks straight to the learner as \"you\"…","voice":"…","rules":[…],"sample":[{"line":"You are a P&C Buddy…","read":"with a warm, welcoming smile"}]}` | this release | style picker ("How the script sounds") |
| `POST /api/v1/courses/draft-teaching` (token) | new route | `{ "topic": "…", "lessons": [{ "title": "…", "slo": "…" }] }` → `{ "style": "motion-graphics", "slos": [{ "id": "1.1", "text": "…" }], "lessons": [{ "index": 0, "title": "…", "sloIds": ["1.1"], "models": [{ "name": "SCARF", "author": "David Rock", "summary": "…" }], "walkthroughs": [{ "title": "…", "situation": "…" }, …] }] }` — drafts the motion-graphics teaching for lessons the instructor already wrote; one model call | this release | `content-queen-courses.ts`, course builder ("Draft with AI") |
| `GET /api/v1/styles/:styleId/preview.mp4` (public, Range) | new route | 12-second sample, 206 on a Range request | this release | style picker `<video>` |
| `styles[]` | `GET /api/v1` | same array as above | this release | `content-queen-client.ts` |
| `style` (request) | `POST /api/v1/courses/plan`, `/courses/build`, `/demo/make-video` | `"style": "motion-graphics"`; 400 `invalid_style` if unknown | this release | `content-queen-courses.ts`, `content-queen-jobs.ts` |
| `style`, `slos[]`; per lesson `sloIds[]`, `models[]`, `walkthroughs[]` | plan response (motion-graphics) | `"models":[{"name":"SCARF","author":"David Rock","summary":"…"}]` | this release | plan editor |
| `invalid_plan` on missing `models`/`walkthroughs` | `POST /api/v1/courses/build` (motion-graphics) | `{"path":"modules[0].lessons[1].walkthroughs",…}` | this release | plan editor validation |
| `style` (response) | `GET /api/v1/courses/:courseId` (top level + every item), `GET /demo/make-video/:jobId` | `"style": "motion-graphics"` (older items: `"character-arc"`) | this release | `content-queen-courses.ts`, `content-queen-jobs.ts` |

## 1.2, additive — 2026-10-05

Reply: `docs/integration-requests/2026-10-05-produce-outcome-fields.md`. Why: `SERVICE_DURABILITY_AND_CONTRACTS.md` §6.1a.

**Behaviour change on the single-video route, all additive fields.** A produce run that stops
*after* making the video is no longer put back to `written`: it becomes `awaiting_review` (a
check wants a person) or `interrupted` (the run died; resumable at $0). The ledger is settled at
the run's real spend. `written` + `lastError` now means what the LMS always read it as: nothing was
made and nothing was bought.

| Change | Where | Example | Commit | LMS file |
|---|---|---|---|---|
| `deliverableAvailable` | `GET /demo/make-video/:jobId` | `"deliverableAvailable": true` — a video exists on disk or Drive, read like the course field | this release | `content-queen-jobs.ts`, `content-video-poll.ts` (decides "nothing was bought") |
| `lastError.kind`, `.code`, `.spentUsd`, `.deliverableAvailable` | same, on any stopped produce | `{"kind":"blocked","code":"post-render-check","spentUsd":1.6,"deliverableAvailable":true}` | this release | `content-queen-jobs.ts` type; page banner |
| `produce.warnings[]`, `produce.blocked` | same, `status === awaiting_review` | `[{"sensor":"eval-text.js","what":"grammar and clarity","findings":"…"}]` — findings carried to review instead of blocking after the spend | this release | review panel |
| `script.scriptSha`, `script.unresolvedChecks[]` | same, from `written` | `"scriptSha": "968c5daac28395bf"` — the five free script checks now run before `written`, and produce approves this sha | this release | allowlist only |
| `status: interrupted` after a post-render failure | same | was `written`; `/produce` already accepts `interrupted` and re-runs at $0 | this release | status mapping |

**Same day, second fix — a finished lesson is fetchable wherever we hold it.** Reply:
`docs/integration-requests/2026-10-05-produce-outcome-fields.md` Part 2. A course lesson that reached
`review` was offloaded to TU's Drive within minutes; `deliverableAvailable` then read `false` and
`GET .../file` answered a JSON record instead of bytes, so the LMS said the lesson "stopped before it
was made". The contract wording ("`deliverableAvailable` means `GET .../file` will serve bytes right
now") was right; the service had stopped honouring it. Restored:

| Change | Where | Example | Commit | LMS file |
|---|---|---|---|---|
| **`GET .../lessons/:lessonId/file` streams the mp4 from Drive** when our copy is gone | course `/file`; also `GET /demo/make-video/:jobId/video`, `GET /demo/videos/:slug/file` | `200`/`206` `video/mp4`, full `Range`, `X-Served-From: drive` or `volume`. Same bytes, same md5 | this release | none — this is what `openLessonFile` already expects |
| The Drive record is now **opt-in** | same routes | `Accept: application/json` or `?format=json` → `{saved2drive, driveFileId, driveUrl, md5, verified, video{}, status, blockedBy}` (the previous default body) | this release | none unless you special-cased a 200 JSON from `/file` — remove that |
| `503 drive_unavailable` | same routes | `{"error":"drive_unavailable","driveStatus":403, …record…}` — the video exists on Drive but could not be fetched now. Retry; not a `404` | this release | archive worker: retry, not terminal |
| `items[].deliverableAvailable` is **local OR Drive** | `GET /courses/:courseId` | `true` for an offloaded lesson, because `/file` serves it | this release | none (`content-course-poll.ts` already archives on `true`) |
| `items[].videoLocal` | same | `false` once offloaded; the old meaning of the field above | this release | allowlist only |
| `saved2drive`, `driveFileId`, `driveUrl`, `driveSavedAt` also read from the volume record | same | present for lessons the backfill offloaded, which the queue flag had missed | this release | allowlist only |
| `videoLocal` | `GET /demo/make-video/:jobId` | same meaning as the course field | this release | allowlist only |
| `404 no_deliverable.renderExists` is `true` for `blockedBy: review` | course `/file` | the message no longer says a review-blocked lesson "never rendered" | this release | none |

Unchanged: `deliverableOnServer` on `GET /api/v1/videos` still means "on this container's render
directory" and is documented as not meaning the video was never made.

---

## 1.2 — 2026-09-24

Reply: `docs/integration-requests/2026-09-24-script-approval-reply.md`. Frozen: `docs/contracts/course-api-v1.2.md`.

**Behaviour change, not only additions.** Every course lesson now pauses BEFORE any media spend,
at `blockedBy: "script-approval"`, until a person approves its script. A client that does not call
the new approve route will see its course stall at lesson one after ~2 minutes. Everything else here
is additive.

| Change | Where | Example | Commit | LMS file |
|---|---|---|---|---|
| `contractVersion` | `GET /api/v1`, `GET /health` | `"contractVersion": "1.2"` | this release | `content-queen-courses.ts` `checkSpendReadiness()` |
| **`blockedBy: "script-approval"`** | `GET /courses/:courseId`, closed set on `GET /api/v1` | 11th value. A lesson stopped here has spent cents of model calls and **no media**. | this release | `content-queen-courses.ts` blocker branch; build page banner |
| **`GET /api/v1/courses/:courseId/lessons/:lessonId/script`** | new route | beats (`vo` spoken, `cap`/`overlay`/`info` on screen), the checkpoint, `gate`, and `sha` naming the draft | this release | `content-queen-courses.ts` (new `fetchLessonScript`) |
| **`GET .../lessons/:lessonId/script.md`** | new route | the same script as `text/markdown` for a person to read | this release | same; link or render |
| **`POST .../lessons/:lessonId/script/approve`** | new route | `{"by","sha"}` → `202`. **`sha` required** and re-checked before the spend. `409 cannot_approve_script` otherwise. $0; the build starts after it. | this release | `actOnLesson` (new verb) |
| **`POST .../lessons/:lessonId/script/revise`** | new route | `{"why","by"}` → `202 {round, revisionsLeft}`. Rewrites from notes, re-gates, pauses again. Cents, no media. Capped at 5. | this release | `actOnLesson` (new verb) |
| `items[].scriptAvailable`, `items[].scriptSha` | `GET /courses/:courseId` | `"scriptAvailable": true, "scriptSha": "952c084d6e16bcdb"` — a fact off the volume, like `deliverableAvailable` | this release | `CourseLessonState`, allowlist |
| `items[].scriptApprovedBy`, `scriptApprovedAt`, `scriptRevisions` | `GET /courses/:courseId` | who released the script and how many times it went back | this release | allowlist only |
| `400 invalid_plan` | `POST /courses/build` | `{errors:[{path:"modules[0].lessons[2].slo", message}]}` — the plan is meant to be EDITED, so build now checks the fields it builds from (lesson `title`/`slo`/`brief`, module `title`, course `title`) before reserving anything | this release | `buildCourse` refusal handling |
| reservation held across the script pause | `POST /courses/build` ledger | the $2.50/lesson reservation is **not** settled when a lesson stops to be read; it is held until the lesson ends, is rejected, or is skipped | this release | none (already reconciles on terminal states) |

**Unchanged, stated for the avoidance of doubt:** `reject` still fails the lesson and stops its
course — `revise` is the new soft path and only exists at the script gate. `review`, `approve`,
`skip`, `requeue`, `resume`, the file routes and the $2.50 per-lesson reservation are all as in 1.1.
`deliverableAvailable` is `false` for a lesson awaiting script approval, which is correct: there is
no video and will not be one until it is approved.

---

## 1.1 — 2026-09-23

Reply: `docs/integration-requests/2026-09-23-course-worker-reply.md`. Why: `SERVICE_DURABILITY_AND_CONTRACTS.md` §3.6.

| Change | Where | Example | Commit | LMS file |
|---|---|---|---|---|
| `contractVersion` | `GET /api/v1`, `GET /health` | `"contractVersion": "1.1"` | this release | `content-queen-courses.ts` `checkSpendReadiness()` |
| `worker.running`, `worker.needsResume`, `worker.eligibleAcrossAllCourses`, `worker.buildingCourseId` | `GET /courses/:courseId` | `"worker": {"building": null, "queuedAcrossAllCourses": 3, "running": false, "needsResume": true, "eligibleAcrossAllCourses": 1, "buildingCourseId": null, "held": null}` | `33a2aef` | `content-queen-courses.ts` (`CourseState.worker`, allowlist, mapper); poll decider |
| `worker.held` | `GET /courses/:courseId` | `"held": {"by": "evals-and-harness/why-a-good-demo-isn-t-enough", "status": "failed", "since": "2026-09-22T20:53:33.000Z"}` — what holds **this** course, or `null` | `33a2aef` | same; build page banner |
| `items[].queuePosition` | `GET /courses/:courseId`, `status === queued` only | `"queuePosition": 1` — 1-based among lessons the worker may take; `null` behind the course's own hold | `33a2aef` | `CourseLessonState`, `LessonStatusPatch` |
| explicit `spendUsd: 0`, `spendUsdTotal: 0` | `GET /courses/:courseId`, `status === failed` with no `runId` | a lesson stopped or rejected before it ran now says $0 instead of omitting the field | `33a2aef` | `reconcileLessonSpend` (no change needed; absent still means unknown) |
| `items[].tenantId` | `GET /courses/:courseId`, when present | `"tenantId": "cohort2-lms"` — absent on lessons built before 1.1 | `d4a7811` | allowlist only |
| `stopped[]` on reject | `POST .../lessons/:id/reject` `202` | `{"rejected": "...", "stopped": ["<series>/<sibling>"], "note": "..."}` | `b8a8122` | `actOnLesson` reject branch |
| reject semantics | `POST .../lessons/:id/reject` | the rejected course's **queued** siblings become `failed` with `error: "stopped with the course: <id> was rejected"` and `stoppedWithCourse: "<id>"`, at $0 (reservations released); **other courses continue** | `b8a8122` | poll terminal rule (§Phase 2 of the LMS plan) |
| **`POST /api/v1/courses/:courseId/lessons/:lessonId/skip`** | new route | `{"by": "name"}` → `202 {"skipped": "...", "by": "...", "note": "..."}`; `409 cannot_skip` unless `failed`. Status stays `failed`, `skipped: true`; the course continues. $0. | `b8a8122` | `actOnLesson` (new verb), build page |
| **`POST /api/v1/courses/worker/resume`** | new route | `{"by": "name"}` → `202 {"resumed": true, "eligible": 1, "running": false, "held": [...]}`. Starts the worker after a restart; builds only lessons whose course is not held. $0 beyond what a build already reserved. | `b8a8122` | operator only; not for the poll worker |
| `/health.courses.worker` | `GET /health` | `{"running": false, "building": false, "eligible": 1, "needsResume": true, "heldCourses": 2}` — counts, no ids | `33a2aef` | `checkSpendReadiness()` |
| courses on the tenant ledger | `POST /courses/build` | reserves `$2.50` per lesson (one ref each) **before** queueing; `402 tenant_budget_exhausted` with `remainingUsd`, `perLessonUsd`, nothing queued or reserved; `503 ledger_unavailable` if the store cannot record spend | `d4a7811` | `buildCourse` refusal handling (already treats 402/503 as free) |
| `/demo/spend.courses` | `GET /demo/spend` | `{"lessons": 2, "reservedUsd": 5, "spentUsd": 0, "perLessonUsd": null, "note": "..."}`; `perLessonUsd` is `{p50, p90, n}` once three lessons are `done` | `d4a7811` | anywhere `/demo/spend` is read |
| tenant guard | approve / reject / skip / requeue | a lesson another tenant paid for → `409 cannot_*` "belongs to another tenant"; lessons without `tenantId` (pre-1.1) unaffected | `d4a7811` | none (the LMS already scopes its own reads) |
| `auto_repaired` intervention | run log / lesson artefacts | a dead `overlay` is dropped and a caption borrowed from `vo` before validation; recorded per repair | `944721f` | none |

### 1.1, later on 2026-09-23 — clarifications, no shape change

Reply: `docs/integration-requests/2026-09-23-resume-run-and-two-fixes-reply.md`.

| Change | Where | Meaning | LMS file |
|---|---|---|---|
| `worker.held` / `/health.heldCourses` count only courses with a **queued** lesson behind the hold | `GET /courses/:courseId`, `GET /health` | a course whose rejected or failed lesson has no queued sibling is *stopped*, not held: `held` is `null`, and it is not counted. The v1.1 text already read `null` as "nothing is held back". | banner falls through to lesson statuses; no change needed |
| `requeue` refuses a `stoppedWithCourse` lesson | `POST .../lessons/:id/requeue` | `409 cannot_requeue`: a sibling failed at $0 by a reject never ran and is not retried one lesson at a time. Mirrors the LMS's own `course_stopped`. | `actOnLesson` requeue branch: pass the message through |
| a clean boot resumes the worker by itself | boot | after `restore()`, if no lesson was interrupted and the previous boot was more than 15 min ago (`COURSE_AUTO_RESUME_COOLDOWN_MS`) and `COURSE_AUTO_RESUME` is not `0`, the worker resumes. Otherwise it waits and the log says why. `needsResume: true` after a deploy should now be rare. | none |
| `skip` and `reject` are $0 by construction | contract text | stated, so a consumer can keep them off its spend kill-switch | none |

**Unchanged, stated for the avoidance of doubt:** status set `queued | claimed | blocked | done | failed`; the `blockedBy` set; `409` for every refusal on the lesson verbs; `reject` precondition "anything not `done`"; `requeue` still `failed` only and still paid; polling model (no course callbacks).

## 1.0 — 2026-09-22

The surface described in `docs/integration-requests/2026-09-22-content-automation-api-reference.md`.
