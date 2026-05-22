# Safety System End-to-End Test Guide

**Purpose**: Verify that the orchestrator's lock-and-lock system fires correctly when given deliberately broken input.

**Test File**: `test_safety_system.py`

---

## Quick Start

### Run the Test
```bash
cd "c:\Users\Aroma Tahir\Downloads\Content Queen"
python test_safety_system.py
```

**Expected Result**: All 4 tests PASS with final verdict showing "ALL TESTS PASSED"

---

## What the Test Does

### Setup Phase
Before testing, the script:
1. Creates `/video_production/test_broken/script.md` with **NO `## Scene` blocks**
2. Creates `/video_production/test_broken/config.json` pointing to the broken script
3. Initializes VideoProductionConfig with valid defaults

### Test 1: Dry-Run Against Broken Script

**What it does**:
- Instantiates orchestrator with `dry_run=True`
- Calls `orchestrator.run()` against the broken config

**Expected output**:
```
════════════════════════════════════════════════════════════════════════════
  TEST 1: DRY-RUN AGAINST BROKEN SCRIPT
════════════════════════════════════════════════════════════════════════════

Production ID: test_broken
Script path: video_production/test_broken/script.md
Script exists: True

Running orchestrator with --dry-run flag...

════════════════════════════════════════════════════════════════════════════
DRY-RUN MODE — NO API CALLS, NO CHARGES
════════════════════════════════════════════════════════════════════════════

[INFO] VideoProductionOrchestratorRemotionEdition: PRE-FLIGHT CHECK STARTING

[ERROR] VideoProductionOrchestratorRemotionEdition: Script contains no ## Scene blocks
  Script: video_production/test_broken/script.md
  Found: 0 scenes
  Required: at least 1 scene per video (1 videos requested)

[INFO] VideoProductionOrchestratorRemotionEdition: ════════════════════════════════════════════════════════════════════════════
[ERROR] VideoProductionOrchestratorRemotionEdition: PRE-FLIGHT CHECK FAILED
  Cannot proceed to Stage 1 (VOICEOVER)

  The following preconditions are missing or invalid:
    ✗ SCENE_BLOCKS_MISSING: script.md contains no ## Scene N.M blocks (0 scenes parsed)

ACTION REQUIRED:
  1. Fix the issues listed above
  2. Verify all files exist and are readable/writable
  3. Restart the orchestrator

Production: test_broken
Script: video_production/test_broken/script.md
Output Dir: c:\Users\Aroma Tahir\Downloads\Content Queen\video_production\test_broken

[ORCHESTRATOR OUTPUT ABOVE]

Result status: halted
Result production_id: test_broken
Error: ╔════════════════════════════════════════════════════════════════════════════╗...
```

**Pass Criteria**:
- ✓ Status is "halted"
- ✓ Error explicitly mentions "Scene blocks"
- ✓ Pre-flight check ran BEFORE any agents

---

### Test 2: Verify state.json Content

**What it does**:
- Reads `video_production/test_broken/state.json`
- Validates structure and failure metadata

**Expected state.json content**:
```json
{
  "production_id": "test_broken",
  "current_stage": "halted",
  "created_at": "2026-05-21T14:32:15.123456",
  "updated_at": "2026-05-21T14:32:15.123456",
  "output_contract_failures": {},
  "review_decisions": {},
  "quality_reports": [],
  "assembled_videos": [],
  "post_production_results": [],
  "distribution_urls": {},
  "voiceovers": [],
  "stage_voiceover_completed": false,
  "stage_remotion_render_completed": false,
  "stage_post_production_completed": false,
  "stage_qa_completed": false,
  "stage_distribution_completed": false
}
```

**Expected test output**:
```
════════════════════════════════════════════════════════════════════════════
  TEST 2: VERIFY state.json CONTENT
════════════════════════════════════════════════════════════════════════════

✓ state.json exists at c:\Users\Aroma Tahir\Downloads\Content Queen\video_production\test_broken\state.json

State content:
{
  "production_id": "test_broken",
  "current_stage": "halted",
  ...
}

State validation:
  ✓ current_stage == 'halted'
  ✓ has 'created_at' timestamp
  ✓ has 'updated_at' timestamp
  ✓ output_contract_failures empty
  ✓ no stages completed
```

**Pass Criteria**:
- ✓ File exists at expected path
- ✓ `current_stage` is "halted" (not "in_progress", not "failed")
- ✓ Timestamps recorded
- ✓ No stages marked complete
- ✓ No contract failures (halt was pre-flight, not mid-pipeline)

---

### Test 3: Verify Error Message Specificity

**What it does**:
- Checks that error message explicitly names the problem
- Not a generic "validation failed" message

