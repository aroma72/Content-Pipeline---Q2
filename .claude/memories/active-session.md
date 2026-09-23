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
## 2026-09-23 — Tick moved to 30 min; the CPU spike and the 2-min blips are different things

Aroma read two Railway metric views as one problem. They are not:

- The **2-minute sawtooth** at ~0.02 vCPU is `startLoop()` (`server/lib/tick.js:595`) waking up.
  Near-free, but it was polling Slack + Notion 720 times a day for an empty queue.
- The **3 vCPU / 3 GB spike** is a render: 2 headless Chrome at 1920x1080 (~1.2 GB each,
  `RENDER_WORKERS=2` pinned at `Dockerfile:41`) plus the PNG page cache plus ffmpeg at
  `-preset medium -crf 18`. Raising the tick does nothing to it. Said so plainly rather than
  letting the env change look like a fix for the spike.

Done, live and verified:
- `TICK_INTERVAL_MS` 120000 -> **1800000** on the `content-queen` production service. Logs show
  `[tick] polling every 1800s` (deploy `13271139`). Revert = set it back; read at boot only.
- `server/app.js` (commit `25610fa`): an in-thread Slack reply now calls `runTick` directly. The
  filter above it only admitted `app_mention` and DMs, so a *reply* — an answered question, an
  approved budget, an approved review — was timer-only. At 2 min invisible; at 30 min not.
  Bot scopes already carry `channels:history` / `groups:history`, so the events can arrive.

**Google Drive was rejected as a memory fix, and the reasoning is the reusable part:** the 3 GB
is live Chrome processes and frames being *created*, not finished files at rest. Drive moves
files at rest. The volume is 0.8 GB of 48.8 GB — storage was never the constraint. Match the
remedy to what is actually holding the bytes.

Next session should pick up:
- **Unresolved, deliberately deferred:** `POST /demo/make-video/:jobId/produce` (`server/app.js:593`)
  fires `oneVideo.produce` detached with no in-flight cap. Rate limits are per-hour quotas, not a
  concurrency gate, so two tenants can render at once — 2x the 3 GB peak on a one-replica service.
  Aroma chose "explain only, change nothing" this pass. This is the real OOM risk, not the tick.
- `produce.js:334` never overwrites an existing `compile-lesson.js`, so video folders scaffolded
  before the `byMemory` cap (e.g. `explainer-videos/evals/why-a-checklist-beats-a-careful-reader`)
  still compute workers from **host** RAM and would launch 6 Chromes if `RENDER_WORKERS` were unset.
- Notion-only actions (status edited in the Notion UI, approvals given there not in Slack) now wait
  up to 30 min. No Notion webhook exists. Tell the team, or build one.

## 2026-09-23 — Skills were invisible to Claude; a YAML colon was the cause

**The find.** Four skills (`audio-mux`, `git-workflow`, `video-render`, `pipeline-review`) had no
`name`/`description` at all — 817 lines of correct guidance Claude could never invoke. Worse, TWO
MORE were broken by a subtler fault: **an unquoted YAML scalar cannot contain `": "`**, so
`description: Produces ... Stack: beats.js ...` fails to parse and the skill loads with its H1
heading as its description. That silently disabled `creating-explainer-videos` — the DEFAULT
pipeline — and `creating-avatar-videos`. Root cause of the whole class: `smoke-test.sh` Test 6
checked that frontmatter EXISTED, never that it said anything.

**Confirmed by the harness itself**, not inferred: the session skill listing re-printed each
description the moment it parsed.

**Built.** 4 new skills from the ledgers — `verify-before-claiming` (~20 exit-code-vs-artefact
incidents), `this-machine` (+ references/shell-escaping, references/hook-authoring),
`script-lint-preflight` (24 failing content-lint rows), `paid-run-protocol` (3 wrong spend quotes).
`evals/skills/run.js`: 342 assertions in 3 layers, $0, wired into `smoke-test.sh` (Test 12) and a
PostToolUse branch in `validate-after-write.sh`. `route-skill.js` adds one routing line on
UserPromptSubmit when a skill clearly matches, silent otherwise. Standard:
`.claude/standards/SKILL_AUTHORING.md`.

**Environment re-probed 2026-09-23** — correction to lessons.md: Docker CLI 29.6.1 IS installed;
it is the **daemon** that will not start (`npipe ... dockerDesktopLinuxEngine`), not WSL as
recorded. `python` now works as well as `py`. Node still 20.19.0. `python3` still the Store stub
(rc=49, message on **stdout**).

