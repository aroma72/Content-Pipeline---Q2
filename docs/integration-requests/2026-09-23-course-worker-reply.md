---
type: reference
last_verified: 2026-09-23
owner: Aroma Tahir
---

# You were right, and it was worse than you said: "paused" was never a state

**To:** the Cohort 2 LMS team (Abdulrehman Siddiqi / Nazim)
**From:** Content Automation — Drawing Room / Content Queen
**Re:** `2026-09-23-a-failed-lesson-parks-every-queue.md`
**Date:** 2026-09-23

---

Your four asks are answered below, in your order. First the finding, because it changes how you
should read our API from now on.

## 1 · What "paused" actually was

`course-worker.js` `drain()` took the oldest `queued` lesson on the service, built it, and on any
outcome other than `done` logged `pausing:` and **broke out of its loop**. Nothing was written.
There was no paused flag to clear, on disk or in memory. The worker was simply idle with work in
front of it, and the only three things in the process that ever started it again were a new build,
an approve and a requeue. `reject()` wrote `failed` and returned. Boot deliberately starts nothing
(a crash loop must not spend), so our redeploy at 22:07Z restored four lessons and started none.

So your §3 guess — "if the pausing state is process-local, a restart would clear it" — was half
right. It was process-local. A restart cleared it and then nothing kicked. A restart made it worse.

Your §4 was exactly right, and it was not your reading that failed. `worker.building` came from a
variable nulled in a `finally`; `running` was computed in `status()` and dropped at the API
boundary. `null` was the same for idle and for parked because the code had no word for parked.

And one thing you could not have seen: the `$2.1557 / 2 runs` you watched on `/demo/spend` was
**our own demo run** on the shared `default` tenant. Courses never touched the ledger, so that
endpoint could not have moved for your lesson whatever happened. It was never a course signal.

## 2 · What we changed (live once deployed — `contractVersion: "1.1"` on `GET /api/v1`)

Everything additive. Fields you read today are unchanged; status codes unchanged; the status set
unchanged. Full contract: `docs/contracts/course-api-v1.1.md`; per-field changelog with the client
file each lands in: `docs/CONTRACT-CHANGELOG.md`.

**The hold is per course.** A course with a `blocked` lesson, or a `failed` one nobody has
skipped, is *held*. The worker skips a held course's lessons and carries on with every other
course. A lesson a person released (approved, requeued, told to rebuild) passes through its
course's hold. This is what the header comment in that file always said the behaviour was.

**`reject` now stops its course and releases the others.** The rejected lesson is `failed`; its
`queued` siblings are `failed` too, at $0, with `stoppedWithCourse: "<id>"` and an `error` saying
so; any reservation for a lesson that never ran is released; then the worker is kicked. We did not
do the one-line fix you offered — a bare kick after a reject would have built the *next* lesson of
the course you had just refused, because the rejected one was `failed` and its sibling was now first
in line. The hold had to exist before the kick could.

**`skip` is the free exit from `failed`.** `POST .../lessons/:id/skip` keeps the status `failed`
(we know you treat the set as closed), sets `skipped: true`, and the course continues. $0.
`requeue` is unchanged and still the only thing that rebuilds.

**`resume` is the starter after a boot.** `POST /api/v1/courses/worker/resume` — `202`, idempotent,
builds only eligible lessons, spends nothing a build did not already reserve.

**You can now see it.** `worker.running`, `worker.needsResume` (`!running && eligible > 0`, the
normal state after our redeploy), `worker.eligibleAcrossAllCourses`, `worker.buildingCourseId`,
and `worker.held` — `{by, status, since}` for **your** course or `null`. Every queued item carries
`queuePosition` among lessons the worker may take (`null` behind its own course's hold). A `failed`
lesson that never ran reports `spendUsdTotal: 0` explicitly, so your hold can be reversed without a
guess. `/health.courses.worker` has the same as counts.

**Courses are on the ledger.** `POST /courses/build` reserves $2.50 per lesson before queueing, one
reservation each; `402 tenant_budget_exhausted` if it does not fit, with nothing queued. Each lesson
settles at `spendUsdTotal` when it ends. `GET /demo/spend` shows `courses: {lessons, reservedUsd,
spentUsd, perLessonUsd}`; `perLessonUsd` (p50/p90) appears once three lessons are `done`. A course
lesson's media budget is now `min(our ceiling, your tenant's maxRunUsd)`. Lessons built before this
were never reserved and remain costed only on the course view.

**Tenant on every lesson.** approve / reject / skip / requeue refuse a lesson another tenant paid
for. Your existing lessons under `default` carry no tenant and are not guarded, so nothing you hold
changes hands.

**The lesson that parked the queue would now cost less.** Both of its findings — `overlay has no
'tpl'` and `an ali beat draws art and no text` — are mechanical and are now repaired for $0 before
validation. And the spine no longer grants its lenient third draft when the failure came from a
deterministic validator; that pass bought you 47 seconds and one Opus call for a fault that fails
identically at any price.

## 3 · Your four asks

1. **Release the current pause.** Once 1.1 is deployed, `needsResume` will read `true` with
   `eligible: 1` — your lesson. **We will not call `resume` until you say so.** It builds
   `lms-e2e-2026-09-23/where-the-error-actually-happened` on the shared tenant at roughly $2–4, and
   that is your authorisation to spend, not ours. Say the word and we run it and send you the log.
2. **A free way out of `failed`.** `skip`. And `reject` now releases the worker for everyone else.
3. **Not parking globally.** Done — §2. Per-tenant *fairness* in the line is not built; courses
   pause after every lesson, so two eligible courses already alternate. We will add a round-robin
   the day either of us sees it matter.
4. **Surface it.** `worker.held` and `worker.needsResume`. You said a `pausedOn` would have saved
   you an hour; `held.by` is that field, scoped to your course so another tenant's trouble is a
   count on `/health`, not a lesson id in your payload.

## 4 · What we would ask of you

- **Stop reading `/demo/spend` as a course signal** for anything built before 1.1. From 1.1 on it is
  one, under `courses`.
- **Do not write `course.status = rejected` on our `202`.** Read the siblings back: they will be
  `failed` with `stoppedWithCourse` on your next poll, and that is the moment to terminalise and to
  reverse the $0 holds.
- **Vendor `docs/contracts/course-api-v1.1.md`** and compare `contractVersion` in
  `checkSpendReadiness()`. We will not change that file; the next one will sit beside it.
- **A tenant of your own** is still on Aroma's list (`TENANTS_JSON`, token rotation). With it,
  `/demo/spend` is yours alone and `maxRunUsd` caps your lessons.

## 5 · On being wrong twice

You read two fields and reached the wrong answer twice. The fields were built so that the wrong
answer was the natural one, and the logs that said otherwise were ours to have surfaced. We would
rather you keep sending us the inference and the evidence together, as you did — it is how this one
was found in a day.

---

*Tests for every claim above: `orchestrator/test-regressions.js` §11 and `orchestrator/test-server.js`
(hold, reject stop, human-release, skip, resume, restore + needsResume, course view, /health, ledger
reserve/refuse/release, tenant guard, repairBeats, no lenient re-run). `npm test` at the commit: 224 + 45 + 34.*
