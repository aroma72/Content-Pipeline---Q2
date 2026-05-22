# RemotionVideoAgent Self-Validation — Code Location Guide

**File**: `agents/remotion_video_agent.py`

---

## Overview Map

```
RemotionVideoAgent class (lines 14-462)
│
├─ Constructor (lines 35-40)
│   └─ Initialize memory_manager ← For logging failures
│
├─ run_async() (lines 42-86)
│   └─ Main entry point
│
├─ _execute() (lines 119-240) ← MAIN PIPELINE
│   │
│   ├─ For each video:
│   │   ├─ _build_multi_scene_composition() ← CALLS VALIDATION
│   │   │
│   │   ├─ Register composition
│   │   └─ Render video
│   │
│   └─ Return assembled videos
│
├─ _build_multi_scene_composition() (lines 242-337) ← GENERATES CODE + VALIDATES
│   │
│   ├─ Claude generates TSX/JSX (line 315)
│   ├─ Clean markdown formatting (lines 318-319)
│   │
│   ├─ NEW: Call self-validation (lines 327-338)
│   │   └─ _self_validate_composition_code() ← VALIDATES CODE
│   │
│   └─ Return validated code or None
│
└─ _self_validate_composition_code() (lines 343-462) ← NEW METHOD
    ├─ Build validation prompt with locked rules (lines 355-365)
    ├─ Loop attempts = 1..2 (line 371)
    │   ├─ Send to Claude for validation (line 380)
    │   ├─ Parse response (lines 382-443)
    │   │   ├─ If APPROVED → return code (lines 384-389)
    │   │   ├─ If VIOLATIONS → extract and rewrite (lines 391-432)
    │   │   └─ If unexpected format → fail (lines 434-447)
    │   └─ Catch exceptions (lines 449-462)
    │
    └─ Return validated code OR None
```

---

## Detailed Code Locations

### 1. Constructor: Initialize Memory Manager

**File**: `agents/remotion_video_agent.py`  
**Lines**: 35-40

```python
def __init__(self, remotion_project_dir: str | None = None, timeout_minutes: int = 120):
    self.timeout_seconds = timeout_minutes * 60
    self.skill = RemotionVideoSkill(remotion_project_dir)
    self.remotion_project_dir = remotion_project_dir
    self.memory_manager = AgentMemoryManager()  # ← For logging failures
    self.agent_name = "RemotionVideoAgent"
```

**Purpose**: Memory manager is initialized so it's available for logging validation failures to `agent_memory.json`.

---

### 2. Code Generation: _build_multi_scene_composition()

**File**: `agents/remotion_video_agent.py`  
**Lines**: 242-337

#### A. Claude Code Generation (lines 291-315)

```python
response = client.messages.create(
    model=MODEL_SONNET,
    max_tokens=2048,
    system=system_prompt,
    messages=[{
        "role": "user",
        "content": f"""Create a Remotion composition for a {len(scenes)}-scene educational video.
        ...
        """
    }]
)

composition_code = response.content[0].text.strip()  # ← Generated code
```

---

#### B. Clean Markdown (lines 318-319)

```python
# Remove markdown code blocks if present
if composition_code.startswith("```"):
    composition_code = "\n".join(composition_code.split("\n")[1:-1])
```

---

#### C. Invoke Self-Validation (lines 327-338)

```python
log_decision(
    "RemotionVideoAgent", "composition_code_generated", "success",
    f"Generated {len(composition_code)} chars of Remotion composition code",
    rationale="Ready for self-validation against locked rules"  # ← Changed from "Ready for registration"
)

# ═════════════════════════════════════════════════════════════════════════
# LOCKED: Self-validation loop (max 2 attempts)
# Validate composition code against locked rules before rendering
# ═════════════════════════════════════════════════════════════════════════
validated_code = self._self_validate_composition_code(
    video_number, composition_code, client, config.fps
)

