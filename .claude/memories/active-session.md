# Active Session

The HOT tier. Current work and what the next session must pick up — nothing that would still be
true in three months (that belongs in a warm file; see `.claude/standards/MEMORY_TIERS.md` §1).

Kept under `DR_ACTIVE_SESSION_BUDGET` lines (default 300) by `rotate-active-session.sh`, which
moves whole dated `## YYYY-MM-DD` sections out to `session-archive/` at session end. The dated
heading is load-bearing structure — rotation matches on it and refuses to act without it.

No frontmatter: this file is machine-managed and exempt from the metadata contract.

---

## NEXT_STEPS

- Token rotation, then §7 held video. References stage built but never run with a real API key.
- Skill system rebuilt 2026-09-23. `node evals/skills/run.js` must stay green; if a `beats.js`
  legitimately changes, delete `evals/skills/baseline.json`, re-run, and commit the new snapshot
  in the SAME commit as the change. Paid `claude plugin eval` layer is specced but not built.

---

<!-- 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-22, 2026-09-22, 2026-09-22, 2026-09-22 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-22 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-23, 2026-09-23, 2026-09-23, 2026-09-22 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-24, 2026-09-23 rotated to .claude/memories/session-archive/ -->

<!-- 2026-09-25, 2026-09-25, 2026-09-25, 2026-09-24, 2026-09-24 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-28, 2026-09-28, 2026-09-27 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-25, 2026-09-25 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-28 rotated to .claude/memories/session-archive/ -->
<!-- 2026-10-05, 2026-10-06, 2026-10-07, 2026-10-07, 2026-10-08 rotated to .claude/memories/session-archive/ -->
<!-- 2026-10-09, 2026-10-13, 2026-10-13, 2026-10-13, 2026-10-13, 2026-10-12, 2026-10-12, 2026-10-12 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-28 rotated to .claude/memories/session-archive/ -->
## 2026-10-05 — LMS "Nothing was bought" about a bought video; produce flow hardened
- Diagnosed from Railway logs: job `product-thinking-for-beginners-w6lr` bought $1.60, rendered, persisted 27.2MB, then the POST-RENDER eval-text replayed its cached ERROR and blocked; one-video threw without spend; app.js -> `written` + lastError, ledger $0. Root cause chain + fixes in lessons.md H51.
- Implemented (plan `~/.claude/plans/i-am-getting-this-adaptive-backus.md`): state.js keeps `code`; one-video.produce() awaitingReview on post-render block with deliverable (synthesised `produce.finalPath` so approve()/upload can resume), spendUsd/kind/code on every throw; app.js .catch -> awaiting_review | interrupted | written, ledger settled at real spend, `lastError.{kind,code,spentUsd,deliverableAvailable}`; jobs.toPublic `deliverableAvailable`; produce.js `finalTextCheckNeeded` guard on the final eval-text; eval-text.js lazy key + `eval-text-results.json`; write() `stopAfter:'script-approval'` + `scriptSha`/`unresolvedChecks`; produce() `scriptApprovedSha` = fingerprint of beats.js on disk; `templates/lib/gemini-judge.js` (timeout 60s, 3 tries on 429/5xx/network) used by eval-text + qa-art; `orchestrator/lib/text-fixes.js` applySuggestions wired into `preApprovalChecks` (one bounded fix pass, then redraft).
- Tests: test-regressions 278 (sections oneVideoChecks, judgeClientChecks, textFixChecks + 2 in beatChecks), test-server 84. Every new check seen RED with its fix stashed. Trap: `AbortSignal.timeout` timers are unref'd -- a test awaiting only that ends the process with exit 0 and no summary; hold a ref'd timer.
- Docs: SERVICE_DURABILITY §6.1a rewritten; `docs/integration-requests/2026-10-05-produce-outcome-fields.md` for the LMS (their copy lives in Cohort2LP `content-video-poll.ts` / `videos/[id]/page.tsx`); CONTRACT-CHANGELOG "1.2, additive" entry; lms-e2e single flow asserts scriptSha, deliverableAvailable, warnings.
- Side effects to know: with a sha, produce's redraftable sensors (incl. qa-art after 2 re-rolls) go accepted-with-warning -> review for single videos too; an INVALID_BEATS redraft inside produce blocks at script-approval -> `written` with the new sha. Old video dirs keep their old eval-text/qa-art copies (copyTemplates never overwrites).
- Shipped: commit 3cf4ec7 pushed; CI 37283668153 all 6 jobs green; deployed via deploy.ps1, /health.build.commit 3cf4ec7; verify-live 14/14; /health/render 200; videosHeldLocally 0. lessons.md was staged as HEAD+H51 only (H50 is another session's uncommitted hunk); active-session.md left uncommitted (hot tier, big unrelated rotation diff).
- The instructor's original job (`9b12b753…`, tenant cohort2-lms) keeps its old `written`+lastError record; the video is on Drive. Don't press produce on it again -- hand over the Drive link.
- Quote-only single e2e PASSED live 14/14 (sha c027baf5248661fe, 0 unresolved, deliverableAvailable false, quote $2.56 < $3 cap, nothing bought, cleanup clean). `--yes` still needs Aroma's approval.

### Part 2 (same day): "There is no video to preview" on a finished course lesson
- Root cause (lessons.md H52): offload right after `review` + `deliverableAvailable` = local-only + `/file` answering JSON instead of bytes; LMS archives bytes only when the field is true. Drive file shared with 4 accounts only. Production: `GET /api/v1/deliverables` showed the lesson `videoLocal:false, saved2drive:true`.
- Implemented: `gdrive.openFileStream`; `server/lib/drive-stream.js serveDriveCopy` used by course `/file`, `/demo/make-video/:jobId/video`, `/demo/videos/:slug/file`; `X-Served-From: volume|drive`; api.js items: `deliverableAvailable` local-or-Drive, `videoLocal`, Drive fields from drive.json too; `rendered` honours `blockedBy: review`; `drive-offload.flagQueue` on both paths, spine's duplicate flag write removed; jobs.toPublic `videoLocal` (and computed when `job.review` exists without `job.script`).
- Tests: test-server 89 (lessonFileChecks rewritten: bytes/Range/416/JSON opt-in/503/HEAD/review-404/unflagged course view; single video bytes+503), test-regressions 282 (§12: flagQueue x3 + source guard). Mutation: 9 server checks red with api/app/jobs stashed; 3 regressions red with drive-offload stashed. Trap found: the 503 body's `message` was overwritten by the record's `message` via spread order -- test caught it.
- Docs: CONTRACT-CHANGELOG second table under "1.2, additive — 2026-10-05"; course-api-v1.2 rows; 2026-09-22 API reference §2.5/§5; SERVICE_DURABILITY §4a.6 rewritten + new §4a.9; lms-api.md + SKILL.md T3 rows; combined LMS note `2026-10-05-produce-outcome-fields.md` Part 2 (asks: flag `CONTENT_QUEEN_LESSON_FILE_ENABLED` on Render prod, retry on 503, page copy rule, staging spends on our prod).
- lms-e2e: `http({buffer:true})`, `checkDriveServed` (JSON on Accept, bytes md5==record, Range 206), course view asserts deliverableAvailable true / videoLocal false.
- Shipped: commit 310fbbc pushed; CI 37288989246 all 6 jobs green; deployed via deploy.ps1, /health.build.commit 310fbbc; verify-live 14/14; /health/render 200; offloadedToDrive 4, videosHeldLocally 0, rss 85MB. LIVE PROOF on the instructor's own video (`made/product-thinking-for-beginners-w6lr`, 27,158,960 bytes on Drive): `/demo/videos/<slug>/file` HEAD 200 `x-served-from: drive`, `Range: bytes=0-1023` → 206 `bytes 0-1023/27158960` with real mp4 bytes (`ftypisom`); `Accept: application/json` → the record with verified md5. Render (LMS prod, read-only via their RENDER_API_KEY, never printed): `CONTENT_QUEEN_LESSON_FILE_ENABLED=true` on capacitylab-worker, ABSENT on capacitylab-api; both deployed 2026-09-29 e075b22; worker poller ran every 1-2 min all morning.
- NEXT: T3 paid course flow `lms-e2e --only=course --series lms-e2e-2026-10-05b` (~$1.5-4 media + ~$3 model) needs Aroma's approval; it is the only end-to-end proof that a course lesson's `/file` streams from Drive via the course route (the single-video route is proven live above). Tell the LMS team: Part 2 of `docs/integration-requests/2026-10-05-produce-outcome-fields.md`; their poller should now archive `project-management-for-dummies` on its next tick. lessons.md staged as HEAD+H52 only; active-session.md left uncommitted (other sessions' rotation diff). Tell the LMS team about the new fields (doc above). Out of scope flagged: Gemini judge spend uncounted; partial art/TTS spend unrecorded on non-zero exit; writer quality on qa-visuals redrafts.

## 2026-09-29
- New skill `testing-the-pipeline-end-to-end` (owner Abdulrehman Siddiq), commit f5bd0b3, CI 36483921827 green on all 6 jobs. SKILL.md + references/{lms-api,paths-and-commands,lessons-for-testing}.md + evals/evals.json (Agent Skills format). Five runnable cases in evals/agent-plugin/evals/ (lms-test-token, reapprove-loop, how-to-deploy, lms-route-regression, no-motion-in-video): each 1.00 with skill vs 0.00 without. Recorded in evals/agent-plugin/BASELINE.md "Third run".
- Learned: `claude plugin eval` prompt.md rejects unknown frontmatter keys (e.g. `owner`); `--case` takes one name, not a brace glob; per-case `model:` key exists for multi-model runs. Haiku under-triggers project skills (reapprove-loop 0/4, control quote-a-paid-run 1/2).
- Pointers added to creating-explainer-videos, paid-run-protocol (§7 deploy fixed), verify-before-claiming, script-lint-preflight, this-machine; CLAUDE.md nav row (142 lines).

## 2026-10-15 — pull only (rebased local ffe2875 onto origin; now c290ef6, still unpushed)

- `git pull --rebase` brought in b1c14fb (P&C Course 1 Weeks 1-4, softer motion-graphics music)
  and d243c5e (sync of the other machine's working branch). Local fix ffe2875 was rebased to c290ef6
  and is STILL NOT PUSHED (main is ahead 1).
- Six files conflicted on stash pop, all append-only logs/memory: failures.jsonl, runs.jsonl,
  health.json, active-session.md, mistakes.md, session-archive/2026-09-25.md. Resolved by keeping
  both sides (health.json: took the newer upstream copy). JSONL re-validated, 0 bad lines.
- Four untracked session archives (09-28, 10-05, 10-07, 10-13) had same-named committed versions
  from the other machine with different content; this machine's copy was appended under a
  `<!-- merged 2026-10-15 ... -->` marker so nothing was lost. They now show as modified.
- Lesson: the conflict separator `=======` carries a CR here (CRLF checkout), so strip with
  `/^=======\r?$/`. During `stash pop`, `--ours` = upstream/HEAD and `--theirs` = the stash.
- stash@{0} "pre-pull 2026-10-15" was left in place (drop refused by the harness); safe to drop.
- Next: push c290ef6 when Aroma says so, then deploy per CLAUDE.md.

## 2026-10-15 (later) — contract 1.3 pushed to main; Railway deploy waiting on the user

- origin/main fast-forwarded d243c5e to 5067b9e (feat/video-redo-1.3, contract 1.3 scene redo and
  lesson cancel, plus the approve-publishes-reviewed-video fix). The user pushed it from PowerShell.
  Before that, tests were all green on the branch and lint was clean.
- The first deploy attempt failed at step 4 with "railway: command not found". Cause: on this
  machine (TBD-AR) earlier sessions only ever ran the Railway CLI through npx, so there was no
  global install for deploy.sh to call. Fixed by a global npm install of @railway/cli 5.68.0; Git
  Bash now finds it and it is logged in and linked to ContentQueen / content-queen.
- Not yet confirmed: the deploy itself. The user is re-running the PowerShell deploy script. Check
  that /health build.commit is 5067b9e and GET /api/v1 reports contractVersion 1.3.
- COURSE_VIDEO_REDO and RESIDUE_KEEP stay off. Rollout steps 2 to 4 in the 2026-10-15 scene-redo
  integration request are still to do, and that write-up has not been sent to Aroma or the LMS team.
- Earlier today's pre-pull stash is still in the stash list and safe to drop.
- DEPLOYED (2026-10-15): production /health reports build 5067b9e, ok, contract 1.3. The API index
  lists video/revise and cancel, and videoRedo shows enabled=false, maxRounds 3, reserve $0.75.
  verify-live 9 passed, 0 failed (token-gated checks skipped: no CONTENT_API_TOKEN locally).
- Next: rollout steps 2 to 4 of the scene-redo write-up (RESIDUE_KEEP on staging, then
  COURSE_VIDEO_REDO on staging, one measured redo), and send the write-up to Aroma and the LMS team.

## 2026-10-16 — state check (no changes made)

- Aroma's session pushed e43d77b (motion-graphics overlap fix), c6983ff + 31b2a8d (Moawin 1A
  checkpoint and catalogue). Live production is 31b2a8d, contract 1.3, ok.
- origin/main is 19e76a5, one commit ahead of live, but it only edits the creating-explainer-videos
  SKILL.md (step 9b: publish each video's quiz checkpoint from a clean main worktree). Nothing to deploy.
- This checkout is still on feat/video-redo-1.3 (merged as PR #3), 4 commits behind origin/main.
  Switch to main and pull before new work.
- Still open: scene redo and residue switches off; staging rollout steps 2-4 and sending the
  write-up to the LMS team.
- 2026-10-16: user asked what to give the LMS. Answer: the scene-redo write-up plus the frozen
  docs/contracts/course-api-v1.3.md. Could not confirm the P&C c1w1-c1w4 quiz checkpoints are live:
  the checkpoints route answers 401 without CONTENT_API_TOKEN, which this machine does not have.
  The "Quiz checkpoint NOT published" hook warning was a false alarm (log: nothing changed, exit 0).

## 2026-10-19 — LMS shipped their side of contract 1.3; asked us to switch it on in production

- LMS reply (pasted by the user): re-archive on reviewedSha256 change, fullRebuild when
  residueAvailable is false, new fields mirrored, videoRedo read from GET /api/v1. They ask for
  RESIDUE_KEEP=1 and COURSE_VIDEO_REDO=1 on production, confirmation of maxRounds/reserveUsd, and
  whether pre-switch lessons' parts can be recovered from the Shared Drive.
- Answers found: live videoRedo is maxRounds 3, reserveUsd 0.75 (code defaults, no override set).
  Pre-switch lessons cannot be recovered: drive-offload deleted art/audio/clips/out once the final
  verified, and only the branded _final.mp4 went to Drive. residueAvailable only checks for a
  residue.tar on the volume or Drive (server/lib/api.js). No backfill script exists.
- Production variables (names checked, values not read): RESIDUE_KEEP, COURSE_VIDEO_REDO and
  GDRIVE_RESIDUE_FOLDER_ID are all unset. Drive itself is configured (service account, main folder set).
  Without GDRIVE_RESIDUE_FOLDER_ID, residue stays on the volume only and working dirs are never
  reclaimed, so the volume grows by roughly 150 MB per lesson plus working dirs.
- NOT done: no production variables changed. The written rollout said test on staging first; the
  LMS asked for production directly. Decision is the user's/Aroma's. A draft reply was given in chat.
- 2026-10-19 later: user chose production directly (no staging test) and asked me to create the
  folder. Created Shared Drive folder "CQ-Lesson-Residue" at the root of the Taleemabad University
  Shared Drive, next to UnPublished-CQ-Videos. The production service account is an organizer on
  that Shared Drive. Set on production content-queen: GDRIVE_RESIDUE_FOLDER_ID (that folder),
  RESIDUE_KEEP=1, COURSE_VIDEO_REDO=1, in one call while the service was idle. Railway started a
  rebuild of the same code (live commit 31b2a8d) to pick them up.
- Next: confirm GET /api/v1 videoRedo.enabled is true; then the user's production test (build one
  lesson, check its residue tar lands in the folder, redo one scene, measure time and cost).
- CONFIRMED live 2026-10-19 12:45 PKT: rebuild SUCCESS, health ok, commit 31b2a8d, contract 1.3,
  videoRedo enabled true (maxRounds 3, reserveUsd 0.75), Drive authorised. The LMS redo button
  should now appear. Residue saving is unproven until the first lesson builds after the switch.
- 2026-10-19: LMS confirmed their side is live in production (redo button shows when videoRedo is
  enabled). They will build a new lesson today and send one scene back. Their Approve button unlocks
  only after their own copy of the new video is saved (a few minutes). They will compare the
  published YouTube video with what their reviewer watched.
- CORRECTION: the first redo's Drive file is `<series>__<slug>_final.r1.mp4`, not `.r2`
  (drive-offload.js names it from videoRedoRound, which is 1 after the first redo; the original
  has no suffix). The rollout section of the 2026-10-15 write-up and my earlier messages said .r2.
- Next: when they send lesson details, watch the redo (time, cost, residue tar in CQ-Lesson-Residue,
  .r1 file on Drive, new reviewedSha256), then confirm the published bytes are the redone ones.

## 2026-10-20 — first production scene redo failed; four defects fixed on fix/redo-returns-to-review

- Root cause of the stitch failure (reproduced on the container in /tmp, read-only): make-music.js
  fed ffmpeg 20 `-f lavfi -i sine=…` inputs; each lavfi demuxer builds its own filter graph with a
  thread per CPU (48 cores) -> ~700-950 threads against cgroup pids.max=1000 ->
  "pthread_create failed: Resource temporarily unavailable". Peak pids measured 760 (old) vs 82
  (new, baseline 75). The first build slipped under; the redo, with 59 zombie Chrome processes
  under PID 1 (node never reaps), did not. Fix: tones as sine SOURCES inside one graph +
  `-threads 1 -filter_complex_threads 1`; Dockerfile gets tini as PID 1.
- shell.js now leads the error with "cause" lines (causeLines) before the 8-line tail: the old
  message was Node's execFileSync dump with the ffmpeg line scrolled off.
- recordReviewedVideo now falls back to the verified Drive record (drive.json + video-meta.json
  must agree) when the file was already offloaded -- that is why every course lesson reached
  review with no reviewedSha256.
- A redo now judges only the flagged scenes (qa-art --ids) and counts as human-approved
  (opts.videoRedo); before, qa-art re-judged all 14 images, re-bought scene 09 and redrafted.
- A failed redo returns to blocked/review with the SAME reviewedSha256, the pre-redo beats.js and
  durations.json restored from deliverables/<series>/<slug>/pre-redo.r<round>/, `redoFailed`
  set, round counted, videoRedo cleared. Snapshot taken at video/revise (snapshotForRedo).
  Decision: user chose "back to review" over "stay failed" (the LMS offers a $1.50 Retry on failed).
- LMS side (checked in E:\Cohort2LP-redo, their branch feat/course-review-remake-script; E:\Cohort2LP
  is 21 commits stale): on a blocked lesson they store `reason` and DROP `error`; they re-archive on
  reviewedSha256/redoRound change and need `deliverableAvailable: true` to unlock Approve after a
  redo; `redoFailed` is not in their allowlist yet; their badge says "Remade" whenever redoRound>0.
- Tests: 347 regressions pass; 5 new checks each watched red by mutation. Docs: contract §1/§2,
  CONTRACT-CHANGELOG (1.3 clarification), integration-requests/2026-10-20-failed-redo-returns-to-review.md.
- The stranded QA lesson lms-e2e-redo-cancel-2026-10-19/why-the-worked-example-comes-first is still
  `failed` holding course-mvfaza8e; LMS should cancel it and redo on a new lesson.
- Railway CLI needs `-p 781cf48b-…` when the shell cwd casing is e:\ (config keys on E:\).
- Deployed 0e58223 (user pushed + deploy.ps1; verify-live 9/9; videoRedo still enabled). BUT PID 1
  on the container was still `node`: railway.json deploy.startCommand ("node server/index.js")
  REPLACES the Dockerfile ENTRYPOINT, so tini never ran. Fixed by setting startCommand to
  "/usr/bin/tini -- node server/index.js" + a test-predeploy check pinning both. Needs one more
  push to main + deploy.ps1 to take effect; verify with `cat /proc/1/comm` == tini over railway ssh.
- DEPLOYED f74792e (user). Verified over railway ssh: PID 1 is tini (`/usr/bin/tini -- node
  server/index.js`), node is PID 2 under it, 0 zombies, pids.current 9. videoRedo still enabled,
  contract 1.3. Everything from the 2026-10-20 fix is live. Next: the LMS cancels the stranded
  Sunday lesson and redoes one scene on a new lesson; watch time, cost, residue, .r1 file, published
  bytes. The 2026-10-20 write-up and the chat message were handed to the user to send.

## 2026-10-20 (contract 1.4 — script-first single videos, branch feat/contract-1.4)

- Built the LMS's 1.4 request (E:\Nazim\.claude\docs\planning\2026-10-20-content-queen-1.4-request.md)
  plus the user's widening (instructor picks style / lengthMinutes / voiceover / purpose on create;
  Ali + checkpoint relax per purpose). Reply written for Nazim:
  docs/integration-requests/2026-10-20-content-queen-1.4-reply.md. Changelog 1.4 entry added.
- New modules: orchestrator/lib/{context,options,purpose,est-seconds,script-checks}.js,
  server/lib/capabilities.js, templates/lib/checkpoint-checks.js (qa-checkpoint.js is now a CLI
  around it; CHECKPOINT_REQUIRED=0 relaxes), templates/silent-durations.js (voiceover:false path:
  SILENT=1, mix-audio lays anullsrc, verify skips clip checks), prompts/video_purpose_*.txt.
- Routes: script/edit ($0, sync, new sha, 422 check_failed on NEW findings only), script/revise
  (written -> revising -> written, cap 5 -> 409 revision_cap, spentUsd on script.revisions[]),
  produce scriptSha -> 409 sha_mismatch, make-video body 1 MB + JSON 413/400 error middleware.
  Flags MAKE_VIDEO_CONTEXT / _SCRIPT_EDIT / _SCRIPT_REVISE, off by default -> 400 capability_disabled.
- Decisions worth defending: `revising` is a new status because restore() fails `running` on
  boot and a revise has a good script to fall back to; a flag-off request is REFUSED not ignored
  (the LMS must never believe a document was used); spine now carries `scope` through a sensor
  redraft (closes a 1.3 gap too: a second draft used to get the full patch schema).
- Things the request assumed that were not true: notes silently truncated at 2000 (still is);
  express.json 32kb cap; no `revision_cap`/`script-approval` status; caption <= 8 words enforced
  nowhere; no "data not instructions" framing anywhere. All recorded in the reply.
- Rules doc: CLAUDE.md + SCRIPTING_STANDARDS §3b got a "purpose exemption" line marked PENDING
  Aroma's sign-off — do not build marketing/announcement videos until she agrees.
- Tests: regressions 361/0, server 112/0, store/predeploy/layout green, lint clean, skill evals
  387/387. verify-all tier 1: "the live /health route answers ok:false" fails ONLY when npm test
  is spawned by verify-all; it passes under plain `npm test` and under a non-TTY node spawn. Cause
  NOT found (no .env loading; health.js reads PIPELINE_BUDGET_USD); nothing in 1.4 touches it.
  qa-checkpoint fixture needed templates/lib copied (fixed in verify-all.js).
- NEXT: (1) Aroma signs off the purpose exemption; (2) commit on feat/contract-1.4 (never stage the
  memory files whole -- other sessions edit them); (3) push <branch>:main + .\scripts\deploy.ps1
  with the three flags OFF, confirm /health.contractVersion 1.4 and verify-live; (4) quote one real
  scoped revise (~$0.5) under paid-run-protocol; (5) flip flags in Railway, send Nazim the reply;
  (6) known gap: edit cannot clear a field (applyEdits drops empties) -- add `null` = clear if asked.
- 2026-10-20 later: user said "deploy first". `git push origin feat/contract-1.4:main` was DENIED by
  the auto-mode classifier (publication) -- the user must run the push + .\scripts\deploy.ps1 by
  hand, then confirm /health.contractVersion == 1.4 and makeVideo.* all false. LMS cover message
  drafted in chat (detailed, points at the reply doc). Flags stay OFF until Nazim says go.
- DEPLOYED f2bfb96 (user pushed feat/contract-1.4:main + deploy.ps1; verify-live 9/9, contract
  1.4 live). Flags MAKE_VIDEO_* still OFF on Railway. LMS cover message handed to the user.
  Next: Nazim says go -> set the three flags in Railway (CORRECTED 2026-10-21: a changed variable
  reaches only the next container -- `--skip-deploys` + deploy.ps1, see lessons.md H55) ->
  confirm /health.makeVideo flips -> their e2e job ids. Aroma's sign-off on the purpose exemption.

## 2026-10-21 (Nazim accepted 1.4; first switch)

- Nazim's reply (E:/Nazim/.claude/docs/planning/2026-10-21-cq-1.4-reply-to-aroma.md): LMS built
  against 1.4; wants the switches on ONE AT A TIME in the order SCRIPT_EDIT -> CONTEXT ->
  SCRIPT_REVISE, job ids after each; `null`=clear and `correctNote` not needed; `.xls` sent as
  `xlsx`; they never send `purpose` until Aroma signs off. One question: does `voiceover:false`
  change produce cost (their button says $2.50)?
- Answer: the $2.50 is the COURSE lesson reserve (config.js courseLessonReserveUsd), not ours;
  single videos settle to produce.spendUsd. Silent saves clips x $0.002 (~$0.04); a motion beat
  > 6 s moves to the 10 s i2v bucket (+$0.25 each). Added `script.estimateUsd` on the read
  (jobs.toPublic via produce._internals.estimateSpend {silent}) + `makeVideo.estimateUsd: true`;
  fixed monthlyCap (app.js) to pass {silent}.
- CORRECTION of 2026-10-20: "flags read at call time, no redeploy" was wrong for Railway -- the
  process reads env live but a changed variable only reaches the next container. Flip =
  `railway variables --set X=1 --skip-deploys` then `.\scripts\deploy.ps1`. Docs fixed
  (DEPLOYMENT_PREREQS, SERVICE_DURABILITY §6.1b, 1.4 reply doc). Rule: lessons.md H55.
- Reply doc: docs/integration-requests/2026-10-21-content-queen-1.4-reply-2.md.
- Next: push feat/contract-1.4:main + deploy with MAKE_VIDEO_SCRIPT_EDIT=1; confirm
  /health.makeVideo.scriptEdit true + estimateUsd on a job; tell Nazim; await their edit job ids;
  then CONTEXT, then SCRIPT_REVISE, each its own guarded deploy.
- DEPLOYED 4c9d396 (user: push + `railway variables --set MAKE_VIDEO_SCRIPT_EDIT=1 --skip-deploys`
  + deploy.ps1; predeploy idle; verify-live 9/9). Live /health.makeVideo: scriptEdit TRUE,
  estimateUsd true, context/scriptRevise false. Nazim told. Next: their edit job ids -> then
  CONTEXT (same recipe), then SCRIPT_REVISE after the ~$0.50 real scoped revise + Aroma's purpose
  sign-off. Note: the curl line I handed over had a `<content-queen>` placeholder -- give real hosts.

## 2026-10-22 (Nazim: edit verified on prod; asks for CONTEXT; spend-vs-estimate question)

- LMS verified script/edit on prod (2 edits, shas a71a8b01->e63e4b7c->afdf45d5; estimateUsd 1.64;
  stopped at written). Our check_failed/sha_mismatch never fired -- their own API refused first.
  They keep /demo job ids out of messages (the id authorises spend/publish).
- They ask: flip MAKE_VIDEO_CONTEXT; then SCRIPT_REVISE; and "how far can spend exceed estimateUsd?"
- FOUND: estimateUsd is MEDIA only (one clean pass, motion at the 5 s floor); produce.spendUsd
  (what the ledger settles) = media + model. Media is hard-capped by budgetUsd at every purchase
  (repairAffordable + post-TTS animation reprice); model spend from produce-time redrafts
  (spine MAX_REDRAFTS 2/reviewer, 6 total; ~$0.6-1.0 a round) is NOT capped. The budget is the
  service ceiling cut to the month, not the estimate. Gemini judges' spend is not recorded.
  pipeline-mechanics.md "repairs bypass budget" note was stale -- marked fixed.
- Reply: docs/integration-requests/2026-10-22-content-queen-1.4-reply-3.md (+$0.50 covers media
  drift only; hold +$1.50 for one redraft; OFFER optional `maxUsd` on produce = media cap).
- Production reads (railway ssh) are denied by the auto-mode classifier -- ask the user to run them.
- Next: user pushes + flips MAKE_VIDEO_CONTEXT (--skip-deploys + deploy.ps1); tell Nazim; build
  `maxUsd` only if they say yes; they send two raw refusal edits to prove check_failed/sha_mismatch.
- 2026-10-22 later: user's push of feat/contract-1.4:main was REJECTED (fetch first) -- another
  session pushed 9d61d44 (memory archive only). Merged origin/main into the branch (2a338ae;
  `git merge`, not rebase: the shared tree is dirty with other sessions' work). Railway login had
  expired; user re-logged in and set MAKE_VIDEO_CONTEXT=1 --skip-deploys. NOT yet deployed --
  push then deploy.ps1, then confirm /health.makeVideo.context true before telling Nazim.

## 2026-10-27 — branches tidied; main pushed; CI red cause fixed

- All three feature branches (feat/video-redo-1.3, fix/redo-returns-to-review, pc-people-skills-c1w1)
  were already fully in main; nothing to merge. Local branches deleted; the harness refused the
  remote deletes, handed to the user (`git push origin --delete …`). Only `main` stays.
- Main CI had been red since 2026-10-20 on "Render gates, in the deploy image": pipeline-harness.sh
  copied only the gate script into each fixture, and since contract 1.4 qa-checkpoint.js requires
  ./lib/checkpoint-checks. Fixed in 29fb607: the harness copies the template lib/ beside the gate
  (as produce.js's refresh does) and the two notion-slack fixtures carry the refreshed lib/.
  Proven in temp copies (gate alone exit 1, with lib exit 0). CI on 2d7846a is the live proof.
- Pushed to main: 29fb607 (CI fix), beab4ff (memory 10-13..10-27), 2d7846a (local permissions).
  Commit naming rule from here: `Type: what -- why` (CI:, Fix:, Memory:, Config:, Contract x.y:).
- Existing main history cannot be renamed (no force-push to main).
- stash@{0} "pre-pull 2026-10-15" still present; harness refuses `git stash drop`; safe for the user.
- CI on 2d7846a: all 6 jobs green, including "Render gates, in the deploy image" (first green main
  run since 2026-10-20). Remaining for the user: delete the 3 remote branches and drop the stash.

## 2026-10-28 — pull only

- Fast-forwarded main 2d7846a -> 6c77218: contract 1.5 cues guide + feedback rubric, contract 1.6
  (course documents, video ratings, in-product feedback), its LMS integration guide (Word copy).
  No local commits, no conflicts. The three remote feature branches still exist (user has not run
  the delete yet); stash@{0} still present.

## 2026-10-29 — pull check only
- `git fetch`: origin/main still 6c77218 (same as local). Nothing to pull, nothing committed, nothing deployed.
- Still outstanding for the user to run (harness refuses): `git push origin --delete feat/video-redo-1.3 fix/redo-returns-to-review pc-people-skills-c1w1` and `git stash drop`. All three remote branches still exist.
- Still unknown whether production carries contract 1.6 (main 6c77218); last confirmed deploy was f74792e. Check `/health.build.commit` before telling the LMS 1.6 is live.

## 2026-10-29 — contract 1.7 (reply to LMS "1.5 and 1.6 are live" memo) — UNCOMMITTED, NOT DEPLOYED
- LMS ran course-mvt6q73v to published on prod 29 Oct ($3.1921 = model 2.6761 + media 0.516), so prod
  does carry 1.6. Their `partnerSpentUsd` = our course `spentUsd`. The $2.46 at the script gate was
  model tokens (research/script/script-review); media is $0 until approval. The "about five cents"
  comment in course-worker.js was wrong, now fixed. Script phase costs ~$2-3 per lesson.
- 1.7 (additive): GET /api/v1 `nextAction {who, kinds, actions}`; per queued lesson `lessonsAhead`
  (queuePosition excludes the lesson building now, so `queuePosition-1` undercounted); course
  `spentModelUsd/spentMediaUsd/spentSplitKnown`; changelog documents `stoppedAt`; test pins `since`
  across restore(). Files: server/lib/{api,next-action,course-worker}.js, orchestrator/test-server.js,
  docs/CONTRACT-CHANGELOG.md, reply docs/integration-requests/2026-10-29-course-builder-1.5-1.6-live-reply.md.
- Tests: test-server 122/122, regressions 361, npm test all green; each new check mutation-tested red.
  The "+1 while building" branch of lessonsAhead is only tested idle (no way to set worker.current).
  verify-all once flaked on the live /health ok:false check; passed on rerun.
- Next: commit (stage hunks only), deploy on approval, then verify contractVersion 1.7 + split on
  course-mvt6q73v, then send the reply.
- Reply rewritten as the full, detailed LMS message, with complete routes and LMS file paths
  (Cohort2LP: content-course-poll.ts:268/:348, course-hold.ts:42 ourPosition, next-action.ts:62-64
  ActionKey = our 9 verbs, content-queen-courses.ts:958). It says 1.7 is live only once /health
  shows contractVersion 1.7, so deploy before sending.
