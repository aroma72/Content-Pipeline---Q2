---
type: reference
last_verified: 2026-09-21
owner: Aroma Tahir
---

# §1 and §2 are in. §1 was not the field you asked for, and the reason matters.

**To:** Abdulrehman Siddiqi — Cohort 2 Learning Platform (LMS)
**From:** Content Automation — Drawing Room / Content Queen
**Re:** Your `2026-09-21-course-api-asks.md`
**Date:** 2026-09-21

---

## Shipped

| § | Ask | Status |
|---|---|---|
| 1 | A finished lesson names its video | **Done** — `path`, plus `youtube` and `youtubeVideoId` |
| 2 | A discriminator on `blocked` | **Done** — `blockedBy`, closed set, defaults to `review` |
| 4 | `runs.jsonl` on the durable store | **Done** — written to both, and it now carries `series` |
| 5 | Retry one failed lesson | **Done** — `POST .../lessons/:lessonId/requeue` |
| 3 | Is `$0.598` representative? | **Answered below, and it was not answerable before today** |
| 6 | Is a partial build supported? | **Yes. Confirmed, with one caveat you should know about** |
| 7 | Publish the held video unlisted | **Not done — Aroma's to do, still open** |
| 8 | Rotate the token | **Not done — Aroma's to do, still open** |

---

## 1 · You asked for `i.path`. There is no `path` on a queue item — and you already have the key

You read the queue item shape correctly at `queue.js:129` and drew the wrong conclusion
from it, which is our fault for never writing this down: `series` and `slug` are on the
item, but no `path` is. The one-liner you sent would have projected `undefined`.

What exists is better. Eleven lines earlier, `queue.js:118`:

```js
const id = `${series}/${finalSlug}`;
```

**The item's `id` — the string you are already reading, already filtering on, already
displaying — *is* the catalogue `path`.** It is minted from the same two parts, and
`checkpoints.js:533` files the catalogue row under the identical string. They were never
two keys that needed joining; they are one key that nobody had said out loud.

So the projection hands it to you under the name you asked for:

```js
...(i.status === 'done' ? { path: i.id, ... } : {}),
```

**On your assessment worry.** You were right to raise it and it cannot bite you here.
`slugify` strips `/` to `-` (`queue.js:84-90`) and `paths.videoDir` builds two levels only
(`paths.js:60`), so **the queue cannot express `<series>/assessment/<slug>` at all.** The
three folders on disk at that depth were made by hand, before the course path existed. The
read side walks three levels to find them (`checkpoints.js:498-503`) — which is the comment
you quoted — but nothing a course builds can land there. For a course lesson, `id` is exact.
If we ever enqueue assessments, that becomes a real third segment and we will send you the
contract change before it ships, not after.

**You also get the answer directly.** `queue.done(id, runId, artifacts)` stores the run's
artifacts on the item, and courses stop after `upload` (`config.js:80`), so a finished
course lesson already carries `{url, videoId, privacyStatus}` from the upload stage. That
was sitting in the queue file the whole time. A `done` lesson now reads:

```json
{
  "id": "whatsapp-orders/taking-an-order",
  "status": "done",
  "runId": "20260921T075234-taking-an-order",
  "path": "whatsapp-orders/taking-an-order",
  "youtube": "https://youtu.be/0h-g3U-gklo",
  "youtubeVideoId": "0h-g3U-gklo"
}
```

`youtube`/`youtubeVideoId` are gated on the upload artifact actually existing — a run
configured to stop earlier still gets `path`, and you resolve it through the catalogue as
you planned. Both are gated on `done`, for the reason the `error` field already was:
`currentItems()` is a shallow fold that never deletes a key.

**Verify:** a `done` course lesson carries `path`, and that string appears as a row's `path`
in `GET /api/v1/videos`. Covered by a test that drives a real enqueue → done sequence.

---

## 2 · `blockedBy`, and why it was not one line

Your field name, your default, your vocabulary. We took the note about `error` — a video
that exists and needs a decision is not the terminal case, and reusing that name would have
said it was.

It was not a one-line projection change, and the reason is worth you knowing because it
explains why the information never reached you. **`spine.js:250` settled a block with
`err.message` and nothing else.** The `BlockedError` thrown by the post-render sensor
already carried `blocker: '<script> findings after the render'` and
`details: {sensor, what, findings, finalRendered: true}` — every distinction you need,
structured — and all of it was dropped at the queue boundary. The prose in `reason` was not
the best signal available; it was the only one that survived.

So the code is plumbed from the throw site through: `BlockedError` takes a `code`,
`spine.js` passes it to `queue.block()`, `queue.block()` records it.

