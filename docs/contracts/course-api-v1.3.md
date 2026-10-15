---
type: reference
last_verified: 2026-10-15
owner: Aroma Tahir
---

# Course API contract — v1.3 (frozen 2026-10-15)

**This file does not change.** It is the copy the LMS vendors and pins tests to. Later versions are
new files beside it; `docs/CONTRACT-CHANGELOG.md` says what each added. `GET /api/v1` and
`GET /health` carry `contractVersion`; compare it with the version in this filename.

Base: `https://content-queen-production.up.railway.app`. Auth: `Authorization: Bearer <token>`.
Everything not stated here is as in `docs/contracts/course-api-v1.2.md`.

---

## 0. The one behaviour change, stated first

**A reviewer at video review has three decisions, not two, and none of the new ones stops the course.**

```
      → [~30 min, ~$1.50] PAUSE 2: blockedBy "review"
                          a person watches the video and
                            /approve            publish it                              ($0)
                            /video/revise       remake ONLY the scenes they name        ← NEW (cents, minutes)
                            /reject             stop the course                         (unchanged)
      → published
```

`video/revise` sends the lesson back to its script stage with a patch that may touch only the
flagged beats — their art, motion, caption or spoken line. Everything else is kept: the paid
images, voice takes and clips of every other beat are reused, only the flagged seconds are rendered
again, and they are spliced into the bare render that was reviewed. The lesson then pauses at
`review` again with a **new `reviewedSha256`**. The course does not stop and no sibling is touched.

Separately, **`cancel` drops one lesson** at $0 beyond what it already bought and lifts its hold, so
the next lesson builds. Unlike `reject` it stops nothing else.

**Both are opt-in on the service** (`COURSE_VIDEO_REDO`). With it off, `video/revise` answers
`409 cannot_revise_video {"reason":"not_enabled"}` and everything in v1.2 is unchanged.

`blockedBy` gains no value. The closed set at `GET /api/v1` is as in v1.2.

---

## 1. Statuses

Unchanged: `queued | claimed | blocked | done | failed`. A cancelled lesson is `failed` with
`cancelled: true` (and `skipped: true`, which is what lifts its hold). A redo walks
`blocked(review) → queued → claimed → blocked(review)`.

---

## 2. `GET /api/v1/courses/:courseId` — additions per item

| field | when | meaning |
|---|---|---|
| `redoRound` | once a redo happened | how many times this video was sent back (1, 2, 3) |
| `redoBeats` | with `redoRound` | the beat ids of the last redo |
| `redoWhy` | with `redoRound` | the reviewer's notes for the last redo |
| `redosLeft` | while `blocked` | `maxRounds − redoRound`; 0 means approve, reject or requeue |
| `residueAvailable` | while `blocked` | true when the paid inputs are kept (volume or Drive) and a redo is partial. **False means a redo is a full rebuild** — send `fullRebuild: true` or do not offer it |
| `reviewedSha256` | while `blocked` at review | **changes on every redo.** A client that archived the previous file must copy this one |
| `cancelled`, `cancelledBy`, `cancelledAt` | when `failed` by a cancel | why a lesson disappeared |
| `videoRedo` | `GET /api/v1` top level | `{ enabled, maxRounds, reserveUsd }` |

---

## 3. `POST /api/v1/courses/:courseId/lessons/:lessonId/video/revise`

Body:

```json
{ "why": "the shop is drawn as a bank", "beats": ["07"], "spans": [{ "fromSec": 80, "toSec": 95 }],
  "by": "instructor@example.org", "fullRebuild": false }
```

- `why` — required, non-empty. The writer and the artist are answering it.
- `beats` — ids from `GET …/script`. Checked against the script the video was made from; a
  checkpoint beat is never a scene.
- `spans` — seconds **in the file the reviewer watched** (the branded deliverable, intro included).
  Mapped to beats through the same intro offset the checkpoints use; a point span
  (`fromSec === toSec`) names the scene on screen at that instant. At least one of `beats`/`spans`
  must land on a spoken scene.
- `fullRebuild` — when `residueAvailable` is false, `true` rebuilds the whole lesson (~$1.50, ~1 h)
  with the same notes; otherwise the call is refused with `no_residue`.

Precondition: `status === "blocked"` with `blockedBy` of `review` or `post-render-check`.

`202`:

```json
{ "revising": "series/lesson", "by": "…", "round": 1, "redosLeft": 2,
  "beats": ["07", "08"], "mappedFromSpans": [{ "fromSec": 80, "toSec": 95, "beats": ["08"] }],
  "reservedUsd": 0.75, "note": "…" }
```

`409 cannot_revise_video` carries `reason`: `not_enabled`, `not_at_review`, `building`,
`already_published`, `no_notes`, `no_beats`, `unknown_beat`, `bad_span`, `no_script`, `no_residue`,
`redo_cap`. `402 tenant_budget_exhausted` when the redo hold would pass the tenant's month;
`404 no_such_lesson` across courses or tenants.

**What may change:** on the flagged beats only — `vo` (spoken line), `art`, `motion`, `cap`,
`overlay`, `info`, `tone`. Never a mode, an id, the beat count or the checkpoint. The patch schema
cannot express anything else, and the result is checked before it renders.

**What is kept:** every other beat's images, voice take, cutouts and clips are reused as bought;
their seconds are pinned (a re-voiced flagged line does not re-time its neighbours). Unchanged beats
are frame-identical to the reviewed video before one final re-encode of the bare lesson, so the
pictures match and the bytes do not.

**Cost and time:** images $0.04 each, voice $0.002 a line, motion $0.05 a second — only for the
flagged beats — plus one small model call. A 2-beat redo measured $0.45–0.65 and 8–15 minutes.
The redo takes its own hold of `reserveUsd` and settles at what it bought; the lesson's
`spendUsdTotal` includes it. Capped at `maxRounds` per lesson, separate from the 5 script revisions.

**Timing:** a flagged line that changed length moves every later checkpoint. `GET …/checkpoints`
re-reads `durations.json`, so its payload and ETag change; nothing stale is served.

---

## 4. `POST /api/v1/courses/:courseId/lessons/:lessonId/cancel`

Body `{ "why": "…", "by": "…" }`. Both optional.

| lesson is | result |
|---|---|
| `queued` | `failed`, `cancelled: true`, reservation released ($0) |
| `blocked` (either gate) | `failed`, `cancelled: true`, reservation settled at what was bought |
| `claimed` (building) | `202 {"aborting": true}`; the build is stopped between stages or mid-command, then the lesson reads `failed` with `cancelled: true` and settles at what it bought before the stop |
| `failed` | `200 {"alreadyFailed": true}`; its hold is lifted if it was not already |
| `done` | `409 cannot_cancel {"reason":"already_published"}` |

No sibling is touched. The course's next lesson builds on the next kick. The video, if one was
made, and its Drive copy are kept.

---

## 5. `POST …/reject` on a lesson that is building

Unchanged in meaning. It now **stops the build** (it used to mark the lesson failed and lose the
race to the build's next write). The queued siblings are stopped as in 1.1 §3.

---

## 6. Drive

A redone lesson's deliverable is uploaded as a new file, `<series>__<slug>_final.r<round>.mp4`,
and `GET …/file` serves the current one. The previous copy stays on the Shared Drive unless the
service runs with `GDRIVE_TRASH_SUPERSEDED=1`, in which case it is moved to the trash (recoverable
for 30 days) once the new one has verified.
