# Lessons that bear on testing the pipeline

The source of truth is `.claude/memories/lessons.md` (H-numbers) and `.claude/memories/mistakes.md`.
This is a digest for testing: each entry is a rule and the symptom that proves it matters. When a
lesson here disagrees with a newer entry in `lessons.md`, `lessons.md` wins.

## Contents
- Deploy and Railway
- LMS contract
- Course flow
- Single-video flow
- Spend and budget
- Drive, disk and memory
- Sensors and QA gates
- Redraft loops and the failure ledger
- Tests that spend by accident
- Git and the shared working tree
- Windows and shell traps
- Verification discipline
- Observed runs (dated baselines)
- Stale or contradicted: do not act on these

## Deploy and Railway

- **H34.** `railway redeploy --from-source` does nothing for code on this service, which has no
  GitHub source. It printed "Triggered a deploy" and went Online twice while production still
  served the old contract.
- **Deploy path.** `scripts/deploy.ps1` → `deploy.sh`: `git archive origin/main` → `railway up`.
  A push to main never deploys (production once sat 8 commits behind main).
- **PS 5.1.** Running `deploy.ps1 2>&1` aborts on Railway's stderr warning even though the upload
  went out. Check `build.commit` before re-running.
- **Proof.** Only `/health.build.commit == <pushed sha>` plus `verify-live.js` proves a deploy.
  Never trust the CLI's wording.
- **H28.** `predeploy-check.js` before every deploy. A redeploy at 06:11Z killed the LMS's paid
  lesson that started at 06:08Z.
- **H37a.** Any redeploy restarts the container, and everything outside `/data` goes with it. A
  lost `beats.js` made "Make the video" fail in 9 ms and then loop on an abandoned idempotency key.
- **H42 / H43.** `.dockerignore` is an allow-list (`*` first), so a new root file is absent from the
  image until it is listed. `.railwayignore` only excludes what it names.
- **H4.** Read live values (`railway variables`, `railway ssh 'printenv X'`), not code defaults.
  Three defaults in `config.js` were wrong, and a "fix" designed against them removed working
  publishing.
- **Env at boot.** `TENANTS_JSON` and `DEFAULT_TENANT_MONTHLY_USD` are read at boot. A
  `--skip-deploys` change does nothing until the next deploy.
- **Transient builds.** A Debian mirror "File has unexpected size" error during a build is
  transient. Railway keeps the old container, so retry.
- **H20.** In Git Bash, `MSYS_NO_PATHCONV=1 railway ssh …` stops `/data` becoming
  `C:/Program Files/Git/data`.
- **H14 / H18 / H23.** Container-only failures: Puppeteer needs `PUPPETEER_EXECUTABLE_PATH`; a
  `claude -p` call that allows any tool must run with `cwd` set to the OS temp dir. Each one cost
  about $0.60 per lesson before it was found.
- **H39a.** `/health` can say `ok:true` with `storage.error` inside. Read the storage fields by hand.

## LMS contract

- **H33.** Check the partner's readiness by reading their repo (`E:\Cohort2LP`) and their
  `/health/deploy` yourself. Work that was reported as "in" lived only on a local branch.
- **H35.** The LMS "Staging" environment points at our production. Their tests spend real money
  against their $50 per month.
- **H37b.** Test the partner link from inside their environment:
  `railway run -- node -e "…process.env.CONTENT_QUEEN_API_TOKEN…"` from PowerShell. You never
  handle the token.
- **H25.** Publish the fact the consumer needs (`deliverableAvailable`), not something to infer from
  `blockedBy`. The LMS spent a day probing a gate that did not exist.
- **Real items.** Test routes with a really enqueued lesson. The first `/file` "test" was a regex
  over the source.
- **Greedy `(*)`.** The route pattern is greedy, so script routes must be registered before
  approve/reject.
- **H38.** Reset through `scripts/reset-production-state.js` only. The LMS poller reads two 404s as
  lost paid work, so warn them first.

## Course flow

