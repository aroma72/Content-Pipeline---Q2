#!/bin/bash
# Pre-push quality validation script
# Runs before committing to catch common mistakes

set -e

echo "🔍 Smoke Test — Pre-Push Quality Gate"
echo ""

PASS=0
FAIL=0
WARN=0

# Counters are incremented with $((X+1)), never ((X++)).
# Under `set -e`, ((X++)) is a landmine: post-increment evaluates to the OLD
# value, so the first increment from 0 returns 0, which bash reads as a failed
# command and kills the script. That bug meant this gate silently exited during
# test 1 and tests 2-8 had never run.

# ============================================================================
# Interpreter resolution
# ============================================================================
# This gate used to hardcode `python3`, which does not exist on the Windows dev
# machine (Python installs as python.exe and is often not on PATH at all). Every
# .py file was therefore reported as a syntax error. Same failure family as the
# hardcoded paths that left the health-check scheduler dead for three months:
# probe for the real interpreter instead of assuming a name.
PY=""
for cand in python3 python; do
  if command -v "$cand" >/dev/null 2>&1 && "$cand" -c "" >/dev/null 2>&1; then
    PY="$cand"; break
  fi
done
if [ -z "$PY" ] && command -v py >/dev/null 2>&1 && py -3 -c "" >/dev/null 2>&1; then
  PY="py -3"
fi
if [ -z "$PY" ] && [ -n "$LOCALAPPDATA" ]; then
  # Windows installs per-user and does not add Python to PATH unless the
  # installer checkbox was ticked, so absence from PATH is not absence.
  for cand in "$LOCALAPPDATA/Programs/Python"/Python3*/python.exe; do
    if [ -x "$cand" ]; then PY="$cand"; break; fi
  done
fi

# ============================================================================
# Test 1: Python Syntax Validation
# ============================================================================
echo "📝 Test 1: Python Syntax..."

if [ -z "$PY" ]; then
  echo "  ⚠️  No Python interpreter found — skipping syntax check"
  echo "     (tried python3, python, py -3, %LOCALAPPDATA%\\Programs\\Python)"
  WARN=$((WARN+1))
else
  PY_FAIL=0
  # while-read, not for-in-$(find): the project path contains a space
  # ("Content Queen") and word-splitting a find result mangles such paths.
  # venv/ and site-packages are excluded — third-party sources are not ours to
  # validate, and scanning them made this test take minutes.
  while IFS= read -r py_file; do
    if ! $PY -m py_compile "$py_file" >/dev/null 2>&1; then
      echo "  ❌ Syntax error: $py_file"
      PY_FAIL=$((PY_FAIL+1))
    fi
  done < <(find . -name "*.py" -type f \
      ! -path "./node_modules/*" ! -path "./.git/*" \
      ! -path "./venv/*" ! -path "./.venv/*" ! -path "*/env/*" \
      ! -path "*/site-packages/*" ! -path "*/__pycache__/*")

  if [ "$PY_FAIL" -eq 0 ]; then
    echo "  ✅ All Python files valid"
    PASS=$((PASS+1))
  else
    echo "  ❌ $PY_FAIL file(s) with syntax errors"
    FAIL=$((FAIL+PY_FAIL))
  fi
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
    WARN=$((WARN+1))
  else
    echo "  ✅ CLAUDE.md within limit ($LINES lines)"
    PASS=$((PASS+1))
  fi
else
  echo "  ❌ CLAUDE.md not found"
  FAIL=$((FAIL+1))
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

# Per-test counter. The old code tested the GLOBAL $FAIL here, so one failure in
# test 1 suppressed this test's own verdict and made it look like it had not run.
MISSING_CRITICAL=0
for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ❌ Missing: $file"
    MISSING_CRITICAL=$((MISSING_CRITICAL+1))
  fi
done

if [ "$MISSING_CRITICAL" -eq 0 ]; then
  echo "  ✅ All critical files present"
  PASS=$((PASS+1))
else
  FAIL=$((FAIL+MISSING_CRITICAL))
fi

