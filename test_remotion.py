import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from agents.remotion_video_agent import RemotionVideoAgent
from schemas import VideoProductionConfig

config = VideoProductionConfig(
    series_title="Systems Evaluations",
    script_path="video_scripts/systems_evaluations_video_1.md",
    total_videos=1
)

agent = RemotionVideoAgent("C:\\Users\\Aroma Tahir\\Downloads\\drawing-room-remotion")

# Minimal test: one scene
scenes = [
    {
        "scene_id": "1.1",
        "visual_description": "AI agent working animation",
        "narration_text": "You just built an AI agent",
        "duration_seconds": 30
    }
]

videos = [{"video_number": 1, "scenes": scenes}]

# Run directly
import asyncio
result = asyncio.run(agent.run_async("test_remotion_direct", config, videos))
print("Result:", result)