- **H50.** A human approval bound to a sha must come after every free check that can redraft.
  Otherwise approve → sensor redraft → new sha → ask again, looping at about $0.45 a lap because
  the redraft counter resets per resumed run. Fixed in e27170d. The redraft budget should
  eventually live on the queue item.
- **Resume.** Approval is bound to the sha of `beats.js`. A resume seeds from the volume copy
  (`seedFromScript`), not from run state.
- **H27.** The hold is scoped per course, shown as `/health.courses.worker.needsResume`, with a free
  `POST /courses/worker/resume` and `skip`. One failed lesson once parked every tenant for a day.
- **Reservations.** $2.50 per lesson is held from build through the script pause. Stalled courses
  eat the month and make later builds 402.

## Single-video flow

- **Produce approves.** Produce passes `scriptApproved: 'produce-request'`. Before that, a produce
  redraft rewound through script-approval, blocked there and failed the job.
- **Reservation cap.** The reservation used to be the whole $50 ceiling, so after any spend that
  month every video was a 402. It is now capped by `ledger.capToMonth` (5eb7905).
- **H37a.** `lastError` is for failures that don't end the job. An `abandoned` idempotency key is
  not a replay. A lost script gets `409 script_lost`, never a loop.
- **Open.** The produce route has no in-flight cap. Two renders on one replica is about 6 GB.
- **Summary vs full.** `script.beats` on the job is a summary. Assert on `script.beatsFull` and
  `script.checkpoint`.

## Spend and budget

- **Repairs.** `repairArt` used to re-buy rejected art with no budget check (quoted $0.09, spent
  $0.20). Every repair is now checked against the budget (2a3c666).
- **Beats on disk.** With `fromStage: 'produce'`, `beats.js` is read from disk. Write it before
  calling, or every gate judges the template placeholder.
- **Approval.** Paid generation needs `--yes` / `CONFIRM_SPEND=1` **and** the owner's approval.
  Quote from the run's own estimate line.
- **Model spend.** Model calls through the `claude` CLI count against plan usage, not dollars. Say
  which one a figure is. Always pass `--no-publish` to `claude plugin eval`.
- **Animation.** Untested while kie.ai is on the free tier: it returns 401 "Free users can upload up
  to 30 files within 30 days", and the pipeline falls back to stills (`animation_failed`).

## Drive, disk and memory

- **H30.** Delete a local file only after the remote's own md5 matches. Record first, then delete.
- **Protected files.** Never reclaim `beats.js` or `durations.json`. Upload runs after review, so
  the source order is render dir → volume → Drive.
- **H7b / H31.** Railway's memory graph counts page cache from about 10,800 frame PNGs per lesson.
  The scratch sweep fixes it; check `storage.memory` and `du`.
- **H29 / H39b.** The service account needs the full `drive` scope (`drive.file` cannot see an
  existing Shared Drive folder), and every call needs `supportsAllDrives=true`.
- **H40a.** Verify a credential through the real module (for example `gdrive.probeFolder()`) from a
  scratchpad script. Never print a key.

## Sensors and QA gates

- **H15.** A tool that fails to start (ENOENT, no browser) is exit 3, "could not decide", never a
  finding. A paid video was once parked over a missing Chrome.
- **H16.** Run a gate on a known-good video before calling it wrong. qa-frames was right; a
  schema field was missing.
- **H17.** DOM gates cannot be unit-tested. `scripts/pipeline-harness.sh` runs them in the deploy
  image, in CI. Check `${PIPESTATUS[0]}` through a pipe.
- **H19.** When a check misfires, exclude the legitimate case rather than changing the measurement.
- **H21 / H24.** Log why a fail-soft stage skipped. Persist an artefact before anything that can
  throw.
- **Checkpoint.** Every video needs a CHECKPOINT beat; `qa-checkpoint` enforces it.

## Redraft loops and the failure ledger

- About 75% of `.beads/failures.jsonl` is test runs (`test/redraft-loop-test`, `testing/obs-proof`).
  Filter those out before reading trends.