# ============================================================================
# Test 4: No Sensitive Files in Git
# ============================================================================
echo "🔐 Test 4: Sensitive Files Check..."

SENSITIVE_FOUND=0

# Vendored and generated trees are not ours and are full of innocent names that
# contain these words -- node_modules alone contributes toPropertyKey.js and a
# Chrome profile contributes TrustTokenKeyCommitments/keys.json. Matching them
# made this test fail on every single run, and a check that always fails is a
# check nobody reads.
TRACKED=$(git ls-files | grep -vE "(^|/)(node_modules|\.chrome-profile|venv|\.venv)/")

# A real secret file, not a committed template. .env.example exists precisely so
# the real .env never has to be tracked, so flagging it is backwards.
REAL_ENV=$(echo "$TRACKED" | grep -E "(^|/)\.env($|\.)" | grep -vE "\.(example|sample|template|dist)$" || true)
if [ -n "$REAL_ENV" ]; then
  echo "  ❌ Real .env file tracked by git:"
  echo "$REAL_ENV" | sed 's/^/       /'
  SENSITIVE_FOUND=$((SENSITIVE_FOUND+1))
fi

# Match credential-bearing FILENAMES, not any path containing the word "key".
CREDS=$(echo "$TRACKED" | grep -iE "(^|/)([^/]*(credentials?|secrets?)[^/]*\.(json|ya?ml|txt)|id_rsa|id_ed25519|service-account.*\.json|token\.json|.*\.(pem|pfx|p12|keystore))$" || true)
if [ -n "$CREDS" ]; then
  echo "  ❌ Credential-looking file tracked by git:"
  echo "$CREDS" | sed 's/^/       /'
  SENSITIVE_FOUND=$((SENSITIVE_FOUND+1))
fi

if [ "$SENSITIVE_FOUND" -eq 0 ]; then
  echo "  ✅ No sensitive files tracked"
  PASS=$((PASS+1))
else
  FAIL=$((FAIL+SENSITIVE_FOUND))
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
      PART_NUM=$(basename "$vo_file" | grep -oE '[0-9]+' | head -1)

      if [ -f "drawing-room-video/drawing-room-remotion/src/Root.tsx" ]; then
        ACTUAL_FRAMES=$(grep "AutonomousSystemsPart$PART_NUM" \
          "drawing-room-video/drawing-room-remotion/src/Root.tsx" | \
          grep "durationInFrames" | grep -oE '[0-9]+' | head -1)

        if [ ! -z "$ACTUAL_FRAMES" ] && [ ! -z "$EXPECTED_FRAMES" ]; then
          DIFF=$((ACTUAL_FRAMES - ${EXPECTED_FRAMES%.*}))
          if [ $DIFF -lt -30 ] || [ $DIFF -gt 30 ]; then
            echo "  ⚠️  Part $PART_NUM frame mismatch: expected ~$EXPECTED_FRAMES, found $ACTUAL_FRAMES (diff: $DIFF)"
            WARN=$((WARN+1))
          fi
        fi
      fi
    fi
  done

  echo "  ✅ Frame count check complete"
  PASS=$((PASS+1))
else
  echo "  ⏭️  No voiceovers directory — skipped"
fi

# ============================================================================
# Test 6: Markdown Frontmatter
# ============================================================================
echo "📋 Test 6: Markdown Frontmatter..."

MISSING_FRONTMATTER=0
CHECKED_MD=0

while IFS= read -r md_file; do
  CHECKED_MD=$((CHECKED_MD+1))
  if ! head -1 "$md_file" | grep -q "^---"; then
    echo "  ⚠️  Missing frontmatter: $md_file"
    MISSING_FRONTMATTER=$((MISSING_FRONTMATTER+1))
  fi
done < <(find . -name "*.md" -type f ! -path "./.git/*" ! -path "./node_modules/*" \
    ! -path "./updated/*" ! -path "./venv/*" ! -name "CLAUDE.md" | head -10)

# The 10-file cap is inherited behaviour. Say so, rather than letting a partial
# scan read as a clean bill of health for the whole repo.
if [ "$MISSING_FRONTMATTER" -eq 0 ]; then
  echo "  ✅ Frontmatter present (sampled $CHECKED_MD files)"
  PASS=$((PASS+1))