**Two self-inflicted bugs worth remembering, both already in the lessons:**
1. A patch script wrote a literal **backspace** instead of `\b`, so `split(/\bNOT\b/)` became
   `split(/<BS>NOT<BS>/)` and silently stripped nothing. Fourth occurrence of this escaping trap.
   Fix: stop generating regex through nested string layers; write the file directly.
2. `file x.md` reports "CRLF" if ANY line is CRLF. It said CRLF for files that were 99% LF, so
   "preserving" CRLF actually injected one stray CRLF line into nine skills. Measure line endings
   by counting, not with `file`.

**Mutation-tested**: each of the 3 layers was deliberately broken, seen to fail, and restored.

**Left undone (deliberate):** `claude plugin eval` — needs `.claude-plugin/plugin.json` and spends
money per run. Fully specified in `evals/skills/README.md`. `avatar-video-kit/` at the repo root
was NOT deleted: it is a standalone distributable kit (README, docs, word-docs), not a stray
duplicate, and its SKILL.md is outside `.claude/skills/` so it never loads and creates no ambiguity.

---

## 2026-09-22 — The references feature was shipped switched off; LMS now has a contract

**`references` returned `[]` on every lesson ever built.** `llm.askWithSearch` hard-required
ANTHROPIC_API_KEY; production holds CLAUDE_CODE_OAUTH_TOKEN and no key; the stage is fail-soft. So
it failed **silently** and looked like "no good references found". A fail-soft stage with a hard
credential requirement is an outage that reports success.

**Fixed in `c4533cc`** (pushed to main; **redeploy still PENDING — the deploy step was refused by
the tooling and needs Aroma to run it**). Added `llm-cli.askWithSearch`; `llm.askWithSearch` falls
back to it when there is no API credential.

Three things that were measured, not assumed:

1. **`--allowedTools` is PERMISSION; `--tools` is whether the tool is OFFERED.** With only the
   former, the model answered from memory, emitted plausible URLs, reported success, and logged
   `web_search_requests: 0`. Both flags are required.
2. **`usage.server_tool_use.web_search_requests` stays 0 on the CLI path** — it counts the API's
   server-side tool, not Claude Code's WebSearch. It therefore CANNOT carry the proof-of-search
   guarantee. `--output-format stream-json --verbose` emits one `tool_use` block per call; count
   those instead.
3. **Search runs on Sonnet, not the pinned Opus.** Opus: 8 searches, ~$1.18 against the plan — about
   the cost of the video it decorates. Sonnet: 4 searches, ~$0.43, same 3 verified references.
   `SEARCH_MODEL` overrides.

Verified inside the Railway container, then end to end locally: 4 searches → 4 proposed → 3 verified
and kept; one dropped for a redirect loop, one for an essay-length `why`.

**E:\Nazim did NOT prove headless search works** — only the subscription-auth pattern. It has
playbook text telling the agent to search, a stale note saying the runner grants no WebSearch, and
an unbuilt plan item to add WebFetch. The probe was ours to run.

**New: `docs/integration-requests/2026-09-22-content-automation-api-reference.md`** — the API
contract the LMS never had. Checked against the LIVE service, not the source. It corrects three
stale beliefs in their client: approve no longer ignores `:courseId` (`notThisCourse`), `blockedBy`
is 10 values not 9, and `references` exists. It states what they could not infer: approve costs $0,
requeue re-spends ~$1.50, a duplicate build shows `queued: 0`, and `/demo/spend` cannot see course
spend.

**Live findings worth keeping:** webhooks are DISABLED in production (`WEBHOOK_ALLOWED_HOSTS`
unset), so any `callbackUrl` is refused 400. `reason` strings come back **mojibake** (UTF-8
double-encoded) and the LMS renders them to instructors.

**Then production refused it anyway — `661b995`.** Running the stage in the container (not trusting
a green local run) surfaced `this workspace has not been trusted`: permitting a tool makes the CLI
read the cwd's `.claude/settings.json` and exit 1 before any model call. Fail-soft swallowed it, so
references came back empty — the same silent outage, new costume. Fixed by spawning the search in
`os.tmpdir()`. See `lessons.md` H23. **Green suite + green CI + successful deploy all missed this.**

**LMS found a real durability bug — `282f17a`.** They reported `/file` 404ing for a lesson blocked
after a paid render and asked us to relax a status gate for four `blockedBy` values. **There is no
status gate** — the handler looks up the bytes first and only the message varies by status, so their
requested change would have done nothing. Three faults, all ours:

1. **The mp4 persist sat AFTER the `eval-text` sensor, which blocks by throwing** — so a block there
   skipped the copy and the only copy of a paid render stayed in a `.dockerignore`d directory. The
   exact loss `deliverables.js` exists to prevent, reproduced by it. See `lessons.md` H24.
