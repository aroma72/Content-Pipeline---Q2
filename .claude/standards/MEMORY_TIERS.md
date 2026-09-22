---
type: standards
last_verified: 2026-09-21
owner: aroma
---

# Memory Tiers — Hot / Warm / Cold

The governance contract for `.claude/memories/`. What each tier is for, when it loads, who may
write it, and how it decays.

**Canonical store:** `.claude/memories/`. Everything else that looks like memory is either a
pointer at this store or a different concern — see §7.

---

## 1. The three tiers

| Tier | Holds | Size rule | Loading |
|---|---|---|---|
| **HOT** — `active-session.md` | Current work, open threads, what the next session must resume | `DR_ACTIVE_SESSION_BUDGET` lines (default 300), enforced by rotation | Always, in full |
| **WARM** — topic files | Durable knowledge that shapes decisions: architecture, deployment, lessons, phase status, product context | Soft, flagged by the auditor | Injected **only when stale**; otherwise read on demand |
| **COLD** — `session-archive/` | The episodic narrative of what happened on a given day | Unbounded, append-only | **Never** auto-loaded |

### The inversion — read this before changing the loading rule

Warm files are injected into context **because they are stale**, not because they are relevant.
A fresh warm file costs one line in the session banner. A stale one gets its first 80 lines pasted
into context with an instruction to fix it before the session ends.

This is deliberate. Relevance-based loading needs a retrieval model and is wrong often enough to be
expensive; staleness is a fact you can compute from a timestamp, and a stale file is the one thing
that reliably makes an agent act on something untrue. The tier system exists to stop memory rotting,
not to maximise recall — recall is what the SQLite index in `.claude/memory-db/` is for.

### Which tier does a new fact go in?

Ask what would still be true in three months.

- *"We are mid-way through wiring the checkpoint publisher and it is not done"* → **HOT**. It expires the moment the work lands.
- *"The checkpoint publisher must run after the deploy, because the API serves beats.js out of the container"* → **WARM** (`pipeline-mechanics.md`). Still true in three months.
- *"On 2026-09-20 the publisher failed twice because the container had not rebuilt"* → **COLD**. It is an episode. If it happens a third time, the *rule* it teaches gets promoted to warm.

An item you cannot place is a signal the map is wrong. Say so; do not force it.

---

## 2. Decay schedule

Every warm entry has an age, taken from `last_verified` in its frontmatter.

| Age | Required behaviour |
|---|---|
| **0–90 days** | Trust and act. No verification required. |
| **90–180 days** | Treat as possibly stale. Say so in reasoning before acting. Re-verify first if the action is irreversible — a deploy, a delete, a migration, a paid API call. |
| **> 180 days** | **Mandatory re-verify** against the live codebase or live infrastructure. Do not act on the entry directly. |

**Expiry overrides age.** If a trigger in §3 has fired, the file is stale immediately, whatever its
date says.

Per-file freshness thresholds, used by `session-start.sh` to decide what to inject:

| File | Stale after |
|---|---|
| `lessons.md` | 14 days |
| `deployment.md` | 30 days |
| `phase-status.md` | 30 days |
| `pipeline-mechanics.md` | 30 days |
| `product-context.md` | 60 days |
| `architecture.md` | 90 days |

---

## 3. Invalidation triggers

| File | A trigger fires when… |
|---|---|
| `deployment.md` | Railway service rename/delete · URL change · new or removed env var · volume change · CI workflow redesign |
| `architecture.md` | New orchestrator stage · new skill or agent · schema change · pipeline stage added or removed |
| `pipeline-mechanics.md` | Any change to the explainer pipeline: beats format, art generation, TTS, cutout, compile, bumpers, checkpoint contract |
| `lessons.md` | A pattern is confirmed broken · an anti-pattern is confirmed resolved · a major dependency version jumps |
| `phase-status.md` | A build phase completes · a feature is rolled back · a new content cycle begins |
| `product-context.md` | Scope change · a success metric is redefined · the LMS integration contract changes |
| `active-session.md` | N/A. It does **not** reset. Rotation moves whole dated sections out once it exceeds budget; anything not rotated stays indefinitely. |
| `session-archive/*` | N/A. Append-only. Historical context only — never act on it directly. |

