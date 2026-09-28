#!/usr/bin/env python
"""
Entry point for running the video production orchestrator.

Usage:
  python run_video_production.py --config config.json --resume

This orchestrates the full 7-stage video production pipeline with human review
checkpoints at each stage.
"""
import argparse
import json
import sys
from pathlib import Path

from schemas import VideoProductionConfig
from video_production_orchestrator import VideoProductionOrchestrator
from logger import log_info, log_error


def main():
    parser = argparse.ArgumentParser(
        description="Run the video production orchestrator"
    )
    parser.add_argument(
        "--config",
        type=str,
        required=False,
        help="Path to VideoProductionConfig JSON file"
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from last checkpoint"
    )
    parser.add_argument(
        "--production-id",
        type=str,
        required=False,
        help="Production ID (auto-generated if not provided)"
    )
    parser.add_argument(
        "--script-path",
        type=str,
        required=False,
        help="Path to production script (markdown)"
    )
    parser.add_argument(
        "--series-title",
        type=str,
        required=False,
        default="Systems Evaluations",
        help="Series title"
    )

    args = parser.parse_args()

    try:
        # Load config
        if args.config:
            config_path = Path(args.config)
            if not config_path.exists():
                log_error("run_video_production", "ConfigNotFound", f"Config file not found: {args.config}")
                sys.exit(1)

            config_data = json.loads(config_path.read_text())
            config = VideoProductionConfig(**config_data)
        else:
            # Create minimal config
            if not args.script_path:
                log_error("run_video_production", "MissingScript", "Either --config or --script-path required")
                sys.exit(1)

            config = VideoProductionConfig(
                series_title=args.series_title,
                script_path=args.script_path,
                production_id=args.production_id
            )

        log_info("run_video_production", f"Starting production: {config.production_id}")
        log_info("run_video_production", f"Script: {config.script_path}")
        log_info("run_video_production", f"Series: {config.series_title}")

        # Run orchestrator
        orchestrator = VideoProductionOrchestrator(config)
        result = orchestrator.run()

        # Print final result
        print("\n" + "=" * 70)
        if result["status"] == "complete":
            print("PRODUCTION COMPLETE")
            print("=" * 70)
            print("\nDistribution URLs:")
            for title, url in result.get("urls", {}).items():
                print(f"  {title}: {url}")
        else:
            print(f"PRODUCTION {result['status'].upper()}")
            print("=" * 70)
            if "error" in result:
                print(f"Error: {result['error']}")

        print("=" * 70)
        log_info("run_video_production", f"Production result: {result['status']}")

    except KeyboardInterrupt:
        log_info("run_video_production", "Production interrupted by user")
        sys.exit(1)
    except Exception as e:
        log_error("run_video_production", "FatalError", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
