---
name: testing-the-pipeline-end-to-end
description: Tests and debugs the explainer-video pipeline end to end the way the LMS uses it - over the content-queen HTTP API on Railway production - with the test ladder (npm test, the GitHub workflow, live health, verify-live, the paid lms-e2e run), the regression rule for LMS routes, releasing to production, and a symptom playbook with the paths, tokens and restrictions already worked out. Use when asked to test the pipeline end to end, run a regression on the LMS APIs, confirm every API still works after a release, debug why the LMS says a lesson is stuck, went back to script-approval with a new sha, failed, refused with a 402 despite budget left, missing its file, or a finished video that came out as stills with no motion, or prove a server or orchestrator change before pushing it. NOT for making a new video (creating-explainer-videos) or quoting one paid render (paid-run-protocol).
type: skill
last_verified: 2026-09-29
owner: Abdulrehman Siddiq
---

# Testing the pipeline end to end

**The end goal is the LMS.** The pipeline's customer is the Cohort2 LMS, which drives the
`content-queen` service on Railway over HTTP: it plans a course, reads and approves scripts, waits
for a finished video, fetches it, and shows its checkpoint popup. A local render that passes every
gate is a means, not the result. A change is done only when the behaviour the LMS sees is proven,
up the ladder below.

Reference files, read only the one you need:

- **Routes, statuses, auth, budget** → [references/lms-api.md](references/lms-api.md)
- **Paths, env var names, every script and its flags, CI jobs, stage order** → [references/paths-and-commands.md](references/paths-and-commands.md)
- **Every lesson that bears on testing, by theme, with IDs; what is stale** → [references/lessons-for-testing.md](references/lessons-for-testing.md)
- **This skill's behaviour evals** → [evals/evals.json](evals/evals.json)

## The workflow

Copy this checklist into the response and tick it as you go:

```
Pipeline test:
- [ ] 1. T0 local: lint, npm test, skill evals all green
- [ ] 2. Regression: the changed route/stage has a check that FAILED before the fix
- [ ] 3. T1 commit: pushed; CI green on EVERY job (not just "Post Results")
- [ ] 4. Deploy (only if server/ or orchestrator/ changed): idle, deploy.ps1, build.commit matches
- [ ] 5. T2 live read-only: /health fields, /health/render, verify-live
- [ ] 6. T3 paid LMS flow (only with approval): lms-e2e quote -> approve -> --yes
- [ ] 7. Cleanup: reject, DELETE, Drive trash, videosHeldLocally 0
- [ ] 8. Report: per rung, spend split media/model/total, what was NOT tested and why
```

Never skip a rung and report the one above it. If a rung fails, fix it, re-run that rung, and
only then climb.

## The test ladder

| Rung | Command | Cost | Required when |
|---|---|---|---|
| T0 | `npm run lint` · `npm test` · `npm run eval:skills` | $0 | every change |
| T1 | `git push origin main`, then `gh run list -R aroma72/Content-Pipeline---Q2 -L 3` and `gh run watch <id> -R aroma72/Content-Pipeline---Q2 --exit-status` | $0 | every change |
| T2 | `curl -s https://content-queen-production.up.railway.app/health`, `/health/render`, `node scripts/verify-live.js` | $0 | after every deploy |
| T3 | `node scripts/lms-e2e.js --series lms-e2e-<date><letter>` (quote only), then with `--yes` | ~$1.5–4 per video | LMS-facing change, or when asked |

- **T0** `npm test` runs `test-regressions`, `test-store`, `test-server`, `test-predeploy` and
  `test-layout`. A green local run grades your disk, not the commit (H39a). CI is the proof.
- **T1** Read every job. `Post Results` depends only on test, node and lint, so a red
  `pipeline-gates` or `image` job still shows a green summary.
- **T2** `/health` can return 200 `ok:true` with a `storage.error` inside (H39a). Read these by
  name: `build.commit`, `jobStore.durability` (must be `volume`), `courses.worker.needsResume`,
  `jobs.inFlight.any`, `storage.driveOffload` (`configured`, `authorised`, `authKind`),
  `storage.deliverables.videosHeldLocally`, `storage.memory.rssBytes`.
  `verify-live.js` needs `CONTENT_API_TOKEN` in the environment for its authenticated half. Load it
  from `.env` without printing it.
