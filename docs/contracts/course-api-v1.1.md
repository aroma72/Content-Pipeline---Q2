---
type: reference
last_verified: 2026-09-23
owner: Aroma Tahir
---

# Course API contract — v1.1 (frozen 2026-09-23)

**This file does not change.** It is the copy the LMS vendors and pins tests to. Later versions are
new files beside it; `docs/CONTRACT-CHANGELOG.md` says what each added. `GET /api/v1` and
`GET /health` carry `contractVersion`; compare it with the version in this filename.

Base: `https://content-queen-production.up.railway.app`. Auth: `Authorization: Bearer <token>`.
Everything not stated here is as in `docs/integration-requests/2026-09-22-content-automation-api-reference.md`
(v1.0), which remains the prose reference.

---

## 1. Lesson (queue item) status — closed set, unchanged

`queued → claimed → done | failed | blocked`. `blocked` carries `blockedBy` from the set served on
`GET /api/v1`. **A `failed` lesson may additionally carry `skipped: true`** (see §4) and/or
`stoppedWithCourse: "<lessonId>"` (see §3); its status is still `failed`.

## 2. `GET /api/v1/courses/:courseId`

```json
{
  "courseId": "course-xxxxxxxx",
  "lessons": 3, "done": 0, "failed": 1, "blocked": 0, "inProgress": 2,
  "spentUsd": 0,
  "awaitingApproval": [],
  "worker": {
    "building": null,
    "queuedAcrossAllCourses": 3,
    "running": false,
    "buildingCourseId": null,
    "eligibleAcrossAllCourses": 1,
    "needsResume": true,
    "held": { "by": "series/lesson-one", "status": "failed", "since": "2026-09-22T20:53:33.000Z" }
  },
  "items": [
    { "id": "series/lesson-one", "topic": "…", "status": "failed", "module": 1, "runId": "…",
      "tenantId": "cohort2-lms", "error": "…", "spendUsd": 0.61, "spendUsdTotal": 0.61 },
    { "id": "series/lesson-two", "topic": "…", "status": "queued", "module": 1, "tenantId": "cohort2-lms",
      "queuePosition": null }
  ]
}
```

### `worker`

| field | type | meaning |
|---|---|---|
| `building` | object \| null | the lesson being built right now (`{id, topic, startedAt}`), any course. **Null for idle AND for waiting** — read the next fields. |
| `queuedAcrossAllCourses` | int | every `queued` course lesson on the service |
| `running` | bool | the worker loop is active |
| `buildingCourseId` | string \| null | the course of `building`, so you can tell "building mine" from "building someone else's" |
| `eligibleAcrossAllCourses` | int | queued lessons the worker **may** take: not behind a held course, or released by a person |
| `needsResume` | bool | `!running && eligible > 0`. Work is waiting and nobody is building — the normal state after our redeploy, because boot starts nothing. Cleared by `POST /courses/worker/resume`, a build, an approve or a requeue. |
| `held` | object \| null | what holds **this** course: `by` (lesson id), `status` (`blocked` or `failed`), `since`. `null` means this course is not held. A held course's queued lessons will not build until a person acts on `by` (approve / reject / skip / requeue). |

### `items[]` additions

| field | when | meaning |
|---|---|---|
| `queuePosition` | `status === "queued"` | 1-based position among eligible lessons, all courses; `null` when the lesson is behind its own course's hold |
| `tenantId` | when recorded | the tenant that paid; absent on lessons built before v1.1 |
| `spendUsd`, `spendUsdTotal` = `0` | `status === "failed"` with no `runId` | explicit zero for a lesson that never ran (stopped with its course, or rejected while queued). Absent still means unknown. |
| `stoppedWithCourse` | `failed` sibling of a rejected lesson | the lesson whose rejection stopped it; `error` reads `stopped with the course: <id> was rejected` |
| `skipped`, `skippedBy`, `skippedAt` | after `skip` | see §4 |

## 3. `POST /api/v1/courses/:courseId/lessons/:lessonId/reject` — semantics

Body `{"why": "…"}`. Precondition: anything not `done`. `202`:

