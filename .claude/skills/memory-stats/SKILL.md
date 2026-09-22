---
name: memory-stats
description: Report the state of the memory system — index counts, strongest lessons, mistakes due for promotion, staleness of the warm tier, and whether the hooks are still firing. Use on "/memory-stats", "how's memory doing", "is the memory system working", or before trusting a memory-derived answer.
allowed-tools: Read, Grep, Glob, Bash
---

# Memory stats

A health report on `.claude/memories/` and its index. Read-only — this skill never writes.

## Run

```bash
py .claude/memory-db/mem.py stats
py .claude/memory-db/mem.py promote-mistakes --threshold 3 --dry-run
py .claude/scripts/audit-memory.py
tail -20 .claude/memories/hook-runs.log
```

## Report

**1. Index** — live lessons, decayed lessons, open vs resolved mistakes, sessions, promotions to
date. A decayed count climbing while the live count is flat means the corpus is aging out faster
than it is being refreshed.

**2. Pending promotions** — mistakes at 3+ retries not yet promoted. Each one is a failure that has
happened three times and still has no written rule. Name them; do not promote silently.

**3. Warm-tier staleness** — from `audit-memory.py`. Anything past its threshold in
`.claude/standards/MEMORY_TIERS.md` §2, and anything over 180 days, which requires re-verification
before it can be acted on at all.

**4. Are the hooks alive?** — `hook-runs.log` is a TSV of `<epoch>\t<hook>`. Report the last run
time **per hook**, and flag any registered hook with no line in the last week.

> This matters more than it looks. A hook that silently stopped firing produces exactly the same
> evidence as a quiet month: an empty log. The fingerprint is the only thing that distinguishes
> them, so a missing one is a finding, not a gap in the data.

**5. Backlog** — undistilled lines in `session-archive/` versus `DR_DISTILL_BACKLOG_LINES` (1500),
and `last_distilled_at` from `.distill-state.json`. `null` means no pass has ever run.

## Interpreting

| Signal | Means |
|---|---|
| `pending_promotion` > 0 for weeks | Nobody is running `/memory-distill`; recurring failures have no rule |
| Every warm file stale | The corpus is describing a system that has moved on — re-verify before acting on any of it |
| A hook has no recent fingerprint | Treat it as broken until proven otherwise; check `.claude/settings.json` registers the event name it expects |
| Backlog over budget, `last_distilled_at` null | The archive is accumulating and nothing has ever promoted it |
| Lessons count drops after a `rebuild` | Headings changed shape in `lessons.md`; the parser keys on `##`/`###` |

Close with the single most useful next action, not a list.