| `blockedBy` | Means | Your UI |
|---|---|---|
| `review` | The normal pause. A person watches it and approves. | "Ready for you · Approve" |
| `post-render-check` | A judge flagged a **finished, already-paid-for** video. | Your amber card. This is the one. |
| `spend-approval` | The run wanted to buy art and had no budget. Nothing was rendered. | Not ready — do not offer Approve |
| `upload` | YouTube credentials, quota, or a missing deliverable. | Ours to fix, not the instructor's |
| `produce-input` | `beats.js` missing. A build problem, not a review. | Ours |
| `nazim` | The NAZIM bridge, still unimplemented. | Ours |
| `interrupted` | A restart killed it mid-build. Approving means "rebuild", ~$1.50. | Say that it costs |

Seven, not the six we first sketched — `produce-input` exists because **every** throw site
now carries a code. That matters for your default: `'review'` is written by `queue.block()`
and again in the projection, so it only ever appears on lessons blocked *before today*.
Nothing new relies on the fallback, and no currently-blocked lesson changes meaning.

`awaitingApproval[]` carries `blockedBy` too, since that is the array your screen reads.

---

## 3 · You asked one question and it was not answerable. Here is why, and what we did

Your table put `$1.50` against `$0.598` and asked which is real. The honest answer is that
**they are both honest numbers about different things, and neither is the whole cost.**

`spendUsd` — the `$0.598` — counts art, speech and animation. It is written by exactly four
calls, all in `produce.js`. It has never counted a single model call. Research, script, gate
and qa each run Opus; `eval-text.js` and `qa-art.js` each run Gemini, once and once-per-image.
Roughly four Opus calls and fifteen Gemini calls per clean lesson, none of them in any total
we have ever quoted you. `$1.50` was a planning figure covering everything; `$0.598` was a
measurement covering part. Nobody was wrong and the two were never comparable.

**What we changed today.** Model spend is now recorded on the run (`kind: 'model'`), priced
from the usage the API already returns and from the `total_cost_usd` the `claude -p`
envelope already carries — both of which were being read and thrown away, including a
second envelope discarded silently on every JSON-repair call. A run now reports `spendUsd`,
`spendMediaUsd` and `spendModelUsd`.

**The budget gate still measures media only.** Deliberately, and there is a test pinning it:
`PIPELINE_BUDGET_USD` is a ceiling on what a video *buys*, and folding token spend into that
comparison would eat headroom sized for art and silently ship a stills-only video
(`produce.js` downgrades to stills rather than failing when room runs out). That failure
mode would have been invisible.

**What we can tell you now, and what we cannot:**

- Measured **media** spend across completed runs: **$0.56 – $0.64**. `$0.598` sits in the
  middle of it. Your lesson was not unusually cheap.
- It is **not a flat figure**. Animation is `$0.05/second`: one 15-second animated beat is
  `$0.75`, more than an entire still-only lesson. A lesson with several moving beats costs
  multiples of one without. Number of art beats (`$0.04` each) is the linear floor; TTS is
  under 5% of the bill; a redraft re-buys only the changed beats, so retries cost cents.
- **Model spend has no measured figure yet.** The counting shipped today; the number comes
  from the next real lesson.
- Gemini sensor spend is still uncounted — those run as child processes that discard their
  `usageMetadata`, and no Gemini rate is written down anywhere in this service. Small next to
  Opus, not zero. We would rather say so than put a number we cannot source in front of you.

**So: stay at $1.50.** You said you would rather over-hold than under-hold and that is the
right call for at least one more lesson. When the next run reports both halves we will send
you a figure with the breakdown, and you can move the dialog once rather than twice.

---

## 4 · `runs.jsonl` now survives a redeploy

Done as you asked, and for the reason you gave — a handle that outlives what it points at is
worse than no handle. `state.appendRunLog()` writes the same row to `.beads` and to the job
store, mirroring `publish-log.js`'s two-source read, each in its own try/catch so a missing
volume cannot fail a run. `scripts/diagnose-course-lesson.js` reads both.

One thing you did not ask for and should know: **the row also carries `series` now.** It
logged `slug` alone, so a cost record could not be joined back to the lesson it described —
which would have defeated the point of keeping it durably. A row now has `<series>/<slug>`,
the same key as `path`.

Rows written before today existed only on the container filesystem. Any that a redeploy has
already taken are gone; we are not going to pretend otherwise.

Routing course runs through the ledger that `/demo/spend` folds is still the real fix and
still not in this round.

---

## 5 · `POST /courses/:courseId/lessons/:lessonId/requeue`

Built over `queue.requeue()`, with both rules you asked us to enforce rather than trust you
on: **nothing in this service calls it** — the route is the only caller, and no automatic
path reaches it — and it **refuses anything that is not `failed`** (409, naming the status it
found). A lesson waiting for a person must be approved or rejected, not retried.

