# Paths, env vars, commands and CI

## Contents
- Paths (local and on the container)
- Env var names by purpose
- Test and QA commands
- Live, deploy and operator scripts
- CI jobs
- Spine and produce stage order

## Paths

| What | Local | Production container |
|---|---|---|
| Render dir, one per video | `explainer-videos/<series>/<slug>/` (override with `EXPLAINER_VIDEOS_DIR`) | `/app/explainer-videos/<series>/<slug>/`, container disk, lost on redeploy |
| Skill templates copied into each render dir | `.claude/skills/creating-explainer-videos/templates/` | same, under `/app/` |
| Brand bumpers | `explainer-videos/brand-intro-outro/` | `/app/explainer-videos/brand-intro-outro/` |
| Run state, one per run | `orchestrator/.runs/<runId>.json` | `/app/orchestrator/.runs/<runId>.json` |
| Job store | `JOB_STORE_DIR`, else `.jobstore`, else the OS temp dir | `/data/cq-jobs` (the volume) |
| Course queue | `<store>/queue/queue.jsonl` | `/data/cq-jobs/queue/queue.jsonl` |
| Durable deliverables | `<store>/deliverables/<series>/<slug>/` | `/data/cq-jobs/deliverables/…` (`beats.js`, `durations.json`, `run-context.json`, `drive.json`, `video-meta.json`) |
| Beads | `.beads/{runs,failures,improvements,qa_ratings,content_feedback}.jsonl` | — |
| Test harness for the LMS | `scripts/lms-e2e.js` | — |

- `runId` is `YYYYMMDDTHHMMSS-<slug>`. The single-video series is `made`; course series are
  whatever the build named.
- Never delete `beats.js` or `durations.json`, because checkpoints are recomputed from them.
- The scratch sweep deletes only `frames`, `node_modules`, `.chrome-profile`, `preview-lesson` and
  `__pycache__`.
- Paid inputs (`art`, `audio`, `clips`, `layers`, `out`) are deleted only after a verified Drive
  upload.

## Env var names

Names only. Read live values with `railway variables --kv`, and never print the secret ones.

- **Pipeline:**
  - `PIPELINE_BUDGET_USD`: course run budget
  - `PIPELINE_MAX_APPROVABLE_USD`: single-video ceiling
  - `PIPELINE_COURSE_LESSON_RESERVE_USD`
  - `PIPELINE_STOP_AFTER`
  - `PIPELINE_COURSE_STOP_AFTER`
  - `PIPELINE_DRY_RUN`
  - `PIPELINE_MAX_RUN_MINUTES`
  - `PIPELINE_ASK_ABOVE_BUDGET`
- **Auth:** `CONTENT_API_TOKEN`, `TENANTS_JSON`, `DEFAULT_TENANT_MONTHLY_USD`,
  `TENANT_TOKEN_PEPPER`, `TENANT_*_PER_*`
- **Store:** `JOB_STORE_DIR`, `JOB_STORE_DURABLE`, `JOB_STORE_TTL_DAYS`,
  `RAILWAY_VOLUME_MOUNT_PATH`
- **Drive:** `GDRIVE_FOLDER_ID`, `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_JSON` (Railway) /
  `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_PATH` (local `.env`), plus the OAuth fallback `GDRIVE_CLIENT_ID`,
  `GDRIVE_CLIENT_SECRET`, `GDRIVE_REFRESH_TOKEN`
- **Media and model:** `KIE_API_KEY` (animation), `GEMINI_API_KEY`, `GEMINI_OMNI_API_KEY`,
  `ANTHROPIC_API_KEY`, `LLM_BACKEND`, `CLAUDE_CODE_OAUTH_TOKEN`
- **Spend confirmation:** `CONFIRM_SPEND=1`, equivalent to `--yes`
- **Scripts:** `VERIFY_BASE`, `COURSE_ID`, `BASE`, `PREDEPLOY_POLL_MS`
- **Course worker:** `COURSE_AUTO_RESUME`, `COURSE_AUTO_RESUME_COOLDOWN_MS`
- **Webhooks:** `WEBHOOK_ALLOWED_HOSTS` (webhooks are off until this is set)

Railway reads env vars **at boot**. A `--skip-deploys` set only takes effect at the next deploy.

## Test and QA commands (all $0 in media)

| Command | Covers | Time |
|---|---|---|
| `npm run lint` | eslint over `orchestrator`, `server`, `scripts`, `.claude/skills`, `gates` | <1 min |
| `node orchestrator/test-regressions.js` | about 258 checks on stages, spine, ledger and sensors. One makes a real `claude -p` call (plan usage) | 1–3 min |
| `npm run test:server` | about 80 HTTP checks on `createApp()` with a fake pipeline: auth, idempotency, budget, courses, script gate, files and Drive, health | 30–90 s |
| `npm run test:store` · `node orchestrator/test-predeploy.js` · `npm run test:layout` | job store and tenants · predeploy gate · every named path exists | <1 min each |
| `npm test` | all five of the above | 3–5 min |
| `npm run eval:skills` | skill frontmatter, routing, validate-beats fixtures | <30 s |
| `npm run eval:agent:smoke` / `npm run eval:agent` | live behaviour evals (`claude plugin eval`), with a no-skill baseline arm | minutes; plan usage |
| `py -m pytest tests/ -q` | legacy Python | <30 s |
| `bash .claude/scripts/smoke-test.sh` (Git Bash) | the pre-push gate. CLAUDE.md must stay ≤150 lines | <1 min |
| `bash scripts/pipeline-harness.sh` | render gates inside the deploy image. CI only; not on this machine | many min |
| `npm run verify` (`scripts/verify-all.js`) | Tier 1 is all the local checks. `--live` probes every key and reads prod `/health`. `--paid --yes` runs one 4-beat real render, capped at `--ceiling` (default $0.10) | varies |