- **T3** `lms-e2e.js` drives production over HTTP exactly as the LMS does, as the operator
  `default` tenant. Without `--yes` it writes scripts (model calls only), prints the estimate for
  each video, and stops. `--only=course|single` reruns one flow; `--cap` sets the per-video ceiling
  (default $3.00); `--keep-drive` skips the Drive trash. **Always pass a new `--series`**, because
  a reused slug collides with the last run's queue item.

## Regression rule for LMS routes and functions

The LMS never sees a unit. It sees a route. So:

1. **Any change under `server/` or `orchestrator/` gets a check** next to the existing one for
   the same behaviour:
   - HTTP behaviour goes in `orchestrator/test-server.js`: `createApp()` with a fake pipeline, no
     render, no spend. Use `freshEnv({...})` and `withServer(env, {...}, async (port) => ...)`.
   - Stage, spine and ledger behaviour goes in `orchestrator/test-regressions.js`.
2. **Mutation-test it.** Break the fix (`git stash push -- <file>`, or flip the condition), run
   the one file, and watch the new check go red with the production symptom. Then restore. A check
   you have never seen fail is not a check.
3. **Test with a real enqueued item, not a regex over the source.** A `/file` test that only
   grepped the handler passed for weeks while the route 404'd on real lessons.
4. **Known coverage gaps**, where `lms-e2e.js` is the only guard:
   - `GET /api/v1/videos/:id/checkpoints` has no direct `test-server` check.
   - The cap check in `lms-e2e.js` counts media spend only; model spend (~$3 per course lesson)
     is reported but not capped.
   - The produce route has no in-flight cap. Two renders on one replica is the real OOM risk.

## Deploy and prove

A push to `main` **never** deploys: the service has no GitHub source. Only this does:

```powershell
node scripts/predeploy-check.js          # must say idle; --wait queues behind a running lesson
.\scripts\deploy.ps1                     # PowerShell; do NOT append 2>&1
```

- `deploy.ps1` finds the real Git Bash and runs `scripts/deploy.sh`. That script refuses while
  anything runs, `git archive`s `origin/main` (`--ref <ref>` for another), `railway up`s it, waits
  for `/health.build.commit` to match, then runs `verify-live.js`. It has no dry-run flag.
- In PowerShell 5.1, `2>&1` turns Railway's stderr deprecation warning into a terminating error.
  The upload has usually gone out anyway, so check `build.commit` before re-running.
- **Never** `railway redeploy --from-source`. Here it is a code no-op that still restarts the
  container, and anything outside `/data` is lost with it (H34, H37a).
- Env vars are read at boot. `railway variable set KEY --stdin --skip-deploys` lands with the
  next deploy, not before.
- After a deploy, if `/health.courses.worker.needsResume` is true, `POST /api/v1/courses/worker/resume`.

## Debugging playbook

Where to look, cheapest first:

1. `/health` and `GET /api/v1/courses/<courseId>`. Each lesson item carries `status`, `blockedBy`,
   `reason`, `error`, `runId`, the `spend*` fields and `saved2drive`/`driveUrl`.
2. `railway logs 2>/dev/null | grep <slug>`. `log.always` lines show the stage, `BLOCKED:`,
   `NEEDS WORK -> redrafting`, and spend estimates.
3. The run state on the container:
   `railway ssh "grep -oE '.{0,200}<keyword>.{0,300}' /app/orchestrator/.runs/<runId>.json"`.
   Keep the remote command quoted. In Git Bash, prefix `MSYS_NO_PATHCONV=1` for any `/data` path
   (H20).
4. The volume: `/data/cq-jobs/queue/queue.jsonl` and `/data/cq-jobs/deliverables/<series>/<slug>/`
   (`beats.js`, `durations.json`, `drive.json`). The render dir is `/app/explainer-videos/<series>/<slug>/`.