2. **`finalRendered: true` was hardcoded** on every blocking sensor; `qa-clips` and `qa-frames` run
   BEFORE `compile-lesson.js`. Our API reference repeated it, which is what sent them hunting bytes
   that were never made. See H25.
3. The 404 said "no finished video yet" for a lesson that spent money in full.

**Their probed lesson has no video and never did** — blocked at `qa-frames` (pre-render) on
2026-09-21; the volume has no directory for it at all. Nothing recoverable.

Shipped: persist before the last gate · `finalRendered` per call site · honest 404 with `status`/
`blockedBy`/`renderExists`/`partsAvailable` · **`deliverableAvailable`** on blocked+done items (a
fact, not a rule — no `blockedBy` mapping can be right) · `GET .../beats` (produce has been keeping
beats.js for a reader that did not exist) · `/file`, `/beats`, `/deliverables` now on `GET /api/v1`
· `DELETE /demo/make-video/:jobId/video`. Reply letter at
`E:\Cohort2LP\docs\content-automation\2026-09-22-file-serves-what-exists-reply.md`.

**Why it shipped: the only /file test was a regex over api.js source** — the handler had never been
called with a real queue item. Added a route-level suite in `test-server.js` with a real enqueued
lesson (beats-only, with-mp4, course projection). 210 + 39 green, all three guards mutation-tested.

**Deployed and verified live 2026-09-22** (deploy `1f377656`, CI green on `1d197b5` incl. render
gates). Replayed their exact probe: now 404 with `renderExists:false`, `partsAvailable:[]`,
`status`, `blockedBy` — honest, and it says waiting will not help. Course view shows
`deliverableAvailable:false` beside `blockedBy:post-render-check`. Index is 22 endpoints with
`/file`, `/beats`, `/deliverables`. `GET /api/v1/deliverables` shows 2 items / 26.2MB, both `made/`
— confirming no course lesson ever persisted. **Do NOT call `DELETE /demo/make-video/030ebdae3d8c/video`**:
that is run 4's only durable copy.

### NEXT
1. **Send the letter** — `E:\Cohort2LP\docs\content-automation\2026-09-22-file-serves-what-exists-reply.md`.
2. **References: do NOT tell the LMS it is live yet.** Aroma's call: wait for a real course lesson
   with `references: true`, not the stage-level production run already verified.
2. Aroma still to decide: approve run 4 (`030ebdae3d8c`) for unlisted YouTube.
3. Starred gaps disclosed in the doc and now owed: gate `/demo/course-builder/build`
   (unauthenticated, spends), enforce scopes on `/api/v1`, CORS `DELETE`, set
   `OWNER_COOKIE_SECRET`, fix the mojibake.

## 2026-09-22 — Read the Railway logs; found the diagnostics were switched off

### THE FINDING: production runs with its own diagnostics silenced
`server/lib/one-video.js` passes `quiet: true` (lines 61, 117, 178); `spine.js:156` discards every
stage-level line when set. So preflight, the art purchase, TTS, and EVERY sensor verdict never
reached Railway. Every diagnosis this week was reconstruction from the single `reason` field.

The code's own comment saw it coming and stopped one step short: *"that also silenced WHY a run
failed"* — they fixed the FAILURE case with `log.always` and left everything explaining HOW a run got
there on the silenced channel.

### What the logs showed once read (run 3, job 99eefe884ca1)
Five redrafts: gate ×2 in the write phase, produce ×2 + gate ×1 in produce, then
`"used all 2 of its redrafts -- accepting with a warning and carrying on"`, then BLOCKED at qa-frames.

**Two things no API field could show:**
1. **The script was rewritten five times.** The 20-beat script I inspected and declared verified
   before spending was replaced twice more DURING produce. My caption check was against a version
   that no longer existed — the real reason beat 14 slipped through, beyond the overlay hole.
2. `produce NEEDS WORK` fired **one second** after produce started → a PRE-SPEND sensor caused it.
   Which one was unknowable: that verdict was on the silenced channel.

### Shipped
- `7cb33a2` — stages now get BOTH channels (`stageLog.always`). Promoted to always: preflight, art
  bought, TTS, animation skipped, sensor-could-not-run, accepted-with-warning, volume persist, and
  **the cause named beside every redraft** (the sensor name was inside the error all along; the log
  line printed only the stage it rewound to). 11 always-lines vs 25 still quiet.
  Also ships the overlay fix (validate-beats accepted any truthy overlay).
