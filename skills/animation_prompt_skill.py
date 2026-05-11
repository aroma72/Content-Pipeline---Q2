import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from config import MODEL_SONNET
from logger import log_info, log_error, log_decision
from agents.error_types import AgentError, ErrorType


SYSTEM_PROMPT = """You are AnimationPromptSkill — convert storyboard descriptions into precise animation prompts.

Given a scene's visual description and animation specification, generate structured output using the generate_animation_prompt tool.

Be specific and visual: include colors, shapes, movement, mood, and lighting details."""


ANIMATION_PROMPT_TOOL = {
    "name": "generate_animation_prompt",
    "description": "Generate animation prompt for video generation",
    "input_schema": {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "Concise visual description (50-200 words) with colors, shapes, movement"
            },
            "negative_prompt": {
                "type": "string",
                "description": "Things to avoid (dark, blurry, text, watermarks)"
            },
            "duration": {
                "type": "integer",
                "minimum": 5,
                "maximum": 30,
                "description": "Video length in seconds"
            },
            "camera_motion": {
                "type": "string",
                "enum": ["static", "pan_left", "pan_right", "zoom_in", "zoom_out", "dolly_forward", "dolly_backward"],
                "description": "Camera movement type"
            }
        },
        "required": ["prompt", "negative_prompt", "duration", "camera_motion"]
    }
}


class AnimationPromptSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_SONNET

    def call(self, scene_id: str, visual_description: str, animation_spec: str) -> dict | None:
        """Convert storyboard text to animation prompt using Claude tool."""

        log_info("AnimationPromptSkill", f"Building prompt for scene {scene_id}")

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                tools=[ANIMATION_PROMPT_TOOL],
                tool_choice="auto",
                messages=[{
                    "role": "user",
                    "content": f"""Scene: {scene_id}

Visual Description:
{visual_description}

Animation Specification:
{animation_spec}

Use the generate_animation_prompt tool to provide structured output."""
                }]
            )

            # Extract tool use result
            for block in response.content:
                if block.type == "tool_use":
                    data = block.input
                    log_decision(
                        "AnimationPromptSkill", "prompt_generated", "success",
                        f"Scene {scene_id}: {data['duration']}s, camera={data['camera_motion']}",
                        rationale="Tool-validated output; ready for animation generation"
                    )
                    return data

            log_error("AnimationPromptSkill", "NoToolUse",
                     "Claude did not use the tool",
                     action_taken="returning None")
            return None

        except Exception as e:
            log_error("AnimationPromptSkill", "GenerationError", str(e), action_taken="returning None")
            raise AgentError(
                error_type=ErrorType.RETRYABLE,
                message=f"Animation prompt generation failed: {str(e)}",
                recovery_suggestion="Retry with different visual description"
            )
