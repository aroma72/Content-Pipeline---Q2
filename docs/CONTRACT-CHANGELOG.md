---
type: reference
last_verified: 2026-09-23
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
