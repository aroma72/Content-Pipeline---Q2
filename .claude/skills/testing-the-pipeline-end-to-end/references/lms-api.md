# The LMS-facing API

## Contents
- Base URL, auth, errors
- Course API (`/api/v1`)
- Single-video API (`/demo/make-video`)
- Catalogue and checkpoints
- Health and operator routes
- Statuses and `blockedBy`
- Money: reservations, budgets, spend fields
- Authoritative docs

## Base URL, auth, errors

- Production: `https://content-queen-production.up.railway.app`. `contractVersion` is `1.2`,
  shown on `GET /api/v1` and `/health`.
- Send `Authorization: Bearer <token>` (`x-api-key` is also accepted).
- `CONTENT_API_TOKEN` is the `default` tenant: unmetered unless `DEFAULT_TENANT_MONTHLY_USD` is set,
  and the **only** tenant with the `admin` scope.
- `TENANTS_JSON` entries carry `id`, `name`, `token` (≥24 characters), `monthlyUsd`, `maxRunUsd`,
  `limits`, `scopes` (default `produce`, `approve`, `catalogue`) and `webhookSecret`. The LMS
  tenant is `cohort2-lms`.
- Errors: 401 means a wrong token, 403 a missing scope, and 503 that no credential is configured
  or the store cannot record spend.
- Rate limits come from `TENANT_PRODUCE_PER_HOUR`, `TENANT_PRODUCE_PER_DAY` and
  `TENANT_APPROVE_PER_HOUR`.

## Course API (`/api/v1`)

Every route below needs a token.

| Method + path | What it does | Spends |
|---|---|---|
| `POST /courses/plan` `{topic, audience?, duration?, description?}` | Returns a plan (`title`, `modules[].lessons[]` with `title`, `slo`, `difficulty`, `brief`, `question`) plus `estimate` | one model call |
| `POST /courses/build` `{plan, series, confirmLessons}` | Queues lessons and reserves $2.50 per lesson. Returns 409 when `confirmLessons` ≠ the lesson count, 400 `invalid_plan`, 402 `tenant_budget_exhausted`, 503 when the store is not durable | model calls until script-approval |
| `POST /courses/worker/resume` | Restarts the worker after a boot | $0 |
| `GET /courses/:courseId` | Progress, plus `items[]`: `id` (`series/slug`), `status`, `blockedBy`, `reason`, `error`, `runId`, `scriptSha`, `deliverableAvailable`, `saved2drive`/`driveUrl`, `spend*` | $0 |
| `GET .../lessons/:lessonId/script` | Script JSON: `sha`, `awaitingApproval`, `beats` (a summary), `checkpoint`, `beatCount` | $0 |
| `GET .../script.md` | The same script as markdown | $0 |
| `GET .../beats` | `beats.js` **as source text**, plus `durations.json`. Evaluate it in a `vm` sandbox, never with `require` | $0 |
| `POST .../script/approve` `{by, sha}` | Approves the script; 409 if `sha` is stale | starts the paid render |
| `POST .../script/revise` `{why, by}` | Redrafts the script with the notes | one model call |
| `POST .../approve` | Publishes and releases the next lesson | YouTube upload |
| `POST .../reject` `{why, by}` | Stops the course; its queued lessons become failed | $0 |
| `POST .../skip` | Drops a failed lesson | $0 |
| `POST .../requeue` | Renders the lesson again | **spends** |
| `GET .../file` | Streams the mp4 (Range supported), or returns 200 JSON `{saved2drive, driveUrl, driveFileId, md5, verified, …}` once offloaded, or 404 `no_deliverable` | $0 |
| `DELETE .../file` | Drops our copy. On an offloaded lesson it keeps `drive.json`, `beats.js` and `durations.json` | $0 |
| `GET /deliverables` | What the volume holds, with sizes | $0 |

`:lessonId` contains a `/`. The route pattern is `(*)`, so the script routes are registered before
approve/reject, or `/a/b/script/approve` would match `/approve`.

## Single-video API (`/demo/make-video`)