| Symptom the LMS reports | Cause to check first | Lesson |
|---|---|---|
| Lesson back at `script-approval` with a new sha after it was approved | A produce sensor redrafted the approved script. Since e27170d the free checks run before the pause; if it recurs, a new free check was not added to `SCRIPT_SENSORS` | H50 |
| `POST .../produce` → 402 `tenant_budget_exhausted` with money left | The reservation was bigger than the month's remainder. It is now capped by `ledger.capToMonth`; a 402 now means this video's own estimate does not fit | — |
| Blocked `preflight` / `/health/render` 503 | The container cannot render (browser, ffmpeg). This is infrastructure, not the video | H14, H15 |
| The quote included motion, the video has none | `animation_failed` in the run state. A kie 401 "Free users can upload up to 30 files" is an account quota; stills are the designed fallback | — |
| `/file` or `/video` 404 after the video was made | The copy was offloaded. It should answer 200 with the Drive JSON; check `drive.json` on the volume | H30 |
| Drive not authorised / folder 404 | Service-account key missing on Railway, `drive.file` scope, or a call without `supportsAllDrives` | H29, H39b |
| Railway memory graph climbing | Page cache from render scratch. The sweep deletes `frames/`, `node_modules` and `.chrome-profile` after every run | H7b, H31 |
| Lesson `interrupted` | A deploy or restart during a run. Only deploy when idle | H28, H37a |
| An unknown row in the LMS catalogue | A test fixture folder left under `explainer-videos/` | — |
| A gate "wrongly" failed | Run it on a known-good video before blaming the gate | H16 |

## Restrictions

- **Token.** Use the operator `CONTENT_API_TOKEN` (the `default` tenant, the only one with
  `admin`). **Never** the `cohort2-lms` token. To test the partner's own link, run inside their
  environment so their token never passes through you (H37b).
- **There is no staging.** The LMS "Staging" environment points at our production, and its tests
  spend real money (H35).
- **Spend.** Every `--yes` follows `paid-run-protocol`: quote from the script's own estimate line,
  a stated cap, the owner's explicit approval, then `--yes`. The owner's cap for LMS tests is
  $3.00 per video. No ElevenLabs.
- **Clean up after every paid test.** Reject the course lesson, `DELETE .../file` and
  `.../video`, and let `lms-e2e.js` trash the Drive test files (`gdrive.trashFile`, scoped to the
  configured folder). Tell the LMS before any `scripts/reset-production-state.js` (H38).
- **Secrets.** Never print a token or key. Pass a key with `railway variable set KEY --stdin`.
  Read `.env` inside the command that uses it.
- **Shared working tree.** Another session edits this repo. Stage by path, never `git add -A`,
  and compare tracked-file counts after any restage (H5, H49).
- **This machine.** Hand the owner PowerShell, not bash (H36). Use `py`, not `python3` (H1).
  Write JS containing backslashes with the Write/Edit tools, never a heredoc (H48).

## What a passing T3 run looks like

- **Course:** plan 200 · build 409 without `confirmLessons` · 400 on a broken plan · 202 ·
  `script-approval` reached **once** · script/sha/`script.md`/beats agree · stale-sha approve 409 ·
  approve 202 · `review` reached · course view `deliverableAvailable true, videoLocal false` ·
  `/file` streams `video/mp4` whose md5 equals the Drive record's, honours `Range` (206), and
  returns the record on `Accept: application/json` ·
  `/videos` lists it · checkpoints carry `atSeconds` · attempts 501 · reject 202 · DELETE 200 ·
  Drive md5 matches, then trashed.
- **Single video:** make-video 202 · `written` · `beatsFull` and `script.checkpoint` present ·
  `/video` 404 before produce · produce 202 with a budget no bigger than the month's remainder ·
  the retried Idempotency-Key is replayed · `awaiting_review` · `/video` returns the Drive JSON ·
  `checkpointsUrl` resolves · DELETE 200.
- **After:** `videosHeldLocally` 0, and the render dir is a few hundred KB (`du -sh` over
  `railway ssh`).

Observed costs are in [references/lessons-for-testing.md](references/lessons-for-testing.md).

## Reporting

Report each rung as pass or fail, with the evidence: command, count, `build.commit`. Split the
spend into media, model and total. Name what was **not** tested and why (for example, animation
blocked by the kie quota). Say what was cleaned up. A rung that did not run is reported as not
run, never folded into "all green".
