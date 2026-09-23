#!/bin/bash
# Validate files after write
# Checks: Python syntax, markdown frontmatter requirements

FILE_PATH="$1"

# Validate Python syntax
if [[ "$FILE_PATH" == *.py ]]; then
  PY=""
  for c in py python python3; do
    if command -v "$c" >/dev/null 2>&1 && "$c" -c "" >/dev/null 2>&1; then PY="$c"; break; fi
  done
  # No usable interpreter is not a syntax error in the file being written.
  [ -n "$PY" ] || exit 0
  if ! PYTHONPYCACHEPREFIX="${TMPDIR:-/tmp}/claude-pycache" "$PY" -m py_compile "$FILE_PATH" 2>/dev/null; then
    echo "❌ ERROR: Python file has syntax errors. Fix before continuing."
    exit 1
  fi
fi

# Enforce markdown frontmatter
if [[ "$FILE_PATH" == *.md ]]; then
  # Check if file starts with frontmatter
  if ! head -1 "$FILE_PATH" | grep -q "^---"; then
    # Exception: CLAUDE.md is exempt (it has special format)
    case "$FILE_PATH" in
      *CLAUDE.md|*/.claude/memories/*|*.claude/memories/*) exit 0 ;;
    esac
    if true; then
      echo "⚠️  WARNING: Markdown file missing YAML frontmatter. Add:"
      echo "---"
      echo "type: [document_type]"
      echo "last_verified: $(date +%Y-%m-%d)"
      echo "owner: aroma"
      echo "---"
    fi
  fi
fi

# A SKILL.md with a missing or YAML-unparseable description loads with NO
# description, and Claude selects skills on that field alone - so the skill is
# simply invisible. Four skills sat unusable here for months because nothing
# checked. Advisory only: report it, never block the write.
case "$FILE_PATH" in
  */.claude/skills/*/SKILL.md|*.claude/skills/*/SKILL.md)
    REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    if command -v node >/dev/null 2>&1 && [ -f "$REPO_ROOT/evals/skills/check-one.js" ]; then
      node "$REPO_ROOT/evals/skills/check-one.js" "$FILE_PATH" || true
    fi
    ;;
esac

exit 0
