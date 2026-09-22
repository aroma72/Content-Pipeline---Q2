---
type: reference
last_verified: 2026-09-22
owner: aroma
---

# Content Automation API — integration reference

**For:** the Cohort 2 LMS engineering team
**Service:** `https://content-queen-production.up.railway.app`
**Verified against the live service on 2026-09-22.** Every response shape below was fetched from
production, not read off the source.

---

## 0. Read this first

You built your client by reading our repository, because the handoff document we said we sent never
arrived. That was our failure, and this document is the replacement. Three things you are currently
carrying are **out of date**, and one of them is a security warning you can now drop:

| What your client says today | What is true now |
|---|---|
| *"APPROVE IGNORES `:courseId`. A lesson id is a credential."* | **Fixed.** `notThisCourse()` is the first check in approve, reject *and* requeue. A lesson id from another course now returns `409`, not a publish. |
| *"`blockedBy` … a 9-value constant"* | It is **10**. `qa-no-evidence` was added. |
| *"Include external content suggestions — not available yet"* | Built and wired as `references: true`. See §9 for the one condition still outstanding. |

**Do not pin your tests to this document.** Pin them to `GET /api/v1`, which publishes the live
endpoint list and the live `blockedBy` array. A document drifts silently; that array cannot.

---

## 1. Base URL, authentication, and the two ownership models

There are two surfaces with two different auth models. They do not interoperate.

### `/api/v1/*` — tenant token only

```
Authorization: Bearer <token>
```

`X-Api-Key: <token>` is accepted as a convenience for curl. This is the surface your server calls.

- **No credential configured on our side** → `503 {"error":"api_not_configured"}`
- **Bad or missing token** → `401` with `WWW-Authenticate: Bearer realm="content-queen"`
- Tokens must be at least 24 characters. Two tenants sharing a token causes **both** to be refused.

### `/demo/*` — tenant token *or* a browser cookie

Used by the Make a Video screens. A signed `cq_owner` cookie (`Path=/demo`, `HttpOnly`,
`SameSite=Lax`, 30 days) identifies an anonymous browser session; a tenant token always wins over
it. The cookie exists for exactly two routes that a browser navigates to directly and so cannot
send an `Authorization` header: `script.md` and `video`.

Anything that **spends money or publishes** requires a real token, never the cookie.

### CORS

Allowlist only, never a wildcard. Send us the origins you need and we add them to
`CONTENT_API_ORIGINS`. `OPTIONS` always returns `204`.

> **Known gap:** `Access-Control-Allow-Methods` currently omits `DELETE`, so a **browser** preflight
> for `DELETE .../file` fails. Server-to-server calls are unaffected. We are fixing this.

---

## 2. The Course Builder flow

This is the surface behind your "Build with AI" screen.

```
POST /api/v1/courses/plan      (free, one model call)
   |
POST /api/v1/courses/build     (SPENDS — queues every lesson)
   |
GET  /api/v1/courses/:courseId (poll, free)
   |
POST .../lessons/:lessonId/approve | /reject | /requeue
   |
GET/DELETE .../lessons/:lessonId/file    (archive the bytes your side)
```

**Courses build ONE lesson at a time and pause after each one until a human approves it.** This is
the single most important operational fact: a ten-lesson course is not a ten-lesson job, it is ten
sequential builds each gated on a person. Plan for days, not hours.

### 2.1 `POST /api/v1/courses/plan`

Free apart from one model call. **Slow — allow 300s**; a ten-lesson plan measured 105 seconds, and a
timeout throws away a plan we already produced and charged for.

```json
{ "topic": "required", "audience": "optional", "duration": "optional free text", "description": "optional" }
```

Returns the plan, plus `request`, `estimate` and `plannedAt`. Per-lesson estimate constants:
**$1.50** and **30 minutes**; a lesson video is ~2.5 minutes.

The plan schema is strict (`additionalProperties: false`):

```
title, summary, audience, protagonist_scenario, modules[]     (+ assumptions[])
  modules[].title, summary, lessons[]
    lessons[].title, slo, difficulty, brief, question
      difficulty : novice | intermediate | advanced | expert
      question   : { stem, options[exactly 4], correctIndex 0..3, explanation }
```

`protagonist_scenario` is the one running story the whole course follows. Our house rule is a single
invented protagonist, **always named Ali**, followed in depth — not a list of examples. Show it to
the instructor: it is the cheapest way for them to notice the plan misread the brief.