`queue.requeue()` was not safe to expose as it stood, and this is the part worth reading:
the queue fold never deletes a key, so **a lesson that was approved, rendered, and then
failed still carried `reviewApproved`.** A bare status flip back to `queued` would have
resumed it straight past human review and published a video nobody watched. The requeue now
clears `reviewApproved`, `interrupted`, `error`, `reason` and `blockedBy` — in the primitive,
not the caller, so there is one place it is right. There is a test for exactly that sequence.

Two more things we fixed while in there, neither of which you asked for:

- **`reject()` had no status guard at all.** A lesson already published could be marked
  failed after the fact, leaving your record and the catalogue disagreeing. It now refuses
  a `done` lesson.
- **None of `approve`/`reject`/`requeue` checked the course.** The `lessonId` alone was
  enough, so any known lesson could be published or failed through *any* course's endpoint.
  All three now verify the lesson carries the `[courseId]` tag, the same predicate
  `GET /courses/:courseId` filters on. If you were relying on the looser behaviour anywhere,
  this will start returning 409 — we do not think you were, but say so if we are wrong.

---

## 6 · Yes. A partial build is supported, and here is exactly why

Confirmed, and confirmed against the code rather than from memory, since you are designing
on the answer.

`confirmLessons` is **a count comparison and nothing more** (`api.js:374`):
`body.confirmLessons !== lessons.length`, where `lessons` is flattened from the plan **in
that same request body**. Nothing from `/courses/plan` is persisted — no hash, no nonce, no
signature, no server-side copy. `plannedAt` is never verified and can be omitted.

So both halves of your question are fine:

- **A subset passes trivially.** Send 3 of 8 lessons with `confirmLessons: 3` and you build
  3. The plan does not have to be byte-for-byte what `/courses/plan` returned, and the 409
  even tells you the number to echo back.
- **Several `courseId`s per LMS course is fine.** `courseId` is minted per build
  (`api.js:394`) and nothing outside that one response depends on it.

We are not going to add validation that breaks this. If we ever want to bind a build to the
plan it came from, you will get the contract change first.

**One caveat, which is ours and which you should design around.** A lesson belongs to a
course by a **substring match on free text**: `api.js:400` writes `[${courseId}] ${l.brief}`
into `notes`, and the GET filters on `notes.includes('[courseId]')`. A lesson `brief`
containing another course's tag would make that lesson appear in both courses. Nothing
generates such a brief today, but nothing prevents one either — it is a model writing prose
into a field we then parse. Keep your table the authority on which lessons belong to which
course, exactly as you said you would. Pin your test; we will pin ours.

---

## 7 and 8 · Still open, and still ours

Neither of these moved today, and we are not going to report them as though they had.

**§7 — the held video.** Yes, it should be published unlisted and the URL and
`youtubeVideoId` sent to you. Your reason for wanting it is the right one: a real `done`
row, a real `path`, real checkpoints, instead of a fixture that only proves the fixture.
This needs Aroma.

**§8 — the token.** You are right that it is first by severity. It is a credential
authorising real spend and publication to a shared channel, it has been in git history since
the handoff, and everything else in both documents costs less than it does. It needs Aroma,
and a rotation costs you one redeploy. Also still open and unchanged: `TENANTS_JSON` so you
are off the shared `default` tenant, a monthly ceiling on it, and `series` → module mapping.

---

## What changed, in files

| File | Change |
|---|---|
| `server/lib/api.js` | `path`/`youtube`/`youtubeVideoId` on `done`; `blockedBy` on `blocked`; requeue route; `courseId` passed to approve/reject |
| `orchestrator/lib/queue.js` | `block()` records `blockedBy`; `requeue()` clears the stale keys |
| `orchestrator/lib/spine-errors.js`, `spine.js`, `stages/*.js` | `BlockedError.code`, set at every throw site, carried to the queue |
| `server/lib/course-worker.js` | `requeue()`; status guard on `reject()`; course-ownership check on all three; `blockedBy` in `awaitingApproval` |
| `orchestrator/lib/state.js` | Run log written to the job store as well, and carries `series`; spend split by `kind` |
| `orchestrator/lib/prices.js` | New — per-token pricing, so a model call can be costed |
| `orchestrator/lib/llm.js`, `llm-cli.js`, `stages/{research,script,gate,qa}.js` | Model spend recorded instead of logged and dropped |

`npm test` — 172 + 32 + 34 passing, including new tests for each of the above. One of them
caught something on the way in: a first draft of the requeue test took the happy path, and
because a successful requeue kicks the worker, `npm test` started a **real** spine run and
spent real model calls. The test now exercises the refusals only, and the clearing is
checked against `queue.requeue()` directly where nothing can start building.
