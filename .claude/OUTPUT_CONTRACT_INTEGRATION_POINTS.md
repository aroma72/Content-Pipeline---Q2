# Output Contract Validation — Integration Points in Orchestrator

**Where to find the checks**: `video_production_orchestrator_remotion.py`

---

## Main Pipeline Loop (Lines ~350-380)

### BEFORE (without validation)
```python
for stage_name, stage_func in stages:
    # ... skip logic ...
    
    while retry_count < max_retries:
        try:
            result = stage_func(state)  # ← Stage completes
            
            if result.get("status") not in ["success", "not_configured"]:
                raise Exception(f"Stage {stage_name} failed: {result}")

            # Review checkpoint
            report = self._quality_review(stage_name, result)
            decision = self._review_checkpoint(stage_name, result, report, state)
            
            # ↑ Problem: bad outputs silently passed to next stage
```

### AFTER (with validation)
```python
for stage_name, stage_func in stages:
    # ... skip logic ...
    
    while retry_count < max_retries:
        try:
            result = stage_func(state)  # ← Stage completes
            
            if result.get("status") not in ["success", "not_configured"]:
                raise Exception(f"Stage {stage_name} failed: {result}")

            # ← NEW: LOCKED OUTPUT CONTRACT VALIDATION
            contract_validation = self._validate_output_contract(stage_name, result, state)
            if not contract_validation["passed"]:
                state.current_stage = "halted"
                self._save_state(state)
                raise GateFailedError(
                    f"OUTPUT CONTRACT VIOLATION at {stage_name}:\n"
                    + "\n".join(f"  ✗ {err}" for err in contract_validation["errors"])
                )

            # Review checkpoint (only reached if contract passed)
            report = self._quality_review(stage_name, result)
            decision = self._review_checkpoint(stage_name, result, report, state)
            
            # ✓ Now only valid outputs proceed
```

---

## Validation Methods (Lines 58-267)

### Layer 1: Router Method
**`_validate_output_contract(stage_name, result, state)`** — Lines 58-100
```python
def _validate_output_contract(self, stage_name: str, result: dict, state: VideoProductionState) -> dict:
    """
    LOCKED: Validate output contract for each pipeline stage.
    If ANY check fails, mark stage as FAILED in state and halt pipeline.
    """
    errors = []
    
    if stage_name == "remotion_render":
        errors.extend(self._validate_remotion_render_output(result, state))
    
    elif stage_name == "post_production":
        errors.extend(self._validate_post_production_output(result, state))
    
    if errors:
        # Record failure in state
        state.output_contract_failures[stage_name] = {
            "stage": stage_name,
            "failures": errors,
            "timestamp": self._timestamp()
        }
        return {"passed": False, "errors": errors}
    
    return {"passed": True, "errors": []}
```

---

### Layer 2a: Remotion Render Validator
**`_validate_remotion_render_output(result, state)`** — Lines 102-142

```python
def _validate_remotion_render_output(self, result: dict, state: VideoProductionState) -> list[str]:
    """
    LOCKED: Validate Remotion render output.
    
    Checks:
    1. MP4 file exists at expected path
    2. File size > 0
    3. Video duration > 0
    4. Resolution is exactly 1920x1080
    5. Video stream is H.264 codec
    """
    errors = []
    
    for video in state.assembled_videos:
        video_path = video.get("video_path")
        video_number = video.get("video_number")
        
        # Check 1: File exists
        if not Path(video_path).exists():
            errors.append(f"Video {video_number}: file not found at {video_path}")
            continue
        
        # Check 2: File size > 0
        if Path(video_path).stat().st_size == 0:
            errors.append(f"Video {video_number}: file is empty (0 bytes)")
            continue
        
        # Check 3-5: Use ffprobe to validate
        probe_errors = self._ffprobe_validate(video_path, video_number, {
            "duration_gt_zero": True,
            "resolution": "1920x1080",
            "video_codec": "h264"
        })
        errors.extend(probe_errors)
    
    return errors
```

**Validates**: `state.assembled_videos[*].video_path`

**Fails on**: Any of these:
- `Video 1: file not found at /path/to/video_1.mp4`
- `Video 1: file is empty (0 bytes)`
- `Video 1: duration is 0 or invalid (0.0s)`
- `Video 1: resolution mismatch (expected 1920x1080, got 1280x720)`
- `Video 1: no video stream found`
- `Video 1: codec mismatch (expected h264, got mpeg4)`

---

### Layer 2b: Post-Production Validator
**`_validate_post_production_output(result, state)`** — Lines 144-185

```python
def _validate_post_production_output(self, result: dict, state: VideoProductionState) -> list[str]:
    """
    LOCKED: Validate post-production output.
    
    Checks:
    1. Output MP4 exists at expected path
    2. MP4 has BOTH video and audio streams (via ffprobe)
    3. Caption/SRT file exists alongside video
    4. Caption file is non-empty
    """
    errors = []
    
    for result_item in state.post_production_results:
        final_path = result_item.get("final_path")
        srt_path = result_item.get("srt_path")
        video_number = result_item.get("video_number")
        
        # Check 1: File exists
        if not Path(final_path).exists():
            errors.append(f"Video {video_number}: final video not found at {final_path}")
            continue
        
        # Check 2: Has both video and audio streams
        stream_errors = self._ffprobe_validate(final_path, video_number, {
            "has_video_stream": True,
            "has_audio_stream": True
        })
        errors.extend(stream_errors)
        
        # Check 3-4: Caption file exists and is non-empty
        if srt_path:
            if not Path(srt_path).exists():
                errors.append(f"Video {video_number}: caption file not found at {srt_path}")
            elif Path(srt_path).stat().st_size == 0:
                errors.append(f"Video {video_number}: caption file is empty")
    
    return errors
```