Errors are always `{"error":"plan_failed"}`; only the status varies (`400` no topic, `502` no
modules, `500` otherwise).

### 2.2 `POST /api/v1/courses/build` — spends real money

```json
{ "plan": { }, "confirmLessons": 10, "series": "my-course", "references": false }
```

| field | required | notes |
|---|---|---|
| `plan` | yes | must have `modules[]`. **An authored plan is a first-class input** — you do not have to call `/plan` first. |
| `confirmLessons` | yes | must **exactly** equal the plan's lesson count, or `409` |
| `series` | yes | `^[a-z0-9][a-z0-9._-]*$`. Never guess it — a wrong one files a course in the wrong place and is only noticed after the spend. |
| `references` | no | `true` adds verified external links. See §9 before enabling. |

**The confirmation handshake.** Send without `confirmLessons`, or with the wrong count, and you get
a `409` carrying the estimate — free, and nothing is queued:

```json
{ "error": "confirmation_required",
  "message": "This will build 2 videos, costing about $3 and taking about 60 minutes. Re-send with \"confirmLessons\": 2 to start it.",
  "lessons": 2,
  "estimate": { "lessons": 2, "estimatedCostUsd": 3, "estimatedBuildMinutes": 60, "estimatedWatchMinutes": 5, "note": "..." } }
```

Success is `202`:

```json
{ "courseId": "course-mub7whoa", "series": "...", "queued": 10,
  "items": ["<series>/<slug>"], "rejected": [{"title": "...", "reason": "..."}],
  "status": "https://.../api/v1/courses/course-mub7whoa", "note": "..." }
```

**There is no `Idempotency-Key` on this route.** You already handle this correctly — treat an
in-flight failure as `unknown` and never auto-retry. What we can add is how to *diagnose* it: a
duplicate build returns `202` with a **new `courseId`**, `queued: 0`, and every lesson in
`rejected[]` with an "already in the queue" reason. Nothing is double-bought. So if you must find
out what happened, re-`POST` and read `queued` — `0` means the first one landed.

Other refusals: `503 no_durable_store` (we cannot record course state, so a course could not be
resumed — do not retry), `400 bad_request` (bad plan or bad series).

**Course membership is a substring match on a free-text `notes` field.** We write
`[<courseId>] <brief>` and match on `.includes('[<courseId>]')`. So **no text you send may contain a
`[course-...]`-shaped string.** You already validate this. It is a real constraint, not a quirk, and
it is on our list to replace with a structured field.

### 2.3 `GET /api/v1/courses/:courseId` — poll this

Free. **Poll every 30–60 seconds**; there is nothing faster to observe, and while
`awaitingApproval` is non-empty nothing is building or spending, so you can back off to minutes.

There is **no ETag, no `updatedAt`, no version** on this route. Diff the payload keyed on `item.id`.

```json
{ "courseId": "course-mub7whoa",
  "lessons": 2, "done": 0, "failed": 0, "blocked": 1, "inProgress": 1,
  "spentUsd": 5.4799,
  "awaitingApproval": [ { "id": "...", "topic": "...", "reason": "...", "blockedBy": "..." } ],
  "worker": { "building": null, "queued": 3 },
  "items": [] }
```

`worker.building` is the field that distinguishes a **stalled** build from a slow one. If it is
`null` and nothing is awaiting approval, nothing is happening.

**Item fields are conditional on status.** This is not cosmetic — our queue is a shallow fold that
never deletes keys, so we gate each field on the status it belongs to, and you should mirror that.
From a live response today:

```
always:          id, topic, status, module, runId
status=failed:   error
status=blocked:  reason (free prose), blockedBy (closed set)
status=done:     path, youtube, youtubeVideoId, references
when known:      spendUsd, spendUsdTotal,
                 spendMediaUsd, spendModelUsd,
                 spendMediaUsdTotal, spendModelUsdTotal
```

`path` equals the item id and is the key into `GET /api/v1/videos`.

### 2.4 approve / reject / requeue — and what each one costs

All three are `POST`, and all three take `:lessonId` as a **wildcard containing slashes**. Send it
**unencoded**: `/lessons/evals-and-harness/what-a-harness-actually-is/approve`.

All three now verify the lesson belongs to `:courseId` and return `409` if it does not.

