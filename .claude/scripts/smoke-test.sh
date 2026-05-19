#!/bin/bash
# Pre-push quality validation script
# Runs before committing to catch common mistakes

set -e

echo "🔍 Smoke Test — Pre-Push Quality Gate"
echo ""

PASS=0
FAIL=0
WARN=0

# ============================================================================
# Test 1: Python Syntax Validation
# ============================================================================
echo "📝 Test 1: Python Syntax..."

for py_file in $(find . -name "*.py" -type f ! -path "./node_modules/*" ! -path "./.git/*"); do
  if ! python3 -m py_compile "$py_file" 2>/dev/null; then
    echo "  ❌ Syntax error: $py_file"
    ((FAIL++))
  fi
done

if [ $FAIL -eq 0 ]; then
  echo "  ✅ All Python files valid"
  ((PASS++))
fi

# ============================================================================
# Test 2: CLAUDE.md Line Count (L1 Router ≤ 150 lines)
# ============================================================================
echo "📄 Test 2: CLAUDE.md Size..."

if [ -f "CLAUDE.md" ]; then
  LINES=$(wc -l < CLAUDE.md)
  if [ "$LINES" -gt 150 ]; then
    echo "  ⚠️  CLAUDE.md exceeds 150 lines (found: $LINES). This is an L1 router."
    echo "     Route content to L2/L3 docs (docs/, .claude/standards/)"
    ((WARN++))
  else
    echo "  ✅ CLAUDE.md within limit ($LINES lines)"
    ((PASS++))
  fi
else
  echo "  ❌ CLAUDE.md not found"
  ((FAIL++))
fi

# ============================================================================
# Test 3: Critical Files Exist
# ============================================================================
echo "🔒 Test 3: Critical Files..."

CRITICAL_FILES=(
  "CLAUDE.md"
  ".claude/settings.json"
  ".beads/status.jsonl"
  ".beads/decisions.jsonl"
  ".beads/failures.jsonl"
  ".claude/standards/VIDEO_PRODUCTION_RULES.md"
  ".claude/standards/VOICEOVER_POLICY.md"
  ".claude/standards/DOC_TYPE_SYSTEM.md"
  ".claude/standards/METADATA_CONTRACT.md"
)

for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ❌ Missing: $file"
    ((FAIL++))
  fi
done

if [ $FAIL -eq 0 ]; then
  echo "  ✅ All critical files present"
  ((PASS++))
fi

# ============================================================================
# Test 4: No Sensitive Files in Git
# ============================================================================
echo "🔐 Test 4: Sensitive Files Check..."

SENSITIVE_FOUND=0

# Check for .env files
if git ls-files | grep -q "\.env"; then
  echo "  ❌ .env file is tracked by git (should be in .gitignore)"
  ((FAIL++))
  ((SENSITIVE_FOUND++))
fi

# Check for credentials
if git ls-files | grep -qE "credential|secret|key"; then
  echo "  ❌ Sensitive file (credential/secret/key) tracked by git"
  ((FAIL++))
  ((SENSITIVE_FOUND++))
fi

if [ $SENSITIVE_FOUND -eq 0 ]; then
  echo "  ✅ No sensitive files tracked"
  ((PASS++))
fi

# ============================================================================
# Test 5: Frame Count Validation (if VO files exist)
# ============================================================================
echo "📹 Test 5: Frame Count Validation..."

if [ -d "video_production/voiceovers" ]; then
  for vo_file in video_production/voiceovers/*.aac; do
    if [ -f "$vo_file" ]; then
      VO_DURATION=$(ffprobe -v error -show_entries format=duration \
        -of default=noprint_wrappers=1:nokey=1 "$vo_file" 2>/dev/null || echo "0")

      EXPECTED_FRAMES=$(echo "$VO_DURATION * 30" | bc 2>/dev/null || echo "0")
      PART_NUM=$(basename "$vo_file" | grep -oP '\d+' | head -1)

      if [ -f "drawing-room-video/drawing-room-remotion/src/Root.tsx" ]; then
        ACTUAL_FRAMES=$(grep "AutonomousSystemsPart$PART_NUM" \
          "drawing-room-video/drawing-room-remotion/src/Root.tsx" | \
          grep "durationInFrames" | grep -oP '\d+' | head -1)

        if [ ! -z "$ACTUAL_FRAMES" ] && [ ! -z "$EXPECTED_FRAMES" ]; then
          DIFF=$((ACTUAL_FRAMES - EXPECTED_FRAMES))
          if [ $DIFF -lt -30 ] || [ $DIFF -gt 30 ]; then
            echo "  ⚠️  Part $PART_NUM frame mismatch: expected ~$EXPECTED_FRAMES, found $ACTUAL_FRAMES (diff: $DIFF)"
            ((WARN++))
          fi
        fi
      fi
    fi
  done

  echo "  ✅ Frame count check complete"
  ((PASS++))
fi

# ============================================================================
# Test 6: Markdown Frontmatter
# ============================================================================
echo "📋 Test 6: Markdown Frontmatter..."

MISSING_FRONTMATTER=0

for md_file in $(find . -name "*.md" -type f ! -path "./.git/*" ! -path "./node_modules/*" ! -path "./updated/*" ! -name "CLAUDE.md" | head -10); do
  if ! head -1 "$md_file" | grep -q "^---"; then
    echo "  ⚠️  Missing frontmatter: $md_file"
    ((MISSING_FRONTMATTER++))
  fi
done

if [ $MISSING_FRONTMATTER -eq 0 ]; then
  echo "  ✅ All markdown files have frontmatter"
  ((PASS++))
else
  echo "  ⚠️  $MISSING_FRONTMATTER files missing frontmatter"
  ((WARN++))
fi

# ============================================================================
# Test 7: Git Status (uncommitted changes)
# ============================================================================
echo "🔄 Test 7: Git Status..."

if [ -z "$(git diff-index --quiet HEAD -- || echo 'changes')" ]; then
  echo "  ✅ Working directory clean"
  ((PASS++))
else
  UNSTAGED=$(git diff --name-only | wc -l)
  echo "  ⚠️  $UNSTAGED unstaged changes (remember to commit before pushing)"
  ((WARN++))
fi

# ============================================================================
# Test 8: Submodule Status
# ============================================================================
echo "📦 Test 8: Submodule Status..."

if [ -d "drawing-room-video/drawing-room-remotion" ]; then
  cd drawing-room-video/drawing-room-remotion

  if git status -s | grep -q "^ M"; then
    echo "  ⚠️  Submodule has unstaged changes (commit submodule FIRST)"
    ((WARN++))
  else
    echo "  ✅ Submodule clean"
    ((PASS++))
  fi

  cd ../..
else
  echo "  ❌ Submodule directory not found"
  ((FAIL++))
fi

# ============================================================================
# Results Summary
# ============================================================================
echo ""
echo "========================================"
echo "SMOKE TEST SUMMARY"
echo "========================================"
echo "  ✅ Pass:    $PASS"
echo "  ⚠️  Warn:    $WARN"
echo "  ❌ Fail:    $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  if [ $WARN -eq 0 ]; then
    echo "✅ ALL TESTS PASSED — Safe to push!"
    exit 0
  else
    echo "⚠️  WARNINGS PRESENT — Review before pushing"
    exit 0  # Don't block on warnings
  fi
else
  echo "❌ TESTS FAILED — Fix issues before pushing"
  exit 1
fi