- The real recurring failures:
  - "gate never happy" after 2–8 redrafts
  - `overlay has no 'tpl'` (deterministic, so a lenient re-run is wasted)
  - budget not approved
  - the `claude` CLI not runnable
  - a retired Imagen model (404)

## Tests that spend by accident

- **Course tests** must stub `spine.execute` and never call `kick()`. One suite once made 7 minutes
  of real Opus calls, and another spent $0.73.
- **Stray folders.** After a course test, look for a stray `explainer-videos/<fixture>/`, which gets
  served to the LMS as a catalogue row. `rm -rf explainer-videos/testing` also deletes a committed
  fixture.
- **H46.** Python test files that call an API at import are named `check_*.py`, so a bare `pytest`
  never bills.
- **Flaky Haiku check.** The test-regressions "stdin warning" check makes a real Haiku call and can
  flake under load. That is not a regression.

## Git and the shared working tree

- **H5.** Another session edits this tree. `git add <file>` sweeps up their hunks, so stage by path
  or hunk.
- **H39a.** Prove the commit, not the disk: `git archive HEAD`, or a fresh clone
  (`git -c core.longpaths=true clone`, because a committed `.chrome-profile` has over-long paths),
  or CI.
- **H40b.** Check any docs in your commit against the code on `origin/main`.
- **H32.** The remote is public. Never force-add an ignored path.
- **H49.** After any restage, compare `git ls-tree -r HEAD | wc -l` with `git ls-files | wc -l`.
  `git add -A` nearly untracked about 1,520 files.

## Windows and shell traps

- **H36.** PowerShell for any command handed to the owner: no `&&`; use `; if ($?) {…}`.
- **H7a.** A bare `bash` is the WSL launcher. Use Git Bash or the `.ps1` wrappers.
- **H1.** `python3` is a Store stub. Use `py`.
- **H12.** Node reads `/tmp` as `E:\tmp`. Use the scratchpad directory.
- **H10 / H11 / H48.** Preserve CRLF when scripting edits, and make anchors unique. Heredocs mangle
  backslashes: write JS through Write/Edit, then check it with `node --check`.
- **`$env:X`.** In PowerShell, `$env:X` inside a native command line expands in the parent shell.

## Verification discipline

- **H9 / H13 / H18.** Assert on the artefact, not the exit code. Watch every new check fail once. An
  unknown on the check that carries the weight counts as a fail.
- **Before and after.** Run the verifier before the deploy as well as after, so you know what the
  deploy changed.
- **Unrun rungs.** Report the rungs that did not run as not run.

## Observed runs (dated baselines)

- **2026-09-28, course** `course-mullwln8`, `lms-e2e.js`: every check passed.
  - Media $0.52 (12 images, 18 TTS; animation blocked by kie), total $3.73 (model about $3.21).
  - Render dir 332 KB afterwards; `videosHeldLocally` 0.
- **2026-09-28, single** `--only=single`: 22 of 22 passed.
  - $1.57; the budget was capped to the $42.07 left in the month.
  - Idempotent replay confirmed; render dir 328 KB.
- **2026-09-28, first course attempt:** looped at script-approval three times ($2.04 of model spend,
  $0 media). That run is what produced H50.

## Stale or contradicted: do not act on these

- `deployment.md` §1 and `docs/SERVICE_DURABILITY_AND_CONTRACTS.md` §6.1 still describe
  `redeploy --from-source` as the deploy. The deploy is `deploy.ps1` (above).
- The pipeline-mechanics note "repairArt has no budget check" is fixed in 2a3c666.
- H41 is superseded by H45.
- H5 says `git worktree` fails here (long `.chrome-profile` paths); use `git archive` or a
  `core.longpaths` clone instead.
- One older note says `railway run -- bash -c curl` works from Git Bash. H37b says use PowerShell
  `node -e`.
- The IDs H7, H37, H39 and H40 are each used twice in `lessons.md` (a/b above).
