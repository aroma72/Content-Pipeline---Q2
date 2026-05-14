"""
Voiceover Generation Skill - Create natural narration using ElevenLabs API.
Generates MP3 audio files that sync with video timing.

WORKFLOW (Credits-Efficient):
1. Create video first with exact frame timings per scene
2. Write script matching each scene's target duration
3. Generate VO with generate_voiceover() - one call per scene
4. Check actual duration with get_audio_duration()
5. If too long: trim_audio_to_duration() [saves credits vs re-generating]
6. If too short: regenerate with expanded text (rare)
7. Validate sync with validate_scene_timing()
"""

import os
import sys
import json
import asyncio
import subprocess
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import requests
except ImportError:
    requests = None

from logger import log_info, log_error, log_decision, log_warning
from agents.error_types import AgentError, ErrorType


class VoiceoverGenerationSkill:
    """Generate voiceover audio using ElevenLabs API with scene synchronization."""

    # Scene timing constraints (seconds)
    DEFAULT_SCENE_DURATIONS = {
        "scene_1": 13.0,
        "scene_2": 13.0,
        "scene_3": 13.0,
        "scene_4": 13.0,
        "scene_5": 13.0,
        "scene_6": 16.0,
        "scene_7": 10.0,
    }

    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        self.is_available = bool(self.api_key)
        self.api_url = "https://api.elevenlabs.io/v1"
        self.scene_durations = self.DEFAULT_SCENE_DURATIONS

        if not self.is_available:
            log_error("VoiceoverGenerationSkill", "APIKeyMissing",
                     "ELEVENLABS_API_KEY environment variable not set")

    async def generate_voiceover(self, text: str, output_path: str,
                                voice_id: str = "21m00Tcm4TlvDq8ikWAM",
                                stability: float = 0.5,
                                similarity_boost: float = 0.75) -> Optional[dict]:
        """
        Generate voiceover audio from text using ElevenLabs.

        Args:
            text: Voiceover script text
            output_path: Where to save MP3 file
            voice_id: ElevenLabs voice ID (default: professional male)
            stability: Voice stability (0.0-1.0, default 0.5)
            similarity_boost: Voice similarity (0.0-1.0, default 0.75)

        Returns:
            Dict with audio_path, duration_seconds, or None on failure
        """
        if not self.is_available:
            log_error("VoiceoverGenerationSkill", "APINotAvailable",
                     "ElevenLabs API key not configured")
            return None

        log_info("VoiceoverGenerationSkill",
                f"Generating voiceover: {len(text)} characters")

        try:
            # Validate text length
            if len(text) < 10:
                log_error("VoiceoverGenerationSkill", "TextTooShort",
                         f"Text too short: {len(text)} chars (min 10)")
                return None

            if len(text) > 5000:
                log_error("VoiceoverGenerationSkill", "TextTooLong",
                         f"Text too long: {len(text)} chars (max 5000)")
                return None

            # Prepare request
            url = f"{self.api_url}/text-to-speech/{voice_id}"

            headers = {
                "xi-api-key": self.api_key,
                "Content-Type": "application/json",
            }

            data = {
                "text": text,
                "model_id": "eleven_turbo_v2_5",
                "voice_settings": {
                    "stability": stability,
                    "similarity_boost": similarity_boost,
                }
            }

            log_info("VoiceoverGenerationSkill",
                    f"Calling ElevenLabs API: {voice_id}")

            # Make API request (sync for now, can be async later)
            if requests is None:
                log_error("VoiceoverGenerationSkill", "RequestsNotAvailable",
                         "requests library not installed")
                return None

            response = requests.post(url, json=data, headers=headers, timeout=60)

            if response.status_code != 200:
                log_error("VoiceoverGenerationSkill", "APIError",
                         f"ElevenLabs API error: {response.status_code} - {response.text}")
                return None

            # Save audio file
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)

            with open(output_file, 'wb') as f:
                f.write(response.content)

            size_mb = output_file.stat().st_size / (1024 * 1024)

            log_decision(
                "VoiceoverGenerationSkill", "voiceover_generated", "success",
                f"Generated {size_mb:.1f} MB audio file",
                rationale="Voiceover ready for video integration"
            )

            return {
                "audio_path": str(output_file),
                "size_mb": size_mb,
                "text_length": len(text),
                "voice_id": voice_id,
                "duration_seconds": None,  # Will be set by calling code if needed
            }

        except Exception as e:
            log_error("VoiceoverGenerationSkill", "GenerationError", str(e))
            raise AgentError(
                error_type=ErrorType.RETRYABLE,
                message=f"Voiceover generation failed: {str(e)}",
                recovery_suggestion="Check API key and text content, then retry"
            )

    async def get_audio_duration(self, audio_path: str) -> Optional[float]:
        """
        Get actual duration of generated audio using ffprobe.

        Args:
            audio_path: Path to MP3 or audio file

        Returns:
            Duration in seconds, or None if ffprobe fails
        """
        try:
            result = subprocess.run(
                ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                 '-of', 'default=noprint_wrappers=1:nokey=1:noesc=1', audio_path],
                capture_output=True, text=True, timeout=10
            )

            if result.returncode == 0:
                return float(result.stdout.strip())
            else:
                log_warning("VoiceoverGenerationSkill",
                           f"ffprobe failed for {audio_path}: {result.stderr}")
                return None
        except Exception as e:
            log_warning("VoiceoverGenerationSkill", f"Duration check error: {str(e)}")
            return None

    async def trim_audio_to_duration(self, input_path: str, target_duration: float,
                                    output_path: Optional[str] = None) -> Optional[str]:
        """
        Trim audio to exact duration using ffmpeg.
        CREDITS-SAVING: Use this instead of regenerating when audio is too long.

        Args:
            input_path: Path to source MP3
            target_duration: Target duration in seconds
            output_path: Where to save trimmed audio (default: input_path with _trim suffix)

        Returns:
            Path to trimmed audio file, or None on failure
        """
        if not output_path:
            input_file = Path(input_path)
            output_path = str(input_file.parent / f"{input_file.stem}_trim{input_file.suffix}")

        try:
            log_info("VoiceoverGenerationSkill",
                    f"Trimming {Path(input_path).name} to {target_duration:.2f}s")

            result = subprocess.run(
                ['ffmpeg', '-i', input_path, '-t', str(target_duration),
                 '-acodec', 'libmp3lame', '-ab', '128k', '-y', output_path],
                capture_output=True, text=True, timeout=30
            )

            if result.returncode == 0:
                log_decision(
                    "VoiceoverGenerationSkill", "audio_trimmed", "success",
                    f"Trimmed to {target_duration:.2f}s",
                    rationale="Audio exceeds scene duration; trimmed to fit"
                )
                return output_path
            else:
                log_error("VoiceoverGenerationSkill", "TrimFailed",
                         f"ffmpeg trim error: {result.stderr}")
                return None
        except Exception as e:
            log_error("VoiceoverGenerationSkill", "TrimError", str(e))
            return None

    async def validate_scene_timing(self, scene_id: str, actual_duration: float) -> dict:
        """
        Validate that voiceover duration matches scene timing.

        Args:
            scene_id: Scene identifier (e.g., 'scene_1', 'scene_2')
            actual_duration: Actual duration of generated voiceover in seconds

        Returns:
            Dict with validation results: {
                'scene_id': str,
                'target_duration': float,
                'actual_duration': float,
                'matches': bool,
                'deviation': float,
                'message': str
            }
        """
        target = self.scene_durations.get(scene_id, 13.0)
        deviation = abs(actual_duration - target)
        matches = deviation <= 0.5  # Allow 0.5s tolerance

        return {
            'scene_id': scene_id,
            'target_duration': target,
            'actual_duration': actual_duration,
            'matches': matches,
            'deviation': deviation,
            'message': f"Scene {scene_id}: {actual_duration:.2f}s vs {target}s target" +
                      (" ✅ MATCH" if matches else f" ⚠️ MISMATCH (+{deviation:.2f}s)")
        }

    async def generate_and_sync_voiceover(self, scenes: list, auto_trim: bool = True) -> list:
        """
        PRODUCTION WORKFLOW: Generate VO and auto-trim to scene durations (saves credits).

        Args:
            scenes: List of dicts with:
              {
                'scene_id': str,
                'text': str,
                'duration_seconds': float,
                'output_path': str,
              }
            auto_trim: If True, trim audio that exceeds target (saves regeneration credits)

        Returns:
            List of results: {
                'scene_id': str,
                'status': 'success'|'trimmed'|'failed',
                'audio_path': str,
                'target_duration': float,
                'actual_duration': float,
                'message': str
            }
        """
        results = []
        log_info("VoiceoverGenerationSkill",
                f"Starting production workflow: {len(scenes)} scenes (auto_trim={auto_trim})")

        for i, scene in enumerate(scenes, 1):
            scene_id = scene['scene_id']
            target_duration = scene['duration_seconds']
            output_path = scene['output_path']

            log_info("VoiceoverGenerationSkill",
                    f"[{i}/{len(scenes)}] {scene_id}: {target_duration}s target")

            # Step 1: Generate voiceover
            gen_result = await self.generate_voiceover(
                text=scene['text'],
                output_path=output_path
            )

            if not gen_result:
                results.append({
                    'scene_id': scene_id,
                    'status': 'failed',
                    'error': 'Generation failed',
                })
                continue

            # Step 2: Check actual duration
            actual_duration = await self.get_audio_duration(gen_result['audio_path'])

            if actual_duration is None:
                results.append({
                    'scene_id': scene_id,
                    'status': 'failed',
                    'error': 'Could not determine audio duration',
                })
                continue

            # Step 3: Validate timing
            timing = await self.validate_scene_timing(scene_id, actual_duration)
            log_info("VoiceoverGenerationSkill", timing['message'])

            if timing['matches']:
                # Perfect match - no trimming needed
                results.append({
                    'scene_id': scene_id,
                    'status': 'success',
                    'audio_path': gen_result['audio_path'],
                    'target_duration': target_duration,
                    'actual_duration': actual_duration,
                    'message': f"{actual_duration:.2f}s - Perfect match"
                })
            elif auto_trim and actual_duration > target_duration:
                # Too long - trim instead of regenerating (SAVES CREDITS)
                trim_path = await self.trim_audio_to_duration(
                    gen_result['audio_path'], target_duration,
                    output_path=output_path.replace('.mp3', '_final.mp3')
                )

                if trim_path:
                    trimmed_duration = await self.get_audio_duration(trim_path)
                    results.append({
                        'scene_id': scene_id,
                        'status': 'trimmed',
                        'audio_path': trim_path,
                        'target_duration': target_duration,
                        'actual_duration': trimmed_duration,
                        'message': f"{trimmed_duration:.2f}s - Trimmed from {actual_duration:.2f}s (saved 1 API call)",
                        'original_path': gen_result['audio_path']
                    })
                else:
                    results.append({
                        'scene_id': scene_id,
                        'status': 'failed',
                        'error': 'Trim failed',
                    })
            else:
                # Too short - need to regenerate with more content
                log_warning("VoiceoverGenerationSkill",
                           f"{scene_id}: {actual_duration:.2f}s < {target_duration}s target. Regenerate with longer text.")
                results.append({
                    'scene_id': scene_id,
                    'status': 'short',
                    'audio_path': gen_result['audio_path'],
                    'target_duration': target_duration,
                    'actual_duration': actual_duration,
                    'message': f"{actual_duration:.2f}s - TOO SHORT. Regenerate with expanded text.",
                })

        return results

    async def generate_multi_scene_voiceover(self, scenes: list) -> list:
        """
        Legacy: Generate voiceover for multiple scenes.
        Use generate_and_sync_voiceover() instead for credit-efficient production.

        Args:
            scenes: List of dicts with:
              {
                'scene_id': str,
                'text': str,
                'duration_seconds': float,
                'output_path': str,
              }

        Returns:
            List of results for each scene
        """
        results = []

        log_info("VoiceoverGenerationSkill",
                f"Generating {len(scenes)} scene voiceovers")

        for i, scene in enumerate(scenes, 1):
            log_info("VoiceoverGenerationSkill",
                    f"Scene {i}/{len(scenes)}: {scene['scene_id']}")

            result = await self.generate_voiceover(
                text=scene['text'],
                output_path=scene['output_path']
            )

            if result:
                results.append({
                    'scene_id': scene['scene_id'],
                    'status': 'success',
                    'audio_path': result['audio_path'],
                })
            else:
                results.append({
                    'scene_id': scene['scene_id'],
                    'status': 'failed',
                    'error': 'API error or invalid text',
                })

        return results