```json
{ "rejected": "series/lesson-one", "stopped": ["series/lesson-two"], "note": "…" }
```

The rejected lesson is `failed`. **Its course stops:** every `queued` sibling is `failed` too, at $0,
with `stoppedWithCourse`. Any ledger reservation for a lesson that never ran is released.
**Other courses continue** — the worker is kicked. `blocked` siblings are untouched.

## 4. `POST /api/v1/courses/:courseId/lessons/:lessonId/skip` — new

Body `{"by": "name"}`. Precondition: `status === "failed"` and not already skipped.
`202 {"skipped": "<id>", "by": "…", "note": "…"}` · `409 {"error": "cannot_skip", "message": "…"}`.

The lesson stays `failed`, gains `skipped: true`, `skippedBy`, `skippedAt`, and **no longer holds
its course**; the next lesson builds. **Costs $0.** Nothing is rebuilt. The paid alternative is
`requeue` (unchanged: `failed` only, a full new render).

## 5. `POST /api/v1/courses/worker/resume` — new

Body `{"by": "name"}` (defaults to your tenant id). Always `202`:

```json
{ "resumed": true, "by": "…", "eligible": 1, "running": false,
  "held": [ { "courseId": "course-…", "by": "series/lesson", "status": "failed", "since": "…" } ],
  "note": "…" }
```

Starts the worker. Builds only eligible lessons, one at a time; a held course is never touched.
Spends nothing a build did not already reserve. Idempotent; safe to call after every deploy of ours.
Intended for an operator or a human-triggered action, not for a poll loop.

## 6. Money

- `POST /api/v1/courses/build` reserves **$2.50 per lesson** on your tenant ledger before queueing,
  one reservation per lesson. If the course does not fit your `monthlyUsd`:
  `402 {"error": "tenant_budget_exhausted", "message", "monthlyUsd", "spentUsd", "remainingUsd",
  "resetsAt", "lessons", "perLessonUsd", "note": "Nothing was queued and nothing was reserved."}`.
  `503 ledger_unavailable` if we cannot record spend. Both are free; do not retry on a 402.
- Each lesson settles at its `spendUsdTotal` when it ends (`done`, `failed`, `blocked`); a lesson
  rejected or stopped before it ran is released. A lesson's media budget is
  `min(service ceiling, your tenant's maxRunUsd)`.
- `GET /demo/spend` now includes:
  ```json
  "courses": { "lessons": 2, "reservedUsd": 5, "spentUsd": 0,
               "perLessonUsd": null, "note": "…" }
  ```
  `perLessonUsd` becomes `{ "p50", "p90", "n" }` once three course lessons are `done`. **Course lessons
  built before v1.1 were never reserved and appear only as `spendUsdTotal` on the course view.**
- Settle your ledger against `spendUsdTotal`. An explicit `0` means known-zero; an absent field means unknown.

## 7. Tenancy

approve / reject / skip / requeue refuse a lesson another tenant paid for with the same
`409 cannot_*` shape (`message` says "belongs to another tenant"). Lessons without `tenantId`
(built before v1.1) are not guarded. Your own lessons are unaffected.

## 8. `GET /health` additions

```json
"contractVersion": "1.1",
"courses": { "durability": "volume", "queueFile": "…", "durableSince": "…", "awaitingApproval": 0,
             "worker": { "running": false, "building": false, "eligible": 1, "needsResume": true, "heldCourses": 2 } }
```

Counts only; no lesson ids on the unauthenticated route.

## 9. What to do with each state, in one table

| you see | it means | do |
|---|---|---|
| `worker.held !== null` on your course | a lesson of yours needs a person | approve / reject / **skip** ($0) / requeue ($) on `held.by` |
| `worker.held === null`, your lesson `queued`, `queuePosition` a number | you are in line | wait; position falls as others finish |
| `worker.needsResume === true` | nothing is building and something could | call `/courses/worker/resume` once, or tell us |
| `worker.buildingCourseId !== yours` | the worker is on another course | wait; one lesson at a time |
| a `failed` item with `stoppedWithCourse` | its course was rejected | terminal on our side; $0 |
| a `failed` item with `skipped: true` | a person dropped it | terminal; the course went on without it |
