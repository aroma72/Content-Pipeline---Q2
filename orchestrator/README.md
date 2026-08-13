---
type: reference
last_verified: 2026-08-11
owner: Aroma Tahir
---

# Orchestrator spine

**ILHAM plan item 3.1.** Drives one topic through the whole content chain:

```
research → script → gate → produce → qa → upload → nazim
```

The spine owns *sequencing, retry, persistence and measurement*. It knows nothing about how a
video is made — every stage is a plugin behind one interface, so later plan items drop in by
replacing a stage rather than editing `lib/spine.js`.

## Quick start

```bash
node orchestrator/run.js enqueue --topic "What a rubric actually does" --series evals
node orchestrator/run.js run --dry-run --stop-after qa   # rehearse, no calls, no spend
node orchestrator/run.js run --stop-after qa --budget 2.00
node orchestrator/run.js status
node orchestrator/run.js metrics
```

| Command | Does |
|---|---|
| `enqueue --topic T --series S` | Add work. `--slug --priority --notes --source --recommendation-id` |
| `run` | Pop the highest-priority item and run it |
| `drain [--max N]` | Run items until the queue empties or one fails |
| `resume <runId>` | Continue a failed/blocked run, skipping stages already done |
| `requeue <itemId>` | Put a failed/blocked item back in line |
| `status [runId]` | Recent runs, or one run's stage-by-stage detail |
| `queue` | Current queue contents |
| `metrics` | The three numbers plan item 7.2 has to prove |

**Flags:** `--dry-run` (no external calls, no spend, no writes) · `--stop-after <stage>` ·
`--from <stage>` · `--budget <usd>` (pre-authorises paid art/TTS) · `--title "..."` · `--quiet`

### `--from produce` — produce a script you already wrote

```bash
# write explainer-videos/<series>/<slug>/beats.js yourself, then:
node orchestrator/run.js run --from produce --budget 1.00 --title "When a good score lies"
```

Reads the existing `beats.js`, hands it to `produce` as the artifact the script stage would
have produced, and prices the run from those real beats. The skipped stages are recorded as
`skipped` — never `done` — and the run logs a `started_mid_chain` intervention, so the run log
can't later be misread as evidence the generation stages ran and passed.

This is the manual-topic path, and it's also how you produce anything while the Anthropic key
is unavailable.

## Why `--stop-after qa`

`upload` and `nazim` are **not built** and fail closed on purpose. Without `--stop-after qa`
a run halts at `upload` as `blocked` — correct, but noisy. `--stop-after qa` is the plan's own
scoping for 3.1: prove the chain up to QA while 2.1 and 1.2 are still waiting on other people.

## Design decisions worth knowing

**Unbuilt stages fail closed.** `upload` and `nazim` throw `BlockedError`, which halts the run as
`blocked` and never marks the queue item `done`. A stage that quietly returned success would let
the spine report a completed run for a video no learner can watch.

**Nothing spends without a budget.** `produce` checks `--budget` before buying art or TTS. With no
budget it records a `spend_approval_required` intervention and blocks. Plan item 3.2 raises the cap
so this stops needing a human.

**Retries are idempotent-by-skip.** `produce` skips art if `art/` is populated and TTS if `audio/`
is, so a retry after a render crash does not re-buy ~20 Imagen images.

**Resume skips completed stages.** State is flushed after every transition, so a crash loses at
most the stage in flight.

**A rejected script or a failing QA is terminal, not a warning.** Animating a `NEEDS WORK` script
wastes money on a video that fails QA anyway; publishing below the 4.9 bar is worse than not
publishing. Plan items 3.3 and 3.4 turn both into retry loops.

## Layout

```
orchestrator/
  run.js              CLI
  queue.jsonl         topic queue (append-only event log; git-ignored)
  .runs/              per-run state (git-ignored)
  lib/
    spine.js          the state machine — sequencing, retry, resume
    spine-errors.js   BlockedError / RejectedError (separate to avoid a require cycle)
    state.js          run state + instrumentation (plan 0.3)
    queue.js          queue with an ILHAM-recommendation merge point (plan 4.3)
    llm.js            Anthropic wrapper; prompts always loaded from prompts/
    shell.js          argv-array child_process (never a shell string — paths have spaces)
    paths.js          every path, derived from __dirname
    jsonl.js          append-only JSONL
    stages/           one file per stage
```

## What it writes

| File | Contents |
|---|---|
| `.beads/runs.jsonl` | One row per finished run — timings, attempts, interventions, spend. Feeds `metrics`. |
| `.beads/failures.jsonl` | One row per stage failure, tagged with the plan item that unblocks it. The corpus plan item 5.1 learns from. |
| `.beads/qa_ratings.jsonl` | One row per QA score (real runs only). |

## Prompts

`research`, `script`, `gate`, and `qa` load their system prompts from `prompts/` — never inlined,
per CLAUDE.md. This session added `video_research.txt`, `video_script.txt`, and `script_gate.txt`;
`qa` uses the existing `quality_rating.txt`.