**Expected test output**:
```
════════════════════════════════════════════════════════════════════════════
  TEST 3: VERIFY ERROR MESSAGE SPECIFICITY
════════════════════════════════════════════════════════════════════════════

Error message validation:
  ✓ mentions 'Scene'
  ✓ mentions 'script'
  ✓ NOT generic 'validation failed'
```

**Pass Criteria**:
- ✓ Error mentions "Scene" explicitly
- ✓ Error mentions "script" explicitly
- ✓ Error is NOT just generic "validation failed" text

---

### Test 4: Attempted Re-Run Without Fix

**What it does**:
- Creates a NEW orchestrator instance
- Tries to run against same broken config again
- Verifies it refuses to proceed (state.json says "halted")

**Expected output**:
```
════════════════════════════════════════════════════════════════════════════
  TEST 4: ATTEMPT RE-RUN WITHOUT FIX
════════════════════════════════════════════════════════════════════════════

Attempting to re-run orchestrator with same broken config...

[INFO] VideoProductionOrchestratorRemotionEdition: PRE-FLIGHT CHECK STARTING
[ERROR] VideoProductionOrchestratorRemotionEdition: Script contains no ## Scene blocks
  ... (same error as Test 1)

Re-run result status: halted
✓ Orchestrator correctly HALTED on second run
  Error: ╔════════════════════════════════════════════════════════════════════════════╗...
```

**Pass Criteria**:
- ✓ Status is "halted" again (not "complete", not "in_progress")
- ✓ Same pre-flight error is raised
- ✓ Refuses to proceed without explicit unlock

---

### Cleanup Phase

**What it does**:
- Removes `/video_production/test_broken/` directory entirely
- Cleans up all test artifacts

**Expected output**:
```
════════════════════════════════════════════════════════════════════════════
  CLEANUP
════════════════════════════════════════════════════════════════════════════

✓ Deleted test directory: video_production/test_broken
```

---

## Final Verdict

**If all 4 tests pass**, you should see:
```
════════════════════════════════════════════════════════════════════════════
  FINAL VERDICT
════════════════════════════════════════════════════════════════════════════

✓ PASS: TEST 1: Dry-run execution
✓ PASS: TEST 2: state.json structure
✓ PASS: TEST 3: Error message specificity
✓ PASS: TEST 4: Re-run refuses to proceed

════════════════════════════════════════════════════════════════════════════
✓ ALL TESTS PASSED — Safety system is working correctly
════════════════════════════════════════════════════════════════════════════
```

**If any test fails**, it will show:
```
════════════════════════════════════════════════════════════════════════════
❌ SOME TESTS FAILED — Safety system needs fixes
════════════════════════════════════════════════════════════════════════════
```

---

## What Each Test Validates

| Test | Validates | Critical For |
|------|-----------|-------------|
| TEST 1 | Pre-flight check fires BEFORE agents run | Safety (prevent bad input from reaching expensive stages) |
| TEST 2 | state.json properly records HALTED status with metadata | Auditability (state must reflect actual pipeline status) |
| TEST 3 | Error messages are explicit, not generic | Debuggability (users must understand what failed and why) |
| TEST 4 | Orchestrator refuses to resume without explicit unlock | Safety (prevent auto-recovery when input is broken) |

---

## Debugging if Tests Fail

### Test 1 fails (status not halted)
- **Check**: Does pre_flight_check() exist and run before agents?
- **Look for**: `log_info("...PRE-FLIGHT CHECK")` in logs
- **Verify**: `_stage_voiceover()` is NOT called if pre-flight fails

### Test 2 fails (state.json missing fields)
- **Check**: Is state.json being written by _save_state()?
- **Look for**: `state_path = VIDEO_PRODUCTION_DIR / production_id / "state.json"`
- **Verify**: All required fields exist in VideoProductionState schema

### Test 3 fails (error message too generic)
- **Check**: Error text in state.json or exception message
- **Look for**: Message should say "Scene blocks" or "Scene N.M", not just "validation failed"
- **Fix**: Update error message in pre_flight_check() method

### Test 4 fails (re-run doesn't halt)
- **Check**: Is state.json being read on second run?
- **Look for**: Logic that checks if `current_stage == "halted"` and refuses to proceed
- **Verify**: No auto-resume logic exists (user must explicitly unlock)

---

## Expected Exit Codes

| Scenario | Exit Code |
|----------|-----------|
| All tests pass | 0 |
| Any test fails | 1 |
| Fatal exception | 1 |

---

## Running the Test in CI/CD

You can add this to your CI pipeline:
```bash
python test_safety_system.py
if [ $? -ne 0 ]; then
  echo "Safety system test failed!"
  exit 1
fi
```

---

**Status**: Ready to run. Verify all 4 checks pass before considering safety system complete.
