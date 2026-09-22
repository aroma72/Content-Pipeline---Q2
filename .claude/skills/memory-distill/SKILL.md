---
name: memory-distill
description: Promote the undistilled session-archive backlog into the warm memory files (lessons.md, deployment.md, pipeline-mechanics.md, phase-status.md, product-context.md, architecture.md), then advance the watermark. Use when asked to "distill memory", "consolidate memory", "update lessons from the archive", "drain the archive", when the distill-memory.sh hook says MEMORY DISTILLATION DUE, or on "/memory-distill".
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# Memory distillation

Cold → warm. The archive records what *happened*; the warm files record what is *true*. This pass
moves the second out of the first.

Rotation already keeps `active-session.md` small by moving dated sections into `session-archive/`.
That is all it does. Without this pass, months of findings sit in the archive while the files a
session actually reads to make decisions drift out of date — tidy, and useless.

---

## The one rule that matters

**Lossless by construction, not by review.** This pass **never deletes or rewrites a
`session-archive/` file.** It reads them and advances a watermark. If a distillation turns out to
be wrong, misleading or over-compressed, the episodic source is still there verbatim and can be
re-read. Every other rule below follows from this one.

## Blast radius

| May write | Must **never** touch |
|---|---|
| `.claude/memories/*.md` — except the two `-export` files | `.claude/memories/session-archive/**` — append-only episodic source |
| `.claude/memories/.distill-state.json` — the watermark | `.claude/standards/**`, `CLAUDE.md` — human-owned |
| | `lessons-export.md`, `mistakes-export.md` — **generated** by `mem.py export-md`; any hand edit is destroyed on its next run |
| | `mistakes.md` — a fixed-format machine log. A narrative mistake is a `lessons.md` anti-pattern, not a row here |
| | `.beads/*.jsonl` — read-only from here |

Anything outside the left column is a **proposed diff you print for a human to merge**. Do not
write it.

---

## Procedure

### Step 0 — idempotency guard

Read `.claude/memories/.distill-state.json`. If `last_distilled_through_date` already covers every
dated file in the backlog, report `deduped: already-distilled` and **stop**. Write nothing.

### Step 1 — read the backlog, and dedupe it

Backlog = `session-archive/*.md` whose leading `YYYY-MM-DD` is **newer** than
`last_distilled_through_date`, **excluding** `*-pre-compact-*` and `*-pre-distill*`. Those are
duplicates by construction — counting them would make the pass fire on its own output.

Also read `.beads/failures.jsonl` for the window, but only rows that either carry a `failure_id`
(curated) or have an `itemId` **not** matching `^(test|testing)/`. 317 of its 345 rows are test
fixtures; distilling those would poison the warm tier with invented failures.

**Dedupe on the text of what was done, not on the timestamp.** One day's file routinely holds the
same session re-recorded under several timestamps.

### Step 2 — route each item to exactly one destination

| Destination | What belongs there |
|---|---|
| `lessons.md` | Durable rules, patterns, anti-patterns — anything phrased as "next time, do X". Append as a numbered `### ` entry with `**Added:**`, `**Applies to:**` and, where it can be stated, `**Invalidate if:**` |
| `deployment.md` | Measured platform facts: Railway limits, timings, service state, env vars, config hazards |
| `pipeline-mechanics.md` | How the explainer pipeline behaves: beats, art, TTS, cutout, compile, bumpers, the checkpoint contract |
| `phase-status.md` | Build progress; what shipped and what did not |
| `product-context.md` | Scope, ownership, success metrics, LMS integration decisions |
| `architecture.md` | Structure: orchestrator stages, skills, agents, schemas, the hook contract |

An item with no destination means the map is wrong. **Say so — do not force it.**

### Step 3 — write semantically, never by silent rewrite

- **Append**, with a date.
- To supersede an existing claim, mark the old one `DEPRECATED as of <date> — <reason>` and put the replacement beside it. Treat it like a migration.
- **Never** overwrite a prior claim in place, and **never** merge two conflicting claims into one hedged sentence. A hedge destroys the information that they disagreed.
- Keep the honest negatives. *"The trigger is still unidentified"* is a finding; smoothing it into *"the cause was X"* is how a plausible story becomes a fact nobody re-checks.

### Step 4 — contradictions stop the pass

Rank authority:

1. **Evidence** — running code, a failing test, a live probe.
2. **A snapshot at write time** — an append-only log's field froze when it was written.
3. **Hypothesis** — a memory file, a plan, a doc comment.

The default outcome of a conflict is **a question, not a change**.

### Step 5 — close the loop

1. Bump `last_verified` to today on **every** file you wrote, and update the staleness table in `MEMORY-INDEX.md` to match.
2. Write the watermark to `.distill-state.json`: `last_distilled_at`, `last_distilled_through_date`, `files_distilled[]`, `wrote[]`, `verdict`.
3. Log the verdict: `{read, distilled, superseded, proposed, conflicts_raised}`.
4. Run `py .claude/memory-db/mem.py rebuild` so the index reflects the new warm content.
5. If you could not finish, **say so and do not advance the watermark.** A watermark moved past work that was not done is worse than no watermark, because it makes the backlog invisible.

---

## Verification

- `git status` shows `session-archive/**` **unmodified**.
- Every claim written to a warm file is greppable in its archive source.
- `py .claude/scripts/audit-memory.py` reports no new size flags.
- Re-running this skill immediately reports `deduped: already-distilled` and writes nothing.
