---
type: reference
last_verified: 2026-09-23
owner: Aroma Tahir
---

# Content Queen — durability, the question contract, and how to operate it

What was built on 2026-09-18, how it works, and how to run it. Measured against
the live service at commit `eda63c8`, not asserted from the source.

Scope: the `server/` HTTP surface that Taleemabad University's LMS consumes, the
course-building pipeline behind it, and the operational rules that keep both
honest. It does not cover video authoring — that is
`explainer-videos/EXPLAINER-VIDEO-PIPELINE-SPEC.md`.

---

## 1. The one-paragraph version

Course and job state used to live inside the container image, so every redeploy
destroyed it — and worse, shipped a developer's local queue into production in its
place. State now lives in a Railway volume at `/data`, reached through a single
resolver that every subsystem shares. A course survives a redeploy; the one lesson
that was mid-build does not, and is parked for a human rather than silently
rebuilt. Separately, a checkpoint can no longer report that it requires an answer
while also reporting that it never pauses — the flags move together or not at all.

---

## 2. Where state lives

### 2.1 The resolution ladder

`server/lib/job-store.js` `resolveDir()` picks the first that works, and **detects**
durability rather than claiming it:

| Order | Source | Reported as |
|---|---|---|
| 1 | `JOB_STORE_DIR` | `container`, or `volume` with `JOB_STORE_DURABLE=1` |
| 2 | `RAILWAY_VOLUME_MOUNT_PATH` + `/cq-jobs` | `volume` |
| 3 | repo root `/.jobstore` | `container` |
| 4 | OS temp | `ephemeral` |
| 5 | nothing writable | `memory` — **producing is refused** |

Railway injects `RAILWAY_VOLUME_MOUNT_PATH` when a volume is attached, which is why
attaching one is a dashboard action and not a deploy.

### 2.2 What is on the volume

```
/data/cq-jobs/
  jobs/                  one JSON file per job, atomic write + fsync
  ledger/<tenant>/<YYYY-MM>.jsonl   spend, appended before the call
  idem/                  Idempotency-Key records, written before dispatch
  queue/queue.jsonl      the course/lesson event log   <-- added 2026-09-18
```

One directory, one write-probe, one durability tier. The queue was moved here
specifically so it could not disagree with the jobs about what "durable" means.

### 2.3 What is deliberately NOT on the volume

`orchestrator/.runs/` (per-run spine state) and the per-video working directories
(`art/`, `audio/`, `frames/`, `out/`).

This is a decision, not an oversight. Those render directories are excluded from
the image and do not come back after a redeploy. Saved run state tells the spine
which stages to skip — so restoring `.runs/` without the art it points at would
tell the spine to skip generating art that no longer exists, and the run would
fail later and more confusingly than if it simply started again.

**The honest claim, therefore, is bounded:** a redeploy costs at most the one
lesson in flight (about $1.50 and 30 minutes), never the course.

### 2.4 The image must not carry state

`.dockerignore` re-admits `!orchestrator` wholesale for its code. Until this was
fixed, that dragged a developer's `orchestrator/queue.jsonl` into the image — so a
redeploy did not merely wipe production's queue, it **replaced it with a
build-time snapshot of a laptop** (20 items, 4 of them blocked, 1 queued, which
the worker would have built and paid for).

Both `orchestrator/queue.jsonl` and `orchestrator/.runs` are now excluded. A
regression test reads `.dockerignore` and fails if either line goes missing.

### 2.5 Degradation

| Tier | Courses | Jobs |
|---|---|---|
| `volume` | Full service | Full service |
| `container` | Allowed; survives restart, not redeploy | Same |
| `ephemeral` | Allowed, reported as such | Same |
| `memory` | `POST /courses/build` returns **503 `no_durable_store`** | Producing refused |

At `memory` there is no queue file at all, so a built lesson could never be
approved and `GET /courses/:id` would 404 immediately. Refusing up front is the
same rule the job store already applied to spend: a spend that cannot be recorded
is not a spend we accept.

---

## 3. The course lifecycle

