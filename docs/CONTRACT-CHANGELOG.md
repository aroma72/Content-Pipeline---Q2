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
