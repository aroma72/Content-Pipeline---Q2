---
type: reference
last_verified: 2026-09-28
owner: aroma
---

# For the LMS team — we are clearing the test content, and you will want to clear yours

*Follows `2026-09-25-last-error-on-written-jobs.md`, and answers the open question in your
`2026-09-27-production-is-current-deploy-when-ready.md` §3.*

## 1. What we are doing, and when

Everything currently on our production is the pipeline's own test output — nothing a learner
should ever see. We are emptying it: four job records, three course deliverables (54.7 MB) and
the queue log.

| | going |
|---|---|
| jobs | the two `When the score lies…` runs from 09-21 and 09-22, plus the two dead incident jobs |
| deliverables | `cb-e2e-2026-09-23/what-a-bar-chart-shows` and the two `made/when-the-score-lies-…` |
| queue | archived, not deleted — renamed into `queue/archive/` on the volume |

The ledger is untouched. September's settled spend stays on the books and the `monthlyUsd: 50`
ceiling keeps counting from the real figure.

## 2. The thing we need you to know first

**Your poller will read this as data loss unless you clear your rows too.**

`content-queen-jobs.ts:352-365` is explicit that a 404 for a job you believe existed is `gone`
rather than `not_found`, and `content-video-poll.ts` requires two of them 60s apart before
declaring it. That logic is right, and we are not asking you to change it. But once our records
are gone it will fire, and an instructor will be told their video was lost with money committed —
for a video we deliberately removed.

So: please drop your rows for those videos and for the `cb-e2e-2026-09-23` course before or
shortly after we run this. Your `deleteJobVideo` already treats a 404 as success, so the
asymmetry is only on the read path.

If it is easier for you to have us hold off until you are ready, say so and we will wait. Nothing
here is urgent.

## 3. How it works on our side, if you ever need to ask for it

New route, `POST /api/v1/admin/reset`. It needs an `admin` scope, which **your token does not
carry and will not be given** — it exists only on our own operator credential. Mentioned here
because you should know the route exists and what it can do, not because you can call it.

It refuses unless it is handed the exact live counts, refuses while anything is in flight, and
requires a written reason. The run is rehearsed first and the rehearsal shares the code path with
the real thing. Documented at `docs/SERVICE_DURABILITY_AND_CONTRACTS.md` §6.2a.

## 4. Your §3 question: no, do not clear the approval fields

You asked whether `scriptApprovedBy` and `scriptApprovedAt` should be nulled when a lesson moves
past the gate, to match how we treat `blockedBy` and `blockedReason`.

**Keep them.** Your instinct was right and the asymmetry is correct. `blockedBy` describes a
condition that has ended, so it should clear. The approval fields are an audit trail: who released
a paid render, and when. An audit trail that disappears once the thing it authorised has happened
is not an audit trail. We would rather match you here than the other way round.

The rest of §3 we read and have no argument with. `sha` guarded in three places, `undefined` not
being `false`, the two-affordance split, storing no script content — all as we would have asked.

## 5. Two smaller things

- Our demo course-builder page now asks for a token before its Build button will do anything. It
  was sending no credential at all, so the produce gate we added on 09-27 left it answering a bare
  `HTTP 401`. This does not touch your integration; noted only because you have seen that page.
- Our image build now retries the Debian package step. One of our deploys last week was lost to a
  mirror that was mid-sync — not a code failure, and production was never affected, but it cost a
  deploy window.

## 6. Still yours to close

The two videos from the 09-25 incident (`43a782dd45dd`, `cdb890a5b40f`) still need re-creating by
a person. Neither script is recoverable. If you are clearing rows anyway, these two can go in the
same pass and be created fresh — writing a script costs no media spend.
