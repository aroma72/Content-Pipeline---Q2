---
type: reference
last_verified: 2026-09-25
owner: Aroma Tahir
---

# Wire `script-approval` before we deploy — what to build, and where it goes in your code

**To:** the Cohort 2 LMS team (Abdulrehman Siddiqi / Nazim)
**From:** Content Automation — Drawing Room / Content Queen
**Re:** contract 1.2's script gate; the deploy is held until you have it
**Date:** 2026-09-25

---

## 0 · Where this stands

Contract 1.2 is built, tested and merged on our side. **It is not deployed, and we are not going to
deploy it until you tell us you are ready.** That is the promise we made on 09-24 and this document
is us keeping it.

We also did something we should tell you about plainly: rather than wait for an answer, we read your
repository to find out whether the gate was already wired. It is not — no reference to
`script-approval`, `script/approve`, `script/revise`, `scriptSha` or `scriptAvailable` anywhere in
code, tests, docs or git history. We would rather say that out loud than sit on a deploy while
guessing about each other. Everything below is written against the files we actually found, so you
should be able to check each claim rather than take our word for it.

The full frozen contract is `docs/contracts/course-api-v1.2.md`. This document is the integration
guide that goes with it.

---

## 1 · The change, in four lines

```
build → [~2 min, cents]  PAUSE 1: blockedBy "script-approval"   ← NEW
                          a person reads the script
      → [~30 min, ~$1.50] PAUSE 2: blockedBy "review"
                          a person watches the video
      → published
```

The second pause is the one you already handle. The first is new, it is **not opt-in**, and a lesson
sits at it until something calls `POST .../script/approve`.

The point of it: an instructor who dislikes the angle of a lesson currently finds out after ~$1.50
and half an hour. This moves that decision to about five cents and two minutes.

---

## 2 · What will actually happen to your UI if we deploy before you wire it

We traced this through your code rather than describing it in the abstract. Your handling is
better than most — nothing crashes, nothing goes blank — but the course does stop, and it stops
wearing the wrong label.

**`apps/api/src/workers/content-course-poll.ts:281`**

```ts
blockedBy: i.status === 'blocked' ? (i.blockedBy ?? 'review') : null,
```

This is fine as-is. `script-approval` is passed through verbatim and lands in
`content_course_lessons.blocked_by` (`apps/api/src/db/schema.ts:1433`). No change needed here for
the slug itself. What it does **not** capture is `scriptAvailable` and `scriptSha` — and `scriptSha`
is the value you must quote back on approve, so it has to be persisted or re-fetched.

**`apps/api/src/lib/build-library.ts:197-201`** — `lessonStatus()`

```ts
case 'blocked':
  return l.interrupted
    ? { label: 'Needs rebuilding', group: 'needs_you' }
    : { label: 'Ready for review', group: 'needs_you' };
```

A lesson waiting on its **script** will be labelled **"Ready for review"**. There is no video, and
there will not be one until somebody approves. This is precisely the mislabelling we flagged on
09-24, and it is the single most misleading thing that would ship.

**`apps/api/src/lib/build-library.ts:223-228`** — `approvable`

```ts
const approvable =
  l.partnerStatus === 'blocked'
  && l.blockedBy === 'review'
  && ...
```

`canApprove` is `false` for `script-approval`, so no inline approve button renders and the row links
to the course page. Correct instinct — approving a script starts a ~$1.50 build and should not be a
one-click action from a list — but it means there is no path to act.

**`apps/web/src/lib/blocked-by.ts:111-123`** — `describeBlockedBy()`

Your fallback holds. The file says it outright — *"NOT AN ALLOWLIST … A switch that fell through to
blank would go quiet on exactly the day they add the eleventh"* — and this is that day. An
instructor sees:

> Content Automation stopped this at a step we do not have a description for ("script-approval").
> A person should look at it, and it is worth telling Content Automation we saw this.

That is the right behaviour and it is why this is a stall rather than an incident. It is still a
dead end: nothing in the product can call `/script/approve`.

**Net effect:** the course stops at lesson one, says "Ready for review" with nothing to review,
offers no action, and waits forever.

---

## 3 · The part that compounds, and why we care more than you might expect

The $2.50-per-lesson reservation is taken at `build` and is **held across the script pause**
(contract §7). We do not settle it when a lesson stops to be read — settling there would release
$2.50 against a lesson that had cost five cents, and the approved build that followed would buy
~$1.50 of media with nothing behind it.

