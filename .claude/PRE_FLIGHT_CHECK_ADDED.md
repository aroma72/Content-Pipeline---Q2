# Pre-Flight Check System — Added to VideoProductionOrchestrator

**Date**: 2026-05-21  
**File**: `video_production_orchestrator_remotion.py`  
**Purpose**: Validate critical preconditions BEFORE ANY agent starts  
**Status**: ✅ Integrated and ready

---

## What Was Added

### 1. New Method: `pre_flight_check()`

**Location**: Lines 58-130 (new method added before `run()`)

**Validates Four Critical Conditions:**

```
1. Script file exists and contains at least one ## Scene block
2. VideoProductionConfig has all required fields: script_path, production_id, voice_id, fps
3. Production output directory exists and is writable
4. agent_memory.json exists and is readable (valid JSON)
```

**Behavior:**
- If ALL checks pass: Returns `{"status": "passed"}` with logged checkmarks ✓
- If ANY check fails: Raises `GateFailedError` with detailed error message
- Logs diagnostic info (file paths, field names, error reasons) for troubleshooting

---

### 2. Integration into `run()` Method

**Location**: Lines 132-141 (new pre-flight call at start of `run()`)

**Code:**
```python
def run(self) -> dict:
    """Execute the 5-stage pipeline with review checkpoints."""
    # CRITICAL: Run pre-flight check BEFORE anything else
    try:
        self.pre_flight_check()
    except GateFailedError as e:
        return {
            "status": "halted",
            "production_id": self.production_id,
            "error": str(e),
            "stage": "pre_flight_check"
        }

    log_info("VideoProductionOrchestratorRemotionEdition", f"Starting {self.production_id}")
```

**Flow:**
1. `run()` is called
2. `pre_flight_check()` executes IMMEDIATELY
3. If it fails → return halted status (never reach Stage 1)
4. If it passes → continue to Stage 1 (VOICEOVER)

---

## Check Details

### Check 1: Script File Validation

**Tests:**
- File exists at `config.script_path`
- File is a regular file (not a directory)
- Content is readable (UTF-8 encoding)
- Contains at least one `## Scene ` block

**Errors Returned:**
- `SCRIPT_FILE_MISSING`: Path doesn't exist
- `SCRIPT_NOT_FILE`: Path is a directory
- `NO_SCENES_IN_SCRIPT`: File has no scene blocks
- `SCRIPT_READ_ERROR`: Encoding or I/O error

**Success Log:**
```
✓ Script file valid: 6 scenes found
```

---

### Check 2: Config Fields Validation

**Required Fields:**
- `script_path` (string, path to script)
- `production_id` (string, unique production identifier)
- `voice_id` (string, voice model ID)
- `fps` (integer, frames per second, e.g., 30)

**Errors Returned:**
- `CONFIG_MISSING_FIELDS`: Lists specific missing fields

**Success Log:**
```
✓ Config valid: production_id=prod-2026-05-21, fps=30
```

---

### Check 3: Output Directory Validation

**Tests:**
- Directory `VIDEO_PRODUCTION_DIR/{production_id}/` exists
- Directory is writable (creates and deletes test file)

**Errors Returned:**
- `OUTPUT_DIR_NOT_WRITABLE`: Permission denied
- `OUTPUT_DIR_ERROR`: Mkdir or write failed

**Success Log:**
```
✓ Output directory writable: /path/to/video_production/{production_id}
```

---

### Check 4: Agent Memory Validation

**Tests:**
- File `agent_memory.json` exists in current directory
- Content is valid JSON

**Errors Returned:**
- `AGENT_MEMORY_MISSING`: File not found
- `AGENT_MEMORY_INVALID_JSON`: Malformed JSON
- `AGENT_MEMORY_ERROR`: Read/parse error

**Success Log:**
```
✓ Agent memory valid: /current/path/agent_memory.json
```

---

## Error Display Format

If any check fails, output is formatted as:

