---
type: reference
last_verified: 2026-05-19
owner: aroma
---

# Beads — Work Tracking System

Beads are an append-only JSONL work tracking system designed to survive context resets and provide persistent institutional memory.

## What Are Beads?

Instead of in-memory task lists that disappear when context resets, beads live in `.beads/` as append-only JSON lines files. Each line is a complete record (task, decision, or failure). Never delete lines — only append.

## The Three Bead Types

### 1. **status.jsonl** — Active Tasks

Tracks all work: open, in-progress, or completed. Each line is a task record.

**Schema:**
```json
{
  "timestamp": "2026-05-19T10:30:00Z",
  "task_id": "autonomous-text-fix-part2",
  "task": "Fix SVG text cutoff in Autonomous Session Part 2",
  "status": "completed",
  "owner": "aroma",
  "context": "Scene 2 (7 Dimensions radial diagram) viewBox was 700px, expanded to 850px",
  "effort_estimate_hours": 0.5,
  "actual_hours": 0.25
}
```

**Status values:** `pending`, `in_progress`, `completed`, `blocked`

### 2. **decisions.jsonl** — Architectural Decisions

Captures decisions made (why + date). Helps future conversations understand the "why" behind current architecture.

**Schema:**
```json
{
  "timestamp": "2026-03-15T09:00:00Z",
  "decision_id": "use-remotion",
  "decision": "Use Remotion instead of Runway + JSON2Video",
  "rationale": "Open-source, full control, saves $180-350/mo, React-based for flexibility",
  "decision_by": "aroma",
  "context": "Video production infrastructure decision"
}
```

### 3. **failures.jsonl** — Known Failures + Fixes

Documents failure patterns and their fixes. Used for prevention: when similar patterns emerge, know what failed before and how to fix it.

**Schema:**
```json
{
  "timestamp": "2026-05-19T08:00:00Z",
  "failure_id": "svg-text-cutoff",
  "pattern": "SVG text cutoff at diagram edges",
  "root_cause": "viewBox height insufficient for radial layouts (700px < needed 850px)",
  "fix_applied": "Expand SVG viewBox to minimum 850px height for 7-node radials; labels below circles need 60px clearance",
  "prevention": "Always use viewBox 850px+ for radial diagrams; validate text positioning before render",
  "file_affected": "drawing-room-remotion/src/AutonomousSessionPart2.tsx"
}
```

## Usage Pattern

**Adding a task:**
```bash
echo '{"timestamp":"2026-05-19T10:30:00Z","task_id":"fix-part3-blank-slides","task":"Trim blank slides from Part 3","status":"in_progress","owner":"aroma"}' >> .beads/status.jsonl
```

**Marking complete:**
```bash
echo '{"timestamp":"2026-05-19T11:00:00Z","task_id":"fix-part3-blank-slides","status":"completed","actual_hours":0.5}' >> .beads/status.jsonl
```

**Recording a decision:**
```bash
echo '{"timestamp":"2026-05-19T09:00:00Z","decision":"Extract VO instead of regenerating","rationale":"Prevents desync, saves credits"}' >> .beads/decisions.jsonl
```

## Why Append-Only?

- **Transparent:** Full history visible (why was task moved from pending → blocked → in_progress?)
- **Crash-proof:** No partial writes or lock contention
- **Auditable:** Can answer "when did we decide this?" and "who decided it?"
- **Survives context resets:** Beads are on disk; Claude context resets don't touch them

## Querying Beads

**All open tasks:**
```bash
grep '"status": "open"' .beads/status.jsonl | jq .task
```

**All decisions:**
```bash
cat .beads/decisions.jsonl | jq .decision
```

**All known failures:**
```bash
cat .beads/failures.jsonl | jq '.pattern + " → " + .fix_applied'
```

## Important Rules

1. ✅ **Always append, never edit or delete** — Maintain full history
2. ✅ **Include timestamps** — All records should have ISO 8601 timestamps
3. ✅ **Use consistent IDs** — task_id, decision_id, failure_id uniquely identify records
4. ✅ **One record per line** — Valid JSONL (newline-delimited JSON)
5. ✅ **Fill context** — Explain WHY for decisions and failures

---

*Last verified: 2026-05-19*
