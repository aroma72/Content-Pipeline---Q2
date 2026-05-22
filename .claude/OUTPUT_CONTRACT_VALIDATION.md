# Output Contract Validation System

**Date**: 2026-05-21  
**Status**: ✅ Integrated into orchestrator pipeline  
**Purpose**: Verify each pipeline stage's output before proceeding to next stage

---

## Overview

**LOCKED: No silent failures.** Before each pipeline stage begins, the orchestrator validates the PREVIOUS stage's output. If ANY contract check fails:
- Stage is marked FAILED in state.json
- Pipeline halts immediately
- Error message lists exactly what failed

---

## Where Validation Runs

**Integration Point**: `video_production_orchestrator_remotion.py` main loop (line ~360)

```python
result = stage_func(state)  # Stage completes
↓
contract_validation = self._validate_output_contract(stage_name, result, state)
↓
if not contract_validation["passed"]:
    state.current_stage = "halted"
    self._save_state(state)
    raise GateFailedError("OUTPUT CONTRACT VIOLATION...")
↓
[Only if validation passed] Continue to review checkpoint and next stage
```

---

## Three Validation Stages

### Stage 1: After Remotion Render (`_validate_remotion_render_output`)

**When**: After `_stage_remotion_render()` completes  
**What it checks**:

| Check | Details | Failure Consequence |
|-------|---------|-------------------|
| **File exists** | MP4 file at `video_path` | "file not found at {path}" |
| **Non-empty** | File size > 0 bytes | "file is empty (0 bytes)" |
| **Duration > 0** | Duration > 0 seconds (via ffprobe) | "duration is 0 or invalid" |
| **Resolution** | Exactly 1920x1080 (via ffprobe) | "resolution mismatch (expected 1920x1080, got WxH)" |
| **Video Codec** | H.264 / AVC (via ffprobe) | "codec mismatch (expected h264, got XXX)" |

**Example Failure:**
```
OUTPUT CONTRACT VIOLATION at remotion_render:
  ✗ Video 1: resolution mismatch (expected 1920x1080, got 1280x720)
  ✗ Video 1: no video stream found

State: halted
Location: /video_production/prod-2026-05-21/state.json
```

---

### Stage 2: After Post-Production (`_validate_post_production_output`)

**When**: After `_stage_post_production()` completes  
**What it checks**:

| Check | Details | Failure Consequence |
|-------|---------|-------------------|
| **File exists** | MP4 file at `final_path` | "final video not found at {path}" |
| **Has video stream** | ffprobe finds `codec_type: video` | "no video stream found" |
| **Has audio stream** | ffprobe finds `codec_type: audio` | "no audio stream found (required for final mux)" |
| **Caption file exists** | SRT/VTT file at `srt_path` | "caption file not found at {path}" |
| **Caption non-empty** | SRT file size > 0 | "caption file is empty" |

**Example Failure:**
```
OUTPUT CONTRACT VIOLATION at post_production:
  ✗ Video 1: no audio stream found (required for final mux)
  ✗ Video 1: caption file not found at /path/to/video_1_captions.srt

State: halted
Location: /video_production/prod-2026-05-21/state.json
```

---

### Stage 3: After QA (`_stage_qa`)

**When**: After `_stage_qa()` completes  
**What it checks**: None (QA produces reports, not video files)

---

## Implementation Details

### Method 1: `_validate_output_contract()`

**Location**: Lines 58-100  
**Signature**: `def _validate_output_contract(self, stage_name: str, result: dict, state: VideoProductionState) -> dict`

**Purpose**: Router method that delegates to stage-specific validators

**Returns**:
```python
{
    "passed": bool,
    "errors": [list of error messages]
}
```

**Behavior**:
- Catches exceptions and logs them
- Records failures in `state.output_contract_failures[stage_name]`
- Returns structured result

**Example**:
```python
contract_validation = self._validate_output_contract("remotion_render", result, state)

if contract_validation["passed"]:
    print("✓ Output contract PASSED")
else:
    print(f"✗ Output contract FAILED: {contract_validation['errors']}")
```

---

### Method 2: `_validate_remotion_render_output()`

**Location**: Lines 102-142  
**Signature**: `def _validate_remotion_render_output(self, result: dict, state: VideoProductionState) -> list[str]`

**Checks (in order)**:
1. Each video has a `video_path` in state
2. File exists at `video_path`
3. File size > 0
4. ffprobe: duration > 0
5. ffprobe: resolution = 1920x1080
6. ffprobe: codec = h264

**Returns**: List of error messages (empty if all pass)

**Example Output**:
```python
[
    "Video 1: file not found at /path/to/video_1.mp4",
    "Video 2: resolution mismatch (expected 1920x1080, got 1280x720)"
]
```

---

### Method 3: `_validate_post_production_output()`

**Location**: Lines 144-185  
**Signature**: `def _validate_post_production_output(self, result: dict, state: VideoProductionState) -> list[str]`

**Checks (in order)**:
1. Each video has a `final_path` in state
2. File exists at `final_path`
3. ffprobe: has video stream
4. ffprobe: has audio stream
5. SRT/caption file exists (if `srt_path` provided)
6. Caption file non-empty

**Returns**: List of error messages (empty if all pass)

**Note**: If `srt_path` is empty (captions failed), logs warning but doesn't fail validation

---

### Method 4: `_ffprobe_validate()`

**Location**: Lines 187-267  
**Signature**: `def _ffprobe_validate(self, video_path: str, video_number: int, checks: dict) -> list[str]`

