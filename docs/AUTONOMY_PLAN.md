---
type: reference
last_verified: 2026-08-10
owner: Aroma Tahir
---

# Making the Content Factory Autonomous — the plan

**Goal:** the content stage runs as an autonomous peer inside ILHAM's world — topic/recommendation in →
researched, scripted, gated, produced, QA'd, uploaded, and reported back to NAZIM — human **on the loop,
never blocking**. Success = **≤20% intervention · ≥40% faster turnaround vs baseline · ≥1 documented
self-improvement.**

**Status legend:** ✅ done · 🟢 buildable now · 🔒 blocked (needs access / external spec) · 👤 needs you (human action)

---

## Phase 0 — Foundation
- **0.1** ✅ Strip leaked key from `settings.json`. · 👤 **Rotate the key in the Anthropic Console — still required, it's in git history.**
- **0.2** ✅ Baseline captured (provisional ~34 min/video).
- **0.3** ✅ **Local half done (2026-08-11)** — per-run timestamps, per-stage timings/attempts, and an itemised intervention list land in `.beads/runs.jsonl`; `node orchestrator/run.js metrics` reports intervention rate, avg turnaround, and spend. The relay-out half still needs **1.4**.

## Phase 1 — Access & home (the current blocker)
- **1.1** 🔒 **Half-moved (2026-08-11)** — `gh` installed and authed as `aroma72`, so `Orenda-Project/Intelligence-Platform` is now **readable**. Permission is `pull` only: no push/merge, and **Railway access still missing**. Needs an org admin.
- **1.2** 🔒 NAZIM content-write API spec — endpoint, auth, which field takes the YouTube link.
- **1.3** 🔒 Sample ILHAM recommendation ticket + schema — the aroma-targeted ticket shape.
- **1.4** 🔒 Notion task board + Slack relay ("Global Nazim") details.
- **1.5** Set up the content pipeline as a **peer stage** in ILHAM's world (once 1.1–1.4 land).

## Phase 2 — Delivery rails (video → learner)
- **2.1** 👤🟢 YouTube uploader — OAuth2 + Data API v3, returns the live URL. (One-time Google OAuth + pick channel / unlisted-by-default.)
- **2.2** NAZIM write bridge — take the YouTube link → call NAZIM's content endpoint; delete the wrong `api.taleemabad.com` scaffolds. (Needs **1.2**.)
- **2.3** Born-off publishing — videos post **provisional/unlisted + flagged**; a human clears the flag async, never blocking.

## Phase 3 — Production chain (topic → video)
- **3.1** ✅ **BUILT (2026-08-11)** — `orchestrator/` drives research → script → gate → produce → QA → upload → NAZIM from a JSONL queue. Resumable, bounded per-stage retry, failures logged with the plan item that unblocks them. `upload`/`nazim` **fail closed** so a run can never report success for a video no learner can watch. See `orchestrator/README.md`. Verified end-to-end in dry run; real runs need Anthropic credentials.
- **3.2** 🟡 **Half-done** — a per-run `--budget <usd>` gate now blocks paid art/TTS unless pre-authorised (verified: $0 spent when unapproved). Still manual per run; the automatic cap is the remaining work.
- **3.3** Script gate → auto-retry loop — machine verdict; NEEDS WORK → re-draft → retry, cap 3.
- **3.4** Auto-QA scorer — LLM-judge on the 7 factors, **4.9 threshold**; <4.9 regenerates the weak stage, doesn't publish.

## Phase 4 — Close the feedback loop
- **4.1** Feedback door — subscribe to ILHAM's content recommendations → feed the queue. (Needs **1.3**.)
- **4.2** Report completion back to ILHAM — after publish, mark the recommendation actioned, so next cycle sees whether outcomes improved.
- **4.3** Topic queue — merges manual topics + ILHAM recommendations.

## Phase 5 — Self-healing & self-improvement
- **5.1** Self-repair — each stage in try/catch → `failures.jsonl` → repair agent matches a known fix → retry → escalate after 2.
- **5.2** ✅ **DONE (2026-08-11)** — scheduler was registered with an unquoted path (`Execute=c:\Users\Aroma`), failing `0x80070002` since May 20. Fixed the task, de-hardcoded the runner + both creator scripts, and installed the missing `jq`. Runs and writes a fresh `health.json`. It immediately surfaced 3 real failures: `prompt_loading`, `unit_tests`, `pipeline_structure`.
- **5.3** Self-improvement — ride ILHAM's 30-min loop: read run logs → propose + implement one pipeline change → Notion ticket + PR → human review → log to `improvements.jsonl`. (Earns the ≥1 documented improvement. Needs **1.1 / 1.4**.)

## Phase 6 — Unattended operation
- **6.1** Scheduled trigger — pops the next queue item and runs the chain, on ILHAM infra.
- **6.2** Safety net — reuse ILHAM's heartbeat / reconciliation / escalation for the content stage.
- **6.3** Human-on-loop-never-blocks — alerts to Slack, provisional flags, never a hard gate.

## Phase 7 — Prove it
- **7.1** Run a representative batch.
- **7.2** Measure **≤20% intervention, ≥40% turnaround** vs the locked baseline, **≥1 self-improvement**.
- **7.3** Lock the real baseline from the first instrumented runs.

---

## What's buildable now (no ILHAM access needed)
- **0.3** instrumentation (local half) · **3.1** orchestrator spine **up to QA** (stop before upload/NAZIM) ·
  **3.2** pre-approved spend budget · **3.3** script-gate auto-retry · **3.4** auto-QA scorer · **5.2** scheduler fix ·
  **2.1** YouTube uploader (needs one 👤 Google OAuth from you).

## Blocked on you / external
- **1.1–1.4** ILHAM repo + Railway, NAZIM API spec, recommendation ticket schema, Notion+Slack details.
- **0.1** rotate the exposed Anthropic key (in git history).
- Anything in Phases 4/6 and 2.2/5.3 that talks to ILHAM/NAZIM.