| Method + path | What it does |
|---|---|
| `POST /demo/make-video` `{topic, notes?, callbackUrl?}` | 202 `{jobId, status, owner}`. Writes and gates a script. An empty topic is 400. `callbackUrl` needs a tenant token |
| `GET /demo/make-video/:jobId` | The job, visible to its owner only. `script.beats` is a **summary** (no `quiz`, no `motion`); `script.beatsFull` is what gets rendered; `script.checkpoint` is the question; also `produce`, `catalogue.checkpointsUrl`, `lastError` |
| `POST .../claim` | Hands an anonymous browser job to the tenant |
| `POST .../produce` + `Idempotency-Key` | Spends. 202 `{jobId, status:'producing', budgetUsd, spendRef}`. A retry with the same key is replayed (`Idempotency-Replayed: true`). Returns 402 if the month cannot cover this video's estimate, 409 `not_ready` or `script_lost` |
| `GET .../script.md` | The script as markdown |
| `GET .../video` | The mp4, or 200 Drive JSON once offloaded, or 404 before produce |
| `DELETE .../video` | Drops our copy |
| `POST .../approve` | Publishes to YouTube |
| `GET /demo/jobs`, `/demo/spend`, `/demo/videos`, `/demo/videos/:slug/file` | Tenant-scoped listings. `/demo/spend` shows the month, spent, remaining and a `courses` block |

## Catalogue and checkpoints

- `GET /api/v1/videos` lists `videos[]` with `videoId` (the slug).
- `GET /api/v1/videos/:videoId/checkpoints` returns `checkpoints[]` with `atSeconds` (measured from
  the start of the **delivered, bumper-wrapped** file), the question, the options and the feedback.
  It sends an ETag. `sample` is a fixed example.
- `POST /api/v1/videos/:id/checkpoints/:cp/attempts` always returns **501**, on purpose: the LMS
  owns learner answers.

## Health and operator routes

- `GET /health`: `ok`, `build.commit`, `jobs.inFlight`, `jobStore`, `courses.worker`,
  `storage.{deliverables, driveOffload, memory}`, `tenants`, `webhooks`. Returns 503 when not ok.
- `GET /health/render`: preflight, i.e. whether this container can render. 200 or 503.
- `POST /api/v1/admin/reset`: admin scope only. Needs nothing in flight, `confirm` echoing the live
  counts, a `because`, and `dryRun:false`. Use `scripts/reset-production-state.js`, and tell the
  LMS first.

## Statuses and `blockedBy`

- **Course lesson** `status`: `queued`, `claimed`, `done`, `failed`, `blocked`.
- **`blockedBy`** (all 11 are published on `GET /api/v1`): `preflight`, `review` (the default),
  `script-approval`, `post-render-check`, `spend-approval`, `produce-input`, `upload`, `nazim`,
  `interrupted`, `time-ceiling`, `qa-no-evidence`.
  - `status` together with `blockedBy`, not `blockedBy` alone, says where a lesson waits. The queue
    never deletes a key, so a claimed lesson can still carry the last pause's `blockedBy`.
- **Single-video job:** `running` → `written` → `producing` → `awaiting_review` → `publishing` →
  `published`. Also `failed`, `rejected`, `blocked`, `done`, `interrupted`.
  - The terminal states are `published`, `failed` and `rejected`.
  - On restart, `producing` becomes `interrupted` (resumable); `running` and `publishing` become
    `failed`.
  - A failure that does not end the job is recorded in `lastError`.

## Money

- **Course:** `POST /courses/build` reserves `PIPELINE_COURSE_LESSON_RESERVE_USD` ($2.50) per
  lesson, held through the script pause. The run's media budget is
  `min(PIPELINE_BUDGET_USD, tenant.maxRunUsd)`.
- **Single video:** the run budget is `min(PIPELINE_MAX_APPROVABLE_USD, tenant.maxRunUsd, month
  remaining)`, via `server/lib/ledger.js` `capToMonth`. It refuses with 402 only when this video's
  own estimate (`produce._internals.estimateSpend`) does not fit.
- **Unit prices** (`produce.js` `COST`): image $0.04, TTS clip $0.002, animation $0.05 **per
  second**, billed in 5/10/15 s buckets.
- **Course spend fields:**
  - `spendMediaUsdTotal` is art, TTS and animation.
  - `spendModelUsdTotal` is the LLM calls. With the `claude` CLI backend these count against the
    subscription plan, not dollars.
  - `spendUsdTotal` is both.
- **Single-video spend:** `produce.spendUsd`.

## Authoritative docs

Link to these rather than copying them:

- `docs/integration-requests/2026-09-22-content-automation-api-reference.md`: the reference the LMS
  builds against. §11 lists the health checks to run before anything expensive.
- `docs/contracts/course-api-v1.2.md` and `docs/CONTRACT-CHANGELOG.md`: the versioned contract.
- `docs/SERVICE_DURABILITY_AND_CONTRACTS.md`: durability, §4a Drive offload, §6 operating.
  Its §6.1 deploy text is stale; see lessons-for-testing.md.
