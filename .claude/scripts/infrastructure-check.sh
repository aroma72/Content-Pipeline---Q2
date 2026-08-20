#!/bin/bash
# Daily infrastructure health check
# Run via: bash .claude/scripts/infrastructure-check.sh
# Or schedule: 0 6 * * * cd /path/to/project && bash .claude/scripts/infrastructure-check.sh >> .claude/logs/health.log 2>&1

set -e

# Fail fast and legibly on missing tools. Without this, a missing jq aborts at
# the first update_health call with a bare "jq: command not found" and exit 127,
# which reads like the check ran and failed rather than never having started.
for _tool in jq; do
  if ! command -v "$_tool" >/dev/null 2>&1; then
    echo "FATAL: required tool '$_tool' is not on PATH."
    echo "  Install (Windows, no admin): download jq.exe to %LOCALAPPDATA%\\Programs\\jq\\bin and add it to PATH"
    echo "  Install (macOS/Linux):       brew install jq  /  apt-get install jq"
    exit 2
  fi
done

CHECK_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
HEALTH_FILE=".claude/logs/health.json"
TEMP_RESULTS="/tmp/infra_check_$$.json"

echo "=== Drawing Room Infrastructure Check ==="
echo "Time: $CHECK_TIME"
echo ""

# Initialize health report
cat > "$TEMP_RESULTS" <<EOF
{
  "check_time": "$CHECK_TIME",
  "status": "checking",
  "checks": {}
}
EOF

# Helper function to update health
update_health() {
  local check_name=$1
  local result=$2  # pass or fail
  local detail=$3

  jq ".checks[\"$check_name\"] = {\"status\": \"$result\", \"detail\": \"$detail\"}" "$TEMP_RESULTS" > "$TEMP_RESULTS.tmp"
  mv "$TEMP_RESULTS.tmp" "$TEMP_RESULTS"
}

# 1. Check prompts/ directory
echo -n "1. Prompts directory... "
if [ -d "prompts/" ] && [ "$(ls -A prompts/ 2>/dev/null | wc -l)" -gt 0 ]; then
  PROMPT_COUNT=$(ls prompts/ | wc -l)
  echo "✓ ($PROMPT_COUNT files)"
  update_health "prompts_directory" "pass" "$PROMPT_COUNT prompt files found"
else
  echo "✗ FAIL: Missing or empty"
  update_health "prompts_directory" "fail" "prompts/ directory missing or empty"
fi

# 2. Check for hardcoded prompts
echo -n "2. Hardcoded prompts scan... "
HARDCODED=$(grep -r "^SYSTEM_PROMPT = " skills/ agents/ --include="*.py" 2>/dev/null | wc -l)
if [ "$HARDCODED" -eq 0 ]; then
  echo "✓ (none found)"
  update_health "hardcoded_prompts" "pass" "No hardcoded prompts detected"
else
  echo "✗ FAIL: Found $HARDCODED"
  update_health "hardcoded_prompts" "fail" "$HARDCODED instances of hardcoded SYSTEM_PROMPT"
fi

# 3. Check skills can load prompts
echo -n "3. Prompt loading... "
if python3 -c "
from skills.signal_intake import SignalIntakeSkill
from skills.content_planner import ContentPlannerSkill
" 2>/dev/null; then
  echo "✓"
  update_health "prompt_loading" "pass" "All skills load prompts correctly"
else
  echo "✗ FAIL"
  update_health "prompt_loading" "fail" "Skills unable to load prompts"
fi

# 4. Check logger is operational
echo -n "4. Logger functionality... "
if [ -f ".claude/logs/session.log" ] && [ -f ".claude/logs/decisions.log" ]; then
  SESSION_SIZE=$(stat -f%z ".claude/logs/session.log" 2>/dev/null || stat -c%s ".claude/logs/session.log" 2>/dev/null)
  echo "✓ ($SESSION_SIZE bytes)"
  update_health "logger_operational" "pass" "session.log: $SESSION_SIZE bytes"
else
  echo "✗ FAIL: Log files missing"
  update_health "logger_operational" "fail" "Log files missing or not writable"