### 3.1 States

`orchestrator/lib/queue.js` `ITEM_STATUS`:

| Status | Means |
|---|---|
| `queued` | Waiting. Nothing spent on it. |
| `claimed` | Being built right now. |
| `blocked` | **Waiting for a person.** This is the pause the design exists for. `blockedBy` says which kind: `review` (the normal pause), `post-render-check` (a judge flagged a finished, paid-for video), `spend-approval`, `upload`, `produce-input`, `nazim`, `interrupted`. Closed set, defaults to `review`. |
| `done` | Built, approved, published. |
| `failed` | Failed QA, or rejected by a human. |

**A course is HELD while any of its lessons is `blocked`, or `failed` and not `skipped`.**
The worker (`server/lib/course-worker.js` `heldCourses()` / `eligible()`) skips a held
course's queued lessons and carries on with other courses. A lesson a person released --
`reviewApproved`, `rebuildApprovedBy` or `requeuedBy`, written only by the approve and
requeue routes -- passes through its course's hold. `GET /courses/:id` reports the hold as
`worker.held` (`{by, status, since}`) and each queued lesson's `queuePosition` among the
lessons the worker may take (`null` behind a hold). See §3.6 for why.

The queue is an append-only JSONL event log folded on read. That costs a full read
per operation (fine at this volume) and buys two things: history survives, and two
writers cannot silently clobber each other the way a rewritten JSON array would.
It is appended with `jsonl.appendDurable()` — open, write, **fsync**, close —
because it is now the record of which lesson was paid for.

### 3.1a Where a course lesson stops — `PIPELINE_COURSE_STOP_AFTER`

The spine runs `research → script → gate → produce → qa → review → upload → nazim`
and treats reaching its `stopAfter` stage as success: `state.finish(DONE)` and
`queue.done()`, indistinguishable from running the whole chain.

Courses used to inherit `config.pipeline.stopAfter`, whose **default** is `qa` — one
stage before `review`. Any deployment that leaves that variable unset therefore builds
a course lesson, pays for it, marks it `done`, and never pauses for anybody:
`awaitingApproval` stays `[]` and the approve and reject routes have nothing to act on.

**Production was not in that state.** `PIPELINE_STOP_AFTER` is set to `upload` on
Railway, so courses ran to `upload`, review did pause them, and publishing worked. The
LMS read the default and reasonably concluded otherwise — the trap is real, it just was
not the one that bit them (§3.1b). Stating this precisely matters: their lesson failed
for an unrelated reason, and chasing the default would have cost them another day.

Courses now resolve their own stage, `config.pipeline.courseStopAfter`, defaulting to
`upload` — what production already did. Deliberately **not** chained off
`PIPELINE_STOP_AFTER`: a change to the single-video path must not be able to drag
courses back behind `review`. `server/index.js` warns at boot if the resolved stage
sits before `review`, or is not a stage at all.

`upload` publishes unlisted and born-provisional, after `review` has already paused for
a person — so approval, not the pipeline, is what puts a video on the channel.

`orchestrator/test-regressions.js` §11 records the options the worker hands the spine
and asserts **both** halves: at or past `review` (it can pause) and at or past `upload`
(it can publish). It could not have caught this before — the stub replaced
`spine.execute` with a bare status and discarded the options entirely.

### 3.1b A post-render finding parks the video, it does not destroy it

`produce.js` runs its sensors twice around the spend. Before it, a finding is a redraft
brief and costs nothing. After the render, `eval-text.js` runs again over the script as
it actually went out — and that call used to throw `RejectedError`, which `spine.js`
settles as `queue.fail()`.

On 2026-09-19 that destroyed a finished lesson. `eval-text.js` is an LLM judge
(`gemini-2.5-flash`); it passed the same `beats.js` before the spend and failed it after
the render, on `vo: "Then he asks, have I got that right, and he stops talking."` —
reported speech in narration, where the question mark it demanded cannot be heard. The
run: 25.3 minutes, **$0.598**, and a complete bumper-wrapped `_final.mp4` left on disk
while the queue said `failed`.

