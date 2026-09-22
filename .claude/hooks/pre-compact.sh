#!/bin/bash
# pre-compact.sh — snapshot the hot file verbatim before context is compacted.
#
# Compaction is the one moment where the session's working memory is summarised by something that
# is allowed to drop detail. This takes a full copy first, so nothing compaction discards is gone.

set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_memory-lib.sh"

[ -f "$ACTIVE" ] || exit 0

TS_MIN="$(date +%H-%M)"
# Two compactions in the same minute would otherwise write two identical copies, and those copies
# then inflate the distillation backlog that triggers on archive size.
if ls "$ARCHIVE/${TODAY}-pre-compact-${TS_MIN}"*.md >/dev/null 2>&1; then
  exit 0
fi

DEST="$ARCHIVE/${TODAY}-pre-compact-$(date +%H-%M-%S).md"
{
  printf '# Pre-compact snapshot — %s %s\n\n' "$TODAY" "$(date +%H:%M:%S)"
  printf 'Verbatim copy of active-session.md taken before compaction. Episodic source, not a\n'
  printf 'summary — excluded from the distillation backlog by construction.\n\n---\n\n'
  cat "$ACTIVE"
} > "$DEST" 2>/dev/null

echo "Memory: snapshotted active-session.md -> session-archive/$(basename "$DEST")"
exit 0