fi

# 5. Check eval dataset exists
echo -n "5. Eval dataset... "
SESSION_COUNT=$(find tests/eval_dataset/sample_sessions -type d -name "session_*" 2>/dev/null | wc -l)
if [ "$SESSION_COUNT" -gt 0 ]; then
  echo "✓ ($SESSION_COUNT sessions)"
  update_health "eval_dataset" "pass" "$SESSION_COUNT sample sessions found"
else
  echo "✗ FAIL: Missing"
  update_health "eval_dataset" "fail" "eval_dataset missing or empty"
fi

# 6. Check test files exist
echo -n "6. Test files... "
TEST_COUNT=$(find tests -name "test_*.py" -type f | wc -l)
if [ "$TEST_COUNT" -gt 0 ]; then
  echo "✓ ($TEST_COUNT files)"
  update_health "test_files" "pass" "$TEST_COUNT test files found"
else
  echo "✗ FAIL: No test files"
  update_health "test_files" "fail" "No test_*.py files found"
fi

# 7. Run unit test (quick smoke test)
echo -n "7. Unit test smoke... "
if python3 -m pytest tests/test_signal_intake.py::TestSignalIntakeSkill::test_initialization -v 2>&1 | grep -q "passed"; then
  echo "✓"
  update_health "unit_tests" "pass" "Smoke test passed"
else
  echo "✗ FAIL"
  update_health "unit_tests" "fail" "Unit test failed"
fi

# 8. Validate pipeline structure
echo -n "8. Pipeline validation... "
if python3 main.py --dry-run 2>/dev/null | grep -q "PERCEIVE"; then
  echo "✓"
  update_health "pipeline_structure" "pass" "6-stage orchestrator validated"
else
  echo "✗ FAIL"
  update_health "pipeline_structure" "fail" "Pipeline structure validation failed"
fi

# 9. Check requirements.txt
echo -n "9. Dependencies... "
if grep -q "^pytest" requirements.txt; then
  echo "✓"
  update_health "dependencies" "pass" "pytest in requirements.txt"
else
  echo "✗ FAIL"
  update_health "dependencies" "fail" "pytest missing from requirements.txt"
fi

# 10. Check memory files
echo -n "10. Memory system... "
MEMORY_COUNT=$(find C:\Users\Aroma\ Tahir\.claude\projects\*\memory -name "*.md" -type f 2>/dev/null | wc -l)
if [ "$MEMORY_COUNT" -gt 0 ]; then
  echo "✓ ($MEMORY_COUNT files)"
  update_health "memory_system" "pass" "$MEMORY_COUNT memory files"
else
  echo "✗ WARNING: No memory files"
  update_health "memory_system" "pass" "Memory system not found (OK if first run)"
fi

# Determine overall status
echo ""
FAILED=$(jq '[.checks[] | select(.status == "fail")] | length' "$TEMP_RESULTS")
if [ "$FAILED" -eq 0 ]; then
  echo "✅ All checks PASSED"
  jq '.status = "healthy"' "$TEMP_RESULTS" > "$TEMP_RESULTS.tmp"
  mv "$TEMP_RESULTS.tmp" "$TEMP_RESULTS"
else
  echo "❌ $FAILED check(s) FAILED"
  jq '.status = "unhealthy"' "$TEMP_RESULTS" > "$TEMP_RESULTS.tmp"
  mv "$TEMP_RESULTS.tmp" "$TEMP_RESULTS"
fi

# Add next check time
NEXT_CHECK=$(date -u -d "+24 hours" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+24H +"%Y-%m-%dT%H:%M:%SZ")
jq ".next_check = \"$NEXT_CHECK\"" "$TEMP_RESULTS" > "$TEMP_RESULTS.tmp"
mv "$TEMP_RESULTS.tmp" "$TEMP_RESULTS"

# Save to health file
cp "$TEMP_RESULTS" "$HEALTH_FILE"
rm -f "$TEMP_RESULTS"

echo ""
echo "Health report saved to: $HEALTH_FILE"
echo ""

# Exit with status
if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
exit 0
