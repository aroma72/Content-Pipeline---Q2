#!/usr/bin/env python
"""
CLI for VideoProductionOrchestratorRemotionEdition

Usage:
  python video_production_cli.py run --config config.json
  python video_production_cli.py --force-unlock prod-2026-05-21 "Quality check false positive; manual review passed"
  python video_production_cli.py --force-unlock prod-2026-05-21 "Customer request to override QA lock"
"""
import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

from schemas import VideoProductionConfig
from video_production_orchestrator_remotion import VideoProductionOrchestratorRemotionEdition
from logger import log_info, log_error


def main():
    parser = argparse.ArgumentParser(
        description="Video Production Orchestrator (Remotion Edition) — CLI"
    )

    # Subcommands
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Command 1: run (default)
    run_parser = subparsers.add_parser("run", help="Run the video production pipeline")
    run_parser.add_argument(
        "--config",
        type=str,
        required=False,
        help="Path to VideoProductionConfig JSON file"
    )
    run_parser.add_argument(
        "--script-path",
        type=str,
        required=False,
        help="Path to production script (markdown)"
    )
    run_parser.add_argument(
        "--production-id",
        type=str,
        required=False,
        help="Production ID (auto-generated if not provided)"
    )
    run_parser.add_argument(
        "--series-title",
        type=str,
        required=False,
        default="Course Overview",
        help="Series title"
    )
    run_parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Validate pipeline without making API calls or writing media files"
    )

    # Command 2: force-unlock (separate command)
    unlock_parser = subparsers.add_parser(
        "unlock",
        help="Force unlock a QA-locked production (requires reason)"
    )
    unlock_parser.add_argument(
        "production_id",
        type=str,
        help="Production ID to unlock"
    )
    unlock_parser.add_argument(
        "reason",
        type=str,
        help="Explicit reason for override (logged to agent_memory.json)"
    )

    # Global options (can be used before command name)
    parser.add_argument(
        "--force-unlock",
        type=str,
        nargs=2,
        metavar=("PRODUCTION_ID", "REASON"),
        help="Force unlock a QA-locked production (shorthand: --force-unlock prod-id 'reason')"
    )

    args = parser.parse_args()

    # Handle --force-unlock flag (shorthand)
    if args.force_unlock:
        production_id, reason = args.force_unlock
        return _handle_force_unlock(production_id, reason)

    # Handle subcommands
    if args.command == "unlock":
        return _handle_force_unlock(args.production_id, args.reason)
    elif args.command == "run" or args.command is None:
        return _handle_run(args)
    else:
        parser.print_help()
        sys.exit(1)


def _handle_run(args):
    """Run the video production pipeline."""
    try:
        # Load config
        if args.config:
            config_path = Path(args.config)
            if not config_path.exists():
                log_error("video_production_cli", "ConfigNotFound", f"Config file not found: {args.config}")
                sys.exit(1)

            config_data = json.loads(config_path.read_text(encoding="utf-8"))
            config = VideoProductionConfig(**config_data)
        else:
            # Create config from CLI args
            if not args.script_path:
                log_error("video_production_cli", "MissingScript",
                         "Either --config or --script-path required")
                sys.exit(1)

            config = VideoProductionConfig(
                series_title=args.series_title,
                script_path=args.script_path,
                production_id=args.production_id
            )

        log_info("video_production_cli", f"Starting production: {config.production_id}")
        log_info("video_production_cli", f"Script: {config.script_path}")

        dry_run = getattr(args, "dry_run", False)
        if dry_run:
            log_info("video_production_cli", "DRY-RUN MODE ENABLED — no API calls will be made")

        # Run orchestrator
        orchestrator = VideoProductionOrchestratorRemotionEdition(config, dry_run=dry_run)
        result = orchestrator.run()

        # Print final result
        print("\n" + "=" * 80)
        if result["status"] == "complete":
            print("✓ PRODUCTION COMPLETE")
            print("=" * 80)
            if result.get("urls"):
                print("\nDistribution URLs:")
                for title, url in result.get("urls", {}).items():
                    print(f"  {title}: {url}")
        elif result["status"] == "halted":
            print("✗ PRODUCTION HALTED")
            print("=" * 80)
            print(f"\nReason: {result.get('error', 'Unknown')}")
            if result.get("stage") == "pre_flight_check":
                print("\nFix the preconditions and restart.")
            elif "QA" in str(result.get("error", "")):
                print(f"\nTo override: python video_production_cli.py unlock {config.production_id} '<reason>'")
        else:
            print(f"✗ PRODUCTION {result['status'].upper()}")
            print("=" * 80)
            if "error" in result:
                print(f"Error: {result['error']}")

        print("=" * 80)
        log_info("video_production_cli", f"Production result: {result['status']}")
        sys.exit(0 if result["status"] == "complete" else 1)

    except KeyboardInterrupt:
        log_info("video_production_cli", "Production interrupted by user")
        sys.exit(1)
    except Exception as e:
        log_error("video_production_cli", "FatalError", str(e))
        sys.exit(1)


def _handle_force_unlock(production_id: str, reason: str):
    """Handle force unlock command."""
    print("\n" + "=" * 80)
    print("FORCE UNLOCK QA GATE")
    print("=" * 80)
    print(f"Production ID: {production_id}")
    print(f"Reason: {reason}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("-" * 80)

    if not reason or len(reason.strip()) < 10:
        print("✗ REASON TOO SHORT")
        print("  Reason must be at least 10 characters for audit trail.")
        sys.exit(1)

    result = VideoProductionOrchestratorRemotionEdition.force_unlock(production_id, reason)

    if result["status"] == "unlocked":
        print("✓ UNLOCK SUCCESSFUL")
        print("=" * 80)
        print(f"\nProduction {production_id} is now unlocked.")
        print(f"Pipeline may proceed to distribution.")
        print(f"\nUnlock logged to agent_memory.json for audit trail.")
        sys.exit(0)
    else:
        print("✗ UNLOCK FAILED")
        print("=" * 80)
        print(f"\nError: {result['error']}")
        sys.exit(1)


if __name__ == "__main__":
    main()
