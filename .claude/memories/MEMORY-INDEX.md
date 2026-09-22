---
type: router
last_verified: 2026-09-21
owner: aroma
---

# Memory Index

**The canonical memory store for Drawing Room.** Read `CLAUDE.md` first, this second,
`active-session.md` third. Everything else loads on demand.

Governance — what each tier is for, how it decays, who may write it:
[`.claude/standards/MEMORY_TIERS.md`](../standards/MEMORY_TIERS.md)

---

## Tiers

| Tier | File | Loads |
|---|---|---|
| **HOT** | `active-session.md` | Always, in full |
| **WARM** | the topic files below | Injected only when **stale**; otherwise on demand |
| **COLD** | `session-archive/YYYY-MM-DD.md` | **Never** automatically |

---

## Staleness log

A file past its threshold is injected into context at session start with an instruction to update
it. If a **trigger** has fired, the file is stale immediately regardless of date — triggers are
listed at the foot of each file and in `MEMORY_TIERS.md` §3.

| File | Last verified | Stale after | Contents |
|---|---|---|---|
| `lessons.md` | 2026-05-07 ⚠️ · §H1–H5 are 2026-09-20 | 14d | Confirmed patterns, anti-patterns, non-negotiable gates |
| `deployment.md` | **2026-09-21** | 30d | Railway runtime, env var names, the deploy trap, pre-push gate |
| `pipeline-mechanics.md` | **2026-09-21** | 30d | How a lesson video is made; settled constraints; known failure modes |
| `phase-status.md` | 2026-05-07 ⚠️ | 30d | What each build phase set out to ship |
| `product-context.md` | 2026-05-07 ⚠️ | 60d | Ownership, goals, scope, LMS integration |
| `architecture.md` | 2026-05-07 ⚠️ · hook contract is 2026-09-21 | 90d | Model choices, media tooling, schema contracts, Claude Code hook contract |
| `reference-anthropic-practices.md` | 2026-05-07 ⚠️ | 90d | Agent design principles from Anthropic's guidance |

⚠️ **The May files were migrated verbatim from `memory/` on 2026-09-21 and have not been
re-verified since 2026-05-07.** Much of their content describes the originally-planned pipeline
rather than the explainer-video pipeline that now ships. Over 180 days old — per the decay
schedule, re-verify before acting on them.

---

## Machine-written

| File | Written by |
|---|---|
| `mistakes.md` | `capture-tool-failures.sh`. Fixed format, append-only |
| `lessons-export.md`, `mistakes-export.md` | `mem.py export-md` — **generated**; hand edits are destroyed |
| `hook-runs.log` | Every hook, one line per run. Absence of a line is how a dead hook hides |
| `.distill-state.json` | `/memory-distill` — the promotion watermark |

---

## Commands

| I want to… | Run |
|---|---|
| Promote the archive backlog into the warm files | `/memory-distill` |
| See DB counts, top lessons, pending promotions | `/memory-stats` |
| Check memory hygiene (sizes, placeholders, staleness) | `py .claude/scripts/audit-memory.py` |
| Search memory semantically | `py .claude/memory-db/mem.py search --query "..."` |
| Rebuild the DB from markdown + beads | `py .claude/memory-db/mem.py rebuild` |

---

## Elsewhere

- `.beads/*.jsonl` — work, decision, failure and QA ledgers. A **cold source**; `mem.py ingest-beads` reads `failures.jsonl`. Nothing here writes to `.beads/`.
- `agent_memory.json` + `memory_manager.py` — the **application's** runtime memory for video agents. A different concern; not managed here.
- `memory/` — the former store. Migrated here 2026-09-21; only a pointer stub remains.
