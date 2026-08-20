---
type: reference
last_verified: 2026-08-17
owner: aroma
source: Taleemabad Context Engineering Harness (CEO OS + Rumi patterns)
note: Source material for harness-07 ("what makes a harness effective"). Companion: HARNESS_BOOTSTRAP.md
---

# Context Engineering Harness

A bootstrap prompt and reference guide for building a self-reinforcing Claude Code development environment in any Taleemabad team repo.

## What this is

A "harness" is a system that makes Claude reliably good — not just occasionally good. It has two sides:

- **Guides (feedforward):** CLAUDE.md files, agents, skills — steer Claude *before* it acts
- **Sensors (feedback):** Hooks, validators, evals — observe *after* Claude acts and correct mistakes

Without both, you have a style guide nobody enforces. This repo gives you the pattern to build both, in about 2–4 hours.

## How to use it

1. Open a new Claude Code session in your team repo
2. Paste the contents of `HARNESS_BOOTSTRAP.md` into the session (or point Claude to it)
3. Say: *"Read this file completely. Then audit my repo and build the harness described in it, phase by phase. Ask me before completing each phase."*

Claude will work through 9 phases and build the harness. You review each phase before it moves on.

## What gets built (the 9 phases)

| Phase | What it builds |
|-------|---------------|
| **1 — Audit** | One-page repo snapshot before touching anything |
| **2 — CLAUDE.md hierarchy** | L1 router → L2 folder READMEs → L3 typed docs (6 doc types with full frontmatter) |
| **3 — Hooks** | PreToolUse (hard blocks), PostToolUse (validation), SessionStart (context injection), Stop (session-end checks) |
| **4 — Beads** | Append-only JSONL work tracker: status.jsonl, decisions.jsonl, failures.jsonl |
| **5 — Agents** | Scoped sub-agents for repeated tasks (docs-updater, debugger, deploy-validator) |
| **6 — Skills** | Slash-command shortcuts for common operations (`/deploy`, `/debug`, `/review-pr`) |
| **7 — Standards** | `.claude/standards/` — domain rules Claude enforces without being asked |
| **8 — What not to do** | Common failure modes and how this harness avoids them |
| **9 — Eval harness** | YAML task suite measuring routing quality: hops, 6 SLOs, cost tracking |

## Key concepts

**Progressive disclosure (L1→L2→L3)** — Context is a depletable resource; every token loaded degrades the tokens already there. The L1/L2/L3 system loads the minimum high-signal context needed per task, not everything upfront.

| Level | Contents | Line limit | When loaded |
|-------|----------|-----------|-------------|
| L1 | CLAUDE.md — routing only, critical rules | ≤150 lines | Always |
| L2 | Folder READMEs, skill indexes | ≤100 lines | When domain matches |
| L3 | Runbooks, references, investigation docs | ≤300 lines | When blocked without it |
| L4 | Archives, full changelogs | Unlimited | On-demand only |

**Beads** — Append-only JSONL files in `.beads/` that survive context resets. Every task opens a bead; every decision and failure gets logged. A session-start hook re-injects the last open beads automatically.

**Eval harness** — Measures whether your docs actually work: does Claude reach the right file in ≤2 hops? Wrong-route rate target < 5%. Cost tracked per run. Results stored in `.claude/evals/baselines/` as append-only JSONL.

## Origin

Built from the patterns in two internal repos:
- **CEO OS** — the reference implementation for hooks, progressive disclosure, and doc types
- **Rumi** — the reference implementation for eval harness, hops measurement, and 6 SLOs

Any team member at Taleemabad can use this bootstrap to replicate those patterns in their own repo in a single session.
