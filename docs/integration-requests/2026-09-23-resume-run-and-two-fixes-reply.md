---
type: reference
last_verified: 2026-09-23
owner: Aroma Tahir
---

# Both things you saw were real; here is what changed, and where the resume stands

**To:** the Cohort 2 LMS team (Abdulrehman Siddiqi / Nazim)
**From:** Content Automation — Drawing Room / Content Queen
**Re:** `2026-09-23-contract-1-1-is-live-and-we-read-it.md`
**Date:** 2026-09-23

---

## 0 · The resume ran, and we interrupted it. That one is ours.

Thank you for the authorisation. Preconditions held (`eligible: 1`, `needsResume: true`,
`/health/render` 200, no `building` line) and the resume went through at **06:08:16Z**:

```
[course-worker] resume by authorised by LMS memo 2026-09-23: 1 eligible, 2 course(s) held
[course-worker] building lms-e2e-2026-09-23/where-the-error-actually-happened (run 20260923T060816-…)
```

At **06:11:58Z** a redeploy of ours restarted the container, three and a half minutes into that build,
while `/health` was plainly saying `building: true`. The next boot logged `1 interrupted mid-build`
and parked your lesson as **`blocked`, `blockedBy: "interrupted"`**. It was inside research/script, so
no art or speech had been bought; the model spend of those minutes is not recorded on the item (the
run died before it could settle — unknown, not zero). The full log trail is in
`docs/integration-requests/evidence/2026-09-23-lms-e2e-resume.md`.

Your lesson is therefore back with you, one state further along than it was: **approve** rebuilds it
from the start (your authorisation again, ~$1.50–4), **reject** stops it. We are not going to press
either button. If you would rather we simply re-run it on your standing authorisation, say so and we
will, with nothing deploying until it has ended — `scripts/predeploy-check.js` now refuses a deploy
while a lesson is building, and the deploy rule carries it.

## 1 · A stopped course is not a held course

You were right, and `course-mub7whoa` was the exact case. Both rules fired as written and produced a
`held` nobody could release. The fix is to the definition, not the rules: a course is **held** only
while at least one of its lessons is `queued` behind the lesson that needs a person. A course whose
every lesson is terminal or waiting on approval has nothing being kept from building — it is stopped.

What you will see after the deploy: `worker.held` is `null` for `course-mub7whoa`, and
`/health.courses.worker.heldCourses` drops to the courses with work actually waiting. The frozen
v1.1 text already defines `null` as "nothing is held back", so this is a clarification, logged in
`docs/CONTRACT-CHANGELOG.md` under 1.1 with no version bump. The scheduler is unchanged: it only ever
filtered queued lessons, and a course with none had nothing to filter.

One more thing, because you found the same trap on your side: `requeue` now refuses a sibling that
was failed at $0 by a reject (`stoppedWithCourse`). Your `course_stopped` and our refusal now agree.

## 2 · A clean boot resumes itself

You asked whether we had intended the quiet version. We had not thought it through, and your reading
of the boot line is correct. From this deploy:

- restore() still starts nothing — that test is untouched;
- after it, `bootDecision()` looks at three facts: were any lessons interrupted mid-build, did the
  previous boot happen inside the last 15 minutes (`boot.json` on the volume), and is
  `COURSE_AUTO_RESUME` set to `0`. Any of those means wait, and the log says which. Otherwise the boot
  is clean and the worker resumes on its own;
- `POST /courses/worker/resume` remains for the boots that did not, and for you.

Why that is safe against the case the rule existed for: a crash *during* a build leaves a `claimed`
lesson, which restore() parks as `interrupted`, which stops the resume. A crash *outside* a build
restarts within the cooldown. Railway's three retries all land inside one window. The worst case is one
build attempt per fifteen minutes, whose lesson then becomes interrupted and stops the next.

So `needsResume: true` should now be rare, and when you see it there is a reason in our log.

## 3 · Your §4, acknowledged

`skip` and `reject` off your spend switch is right, and we should have said in the contract that both
are $0 by construction; the changelog now does. The retry-route guard you added is the mirror of ours.

## 4 · Still ours

The tenant. `TENANTS_JSON` with `cohort2-lms`, a `maxRunUsd`, and a rotated token need Aroma's hands;
the runbook is in `docs/DEPLOYMENT_PREREQS.md`. Nothing you have shipped depends on it, as you say —
but the first lesson that reaches `done` under your own tenant is the run that closes this whole
thread, and we would like to get there.

---

*Tests: `test-regressions.js` §11 (stopped vs held, requeue refusal, `bootDecision` table, boot marker,
index.js wiring) and `test-server.js` (course view `held: null`, `/health.heldCourses`). `npm test`:
230 + 46 + 34.*
