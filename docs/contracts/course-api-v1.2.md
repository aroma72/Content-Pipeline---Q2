---
type: reference
last_verified: 2026-09-24
owner: Aroma Tahir
---

# Course API contract — v1.2 (frozen 2026-09-24)

**This file does not change.** It is the copy the LMS vendors and pins tests to. Later versions are
new files beside it; `docs/CONTRACT-CHANGELOG.md` says what each added. `GET /api/v1` and
`GET /health` carry `contractVersion`; compare it with the version in this filename.

Base: `https://content-queen-production.up.railway.app`. Auth: `Authorization: Bearer <token>`.
Everything not stated here is as in `docs/contracts/course-api-v1.1.md` and, below that, the v1.0
prose reference `docs/integration-requests/2026-09-22-content-automation-api-reference.md`.

---

## 0. The one behaviour change, stated first

**Every course lesson now pauses twice, and the first pause happens before any money is spent.**

```
build → [~2 min, cents]  PAUSE 1: blockedBy "script-approval"   ← NEW
                          a person reads the script
      → [~30 min, ~$1.50] PAUSE 2: blockedBy "review"
                          a person watches the video
      → published
```

Until now a lesson's first stop was `review`: the video was finished and paid for, and the only
decisions left were publish or throw away. An instructor who disliked the angle of a lesson found
out at ~$1.50 and half an hour. The new pause puts that decision where it costs cents.

**This is not opt-in.** A course built against this version stops at lesson one after about two
minutes and will not continue until something calls
`POST .../lessons/:lessonId/script/approve`. **If your client does not call it, your course stalls.**
Wire it before you point at a deploy carrying `contractVersion: "1.2"`.

`blockedBy` gains one value, `script-approval`, in the closed set served at `GET /api/v1`.

---

## 1. Lesson (queue item) status — closed set, unchanged

`queued → claimed → done | failed | blocked`. What changed is only which blockers a `blocked`
lesson can carry, and therefore what a person is being asked for.

---

## 2. `GET /api/v1/courses/:courseId` — additions

Per item, alongside the v1.1 fields:

| field | when | meaning |
|---|---|---|
| `scriptAvailable` | once a script exists | `true` when `GET .../script` will return one. A fact, read off the volume, not inferred from `blockedBy` — the same reasoning as `deliverableAvailable` in v1.1. |
| `scriptSha` | with `scriptAvailable` | 16 hex characters naming this exact draft. **This is the value an approval must quote.** |
| `scriptApprovedBy`, `scriptApprovedAt` | after approval | who released the script for building, and when |
| `scriptRevisions` | after at least one revision | how many times a person has sent this script back. The cap is 5. |

**`deliverableAvailable` is `false` for a lesson blocked at `script-approval`, and that is correct** —
there is no video and there will not be one until somebody approves the script. Use
`scriptAvailable` for the thing that is ready to look at.

`awaitingApproval[]` entries are unchanged in shape and already carry `blockedBy`; that field is now
what tells "read this script" apart from "watch this video".

---

## 3. `GET /api/v1/courses/:courseId/lessons/:lessonId/script`

The script a lesson is waiting to have read. Served off the durable volume, so it survives a
redeploy of ours while a person is thinking.

```json
{
  "lessonId": "series/lesson-one",
  "status": "blocked",
  "blockedBy": "script-approval",
  "awaitingApproval": true,
  "humanRevisions": 0,
  "maxRevisions": 5,
  "title": "Taking orders without losing one",
  "slo": "Given a WhatsApp order, the learner can log it so nothing is lost",
  "scenario": "Ali runs a shop and takes orders on WhatsApp",
  "gate": "READY",
  "redrafts": 0,
  "sha": "952c084d6e16bcdb",
  "beatCount": 14,
  "beats": [
    { "id": "01", "mode": "ali", "vo": "Ali opens the shop.", "cap": "Monday",
      "art": "flat illustration of ...", "overlay": null, "info": null }
  ],
  "checkpoint": { "stem": "...", "options": ["a","b","c","d"], "answer": 1, "explain": "..." },
  "checkpointAfterBeat": "09",
  "note": "..."
}
```

- `vo` is what is **spoken**; `cap`, `overlay` and `info` are what is **on screen**. A beat with a
  spoken line and nothing on screen draws art and no words — worth catching here, because it is free
  to catch here.
- `checkpoint` is the question the learner cannot skip. It is never drawn and never spoken.
- `sha` fingerprints the bytes of `beats.js`. Show it to your reviewer or keep it; either way you
  send it back on approve.

`404 no_such_lesson` — unknown, or not in this course.
`404 no_script` — the lesson has not written one yet; carries `lessonStatus` and `blockedBy`.

### `GET .../script.md`

The same script as `text/markdown`, `Content-Disposition: attachment`, for a person to read. Identical
to what the Make a Video reader sees — one builder serves both, so the two cannot drift.