if validated_code is None:  # ← Validation failed
    log_error("RemotionVideoAgent", "CompositionValidationFailed",
             f"Video {video_number} composition failed self-validation after 2 attempts")
    return None  # ← Stop here; never register or render

return validated_code  # ← Return validated code
```

**Key Decision Point**: 
- If `validated_code` is None → function returns None immediately
- In `_execute()`, this causes the video to be added to `failed_videos`
- Composition is never registered or rendered

---

### 3. Self-Validation Method: _self_validate_composition_code()

**File**: `agents/remotion_video_agent.py`  
**Lines**: 343-462

#### A. Method Signature (lines 343-344)

```python
def _self_validate_composition_code(self, video_number: int, composition_code: str,
                                    client: anthropic.Anthropic, fps: int) -> str | None:
```

**Inputs**:
- `video_number`: Which video (for logging)
- `composition_code`: Generated TSX/JSX code
- `client`: Anthropic API client
- `fps`: Frames per second

**Outputs**:
- Returns validated code (str) if successful
- Returns None if validation failed

---

#### B. Initialization (lines 355-365)

```python
# Get locked rules from memory manager
global_rules = self.memory_manager.get_global_rules()
agent_rules = self.memory_manager.get_agent_specific_rules("RemotionVideoAgent")

# Format rules for validation prompt
global_rules_text = "\n".join([
    f"- {r['rule_id']}: {r['rule']}" for r in global_rules if r.get("applies_to") and "RemotionVideoAgent" in r.get("applies_to")
])

agent_rules_text = "\n".join([
    f"- {r['rule_id']}: {r['rule']}" for r in agent_rules
])
```

**Purpose**: Extract locked rules from `agent_memory.json` and format them for the validation prompt.

---

#### C. Build Validation Prompt (lines 367-401)

```python
validation_prompt = f"""Review this Remotion composition code against locked rules.

🔴 GLOBAL LOCKED RULES (RemotionVideoAgent):
{global_rules_text}

🔴 AGENT-SPECIFIC LOCKED RULES:
{agent_rules_text}

CODE TO REVIEW:
```typescript
{composition_code}
```

INSTRUCTIONS:
1. Check code against ALL locked rules above
2. If NO violations found, respond with exactly: APPROVED
3. If violations found, list them explicitly then provide REWRITTEN code...

Be strict. No passing code that violates locked rules."""
```

---

#### D. Attempt Loop (lines 403-405)

```python
attempt = 1
current_code = composition_code

while attempt <= 2:  # ← MAX 2 ATTEMPTS
```

---

#### E. Attempt 1 & 2: Send to Claude (lines 406-420)

```python
try:
    log_info("RemotionVideoAgent",
            f"VIDEO {video_number}: Self-validation attempt {attempt}/2")

    # Send to Claude for validation
    response = client.messages.create(
        model=MODEL_SONNET,
        max_tokens=3000,
        messages=[{
            "role": "user",
            "content": validation_prompt.replace(composition_code, current_code)  # ← Use current code (rewrites on retry)
        }]
    )

    validation_response = response.content[0].text.strip()
```

---

#### F. Check for APPROVED (lines 422-432)

```python
# Check if approved
if "APPROVED" in validation_response.upper():
    log_decision(
        "RemotionVideoAgent", "composition_self_validated", "success",
        f"Video {video_number}: Code passed self-validation (attempt {attempt})",
        rationale="Composition complies with all locked rules"
    )
    return current_code  # ← SUCCESS: Return code immediately
