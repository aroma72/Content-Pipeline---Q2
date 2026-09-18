---
type: reference
last_verified: 2026-09-18
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
| `blocked` | **Waiting for a person.** This is the pause the design exists for. |
| `done` | Built, approved, published. |
| `failed` | Failed QA, or rejected by a human. |

The queue is an append-only JSONL event log folded on read. That costs a full read
per operation (fine at this volume) and buys two things: history survives, and two
writers cannot silently clobber each other the way a rewritten JSON array would.
It is appended with `jsonl.appendDurable()` — open, write, **fsync**, close —
because it is now the record of which lesson was paid for.

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

### 3.4 Approving an interrupted lesson rebuilds it

`approve()` normally requeues carrying `reviewApproved`, which makes the spine skip
straight to review and upload — correct for a lesson that finished rendering.

For an `interrupted` lesson that is catastrophic: the video does not exist, so
skipping review would publish nothing or something stale. `approve()` therefore
branches — an interrupted lesson is requeued **without** `reviewApproved` and with
the flag cleared, so it rebuilds and then blocks at review as normal.

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
- **Real cost** is roughly **$1.50 per lesson**. A $10/month cap buys about six.

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

`railway up` times out uploading from this repo. Do not rely on it.

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

---

## 9. Reading list

- `docs/DEPLOYMENT_PREREQS.md` — environment variables, the volume, rotation
- `prototypes/course-builder-technical.html` — the course API handoff sent to the LMS
- `prototypes/handoff-print.html` — the in-video question handoff
- `.claude/standards/SCRIPTING_STANDARDS.md` §3b — the checkpoint beat format