The post-render call now passes `blockOnFail: true` and throws `BlockedError`, so the
run is settled `blocked` with the finding as its `reason`. The video survives, a person
decides, and the LMS gets a state it can act on instead of `"status": "failed"`. Every
sensor before the spend is unchanged and still rejects — there is no video to save yet,
so rejecting there is free.

The judge itself was left alone. Narrowing it so a spoken line is never failed for
punctuation a listener cannot hear is the deeper fix, in a template every video shares.

### 3.2 Claim before spend

`course-worker.buildOne()` calls `queue.claim(item.id, runId)` **before**
`spine.execute()`. Previously nothing did: the spine only ever wrote
`block`/`fail`/`done`, so a lesson sat at `queued` for its entire ~30-minute,
~$1.50 build. After a restart it was indistinguishable from one that had never
started, `drain()` re-picked it, and the first attempt's spend vanished with no
record anywhere that it had happened.

A failure to claim throws before any spend. A build with no record of itself is
the thing this prevents.

### 3.3 Resume on boot

`courseWorker.restore()` runs from `server/index.js` beside `jobs.restore()`. It
folds the queue and, for each `course-builder` item:

| Folded status | Action |
|---|---|
| `claimed` | Park as `blocked` with `interrupted: true`, `previousRunId`, and a reason that names the cost |
| `blocked` | Leave — a human is already the blocker |
| `queued` | Leave |
| `done` / `failed` | Nothing |

**It starts nothing.** `railway.json` sets `restartPolicyMaxRetries: 3`, so a
crash loop would otherwise burn three unattended rebuilds. A test asserts that
restore never moves a `queued` lesson and never sets `running`.

**A clean boot resumes itself; a suspicious one waits.** Until 2026-09-23 the only kicks
were a new build, an approve and a requeue -- two of which cost money -- and a redeploy
with queued work left the service idle until somebody spent. Now, after `restore()`,
`course-worker.bootDecision()` decides from three facts: were any lessons interrupted
mid-build (a person decides before anything is rebuilt), did the previous boot happen
inside the cooldown (`boot.json` on the job store; `COURSE_AUTO_RESUME_COOLDOWN_MS`,
default 15 min -- a restart loop), and is `COURSE_AUTO_RESUME` set to `0`. Any of those
means wait, and the log line `[course-worker] boot: <why>` says which; otherwise the
worker resumes. A crash *during* a build always leaves a `claimed` lesson and so always
waits; a crash *outside* one lands inside the cooldown. Worst case is one build attempt per
cooldown window. `/health.courses.worker.needsResume` and **`POST /api/v1/courses/worker/resume`**
remain for the boots that waited: idempotent, builds only what `eligible()` offers, spends
nothing a build did not already reserve.

**A course is held only while work waits behind the hold** (2026-09-23, later): `heldCourses()`
requires a `queued` sibling. A course whose rejected lesson has no queued sibling is stopped,
reads `held: null`, and is not counted on `/health` -- a hold nobody can release must not look
like one waiting for someone.

### 3.4 Approving an interrupted lesson rebuilds it

`approve()` normally requeues carrying `reviewApproved`, which makes the spine skip
straight to review and upload — correct for a lesson that finished rendering.

For an `interrupted` lesson that is catastrophic: the video does not exist, so
skipping review would publish nothing or something stale. `approve()` therefore
branches — an interrupted lesson is requeued **without** `reviewApproved` and with
the flag cleared, so it rebuilds and then blocks at review as normal.

### 3.6 The hold is per course, not per service (2026-09-23)

`drain()` used to take `queued()[0]` and, on any outcome but `done`, log `pausing:` and
`break`. "Paused" was never a state -- only the absence of a running drain -- and `reject()`
wrote `failed` and returned without kicking. On 2026-09-22 one course's lesson failed script
validation and every other course, another tenant's included, sat queued behind it for a
day; both free actions the tenant tried returned `202` and released nothing, and the API
showed `worker.building: null` for parked exactly as for idle.