else
  echo "  ⚠️  $MISSING_FRONTMATTER of $CHECKED_MD sampled files missing frontmatter"
  WARN=$((WARN+1))
fi

# ============================================================================
# Test 7: Git Status (uncommitted changes)
# ============================================================================
echo "🔄 Test 7: Git Status..."

if git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "  ✅ Working directory clean"
  PASS=$((PASS+1))
else
  UNSTAGED=$(git diff --name-only | wc -l)
  echo "  ⚠️  $UNSTAGED unstaged changes (remember to commit before pushing)"
  WARN=$((WARN+1))
fi

# ============================================================================
# Test 8: Submodule Status
# ============================================================================
echo "📦 Test 8: Submodule Status..."

if [ -d "drawing-room-video/drawing-room-remotion" ]; then
  # Subshell, so a failure cannot leave the script in the wrong directory and
  # make every later relative path resolve somewhere unexpected.
  if (cd drawing-room-video/drawing-room-remotion && git status -s 2>/dev/null | grep -q "^ M"); then
    echo "  ⚠️  Submodule has unstaged changes (commit submodule FIRST)"
    WARN=$((WARN+1))
  else
    echo "  ✅ Submodule clean"
    PASS=$((PASS+1))
  fi
else
  echo "  ❌ Submodule directory not found"
  FAIL=$((FAIL+1))
fi

# ============================================================================
# Results Summary
# ============================================================================
# Names that resolve to nothing.
#
# `node --check` validates syntax and says nothing about whether a name exists,
# so `staleVo(beats, dir)` -- with `beats` bound nowhere in that function --
# passed every check and shipped. It throws only when control reaches the line,
# which in the pipeline is after the art has been paid for. Twice in one day.
# ============================================================================
echo ""
echo "🔎 Test: Undefined names (eslint no-undef)..."
if [ -d node_modules/eslint ]; then
  if npx --no-install eslint orchestrator server scripts > /tmp/eslint-out.txt 2>&1; then
    echo "  ✅ PASS: no undefined names or dead bindings"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL: eslint found problems"
    tail -20 /tmp/eslint-out.txt | sed "s/^/     /"
    FAIL=$((FAIL + 1))
  fi
else
  echo "  ⚠️  WARN: eslint not installed — run: npm install"
  WARN=$((WARN + 1))
fi

# ============================================================================
# The manifest is what tells the LMS a catalogue row is safe to link to. It is a
# BUILD artefact -- .dockerignore strips .git, so the running service cannot work
# it out for itself. When it goes stale, finished and committed videos report
# `durability: "ephemeral"` and the LMS refuses to bind a lesson to them. Six
# videos were unlinkable this way before anyone noticed.
# ============================================================================
echo ""
echo "🔎 Test: Catalogue manifest is current..."
if node scripts/build-catalogue-manifest.js --check > /tmp/manifest-out.txt 2>&1; then
  echo "  ✅ PASS: $(tail -1 /tmp/manifest-out.txt)"
  PASS=$((PASS + 1))
else
  echo "  ❌ FAIL: the manifest is stale — run: node scripts/build-catalogue-manifest.js"
  tail -5 /tmp/manifest-out.txt | sed "s/^/     /"
  FAIL=$((FAIL + 1))
fi

# ============================================================================
# A credential in a document is compromised the moment it is committed, and it
# survives in git history and in any PDF already rendered from it.
# ============================================================================
echo ""
echo "🔎 Test: No API credential committed in the handoff documents..."
if grep -rlE "cq_[A-Za-z0-9_-]{24,}" prototypes/*.html > /tmp/cred-out.txt 2>&1; then
  echo "  ❌ FAIL: a live-looking credential is in a document:"
  sed "s/^/     /" /tmp/cred-out.txt
  FAIL=$((FAIL + 1))
else
  echo "  ✅ PASS: no credential in prototypes/*.html"
  PASS=$((PASS + 1))
fi

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
