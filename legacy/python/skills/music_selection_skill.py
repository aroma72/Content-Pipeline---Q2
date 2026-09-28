import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from config import MODEL_HAIKU, PROMPTS_DIR
from logger import log_info, log_error, log_decision
from agents.error_types import AgentError, ErrorType


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


_SYSTEM_PROMPT_TEXT = """You are MusicSelectionSkill — select music that fits educational video scenes.

Given scene descriptions and mood specification, use the select_music tool to recommend music.

Principles:
- Recommend calming, professional music for educational content
- Avoid music with lyrics (educational distraction)
- Consider the overall mood and pacing of the video"""


MUSIC_SELECTION_TOOL = {
    "name": "select_music",
    "description": "Select appropriate music for educational video",
    "input_schema": {
        "type": "object",
        "properties": {
            "style": {
                "type": "string",
                "enum": ["ambient", "cinematic", "energetic", "calm", "corporate", "orchestral", "electronic"],
                "description": "Music style"
            },
            "bpm_range": {
                "type": "string",
                "description": "Tempo range (e.g. '80-100')"
            },
            "keywords": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Search keywords for music platform"
            },
            "epidemic_sound_query": {
                "type": "string",
                "description": "Exact search query for Epidemic Sound platform"
            },
            "duration_seconds": {
                "type": "integer",
                "minimum": 60,
                "maximum": 3600,
                "description": "Recommended track length in seconds"
            },
            "volume_level": {
                "type": "string",
                "enum": ["background", "featured"],
                "description": "Background (ducks during narration) or featured (audible throughout)"
            }
        },
        "required": ["style", "bpm_range", "keywords", "epidemic_sound_query", "duration_seconds", "volume_level"]
    }
}


class MusicSelectionSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_HAIKU

    def call(self, video_number: int, scene_descriptions: list[str], mood_spec: str) -> dict | None:
        """Select appropriate background music for a video using Claude tool."""

        log_info("MusicSelectionSkill", f"Selecting music for video {video_number}")

        try:
            # Claude selects music based on scene and mood using tool
            system_prompt = _load_prompt("music_selection")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=512,
                system=system_prompt,
                tools=[MUSIC_SELECTION_TOOL],
                tool_choice="auto",
                messages=[{
                    "role": "user",
                    "content": f"""Video {video_number}:

Scenes:
{json.dumps(scene_descriptions, indent=2)}

Mood Specification:
{mood_spec}

Use the select_music tool to recommend appropriate music."""
                }]
            )

            # Extract tool use result
            for block in response.content:
                if block.type == "tool_use":
                    data = block.input
                    log_decision(
                        "MusicSelectionSkill", "music_selected", "success",
                        f"Video {video_number}: style={data['style']}, query='{data['epidemic_sound_query']}'",
                        rationale="Tool-validated recommendation; ready for music download"
                    )
                    return data

            log_error("MusicSelectionSkill", "NoToolUse",
                     "Claude did not use the tool",
                     action_taken="returning default recommendation")
            return {
                "style": "ambient",
                "bpm_range": "80-100",
                "keywords": ["calm", "professional"],
                "epidemic_sound_query": "calm background music",
                "duration_seconds": 720,
                "volume_level": "background"
            }

        except Exception as e:
            log_error("MusicSelectionSkill", "SelectionError", str(e),
                     action_taken="returning default recommendation")
            raise AgentError(
                error_type=ErrorType.RETRYABLE,
                message=f"Music selection failed: {str(e)}",
                recovery_suggestion="Retry music selection or use default ambient music"
            )