What changed, all in `course-worker.js` and additive on the API:

| | Before | Now |
|---|---|---|
| Scheduler | global FIFO, stop on first non-`done` | `eligible()[0]`: FIFO over lessons whose course is not held |
| `reject` | fails one lesson, no kick | fails the lesson **and its queued siblings** (`stoppedWithCourse`, $0, reservations released), then kicks so other courses continue |
| Free exit from `failed` | none (only paid `requeue`) | **`POST .../lessons/:id/skip`** -- status stays `failed`, `skipped: true`, the course continues |
| After a boot | idle until a paid kick | `needsResume` + **`POST /courses/worker/resume`** |
| Observability | `worker.building` only | `worker.running / needsResume / eligibleAcrossAllCourses / buildingCourseId / held`, `items[].queuePosition`, explicit `spendUsdTotal: 0` on a never-run failure |

Why derived, not persisted: `needsResume` is `!running && eligible().length > 0`, and the
JSONL stays item-keyed. A persisted "paused" event would have to be cleared by every path
that can start work, and the one path that forgot would be this bug again.

Why a bare `kick()` in `reject` would have been wrong: the rejected lesson is `failed`, so
the *next lesson of the same course* is `queued()[0]`, and the worker would build the lesson
after the one a person just refused. The hold has to exist before the kick can.

Tests: `orchestrator/test-regressions.js` §11 (hold, reject stop, human-release override,
requeue, skip, resume-on-held, restore + `needsResume`, enqueue hygiene) and
`test-server.js` (routes, refusals, index, course view, `/health`).

### 3.5 A bug worth knowing about

`queue.setStatus` was never exported, and `course-worker` was its only caller. So
`POST /courses/:id/lessons/:lessonId/approve` and `/reject` — the entire mechanism
by which a course pauses for a human — threw `TypeError` on every call, while the
routes existed, were documented and were authenticated. Now exported and covered.

---

## 4. The question contract

### 4.1 `questionStyle` is derived, never stored

`server/lib/checkpoints.js`:

```js
questionStyle: payload.checkpoints.every((c) => !c.rendersInVideo) ? 'popup' : 'on-screen',
```

A row is `popup` **only if every one of its checkpoints** has
`rendersInVideo: false`. A single on-screen checkpoint makes the whole row
`on-screen`. There is no stored row to edit — the whole payload is computed per
request from the video's own `beats.js` and `durations.json`.

### 4.2 The four flags move together

This is the defect the LMS reported, and the invariant that replaced it.

| Format | `rendersInVideo` | `pausesVideo` | `requiresAnswer` | `blocking` | `allowSkip` | extra |
|---|---|---|---|---|---|---|
| `popup` | `false` | `true` | `true` | `true` | `false` | — |
| `on-screen` | `true` | `false` | `false` | `false` | `true` | `onScreenUntilSeconds` |

Previously the on-screen branches overrode only `pausesVideo` and left
`requiresAnswer: true, blocking: true, allowSkip: false` standing beside it. Those
cannot both be honoured — if the player never stops, there is no moment at which
an answer can be required — so every consumer had to guess which field won.

**The invariant: `pausesVideo: false` will never appear beside
`requiresAnswer: true`.** If it ever does, it is a bug on our side. It is enforced
in one helper (`drawnOnScreen()`), asserted by a test that walks every checkpoint
in the catalogue, stated in the public `GET /api/v1` index, and re-checked against
production by `scripts/verify-live.js`.

### 4.3 Timing

- `atSeconds` — fire here. **Already includes the brand intro.** Measured from the
  start of `<videoId>_final.mp4`, the file served and uploaded.
- `lessonAtSeconds` — the same moment excluding the intro. Exists only so the two
  can never be silently confused.
- `timing.introOffsetSource` — `probed` | `brand-constant` | `no-bumpers` |
  `assumed`. Read it rather than assuming 2.6.
- `timing.trusted` — `false` when a beat length is missing or the offset was
  assumed. **Never fire a checkpoint whose `trusted` is false.** It is a live
  field: re-read it when you serve, not when you map.