---

## 4. `POST /api/v1/courses/:courseId/lessons/:lessonId/script/approve`

Body `{"by": "name", "sha": "952c084d6e16bcdb"}`. **`sha` is required.**

`202 {"approved": "<id>", "by": "...", "sha": "...", "note": "..."}` — the lesson builds. **This is
where the spending starts:** about $1.50 and 30 minutes, then it pauses again at `review`.

`409 cannot_approve_script` when the lesson is not waiting on its script, when `sha` is missing, or
when `sha` does not name the current script — `message` says which.

**Why `sha` is required.** An approval that does not name a script is a standing licence to render
whatever script exists later. The fingerprint is also re-checked inside the pipeline immediately
before the spend, so a script that changes between your approval and the build re-blocks and asks
again rather than rendering something nobody read. Costs $0 when it happens.

---

## 5. `POST /api/v1/courses/:courseId/lessons/:lessonId/script/revise`

Body `{"why": "what to change", "by": "name"}`. `why` is required and must be non-empty — the writer
is answering it.

`202 {"revising": "<id>", "by": "...", "round": 1, "revisionsLeft": 4, "note": "..."}`

The script is rewritten from your notes, re-checked by the machine gate, and **pauses for you again**
with a new `sha`. **Costs one model call — cents — not a render.** No media is bought.

Capped at **5** revisions per lesson; the 6th is `409 cannot_revise_script`. After that, approve it,
reject the lesson, or requeue it to start from the brief again.

`revise` is the soft path. **`reject` is unchanged**: it still fails the lesson and stops its course.
Prefer `revise` while the lesson is at the script gate — it is what the gate is for.

---

## 6. `POST /api/v1/courses/build` — plan validation

The plan is **meant to be edited** before it is built. Nothing from `POST /courses/plan` is
persisted, so an instructor can rename a lesson, rewrite an SLO or drop one they do not want, and
send the edited plan to `build`.

`build` now validates what it is given, and refuses before anything is queued or reserved:

```json
400 { "error": "invalid_plan",
      "message": "This plan cannot be built: 1 problem(s). Nothing was queued and nothing was reserved.",
      "errors": [ { "path": "modules[0].lessons[2].slo", "message": "Every lesson needs an SLO. ..." } ] }
```

Validated: the course `title`; every module's `title` and at least one lesson; and on every lesson
`title`, `slo` and `brief`. `difficulty`, if given, must be one of the four values.

Deliberately **not** validated: `summary`, `audience`, `protagonist_scenario`, module summaries and
the per-lesson `question`. Those are advisory at build time, and refusing a buildable plan because a
form dropped a module summary would be worse than useless. (`protagonist_scenario` is still *used*
when present — it is what keeps Ali the same person across a course — so send it if you have it.)

This is free. `confirmLessons` and the $2.50-per-lesson reservation are unchanged.

---

## 7. Money

Unchanged from v1.1, with one clarification that matters now that lessons wait longer:

**The $2.50 reservation is taken at `build` and is held across the script pause.** It is not settled
when a lesson stops to be read. Settling there would release the reservation against a lesson that
had cost about five cents, and the approved build that followed would then buy ~$1.50 of media with
nothing standing behind it. So a course awaiting script approval holds its reservations against your
`monthlyUsd` until each lesson finishes, is rejected, or is skipped.

A lesson blocked at `script-approval` reports a few cents of **model** spend and
`spendMediaUsd: 0` — the point of the gate.

---

## 8. `/api/v1` index and `/health`

`contractVersion` is `"1.2"` on both. The `blockedBy` closed set served on `GET /api/v1` now has 11
values; the new one is `script-approval`. The four new routes are listed on the index — pin to it
rather than to this document.

---

## 9. What to do with each state, in one table

| you see | it means | do |
|---|---|---|
| `blockedBy: "script-approval"`, `scriptAvailable: true` | **the new one.** A script is written and nothing has been bought | `GET .../script`, show it, then `script/approve` with the `sha` ($, starts the build) or `script/revise` with notes (cents) |
| `cannot_approve_script`, message names a different sha | the script changed since you read it | re-read `GET .../script` and approve the new `sha` |
| `cannot_revise_script`, "already been revised 5 times" | the revision budget is spent | approve, reject, or requeue |
| `blockedBy: "review"` | a lesson is built and paid for and needs watching | as v1.1: `/approve` ($0) or `/reject` |
| `worker.held !== null` on your course | a lesson of yours needs a person — **now usually the script** | read `held.by`, check its `blockedBy` |
| `deliverableAvailable: false` while `blockedBy: "script-approval"` | normal, not a fault | there is no video yet; look at `scriptAvailable` |
| `worker.needsResume === true` | nothing is building and something could | `/courses/worker/resume` once |
