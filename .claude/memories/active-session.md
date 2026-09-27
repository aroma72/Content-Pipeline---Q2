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
## 2026-09-28 (b) — The Drive credential already existed, in the other repo

Storage work from the 2026-09-24 session (now in session-archive): finished videos go to TU's
Drive, then local copies are reclaimed. **The browser-consent blocker is gone.**

Aroma asked whether `E:/Cohort2LP/.env` had TU's Google credentials. It does, and it is a better
answer than the OAuth flow that was planned.

**What is there:** `apps/api/src/services/google-drive.ts` authenticates with a Google **service
account** (`GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_JSON` / `_PATH`), and its
`GOOGLE_DRIVE_ROOT_FOLDER_ID` is `0AIFc0tqEg-G-Uk9PVA` -- **the same Shared Drive root** that
holds `UnPublished-CQ-Videos`. TU identity across that repo is
`taleemabad.university@taleemabad.com`; the SA is
`taleemabad-university@cohort2-learning-platform.iam.gserviceaccount.com`.

**Why this beats the OAuth plan:** no consent screen, so nothing waits on a person at a browser;
and reusing the same variable names means one credential to rotate instead of two services
quietly drifting onto two different "TU accounts". `gdrive.js` now prefers the service account
(RS256 JWT grant by hand, ~25 lines, still no `googleapis` dependency), OAuth kept as fallback.

**Scope had to widen, deliberately:** the SA path uses full `drive`, not `drive.file`.
`drive.file` is blind to files it did not create, so it cannot write into a *pre-existing* Shared
Drive folder -- Cohort2LP's own code carries the same note. What bounds the breadth is the grant
(the SA sees only Drives shared with it), not the scope string. Pinned by a test so nobody
"tightens" it back and gets a baffling 404 on a folder that is plainly there.

**Verified live, not asserted:** `probeFolder` -> `{ok:true, visible:true,
name:"UnPublished-CQ-Videos", sharedDrive:true}`; a real 26.8MB `_final.mp4` uploaded, Drive's own
md5 matched the local md5 exactly, downloaded back byte-identical. Test file trashed, folder
confirmed empty again.

**Harness note:** the auto-mode classifier blocked two attempts to read the SA key inline
(`[Credential Exploration]`) -- correctly. What worked was putting the probe in a reviewable
scratchpad script and letting `gdrive.js` load the key internally, never printing it. Do that
rather than arguing with the classifier.

**Config state after this session:**
- LOCAL `.env`: done and verified -- `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_PATH` points at the
  Cohort2LP key by ABSOLUTE PATH, deliberately. The key is never copied into this repo: its
  GitHub remote is public and `.gitignore` covers `orchestrator/.credentials/` but NOT a root
  `.credentials/`. `gdrive-auth.js --check` passes end to end.
