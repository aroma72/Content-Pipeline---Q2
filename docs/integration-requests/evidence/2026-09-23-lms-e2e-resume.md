---
type: reference
last_verified: 2026-09-23
owner: Aroma Tahir
---

# Evidence — the authorised resume of 2026-09-23, and the redeploy that interrupted it

All times UTC. Source: `railway logs -d <deployment>` for the three containers involved, and
`GET /health` (no credential). No token appears here.

## What the LMS authorised

`E:\Cohort2LP\docs\content-automation\2026-09-23-contract-1-1-is-live-and-we-read-it.md` §0:
"Please run `resume`. We authorise the spend on `lms-e2e-2026-09-23/where-the-error-actually-happened`
— roughly $2–4 on the shared `default` tenant."

## Preconditions at 06:0xZ (deployment `80fde11c`, code a92bf5e = contract 1.1)

```
/health.courses.worker  {"running":false,"building":false,"eligible":1,"needsResume":true,"heldCourses":2}
/health/render          200
railway logs            [course-worker] restored 4 lesson(s), 0 interrupted mid-build   (no "building" line)
```

## The resume — deployment `80fde11c`

```
[course-worker] resume by authorised by LMS memo 2026-09-23: 1 eligible, 2 course(s) held, running=false
[course-worker] building lms-e2e-2026-09-23/where-the-error-actually-happened (run 20260923T060816-where-the-error-actually-happened)
[06:08:16] 20260923T060816-where-the-error-actually-happened spine    resuming "Where the error actually happened" (lms-e2e-2026-09-23/where-the-error-actually-happened)
```

`/health` while it ran: `{"running":true,"building":true,"eligible":0,"needsResume":false,"heldCourses":2}`.
That is the last line this container wrote about the lesson.

## The interruption — deployment `6123e052`, created 06:11:58Z (`railway redeploy --from-source`)

```
[course-worker] restored 4 lesson(s), 1 interrupted mid-build
[server] courses: 4 lesson(s) on a volume queue, 1 interrupted mid-build
```

The lesson had been `claimed` for about 3½ minutes — inside `research`/`script`, before any art or
speech is bought. `restore()` parked it as `blocked`, `blockedBy: "interrupted"`, with the standard
reason ("interrupted by a server restart before it finished … Approve to rebuild this lesson … or
reject to stop the course"). Its partial model spend is not recorded on the item: the run died before
it could settle, so the course view shows no `spendUsdTotal` for this attempt (unknown, not zero).

Two further redeploys followed (`b3700cb6` 06:17:46Z, removed; `19a7e2a6` 06:27:35Z, SUCCESS — round 2,
commit 274f937). The round-2 boot:

```
[course-worker] restored 4 lesson(s), 0 interrupted mid-build
[course-worker] boot: clean boot -- resuming the eligible lessons
[course-worker] resume by boot: 0 eligible, 0 course(s) held, running=false
```

`0 interrupted` here is correct: the lesson was already `blocked`, not `claimed`, by the time this
container booted. `0 eligible` because nothing is queued. `heldCourses: 0` under the round-2 rule (a
course with nothing queued behind its blocked lesson is not held).

## Where the lesson stands

`blocked`, `blockedBy: interrupted`, `deliverableAvailable: false`, no run spend recorded for the
06:08 attempt. The LMS's options, per the contract: **approve** = rebuild from the start (~$1.50–4,
their authorisation), or **reject**. `skip` does not apply (it is not `failed`).

The evals course `course-mub7whoa` is unaffected: both its lessons are `failed` with spend recorded
(`what-a-harness-actually-is` $5.4799, `why-a-good-demo-isn-t-enough` $1.5268), `held: null`.

## Whose fault

Ours. The worker was visibly building (`/health.courses.worker.building: true`) and a redeploy was run
anyway. `scripts/predeploy-check.js` now refuses that: it reads `/health` and exits 1 while a lesson is
building (`--wait` polls until idle). The deploy rule in CLAUDE.md and DEPLOYMENT_PREREQS carry it.
