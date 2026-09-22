#!/bin/bash
# Session end hook: Remind about open work and unstaged changes

BEADS_STATUS=".beads/status.jsonl"

echo ""
echo "🔚 Drawing Room — Session Ending"
echo ""

# Show any remaining open beads
if [ -f "$BEADS_STATUS" ]; then
  OPEN_COUNT=$(grep -c '"status": "open"' "$BEADS_STATUS" 2>/dev/null | head -1); OPEN_COUNT=${OPEN_COUNT:-0}
  if [ "$OPEN_COUNT" -gt 0 ]; then
    echo "📋 Reminder: $OPEN_COUNT open task(s) remain in .beads/status.jsonl"
    echo "   Review and mark complete or defer before next session."
    echo ""
  fi
fi

# Check for unstaged git changes
UNSTAGED=$(git diff --name-only -- . ':!.claude/memories' ':!.claude/memory-db' 2>/dev/null | wc -l)
if [ "$UNSTAGED" -gt 0 ]; then
  echo "⚠️  $UNSTAGED unstaged file(s). Consider committing before ending session."
  echo ""
fi

# Check for untracked files in sensitive directories
UNTRACKED_ENV=$(git ls-files --others --exclude-standard | grep -E "\.env|secrets|credentials" | wc -l)
if [ "$UNTRACKED_ENV" -gt 0 ]; then
  echo "🔐 Sensitive files detected in untracked files. Ensure they're in .gitignore."
  echo ""
fi

# ── Memory: close the loop ───────────────────────────────────────────────────────
. "$(dirname "${BASH_SOURCE[0]}")/_memory-lib.sh"

# 1. Record the session in the cold tier, if anything happened worth recording.
if [ -f "$ACTIVE" ]; then
  ARCHIVE_FILE="$(dr_ensure_archive)"
  A_LINES=$(wc -l < "$ACTIVE" | tr -d ' ')
  if ! grep -q "SESSION END: $TODAY" "$ARCHIVE_FILE" 2>/dev/null; then
    {
      printf '\n## Session %s %s\n\n' "$TODAY" "$(date +%H:%M)"
      printf '**active-session.md lines at close:** %s\n\n' "$A_LINES"
      printf '<!-- SESSION END: %s %s -->\n' "$TODAY" "$(date +%H:%M)"
    } >> "$ARCHIVE_FILE" 2>/dev/null
  fi
fi

# 2. Refresh the index from the markdown that is now on disk.
if [ -n "$PY" ] && [ -f "$MEM_PY" ]; then
  "$PY" "$MEM_PY" export-md >/dev/null 2>&1 || true
fi

# 3. Rotate the hot file back under budget. Runs BEFORE the backlog check, so the check sees
#    everything this session produced.
bash "$(dirname "${BASH_SOURCE[0]}")/rotate-active-session.sh" 2>/dev/null || true

# 4. Ask for a distillation pass if the backlog has outgrown its budget. Silent otherwise.
bash "$(dirname "${BASH_SOURCE[0]}")/distill-memory.sh" 2>/dev/null || true

echo "✅ Session end. Safe to exit."

exit 0
