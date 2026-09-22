#!/bin/bash
# rotate-active-session.sh — keep active-session.md inside its size budget.
#
# THE PROBLEM THIS SOLVES. The hot file is the first thing every session reads to orient itself.
# Left alone it grows without limit, and in the system this was ported from it reached 4,667 lines
# / 514KB — at which point it exceeded the file-read limit outright. The file whose entire job is
# to orient a session could no longer be read by one.
#
# HOW IT ROTATES. Whole dated `## YYYY-MM-DD` sections, oldest first, are MOVED into
# session-archive/<date>.md until the file is under budget. Never a partial section, never a
# rewrite in place, and never the newest section.
#
# WHY COPY-THEN-TRUNCATE RATHER THAN mv. On NTFS, `mv tmp target` fails with EPERM when another
# process holds the target open — and another Claude session routinely does. Truncating in place
# keeps the inode, so no rename can fail. Combined with the mkdir lock in _memory-lib.sh, a
# concurrent append cannot be silently dropped.
#
# Idempotent: under budget means exit 0 with no writes. Dry-run with --dry-run.

set -uo pipefail
# shellcheck source=_memory-lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/_memory-lib.sh"

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

[ -f "$ACTIVE" ] || exit 0
[ -n "$PY" ] || { echo "rotate: no working python found — skipping" >&2; exit 0; }

LINES=$(wc -l < "$ACTIVE" | tr -d ' ')
[ "$LINES" -le "$BUDGET_LINES" ] && exit 0

dr_lock || { echo "rotate: another session holds the lock — skipping this pass" >&2; exit 0; }
trap dr_unlock EXIT

DR_ACTIVE="$ACTIVE" DR_ARCHIVE="$ARCHIVE" DR_BUDGET="$BUDGET_LINES" DR_DRY="$DRY_RUN" \
"$PY" - <<'PYEOF'
import os, re, pathlib, shutil, sys

active  = pathlib.Path(os.environ["DR_ACTIVE"])
archive = pathlib.Path(os.environ["DR_ARCHIVE"])
budget  = int(os.environ["DR_BUDGET"])
dry     = os.environ["DR_DRY"] == "1"

lines = active.read_text(encoding="utf-8", errors="replace").splitlines(keepends=True)
DATED = re.compile(r"^##\s+(\d{4}-\d{2}-\d{2})")
heads = [i for i, ln in enumerate(lines) if DATED.match(ln)]

if not heads:
    # Guessing at a boundary would split a section in half. Better to stay over budget and say so.
    print("active-session.md is over budget but has NO dated '## YYYY-MM-DD' sections to rotate "
          "— leaving it alone rather than guessing at a cut point", file=sys.stderr)
    sys.exit(0)

bounds = [(s, heads[i + 1] if i + 1 < len(heads) else len(lines)) for i, s in enumerate(heads)]

POINTER = 1          # each rotation leaves a one-line breadcrumb behind
moved, keep = [], list(lines)
removed = 0

for start, end in bounds[:-1]:          # never the newest section
    if len(lines) - removed + POINTER <= budget:
        break
    moved.append((DATED.match(lines[start]).group(1), lines[start:end]))
    removed += end - start

if not moved:
    sys.exit(0)

if dry:
    for date, chunk in moved:
        print(f"would move {len(chunk)} lines dated {date} -> session-archive/{date}.md")
    sys.exit(0)

# Append to the archive FIRST. If this fails we have changed nothing.
for date, chunk in moved:
    dest = archive / f"{date}.md"
    if not dest.exists():
        dest.write_text(f"# Session Archive — {date}\n\n", encoding="utf-8")
    with dest.open("a", encoding="utf-8") as fh:
        fh.write("\n<!-- rotated out of active-session.md by rotate-active-session.sh -->\n\n")
        fh.writelines(chunk)

# Only now remove them from the hot file, truncating in place so the inode survives.
cut = {i for start, end in bounds[:len(moved)] for i in range(start, end)}
first = min(cut)
survivors = [ln for i, ln in enumerate(keep) if i not in cut]
dates = ", ".join(d for d, _ in moved)
survivors.insert(first, f"<!-- {dates} rotated to .claude/memories/session-archive/ -->\n")

backup = active.with_suffix(".md.tmp")
shutil.copyfile(active, backup)
try:
    with active.open("w", encoding="utf-8") as fh:
        fh.writelines(survivors)
    backup.unlink()
except Exception:
    shutil.copyfile(backup, active)     # put it back; the archive copy is harmless duplication
    raise

print(f"rotated {removed} lines ({dates}) -> session-archive/; "
      f"active-session.md now {len(survivors)} lines")
PYEOF
