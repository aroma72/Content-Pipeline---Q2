---
type: reference
last_verified: 2026-09-24
owner: Aroma Tahir
---

# You were only ever shown the bill, never the plan — here is the script, before we spend

**To:** the Cohort 2 LMS team (Abdulrehman Siddiqi / Nazim)
**From:** Content Automation — Drawing Room / Content Queen
**Re:** the course builder's approval gate, and the two-phase "write then render" flow
**Date:** 2026-09-24

---

## 1 · The finding first

We looked at what we actually hand you per lesson, and it is one thing: an mp4, plus one human
decision — publish it or throw it away — taken *after* it is rendered and paid for.

The script was never on your surface at all. There is no script route on `/api/v1`; the only one that
exists is `GET /demo/make-video/:jobId/script.md`, on the anonymous demo surface, which you cannot
reasonably build against. The script *is* reviewed before we render — but by a model
(`prompts/script_gate.txt`), which can send it back up to six times and then proceeds on its own
judgement. No person sees it.

So the shape of your instructor's day was: ask for a course, wait about thirty minutes, watch a
video, and discover then that the angle is wrong. That is a $1.50 lesson in a place where the same
objection costs about five cents to act on.

The uncomfortable part: we already had the right shape and did not give it to you. The Make a Video
flow splits writing from rendering deliberately — our own code says *"SEPARATE FROM WRITING ON
PURPOSE. Everything up to the gate buys nothing."* It was never wired to courses, and we never
mentioned it. You did not ask for this, because you had no way to know it was there.

## 2 · What we changed

Live once deployed — `contractVersion: "1.2"` on `GET /api/v1` and `GET /health`. Frozen contract:
`docs/contracts/course-api-v1.2.md`. Per-field changelog with your client files:
`docs/CONTRACT-CHANGELOG.md` §1.2.

**Every course lesson now pauses twice.**

```
build → [~2 min, cents]  PAUSE 1: blockedBy "script-approval"   ← new
                          a person reads the script
      → [~30 min, ~$1.50] PAUSE 2: blockedBy "review"
                          a person watches the video
      → published
```

**Four new routes**, all on the lesson you already address:

| Route | What it does | Cost |
|---|---|---|
| `GET .../lessons/:lessonId/script` | every beat — what is spoken (`vo`) and what is on screen (`cap`/`overlay`/`info`) — the checkpoint question, the machine gate's verdict, and a `sha` naming this exact draft | free |
| `GET .../lessons/:lessonId/script.md` | the same, as markdown for a person to read | free |
| `POST .../lessons/:lessonId/script/approve` | `{by, sha}` → the lesson builds | $0; **the spend starts after it** |
| `POST .../lessons/:lessonId/script/revise` | `{why, by}` → rewritten from your notes, re-gated, pauses again | one model call, cents |

**`sha` is required on approve, and this is the part we would ask you not to work around.** It
fingerprints the bytes of the script. We re-check it immediately before the spend, so if the script
changes between your approval and the build — a machine redraft, a retry — the lesson blocks again
and asks a person rather than rendering something nobody read. An approval that does not name a
script is a standing licence to render whatever exists later, and we would rather refuse your call
than quietly do that.

**On the course view**, per item: `scriptAvailable`, `scriptSha`, `scriptApprovedBy`,
`scriptApprovedAt`, `scriptRevisions`. `scriptAvailable` is a fact read off the volume, in the same
spirit as `deliverableAvailable` in 1.1 — not a rule you infer from `blockedBy`.

**`deliverableAvailable` is `false` while a lesson waits on its script, and that is correct.** There
is no video and there will not be one until somebody approves. Read `scriptAvailable` for the thing
that is ready.

**Plans are now checked at `build`.** The plan was always meant to be edited before building — we
return it and persist nothing, precisely so an instructor can rename a lesson or rewrite an SLO. But
`build` only checked that `modules` was an array, so a plan that lost an SLO in your form queued a
lesson with no objective and nobody found out until they watched it. It now returns
`400 invalid_plan` with `errors[{path, message}]`, before anything is queued or reserved. We check
only what a lesson is built from — lesson `title`/`slo`/`brief`, module `title`, course `title`.
`summary`, `audience` and the per-lesson `question` are advisory and are not enforced; refusing a
buildable plan over a missing module summary would be worse than useless.