| route | body | precondition | **cost** |
|---|---|---|---|
| `/approve` | `{"by":"name"}` | status `blocked` | **$0** — the run resumes from where it stopped. The render is *not* repeated. |
| `/reject` | `{"why":"..."}` | anything not `done` | $0. **The course stops here**; nothing after it is built. |
| `/requeue` | `{"by":"name"}` | status `failed` **only** | **~$1.50 — a full new render.** The previous attempt bought nothing that survives. |

Always send `by`. It defaults to `"Aroma"`, and an approval recorded against the wrong name is not
an audit trail.

`202` on success. `409 {"error":"cannot_approve"|"cannot_reject"|"cannot_requeue"}` otherwise —
unknown lesson, wrong course, and wrong status all share the status code and differ only in
`message`, so pass our message through rather than inventing one.

**One special case worth handling in your UI.** If a lesson is blocked with
`blockedBy: "interrupted"`, the container died mid-render and the working files are gone.
Approving it means *"yes, rebuild it"* — it costs ~$1.50 and ~30 minutes, and it will block at
review again once the video really exists. Label that button differently.

### 2.5 `GET` / `DELETE /api/v1/courses/:courseId/lessons/:lessonId/file`

This is the pre-publication preview you asked for, and it is served **from the durable volume, never
from the render directory** — so it does not race a deploy you cannot see.

- `200` / `206` `video/mp4`, full `Range` support (`Accept-Ranges`, `Content-Range`, `416`).
- `404 no_such_lesson` — unknown, or not in this course.
- `404 no_deliverable` — the message distinguishes *"finished, but no durable copy was kept"* from
  *"this lesson is '<status>', so there is no finished video yet."*

`DELETE` drops our copy once you have stored yours. **We never infer it from a successful GET** — a
download that failed halfway would otherwise destroy the last remaining copy, which is the exact
failure that lost `what-a-harness-actually-is` on 2026-09-21.

Suggested flow: `status: done` → `GET .../file` → store your side → `DELETE .../file`.

---

## 3. Make a Video — the single-video job routes

Your Make a Video screen. Different surface, different auth (§1).

| route | auth | notes |
|---|---|---|
| `POST /demo/make-video` | none (cookie minted) | `{topic, notes?, callbackUrl?}`. `topic` truncated to 300 chars, `notes` to 2000. Free — writes a script only. |
| `GET /demo/make-video/:jobId` | owner | full job state including the gated script and per-beat data |
| `POST /demo/make-video/:jobId/claim` | token **and** the original cookie | converts an anonymous job to yours |
| `POST /demo/make-video/:jobId/produce` | token, `produce` scope | **spends.** Accepts `Idempotency-Key`. |
| `GET /demo/make-video/:jobId/script.md` | owner | human-readable script, `text/markdown` |
| `GET /demo/make-video/:jobId/video` | owner | the mp4, Range-capable |
| `POST /demo/make-video/:jobId/approve` | token, `approve` scope | **publishes to YouTube** |
| `GET /demo/jobs` | token | change feed — see below |
| `GET /demo/spend` | token | tenant ledger |

**`Idempotency-Key` on produce** is the one place we have it. `^[A-Za-z0-9_.:-]+$`, at most 200
characters, silently ignored if malformed. Same key with a different body gives
`409 idempotency_key_reuse`. A replay returns the stored response with `Idempotency-Replayed: true`.
Even **without** a key a duplicate is safe: if the job is already producing or published you get
`202` with `"idempotent": true`, never a second paid run.

Rate limits on produce: 20/hour and 60/day per tenant, `429` with `X-RateLimit-*` and
`Retry-After`. A monthly ceiling returns **`402 tenant_budget_exhausted`** — `402` not `429`,
because retrying will never help.

**`GET /demo/jobs` is the correct polling primitive** if you hold many jobs. It is **ascending** by
`(updatedAt, id)` on purpose — descending plus `since` silently drops jobs that transition
mid-page. Use `?since=` and the opaque `nextCursor`.

---

## 4. Checkpoints and the catalogue

`GET /api/v1/videos` and `GET /api/v1/videos/:videoId/checkpoints` **support ETag/304** and
`Cache-Control: max-age=60`. Send `If-None-Match`; you will mostly get `304`s.

Two rules that matter for the player:

1. **`questionStyle` is `popup` or `on-screen`**, and the flags come as a locked pair. A popup
   checkpoint is `pausesVideo:true, requiresAnswer:true, blocking:true, allowSkip:false`. An
   on-screen one is the exact inverse plus `onScreenUntilSeconds`. Never mix them.
