---
type: reference
last_verified: 2026-10-29
owner: aroma
---

# For the LMS team: your 1.5/1.6 run, what the $2.46 was, and contract 1.7

*Reply to your note of 2026-10-29, "Course Builder: 1.5 and 1.6 are live on Taleemabad University".*

Hi team, and thank you for the full run and a very clear write-up. Below: answers to your two
questions, what we confirm (with one correction) on the three things you rely on, two small asks
about series, and what contract **1.7** adds. 1.7 only adds fields. Nothing you read today changes
meaning, and a client that ignores the new fields keeps working as it does now.

**Base URL:** `https://content-queen-production.up.railway.app`
**1.7 is live when** `GET https://content-queen-production.up.railway.app/health` reports
`"contractVersion": "1.7"`. We will confirm when that happens.
**Changelog entry:** `docs/CONTRACT-CHANGELOG.md` → section "1.7, additive — 2026-10-29" in the
Content Queen repo.

Two things you did are exactly right, and we have built on them:

- **Keying alerts on `lessonId@since`.** That is the identity of a hand-off. §3 below confirms
  `since` is stable enough to key on.
- **Sending `context` again on build.** We don't keep the plan, so
  `POST /api/v1/courses/build` needs the same `context` you sent to `POST /api/v1/courses/plan`.

---

## 1. What `partnerSpentUsd` counts

**Short answer:** it is real money already spent. At the script review, all of it is research and
script writing. None of it is the video.

Your `partnerSpentUsd` is our course-level `spentUsd`, mirrored as-is in
`apps/api/src/workers/content-course-poll.ts:268` (`partnerSpentUsd: state.spentUsd ?? null`).
We compute it as the sum of every lesson's `items[].spendUsdTotal` on:

```
GET /api/v1/courses/:courseId
```

Your 29 Oct course, `course-mvt6q73v` (lesson `lms-test/do-it-now-the-two-minute-rule`), as we hold it now:

| What it was spent on | Field on the lesson | USD |
|---|---|---|
| Model tokens: research, script, the automatic script review, QA | `items[].spendModelUsdTotal` | 2.6761 |
| Media: art and speech | `items[].spendMediaUsdTotal` | 0.5160 |
| **Total** | `items[].spendUsdTotal` → course `spentUsd` | **3.1921** |

When the script was ready:

- **$2.46** had been spent, all of it on model tokens (research, writing, the automatic script
  review). This happens *before* anyone sees the script, so it is a charge whether or not the
  script is approved.
- **$0** had been spent on art or speech. That is why the lesson read as "nothing bought": the
  video itself had not been started.
- Your 407-character note (`two-minute-rule-notes.md`) did **not** cause the cost. About $2–3 is
  the normal cost of researching and writing one lesson.

After approval the video added about $0.73: $0.52 of art and speech and about $0.21 of model
tokens for QA. Your approve button in `apps/web/src/lib/next-action.ts:127` says
"about $1.50". That is a fair upper estimate, but this video came in at half of it.

**So "$2.46 spent so far" is honest as you show it.** To let you say *what* it went on, 1.7 adds
three course-level fields to `GET /api/v1/courses/:courseId`, next to `spentUsd`:

```json
"spentUsd": 3.1921,
"spentModelUsd": 2.6761,
"spentMediaUsd": 0.516,
"spentSplitKnown": true
```

| Field | Meaning |
|---|---|
| `spentModelUsd` | Sum of `items[].spendModelUsdTotal`: research, writing, review, QA |
| `spentMediaUsd` | Sum of `items[].spendMediaUsdTotal`: art and speech, i.e. the video itself |
| `spentSplitKnown` | `false` when any lesson with spend predates the split. The two parts then don't add up to `spentUsd`, so show the total only |

Suggested wording on `apps/web/src/app/courses/build/[id]/page.tsx` (currently line 519):

- At a script review: *"$2.46 spent so far on research and writing. The video has not been made yet."*
- After a video: *"$3.19 spent: $2.68 research and writing, $0.52 pictures and voice."*

To keep these out of your drift warning, add `spentModelUsd`, `spentMediaUsd` and
`spentSplitKnown` to the course-level known list in `apps/api/src/lib/content-queen-courses.ts`.

