#!/usr/bin/env python
"""audit-memory.py - report memory-hygiene problems. READ-ONLY; never deletes anything.

Surfaces:
  1. Oversized files       - a memory file past its line budget (rotation or sharding overdue)
  2. [FILL] placeholders   - archive entries somebody started and never finished
  3. Duplicate snapshots   - redundant pre-compact copies piling up for one day
  4. Stale warm files      - past the threshold in .claude/standards/MEMORY_TIERS.md 2
  5. Silent hooks          - registered but with no fingerprint in hook-runs.log

Exit code is ALWAYS 0. This is advisory, not a gate: a hygiene report that can fail a push is a
report people learn to route around.
"""

import json
import os
import re
import sys
from datetime import date, datetime
from pathlib import Path

REPO = Path(os.environ.get("DR_REPO_ROOT", Path(__file__).resolve().parents[2]))
MEM = REPO / ".claude" / "memories"
ARCHIVE = MEM / "session-archive"

# NOT a number this file gets to pick. One source of truth, read everywhere -- a second copy is a
# bug waiting for a reader to trust the wrong one.
BUDGETS = {
    "active-session.md": int(os.environ.get("DR_ACTIVE_SESSION_BUDGET", "300")),
    # lessons.md and mistakes.md are append-only logs, not topic shards. A higher budget reflects
    # that; they only flag when they grow genuinely unreasonable.
    "lessons.md": 1200,
    "mistakes.md": 1200,
}
DEFAULT_BUDGET = 400

# Mirrors MEMORY_TIERS.md 2. tests/test_memory_system.py fails if these drift apart.
THRESHOLDS = {
    "lessons.md": 14, "deployment.md": 30, "phase-status.md": 30,
    "pipeline-mechanics.md": 30, "product-context.md": 60, "architecture.md": 90,
}

FILL = re.compile(r"(?<!`)\[FILL\]")


def main():
    findings = []

    if not MEM.exists():
        print("audit: .claude/memories/ does not exist")
        return 0

    # 1. size
    for p in sorted(MEM.glob("*.md")):
        if p.name.endswith("-export.md"):
            continue          # generated views; their size is the DB's business
        n = len(p.read_text(encoding="utf-8", errors="replace").splitlines())
        budget = BUDGETS.get(p.name, DEFAULT_BUDGET)
        if n > budget:
            findings.append(f"SIZE      {p.name}: {n} lines (budget {budget})")

    # 2. unfinished entries. Archive snapshots are frozen by design and never size-flagged,
    #    but an unfilled placeholder in one is still a hole in the record.
    for p in sorted(ARCHIVE.glob("*.md")) if ARCHIVE.exists() else []:
        hits = sum(1 for line in p.read_text(encoding="utf-8", errors="replace").splitlines()
                   if FILL.search(line))
        if hits:
            findings.append(f"FILL      session-archive/{p.name}: {hits} unfilled placeholder(s)")

    # 3. duplicate pre-compact snapshots
    if ARCHIVE.exists():
        by_day = {}
        for p in ARCHIVE.glob("*-pre-compact-*.md"):
            by_day.setdefault(p.name[:10], []).append(p.name)
        for day, names in sorted(by_day.items()):
            if len(names) > 3:
                findings.append(f"DUPES     {day}: {len(names)} pre-compact snapshots")

    # 4. staleness, read from frontmatter rather than mtime -- a whitespace fix is not verification
    today = date.today()
    for name, threshold in sorted(THRESHOLDS.items()):
        p = MEM / name
        if not p.exists():
            findings.append(f"MISSING   {name}: expected warm file does not exist")
            continue
        m = re.search(r"^last_verified:\s*(\S+)", p.read_text(encoding="utf-8", errors="replace"), re.M)
        if not m:
            findings.append(f"NOFRONT   {name}: no last_verified in frontmatter")
            continue
        try:
            age = (today - datetime.strptime(m.group(1), "%Y-%m-%d").date()).days
        except ValueError:
            findings.append(f"BADDATE   {name}: last_verified '{m.group(1)}' is not YYYY-MM-DD")
            continue
        if age > 180:
            findings.append(f"STALE!!   {name}: {age}d — re-verify before acting on it (MEMORY_TIERS 2)")
        elif age > threshold:
            findings.append(f"STALE     {name}: {age}d (threshold {threshold}d)")

    # 5. hooks that stopped firing. An empty log is the same evidence as a quiet month, which is
    #    exactly why the fingerprint exists.
    log = MEM / "hook-runs.log"
    settings = REPO / ".claude" / "settings.json"
    if log.exists() and settings.exists():
        seen = {}
        for line in log.read_text(encoding="utf-8", errors="replace").splitlines():
            parts = line.split("\t")
            if len(parts) == 2 and parts[0].isdigit():
                seen[parts[1]] = max(seen.get(parts[1], 0), int(parts[0]))
        blob = settings.read_text(encoding="utf-8")
        registered = set(re.findall(r"hooks/([a-z0-9-]+\.sh)", blob))
        now = datetime.now().timestamp()
        for h in sorted(registered):
            if h in ("block-bad-commands.sh", "guard-file-writes.sh",
                     "validate-after-write.sh", "publish-checkpoints.sh"):
                continue      # pre-date the fingerprint convention
            last = seen.get(h)
            if last is None:
                findings.append(f"SILENT    {h}: registered, never fingerprinted")
            elif (now - last) > 7 * 86400:
                findings.append(f"SILENT    {h}: last fired {int((now - last) / 86400)}d ago")

    # 6. watermark
    state = MEM / ".distill-state.json"
    if state.exists():
        try:
            st = json.loads(state.read_text(encoding="utf-8"))
            if st.get("last_distilled_at") is None and ARCHIVE.exists():
                dated = [p for p in ARCHIVE.glob("*.md")
                         if re.match(r"\d{4}-\d{2}-\d{2}", p.name)
                         and "-pre-compact-" not in p.name and "-pre-distill" not in p.name]
                total = sum(len(p.read_text(encoding="utf-8", errors="replace").splitlines())
                            for p in dated)
                budget = int(os.environ.get("DR_DISTILL_BACKLOG_LINES", "1500"))
                if total > budget:
                    findings.append(f"BACKLOG   {total} undistilled lines (budget {budget}), never distilled")
        except json.JSONDecodeError:
            findings.append("BADSTATE  .distill-state.json is not valid JSON")

    if findings:
        print(f"audit: {len(findings)} finding(s)")
        for f in findings:
            print(f"  {f}")
    else:
        print("audit: memory clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())