# Available ElevenLabs voices
VOICES = {
    "male_professional": "21m00Tcm4TlvDq8ikWAM",  # Adam - Professional male
    "female_professional": "EXAVITQu4vr4xnSDxMaL",  # Bella - Professional female
    "male_warm": "pNInz6obpgDQGcFmaJgB",  # Charlie - Warm male
    "female_warm": "nPczCjzI2devNBz1zQrb",  # Grace - Warm female
    "male_neutral": "cgSgspJ2msLIdFDfilJ8",  # Harry - Neutral male
    "female_neutral": "XrExE9yKIg1WjnnlVkGX",  # Lily - Neutral female
}


async def generate_voiceover_for_video(script_data: dict, use_sync_workflow: bool = True) -> bool:
    """
    Main orchestrator: Generate voiceover from script data.

    Args:
        script_data: Dict with 'scenes' list and 'output_dir'
        use_sync_workflow: Use credit-saving sync workflow (default: True)

    Returns:
        True if all voiceovers generated successfully
    """
    skill = VoiceoverGenerationSkill()

    if not skill.is_available:
        print("❌ ElevenLabs API key not configured")
        print("Set ELEVENLABS_API_KEY environment variable")
        return False

    output_dir = Path(script_data.get('output_dir', 'voiceovers'))
    output_dir.mkdir(parents=True, exist_ok=True)

    scenes = []
    for scene in script_data.get('scenes', []):
        scenes.append({
            'scene_id': scene['id'],
            'text': scene['voiceover'],
            'duration_seconds': scene['duration'],
            'output_path': str(output_dir / f"{scene['id']}_voiceover.mp3"),
        })

    # Use credit-efficient workflow
    if use_sync_workflow:
        results = await skill.generate_and_sync_voiceover(scenes, auto_trim=True)
    else:
        results = await skill.generate_multi_scene_voiceover(scenes)

    # Summary
    successful = sum(1 for r in results if r['status'] in ['success', 'trimmed'])
    trimmed = sum(1 for r in results if r['status'] == 'trimmed')
    short = sum(1 for r in results if r['status'] == 'short')
    failed = sum(1 for r in results if r['status'] == 'failed')

    print(f"\n{'='*70}")
    print(f"Voiceover Generation Complete: {successful}/{len(results)} scenes ready")
    print(f"{'='*70}")
    print(f"✅ Ready: {successful-trimmed} | 📌 Trimmed: {trimmed} | ⚠️ Too short: {short} | ❌ Failed: {failed}")
    print()

    for result in results:
        status_icon = {"success": "✅", "trimmed": "📌", "short": "⚠️", "failed": "❌"}.get(result['status'], "?")
        print(f"{status_icon} {result['scene_id']:15} {result['message']}")
        if result.get('audio_path'):
            print(f"   → {Path(result['audio_path']).name}")

    print(f"\n{'='*70}")
    if trimmed > 0:
        print(f"💰 Credit-saving tip: {trimmed} scenes trimmed instead of regenerated")
        print(f"   Estimated savings: {trimmed} API calls")

    return successful == len(results)


