#!/usr/bin/env python
"""Test the Remotion orchestrator with Systems Evaluations Video 1."""
import sys
from pathlib import Path
from schemas import VideoProductionConfig
from video_production_orchestrator_remotion import VideoProductionOrchestratorRemotionEdition

config = VideoProductionConfig(
    production_id="systems_eval_video_1_test",
    series_title="Systems Evaluations",
    script_path=r"c:\Users\Aroma Tahir\Downloads\Content Queen\video_scripts\systems_evaluations_video_1.md",
    total_videos=1
)

print(f"Starting Remotion Video Production")
print(f"  Production ID: {config.production_id}")
print(f"  Script: {config.script_path}")
print(f"  Series: {config.series_title}")
print()

orchestrator = VideoProductionOrchestratorRemotionEdition(
    config,
    remotion_project_dir=r"c:\Users\Aroma Tahir\Downloads\drawing-room-remotion"
)

result = orchestrator.run()

print(f"\nProduction Status: {result.get('status')}")
if result.get('status') == 'complete':
    print(f"Videos created successfully")
    if 'urls' in result:
        print(f"URLs: {result['urls']}")
elif result.get('status') == 'halted':
    print(f"Production halted: {result.get('error')}")
else:
    print(f"Error: {result.get('error')}")
