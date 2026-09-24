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
## 2026-09-24

### Script-approval gate shipped into the spine and the course API (contract 1.2)

Built the pre-spend human gate the LMS asked for: every course lesson now pauses TWICE -- once at
`script-approval` (new stage, between `gate` and `references`, before a penny of media) and once at
the existing `review`. New `BLOCKED_BY.SCRIPT_APPROVAL`; routes `GET .../script`, `.../script.md`,
`POST .../script/approve` (sha required), `.../script/revise` (notes, capped at 5).

**The design decision worth defending: approval is bound to a sha of beats.js, and resume seeds from
the VOLUME, not from run state.** `course-worker.buildOne` calls `state.create()` fresh every build,
so a resumed lesson re-runs research/script/gate and would have rendered a DIFFERENT script than the
one approved. Run state is deliberately off the volume (paths.js:36-39) and a script can wait days
across a redeploy, so `state.load(runId)` was the wrong resume path. `seedFromScript()` rebuilds the
artifacts from the persisted `beats.js` + a new `run-context.json` (which carries the research brief
-- script.js feeds it into every rewrite). Verified: changing beats.js under a standing approval
re-blocks and `produce` never runs.

**Four bugs the design review caught that the first plan missed** (all confirmed against source):
1. `buildOne` settled the ledger on EVERY outcome incl. blocked -- with the gate that closed the
   $2.50 reservation at ~$0.05 before any media, leaving the approved build spending unbacked. Now
   skipped when `blockedBy === 'script-approval'`.
2. `humanReleased()` didn't count a script approval, so an approved lesson in a held course would
   queue and never build.
3. `queue.requeue` didn't clear `scriptApproved`/`scriptApprovedSha`.
4. `test-regressions.js:3217` scans source with a REGEX for `code: '<literal>'`, so the stage must
   throw the literal, not the constant. Pre-existing contradiction; commented at the throw site.

**Routing trap:** `:lessonId(*)` is greedy, so `/lessons/a/b/script/approve` also matches the plain
`/approve` route with lessonId `a/b/script`. The script routes MUST be registered before
approve/reject. Caught by a test, not by reading.

**Mistake I made, and the fix:** wrote server tests that hit routes which `kick()` the real worker --
`withCourse` didn't stub it, so a real spine run started and made two real model calls ($0.73, model
only, no media) before I killed it. `course-worker`'s verbs call their own module-local `kick()`, so
stubbing the export does NOT stop them; the only chokepoint that cannot be routed around is
`spine.execute`. `withCourse` now stubs that. Rule: in server tests, neuter the spine, never the kick.

**Shipped in this session (PR 1 + PR 2):** the stage, the worker verbs, the four routes, plan
validation at `build`, `contractVersion` 1.2 + index entries, `docs/contracts/course-api-v1.2.md`,
the `## 1.2` changelog section, `docs/integration-requests/2026-09-24-script-approval-reply.md`, and
the verify-live floor + two new checks (both verified PASSING against a locally booted server).
Tests: 236 + 34 + 53, lint clean (verified on a clean aggregate `npm test`, not just per-suite).

