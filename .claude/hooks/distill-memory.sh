#!/bin/bash
# distill-memory.sh — notice that the episodic backlog has outgrown its budget, and ask for a
# distillation pass. It does no distilling itself: that is an LLM judgement task and lives in the
# /memory-distill skill. Detect, emit a directive, stop.
#
# WHY THIS EXISTS. Rotation keeps active-session.md small by moving dated sections into
# session-archive/. That is ALL it does. Nothing promotes those episodes into the warm files a
# session actually reads to make decisions — so without this, rotation quietly moves months of
# findings out of sight without moving any of it into use. Size management and meaning management
# are different jobs; building only the first one is how a memory system rots while looking tidy.
#
# WHY THE TRIGGER IS THE BACKLOG, NOT THE HOT FILE'S LENGTH. Rotation drains the hot file at every
# session end, so a run of short sessions never leaves a long active-session.md and would never
# trip a length threshold — while still going completely undistilled. The backlog is the thing
# that actually accumulates, so the backlog is what this measures.
#
# ON SessionEnd, NOT Stop: Stop fires at the end of every assistant turn (architecture.md).
#
# SILENT UNLESS IT FIRES. Below threshold this prints nothing at all. A hook that always fires
# teaches the reader to skip hook output, which is the opposite of what a hook is for.

set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_memory-lib.sh"

[ -n "$PY" ] || exit 0

DR_ARCHIVE="$ARCHIVE" \
DR_STATE="$MEM/.distill-state.json" \
DR_BACKLOG="${DR_DISTILL_BACKLOG_LINES:-1500}" \
DR_COOLDOWN="${DR_DISTILL_COOLDOWN_HOURS:-24}" \
"$PY" - <<'PYEOF'
import os, json, re, sys, pathlib
from datetime import datetime, timezone

archive  = pathlib.Path(os.environ["DR_ARCHIVE"])
state_p  = pathlib.Path(os.environ["DR_STATE"])
budget   = int(os.environ["DR_BACKLOG"])
cooldown = float(os.environ["DR_COOLDOWN"])

state = {}
if state_p.exists():
    try:
        state = json.loads(state_p.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        pass

last = state.get("last_distilled_at")
if last:
    try:
        dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
        if (datetime.now(timezone.utc) - dt).total_seconds() < cooldown * 3600:
            sys.exit(0)
    except ValueError:
        pass   # an unparseable date must not suppress the pass forever

DATED = re.compile(r"^(\d{4}-\d{2}-\d{2})")
through = state.get("last_distilled_through_date") or ""

# These three are excluded because they are duplicates BY CONSTRUCTION — counting them would let
# the hook fire on its own artifacts, forever.
pending, total = [], 0
for p in sorted(archive.glob("*.md")):
    if "-pre-compact-" in p.name or "-pre-distill" in p.name:
        continue
    m = DATED.match(p.name)
    if not m or (through and m.group(1) <= through):
        continue
    n = len(p.read_text(encoding="utf-8", errors="replace").splitlines())
    pending.append((m.group(1), n)); total += n

if total <= budget or not pending:
    sys.exit(0)

print("=" * 78)
print("MEMORY DISTILLATION DUE — the episodic backlog has outgrown its budget.")
print("=" * 78)
print()
print(f"  undistilled session-archive/ : {total} lines across {len(pending)} files "
      f"({pending[0][0]} .. {pending[-1][0]})")
print(f"  budget                       : {budget} (DR_DISTILL_BACKLOG_LINES)")
print(f"  last pass                    : {last or 'never'}")
print()
print("Rotation has moved these episodes out of active-session.md, but nothing has promoted them")
print("into the files that shape decisions — so lessons.md / deployment.md / phase-status.md /")
print("pipeline-mechanics.md drift out of date while the findings sit unread.")
print()
print("ACTION: invoke the /memory-distill skill.")
print()
print("  It is lossless by construction: it NEVER deletes or rewrites an archive file, it only")
print("  advances the watermark in .claude/memories/.distill-state.json.")
print()
print("  If you genuinely cannot do it now, say so — do not silently skip it, and do not advance")
print("  the watermark without doing the work.")
print("=" * 78)
PYEOF
exit 0