- `pause.safe` — `false` means there is no whole sentence on one side, so there is
  nowhere clean to stop.

### 4.4 `durability` and the manifest

`committed` (in git, survives a redeploy) | `ephemeral` (made at runtime, will
disappear) | `unknown` (could not tell — treat as ephemeral).

It is answered from `server/catalogue-manifest.json`, a build artefact, because
`.dockerignore` strips `.git` and the running service cannot ask git anything.

**This file goes stale silently and the failure is expensive.** When it did, six
finished, committed videos reported `ephemeral`, and the LMS refuses to bind a
lesson block to an `ephemeral` row — so six completed videos were unusable to them
with nothing reporting a problem. Rebuild it whenever a video is added:

```bash
node scripts/build-catalogue-manifest.js
node scripts/build-catalogue-manifest.js --check    # now in the pre-push gate
```

### 4.5 `explanationSource`

`authored` (a real explanation written for the popup) | `video-note` (the video's
six-word on-screen caption, i.e. this question still needs one written) |
`missing`. `explanationsAuthored` on a catalogue row counts only `authored`.

---

## 5. Tenancy and spend

### 5.1 Configuration

Entirely env-var driven. There is no tenants table and no admin route. `TENANTS_JSON`
is a JSON **array** — one variable, because Railway has no atomic multi-variable
save and four variables would leave a window where a live token has no budget.

```json
[
  {
    "id": "taleemabad-u",
    "name": "Taleemabad University LMS",
    "token": "<32+ random characters>",
    "monthlyUsd": 50,
    "limits": { "producePerHour": 20, "producePerDay": 60, "approvePerHour": 60 },
    "scopes": ["produce", "approve", "catalogue"],
    "webhookSecret": "<they generate this, we store it>"
  }
]
```

`CONTENT_API_TOKEN` is loaded separately and becomes a tenant called `default`,
unmetered unless `DEFAULT_TENANT_MONTHLY_USD` is set. Tokens are never stored in
clear — each is HMAC'd with a per-boot pepper into a lookup map.

### 5.2 Minting and validating

```bash
node scripts/mint-tenant.js --id taleemabad-u --name "Taleemabad University LMS" --monthly 50
node scripts/mint-tenant.js --check --file <saved.json>
```

The loader **fails soft**: a token under 24 characters, a duplicate id, two tenants
sharing a token, or malformed JSON drops the entry and merely reports it on
`/health`. That is right for a running service — one bad entry must not take the
others down — but it means a typo pasted into Railway *looks like it worked* and is
discovered when the other organisation cannot authenticate. `--check` applies the
same rules before the paste. It never prints a token.

### 5.3 Enforcement

- **Monthly ceiling** — `ledger.reserve()` refuses with `tenant_budget_exhausted`
  before the run, at worst-case cost, settled at real cost afterwards. Verified:
  reserving $60 against a $50 ceiling is refused.
- **Per-run hard wall** — `min(PIPELINE_MAX_APPROVABLE_USD, tenant.maxRunUsd)`.
- **Rate limits** — keyed on **tenant**, not IP. A per-IP limit is a
  per-organisation limit for anyone behind one egress. Per-IP survives only as a
  backstop for anonymous callers.
- **Real cost.** Measured media spend (art + speech + animation) on completed runs is
  **$0.56–$0.64** for a still-heavy lesson. It is not a flat figure: animation is priced
  at `$0.05/second`, so one 15-second animated beat is `$0.75` — more than an entire
  still-only lesson — and a lesson with several moving beats costs multiples of one
  without. Model spend is counted separately as of 2026-09-21 and has no measured
  figure yet. **Keep authorising $1.50 per lesson** until a run reports both halves;
  it is the conservative direction, and a $10/month cap buying about six lessons is
  still the right thing to tell a person.
- The budget gate (`PIPELINE_BUDGET_USD`) measures **media spend only**, deliberately:
  folding token spend into the number it checks would eat headroom sized for art and
  silently ship a stills-only video.