```

---

#### G. Parse Violations and Rewrite (lines 434-443)

```python
# Parse violations and rewritten code
if "VIOLATIONS:" in validation_response:
    # Extract violations section
    violations_section = validation_response.split("VIOLATIONS:")[1].split("REWRITTEN CODE:")[0].strip()
    violations = [v.strip() for v in violations_section.split("\n") if v.strip() and v.startswith("-")]

    log_warning("RemotionVideoAgent",
               f"VIDEO {video_number}: Self-validation found {len(violations)} violations (attempt {attempt}):")
    for v in violations:
        log_warning("RemotionVideoAgent", f"  {v}")  # ← Log each violation

    # Extract rewritten code if available
    if "REWRITTEN CODE:" in validation_response:
        code_section = validation_response.split("REWRITTEN CODE:")[1].strip()

        # Clean markdown if present
        if code_section.startswith("```"):
            code_section = "\n".join(code_section.split("\n")[1:-1])

        current_code = code_section.strip()  # ← Update current_code for next attempt
        attempt += 1  # ← Increment attempt counter

        if attempt > 2:  # ← Check if exceeded max attempts
            # Failed after max attempts
            log_error("RemotionVideoAgent", "CompositionValidationMaxAttemptsExceeded",
                     f"Video {video_number}: Failed self-validation after 2 attempts")

            # Log violation to agent memory for human review
            self.memory_manager.log_new_mistake("RemotionVideoAgent", {
                "correction_type": "COMPOSITION_VALIDATION_FAILED",
                "video_number": video_number,
                "timestamp": datetime.now().isoformat(),
                "violations": violations,
                "attempts": 2,
                "last_code": current_code[:500] + "..." if len(current_code) > 500 else current_code,
                "action": "Composition code failed self-validation. Manual review required before rendering."
            })

            return None  # ← FAIL: Return None
        # Continue loop to Attempt 2
```

---

#### H. Error Cases (lines 451-462)

**Case 1: No rewritten code provided**
```python
else:
    # No rewritten code provided
    log_error("RemotionVideoAgent", "ValidationNoRewrittenCode",
             f"Video {video_number}: Claude found violations but did not provide rewritten code")

    # Log to memory
    self.memory_manager.log_new_mistake("RemotionVideoAgent", {
        "correction_type": "VALIDATION_INCOMPLETE",
        ...
    })

    return None
```

---

**Case 2: Unexpected response format**
```python
else:
    # Unexpected response format
    log_error("RemotionVideoAgent", "ValidationResponseFormat",
             f"Video {video_number}: Unexpected validation response format")
    log_warning("RemotionVideoAgent", f"Response:\n{validation_response[:200]}...")

    # Log to memory
    self.memory_manager.log_new_mistake("RemotionVideoAgent", {
        "correction_type": "VALIDATION_RESPONSE_MALFORMED",
        ...
    })

    return None
```

---

**Case 3: Exception during validation**
```python
except Exception as e:
    log_error("RemotionVideoAgent", "SelfValidationError", str(e))

    # Log to memory
    self.memory_manager.log_new_mistake("RemotionVideoAgent", {
        "correction_type": "VALIDATION_EXCEPTION",
        "video_number": video_number,
        "timestamp": datetime.now().isoformat(),
        "error": str(e),
        "action": "Self-validation threw exception. Manual review required."
    })

    return None
```

---

### 4. Integration in _execute()

**File**: `agents/remotion_video_agent.py`  
**Lines**: 139-145 in `_execute()` method

**BEFORE** (simplified):
```python
# Step 1: Generate composition code
composition_code = self._build_multi_scene_composition(video_number, scenes, config)

if not composition_code:
    failed_videos.append(video_number)
    continue  # ← Skip to next video

