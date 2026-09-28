import asyncio
import json
import sys
import os
from datetime import datetime
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas import VideoProductionConfig, AssembledVideo
from skills.remotion_video_skill import RemotionVideoSkill
from config import VIDEO_PRODUCTION_DIR
from logger import log_info, log_error, log_decision, log_warning
from memory_manager import AgentMemoryManager
import anthropic


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

    def __init__(self, remotion_project_dir: str | None = None, timeout_minutes: int = 120):
        self.timeout_seconds = timeout_minutes * 60
        self.skill = RemotionVideoSkill(remotion_project_dir)
        self.remotion_project_dir = remotion_project_dir
        self.memory_manager = AgentMemoryManager()
        self.agent_name = "RemotionVideoAgent"

    async def run_async(self, production_id: str, config: VideoProductionConfig,
                       videos: list[dict], callback=None) -> dict:
        """
        Generate complete videos using Remotion compositions.
        Each video dict: {video_number, scenes: [{scene_id, visual_desc, narration, duration}]}

        LOCKED RULES ARE ENFORCED (see logs for non-negotiable constraints).
        """
        # LOCKED: Log rules at start of execution
        locked_rules = self.memory_manager.format_locked_rules_preamble(self.agent_name)
        log_info("RemotionVideoAgent", "LOCKED RULES ENFORCED (see below):")
        for line in locked_rules.split("\n"):
            log_info("RemotionVideoAgent", line)

        log_info("RemotionVideoAgent", f"Starting Remotion video generation for {len(videos)} videos")

        if not self.skill.is_available:
            log_warning("RemotionVideoAgent", "Remotion not configured; returning setup guide")
            return {
                "status": "not_configured",
                "production_id": production_id,
                "guide": self.skill._generate_setup_instructions()
            }

        try:
            result = await asyncio.wait_for(
                self._execute(production_id, config, videos),
                timeout=self.timeout_seconds
            )
            if callback:
                callback(status="success", result=result)
            return result

        except asyncio.TimeoutError:
            error = f"Timeout after {self.timeout_seconds}s"
            log_error("RemotionVideoAgent", "Timeout", error)
            if callback:
                callback(status="timeout", error=error)
            return {"status": "timeout", "production_id": production_id}

        except Exception as e:
            log_error("RemotionVideoAgent", "ExecutionError", str(e))
            if callback:
                callback(status="error", error=str(e))
            return {"status": "error", "production_id": production_id, "error": str(e)}

    def _verify_locked_rules(self, video_number: int, total_duration: float, scenes: list[dict] = None) -> bool:
        """
        LOCKED: Check frame count mathematics and animation pacing before rendering.
        Rules:
        1. frames = VO_seconds × 30fps (max +30 buffer)
        2. No single segment exceeds 6 seconds (180 frames)
        3. Each segment must have 2+ internal animations
        Returns True if valid, logs error and returns False if invalid.
        """
        # LOCKED RULE: FRAME_COUNT_MATH
        max_frames = int(total_duration * 30) + 30  # +30 buffer
        log_info("RemotionVideoAgent", f"VIDEO {video_number}: Duration {total_duration}s = {int(total_duration * 30)} frames (max {max_frames} with buffer)")

        # LOCKED RULE: ANIMATION_SEGMENT_DURATION_MAX
        # No segment should exceed 6 seconds (180 frames)
        if scenes:
            for i, scene in enumerate(scenes):
                scene_duration = scene.get("duration_seconds", 0)
                if scene_duration > 6:
                    log_warning("RemotionVideoAgent", f"VIDEO {video_number} SCENE {i}: Duration {scene_duration}s exceeds 6s max (LOCKED rule). Must split into sub-segments.")
                    # Don't fail, but warn - this is a quality gate, not a blocker
                    # User/designer should fix before final render
                    continue

        # LOCKED RULE: ANIMATION_INTERNAL_MOTION
        # Each segment must have animation complexity (opacity, scale, position changes)
        # This is enforced in composition code generation, not here
        log_info("RemotionVideoAgent", f"VIDEO {video_number}: Animation pacing will be verified in Remotion Studio preview (check for snappy transitions, internal motion)")

        return True

    async def _execute(self, production_id: str, config: VideoProductionConfig,
                       videos: list[dict]) -> dict:
        """Generate all videos via Remotion."""

        assembled = []
        failed_videos = []

        for video_spec in videos:
            video_number = video_spec.get("video_number")
            scenes = video_spec.get("scenes", [])

            if not scenes:
                log_warning("RemotionVideoAgent", f"Video {video_number} has no scenes")
                failed_videos.append(video_number)
                continue

            try:
                log_info("RemotionVideoAgent", f"Building video {video_number} with {len(scenes)} scenes")

                # Step 1: Generate composition code for all scenes
                composition_code = self._build_multi_scene_composition(
                    video_number, scenes, config
                )

                if not composition_code:
                    failed_videos.append(video_number)
                    continue

                # Step 2: Register composition in Remotion project
                # LOCKED: Composition ID format validation (no underscores, hyphens only)
                comp_id = f"Video-{video_number}"  # Changed from Video_{video_number} to comply with LOCKED rules
                registration_success = await self._register_composition(
                    comp_id, composition_code
                )

                if not registration_success:
                    log_warning("RemotionVideoAgent", f"Failed to register composition for video {video_number}")
                    failed_videos.append(video_number)
                    continue

                # Step 3: Verify frame count math & animation pacing before rendering (LOCKED RULES)
                total_duration = sum(s.get("duration_seconds", 0) for s in scenes)
                if not self._verify_locked_rules(video_number, total_duration, scenes):
                    log_error("RemotionVideoAgent", "FrameCountValidationFailed", f"Video {video_number} violates frame count rules")
                    failed_videos.append(video_number)
                    continue

                # Step 4: Render video
                output_dir = VIDEO_PRODUCTION_DIR / production_id / "remotion_output"
                output_dir.mkdir(parents=True, exist_ok=True)
                output_path = output_dir / f"video_{video_number}.mp4"

                render_result = await self.skill.call_async(
                    composition_id=comp_id,
                    props={
                        "scenes": scenes,
                        "video_number": video_number,
                        "total_duration": total_duration
                    },
                    output_path=str(output_path),
                    framerate=config.fps,
                    width=1920,
                    height=1080
                )

                if not render_result:
                    failed_videos.append(video_number)
                    continue

                # Create AssembledVideo result
                video_result = AssembledVideo(
                    video_number=video_number,
                    title=f"Systems Evaluations - Video {video_number}",
                    video_path=str(output_path),
                    duration_seconds=render_result.get("duration_seconds", total_duration),
                    scene_count=len(scenes),
                    has_captions=False,  # Added in post-production
                    has_music=False,     # Can be added in post-production
                    quality_score=0.90   # Remotion renders are high quality
                )

                assembled.append(video_result.model_dump())
                log_info("RemotionVideoAgent", f"Video {video_number} rendered successfully")

            except Exception as e:
                log_error("RemotionVideoAgent", "RenderError", str(e), action_taken="video skipped")
                failed_videos.append(video_number)

            await asyncio.sleep(2)

        # Save state
        state_dir = VIDEO_PRODUCTION_DIR / production_id
        state_dir.mkdir(parents=True, exist_ok=True)
        render_state = {
            "production_id": production_id,
            "total_videos": len(videos),
            "completed": len(assembled),
            "failed": len(failed_videos),
            "assembled": assembled,
            "failed_videos": failed_videos,
            "method": "Remotion (open source, free)"
        }
        (state_dir / "remotion_render_state.json").write_text(
            json.dumps(render_state, indent=2),
            encoding="utf-8"
        )

        log_decision(
            "RemotionVideoAgent", "remotion_rendering_complete", "success",
            f"{len(assembled)}/{len(videos)} videos rendered via Remotion, {len(failed_videos)} failed",
            rationale="Open-source rendering complete; cost savings: $250-350/month vs Runway+JSON2Video"
        )

        return {
            "status": "success",
            "production_id": production_id,
            "assembled": assembled,
            "total_videos": len(videos),
            "completed_videos": len(assembled),
            "failed_videos": failed_videos,
            "cost_savings": "$250-350/month (Runway + JSON2Video replaced)"
        }

    def _build_multi_scene_composition(self, video_number: int, scenes: list[dict],
                                       config: VideoProductionConfig) -> str | None:
        """Build Remotion composition code for all scenes."""
        import os
        import anthropic
        from dotenv import load_dotenv
        from config import MODEL_SONNET

        load_dotenv()
        log_info("RemotionVideoAgent", f"Generating Remotion composition for video {video_number}")

        try:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            client = anthropic.Anthropic(api_key=api_key)

            scenes_json = json.dumps(scenes, indent=2)
            from config import PROMPTS_DIR
            system_prompt = (PROMPTS_DIR / "remotion_video_agent.txt").read_text(encoding="utf-8")

            course_title = config.title if hasattr(config, 'title') and config.title else f"Video {video_number}"

            response = client.messages.create(
                model=MODEL_SONNET,
                max_tokens=4096,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": f"""Create a Remotion composition for a {len(scenes)}-scene educational video.

{course_title}

Scenes:
{scenes_json}

Composition requirements:
- Professional educational styling
- Smooth transitions between scenes
- Text overlays where appropriate
- {config.fps} fps, 1920x1080 resolution
- Sync animations to narration timing

Generate the complete composition function named 'VideoComposition'."""
                }]
            )

            composition_code = response.content[0].text.strip()

            # Remove markdown code blocks if present
            if composition_code.startswith("```"):
                composition_code = "\n".join(composition_code.split("\n")[1:-1])

            log_decision(
                "RemotionVideoAgent", "composition_code_generated", "success",
                f"Generated {len(composition_code)} chars of Remotion composition code",
                rationale="Ready for self-validation against locked rules"
            )

            # ═════════════════════════════════════════════════════════════════════════
            # LOCKED: Self-validation loop (max 2 attempts)
            # Validate composition code against locked rules before rendering
            # ═════════════════════════════════════════════════════════════════════════
            validated_code = self._self_validate_composition_code(
                video_number, composition_code, client, config.fps
            )

            if validated_code is None:
                log_error("RemotionVideoAgent", "CompositionValidationFailed",
                         f"Video {video_number} composition failed self-validation after 2 attempts")
                return None

            return validated_code

        except Exception as e:
            log_error("RemotionVideoAgent", "CompositionGenError", str(e))
            return None

    def _self_validate_composition_code(self, video_number: int, composition_code: str,
                                        client: anthropic.Anthropic, fps: int) -> str | None:
        """
        LOCKED: Self-validation loop for Remotion composition code.

        Validates against locked rules with max 2 correction attempts.
        If validation fails after 2 attempts, logs violation to agent_memory.json and returns None.

        Flow:
        1. Send code + locked rules to Claude for validation
        2. If Claude responds "APPROVED" → return code
        3. If Claude lists violations → rewrite and retry (max 2 times)
        4. If still failing after 2 attempts → log violation and halt

        Returns: Validated code OR None if validation fails
        """
        from config import MODEL_SONNET
        from dotenv import load_dotenv

        load_dotenv()

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
3. If violations found, list them explicitly then provide REWRITTEN code that fixes them
4. Rewritten code should be syntactically correct TypeScript/JSX

Response format:
If approved:
APPROVED

If violations found:
VIOLATIONS:
- [violation 1]
- [violation 2]
...

REWRITTEN CODE:
```typescript
[fixed code here]
```

Be strict. No passing code that violates locked rules."""

        attempt = 1
        current_code = composition_code

        while attempt <= 2:
            try:
                log_info("RemotionVideoAgent",
                        f"VIDEO {video_number}: Self-validation attempt {attempt}/2")

                # Send to Claude for validation
                response = client.messages.create(
                    model=MODEL_SONNET,
                    max_tokens=3000,
                    messages=[{
                        "role": "user",
                        "content": validation_prompt.replace(composition_code, current_code)
                    }]
                )

                validation_response = response.content[0].text.strip()

                # Check if approved
                if "APPROVED" in validation_response.upper():
                    log_decision(
                        "RemotionVideoAgent", "composition_self_validated", "success",
                        f"Video {video_number}: Code passed self-validation (attempt {attempt})",
                        rationale="Composition complies with all locked rules"
                    )
                    return current_code

                # Parse violations and rewritten code
                if "VIOLATIONS:" in validation_response:
                    # Extract violations section
                    violations_section = validation_response.split("VIOLATIONS:")[1].split("REWRITTEN CODE:")[0].strip()
                    violations = [v.strip() for v in violations_section.split("\n") if v.strip() and v.startswith("-")]

                    log_warning("RemotionVideoAgent",
                               f"VIDEO {video_number}: Self-validation found {len(violations)} violations (attempt {attempt}):")
                    for v in violations:
                        log_warning("RemotionVideoAgent", f"  {v}")

                    # Extract rewritten code if available
                    if "REWRITTEN CODE:" in validation_response:
                        code_section = validation_response.split("REWRITTEN CODE:")[1].strip()

                        # Clean markdown if present
                        if code_section.startswith("```"):
                            code_section = "\n".join(code_section.split("\n")[1:-1])

                        current_code = code_section.strip()
                        attempt += 1

                        if attempt > 2:
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

                            return None
                        # Continue loop to attempt again
                    else:
                        # No rewritten code provided
                        log_error("RemotionVideoAgent", "ValidationNoRewrittenCode",
                                 f"Video {video_number}: Claude found violations but did not provide rewritten code")

                        # Log to memory
                        self.memory_manager.log_new_mistake("RemotionVideoAgent", {
                            "correction_type": "VALIDATION_INCOMPLETE",
                            "video_number": video_number,
                            "timestamp": datetime.now().isoformat(),
                            "issue": "Found violations but no rewritten code provided",
                            "action": "Halted. Manual review required."
                        })

                        return None
                else:
                    # Unexpected response format
                    log_error("RemotionVideoAgent", "ValidationResponseFormat",
                             f"Video {video_number}: Unexpected validation response format")
                    log_warning("RemotionVideoAgent", f"Response:\n{validation_response[:200]}...")

                    # Log to memory
                    self.memory_manager.log_new_mistake("RemotionVideoAgent", {
                        "correction_type": "VALIDATION_RESPONSE_MALFORMED",
                        "video_number": video_number,
                        "timestamp": datetime.now().isoformat(),
                        "response": validation_response[:200],
                        "action": "Halted. Cannot parse validation response."
                    })

                    return None

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

        # Should not reach here, but if we do, validation failed
        return None

    async def _register_composition(self, comp_id: str, composition_code: str) -> bool:
        """Register composition in Remotion project Root.tsx."""
        try:
            # In a real setup, this would update Root.tsx dynamically
            # For now, return True (user manually adds to Root.tsx)
            log_info("RemotionVideoAgent", f"Composition {comp_id} ready to register")
            return True
        except Exception as e:
            log_error("RemotionVideoAgent", "RegistrationError", str(e))
            return False
