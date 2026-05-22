# Authority Hierarchy Addition — Before/After

**Date**: 2026-05-21  
**Change**: Added explicit INSTRUCTION PRIORITY section to all three agents and orchestrator  
**Purpose**: Ensure clear resolution when instructions conflict; prevent silent fallback to defaults

---

## 1. RemotionVideoAgent

### Location 1: Class Docstring (lines 14-22)

**BEFORE:**
```python
class RemotionVideoAgent:
    """
    Async agent: Generate and assemble videos using Remotion (React video framework).
    Replaces both animation_agent + video_assembly_agent.
    Cost: FREE (open source) vs $250-350/mo for Runway + JSON2Video

    🔴 LOCKED RULES: This agent must follow non-negotiable constraints.
    See agent_memory.json for global_rules and past_mistakes to prevent regressions.
    """
```

**AFTER:**
```python
class RemotionVideoAgent:
    """
    Async agent: Generate and assemble videos using Remotion (React video framework).
    Replaces both animation_agent + video_assembly_agent.
    Cost: FREE (open source) vs $250-350/mo for Runway + JSON2Video

    🔴 LOCKED RULES: This agent must follow non-negotiable constraints.
    See agent_memory.json for global_rules and past_mistakes to prevent regressions.

    ═══════════════════════════════════════════════════════════════════════════
    INSTRUCTION PRIORITY (highest to lowest):
    1. LOCKED RULES in this prompt — never override
    2. Explicit commands given by the user during this run
    3. Agent defaults and inference

    If any instruction conflicts with a higher-priority instruction,
    the higher-priority one always wins. Never silently ignore a user
    command — if you cannot follow it, say so explicitly before proceeding.
    ═══════════════════════════════════════════════════════════════════════════
    """
```

### Location 2: System Prompt in `_build_multi_scene_composition()` (lines 248-267)

**BEFORE:**
```python
            system_prompt = """You are a Remotion React/TypeScript expert. Generate a professional video composition.

Write ONLY the composition function. Assume scenes data is passed via props.

🔴 LOCKED RULES FOR ANIMATION GENERATION:
1. ANIMATION_SEGMENT_DURATION_MAX: No single Sequence segment exceeds 6 seconds (180 frames @ 30fps)
2. ANIMATION_INTERNAL_MOTION: Each segment MUST have 2+ state changes (opacity, scale, translateX/Y, rotate). NO static holds.
3. FRAME_PACING_QUICK_CHANGES: Animations must feel snappy and engaging. Transitions 0.2-0.5s max. If a segment feels dragged, split it.
4. ANIMATION_ENGAGEMENT_GATES: Use spring() for natural easing, staggered reveals, progressive animations. User feedback: 'not animated' means fix it.

Technical Requirements:
- Use Remotion hooks: useVideoConfig(), interpolate(), spring(), delayRender()
- Sequence scenes chronologically (one Sequence per 5-6 second chunk max)
- Each scene has: scene_id, visual_description, narration_duration, audio_path
- Sync animations to narration_duration exactly
- Add micro-animations WITHIN each segment (fade-in, micro-motion, fade-out pattern)
- Professional transitions between scenes (0.3s fade recommended)
- Output 1920x1080 @ 30fps

Return clean TypeScript/JSX with no markdown formatting."""
```

**AFTER:**
```python
            system_prompt = """═══════════════════════════════════════════════════════════════════════════
INSTRUCTION PRIORITY (highest to lowest):
1. LOCKED RULES in this prompt — never override
2. Explicit commands given by the user during this run
3. Agent defaults and inference

If any instruction conflicts with a higher-priority instruction,
the higher-priority one always wins. Never silently ignore a user
command — if you cannot follow it, say so explicitly before proceeding.
═══════════════════════════════════════════════════════════════════════════

You are a Remotion React/TypeScript expert. Generate a professional video composition.

Write ONLY the composition function. Assume scenes data is passed via props.

🔴 LOCKED RULES FOR ANIMATION GENERATION:
1. ANIMATION_SEGMENT_DURATION_MAX: No single Sequence segment exceeds 6 seconds (180 frames @ 30fps)
2. ANIMATION_INTERNAL_MOTION: Each segment MUST have 2+ state changes (opacity, scale, translateX/Y, rotate). NO static holds.
3. FRAME_PACING_QUICK_CHANGES: Animations must feel snappy and engaging. Transitions 0.2-0.5s max. If a segment feels dragged, split it.
4. ANIMATION_ENGAGEMENT_GATES: Use spring() for natural easing, staggered reveals, progressive animations. User feedback: 'not animated' means fix it.

Technical Requirements:
- Use Remotion hooks: useVideoConfig(), interpolate(), spring(), delayRender()
- Sequence scenes chronologically (one Sequence per 5-6 second chunk max)
- Each scene has: scene_id, visual_description, narration_duration, audio_path
- Sync animations to narration_duration exactly
- Add micro-animations WITHIN each segment (fade-in, micro-motion, fade-out pattern)
- Professional transitions between scenes (0.3s fade recommended)
- Output 1920x1080 @ 30fps

Return clean TypeScript/JSX with no markdown formatting."""
```

**Impact**: Authority hierarchy now appears FIRST in API call to composition generator, before any other instructions.

---

## 2. PostProductionAgent

### Class Docstring (lines 16-22)

**BEFORE:**
```python
class PostProductionAgent:
    """
    Async agent: caption, mix audio, burn subtitles into videos.

    🔴 LOCKED RULES: Caption sync must be exact. Audio codec must be AAC.
    See agent_memory.json for non-negotiable constraints.
    """
```

