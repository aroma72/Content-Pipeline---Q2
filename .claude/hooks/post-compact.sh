#!/bin/bash
# post-compact.sh — put working memory back after compaction.
#
# Compaction is exactly when a session loses the thread. Plain stdout is injected as context on
# this event, so re-reading the top of the hot file and the two warm files most likely to be
# needed costs nothing but a few hundred tokens and restores orientation immediately.
#
# head -60 per file, deliberately: this fires on a context that has just been squeezed, so it must
# not be the thing that fills it up again.

set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_memory-lib.sh"

echo "CONTEXT RESTORED AFTER COMPACTION — working memory re-injected:"
echo ""
for f in active-session.md pipeline-mechanics.md deployment.md; do
  [ -f "$MEM/$f" ] || continue
  echo "━━━ $f ━━━"
  head -60 "$MEM/$f"
  echo ""
done
echo "END OF RESTORED CONTEXT. Continue the session using the above as working memory;"
echo "read .claude/memories/MEMORY-INDEX.md if you need more."
exit 0