```
╔════════════════════════════════════════════════════════════════════════════╗
║                         PRE-FLIGHT CHECK FAILED                            ║
║                   Cannot proceed to Stage 1 (VOICEOVER)                     ║
╚════════════════════════════════════════════════════════════════════════════╝

The following preconditions are missing or invalid:

  ✗ SCRIPT_FILE_MISSING: '/path/to/script.md' does not exist
  ✗ CONFIG_MISSING_FIELDS: voice_id, fps
  ✗ AGENT_MEMORY_INVALID_JSON: Expecting value: line 1 column 1 (char 0)

ACTION REQUIRED:
  1. Fix the issues listed above
  2. Verify all files exist and are readable/writable
  3. Restart the orchestrator

Production: prod-2026-05-21
Script: /path/to/script.md
Output Dir: /video_production/prod-2026-05-21
```

---

## Success Display Format

If all checks pass, output is:

```
════════════════════════════════════════════════════════════════════════════
✓ PRE-FLIGHT CHECK PASSED — All preconditions valid
════════════════════════════════════════════════════════════════════════════
```

---

## Return Values

### On Success
```python
{
    "status": "halted",
    "production_id": "prod-2026-05-21",
    "error": "<detailed error message>",
    "stage": "pre_flight_check"
}
```
(Returned from `run()` if pre-flight fails)

### On Failure
```python
{
    "status": "passed"
}
```
(Returned from `pre_flight_check()` if all checks pass)

---

## Sequence Diagram

```
User calls: orchestrator.run()
    ↓
run() calls: pre_flight_check()
    ↓
    ├─ Check 1: Script file exists + has scenes?
    │   ✓ YES → log success
    │   ✗ NO → collect error
    │
    ├─ Check 2: Config has required fields?
    │   ✓ YES → log success
    │   ✗ NO → collect error
    │
    ├─ Check 3: Output dir exists + writable?
    │   ✓ YES → log success
    │   ✗ NO → collect error
    │
    └─ Check 4: agent_memory.json valid?
        ✓ YES → log success
        ✗ NO → collect error
    
    ↓
    Any errors? 
    ├─ YES: Raise GateFailedError (halt with message)
    │   ↓
    │   run() catches exception
    │   ↓
    │   returns {"status": "halted", ...}
    │   ↓
    │   END (never reach Stage 1)
    │
    └─ NO: Return {"status": "passed"}
       ↓
       run() continues
       ↓
       Proceed to Stage 1 (VOICEOVER)
```

---

## Test Example

**Test Case: Missing Script File**

```python
config = VideoProductionConfig(
    production_id="test-prod",
    script_path="/nonexistent/script.md",  # ← MISSING
    voice_id="EXAVITQu4vr4xnSDxMaL",
    fps=30
)

orchestrator = VideoProductionOrchestratorRemotionEdition(config)
result = orchestrator.run()

# Result:
# {
#     "status": "halted",
#     "production_id": "test-prod",
#     "error": "╔═══...✗ SCRIPT_FILE_MISSING: '...' does not exist...",
#     "stage": "pre_flight_check"
# }
```

---

## Design Principles

1. **Fail Fast**: Check everything BEFORE starting any agent
2. **Clear Diagnostics**: Name exactly what's wrong (SCRIPT_FILE_MISSING, not "File error")
3. **No Silent Failures**: Explicit error messages with file paths and field names
4. **Actionable**: Error message tells user what to do ("Fix the issues listed above")
5. **Safe**: Creates/deletes test file to verify writability (atomic)
6. **Readable**: Unicode dividers (═, ╔, ╚) for visual separation in logs

---

## Lines Changed

```
agents/video_production_orchestrator_remotion.py:

  58-130: NEW METHOD pre_flight_check()
          - 4 validation checks
          - Detailed error collection
          - Formatted error output
          - Success logging

  132-141: MODIFIED run() method
          - Added pre-flight call at START
          - Exception handling for halted status
          - Clear control flow
```

---

**Status**: ✅ Ready for production use.