2. **If `timing.introOffsetSource` is `assumed`, `timing.trusted` is `false` — do not fire those
   checkpoints.** The timing is a guess and the question will land in the wrong place.

`atSeconds` **includes** the brand-bumper intro offset and is measured against
`<slug>_final.mp4`. `lessonAtSeconds` excludes it. Use whichever matches the file you are playing.

`durability` on a catalogue row is `committed | ephemeral | unknown` — **bind an LMS block only to
`committed`.**

`POST .../attempts` returns `501` on purpose. The LMS owns the learner and the gradebook; we hold no
learner identity and will not accept attempts into an endpoint that would drop them.

---

## 5. States, and the ten `blockedBy` values

**Lesson (queue item) status:** `queued` → `claimed` → `done` | `failed` | `blocked`.
There is no `running` and no `awaiting_review` here — `claimed` means building, and
**`blocked` with `blockedBy: "review"` is the awaiting-review state.**

**Job status:** `running` → `written` → `producing` → `awaiting_review` → `publishing` →
`published`, plus `failed` and `interrupted`. A failed produce returns the job to `written`.

### `blockedBy` — live values as of 2026-09-22

| value | meaning | money spent? | what to do |
|---|---|---|---|
| `review` | Ordinary case: a person must watch it. | yes, in full | **approve** — costs $0 |
| `preflight` | The container cannot render at all. A broken deploy, not a bad video. | **no** | tell us; requeue only after we fix it |
| `spend-approval` | Estimated cost exceeds the budget. | **no** | raise the budget, then requeue |
| `produce-input` | `beats.js` missing; produce could not start. | **no** | requeue |
| `post-render-check` | A sensor disagreed with the finished render. | yes, in full | a human decision; requeue re-spends |
| `qa-no-evidence` | Not one rubric factor could be assessed. | yes, in full | human |
| `upload` | YouTube refused — consent, credentials, API, or quota. | yes, in full | fix the cause, then approve (not requeue) |
| `interrupted` | The container restarted mid-build; working files are gone. | partially, amount unknown | approve means **rebuild**, ~$1.50 |
| `time-ceiling` | The run hit the wall-clock ceiling (default 180 min). | usually yes | human; the cause usually recurs |
| `nazim` | The LMS content-write hand-off, which is not built. | yes | unreachable in normal operation |

`blockedBy` defaults to `review` when a block predates the field, so treat `reason` as corroborating
prose only.

---

## 6. Money

Two axes, and they are **different axes**. Your client conflated them once, so, explicitly:

- `spendUsd` vs `spendUsdTotal` — **this attempt** vs **accumulated across retries**.
  Settle against `spendUsdTotal`.
- `spendMediaUsd` vs `spendModelUsd` — **art and speech** vs **tokens**. The budget gate measures
  media only, so that a few model calls cannot silently downgrade a video to stills.

`*Total` variants exist for both. **An absent field means unknown, not zero** — lessons settled
before the split shipped cannot be back-filled.

A course total is the sum of `spendUsdTotal`.

**`GET /demo/spend` structurally cannot see course spend.** The tenant ledger is built from job
records; a course creates queue items. Reporting `0` there is not evidence that nothing was spent. A
course's cost is visible only on `GET /api/v1/courses/:courseId`.

Real figures from a completed run on 2026-09-22: **$2.1557** for a 2.42-minute lesson — 12 images at
$0.04, 19 TTS clips at $0.002, and 5 animated beats at **$0.05 per second**. Motion is the variable:
a stills-only lesson is about $0.60. The $1.50 estimate is an average, not a cap.

---

## 7. Callbacks, and why you are right to poll

`callbackUrl` exists on `POST /demo/make-video` **only**. There is no course callback, which is why
your poll worker is correct as written.

> **Live status: callbacks are DISABLED in production.** `WEBHOOK_ALLOWED_HOSTS` is unset, so any
> `callbackUrl` you send today is refused with `400 bad_callback`. Tell us the host you want and we
> will allowlist it.

When enabled, the event body is deliberately minimal — a nudge to re-`GET`, not a payload:

```json
{ "type": "job.status_changed", "jobId": "...", "status": "...", "stage": "...", "at": "..." }
```