So a stalled course does not just sit there. It **holds its reservations against your `monthlyUsd`**
until each lesson finishes, is rejected, or is skipped.

With the ceiling going to $50 (see §7), a stalled ten-lesson course holds $25. Two of them hold $50,
and every subsequent `build` gets a 402 — which your side reads as "budget exhausted" when the real
cause is two courses waiting on a button that does not exist yet. That failure is several steps
removed from its cause and would be genuinely unpleasant to debug from your end.

Reject or skip releases the reservations, as before.

---

## 4 · The integration, minimally

Four routes, all on the lesson you already address. Auth and base URL unchanged.

| Route | Cost | What it does |
|---|---|---|
| `GET .../lessons/:lessonId/script` | free | every beat — `vo` (spoken) and `cap`/`overlay`/`info` (on screen) — the checkpoint question, the machine gate's verdict, and a `sha` naming this exact draft |
| `GET .../lessons/:lessonId/script.md` | free | the same as `text/markdown`, for a person to read |
| `POST .../lessons/:lessonId/script/approve` | **$0; the spend starts after it** | `{by, sha}` → the lesson builds |
| `POST .../lessons/:lessonId/script/revise` | one model call, cents | `{why, by}` → rewritten from your notes, re-gated, pauses again with a new `sha` |

The minimum loop:

```bash
# 1. poll as you already do; a lesson now stops here first
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/courses/$COURSE" | jq '.items[] | select(.blockedBy=="script-approval")'

# 2. read it, show it, approve quoting the sha you were shown
SHA=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/courses/$COURSE/lessons/$LESSON/script" | jq -r .sha)

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"by\":\"$INSTRUCTOR\",\"sha\":\"$SHA\"}" \
  "$BASE/api/v1/courses/$COURSE/lessons/$LESSON/script/approve"

# or, instead of approving:
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"by":"'"$INSTRUCTOR"'","why":"too abstract - put Ali in the shop"}' \
  "$BASE/api/v1/courses/$COURSE/lessons/$LESSON/script/revise"
```

**`sha` is required on approve, and we would ask you not to work around it.** It fingerprints the
bytes of the script, and we re-check it inside the pipeline immediately before the spend. If the
script changes between your approval and the build, the lesson re-blocks and asks a person again
rather than rendering something nobody read. An approval that does not name a script is a standing
licence to render whatever exists later. When the re-check fires it costs $0.

`409 cannot_approve_script` when the lesson is not at the script gate, when `sha` is missing, or when
it names a stale draft — `message` says which. Re-read `GET .../script` and approve the new `sha`.

Revisions are capped at **5**; the 6th is `409 cannot_revise_script`. After that: approve, reject, or
requeue. Prefer `revise` over `reject` while a lesson is at this gate — `reject` still fails the
lesson and stops its course, unchanged.

**Path note:** `:lessonId` is greedy on our side and lesson ids contain a slash
(`series/lesson-one`), so the id goes into the path unencoded — exactly as your existing
`/approve`, `/reject` and `/skip` calls already do it. Nothing new to handle.

---

## 5 · Where it goes in your code

Offered as a map, not as instructions about your own codebase — adjust freely.

| File | Change |
|---|---|
| `apps/api/src/lib/content-queen-courses.ts` | four client methods: `getLessonScript`, `getLessonScriptMarkdown`, `approveLessonScript({by, sha})`, `reviseLessonScript({why, by})`. Same auth/error handling as the existing course calls. |
| `apps/api/src/workers/content-course-poll.ts` ~271-301 | capture `scriptAvailable`, `scriptSha`, `scriptApprovedBy`, `scriptApprovedAt`, `scriptRevisions` into `LessonStatusPatch`. Gate them the way you gate `blockedBy` and `deliverableAvailable` — `?? null`, so "they did not say" stays distinct from "no". |
| `apps/api/src/db/schema.ts` ~1433 | columns on `content_course_lessons` for at least `script_sha` and `script_available`; `script_revisions` if you want to show the budget. Migration. |
| `apps/api/src/lib/build-library.ts:197-201` | a `blocked` lesson whose `blockedBy === 'script-approval'` needs its own label — "Script ready to read", not "Ready for review". |
| `apps/api/src/lib/build-library.ts:223-228` | decide whether a script gets an inline action. We would leave `canApprove` meaning "costs nothing more" and add a separate affordance that links to the reader, since approving a script *does* start spending. Your call — but the two should not share a button. |
| `apps/api/tests/unit/build-library.test.ts:144-160` | the sibling cases for the new label and action. |
| `apps/web/src/lib/blocked-by.ts:45-101` | an eleventh entry. Suggested: `what:` "The script is written and waiting for someone to read it. Nothing has been bought yet." · `spent: 'no'` · `action:` "Read it, then approve to start making the video (about \$1.50), or send it back with notes (costs a few cents)." · `approveRebuilds` stays unset — this is not a rebuild, it is the first build. |
| `apps/web/src/app/courses/build/[id]/page.tsx` ~406 | the reader itself: render `beats[]`, the checkpoint, and the `sha`, with Approve and Send-back-with-notes. |
| `apps/api/src/routes/content-courses.ts` | routes behind the two new actions, alongside the existing approve/reject. |
| `docs/contracts/` | `course-api-v1.2.md` to vendor beside your 1.1 copy — ours is frozen and will not move. |

