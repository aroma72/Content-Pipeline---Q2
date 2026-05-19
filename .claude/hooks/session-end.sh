#!/bin/bash
# Session end hook: Remind about open work and unstaged changes

BEADS_STATUS=".beads/status.jsonl"

echo ""
echo "🔚 Drawing Room — Session Ending"
echo ""

# Show any remaining open beads
if [ -f "$BEADS_STATUS" ]; then
  OPEN_COUNT=$(grep -c '"status": "open"' "$BEADS_STATUS" 2>/dev/null || echo "0")
  if [ "$OPEN_COUNT" -gt 0 ]; then
    echo "📋 Reminder: $OPEN_COUNT open task(s) remain in .beads/status.jsonl"
    echo "   Review and mark complete or defer before next session."
    echo ""
  fi
fi

# Check for unstaged git changes
UNSTAGED=$(git diff --name-only 2>/dev/null | wc -l)
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

echo "✅ Session end. Safe to exit."

exit 0