- **Courses are on the ledger (2026-09-23).** `POST /courses/build` reserves
  `PIPELINE_COURSE_LESSON_RESERVE_USD` (default $2.50) per lesson, one ref each, on the
  caller's tenant before anything is queued -- `402 tenant_budget_exhausted` with every
  reservation released if the course does not fit. Each lesson settles at `spendUsdTotal`
  when it ends; a lesson rejected or stopped before it ran is released. A course lesson's
  media budget is `min(PIPELINE_BUDGET_USD, tenant.maxRunUsd)`. `GET /demo/spend` shows it
  under `courses` (`lessons`, `reservedUsd`, `spentUsd`, `perLessonUsd` p50/p90 once three
  lessons are `done`). Lessons enqueued before that date were never reserved and are
  costed only on `GET /courses/:id`.

---

## 6. Operating it

### 6.1 Deploying — read this before you deploy

**Railway's configured source is GitHub branch `main`.** Verified from deployment
metadata (`meta.branch`), not inferred.

```bash
railway deployment list --json    # meta.branch + commitHash = what is actually live
```

Three traps, each of which cost real time on 2026-09-18:

1. **Pushing a feature branch deploys nothing.** Deploying means fast-forwarding
   `main`: `git push origin <branch>:main`.
2. **Pushing to `main` does not itself trigger a build.** Follow it with
   `railway redeploy --from-source -y`. (This is why
   `scripts/publish-checkpoint.js` pushes *and then* deploys.)
3. **`railway redeploy --from-source` pulls the configured source, i.e. `main`.**
   Run with unmerged work it **rolls production back** — it did exactly that here.
   Only run it once `main` is what you want live.

`railway up` times out from this repo and should not be relied on. The cause is the
working tree, not the network: `explainer-videos/` alone is ~36 GB of render output,
and `railway up` indexes the whole directory before it uploads. `.railwayignore`
correctly excludes `frames/`, `art/`, `audio/`, `out/`, `clips/` and `layers/`, so
little of that is actually sent — but the walk still has to happen, and the request
expires first. Deploy through git instead.

Changing a service *setting* (attaching a volume) triggers a rebuild of the current
source, which can make new code appear live and confuse the picture.

### 6.2 The volume

Attached 2026-09-18: `content-queen-volume`, 50 GB, mount path `/data`, service
`content-queen`, environment `production`.

```powershell
railway service content-queen          # volume add takes no --service flag
railway volume add --mount-path /data  # run from PowerShell: Git Bash rewrites /data
railway volume list
```

`numReplicas` must stay `1` — a Railway volume cannot be shared and the store
assumes a single writer.

### 6.3 Verifying the live service

```bash
CONTENT_API_TOKEN=<token> node scripts/verify-live.js
CONTENT_API_TOKEN=<token> node scripts/verify-live.js --base https://staging.example
```

Read-only by construction: it never calls `/courses/plan`, `/courses/build`,
`/produce` or `/approve`, because a verification tool that can spend money or
publish is a tool nobody runs. The only non-GET is the attempts probe, which exists
to confirm the 501. The token comes from the environment and is never printed.
Without one it runs the unauthenticated half and says so.

### 6.4 Pre-push gate

```bash
npm run lint
npm test                                        # 225 tests across 3 suites
node scripts/build-catalogue-manifest.js --check
bash .claude/scripts/smoke-test.sh
```

The smoke test now also fails if the catalogue manifest is stale, or if anything
matching a live credential appears in `prototypes/*.html`.

### 6.5 Credentials

A credential written into a document is compromised the moment it is committed,
and **stays compromised after the document is edited** — the value remains in git
history and in any PDF already rendered from it. The API token was in two handoff
documents and their PDFs; it is scrubbed and the PDFs are rebuilt clean, but it
must still be rotated. Rotate; do not merely delete the line.

---

## 7. Verification evidence

Measured against `https://content-queen-production.up.railway.app`, live commit
`eda63c8` on `main`, 2026-09-18.