**The reservation is held across the pause.** The $2.50 per lesson is still taken at `build`, and we
do **not** settle it when a lesson stops to be read. Settling there would release $2.50 against a
lesson that had cost five cents, and the approved build would then buy ~$1.50 with nothing behind
it. So a course sitting on unapproved scripts holds its reservations against your `monthlyUsd`.
Reject or skip releases them as before.

## 3 · What we need from you, and the one thing that will break

**This is not opt-in, and it has a deploy-ordering problem.** A course built against 1.2 stops at
lesson one after about two minutes and will not continue until something calls `script/approve`. If
your client does not have that call wired, **your next course stalls** and looks like our worker
died.

So: tell us when you have the approve path in, and we will deploy after that, not before. We are not
going to ship this and let you discover it from a stuck course — that is the 2026-09-22 failure
again, in a new costume.

The minimum integration is two calls:

```bash
# 1. poll as you already do; a lesson now stops here first
curl -s -H "Authorization: Bearer $TOKEN" \
  ".../api/v1/courses/$COURSE" | jq '.items[] | select(.blockedBy=="script-approval")'

# 2. read it, show it, then approve it quoting the sha you were shown
SHA=$(curl -s -H "Authorization: Bearer $TOKEN" \
  ".../api/v1/courses/$COURSE/lessons/$LESSON/script" | jq -r .sha)

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"by\":\"$INSTRUCTOR\",\"sha\":\"$SHA\"}" \
  ".../api/v1/courses/$COURSE/lessons/$LESSON/script/approve"

# or, instead of approving:
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"by":"'"$INSTRUCTOR"'","why":"too abstract - put Ali in the shop"}' \
  ".../api/v1/courses/$COURSE/lessons/$LESSON/script/revise"
```

Two things to get right in the UI, because the API cannot enforce them for you:

- **Label the two gates differently.** Both are "a lesson needs you", and the difference is
  `blockedBy`. One says "read this"; the other says "watch this". One Approve button for both will
  show "approve this video" to somebody who has no video.
- **Show the `sha` or keep it.** If your reviewer reads the script and your client then approves a
  fresher one, we refuse the call — which is the correct outcome, but a confusing one if the UI never
  mentioned that a script has a version.

## 4 · Your open items, unchanged

Still ours, still Aroma's: publishing the held video unlisted and sending you the URL (open since
09-21 §7), the `series` → module mapping (open since 09-07), and rotating the old
`CONTENT_API_TOKEN` now that `cohort2-lms` is live. Still deferred by us and still deferred:
per-tenant round-robin in the queue, a course `callbackUrl`, `Idempotency-Key` on `/courses/build`,
and a structured course-membership field to replace the `[courseId]` substring match.

The interrupted lesson `lms-e2e-2026-09-23/where-the-error-actually-happened` is still blocked and
still yours to approve or reject.

## 5 · What this does not fix

The single-video flow — `POST /demo/make-video` then a separate credentialed produce — is still only
on `/demo`, still cookie-bound, and still not something you can build against. Putting it on
`/api/v1` as `/api/v1/jobs` is designed and not built. Say if you want it; it is a smaller piece of
work than this was, and it is the same two-phase shape you will now have on courses.

We also did not add a course-level approval step. Everything an instructor would want to review
before building — course title, summary, audience, the running scenario, and every lesson's title,
SLO and brief — is already in the `POST /courses/plan` response, and you can edit it freely before
calling `build`. Adding a server-side approve on top of that would be ceremony, not safety. If you
disagree once you have built the screen, tell us.

---

*Tests for every claim above: `orchestrator/test-regressions.js` §11 (the gate blocks before
`references`; an approval names a sha; a stale approval re-blocks; revisions cap; a requeue drops an
approval; the reservation survives the pause) and `orchestrator/test-server.js` (the four routes,
`invalid_plan`, and the course-view fields). `npm test` at this commit: 236 + 34 + 53.*