Two things the API cannot enforce for you, repeated from 09-24 because they are the ones that bite:

- **Label the two gates differently.** Both are "a lesson needs you" and only `blockedBy` tells them
  apart. One says *read this*; the other says *watch this*. One Approve button for both shows
  "approve this video" to somebody who has no video.
- **Show the `sha`, or at least keep it.** If your reviewer reads one draft and your client approves
  a fresher one, we refuse the call. That is the correct outcome and a baffling one if the UI never
  mentioned that a script has a version.

---

## 6 · The ordering problem, and why it is smaller than it looks

You cannot test against 1.2 until we deploy it, and we will not deploy it until you are wired. That
looks like a deadlock. It is not, because **the integration is additive and safe against 1.1**:

- Production is on 1.1 today, so no lesson ever carries `blockedBy: "script-approval"`. Your new
  branch never executes.
- You only call `GET .../script` when you see that slug, so you never hit the route that would 404.
- Everything else — the new columns, the label, the `blocked-by.ts` entry — is inert until the value
  appears.

So **you can ship your side first, to production, with no risk.** Then we deploy, and the path comes
alive on its own.

Two things worth adding while you are in there:

- **Read `contractVersion`** from `GET /api/v1` or `GET /health` (it is `"1.2"` after our deploy) and
  log it. We could not find a version check anywhere in your repo; the switchover is much easier to
  reason about when the app can say which contract it is talking to.
- **Tell us when it is in**, and we will deploy into a window you pick rather than at a time of our
  choosing.

Then, once we deploy: build one cheap course — one module, two lessons — and let it stop at lesson
one. Read the script, send one revision, approve it, and watch it go through to `review` as normal.
We are happy to sit on a call for that first run.

---

## 7 · The budget raise, since it ships in the same deploy

Your 09-24 request is done on our side and waiting behind this same deploy: **`cohort2-lms`
`monthlyUsd` 10 → 50**, `maxRunUsd` unchanged at **4**. We checked your staging configuration and it
matches what you described — a $50 platform ceiling and 10 videos per instructor per month — so our
ceiling will no longer sit under yours, and an instructor authorised by you will not be refused by
us.

Read §3 above alongside this, though: a larger ceiling makes the stalled-reservation failure take
longer to show up, not less likely.

When you have a month of real numbers and lower your own gates, tell us and we will follow.

---

## 8 · What we need back

1. **"The approve path is in"** — and ideally the commit or PR, so we are not guessing twice.
2. **A deploy window.** We will run `predeploy-check`, deploy, and confirm `contractVersion: "1.2"`
   on `/health` while you watch.
3. Still open and still yours: the interrupted lesson
   `lms-e2e-2026-09-23/where-the-error-actually-happened` is blocked and needs an approve or a
   reject.
4. Still open and still ours: publishing the held video unlisted and sending you the URL (open since
   09-21 §7), the `series` → module mapping (open since 09-07), and rotating the old
   `CONTENT_API_TOKEN` now that `cohort2-lms` is live.

Still deferred by us, unchanged: per-tenant round-robin in the queue, a course `callbackUrl`,
`Idempotency-Key` on `/courses/build`, and a structured course-membership field to replace the
`[courseId]` substring match. `/api/v1/jobs` — the two-phase single-video flow — is designed and not
built; say the word if you want it.

---

*Our tests for every claim about our side: `orchestrator/test-regressions.js` §11 (the gate blocks
before `references`; an approval names a sha; a stale approval re-blocks; revisions cap; a requeue
drops an approval; the reservation survives the pause) and `orchestrator/test-server.js` (the four
routes, `invalid_plan`, and the course-view fields).*
