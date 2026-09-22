#!/bin/bash
# Session start hook: Inject open work from beads
# Displays open tasks and reminds about critical rules

BEADS_STATUS=".beads/status.jsonl"
CLAUDE_MD="CLAUDE.md"

echo "🔧 Drawing Room — Session Started"
echo ""

# Show open beads if they exist
if [ -f "$BEADS_STATUS" ]; then
  OPEN_COUNT=$(grep -c '"status": "open"' "$BEADS_STATUS" 2>/dev/null | head -1); OPEN_COUNT=${OPEN_COUNT:-0}
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

# ── Memory briefing ──────────────────────────────────────────────────────────────
#
# Plain stdout is injected as context on SessionStart, so this needs no JSON — and must not
# emit any. The echoes above would invalidate a JSON object the moment one was printed, and a
# partially-valid object degrades to raw text in the model's context. See architecture.md.
#
# THE RULE: a warm file is pasted in BECAUSE IT IS STALE, not because it looks relevant.
# Fresh files cost one line. Stale ones get 80 lines and an instruction.

. "$(dirname "${BASH_SOURCE[0]}")/_memory-lib.sh"

if [ -f "$ACTIVE" ]; then
  A_LINES=$(wc -l < "$ACTIVE" | tr -d ' ')
  A_AGE=$(( ( $(date +%s) - $(stat -c %Y "$ACTIVE" 2>/dev/null || echo "$(date +%s)") ) / 86400 ))
  echo "🧠 Memory: active-session.md — ${A_LINES}/${BUDGET_LINES} lines, updated ${A_AGE}d ago"
fi

# Per-file thresholds live in .claude/standards/MEMORY_TIERS.md §2. Kept in sync by
# tests/test_memory_system.py.
STALE_FILES=()
FRESH=0
NOW=$(date +%s)
for entry in "lessons.md:14" "deployment.md:30" "phase-status.md:30" \
             "pipeline-mechanics.md:30" "product-context.md:60" "architecture.md:90"; do
  fname="${entry%%:*}"; threshold="${entry##*:}"
  fpath="$MEM/$fname"
  if [ ! -f "$fpath" ]; then STALE_FILES+=("$fname"); continue; fi
  # Read last_verified from frontmatter, not mtime: a whitespace fix must not count as verifying.
  lv=$(grep -m1 '^last_verified:' "$fpath" 2>/dev/null | sed 's/.*:[[:space:]]*//')
  if [ -n "$lv" ] && lv_epoch=$(date -d "$lv" +%s 2>/dev/null); then
    age=$(( (NOW - lv_epoch) / 86400 ))
  else
    age=9999
  fi
  if [ "$age" -gt "$threshold" ]; then STALE_FILES+=("$fname"); else FRESH=$((FRESH + 1)); fi
done

# Report the exception, not the rule. A hook that always fires teaches the reader to skip it.
[ "$FRESH" -gt 0 ] && echo "   ${FRESH} warm file(s) fresh"

if [ ${#STALE_FILES[@]} -gt 0 ]; then
  echo ""
  echo "STALE MEMORY — these are past their freshness threshold. Read them, and update any claim"
  echo "you find to be out of date before this session ends:"
  echo ""
  shown=0
  for fname in "${STALE_FILES[@]}"; do
    if [ "$shown" -lt "${DR_STALE_INJECT_FILES:-2}" ]; then
      echo "━━━ $fname ━━━"
      if [ -f "$MEM/$fname" ]; then
        head -"${DR_STALE_INJECT_LINES:-40}" "$MEM/$fname"
      else
        echo "[FILE MISSING — CREATE IT]"
      fi
      echo ""
      shown=$((shown + 1))
    else
      echo "━━━ $fname — also stale, not shown. Read it before relying on it. ━━━"
    fi
  done
  echo "END OF STALE FILES."
fi

# Semantic recall: seed FTS with whatever the last session said to do next.
if [ -n "$PY" ] && [ -f "$MEM_PY" ] && [ -f "$ACTIVE" ]; then
  Q=$(grep -A3 '^## NEXT_STEPS' "$ACTIVE" 2>/dev/null | grep '^- ' | head -1 | sed 's/^- //' | cut -c1-70)
  if [ -n "$Q" ]; then
    HITS=$("$PY" "$MEM_PY" search --query "$Q" --table lessons --limit 3 2>/dev/null)
    if [ -n "$HITS" ]; then
      echo ""
      echo "RELEVANT LESSONS (matched on: \"$Q\"):"
      echo "$HITS"
    fi
  fi
fi
echo ""

exit 0
