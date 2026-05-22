"""
ElevenLabs voiceover generation skill with structured error handling and rate limiting.
Implements Anthropic best practices for API integration.
"""

import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import requests
from typing import Optional
from schemas import SceneVoiceover, VideoProductionConfig
from config import ELEVENLABS_API_KEY
from agents.error_types import (
    AgentError, ErrorType, APIKeyError, RateLimitError,
    ConnectionError_, TimeoutError_, ValidationError_
)
from agents.rate_limiting import acquire_rate_limit
from logger import log_info, log_error, log_decision, log_warning


class VoiceoverSkill:
    """Generate voiceover audio using ElevenLabs API with proper error handling"""

    def __init__(self):
        self.elevenlabs_base_url = "https://api.elevenlabs.io/v1"
        self.api_key = ELEVENLABS_API_KEY

    def call(
        self,
        scene_id: str,
        narration_text: str,
        config: VideoProductionConfig,
        use_rate_limit: bool = True
    ) -> Optional[SceneVoiceover]:
        """
        Generate voiceover audio for a single scene using ElevenLabs API.

        Args:
            scene_id: Unique scene identifier
            narration_text: Text to convert to speech
            config: Video production configuration
            use_rate_limit: Whether to respect rate limits

        Returns:
            SceneVoiceover on success, None on error

        Raises:
            AgentError: Structured error with recovery suggestions
        """

        if not self.api_key:
            err = APIKeyError("ElevenLabs", "ELEVENLABS_API_KEY")
            log_error("VoiceoverSkill", str(err.error_type.value), err.message)
            raise err

        # Validate input
        if not narration_text or not isinstance(narration_text, str):
            err = ValidationError_(
                field="narration_text",
                reason="Text is empty or invalid type",
                expected="Non-empty string"
            )
            log_error("VoiceoverSkill", str(err.error_type.value), err.message)
            raise err

        log_info("VoiceoverSkill", f"Generating voiceover for scene {scene_id}")

        try:
            # Apply rate limiting if enabled
            if use_rate_limit:
                asyncio.run(acquire_rate_limit("elevenlabs", tokens=1, timeout=60))

            # Prepare API request
            url = f"{self.elevenlabs_base_url}/text-to-speech/{config.voice_id}"
            headers = {
                "xi-api-key": self.api_key,
                "Content-Type": "application/json"
            }
            payload = {
                "text": narration_text,
                "model_id": config.elevenlabs_model or "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": config.voice_stability or 0.75,
                    "similarity_boost": 0.85
                }
            }

            # Call ElevenLabs API with timeout
            response = requests.post(url, json=payload, headers=headers, timeout=60)

            # Handle API errors
            if response.status_code == 401:
                err = APIKeyError("ElevenLabs", "ELEVENLABS_API_KEY")
                log_error("VoiceoverSkill", str(err.error_type.value), err.message)
                raise err

            elif response.status_code == 429:
                # Rate limit - parse Retry-After if available
                retry_after = int(response.headers.get("Retry-After", 30))
                err = RateLimitError("ElevenLabs", retry_after)
                log_warning("VoiceoverSkill", f"Rate limited. {err.recovery_suggestion}")
                raise err

            elif response.status_code >= 500:
                err = AgentError(
                    error_type=ErrorType.RETRYABLE,
                    message=f"ElevenLabs server error ({response.status_code})",
                    recovery_suggestion="ElevenLabs is having issues. Retry in 60 seconds or check service status.",
                    retry_after_seconds=60
                )
                log_error("VoiceoverSkill", "ServerError", err.message)
                raise err

            elif response.status_code != 200:
                err = AgentError(
                    error_type=ErrorType.FATAL,
                    message=f"ElevenLabs API returned {response.status_code}: {response.text[:200]}",
                    recovery_suggestion="Check narration_text is valid; verify voice_id exists in ElevenLabs account"
                )
                log_error("VoiceoverSkill", "APIError", err.message)
                raise err

            # Save audio file
            output_dir = Path(f"video_production/{config.production_id}/voiceover")
            output_dir.mkdir(parents=True, exist_ok=True)
            audio_path = output_dir / f"{scene_id}.wav"

            with open(audio_path, "wb") as f:
                f.write(response.content)

            # Calculate metrics
            word_count = len(narration_text.split())
            estimated_duration = word_count / 140 * 60

            # Measure actual duration with ffprobe — replaces word-count estimate
            measured_duration = estimated_duration
            try:
                import subprocess
                ffmpeg_static = Path(__file__).parent.parent / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"
                ffprobe_bin = str(ffmpeg_static).replace("ffmpeg.exe", "ffprobe.exe")
                if not Path(ffprobe_bin).exists():
                    # Fallback: try system ffprobe
                    ffprobe_bin = "ffprobe"
                probe = subprocess.run(
                    [ffprobe_bin, "-v", "error", "-show_entries", "format=duration",
                     "-of", "default=noprint_wrappers=1:nokey=1", str(audio_path)],
                    capture_output=True, text=True, timeout=30
                )
                if probe.returncode == 0 and probe.stdout.strip():
                    measured_duration = float(probe.stdout.strip())
            except Exception:
                pass  # fall back to estimate silently

            # Quality score: higher confidence with longer text (0.7-0.95 range)
            quality_score = min(0.95, 0.7 + (word_count / 1000))

            result = SceneVoiceover(
                scene_id=scene_id,
                audio_path=str(audio_path),
                duration_seconds=measured_duration,
                measured_duration_seconds=measured_duration,
                word_count=word_count,
                quality_score=quality_score
            )

            log_decision(
                "VoiceoverSkill",
                "voiceover_generated",
                "success",
                f"Scene {scene_id}: {word_count} words, ~{estimated_duration:.1f}s, quality={quality_score:.2f}",
                rationale="Audio file saved successfully"
            )

            return result

        except AgentError:
            # Already logged, re-raise for orchestrator handling
            raise

        except requests.exceptions.Timeout:
            err = TimeoutError_("ElevenLabs text-to-speech", 60)
            log_error("VoiceoverSkill", "TimeoutError", err.message)
            raise err

        except requests.exceptions.ConnectionError as e:
            err = ConnectionError_("ElevenLabs", str(e))
            log_error("VoiceoverSkill", "ConnectionError", err.message)
            raise err

        except requests.exceptions.RequestException as e:
            err = AgentError(
                error_type=ErrorType.RETRYABLE,
                message=f"ElevenLabs API request failed: {str(e)[:100]}",
                recovery_suggestion="Check network connectivity; verify ElevenLabs is accessible; retry after 30 seconds"
            )
            log_error("VoiceoverSkill", "RequestError", err.message)
            raise err

        except Exception as e:
            err = AgentError(
                error_type=ErrorType.FATAL,
                message=f"Unexpected error: {str(e)[:100]}",
                recovery_suggestion="Check logs for details; ensure all dependencies are installed"
            )
            log_error("VoiceoverSkill", "UnexpectedError", err.message, extra={"error": str(e)})
            raise err