# Step 2: Register composition
comp_id = f"Video-{video_number}"
registration_success = await self._register_composition(comp_id, composition_code)
```

**What Changed**:
- `_build_multi_scene_composition()` now calls `_self_validate_composition_code()` before returning
- If validation fails, it returns None
- If validation passes, it returns the (validated or rewritten) code
- `_execute()` treats None as failure and skips the video

---

### 5. Memory Logging

**File**: `agents/remotion_video_agent.py`  
**Lines**: Where `self.memory_manager.log_new_mistake()` is called

**Example Call** (line 443-450):
```python
self.memory_manager.log_new_mistake("RemotionVideoAgent", {
    "correction_type": "COMPOSITION_VALIDATION_FAILED",
    "video_number": video_number,
    "timestamp": datetime.now().isoformat(),
    "violations": violations,
    "attempts": 2,
    "last_code": current_code[:500] + "...",
    "action": "Composition code failed self-validation. Manual review required before rendering."
})
```

**What gets logged**: This entry appears in `agent_memory.json` under `past_mistakes.RemotionVideoAgent` for human review.

---

## Control Flow Diagram

```
_execute() starts loop through videos
│
├─ For each video: video_number = 1, 2, 3...
│   │
│   ├─ Call _build_multi_scene_composition(video_number=1, scenes, config)
│   │   │
│   │   ├─ Claude generates composition_code
│   │   │   └─ (example: Sequence with 8-second static hold)
│   │   │
│   │   ├─ Clean markdown formatting
│   │   │
│   │   ├─ Call _self_validate_composition_code(
│   │   │       video_number=1,
│   │   │       composition_code="...",  ← The 8-second static code
│   │   │       client,
│   │   │       fps=30)
│   │   │   │
│   │   │   ├─ Attempt 1:
│   │   │   │   ├─ Send to Claude: "Review this code against locked rules"
│   │   │   │   │   (including ANIMATION_SEGMENT_DURATION_MAX)
│   │   │   │   │
│   │   │   │   ├─ Claude responds:
│   │   │   │   │   "VIOLATIONS:
│   │   │   │   │   - ANIMATION_SEGMENT_DURATION_MAX: 8s > 6s max
│   │   │   │   │   
│   │   │   │   │   REWRITTEN CODE: [fixed code with split segments]"
│   │   │   │   │
│   │   │   │   ├─ Log violations
│   │   │   │   ├─ Extract rewritten code
│   │   │   │   ├─ Set current_code = rewritten code
│   │   │   │   └─ Increment attempt to 2
│   │   │   │
│   │   │   ├─ Attempt 2:
│   │   │   │   ├─ Send to Claude: same validation (now with fixed code)
│   │   │   │   │
│   │   │   │   ├─ Claude responds: "APPROVED"
│   │   │   │   │
│   │   │   │   ├─ Log success
│   │   │   │   └─ Return rewritten code ← SUCCESS
│   │   │   │
│   │   │   └─ _self_validate_composition_code() returns fixed code
│   │   │
│   │   └─ _build_multi_scene_composition() returns validated code
│   │
│   ├─ Check: composition_code is not None? YES
│   │
│   ├─ Register composition
│   ├─ Verify locked rules
│   └─ Render video ← Only reached if validation passed
│
└─ Return assembled videos
```

---

## Imports Required

**Added to top of file** (lines 1-12):

```python
import asyncio
import json
import sys
import os  # ← NEW
from datetime import datetime  # ← NEW
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas import VideoProductionConfig, AssembledVideo
from skills.remotion_video_skill import RemotionVideoSkill
from config import VIDEO_PRODUCTION_DIR
from logger import log_info, log_error, log_decision, log_warning
from memory_manager import AgentMemoryManager
import anthropic  # ← NEW
```

---

## Summary

| Aspect | Location | Purpose |
|--------|----------|---------|
| **Validation initiation** | `_build_multi_scene_composition()` line 327 | Call validation after code generation |
| **Validation method** | `_self_validate_composition_code()` lines 343-462 | Implement 2-attempt validation loop |
| **Prompt building** | Lines 365-401 | Construct validation prompt with locked rules |
| **Attempt loop** | Lines 403-443 | Max 2 attempts; rewrite on violations |
| **Success path** | Lines 422-432 | Return code immediately if APPROVED |
| **Failure logging** | Lines 443-450 | Log to agent_memory.json after max attempts |
| **Error handling** | Lines 434-462 | Handle all edge cases (no rewrite, bad format, exceptions) |
| **Integration** | `_execute()` line 141-145 | Skip video if validation returns None |

---

**Status**: ✅ All code locations documented and ready for production use.