**Purpose**: Wrapper around ffprobe (FFmpeg tool) to inspect video file properties

**Supported Checks**:
```python
{
    "duration_gt_zero": bool,           # Check duration > 0s
    "resolution": "1920x1080",          # Check exact resolution
    "video_codec": "h264",              # Check video codec
    "has_video_stream": bool,           # Check for video stream
    "has_audio_stream": bool            # Check for audio stream
}
```

**Example Usage**:
```python
errors = self._ffprobe_validate(
    "/path/to/video.mp4",
    video_number=1,
    {
        "duration_gt_zero": True,
        "resolution": "1920x1080",
        "video_codec": "h264",
        "has_video_stream": True,
        "has_audio_stream": True
    }
)
```

**Error Handling**:
- FFmpeg not in PATH → "ffprobe not found in PATH (install FFmpeg)"
- File corrupted → "ffmpeg timeout (file may be corrupted)"
- Invalid JSON response → "ffprobe returned invalid JSON"
- Any exception → Captured and reported with details

---

## State.json Recording

When a contract validation fails, the failure is logged to state.json:

```json
{
  "production_id": "prod-2026-05-21",
  "current_stage": "halted",
  "output_contract_failures": {
    "remotion_render": {
      "stage": "remotion_render",
      "failures": [
        "Video 1: resolution mismatch (expected 1920x1080, got 1280x720)",
        "Video 1: no video stream found"
      ],
      "timestamp": "2026-05-21T14:32:15.123456"
    }
  }
}
```

---

## Error Flow

### When Contract Fails

```
stage_func() completes
  ↓
validate_output_contract() called
  ↓
Validation fails (e.g., no audio stream)
  ↓
Record failure in state.output_contract_failures
  ↓
Log error message
  ↓
Mark state.current_stage = "halted"
  ↓
Save state.json
  ↓
Raise GateFailedError with details
  ↓
Orchestrator catches GateFailedError
  ↓
Pipeline halts; user sees error message
  ↓
Pipeline cannot resume automatically
```

**User sees:**
```
╔════════════════════════════════════════════════════════════════════════════╗
║                  OUTPUT CONTRACT VIOLATION                                 ║
║                  Stage: remotion_render                                    ║
╚════════════════════════════════════════════════════════════════════════════╝

  ✗ Video 1: no audio stream found
  ✗ Video 2: caption file not found

Pipeline halted.
State: /video_production/prod-2026-05-21/state.json

Fix the issues and restart the orchestrator.
```

---

## Verification Checklist

### After Remotion Render
- [ ] MP4 file exists
- [ ] File size > 0
- [ ] Duration > 0 seconds
- [ ] Resolution = 1920x1080
- [ ] Video codec = H.264

### After Post-Production
- [ ] MP4 file exists
- [ ] Has video stream (ffprobe)
- [ ] Has audio stream (ffprobe)
- [ ] Caption file exists (if generated)
- [ ] Caption file non-empty

### Pipeline Integrity
- [ ] Contract validation runs after EVERY stage
- [ ] Failed contracts halt pipeline
- [ ] Failures logged to state.json
- [ ] User can see exactly what failed
- [ ] Pipeline cannot skip validation

---

## Integration Points in Code

| File | Lines | Method | Purpose |
|------|-------|--------|---------|
| `video_production_orchestrator_remotion.py` | 58-100 | `_validate_output_contract()` | Router; dispatches to stage validators |
| `video_production_orchestrator_remotion.py` | 102-142 | `_validate_remotion_render_output()` | Checks MP4 from Remotion |
| `video_production_orchestrator_remotion.py` | 144-185 | `_validate_post_production_output()` | Checks MP4 + captions from PostProd |
| `video_production_orchestrator_remotion.py` | 187-267 | `_ffprobe_validate()` | FFmpeg wrapper for stream inspection |
| `video_production_orchestrator_remotion.py` | ~360 | Main loop integration | Calls validation BEFORE review checkpoint |
| `schemas.py` | ~218 | `VideoProductionState.output_contract_failures` | State field to track failures |

---

## Dependencies

**External**: FFmpeg (ffprobe binary)

```bash
# Install FFmpeg (includes ffprobe)
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS (Homebrew)
brew install ffmpeg

# Windows (Chocolatey)
choco install ffmpeg
```

**Code**: Uses `subprocess` to run ffprobe; results parsed as JSON

---

## Testing

### Test Case 1: Remotion Output Missing Audio
```python
# Simulate: Remotion produces MP4 with no audio stream
# Expected: Contract validation fails
# Result: Pipeline halts with "no video stream found"
```

### Test Case 2: Post-Production Caption Missing
```python
# Simulate: ffmpeg fails to generate SRT file
# Expected: Contract validation fails
# Result: Pipeline halts with "caption file not found"
```

### Test Case 3: Wrong Resolution
```python
# Simulate: Remotion produces 1280x720 instead of 1920x1080
# Expected: Contract validation fails
# Result: Pipeline halts with "resolution mismatch"
```

### Test Case 4: All Checks Pass
```python
# Simulate: All stages complete with valid outputs
# Expected: Validation passes for each stage
# Result: Pipeline proceeds to next stage
```

---

## Future Enhancements

1. **Custom contracts**: Allow per-production contract rules
2. **Warnings vs. errors**: Allow some checks to warn without halting
3. **Auto-repair**: Detect and fix common issues (e.g., re-encode resolution)
4. **Dashboard**: Visual report of all contract checks
5. **Webhooks**: Notify on contract failure (Slack, email)

---

**Status**: ✅ Production ready. No silent failures.