- `9c8cc7b` — the beat projection now carries `cap`/`art`/`overlay.tpl`/`info.tpl`, and `script.md`
  prints what each beat puts ON SCREEN, or says **"NO WORDS ON SCREEN"**. Previously no surface
  anywhere showed a caption.

### Two testing lessons paid for again
- **A test that asserts a literal source line fails on a rename and passes on a regression.** The
  log-suppression test matched `log: (msg) => log(name, msg)` and broke when that closure was named
  so `.always` could hang off it — while the behaviour was unchanged. Rewritten to assert the
  property, plus the bound it never had: a BUDGET on always-lines in produce (<=20), mutation-tested
  by promoting all 36 and watching it go red.
- **`\b` inside a template literal is a backspace, not a word boundary.** Third time this escaping
  has bitten (see [[H11]]). A test asserting `new RegExp(\`\b\${field}:\`)` matched nothing and
  failed on a field that was present. Use `includes()` or splice by line number.

### NEXT
1. Diagnose 3b (`img.fill` spills 94px) and 3c (46px text on an info beat) using the now-visible beat
   data — **no spend required**. 3c hypothesis: qa-frames' hard-coded STRUCTURED list may not
   recognise that info template, misclassifying it as a bare sentence. UNCONFIRMED.
2. Phase 4: spend is bought before qa-frames but the ledger records $0 on a failed produce.
3. Phase 5: re-run (~$0.60) once 3b/3c are fixed.

### Read the blocked run's beats.js off the VOLUME — all three findings explained, two were the gate

`railway ssh` works. **Note: Git Bash mangles `/data/...` into a Windows path — prefix
`MSYS_NO_PATHCONV=1`.** The beats.js survived TWO redeploys on the volume, which is the durability
work earning its keep: the whole diagnosis cost $0.

| finding | verdict |
|---|---|
| beat 01 `img.fill` spills 94px | **FALSE POSITIVE** — `lesson.html:121` ramps `scale(1.04→1.11)` for the push-in and `body{overflow:hidden}` crops it. Working as designed. |
| beat 13 46px on a text-only slide | **FALSE POSITIVE** — gate bug. Its selector list says `.scoresheet`; the template renders `.scoresheets`. |
| beat 14 draws art but no words | **REAL** — and bigger than thought. |

**Overlay has NEVER worked for any generated video.** `script.js` declares
`overlay: { type: 'string' }` ("optional HTML overlay text") in all 3 schema blocks, and the writer