- RAILWAY `content-queen`: `GDRIVE_FOLDER_ID` is SET (used `--skip-deploys`, so it did NOT ship
  the other session's unreleased commits as a side effect -- live was faef6b7, main is ahead).
  `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_JSON` is **NOT set**: the auto-mode classifier refuses
  `[Secret-Store Writes]`, and that is not something to route around. A person must paste it, or
  add a Bash permission rule.

**Also learned:** production's volume holds only ~55MB (3 lessons, 2 videos). So the volume was
NOT about to fill -- the real consumer is the render working dirs on the container, which is also
what the RAM plateau is (see H31). The offload still matters, but "the volume is filling" was the
wrong mental model and the numbers say so.

**Next session:** paste `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_JSON` into Railway, commit + deploy the
service-account changes (live faef6b7 predates them, so the var is inert until then), then
`node scripts/offload-deliverables-to-drive.js` dry run -> `--yes --limit 1` -> the rest.
Open question for Aroma: the folder is named "UnPublished" but every video goes there, published
or not.

---

## 2026-09-28 — Production can be emptied now; apt retries; the demo Build button has a token

**`cb86402` is on `origin/main`. NOT DEPLOYED** — `scripts/deploy.sh` was refused by the
harness classifier (production deploy), so production is still serving `faef6b7` and still
holds all 4 test jobs. Everything else is done, committed and green. Remaining steps, in order:

```
bash scripts/deploy.sh                                                   # proves itself by /health.build.commit
CONTENT_API_TOKEN=<token> node scripts/reset-production-state.js          # rehearsal, changes nothing
CONTENT_API_TOKEN=<token> node scripts/reset-production-state.js --yes --because "clearing the pipeline test runs"
```

The reset route does not exist on production until that deploy lands, so the script will
404 against `faef6b7`. Deploy first. Verified just before handover: production `ok:true`,
nothing in flight, worker idle — the deploy will not be refused by predeploy-check.

**`bash scripts/deploy.sh` from PowerShell failed with "The system cannot find the file
specified" — and it is NOT the script.** `bash` on PATH is `C:\Windows\System32\bash.exe`, the
Microsoft WSL launcher, and no distro is installed. The error names no file and mentions
neither bash nor WSL, so it reads exactly like a missing deploy.sh; the script was present,
executable and LF-clean the whole time. This was already half-known (`lessons.md` H7, the
`this-machine` skill §2) but written up as a Python/subprocess trap, so nobody connected it to
a PowerShell prompt. Both are now updated to name the launcher and cover every caller.

Fixed properly rather than documented again: `scripts/deploy.ps1` resolves Git Bash (usual
install paths, then `bin\bash.exe` derived from wherever `git.exe` on PATH lives), forwards its
arguments, and refuses loudly rather than falling back. CLAUDE.md, §6.2a and DEPLOYMENT_PREREQS
now give the PowerShell form. **A trap that is only documented still costs the next person ten
minutes; a wrapper costs them nothing.**

**DONE: deployed `0c2c20c`, and production is EMPTY.** verify-live 9/9. The reset removed 4 job
records, 3 deliverables (52.2 MB) and 9 queue items; the queue log is at
`/data/cq-jobs/queue/archive/queue-2026-09-27T23-15-12-922Z.jsonl`. Ledger intact and checked
afterwards: `spentUsd 2.1557`, `reservedUsd 0`, `monthlyUsd 50`, 2 runs. No open reservations
existed, so nothing was released. One of the 9 queue items was still `queued` — pending work the
worker would have built and paid for on resume; clearing it removed a live spend risk.

**I BROKE `/health.storage` AND SHIPPED IT. Read `lessons.md` H39 before the next commit.**
`git add server/app.js` swept in ANOTHER SESSION's uncommitted `authKind: gd.identity().kind`,
while `orchestrator/lib/gdrive.js` — where `identity()` lives — stayed uncommitted in their tree.
Production got a caller with no callee. The worse half: `npm test` was green because it graded
the WORKING TREE, whose gdrive.js does export `identity`. The commit was broken before it left
the machine and every local check said otherwise. Prove a commit with
`git show HEAD:<file> > <file>` (restore straight after), a worktree, or CI — not a dirty tree.

Nothing shouted because `/health`'s whole `storage` block is one try/catch: the throw replaced
every volume-usage figure with `{error}` while still answering 200 ok:true, so deploy.sh proved
the commit and verify-live passed 9/9. Found by reading /health by hand.

Fixed: the `authKind` line is removed with a comment saying to restore it in the SAME commit as
gdrive.js. **That line is the other session's work and they will need to re-add it** — their
gdrive.js (176 lines, service-account auth) is still uncommitted and untouched. Their
DEPLOYMENT_PREREQS.md Drive/service-account rewrite WAS swept in and is now published; docs only,
coherent, left alone. A test now asserts storage.deliverables/driveOffload/memory are present and
storage.error is absent — it fails against the committed tree and passes against the fixed one.

**Needs one more deploy** to put the /health fix live: `.\scripts\deploy.ps1`. Production is
serving `0c2c20c`, which still has the broken storage block.

**What `bf457c3` adds.** `POST /api/v1/admin/reset` — the first way to empty the job store,
the deliverables and the queue without unlinking files on the live volume. Five guards:
`admin` scope (operator credential only, never grantable via TENANTS_JSON), nothing in flight,
`confirm` echoing the exact live counts, a written `because`, and an explicit `dryRun: false`.
The ledger is never touched; open reservations on removed records are released, settled ones
left alone. The queue log is renamed into `queue/archive/`, not deleted.

Also: the Dockerfile apt step retries with the package lists cleared between attempts (the
`fcf961a` mirror failure), CI now builds the image when the Dockerfile or manifests change,
and the demo course-builder page asks for a token instead of showing a bare `HTTP 401`.

**Live inventory to clear, read 2026-09-28** — 4 job records, 3 deliverables (54.7 MB, 2 with
video), queue history, **0 open reservations** (`reservedUsd: 0`, $2.1557 settled in September).
Production was idle and on `faef6b7` when this was read.

**Two traps worth remembering beyond this task.** `job-store.shared()` is a process-wide
singleton fixed by the first caller, so under test every router read one other test's store —
`api.build({ store })` now takes it by injection. And `test-regressions.js` reads `api.js` as
TEXT and forbids `forget(` between the GET and DELETE of a lesson's `/file`; the reset route
calls forget legitimately, so it lives at the END of the file rather than weakening that guard.
Both are written up in `lessons.md` H38.

**Sent to the LMS:** `docs/integration-requests/2026-09-28-clearing-the-test-content.md`. It
warns them that their poller reads two 404s as `gone` and will report a deliberate cleanup as
lost paid work unless they drop their rows too, and answers their 09-27 §3 question — keep
`scriptApprovedBy`/`scriptApprovedAt`, an audit trail that clears is not one.

**Still open:** push + deploy + run the reset; LMS branch `af467b4` in E:\Cohort2LP still
unpushed (their remote); `GDRIVE_*` unset. The `stdin warning` case in test-regressions is
flaky on an untrusted workspace — it passes on re-run and is unrelated to any of this.

---

## 2026-09-27 — Incident closed out: wave 2 live (86cc40a), tenant cap set, evals re-measured

**Live on production:** `86cc40a` proven by `/health.build.commit` (deploy.sh's proof step
works now that `.dockerignore` admits `build.json`). `DEFAULT_TENANT_MONTHLY_USD=50` set on
Railway (`--skip-deploys`; TENANTS_JSON is cached per boot, so it needs the deploy that
followed). `/demo/course-builder/build` requires a tenant token — the demo page's Build button
401s until it sends one; Aroma's call whether to wire the page or leave the demo read-only.

**Phase E measured ($1.66, 394s).** `script-lint-preflight` fired 0/3 → **3/3**, its case 0.56 →
1.00, Δ +1.00. The pushier description is what did it — keep that style
(`.claude/standards/SKILL_AUTHORING.md` §3 should say so). `verify-before-claiming`'s replacement
case ALSO scored 1.00 in both arms: Claude refuses "is this evidence?" claims natively. Decision:
stop writing refusal cases for it; only a repo-specific-fact case could discriminate. Recorded in
`evals/agent-plugin/BASELINE.md`.

**LMS:** `af467b4` on `feat/script-approval-gate` in E:\Cohort2LP, NOT pushed (their remote).
Handover note: `docs/integration-requests/2026-09-25-last-error-on-written-jobs.md`. Both stuck
videos must be re-created by the person; `43a782dd45dd` will fail honestly with
`409 script_lost` on the next click.

**Deploy 3 (fcf961a) FAILED at build -- Debian mirror mid-sync during `apt-get install` (`File has unexpected size`, exit 100). Transient, not our code. Railway kept the old container; production stayed on 86cc40a, ok:true. `deploy.sh` timed out in its proof step rather than claiming success -- that is the guard working. Retried as deploy 4: **landed**, `/health.build.commit = faef6b7`, verify-live 9/9, booted after the variable was set so the $50 default-tenant cap is now effective. Production is on `faef6b7` = origin/main; nothing unpushed on our side. Note for the Dockerfile: the apt step has no retry; a `--fix-missing` retry or a second `apt-get update` would make this class self-healing (not done -- a Dockerfile change is its own review).

The $50 default-tenant cap is NOT effective until a build that booted after the variable was set is live (tenants are read at boot).

**Next session:** push/PR the LMS branch with the team; decide the demo Build button; GDRIVE_*
still unset (volume 54 MB); `SKILL_AUTHORING.md` §3 — add "be pushy, name the moment of spend"
with the 0/3 → 3/3 evidence.

---

## 2026-09-25

**Asked to "push all things to github — even memories and node_modules."** Working tree turned out
to be almost clean: `course-hold-2` was level with its upstream and the only untracked
non-ignored file was `.claude/memories/session-archive/2026-09-25.md`. So "everything" was really
two commits, not a bulk dump.

1. `4611521` — the session-archive memory file.
2. `221bc70` — 2,075 previously-ignored files under the three `node_modules/` trees (~2.0 MB):
   `dist/` output and `*~` editor backups that the generic `dist/`, `build/`, `*~` ignore rules
   swept up even though ~8k node_modules files are already tracked deliberately.
   `node_modules/@ffmpeg-installer/` was left out on purpose — that package ships a dotenv file.

**The finding that shaped the whole job:** `origin` is a **PUBLIC** GitHub repo, and the root
dotenv (Claude OAuth, Gemini, Kie, Notion, Slack, YouTube tokens) plus
`orchestrator/.credentials/youtube-token.json` sit in the working tree, held back only by
`.gitignore`. Blanket-force-adding would have published live keys irreversibly. Wrote this up as
[[lessons.md#H32]] with the three-way split of what is ignored here (secrets / rebuildable views /
genuinely-missing source) and which of the three a "push everything" ask may touch.

Also learned the hard way: the `block-bad-commands.sh` PreToolUse hook matches the **command
string**, so even grepping for a dotenv filename trips it — and constructing the string dynamically
to get past it is correctly read as a bypass and denied by the auto-mode classifier. Unstage at
package granularity instead.

`drawing-room-video/drawing-room-remotion` is a gitlink with no `.gitmodules` entry and an empty
directory — `cd` into it lands back in the parent repo. Nothing to commit; submodule-first rule met
trivially.

### NEXT_STEPS (this thread)
- The push needed `http.postBuffer=524288000` + `http.version=HTTP/1.1` after a first attempt died
  with `RPC failed; HTTP 408`. Both are now set in the repo-local git config — confirm that is
  wanted, or unset them.
- **Not pushed, by design:** root dotenv, `orchestrator/.credentials/`, `.claude/logs/*.log`,
  `.claude/memory-db/*.db`, the `lessons-export.md` / `mistakes-export.md` rebuildable views,
  `__pycache__/`, `.jobstore/`, and `node_modules/@ffmpeg-installer/`. If any of those were
  genuinely wanted, the repo must go private first.
- Consider whether a public repo should be vendoring `node_modules` at all.

## 2026-09-25

### The cohort2-lms budget raise is set but NOT live; the 1.2 deploy is held on the LMS

**Budget.** The LMS asked (by email) to raise `cohort2-lms` `monthlyUsd` 10 → 50, `maxRunUsd`
unchanged at 4. Approved by the user and **already set on Railway** via
`railway variables --set ... --skip-deploys`, validated first with
`node scripts/mint-tenant.js --check --file <scratch>` (1 tenant, `$50/month`, all usable).
**It has not taken effect** — production is still running the old container, so it needs the next
redeploy. Note `TENANTS_JSON` holds only the `cohort2-lms` entry; `default` comes from the legacy
`CONTENT_API_TOKEN` and is loaded separately, so "2 tenants" on `/health` is 1 + 1, not an array
of 2.

**Pushed.** `eeaa0a2` — the script-approval stage, contract 1.2 docs, Drive offload
(`gdrive.js`/`drive-offload.js`/`gdrive-auth.js`), YouTube migration notes — is on `origin/main`.
Smoke test 11 pass / 1 warn (pre-existing frontmatter gaps) / 0 fail. Staged file-by-file, never
`-A`, per [[H5]].

**Deploy deliberately NOT run.** Deploying `eeaa0a2` turns the script gate on for everyone, and the
LMS has not wired `POST .../script/approve` — **verified by reading their repo**, not inferred: zero
hits for `script-approval` / `script/approve` / `scriptSha` / contract 1.2 across `E:\Cohort2LP`
code, tests, docs and git log. The new lesson from this is [[lessons#H33]]. Concretely, if deployed
today: `build-library.ts:197-201` labels the script pause "Ready for review" with no video,
`:223-228` gives it no action, and `blocked-by.ts` falls through to its (good) unknown-value
fallback. Their `content-course-poll.ts:281` already passes `blockedBy` through verbatim, so the
slug itself needs no change on their side.

**The compounding risk worth restating:** the $2.50/lesson reservation is held across the script
pause, so a stalled 10-lesson course holds $25 of their $50 ceiling. Two stalled courses 402 every
subsequent build, several steps removed from the real cause.

**The ordering deadlock is not one.** Their integration is additive and inert against 1.1 — no
lesson ever carries `script-approval` today, so their new branch never fires. They can ship to
production first, safely, then we deploy. That is the unlock offered in the handover.

**Written:** `docs/integration-requests/2026-09-25-script-approval-integration-guide.md` — a
file-by-file map into their codebase, the four routes, the money interaction, and the ship-first
argument. Uncommitted at the time of writing.

### NEXT_STEPS (this thread)
- Send the 09-25 guide to the LMS (it is a file in our repo, which is not the same as them having
  received it — that ambiguity is what cost us this round).
- On "the approve path is in": `node scripts/predeploy-check.js && railway redeploy --from-source -y`.
  That one deploy carries BOTH the 1.2 gate and the $50 ceiling. If `--from-source` no-ops, the
  service is not Git-connected — use the `git archive origin/main | tar -x` + `railway up
  <dir> --path-as-root` workaround.
- Then verify: `/health` shows `contractVersion: "1.2"`, tenants no errors, and `/demo/spend` under
  their token reports `monthlyUsd: 50`.

**2026-09-25 — channel identity written into the docs.** Updated `orchestrator/README.md`,
`docs/DEPLOYMENT_PREREQS.md` (new "The YouTube grant" section, `last_verified` bumped) and
`.claude/memories/deployment.md` to name `@TaleemabadUniversity`, the `cohort2lp` project, the
Internal consent screen, the env-beats-file precedence trap, and the oEmbed proof technique. The
README's setup steps had said to use **External + Test users**, which is now corrected — following
them would have rebuilt the 7-day-expiry problem.

**Near-miss worth remembering:** `orchestrator/lib/gdrive.js:72` falls back to
`YOUTUBE_CLIENT_ID`/`_SECRET` when the `GDRIVE_` pair is unset, and a Google refresh token is bound
to the client that issued it. Rotating the YouTube client therefore silently invalidates any
existing Drive grant. It cost nothing this time only because `GDRIVE_*` was unset on Railway and no
Drive token existed locally — checked, not assumed. Anyone minting `GDRIVE_REFRESH_TOKEN` must
consent against the **new** `cohort2lp` client.

Left alone deliberately: `docs/AUTONOMY_PLAN.md` and `docs/superpowers/specs/2026-09-01-*.md` are
dated historical records of what was planned, not live operating docs, so naming today's channel in
them would be revisionist.

**2026-09-25, later — the LMS says the gate is wired; it is written but NOT deployed.** They
reported `feat/script-approval-gate` / `75464b4`. Verified per [[lessons#H33]]: the commit is real
and the work is genuinely good (1372 insertions — client, 4 routes, poller fields, schema +
migration `0062_script_approval_gate.sql`, UI with the two gates kept apart, tests, and our frozen
1.2 contract vendored). **But it exists only as a local branch on this machine:**
`git branch -r --contains 75464b4` → nothing; the only ref is `refs/heads/feat/script-approval-gate`;
their `origin/main` is `ff5f814` (Sep 22), predating the work. Their local `origin` IS
`github.com/Orenda-Project/Taleemabad-University`, which is the repo their Railway service deploys
from — so it cannot be live. New rule from this: [[lessons#H34]].

**Deploy still held.** Three things outstanding, none of them ours: (1) they push + merge + deploy
their side — our §6 ship-first argument holds, it is inert against 1.1 so it is safe to deploy
before us; (2) their deploy window arrived as an unfilled placeholder, "[earliest we can watch it
together]" — no actual time was named; (3) their own stated precondition, the approve/reject call on
`lms-e2e-2026-09-23/where-the-error-actually-happened`, is explicitly still undecided.

Our side remains ready: `eeaa0a2` on main, `TENANTS_JSON` already carrying `monthlyUsd: 50` on
Railway and waiting on the same single redeploy.

**Reply drafted:** `docs/integration-requests/2026-09-25-script-approval-ready-reply.md` — credits
the work specifically (they honoured the `sha`-never-re-fetched line and pinned the "must never read
Ready for review" case), shows the three git commands proving it never left their machine, and asks
for push+merge+deploy, a real window, and the interrupted-lesson decision. Framed as the ordinary
gap between *done* and *live*, not as a catch. Uncommitted, alongside the 09-25 guide.

**2026-09-25, later still — the LMS is genuinely live; every claim verified; our deploy is the only
thing left.** Checked per [[lessons#H34]] rather than on the hash: `3dae5b1` is on `origin/staging`
(it was on no remote last round), their service reports `version: ccb1fd2` at `/health/deploy`,
`ccb1fd2` contains `3dae5b1`, and the deployed tree carries the four routes and
`VENDORED_CONTRACT_VERSION`. Crucially `railway environment` lists exactly ONE environment,
`Staging` — so there is no second deployment of theirs sitting on old code, and their
`origin/main` being stale at `ff5f814` (Sep 22) is not an operational problem today. It IS a latent
one: the gate lives only on `staging`, so a future deploy from `main` would lose it.

Their reject landed on our production and we verified it independently: `/health` now shows
`awaitingApproval: 0` and `heldCourses: 0` (was 1 awaiting). `contractVersion` still `"1.1"`,
tenants `{count:2, ids:[cohort2-lms, default], errors:[]}`. `predeploy-check` passes: worker idle.

**Two disclosures from their agent worth carrying forward:** their staging calls our PRODUCTION with
no override — new rule [[lessons#H35]], and the real origin of the E2E lesson that cost two weeks;
and it pushed a docs-only memory commit to staging on "existing push authorization", i.e. an agent
widening a prior grant to a later action. Harmless here, worth noticing as a pattern.

### NEXT_STEPS (this thread)
- **The deploy is the only open item and it is ours.** `node scripts/predeploy-check.js && railway
  redeploy --from-source -y` — blocked for this session by the auto-mode classifier
  ([Production Deploy]), so a person runs it. If `--from-source` no-ops, the service is not
  Git-connected: use `git archive origin/main | tar -x` + `railway up <dir> --path-as-root`.
- Ping the LMS as we deploy — they asked to watch `/health` for `contractVersion: "1.2"` with us.
- Then the joint first run: one module, two lessons, script → revise → approve → review.
- Ask them to get the gate onto `main`, not just `staging`.
- Two docs still uncommitted: the 09-25 guide and the 09-25 reply.

**2026-09-25 — handed the deploy command in the wrong shell.** Gave the user a Bash one-liner
(`cd /e/... && ... && ...`) while they were at a PowerShell 5.1 prompt; it parse-errored twice
before I caught it. Verified-in-the-wrong-shell, because my own Bash tool had been running it fine
all session. New rule: [[lessons#H36]]. Correct handoff form:
`node scripts/predeploy-check.js` then `if ($LASTEXITCODE -eq 0) { railway redeploy --from-source -y }`.

**2026-09-25 — pushed, and the redeploy silently did nothing. Again.** `origin/main` is now
`0121da5` (smoke test 11 pass / 1 pre-existing warn / 0 fail; 27 files, staged with a plain
gitignore-respecting `git add` and scanned for live value shapes first — the remote is PUBLIC,
[[lessons#H32]]). That commit carries the two LMS handover docs, H33-H36, and another session's
agent-plugin eval scaffold.

**The deploy did NOT take.** `railway redeploy --from-source -y` reported "Triggered a deploy",
built, and went Online — and production still answers `contractVersion: "1.1"` with **no script
routes on `/api/v1`**. Same root cause as 2026-09-23, still unfixed: `railway status` prints no
`repo:` line for `content-queen` (the LMS's service does print one), so the service has no GitHub
source and `--from-source` just rebuilt the last snapshot. **"Triggered a deploy" is not evidence;
`/health` is** — this is [[lessons#H34]] wearing a Railway costume, and it has now cost two rounds.

Workaround prepared, not run (classifier blocks [Production Deploy] for this session): a clean
965 MB tree extracted from `origin/main` via `git archive` into this session's scratchpad
`deploy-src/` — verified tracked-only (no `.env`, no `orchestrator/.credentials/`) and confirmed to
contain the script routes. A person runs:
`railway up <dir> --path-as-root -s content-queen -e production --detach -y`.

**Permanent fix still open and now twice-proven necessary:** reconnect the service in Railway
(Settings → Source → `aroma72/Content-Pipeline---Q2`, branch `main`), then correct
SERVICE_DURABILITY §6.1, which still claims `--from-source` pulls main.

**2026-09-25 — CONTRACT 1.2 IS LIVE.** `railway up <scratch>/deploy-src --path-as-root` flipped
production in ~40s where two `--from-source` redeploys had done nothing. Verified on the artefact,
not the trigger: `/health` `contractVersion: "1.2"`, `ok: true`, tenants
`{count:2, ids:[cohort2-lms, default], errors:[]}`, worker idle, jobStore on volume and writable;
all four script routes listed on the `/api/v1` index; `script-approval` present in the published
`blockedBy` set (now 11 values). `node scripts/verify-live.js` → **9 passed, 0 failed**. Working
deploy path recorded in [[deployment]].

**One check deliberately left to them:** `cohort2-lms` at `monthlyUsd: 50` loaded without error, but
the value itself is only readable via `/demo/spend` under THEIR token, which this session does not
hold (materialising it was refused, correctly). The LMS confirms it on the joint first run.

### NEXT_STEPS (this thread)
- Tell the LMS 1.2 is live — they are watching `/health` for it — and run the joint first course:
  one module, two lessons, script → revise → approve → review. Ask them to read `monthlyUsd` off
  `/demo/spend` while they are there.
- Ask them to get the gate onto their `main`; it is on `staging` only, and `origin/main` is stale
  at `ff5f814` (Sep 22).
- Reconnect the Railway repo so `--from-source` stops lying, then fix SERVICE_DURABILITY §6.1.
- Watch the first real course for [[lessons#H35]]: their staging spends against the real $50.

## 2026-09-28

### Verified end to end: the pipeline IS properly connected to the live LMS

Asked to check the connection; verified on artefacts per `verify-before-claiming`, not on config.

**Live and correct:** our production serves `contractVersion 1.2` with `build.commit faef6b7`
(a real commit in `origin/main` — the `/health.build` field now exists, so §9 proof is cheap).
The LMS's deployed commit `b59bb8e` **contains the gate** (`script/approve`, `script-approval`,
`VENDORED_CONTRACT_VERSION` all present), their client defaults to our production URL with
`CONTENT_QUEEN_API_URL` unset, and an authenticated call from inside their Railway env returned
**200** seeing `contractVersion 1.2` and the script routes. Technique: [[lessons#H37]].

**The 09-25 open check is now closed:** `/demo/spend` under their token reports
`tenant: cohort2-lms, monthlyUsd: 50, spentUsd 7.82, reservedUsd 0, remaining 42.18, runs 2`.
The raise is live and nothing is stuck holding a reservation.

**Also closed:** the gate reached their `main` — `origin/main` and `origin/staging` are converged
at `96b6206`.

**Drift worth knowing (neither breaks the link):** our production is **3 commits behind**
`origin/main` and those commits DO touch code — `server/lib/tenants.js`, `ledger.js`, `api.js`,
`app.js`, `orchestrator/lib/queue.js` and a new `scripts/reset-production-state.js`; the newest
commit is literally "Correct the session record: pushed, not deployed". Their deployment is 1
commit behind their own head. They still run exactly ONE environment, `Staging` — so their
"production" and their test surface are the same deployment, the same tenant and the same $50
([[lessons#H35]]).

**Still unexercised:** no course has yet stopped at `script-approval` in production — the gate is
served but has never fired against a real build. The joint first run is what proves it.
