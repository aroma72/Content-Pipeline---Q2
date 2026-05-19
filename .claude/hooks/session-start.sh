#!/bin/bash
# Session start hook: Inject open work from beads
# Displays open tasks and reminds about critical rules

BEADS_STATUS=".beads/status.jsonl"
CLAUDE_MD="CLAUDE.md"

echo "🔧 Drawing Room — Session Started"
echo ""

# Show open beads if they exist
if [ -f "$BEADS_STATUS" ]; then
  OPEN_COUNT=$(grep -c '"status": "open"' "$BEADS_STATUS" 2>/dev/null || echo "0")
  if [ "$OPEN_COUNT" -gt 0 ]; then
    echo "📋 Open Tasks ($OPEN_COUNT):"
    grep '"status": "open"' "$BEADS_STATUS" | sed 's/.*"task": "\([^"]*\)".*/  - \1/' | head -5
    if [ "$OPEN_COUNT" -gt 5 ]; then
      echo "  ... and $(($OPEN_COUNT - 5)) more. See .beads/status.jsonl for full list."
    fi
    echo ""
  fi
fi

# Warn if CLAUDE.md is stale
if [ -f "$CLAUDE_MD" ]; then
  LAST_UPDATED=$(grep "last_verified:" "$CLAUDE_MD" | head -1 | sed 's/.*: //')
  DAYS_OLD=$(( ($(date +%s) - $(date -d "$LAST_UPDATED" +%s)) / 86400 ))
  if [ "$DAYS_OLD" -gt 7 ]; then
    echo "⚠️  CLAUDE.md was last verified $DAYS_OLD days ago. Consider refreshing it."
    echo ""
  fi
fi

# Display critical rules reminder
echo "🚫 CRITICAL RULES (Never Break These):"
echo "  • Never use ElevenLabs without explicit permission"
echo "  • Never regenerate VO — extract and edit visuals to match"
echo "  • Always commit submodule FIRST, then main repo pointer"
echo "  • Frame count = VO_seconds × 30fps (max +30 buffer)"
echo "  • SVG viewBox minimum 850px height for 7-node radials"
echo ""

exit 0