**Not a regression, do not chase it:** `test-regressions.js` ~:2273 ("live: no 'waiting on stdin'
warning from claude") shells out to the real `claude` CLI with a 120s timeout and makes a real Haiku
call. It failed once under a backgrounded `timeout 500 npm test` and passed on every direct run --
contention on the wrapper, not the code. It is also the one test in the suite that costs money by
design.

**Next session:** PR 3 (the `/api/v1/jobs` two-phase single-video flow) is NOT built yet -- design is
in the approved plan (§5), including two bugs to fix while extracting: `app.js` passes
`job.script.brief`, which the projection never sets, and the demo `claim` route is not needed on a
token surface. Deploy
ordering matters: the gate is ALWAYS ON, so a course built after this deploy stops at lesson 1 in ~2
minutes and waits -- the LMS must have the approve call wired BEFORE this reaches production.

## 2026-09-24 — Moving YouTube publishing to the Taleemabad University account (in progress)

Continues the 2026-09-21 entry above. Decision made: the new OAuth client is being created in the
**`Cohort2LP` Google Cloud project**, signed in as `taleemabad.university@taleemabad.com`, where
YouTube Data API v3 is already enabled. That project is **not** the one holding the current
`YOUTUBE_CLIENT_ID`, so this is a new client — **all three** of `YOUTUBE_CLIENT_ID`,
`YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` change, locally and on Railway. A re-consent
alone would not have been enough.

Two choices worth defending later:
- **Consent screen user type = Internal.** The account is a `taleemabad.com` Workspace identity, so
  Internal is available, and it avoids the Testing-mode **7-day refresh-token expiry** that would
  have made uploads fail silently a week after setup. It also skips verification review.
- **Client type = Desktop app.** `orchestrator/youtube-auth.js` listens on an ephemeral loopback
  port (`http://127.0.0.1:<port>/oauth2callback`); only Desktop clients accept an arbitrary
  loopback port. A Web application client would force a hardcoded port.

**Trap to re-read before touching this:** `loadToken()` (`orchestrator/lib/youtube.js:58`) reads
`YOUTUBE_REFRESH_TOKEN` from the env **before** it looks at
`orchestrator/.credentials/youtube-token.json`. Re-running `youtube-auth.js --force` writes the file
but the stale env value still wins, so the pipeline keeps uploading to the old channel while every
check reports "authorised". Blank the env var before consenting, then paste the new token in.

Walking Ramsha through this one step per message, at their request.

### NEXT_STEPS (this thread)
- Remaining: create the OAuth client → blank + repopulate the three `.env` vars → `node
  orchestrator/youtube-auth.js --force` as the university account (pick the right channel if a
  brand-account picker appears) → prove the channel with the oEmbed check on one unlisted upload →
  `railway variables --set` all three, **never** `railway redeploy --from-source` (rolls back
  unmerged work).

**2026-09-24 follow-up — Cohort2LP consent screen was External/Testing.** Found it at
External + publishing status Testing, i.e. the 7-day refresh-token expiry was live and would have
broken uploads a week after setup. Switched to Internal. Safe to switch because the Audience page
showed **0 users (0 test, 0 other)** — no one had ever granted this project's OAuth, so the
existing `Cohort2 LMS — Calendar` client had no external users to break. Check that user count
before making any shared project Internal; Internal locks consent to `taleemabad.com` accounts
for every client in the project, not just ours.

**2026-09-24 progress.** Desktop-app OAuth client created in `cohort2lp` (verified: the downloaded
JSON's top-level key is `installed`, which is what proves Desktop rather than Web). `.env` now holds
the new `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET` with `YOUTUBE_REFRESH_TOKEN` deliberately blank;
`yt.isAuthorised()` correctly reports false. Backup of the previous `.env` is in this session's
scratchpad only (it holds live secrets — never copy it into the repo). Consent run is next.

**2026-09-24 — consent granted, token in place.** Consent completed against the new `cohort2lp`
Desktop client; scope came back as `youtube.upload` only, as intended. Refresh token copied from
`orchestrator/.credentials/youtube-token.json` into `.env`, and `loadToken()` now reports its source
as `env:YOUTUBE_REFRESH_TOKEN` with a live access token minting successfully — so the env value in
use is the new one, not a leftover. Channel identity is still UNPROVEN: the upload-only scope cannot
read the channel back, so the only proof is one unlisted upload checked via the oEmbed endpoint.

**2026-09-24 — VERIFIED: uploads now land on Taleemabad University.** A real unlisted upload through
`yt.uploadVideo()` resolved via oEmbed to `Taleemabad University` / `@TaleemabadUniversity`. The
migration off `@AromaTahir` is proven for **local** runs. Railway still holds the old three vars at
the time of writing — production is unchanged until they are set.

**2026-09-24 — Railway production switched to the Taleemabad University credential.** All three
`YOUTUBE_*` vars set on `ContentQueen` / production via `railway variables --set` (three `--set`
flags in one call, which is one redeploy rather than three). Verified by re-reading
`railway variables --json` and comparing SHA-256 prefixes against `.env` — all three MATCH. Note
`PIPELINE_STOP_AFTER=upload` on production, so production really does publish and this change was
load-bearing, not cosmetic. `PIPELINE_COURSE_STOP_AFTER` is unset there, so courses fall back to the
code default `upload`.

Technique worth reusing: compare secrets between environments by printing only an 8-char SHA-256
prefix. It proves same/different without ever putting the value in the transcript or a tracked file.

Unrelated warning surfaced by the CLI: Railway Config-as-Code (`railway.json`) is deprecated in
favour of `.railway/railway.ts`; existing files keep working until **2026-12-01**. Not actioned.

### NEXT_STEPS (this thread)
- Delete the unlisted verification upload from YouTube Studio once reviewed (a duplicate lesson,
  kept only as channel proof).
- `docs/DEPLOYMENT_PREREQS.md` and `.claude/memories/deployment.md` both describe the YouTube grant
  without naming a channel — worth adding "@TaleemabadUniversity, OAuth client in the `cohort2lp`
  Cloud project, consent screen Internal" so the next person does not have to re-derive it.
- Old @AromaTahir grant is now orphaned; revoke it at myaccount.google.com/permissions when
  convenient.