Signed as `x-cq-signature: v1=<hex>`, an HMAC-SHA256 over `"<unix-seconds>.<raw-body>"`, alongside
`x-cq-timestamp` and `x-cq-delivery`. Reject a timestamp more than five minutes off your own.
Delivery is at-least-once, up to 3 attempts with 1s/10s/60s backoff, and **unordered** — a retried
`producing` can arrive after `awaiting_review`. It fires only on a **status** change, never a stage
change.

---

## 8. Timing — what to tell an instructor

| stage | typical |
|---|---|
| research + script + gate | ~2 minutes |
| **produce** (art, speech, render) | **30–80 minutes** |
| qa | ~15 seconds |
| upload | ~6 seconds |

A run may rewrite its own script up to 6 times if its reviewers reject it, which is why the spread
is wide. There is a hard wall-clock ceiling of 180 minutes.

**A course pauses for a human after every lesson.** A ten-lesson course is realistically a
multi-day activity. Do not build a progress bar that implies otherwise.

---

## 9. External content suggestions — the toggle in your form

`references: true` on `/courses/build` is built, wired, and careful:

1. a real web search,
2. a structuring pass,
3. **every URL is fetched and confirmed to resolve** before it is returned.

This honours the condition you attached: *two verified references beat five unverified ones.*
Anything that does not resolve is dropped. At most **3** survive. The stage is fail-soft and gets a
single attempt — **a reference list can never fail or delay a build.** If the search fails you get
no references and a normal video.

On a finished lesson you get:

```json
"references": [ { "title": "...", "url": "...", "why": "one sentence", "kind": "docs|talk|paper|article" } ]
```

**Absent `references` means none were verified — never that none were sought.**

### Status: working, pending our deploy

Full disclosure, because it affects when you flip the switch. Until today this returned an empty
list on **every** lesson: the search needed an API credential our production environment does not
hold, and the stage fail-softs, so it failed silently rather than loudly. That is fixed — the search
now runs through the same subscription the rest of the pipeline uses, verified inside the production
container on 2026-09-22.

A real run on that path, end to end:

```
searched the web 4 time(s)
4 proposed -> 4 resolved -> 3 kept
dropped: 1 reference whose "why" was an essay, before any fetch
```

and on an earlier run, a URL that redirect-looped was dropped for exactly the reason intended.

**Enable the toggle once we confirm the deploy is live.** We will tell you, and we will send the
output of a real course lesson with `references: true` so you can see the shape before you render
it.

---

## 10. Known gaps — ours, and what we are doing about them

Stated plainly so you can design around them.

1. **`POST /demo/course-builder/build` is unauthenticated and spends real money.** It is a demo
   route guarded only by one-build-per-hour, in-process, which a redeploy resets. **Do not call it.**
   We are gating it.
2. **Scopes are not enforced on `/api/v1`.** `approve` (publishes to YouTube) and `requeue` (spends)
   check the token but not the scope. Being fixed.
3. **Courses never reach the tenant ledger**, so there is no per-tenant monthly ceiling on the one
   route that spends ~$1.50 × N. Your own `CONTENT_QUEEN_MAX_PLATFORM_USD_PER_MONTH` is currently
   the only ceiling. We are adding ours.
4. **No `Idempotency-Key` on `/courses/build`.** See §2.2 for the diagnosis path.
5. **Course membership is a substring match on free text.** To be replaced with a structured field.
6. **CORS omits `DELETE`.** Browser preflight for the file delete fails; server-side is fine.
7. **`reason` strings currently come back mojibake** (a doubly-encoded em dash, and similar). They
   are UTF-8 double-encoded somewhere in our capture path. If you render them to instructors, expect
   that until we fix it.
8. **Rate limits are in-process** and reset on redeploy.
9. **`GET /courses/:courseId` 404s do not distinguish** "unknown id" from "lost to a redeploy" —
   read the `durability` field in the 404 body to tell them apart.

---

## 11. Health, and what to check before starting anything expensive

- `GET /api/v1/health` — cheap liveness.
- `GET /health` — `jobStore.durability` and `courses.durability` must both be **`volume`**. Anything
  else means a build could not be resumed. It also reports whether webhooks are on.
- `GET /health/render` — **launches a real browser** and shells out, so it takes a second or two.
  `200` means this container can actually render; `503` means a run would buy art and speech and
  *then* fail. Do not use it as a liveness probe.

Live as of 2026-09-22: `jobStore` and `courses` both `volume`; `/health/render` returns `200`.

---

*Questions, or a field you need that is not here — ask. This document is maintained alongside the
service, and `GET /api/v1` is the machine-readable version of it.*
