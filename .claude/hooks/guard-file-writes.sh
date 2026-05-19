#!/bin/bash
# Guard against oversized writes to critical files
# Prevents: CLAUDE.md exceeding 150 lines

FILE_PATH="$1"
CONTENT="$2"

# Check if this is CLAUDE.md
if [[ "$FILE_PATH" == *"CLAUDE.md" ]]; then
  LINE_COUNT=$(echo "$CONTENT" | wc -l)
  if [ "$LINE_COUNT" -gt 150 ]; then
    echo "❌ BLOCKED: CLAUDE.md exceeds 150 lines (found: $LINE_COUNT). This is an L1 router — route additional content to L2/L3 docs in docs/ and .claude/standards/."
    exit 1
  fi
fi

# Check if this is a new markdown file that needs routing
if [[ "$FILE_PATH" == *.md ]] && [[ ! "$FILE_PATH" == *"docs/"* ]] && [[ ! "$FILE_PATH" == *".claude/"* ]]; then
  # Warn if file is getting large (but don't block)
  LINE_COUNT=$(echo "$CONTENT" | wc -l)
  if [ "$LINE_COUNT" -gt 200 ]; then
    echo "⚠️  WARNING: Markdown file exceeds 200 lines. Consider if this should be split into L2/L3 docs."
  fi
fi

exit 0