**Known drift:** `prompts/quality_rating.txt` still names 6.0 as its default threshold. The
authoritative bar is **4.9** and is enforced in `stages/qa.js`, so the two cannot disagree in
practice — but the prompt text should be corrected when someone next touches it.

## YouTube publishing (ILHAM 2.1 + 2.3)

One-time human setup, then every run publishes itself with nobody present.

**1. Create an OAuth client** at https://console.cloud.google.com/apis/credentials

   a. **APIs & Services → Library** → enable **YouTube Data API v3**.
   b. **OAuth consent screen** (newer consoles: *Google Auth Platform → Audience*) →
      **External** → fill in app name and emails → save. **Add your own Google account
      under "Test users"**, or consent fails with "Access blocked".
      This must exist *before* step (c), or the Application type dropdown never appears.
   c. **Credentials → + Create credentials → OAuth client ID** → **Application type:
      Desktop app**. Desktop clients need NO redirect URI — Google permits loopback
      for them automatically.

**2. Put the two values in `.env`:**

```
YOUTUBE_CLIENT_ID=<...>.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=<...>
```

**3. Authorise once**, in a terminal with a browser available:

```bash
node orchestrator/youtube-auth.js          # opens the consent page
node orchestrator/youtube-auth.js --check  # confirm it works
```

That stores a refresh token in `orchestrator/.credentials/` (gitignored, mode 600).
From then on the pipeline mints its own access tokens — no human in the loop.

**Before this can reach learners — the YouTube API audit**

A Google Cloud project that uses the YouTube Data API and has **not** passed YouTube's
compliance audit has its API uploads **locked to `private`**, whatever `privacyStatus`
the request asks for. That is a YouTube-side policy, not something this code can work
around.

For an unlisted-then-reviewed workflow that is survivable — the video exists, has a
URL, and a human can watch it. But it cannot be made **public** (i.e. actually
delivered to learners at scale) until the project is audited. Request the audit early;
it is a form plus a review, not instant.

`uploadVideo` reports back the privacy YouTube actually applied rather than the one it
asked for, so a forced `private` shows up honestly in the run log instead of the
pipeline claiming it published something unlisted.

**What the upload stage guarantees:**

- Only `<slug>_final.mp4` is uploaded. A bare render has no brand bumpers, so
  uploading it would violate LAW 1 — the stage refuses.
- Videos are **born `unlisted`** and appended to `.beads/publish_review.jsonl` with
  `cleared: false`. A human promotes them later, asynchronously; the run never waits.
  `--publish-public` overrides this and is recorded as an intervention.
- The OAuth scope is `youtube.upload` only — it cannot read, list, or delete
  anything on the channel.
- Uploads are resumable: a dropped connection resumes from the byte Google
  confirms, not from zero.
- Missing consent is reported as **blocked, not failed**, with the exact command to
  run — nothing is wrong with the code or the video, a person just hasn't consented.

## Requirements

- Node 18+ (tested on v24)
- `@anthropic-ai/sdk` at the repo root (present)
- Anthropic credentials for the judgement stages — `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`,
  or an `ant auth login` profile. Without them, `research` fails after 3 retries having spent nothing.
- `GEMINI_API_KEY` or `GOOGLE_STUDIO_API_KEY` for `produce` (Imagen + TTS). `lib/env.js` loads
  `.env` and bridges `GOOGLE_STUDIO_API_KEY` → `GEMINI_API_KEY` for child processes.
- Python with Pillow + numpy for the cutout step. On this machine Python is **not on PATH** —
  `lib/shell.js` finds it at `%LOCALAPPDATA%\Programs\Python\Python314\python.exe`.
- `produce` scaffolds the video folder from the skill templates automatically, copying only
  files that don't already exist.

### Windows spawning

`lib/shell.js` resolves bare command names against `PATH` + `PATHEXT` (`npm` is `npm.cmd`),
uses `shell:true` only for batch wrappers because Node 20+ requires it, **quotes the executable
path** because `shell:true` otherwise splits `C:\Program Files\nodejs\npm.cmd` on the space, and
refuses any argument containing whitespace through a batch wrapper rather than let it mis-split.
This is the same defect class that left the health-check scheduler dead for three months.

## Not built yet

| Stage / feature | Blocked on |
|---|---|
| `upload` | Plan 2.1 — YouTube uploader + one-time Google OAuth |
| `nazim` | Plan 1.2 — NAZIM content-write API spec (endpoint, auth, link field) |
| Auto spend cap | Plan 3.2 — currently `--budget` per run |
| Gate re-draft loop | Plan 3.3 |
| QA regenerate-weakest-stage | Plan 3.4 |
| Feed from ILHAM recommendations | Plan 4.1 (needs 1.3) — the queue already carries `source` and `recommendationId` |