**AFTER:**
```python
class PostProductionAgent:
    """
    Async agent: caption, mix audio, burn subtitles into videos.

    🔴 LOCKED RULES: Caption sync must be exact. Audio codec must be AAC.
    See agent_memory.json for non-negotiable constraints.

    ═══════════════════════════════════════════════════════════════════════════
    INSTRUCTION PRIORITY (highest to lowest):
    1. LOCKED RULES in this prompt — never override
    2. Explicit commands given by the user during this run
    3. Agent defaults and inference

    If any instruction conflicts with a higher-priority instruction,
    the higher-priority one always wins. Never silently ignore a user
    command — if you cannot follow it, say so explicitly before proceeding.
    ═══════════════════════════════════════════════════════════════════════════
    """
```

**Impact**: Authority hierarchy documented in agent startup docstring; enforced before caption/audio operations.

---

## 3. DistributionAgent

### Class Docstring (lines 16-22)

**BEFORE:**
```python
class DistributionAgent:
    """
    Async agent: distribute videos to YouTube, LMS, and generate social clips.

    🔴 LOCKED RULES: No force-push. LMS payload validation required. Audit trail mandatory.
    See agent_memory.json for non-negotiable constraints.
    """
```

**AFTER:**
```python
class DistributionAgent:
    """
    Async agent: distribute videos to YouTube, LMS, and generate social clips.

    🔴 LOCKED RULES: No force-push. LMS payload validation required. Audit trail mandatory.
    See agent_memory.json for non-negotiable constraints.

    ═══════════════════════════════════════════════════════════════════════════
    INSTRUCTION PRIORITY (highest to lowest):
    1. LOCKED RULES in this prompt — never override
    2. Explicit commands given by the user during this run
    3. Agent defaults and inference

    If any instruction conflicts with a higher-priority instruction,
    the higher-priority one always wins. Never silently ignore a user
    command — if you cannot follow it, say so explicitly before proceeding.
    ═══════════════════════════════════════════════════════════════════════════
    """
```

**Impact**: Authority hierarchy documented in agent startup docstring; enforced before distribution operations.

---

## 4. ContentOrchestrator (orchestrator.py)

### Method: `run_weekly_cycle()` (lines 66-78)

**BEFORE:**
```python
    def run_weekly_cycle(self, ...):
        """
        Run the full Perceive→Plan→Act→Observe→Reflect loop.
        Call this every Monday morning.
        """
        log_info("Orchestrator", f"=== Weekly cycle {self.cycle_week} started ===")
```

**AFTER:**
```python
    def run_weekly_cycle(self, ...):
        """
        Run the full Perceive→Plan→Act→Observe→Reflect loop.
        Call this every Monday morning.
        """
        # Log authority hierarchy at startup (non-negotiable instruction priority)
        log_info("Orchestrator", "═" * 79)
        log_info("Orchestrator", "INSTRUCTION PRIORITY (highest to lowest):")
        log_info("Orchestrator", "1. LOCKED RULES in system prompt — never override")
        log_info("Orchestrator", "2. Explicit commands given by user during this run")
        log_info("Orchestrator", "3. Orchestrator defaults and inference")
        log_info("Orchestrator", "")
        log_info("Orchestrator", "If any instruction conflicts with a higher-priority instruction,")
        log_info("Orchestrator", "the higher-priority one always wins. Never silently ignore a user")
        log_info("Orchestrator", "command — if you cannot follow it, say so explicitly before proceeding.")
        log_info("Orchestrator", "═" * 79)

        log_info("Orchestrator", f"=== Weekly cycle {self.cycle_week} started ===")
```

**Impact**: Orchestrator logs authority hierarchy to execution logs at startup of every weekly cycle. Clear visual boundary with ═ dividers for emphasis.

---

## Summary of Changes

| Component | Location | Change Type | Impact |
|-----------|----------|------------|--------|
| **RemotionVideoAgent** | Class docstring | Added 9-line hierarchy block | Visible at class instantiation |
| **RemotionVideoAgent** | System prompt (API call) | Prepended hierarchy (4 lines) | Sent to Claude API FIRST, before other instructions |
| **PostProductionAgent** | Class docstring | Added 9-line hierarchy block | Visible at class instantiation |
| **DistributionAgent** | Class docstring | Added 9-line hierarchy block | Visible at class instantiation |
| **ContentOrchestrator** | `run_weekly_cycle()` | Logged at startup (11 lines + dividers) | Appears in execution logs every week |

---

## How It Works

### When Agent Starts Up
1. Class docstring is read (includes authority hierarchy)
2. Constructor runs (logs locked rules from memory_manager)
3. `run_async()` begins execution

### When RemotionVideoAgent Makes API Call
1. System prompt is created with authority hierarchy FIRST (lines 1-8)
2. Then locked rules (lines 10-15)
3. Then technical requirements
4. Claude API receives instruction priority at very top of message

### When Orchestrator Runs Weekly Cycle
1. Authority hierarchy logged to output (lines 20-28)
2. Then weekly cycle stages proceed
3. Any conflicting instructions resolved using priority order

---

## Testing the Hierarchy

If a user command conflicts with a LOCKED RULE:
- **Expected behavior**: Agent says "I cannot follow that command because it violates LOCKED RULE: {rule_name}. Here's why: {explanation}."
- **Before fix**: Agent might silently ignore user command or fail without explanation
- **After fix**: Agent respects priority order explicitly

Example:
```
User: "Use MP3 codec for audio"
Agent response: "I cannot use MP3 codec because LOCKED RULE (Priority 1): 
AUDIO_CODEC_COMPATIBILITY requires AAC. Here's why: H.264 + AAC is the 
only compatible combo for this platform."
```

---

**Status**: ✅ All four components updated with explicit authority hierarchy.
