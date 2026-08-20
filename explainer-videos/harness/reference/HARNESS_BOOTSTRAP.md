---
type: reference
last_verified: 2026-08-17
owner: aroma
source: Taleemabad Context Engineering Harness bootstrap (CEO OS + Rumi patterns)
note: Full 9-phase bootstrap. Source material for harness-07 "Assignment 2 — build an effective harness".
---

# Context Engineering Harness Bootstrap

**For:** Any Taleemabad team member setting up Claude Code on their repo
**Time:** 2–4 hours for a full build, 30 min for a minimal starter
**What you get:** A self-reinforcing AI development environment that enforces quality, loads context intelligently, tracks work, and improves itself over time.

## What you're building and why

A harness is two things working together:

- **Guides (feedforward):** CLAUDE.md files, agents, skills — they steer Claude *before* it acts
- **Sensors (feedback):** Hooks, tests, validators — they observe *after* Claude acts and correct mistakes

Without both, you have a style guide that nobody enforces. The CEO OS and Rumi repos work because violations are caught mechanically, not by asking Claude to be disciplined.

**The other thing to understand: context is a depletable resource.** Every token you load degrades the tokens already there (Stanford's "lost in the middle" finding). The L1→L2→L3 system below is about loading the minimum high-signal context needed for each task — not stuffing everything in upfront.

## The 9 phases (summary)

1. **Audit** — list files/dirs, find existing CLAUDE.md/.claude/README, identify repo type, language, deploy target. One-page summary before touching anything.
2. **CLAUDE.md hierarchy (L1→L2→L3)** — progressive disclosure:
   - **L1** CLAUDE.md at root — navigation only, critical rules, pointers — ≤150 lines — always loaded.
   - **L2** CLAUDE.md per sub-folder (or `.claude/rules/*.md` with `paths:` frontmatter) — ≤100 lines — loaded on demand.
   - **L3** docs, runbooks, references, plans — ≤300 lines — loaded only when blocked.
   - **L4** archives, changelogs, transcripts — unlimited — load by section only.
   - Sub-folder context files must be named `CLAUDE.md` (Anthropic tooling auto-loads `CLAUDE.md`, not `README.md`). L1 contains zero substantive content — a routing table only.
3. **Hooks** — mechanical enforcement (see below).
4. **Beads** — append-only JSONL work tracker (status/decisions/failures) that survives context resets.
5. **Agents** — autonomous multi-step orchestrators (`.claude/agents/[name].md`); each has a Session End Protocol + Self-Improvement Log.
6. **Skills** — static knowledge libraries (`.claude/skills/[name]/SKILL.md`); loaded on demand.
7. **Standards** — `.claude/standards/` governance docs (doc types, invocation, retrieval, metadata).
8. **What not to do** — common failure modes (below).
9. **Eval harness** — YAML task suite measuring routing quality (hops, 6 SLOs, cost).

## Document types (L3) + frontmatter

Every doc has YAML frontmatter: `type`, `last_verified`, `owner` (+ optional `status`, `related_beads`, `parent`).

| Type | Purpose | Line limit | Load behavior |
|------|---------|-----------|---------------|
| router | Navigation only — links, no content | 100 | Always safe |
| runbook | Step-by-step procedures | 200 | When executing that procedure |
| reference | Stable lookup info (schema, creds, endpoints) | 300 | When domain is active |
| investigation | Active analysis, time-bound (`status` req.) | 300 | When debugging |
| plan | Proposed approach + decisions | Unlimited | When planning |
| changelog | Version history, append-only | Unlimited | By section only |

When a doc exceeds its limit, **split it** (router + parts), don't expand it.

## Phase 3 — Hooks (the mechanical layer)

Hooks fire at lifecycle events and communicate via exit codes: **exit 0** allow (silent), **exit 2** block (stderr shown to Claude, must fix before retry). Silent on success, loud on failure.

`.claude/settings.json` wires: PreToolUse (Bash → block-bad-commands; Write|Edit → guard-file-writes), PostToolUse (Write|Edit → validate-after-write), SessionStart (session-start), Stop (session-end).

- **block-bad-commands.sh** — block `railway up`, force-push to main, committing `.env`.
- **guard-file-writes.sh** — warn on `.env` writes; block CLAUDE.md if >150 lines.
- **validate-after-write.sh** — `py_compile` Python files; warn on markdown missing frontmatter.
- **session-start.sh** — inject open beads + warn if CLAUDE.md bloated.
- **session-end.sh** — remind of unclosed beads / unstaged changes / bloated CLAUDE.md.

## Phase 4 — Beads (memory that survives context resets)

Append-only JSONL in `.beads/`: `status.jsonl` (tasks: open/in_progress/closed/blocked), `decisions.jsonl` (architectural decisions + rationale + alternatives), `failures.jsonl` (incidents: root_cause + fix + lesson), `history.jsonl` (archived >90 days). The session-start hook re-injects open beads every session. Open a bead before touching code; close with a resolution that says what was done + how to verify. Never edit a prior line — the history is the value.

## Phases 5–7 — Agents, Skills, Standards

- **Agents:** what it does · when to invoke · what it reads · what it produces · Session End Protocol · Self-Improvement Log. Modes: `auto | manual | suggest`.
- **Skills:** what domain · authentication · core patterns (working code) · known issues · learnings log. Loaded on demand (only names/descriptions at startup).
- **Standards** (`.claude/standards/`): DOC_TYPE_SYSTEM.md, INVOCATION_POLICY.md, RETRIEVAL_POLICY.md, METADATA_CONTRACT.md (freshness SLOs per doc type).

## Phase 8 — Verify checklist

CLAUDE.md ≤150 lines and routing-only · ≥1 L2 CLAUDE.md (or `.claude/rules/` with `paths:`) · ≥1 L3 reference with frontmatter · settings.json with PreToolUse + Stop · 5 hook scripts (chmod +x) · beads status/decisions/failures · 4 standards docs · ≥1 agent with Session End Protocol · ≥1 skill · smoke-test passes · editing CLAUDE.md >150 lines blocks.

## Phase 9 — Eval harness (does your documentation actually work?)

Each eval = a task case: user question, the doc Claude should load, docs it should NOT load, max hops.
**Hops** = files loaded before reaching the answer; target **≤2** (L1 → L2 → L3). 3+ hops = broken routing; fix the router, not the destination.

Task format `.claude/evals/tasks/eval-NNN.yaml`: `id`, `description`, `category` (explicit | implicit | contextual | negative), `input`, `expected` {route, must_load, must_not_load, max_hops}, `graders` (deterministic + llm_judge with rubric + threshold), `quality_gate`.

**Three grader tiers:** Tier 1 deterministic (free, every session — paths exist, size limits, frontmatter, freshness, cross-refs). Tier 2 LLM-as-judge (~$0.05–0.50, before push to main — score 1–5 vs a specific rubric). Tier 3 quality gate (manual — PASS | CONCERNS | REWORK | FAIL).

**The 6 SLOs:** wrong-route < 5% · time-to-correct-doc ≤ 2 hops · stale-doc < 10% · context payload < 3000 tokens avg · retrieval precision > 80% · unresolved ambiguity < 15%. Store baselines in `.claude/evals/baselines/` as append-only JSONL with a mandatory `cost_usd` field. New evals auto-grow from logged failures.

## Common mistakes (Phase 8 "what not to do")

1. Putting content in CLAUDE.md (it loads every session — route detail to L3).
2. Hooks that talk on success (noise — be silent on success, loud on failure).
3. Agents with no Session End Protocol (cleanup debt).
4. One giant CLAUDE.md instead of a hierarchy (a 5,679-line CLAUDE.md was the failure that motivated the limit).
5. Skills that duplicate CLAUDE.md content (they drift — one source of truth).
6. Skipping the failures log (the most valuable file — incidents become rules so mistakes aren't repeated).

## The self-improving loop

Agents log learnings → failures logged → new failure class becomes a new hook → quarterly bead archaeology finds patterns (recurring bug → missing hook; recurring doc rot → missing SLO). The harness is meaningfully smarter in month 3 than month 1 — because it accumulated hard-won knowledge, not because the model changed.

*Built from patterns in Taleemabad's CEO OS and Rumi repos. Last updated: 2026-04-03. (Cleaned copy; full original prose + all hook/bead code blocks live in the source doc Aroma provided.)*