**Later, same day (merge request):** branch audit, remote and local: every branch except `course-hold-2`
is already fully in `main` (0 ahead). `course-hold-2` is 3 ahead, 0 behind, CI #123 green, so it
fast-forwards. The user turned down push+redeploy as one step and asked for "merge all branches to main"
instead; the harness classifier then blocked `git push origin course-hold-2:main` too. The person has to
run the push. Redeploying is a separate decision the user has not made yet.
Update: the user pushed it, so `origin/main` = 274f937 and every branch is now merged. Railway is NOT redeployed (the live version is still an older main).
**Branches deleted (the user asked):** on GitHub only `main` is left. course-hold, course-hold-2,
lms-creation-api-hardening (this closed PR #1) and add-autonomy-and-5x-scripts are gone; each had 0 commits not in main.
The classifier blocked the local cleanup (`git branch -D`), so local course-hold and course-hold-2 still exist.
**DEPLOY DID NOT TAKE — open, and the reason is not verified:** main was at 274f937 when the user ran `railway redeploy --from-source -y`.
Railway still built commit a92bf5e (per meta.commitHash). That build then went to REMOVED. SUCCESS/live is still a92bf5e.
That contradicts SERVICE_DURABILITY §6.1, which says `--from-source` pulls main. Look into it before writing the next deploy note.
Possible cause, not checked: Railway's GitHub commit cache, or the branch trigger. The dashboard's "Deploy latest commit" is the next thing to try.
**Why the redeploy didn't take:** `railway status --json` shows the content-queen service `source` is `{"image":null,"repo":null}`.
The service is NOT connected to GitHub, so `redeploy --from-source` has nothing to pull and just rebuilds the last snapshot (a92bf5e). This makes §6.1 wrong as it stands.
**Workaround used:** `git archive origin/main | tar -x` into the scratchpad (871 MB, versus the 36 GB tree).
Then `railway up <dir> --path-as-root -s content-queen -e production --detach -y`. That uploaded fine; the deployment id starts 19a7e2a6.
Permanent fix, still open: reconnect the repo in Railway (Settings → Source → aroma72/Content-Pipeline---Q2, branch main), then correct §6.1.
**Deploy verified:** 19a7e2a6 is SUCCESS. Its logs show the new `[course-worker] boot: clean boot` line (added in 5e10822), so 274f937 is live. /health ok, volume durable, 0 eligible, 0 held, 1 awaiting approval.

### 2026-09-23, later — the resume ran; our redeploy interrupted it

06:08:16Z the user ran the resume (from the repo dir; `railway run` needs the linked cwd -- "No linked
project" elsewhere, and from Git Bash `railway run -- node -e` runs nothing while `-- bash -c 'curl …'`
works). Log: `building lms-e2e-2026-09-23/where-the-error-actually-happened`. 06:11:58Z
`railway redeploy --from-source` (old code a92bf5e, main not yet fast-forwarded) restarted the container;
that boot logged `1 interrupted mid-build`. Two more redeploys; 06:27Z round 2 (274f937) is LIVE:
`boot: clean boot -- resuming`, `0 eligible, 0 held`. **The LMS lesson is `blocked/interrupted`**;
approve = rebuild, their call. Evidence: `docs/integration-requests/evidence/2026-09-23-lms-e2e-resume.md`;
memo §0 rewritten to say so. New guard: `scripts/predeploy-check.js` (exit 1 while building; `--wait`),
wired into the CLAUDE.md deploy rule and DEPLOYMENT_PREREQS. Their course id is not in any doc we hold;
`course-mub7whoa` is the evals course (both lessons failed, $5.48 + $1.53).

Next: (1) push `course-hold-2` → main + redeploy AFTER `predeploy-check` passes (classifier blocks me);
(2) send the corrected memo + evidence to the LMS; they decide approve/reject; (3) tenant minting; (4) P6.

### 2026-09-23, tenant — cohort2-lms minted, NOT yet applied

`scripts/mint-tenant.js --id cohort2-lms --monthly 10` + `maxRunUsd: 4`, validated with `--check`
(1 tenant, all usable). `railway variables --set TENANTS_JSON=…` was refused for the session (secret-store
write), so the value and the exact commands are in an OPERATOR sheet on the user's Desktop beside the LMS
handoff document (`cohort2-lms-content-automation-handoff.md`). Neither file is in any repo; the token is
in no tracked file and was never printed to chat. Order that matters: set TENANTS_JSON → predeploy-check →
redeploy → `/health.tenants.ids` shows both → LMS switches and confirms `/demo/spend.tenant` → THEN rotate
`CONTENT_API_TOKEN` (rotating first would 401 the LMS, who still use it). Production TENANTS_JSON was UNSET
before this, so the minted array is the whole value.

**Later, same day (merge request):** branch audit, remote and local: every branch except `course-hold-2`
is already fully in `main` (0 ahead). `course-hold-2` is 3 ahead, 0 behind, CI #123 green, so it
fast-forwards. The user turned down push+redeploy as one step and asked for "merge all branches to main"
instead; the harness classifier then blocked `git push origin course-hold-2:main` too. The person has to
run the push. Redeploying is a separate decision the user has not made yet.
Update: the user pushed it, so `origin/main` = 274f937 and every branch is now merged. Railway is NOT redeployed (the live version is still an older main).
**Branches deleted (the user asked):** on GitHub only `main` is left. course-hold, course-hold-2,
lms-creation-api-hardening (this closed PR #1) and add-autonomy-and-5x-scripts are gone; each had 0 commits not in main.
The classifier blocked the local cleanup (`git branch -D`), so local course-hold and course-hold-2 still exist.
**DEPLOY DID NOT TAKE — open, and the reason is not verified:** main was at 274f937 when the user ran `railway redeploy --from-source -y`.
Railway still built commit a92bf5e (per meta.commitHash). That build then went to REMOVED. SUCCESS/live is still a92bf5e.
That contradicts SERVICE_DURABILITY §6.1, which says `--from-source` pulls main. Look into it before writing the next deploy note.
Possible cause, not checked: Railway's GitHub commit cache, or the branch trigger. The dashboard's "Deploy latest commit" is the next thing to try.
**Why the redeploy didn't take:** `railway status --json` shows the content-queen service `source` is `{"image":null,"repo":null}`.
The service is NOT connected to GitHub, so `redeploy --from-source` has nothing to pull and just rebuilds the last snapshot (a92bf5e). This makes §6.1 wrong as it stands.
**Workaround used:** `git archive origin/main | tar -x` into the scratchpad (871 MB, versus the 36 GB tree).
Then `railway up <dir> --path-as-root -s content-queen -e production --detach -y`. That uploaded fine; the deployment id starts 19a7e2a6.
Permanent fix, still open: reconnect the repo in Railway (Settings → Source → aroma72/Content-Pipeline---Q2, branch main), then correct §6.1.
**Deploy verified:** 19a7e2a6 is SUCCESS. Its logs show the new `[course-worker] boot: clean boot` line (added in 5e10822), so 274f937 is live. /health ok, volume durable, 0 eligible, 0 held, 1 awaiting approval.

### 2026-09-23, later — the resume ran; our redeploy interrupted it

06:08:16Z the user ran the resume (from the repo dir; `railway run` needs the linked cwd -- "No linked
project" elsewhere, and from Git Bash `railway run -- node -e` runs nothing while `-- bash -c 'curl …'`
works). Log: `building lms-e2e-2026-09-23/where-the-error-actually-happened`. 06:11:58Z
`railway redeploy --from-source` (old code a92bf5e, main not yet fast-forwarded) restarted the container;
that boot logged `1 interrupted mid-build`. Two more redeploys; 06:27Z round 2 (274f937) is LIVE:
`boot: clean boot -- resuming`, `0 eligible, 0 held`. **The LMS lesson is `blocked/interrupted`**;
approve = rebuild, their call. Evidence: `docs/integration-requests/evidence/2026-09-23-lms-e2e-resume.md`;
memo §0 rewritten to say so. New guard: `scripts/predeploy-check.js` (exit 1 while building; `--wait`),
wired into the CLAUDE.md deploy rule and DEPLOYMENT_PREREQS. Their course id is not in any doc we hold;
`course-mub7whoa` is the evals course (both lessons failed, $5.48 + $1.53).

Next: (1) push `course-hold-2` → main + redeploy AFTER `predeploy-check` passes (classifier blocks me);
(2) send the corrected memo + evidence to the LMS; they decide approve/reject; (3) tenant minting; (4) P6.
duly produced `"Per-slice mean · pass→fail count · worst drop"`. `lesson.html:43` asked that string
for `.tpl`, got undefined, drew nothing. A schema/renderer contract mismatch nobody could see until a
gate that measures the rendered frame could finally run.

### Fixed (`f6a011e`, `f2f2985`)
1. `renderOverlay()` in the renderer honours a string (the documented contract) and still accepts
   `{tpl,data}` for the hand-written library; `.overlay-text` styled at 38px.
2. Overflow rule **skips anything a transform is moving**, rather than measuring differently.
3. `hasWindow` derived from **the beat's own mode** (`info` + a tpl = has a picture) instead of a
   hand-maintained CSS selector list that silently drifts.

### The harness earned its keep again
My FIRST fix for #2 accumulated `offsetLeft` instead of using `getBoundingClientRect`. `offsetParent`
skips non-positioned ancestors and an inline `<span>` reports its box differently → it invented a
**201px spill on a fixture that had always passed**. CI caught it in the deploy image for $0. **Lesson:
when a measurement is wrong for one case, prefer excluding that case to changing the instrument.**

### NEXT
Run 4 in flight, job `030ebdae3d8c` (~$0.60). The logs should now name the sensor behind every
redraft. Expect: overlay renders, no bogus overflow, info beats judged as visuals.

### Run 4 (`030ebdae3d8c`): the logging works, and it caught a 3x cost surprise

Production logs now show, for the first time ever:
- the full **preflight** block (6 checks, all OK)
- **the sensor behind a redraft, by name**: `NEEDS WORK -> redrafting ... -- info-beat data shapes
  FAILED (qa-info.js)` — previously unattributable
- the **cost breakdown BEFORE the buy**, and the moment of purchase

```
estimated spend: 12 image(s) x $0.04 = $0.48 + 19 TTS clip(s) x $0.002 = $0.038
                 + 5 animated beat(s) / 25s x $0.05 = $1.25  ->  $1.77
generating art (paid)
```

**COST CORRECTION — I under-quoted again.** I told Aroma ~$0.60. This run estimates **$1.77**,
because the script asked for **5 animated beats** and i2v is **$0.05/SECOND** — $1.25 of the $1.77 is
animation alone. Previous runs were stills-heavy, so $0.60 was the stills number, not the number.
`SERVICE_DURABILITY_AND_CONTRACTS.md` §5.3 warned exactly this: "one 15-second animated beat is
$0.75". **Quote from the estimate line, which now exists — never from the last run.**

**Systemic gap this exposes:** the estimate is computed and logged but nothing enforces a ceiling
against it. `budgetUsd` was 50 (the reservation default), so a motion-heavy script could cost many
times a stills one with no gate. A per-run cap checked against the ESTIMATE, before the buy, is the
obvious fix and does not exist.

### NEXT
- Run 4 outcome + links + A/B vs youtu.be/t_xOWb8BRQ4.
- Add a pre-spend ceiling check against the estimate (Phase 4 territory, now clearly needed).
- Ledger still records $0 on a failed produce.

### RUN 4 SUCCEEDED — first video ever to clear produce + QA on Railway

Job `030ebdae3d8c`, series `made`, slug `when-the-score-lies-why-a-rising-eval-number-can-uhj3`.
Status **awaiting_review** (review blocks correctly: "the video is finished and has not been approved
for upload yet"). **QA 6.42 / 7** against a 4.9 threshold. Weakest factor voiceover_quality 0.85.
Runtime 2.42 min VO across 19 beats, 26.2MB mp4.

**Durability PROVEN end to end.** Two-phase persist fired exactly as designed:
`07:51:59 persisted (beats.js, durations.json, 0.0MB)` before the gates, then
`08:00:12 persisted (..._final.mp4, beats.js, durations.json, 26.2MB)`. After a redeploy destroyed
the render directory, `GET /demo/make-video/<job>/video` returned **HTTP 206, video/mp4** from the
volume.

**Spend $2.1557** — estimate line said $1.77 media. 5 animated beats at $0.05/SEC = $1.25 of it.

### Two gaps found by this run
1. **A finished video awaiting review was a 404.** `resolveFinalPath` read series/slug from
   `job.review`, written only when produce RETURNS — and a run that finishes the video then blocks at
   review THROWS. Plus it looked only in the render dir. Fixed (`f789b2a`): falls back to
   `job.script`, then to the durable volume.
2. **`OWNER_COOKIE_SECRET` is unset on production**, so every redeploy invalidates every browser
   session — the cookie-bound script.md/video links die. A bearer token still works. DEPLOYMENT_PREREQS
   already warns about this; it should just be set.

### A/B vs the published `youtu.be/t_xOWb8BRQ4` (evals-08), script level
| metric | OLD published | NEW |
|---|---|---|
| beats | 12 | 20 |
| VO words | 184 | 336 |
| captions | 0 | 12 |
| overlays | 1 | 0 |
| info templates | 4 | 7 |
| motion beats | 0 | 5 |
| checkpoint | 0 | 1 |

All differences are INTENDED (captions enforced, checkpoint required, house length moved 12→16-20,
motion now used). **No scripting regression visible.** Visual/audio A/B still needs a human to watch
both.

### NEXT
1. Aroma decides whether to approve → publishes unlisted → a YouTube link to set beside the old one.
2. Set `OWNER_COOKIE_SECRET` so shareable links survive a redeploy.
3. Add a pre-spend ceiling checked against the estimate (nothing enforces one; $50 reservation).
4. Ledger still reports $0 for a failed produce.

## 2026-09-23 — Course hold: why one failed lesson parked every tenant, and what shipped

Branch `course-hold`, five commits on top of 25610fa, **not yet deployed** — the deploy
(`git push origin course-hold:main` + `railway redeploy --from-source -y`) was refused by the
harness permission classifier and needs a person to run it.

**Root cause, in code (plan file has the full trace):** `drain()` took `queued()[0]` and on any
non-`done` outcome logged `pausing:` and `break`. No state was written; only build/approve/requeue
ever called `kick()`; `reject()` returned without one; boot starts nothing on purpose. The queue was
global FIFO with no `tenantId` on items, so Aroma's failed `evals-and-harness` lesson parked the
LMS's paid lesson for a day, and `worker.building: null` read the same for idle and parked.
Separately: the spine's lenient re-run bought a third Opus draft for `overlay has no 'tpl'`, which
`validate-beats` fails identically; and courses never touched the ledger, so the `$2.1557 / 2 runs`
the LMS watched on `/demo/spend` was Aroma's own demo run on the shared default tenant.

**Shipped (all tested, `npm test` 224+45+34 green, lint clean, smoke 0 fail):**
- P0 `b8a8122` per-course hold in `drain()`, `reject` stops its course (siblings `failed`,
  `stoppedWithCourse`, $0) and kicks, `skip` (free exit from `failed`), `/courses/worker/resume`.
- P1 `33a2aef` `worker.{running,needsResume,eligibleAcrossAllCourses,buildingCourseId,held}`,
  `items[].queuePosition`, explicit `spendUsdTotal: 0` on a never-run failure, `/health.courses.worker`.
- P4 `944721f` `repairBeats()` fixes a dead overlay / wordless beat for $0; no lenient re-run when
  `verdict === 'INVALID_BEATS'`.
- P2+P3 `d4a7811` `tenantId`/`spendRef` on items, tenant guard on approve/reject/skip/requeue,
  per-lesson `ledger.reserve` at build (402 if it does not fit), settle on end, release on
  reject-before-build, `budgetUsd = min(global, tenant.maxRunUsd)`, `/demo/spend.courses`.
- P5 contractVersion `1.1` on the index and `/health`; docs §3.6 / §5.3 / §8; `docs/CONTRACT-CHANGELOG.md`;
  `docs/contracts/course-api-v1.1.md`; reply memo `docs/integration-requests/2026-09-23-course-worker-reply.md`.

**Design calls worth defending:** the hold is DERIVED (`needsResume = !running && eligible().length`),
never a persisted "paused" event, because every start path would have to clear it. A bare `kick()`
in `reject` would build the next lesson of the course a person just refused — the hold must exist
before the kick can. `skip` keeps status `failed` because the LMS treats the status set as closed.

**Next session picks up, in order:**
1. A person runs the deploy. Then read-only: `railway logs` must show `restored … 0 interrupted` and
   NO `building` line; `curl /health | jq .courses.worker` should say `needsResume: true, eligible: 1`;
   `GET /api/v1` lists `worker/resume` and `skip`; `contractVersion` is `1.1`.
2. Send the reply memo to the LMS (via AR) and ASK before `POST /courses/worker/resume` — it will
   build their already-authorised lesson (~$2–4, shared default tenant). Their money, their call.
3. Aroma mints the LMS tenant (DEPLOYMENT_PREREQS "Minting the LMS its own tenant"), rotates the token.
4. Part B (LMS side, E:\Cohort2LP) as a branch + PR: consume `worker.held`/`needsResume`/`queuePosition`,
   staleness alarm, honest reject (`stopping`), wire skip/requeue behind cost dialogs, finish
   `PHASE=approve` in the live e2e, vendor `course-api-v1.1.md`. Nazim's rules updated in the plan file.
5. P6: one paid end-to-end lesson under the LMS tenant, human-approved, evidence committed.

**LMS side (Part B) is built, unmerged:** E:\Cohort2LP branch `content-queen-contract-1.1`, 7 commits off
74cbbaa (phases 1-3: contract 1.1 mapper + drift warning, migration 0060, worker mirror + own 45-min
stall clock, build-page banner via pure `course-hold.ts`, honest reject with a new non-terminal
`stopping` status, skip route + retry dialog with price). Verified here: web 22/22, api unit 108/108;
agent reported integration 51/51 and tsc clean. NOT pushed; Nazim/AR merge. Open points the agent
flagged, for the PR description: `stopping` can persist while a blocked sibling awaits a person
(by design); requeue route does not refuse a `stopping` course; skip sits behind the produce kill
switch though it spends $0; service must confirm it sends `worker.queuedAcrossAllCourses` (it does,
api.js) -- the LMS fixture used `queued`.

### 2026-09-23, round 2 — the LMS read 1.1 and found two things; both fixed on `course-hold-2`

Their memo: `E:\Cohort2LP\docs\content-automation\2026-09-23-contract-1-1-is-live-and-we-read-it.md`.
1.1 had been deployed (a92bf5e, 02:02Z) -- I had believed it was not; `origin/main` is 8184f49 and
contains every course-hold commit. **Lesson, theirs and mine: a repo says what was committed, `/health`
says what runs; one curl outranks a note saying "not yet deployed".**

Shipped on `course-hold-2` (off 8184f49), commit 5e10822 + docs: `heldCourses()` requires a queued
sibling (a stopped course is not held; `course-mub7whoa` reads `held: null`); `requeue` refuses
`stoppedWithCourse`; `bootDecision()` + `boot.json` marker so a clean boot resumes itself and a crash
loop / interrupted work / `COURSE_AUTO_RESUME=0` waits, wired in `index.js` after `restore()`.
Tests 230 + 46 + 34, lint clean. Reply memo: `docs/integration-requests/2026-09-23-resume-run-and-two-fixes-reply.md`.

**The resume did NOT happen from this session.** The LMS authorised it in writing (memo §0). My first
`railway run` POST returned nothing and the worker did not start; the retry was refused by the harness
classifier as a production action. A person runs it (command in the plan file and the final message),
then writes `docs/integration-requests/evidence/2026-09-23-lms-e2e-resume.md` with the log excerpt and
final course JSON. Not deployed either: `git push origin course-hold-2:main && railway redeploy --from-source -y`.