---

## 2. `stoppedAt`

**Short answer:** it is meant for you. It was emitted but missing from our changelog, which is now fixed.

- **Where:** `GET /api/v1/courses/:courseId` → `items[].stoppedAt`
- **When present:** only on a lesson stopped by a reject of another lesson in the same course,
  i.e. `items[].status === "failed"` **and** `items[].stoppedWithCourse` is set. It never
  appears anywhere else.
- **Value:** ISO 8601 time of the reject that stopped it. Example:

```json
{ "id": "series/lesson-3", "status": "failed",
  "stoppedWithCourse": "series/lesson-2", "stoppedAt": "2026-10-20T10:00:00.000Z",
  "nextAction": { "who": "nobody", "kind": "none", "title": "Stopped with the course", "actions": [] } }
```

- **What to say to a person, if you show it:** *"Stopped on 20 Oct when 'Lesson 2 title' was
  rejected."* (Find the topic by matching `stoppedWithCourse` against `items[].id`.)
- Reading it as known but not storing it, as you already do in
  `apps/api/src/lib/content-queen-courses.ts:958` (commit `0bae720e`), is fine. Nothing else
  depends on it.

---

## 3. What you rely on: confirmed, with one correction

### 3a. `since` is stable: confirmed, and now tested

- **Where:** `GET /api/v1/courses/:courseId` → `items[].nextAction.since`, and the same object
  on `GET /api/v1/courses/attention` → `lessons[].nextAction.since`.
- **What it is:** the time the lesson *entered* its current state. We read it from an
  append-only event log, not from `updatedAt`.
- **What does NOT move it:**
  - A server restart or redeploy while it is the instructor's turn (script review, video review,
    or any other `who: "you"` state). Pinned by a new test in our suite.
  - Saving the finished video to Drive.
  - Recording the reviewed video's fingerprint.
- **The one case where it does move, correctly:** a lesson that was *being built* when the server
  restarted is parked as `nextAction.kind: "restart"`, `who: "you"`, `blockedBy: "interrupted"`,
  with a new `since`. This is a genuine new hand-off: the instructor has to start it again, and
  we deliberately don't restart it automatically because it would spend again. So it should alert.

### 3b. `queuePosition`: please switch to the new `lessonsAhead`

**The correction:** `queuePosition - 1` comes out one short whenever another lesson is being
built.

- `items[].queuePosition` is the 1-based position among lessons *waiting* to be picked up. The
  lesson being built right now is not in that line. So while something builds, your first queued
  lesson shows `queuePosition: 1`, and `1 - 1 = 0 ahead` is wrong. One is ahead of it.
- 1.7 adds `items[].lessonsAhead` on `GET /api/v1/courses/:courseId`. It is the number of lessons
  that will be worked on before this one starts, **including the one building now**:

```json
{ "status": "queued", "queuePosition": 1, "lessonsAhead": 1 }
```

| Situation | `queuePosition` | `lessonsAhead` | Say |
|---|---|---|---|
| Nothing building, first in line | `1` | `0` | "Yours is next" |
| One lesson building, first in line | `1` | `1` | "1 lesson ahead of yours" |
| One building, two waiting before it | `3` | `3` | "3 lessons ahead of yours" |
| Behind its own course's hold (waits on a person, not the line) | `null` | *absent* | say nothing about the line |

- **Please say "lessons", not "videos".** A lesson ahead may only be having its script written,
  which takes minutes, not a 20–40 minute video build.
- **Where to change it:** the place that takes `queuePosition` today is
  `apps/web/src/lib/course-hold.ts:42` (`ourPosition()`), fed by
  `apps/api/src/workers/content-course-poll.ts:348`, plus the "ahead of yours" line in your
  staging builder. Store `lessonsAhead` beside `queuePosition` (`apps/api/src/db/schema.ts:1860`)
  and take `Math.min` of it the same way.
- Our own `items[].nextAction.title` for a queued lesson now reads **"Next in line"** or
  **"Waiting its turn (2 lessons ahead)"**. If you show it as-is, you get this for free.

### 3c. `nextAction.actions` decides the buttons: agreed, and now published as data