---

## 4. Contradiction precedence

When two sources disagree, authority runs in this order. Highest wins.

1. **Live codebase / live infrastructure** — always highest.
2. **A dated incident record** — `.beads/failures.jsonl`, `session-archive/`. Specific and timestamped.
3. **`lessons.md`** — a general confirmed pattern.
4. **`active-session.md`** — current working notes.
5. **`session-archive/` as narrative** — historical context; never authoritative.

The default outcome of a conflict is **a question, not a change**. Do not merge two conflicting
claims into one hedged sentence — a hedge destroys the information that they disagreed.

To supersede a claim, mark the old one `DEPRECATED as of <date> — <reason>` and put the replacement
beside it. Treat it like a migration. Never overwrite a prior claim in place.

---

## 5. Write ownership

| File | Written by |
|---|---|
| `active-session.md` | The model, every response |
| `session-archive/YYYY-MM-DD.md` | `session-end.sh`, `rotate-active-session.sh`, `capture-*.sh`. Read by `/memory-distill` |
| `mistakes.md` | `capture-tool-failures.sh` only. Fixed format. Narrative mistakes are `lessons.md` anti-patterns, not rows here |
| `lessons-export.md`, `mistakes-export.md` | **Generated** by `mem.py export-md`. Any hand edit is destroyed on the next run |
| Warm topic files | The `/memory-distill` pass, or a human. Not by hooks |
| `.distill-state.json` | The `/memory-distill` pass only |
| `hook-runs.log` | Every hook, one line per run |

---

## 6. Losslessness

**Every demotion copies; it never destroys.** Rotation moves whole sections and leaves a breadcrumb.
PreCompact snapshots the hot file verbatim before it is compacted. Editing the hot file appends the
removed text to today's archive first.

**Promotion only advances a watermark.** `/memory-distill` never deletes or rewrites a
`session-archive/` file. If a distillation turns out to be wrong or over-compressed, the episodic
source is still there verbatim.

A watermark moved past work that was not done is worse than no watermark, because it makes the
backlog invisible. If a pass cannot finish, it says so and does not advance.

---

## 7. What is *not* in this system

| Store | What it is | Relationship |
|---|---|---|
| `agent_memory.json` + `memory_manager.py` | The **application's** runtime memory: locked rules and past mistakes injected into video-agent prompts at dispatch | Different concern. Not managed here, not read by these hooks, not touched by `/memory-distill`. |
| `.beads/*.jsonl` | Append-only work, decision, failure and QA ledgers | A **cold source**. `mem.py ingest-beads` reads `failures.jsonl`; nothing here writes to `.beads/`. |
| `server/lib/job-store.js` | Job/queue durability ladder | Unrelated. That ladder resolves *one* directory and is correctly flat — see `docs/HARNESS_AUDIT.md`. |
| `memory/` (repo root) | The former store | Migrated into this one on 2026-09-21. Left as a pointer stub. |
| `~/.claude/projects/e--Content-Pipeline---Q2/memory/` | The harness's own per-session notes | Machine-local. Its `MEMORY.md` points here. |

---

## 8. Tunables

One budget, read everywhere — **never restated**. A second copy of a number is a bug waiting for a
reader to trust the wrong one.

| Variable | Default | Read by |
|---|---|---|
| `DR_ACTIVE_SESSION_BUDGET` | 300 | `rotate-active-session.sh`, `session-start.sh`, `audit-memory.py` |
| `DR_DISTILL_BACKLOG_LINES` | 1500 | `distill-memory.sh` |
| `DR_DISTILL_COOLDOWN_HOURS` | 24 | `distill-memory.sh` |
| `DR_REPO_ROOT` | `git rev-parse --show-toplevel` | every hook — the test seam |
| `RAILWAY_ENVIRONMENT` | unset locally | every hook — kill switch; all hooks no-op when set |