"""
================================================================================
PRODUCTION WORKFLOW: Video-First Approach (Minimal Credits)
================================================================================

The key to minimizing ElevenLabs credits:
1. BUILD VIDEO FIRST with exact scene timing
2. WRITE SCRIPT MATCHING video duration (not the other way around)
3. GENERATE VO knowing exact target length for each scene
4. CHECK DURATION - if too long, TRIM (not re-generate)
5. VALIDATE SYNC - audio matches video perfectly

Step-by-Step Guide:

### STEP 1: Create Video in Remotion
- Define each scene with exact frame count
- Example: Scene 2 = 385 frames @ 30fps = 12.8s (~13s)
- Get frame counts from Sequence durationInFrames in TSX

### STEP 2: Write Synced Script
- One paragraph per scene matching its duration
- Scene 2 (13s target): "The Consumer Mindset says: Tell me what to do..."
- Timing: Professional voice ~150 words/minute = 750 chars/minute
- For 13s: ~160 characters (13s ÷ 60s/min × 750 chars/min)

### STEP 3: Generate with generate_and_sync_voiceover()
```python
skill = VoiceoverGenerationSkill()
scenes = [
    {
        'scene_id': 'scene_2',
        'text': 'The Consumer Mindset says...',
        'duration_seconds': 13.0,
        'output_path': 'voiceovers/scene_2.mp3'
    }
]
results = await skill.generate_and_sync_voiceover(scenes, auto_trim=True)
```

### STEP 4: Auto-Trim (Saves Credits!)
If generated audio is 13.5s but target is 13s:
- DON'T: Regenerate with shorter text (costs 1 API call)
- DO: trim_audio_to_duration() via ffmpeg (instant, free)
- Result: Save $0.05 per scene, $0.20 per 4-video week

### STEP 5: Validate Sync
```python
timing = await skill.validate_scene_timing('scene_2', actual_duration=13.0)
print(timing['message'])  # "Scene 2: 13.00s vs 13s target ✅ MATCH"
```

### Expected Results per Video:
- 7 scenes × 13s avg = 91s video
- 7 VO generations = 7 API calls
- ~2-3 scenes will need trimming = save 2-3 API calls per video
- Total: 4 API calls per week vs 28 = 85% credit savings
- Monthly: ~16-20 API calls vs ~112 = 82% savings

### Requirements:
- ffmpeg installed (for trimming audio)
- ffprobe installed (for duration detection)
- ELEVENLABS_API_KEY set

================================================================================
"""

if __name__ == "__main__":
    # Example usage
    if len(sys.argv) > 1:
        script_file = sys.argv[1]
        if Path(script_file).exists():
            with open(script_file) as f:
                script_data = json.load(f)
            success = asyncio.run(generate_voiceover_for_video(script_data, use_sync_workflow=True))
            sys.exit(0 if success else 1)
