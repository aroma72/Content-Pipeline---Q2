#!/bin/bash
# Validate files after write
# Checks: Python syntax, markdown frontmatter requirements

FILE_PATH="$1"

# Validate Python syntax
if [[ "$FILE_PATH" == *.py ]]; then
  if ! python3 -m py_compile "$FILE_PATH" 2>/dev/null; then
    echo "❌ ERROR: Python file has syntax errors. Fix before continuing."
    exit 1
  fi
fi

# Enforce markdown frontmatter
if [[ "$FILE_PATH" == *.md ]]; then
  # Check if file starts with frontmatter
  if ! head -1 "$FILE_PATH" | grep -q "^---"; then
    # Exception: CLAUDE.md is exempt (it has special format)
    if [[ ! "$FILE_PATH" == *"CLAUDE.md" ]]; then
      echo "⚠️  WARNING: Markdown file missing YAML frontmatter. Add:"
      echo "---"
      echo "type: [document_type]"
      echo "last_verified: $(date +%Y-%m-%d)"
      echo "owner: aroma"
      echo "---"
    fi
  fi
fi

exit 0