```
1. durability -- what survives a redeploy
  PASS  the job store is on a mounted volume  (/data/cq-jobs)
  PASS  course state lives in the same store, not in the image
        (/data/cq-jobs/queue/queue.jsonl)
  PASS  the two agree -- one store, one durability tier  (volume)

2. the question contract
  PASS  the index states the flag invariant  (10 rules, 17 endpoints)
```

Local suite at the same commit: **225 passed, 0 failed** (`160 + 37 + 28`), lint
clean, catalogue manifest current.

**Not yet verified against production:** the authenticated surface — catalogue
classification, checkpoint flag coherence across all rows, the courses 404 body,
the attempts 501, and tenant spend. These pass in the test suite against this exact
commit, and `scripts/verify-live.js` will confirm them against production as soon
as it is run with a credential. Until then this section states test-suite evidence,
not live evidence, for those items.

---

## 8. Known gaps

| Gap | Status |
|---|---|
| `TENANTS_JSON` not yet set | The LMS is still on the shared `default` tenant |
| API token not yet rotated | Still in git history; treat the old value as public |
| `callbackUrl` for courses | Not wired — courses are poll-only |
| `Idempotency-Key` on `/courses/build` | Not accepted; guarded by `confirmLessons` + duplicate-slug rejection |
| `youtubeVideoId` | `null` on every row — two publish records exist, neither for a video with a checkpoint |
| 18 `on-screen` rows serve `video-note` | Content debt: those videos need authored explanations |
| Plans cannot be edited | Accept or re-plan |
| Course spend is not in `/demo/spend` | **Fixed 2026-09-23** for lessons built from then on — see §5.3. Earlier course lessons never reserved and remain visible only as `spendUsdTotal` on `GET /courses/:id`. |
| One course's failure parked every tenant | **Fixed 2026-09-23** — §3.6. |
| `reject` did not resume the worker | **Fixed 2026-09-23** — it stops its course and kicks. `skip` is the free exit from `failed`; `/courses/worker/resume` the starter after a boot. |
| Per-tenant fairness in the queue | Not built. Items now carry `tenantId`, but ordering is still FIFO over eligible lessons. Courses pause after every lesson, so two eligible courses already alternate; a round-robin is deferred until unfairness is observed. |
| `orchestrator/run.js` uses `queue.nextQueued()` | That helper does not filter `source`, so the CLI can pop a `course-builder` lesson. Out of scope; do not run the CLI against the production volume. |
| An LLM judge can disagree with itself | `eval-text.js` passed a line before the spend and failed the same line after the render. It can no longer end a run (§3.1b), but it can still park a good video for a human to clear. |
| `.beads/runs.jsonl` is not on the volume | **Fixed 2026-09-21.** `state.appendRunLog()` now writes the same row to the job store as well, so a run's cost outlives a redeploy the way the course does. `scripts/diagnose-course-lesson.js` reads both. Rows written before that date existed only in `.beads` and are gone. |
| `spendUsd` counted media only | **Fixed 2026-09-21.** Art, speech and animation were counted; every model call in research, script, gate and qa was not, so a lesson's stated cost was part of its cost. Model spend is now recorded as `kind: 'model'` and reported as `spendModelUsd`. The `$1.50` planning figure and the measured `$0.598` were both honest about different things. The budget gate still measures media only — see §5.3. |
| Gemini sensor spend is still uncounted | `eval-text.js` and `qa-art.js` are child processes that discard the `usageMetadata` their responses carry, and no Gemini rate is written down anywhere in this repo. Small next to Opus, but not zero. |

---

## 9. Reading list

- `docs/DEPLOYMENT_PREREQS.md` — environment variables, the volume, rotation
- `scripts/diagnose-course-lesson.js` — read-only: why a lesson ended where it did
- `docs/integration-requests/2026-09-20-course-api-reply.md` — what the LMS asked for, and what changed
- `prototypes/course-builder-technical.html` — the course API handoff sent to the LMS
- `prototypes/handoff-print.html` — the in-video question handoff
- `.claude/standards/SCRIPTING_STANDARDS.md` §3b — the checkpoint beat format