## Live, deploy and operator scripts

| Script | Purpose | Spends / mutates prod |
|---|---|---|
| `node scripts/lms-e2e.js [--yes] [--only=course\|single] [--series S] [--cap 3.00] [--keep-drive] [--base URL]` | The LMS flows over HTTP as the `default` tenant, then cleanup | `--yes` spends; creates and deletes test content |
| `node scripts/verify-live.js [--base URL]` | Read-only contract checks. Needs `CONTENT_API_TOKEN` for the authenticated half, `COURSE_ID` for one course | no |
| `node scripts/predeploy-check.js [--wait]` | Exits 1 if anything is building or in flight | no |
| `.\scripts\deploy.ps1` → `scripts/deploy.sh [--ref R] [--no-wait]` | Deploys: `git archive` → `railway up` → wait for `build.commit` → verify-live | **mutates prod**; no dry run |
| `node scripts/diagnose-course-lesson.js <courseId\|series/slug>` | Why a lesson ended where it did. Run it **inside** the container | no |
| `node scripts/publish-checkpoint.js [--check]` | Pushes beats and durations, then confirms the checkpoint live | mutates prod |
| `node scripts/offload-deliverables-to-drive.js [--yes] [--id S/L] [--limit N]` | Backfills videos to Drive; dry run by default | `--yes` uploads and deletes local copies |
| `node scripts/reset-production-state.js [--yes --because "..."]` | Empties the job store through `/admin/reset`; dry run by default | destructive; tell the LMS first |
| `node scripts/mint-tenant.js --id --name --monthly` / `--check` | Mints a tenant token (printed once) / validates `TENANTS_JSON` | no |

Useful one-liners:

- Load the token without printing it (Git Bash):
  `T=$(grep "^CONTENT_API_TOKEN=" .env | cut -d= -f2- | tr -d '\r"')`
- Read the container:
  `railway ssh "du -sh /app/explainer-videos/<series>/*; ls /data/cq-jobs/deliverables/<series>"`
- Read Railway variables without printing secrets: pipe `railway variables --json` into `node`
  and print only the fields you need, for example the `TENANTS_JSON` ids, `monthlyUsd` and
  `maxRunUsd`.

## CI (`.github/workflows/test.yml`)

| Job | What it runs |
|---|---|
| `test` | Python: pytest and `legacy/python/main.py --dry-run` |
| `node` | `npm ci`, lint, catalogue manifest `--check`, `npm test`. It runs without `.env`, so key-dependent checks SKIP |
| `pipeline-gates` | `scripts/pipeline-harness.sh` in the deploy image |
| `lint` | secret-string and directory checks |
| `image` | `docker build`, only when the Dockerfile, `.dockerignore` or package files change |
| `notify` ("Post Results") | needs only `test`, `node` and `lint`, so **it can be green while `pipeline-gates` or `image` is red** |

## Spine and produce stage order

- **`STAGE_ORDER`:** research → script → gate → **script-approval** → references → produce → qa →
  review → upload → nazim.
- **`MAX_REDRAFTS`:** 2 per stage and 6 in total. The counters live in run state, and each resumed
  run starts at zero.

Inside produce, in cost order:

1. **Free:**
   - `preflight` (blocks as `preflight`)
   - template sync
   - `validateBeats`
   - `SCRIPT_SENSORS` = `qa-visuals`, `qa-cutouts`, `qa-checkpoint`, `qa-info`, `eval-text`. These
     are redraftable, but only record findings on a sha-approved script. script-approval runs the
     same list first, through `produce._internals.preApprovalChecks`.
2. **Spend gate:** the estimate plus media spent must fit the budget, or it blocks as
   `spend-approval`.
3. **Paid:**
   - `generate-lesson-art.js --yes`
   - `repairArt`: re-runs `qa-art` and repairs up to 2 times, each checked against the budget
   - `segment-all.py`
   - `tts-lesson.js --yes`
   - animation (`generate-lesson-video-omni.js`; failure falls back to stills as `animation_failed`)
   - `qa-clips`
   - `qa-frames`
4. **Render:** `compile-lesson.js` (`frames/` is deleted after the encode) → `stitch-brand.js` →
   `verify.js --final` → persist the deliverable → `eval-text` after the render (blocks for a
   person; never redrafts).
5. **Terminal:** `spine.execute` runs the Drive offload (md5-verified), then the scratch sweep.
