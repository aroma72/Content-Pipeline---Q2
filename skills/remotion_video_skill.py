import asyncio
import json
import sys
import subprocess
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from logger import log_info, log_error, log_decision, log_warning
from agents.error_types import AgentError, ErrorType


class RemotionVideoSkill:
    """Generate videos programmatically using Remotion (React video framework)."""

    def __init__(self, remotion_project_dir: str | None = None):
        """
        Initialize Remotion skill.

        Args:
            remotion_project_dir: Path to Remotion project (auto-detect if None)
        """
        self.remotion_dir = Path(remotion_project_dir) if remotion_project_dir else self._find_remotion_project()
        self.is_available = self.remotion_dir and (self.remotion_dir / "package.json").exists()

    async def call_async(self, composition_id: str, props: dict, output_path: str,
                         framerate: int = 30, width: int = 1920, height: int = 1080) -> dict | None:
        """
        Async: Render a video using Remotion composition.

        Args:
            composition_id: Name of React composition in Remotion project
            props: Dict of props to pass to the composition
            output_path: Where to save rendered MP4
            framerate: Video framerate (default 30)
            width: Video width (default 1920)
            height: Video height (default 1080)

        Returns:
            Dict with render_id, video_path, duration_seconds, or None on failure
        """
        log_info("RemotionVideoSkill", f"Rendering composition: {composition_id}")

        if not self.is_available:
            log_warning("RemotionVideoSkill", "Remotion not configured; returning instructions")
            return self._generate_setup_instructions()

        try:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)

            # Build Remotion CLI command
            cmd = [
                "npx",
                "remotion",
                "render",
                str(self.remotion_dir),
                composition_id,
                str(output_file),
                "--fps", str(framerate),
                "--width", str(width),
                "--height", str(height),
                "--allow-downgrade"
            ]

            # Add props as JSON string
            if props:
                cmd.extend(["--props", json.dumps(props)])

            log_info("RemotionVideoSkill", f"Executing: {' '.join(cmd[:5])}...")

            # Non-blocking subprocess execution
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.remotion_dir)
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=3600  # 1 hour
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                log_error("RemotionVideoSkill", "Timeout", f"Render timed out for {composition_id}")
                raise AgentError(
                    error_type=ErrorType.RETRYABLE,
                    message=f"Remotion render timeout for {composition_id}",
                    recovery_suggestion="Increase timeout or check system resources"
                )

            if proc.returncode != 0:
                log_error("RemotionVideoSkill", "RenderError", stderr.decode() if stderr else stdout.decode())
                raise AgentError(
                    error_type=ErrorType.RETRYABLE,
                    message=f"Remotion render failed: {stderr.decode() if stderr else 'unknown error'}",
                    recovery_suggestion="Check Remotion project setup and composition syntax"
                )

            if not output_file.exists():
                log_error("RemotionVideoSkill", "NoOutput", f"Render succeeded but file not created")
                raise AgentError(
                    error_type=ErrorType.FATAL,
                    message="Remotion render completed but output file not created",
                    recovery_suggestion="Check output directory permissions"
                )

            # Get video duration by probing with ffprobe
            duration = await self._get_video_duration_async(str(output_file))

            log_decision(
                "RemotionVideoSkill", "video_rendered", "success",
                f"Composition {composition_id}: {width}x{height}@{framerate}fps, {duration:.1f}s",
                rationale="Video rendered locally via Remotion"
            )

            return {
                "status": "success",
                "video_path": str(output_file),
                "duration_seconds": duration,
                "width": width,
                "height": height,
                "framerate": framerate,
                "composition_id": composition_id
            }

        except AgentError:
            raise
        except Exception as e:
            log_error("RemotionVideoSkill", "RenderError", str(e))
            raise AgentError(
                error_type=ErrorType.RETRYABLE,
                message=f"Remotion render error: {str(e)}",
                recovery_suggestion="Check Remotion installation and Node.js availability"
            )

    def call(self, composition_id: str, props: dict, output_path: str,
             framerate: int = 30, width: int = 1920, height: int = 1080) -> dict | None:
        """
        Sync wrapper for call_async. Blocks on async render.

        Deprecated: use call_async() for non-blocking execution.
        """
        try:
            return asyncio.run(self.call_async(composition_id, props, output_path, framerate, width, height))
        except AgentError:
            return None
        except Exception as e:
            log_error("RemotionVideoSkill", "SyncWrapperError", str(e))
            return None

    def generate_composition(self, scene_id: str, visual_description: str,
                           narration_duration: float, prompt: str) -> dict | None:
        """
        Generate a Remotion composition from a prompt using Claude.

        Args:
            scene_id: Scene identifier
            visual_description: What should appear visually
            narration_duration: How long the voiceover is (in seconds)
            prompt: Claude prompt describing the video style/layout

        Returns:
            Dict with composition_code and composition_id for registration
        """
        import anthropic
        from config import MODEL_HAIKU

        log_info("RemotionVideoSkill", f"Generating composition code for {scene_id}")

        try:
            client = anthropic.Anthropic()

            system_prompt = """You are a Remotion video code generator. Write React/TypeScript code for a Remotion composition.

Generate ONLY the composition function (no imports, no registration). The function receives props with:
- narrationDuration: number (seconds of voiceover)
- visuals: array of visual elements to animate
- text: string (any text to display)

Use Remotion hooks: useVideoConfig(), interpolate(), spring(), etc.
Use standard HTML5 and CSS for styling.

Return ONLY valid TypeScript/JSX code with no markdown backticks or explanations."""

            response = client.messages.create(
                model=MODEL_HAIKU,
                max_tokens=1024,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": f"""
Scene: {scene_id}
Duration: {narration_duration}s
Visual Description: {visual_description}

Style/Layout Prompt:
{prompt}

Generate a Remotion composition function called 'MyScene' that:
1. Animates in sync with the {narration_duration}s narration
2. Displays the visual elements described
3. Uses professional transitions and typography
4. Targets 1920x1080 at 30fps
"""
                }]
            )

            composition_code = response.content[0].text.strip()

            log_decision(
                "RemotionVideoSkill", "composition_generated", "success",
                f"Generated React/TSX code for {scene_id} ({len(composition_code)} chars)",
                rationale="Ready to register in Remotion project"
            )

            return {
                "status": "success",
                "composition_id": f"Scene_{scene_id.replace('.', '_')}",
                "composition_code": composition_code,
                "scene_id": scene_id,
                "duration_seconds": narration_duration
            }

        except Exception as e:
            log_error("RemotionVideoSkill", "CodeGenError", str(e))
            return None

    @staticmethod
    async def _get_video_duration_async(video_path: str) -> float:
        """Async: Get video duration in seconds using ffprobe."""
        try:
            proc = await asyncio.create_subprocess_exec(
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1:noprint_indexes=1",
                video_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=10
                )
                if proc.returncode == 0:
                    return float(stdout.decode().strip())
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
        except:
            pass
        return 0.0

    @staticmethod
    def _get_video_duration(video_path: str) -> float:
        """Get video duration in seconds using ffprobe."""
        try:
            result = subprocess.run(
                [
                    "ffprobe",
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1:noprint_indexes=1",
                    video_path
                ],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                return float(result.stdout.strip())
        except:
            pass
        return 0.0

    @staticmethod
    def _find_remotion_project() -> Path | None:
        """Auto-detect Remotion project directory."""
        candidates = [
            Path.cwd() / "remotion",
            Path.cwd() / "video_project",
            Path.cwd() / ".remotion"
        ]
        for path in candidates:
            if (path / "package.json").exists():
                return path
        return None

    @staticmethod
    def _generate_setup_instructions() -> dict:
        """Return instructions for setting up Remotion."""
        log_info("RemotionVideoSkill", "Remotion not found; returning setup instructions")

        return {
            "status": "not_configured",
            "instructions": """
Remotion is not configured. To set up:

1. Install Remotion template:
   npx create-remotion@latest my-video

2. Create a composition file (src/MyComposition.tsx):
   import { AbsoluteFill, Sequence, Img } from 'remotion';

   export const MyScene: React.FC<{ duration: number }> = ({ duration }) => (
     <AbsoluteFill style={{ background: 'white' }}>
       {/* Your animation here */}
     </AbsoluteFill>
   );

3. Register in src/Root.tsx:
   registerRoot(Root);

4. Render with:
   npx remotion render src/Root.tsx MyScene output.mp4

See: https://www.remotion.dev/
""",
            "costs": "FREE (open source)",
            "benefits": [
                "Replace Runway Gen-4 ($80-150/mo)",
                "Replace JSON2Video ($100-200/mo)",
                "Full creative control via React",
                "Can render locally or serverlessly (Lambda)"
            ]
        }