- **Where:** `GET /api/v1` (the API index, public) → new top-level `nextAction`:

```json
"nextAction": {
  "who":   ["you", "us", "nobody"],
  "kinds": ["read-script", "watch-video", "check-flagged-video", "approve-spend",
            "restart", "retry-or-skip", "wait-for-support", "wait", "none"],
  "actions": {
    "approve-script": "POST …/script/approve",
    "revise-script":  "POST …/script/revise",
    "approve":        "POST …/approve",
    "redo-scenes":    "POST …/video/revise",
    "reject":         "POST …/reject",
    "requeue":        "POST …/requeue",
    "skip":           "POST …/skip",
    "cancel":         "POST …/cancel",
    "rate":           "POST …/rating"
  }
}
```

  `…` is `/api/v1/courses/:courseId/lessons/:lessonId`, e.g. `approve-script` →
  `POST /api/v1/courses/:courseId/lessons/:lessonId/script/approve`.
- These nine verbs match your `ActionKey` union in `apps/web/src/lib/next-action.ts:62-64`
  exactly. We suggest a unit test there that fetches `GET /api/v1` (or a saved copy) and fails if
  `Object.keys(nextAction.actions)` contains a verb your union does not. It then goes red the day
  we add one, instead of a button silently going missing.
- **Our commitment:** a new verb or kind is added to that list first, with a
  `docs/CONTRACT-CHANGELOG.md` entry and a `contractVersion` bump. We will tell you before
  removing any verb.
- A test on our side fails if the server can ever offer a verb that is not in the published list.

---

## 4. Series derived from the course title

This is fine on our side, and a fresh namespace for every rebuild is exactly what we want. Two asks:

1. **Titles with no Latin letters.** `POST /api/v1/courses/build` accepts `series` only if it
   matches `^[a-z0-9][a-z0-9._-]*$`. An Urdu title (e.g. "تدریس کی بنیادیں") becomes an empty
   string under "lowercase with dashes", and we refuse it with `400 bad_request`. Please fall back
   to `course`, made unique as usual (`course-2`, `course-3`, …).
2. **Keep it to 60 characters.** The series is the first half of every lesson id
   (`items[].id` = `<series>/<slug>`), and of its folder, Drive file name and catalogue path. We
   don't enforce a limit yet, but our own slugs stop at 60. Please cut at 60 and trim a
   trailing dash before you add `-2`.

---

## 5. Your redesigned builder

Noted, and thank you. Nothing in it needs anything from us. If it shows "ahead of yours" or
"spent so far", the 1.7 fields above are the ones to use: `items[].lessonsAhead`, and the course's
`spentModelUsd` / `spentMediaUsd` / `spentSplitKnown`.

---

## Summary of 1.7

| Field | Route | Where in your repo |
|---|---|---|
| `spentModelUsd`, `spentMediaUsd`, `spentSplitKnown` (course) | `GET /api/v1/courses/:courseId` | `apps/api/src/lib/content-queen-courses.ts` (known list), `apps/api/src/workers/content-course-poll.ts` (mirror), `apps/web/src/app/courses/build/[id]/page.tsx` ("spent so far") |
| `items[].lessonsAhead` | `GET /api/v1/courses/:courseId` | `apps/api/src/workers/content-course-poll.ts:348`, `apps/api/src/db/schema.ts:1860`, `apps/web/src/lib/course-hold.ts:42` |
| `nextAction { who, kinds, actions }` | `GET /api/v1` | test against `apps/web/src/lib/next-action.ts:62-64` |
| Queued `items[].nextAction.title` reads "Next in line" / "Waiting its turn (N lessons ahead)" | `GET /api/v1/courses/:courseId` | none if shown as-is |
| `items[].stoppedAt`: documented, unchanged | `GET /api/v1/courses/:courseId` | already handled, `apps/api/src/lib/content-queen-courses.ts:958` |
| `items[].nextAction.since`: stable through restarts, now tested | `GET /api/v1/courses/:courseId`, `GET /api/v1/courses/attention` | none; your `lessonId@since` key stands |

Thanks again. It is good to hear the 1.5 cues closed the "did anyone tell me?" gap.