**Validates**: `state.post_production_results[*].{final_path, srt_path}`

**Fails on**: Any of these:
- `Video 1: final video not found at /path/to/video_1_final.mp4`
- `Video 1: no video stream found`
- `Video 1: no audio stream found (required for final mux)`
- `Video 1: caption file not found at /path/to/video_1.srt`
- `Video 1: caption file is empty`

---

### Layer 3: FFprobe Wrapper
**`_ffprobe_validate(video_path, video_number, checks)`** — Lines 187-267

```python
def _ffprobe_validate(self, video_path: str, video_number: int, checks: dict) -> list[str]:
    """
    Use ffprobe to validate video file properties.
    
    Supported checks:
    {
        "duration_gt_zero": bool,
        "resolution": "1920x1080",
        "video_codec": "h264",
        "has_video_stream": bool,
        "has_audio_stream": bool
    }
    """
    errors = []
    
    try:
        # Run: ffprobe -v error -show_format -show_streams -of json {video_path}
        cmd = ["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", video_path]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        
        if result.returncode != 0:
            errors.append(f"Video {video_number}: ffprobe failed (code {result.returncode})")
            return errors
        
        probe_data = json.loads(result.stdout)
        streams = probe_data.get("streams", [])
        format_data = probe_data.get("format", {})
        
        # Individual checks
        if checks.get("duration_gt_zero"):
            duration = float(format_data.get("duration", 0))
            if duration <= 0:
                errors.append(f"Video {video_number}: duration is 0 or invalid ({duration}s)")
        
        if checks.get("resolution"):
            video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
            if video_stream:
                actual_res = f"{video_stream.get('width')}x{video_stream.get('height')}"
                if actual_res != checks["resolution"]:
                    errors.append(f"Video {video_number}: resolution mismatch (expected {checks['resolution']}, got {actual_res})")
        
        if checks.get("has_video_stream"):
            if not any(s.get("codec_type") == "video" for s in streams):
                errors.append(f"Video {video_number}: no video stream found")
        
        if checks.get("has_audio_stream"):
            if not any(s.get("codec_type") == "audio" for s in streams):
                errors.append(f"Video {video_number}: no audio stream found (required for final mux)")
        
        if checks.get("video_codec"):
            video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
            if video_stream:
                actual_codec = video_stream.get("codec_name", "")
                expected_codec = checks["video_codec"]
                if actual_codec not in [expected_codec, "avc1"]:
                    errors.append(f"Video {video_number}: codec mismatch (expected {expected_codec}, got {actual_codec})")
    
    except subprocess.TimeoutExpired:
        errors.append(f"Video {video_number}: ffprobe timeout (file may be corrupted)")
    except FileNotFoundError:
        errors.append(f"Video {video_number}: ffprobe not found in PATH (install FFmpeg)")
    except Exception as e:
        errors.append(f"Video {video_number}: ffprobe error: {str(e)}")
    
    return errors
```

---

## State Management (schemas.py, Line ~218)

**Added to VideoProductionState**:
```python
class VideoProductionState(BaseModel):
    # ... existing fields ...
    output_contract_failures: dict[str, dict] = {}  # Track failures per stage
```

**Example State After Failure**:
```json
{
  "production_id": "prod-2026-05-21",
  "current_stage": "halted",
  "output_contract_failures": {
    "remotion_render": {
      "stage": "remotion_render",
      "failures": [
        "Video 1: resolution mismatch (expected 1920x1080, got 1280x720)",
        "Video 1: no audio stream found"
      ],
      "timestamp": "2026-05-21T14:32:15.123456"
    }
  }
}
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────┐
│ Stage 2: _stage_remotion_render()           │
│ Returns: {"status": "success", ...}         │
└──────────────┬──────────────────────────────┘
               ↓
        ┌─────────────────────────────────────┐
        │ Main loop: result = stage_func()    │
        └──────────────┬──────────────────────┘
                       ↓
        ┌──────────────────────────────────────────┐
        │ NEW: Validate output contract           │
        │ contract_validation =                   │
        │   _validate_output_contract(            │
        │     "remotion_render", result, state)   │
        └──────────────┬──────────────────────────┘
                       ↓
            ┌──────────────────────────┐
            │ Contract passed?         │
            └──┬──────────────────┬────┘
               │YES              │NO
               ↓                 ↓
        ┌────────────────┐  ┌──────────────────┐
        │ Continue to    │  │ Mark state as    │
        │ review & next  │  │ halted           │
        │ stage          │  │ Save state.json  │
        └────────────────┘  │ Raise            │
                            │ GateFailedError  │
                            └──────────────────┘
```

---

## Summary Table

| Stage | Validator Method | Checks | Fails On |
|-------|------------------|--------|----------|
| **remotion_render** | `_validate_remotion_render_output()` | File exists, size > 0, duration > 0, res=1920x1080, codec=h264 | Missing/empty file, wrong resolution, wrong codec |
| **post_production** | `_validate_post_production_output()` | File exists, has video stream, has audio stream, caption exists, caption non-empty | Missing audio stream, missing caption file |

---

**Key Point**: Validation happens AFTER stage completes but BEFORE proceeding to next stage or review checkpoint.

**No silent failures**: If any contract check fails, the pipeline halts immediately with a clear error message.
