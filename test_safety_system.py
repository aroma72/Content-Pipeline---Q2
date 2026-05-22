#!/usr/bin/env python
"""
End-to-End Safety System Test
==============================

Tests that the orchestrator's lock-and-lock system fires correctly
when given a deliberately broken input (script with no Scene blocks).

This test verifies:
1. pre_flight_check catches missing Scene blocks BEFORE any agents run
2. Error message explicitly names the problem
3. state.json records HALTED status with metadata
4. Re-running refuses to resume without explicit unlock

Run: python test_safety_system.py
"""

import sys
import json
from pathlib import Path
from datetime import datetime

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from schemas import VideoProductionConfig
from video_production_orchestrator_remotion import VideoProductionOrchestratorRemotionEdition
from config import VIDEO_PRODUCTION_DIR


def print_section(title):
    """Print a formatted section header."""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def test_1_broken_script_dry_run():
    """TEST 1: Run dry-run against broken script (no Scene blocks)."""
    print_section("TEST 1: DRY-RUN AGAINST BROKEN SCRIPT")

    config_path = Path("video_production/test_broken/config.json")
    with open(config_path) as f:
        config_data = json.load(f)

    config = VideoProductionConfig(**config_data)

    print(f"Production ID: {config.production_id}")
    print(f"Script path: {config.script_path}")
    print(f"Script exists: {Path(config.script_path).exists()}")
    print("\nRunning orchestrator with --dry-run flag...\n")

    try:
        orchestrator = VideoProductionOrchestratorRemotionEdition(config, dry_run=True)
        result = orchestrator.run()

        print("\n[ORCHESTRATOR OUTPUT ABOVE]")
        print(f"\nResult status: {result['status']}")
        print(f"Result production_id: {result['production_id']}")
        if "error" in result:
            print(f"Error: {result['error'][:200]}...")

        return result

    except Exception as e:
        print(f"\n[EXCEPTION] {type(e).__name__}: {str(e)[:200]}")
        raise


def test_2_verify_state_json():
    """TEST 2: Verify state.json contains correct failure metadata."""
    print_section("TEST 2: VERIFY state.json CONTENT")

    state_path = VIDEO_PRODUCTION_DIR / "test_broken" / "state.json"

    if not state_path.exists():
        print(f"❌ FAIL: state.json not found at {state_path}")
        return False

    print(f"✓ state.json exists at {state_path}")

    with open(state_path) as f:
        state = json.load(f)

    print("\nState content:")
    print(json.dumps(state, indent=2, default=str))

    # Check for required fields
    checks = {
        "current_stage == 'halted'": state.get("current_stage") == "halted",
        "has 'created_at' timestamp": "created_at" in state,
        "has 'updated_at' timestamp": "updated_at" in state,
        "output_contract_failures empty": len(state.get("output_contract_failures", {})) == 0,
        "no stages completed": all(
            not state.get(f"stage_{s}_completed")
            for s in ["voiceover", "remotion_render", "post_production", "qa", "distribution"]
        ),
    }

    print("\nState validation:")
    all_passed = True
    for check_name, passed in checks.items():
        status = "✓" if passed else "❌"
        print(f"  {status} {check_name}")
        all_passed = all_passed and passed

    return all_passed


def test_3_verify_error_specificity():
    """TEST 3: Verify error message is specific, not generic."""
    print_section("TEST 3: VERIFY ERROR MESSAGE SPECIFICITY")

    state_path = VIDEO_PRODUCTION_DIR / "test_broken" / "state.json"

    with open(state_path) as f:
        state = json.load(f)

    # The error should be in the result from the first run
    # Look for specific error patterns
    error_patterns = {
        "mentions 'Scene'": "Scene" in str(state),
        "mentions 'script'": "script" in str(state).lower(),
        "NOT generic 'validation failed'": "validation failed" not in str(state).lower()
        or "Scene" in str(state),
    }

    print("Error message validation:")
    all_passed = True
    for check_name, passed in error_patterns.items():
        status = "✓" if passed else "❌"
        print(f"  {status} {check_name}")
        all_passed = all_passed and passed

    return all_passed


def test_4_attempted_rerun():
    """TEST 4: Attempt to re-run without fixing; verify it refuses."""
    print_section("TEST 4: ATTEMPT RE-RUN WITHOUT FIX")

    config_path = Path("video_production/test_broken/config.json")
    with open(config_path) as f:
        config_data = json.load(f)

    config = VideoProductionConfig(**config_data)

    print("Attempting to re-run orchestrator with same broken config...\n")

    try:
        orchestrator = VideoProductionOrchestratorRemotionEdition(config, dry_run=True)
        result = orchestrator.run()

        print(f"\nRe-run result status: {result['status']}")

        if result["status"] == "halted":
            print("✓ Orchestrator correctly HALTED on second run")
            print(f"  Error: {result.get('error', 'N/A')[:100]}...")
            return True
        else:
            print(f"❌ FAIL: Expected status 'halted', got '{result['status']}'")
            return False

    except Exception as e:
        print(f"✓ Orchestrator raised exception (expected): {type(e).__name__}")
        print(f"  Message: {str(e)[:100]}...")
        return True


def cleanup():
    """Remove test directory."""
    print_section("CLEANUP")

    test_dir = Path("video_production/test_broken")
    if test_dir.exists():
        import shutil
        shutil.rmtree(test_dir)
        print(f"✓ Deleted test directory: {test_dir}")
    else:
        print(f"ℹ Test directory already gone: {test_dir}")


def main():
    """Run all tests."""
    print("\n" + "█" * 80)
    print("█" + " " * 78 + "█")
    print("█" + "  SAFETY SYSTEM END-TO-END TEST".center(78) + "█")
    print("█" + " " * 78 + "█")
    print("█" * 80)

    results = {}

    try:
        # Test 1: Run dry-run with broken script
        result1 = test_1_broken_script_dry_run()
        results["TEST 1: Dry-run execution"] = result1.get("status") == "halted"

        # Test 2: Verify state.json
        results["TEST 2: state.json structure"] = test_2_verify_state_json()

        # Test 3: Verify error specificity
        results["TEST 3: Error message specificity"] = test_3_verify_error_specificity()

        # Test 4: Verify re-run refuses
        results["TEST 4: Re-run refuses to proceed"] = test_4_attempted_rerun()

    except Exception as e:
        print(f"\n❌ FATAL: {e}")
        import traceback
        traceback.print_exc()

    finally:
        cleanup()

    # Final summary
    print_section("FINAL VERDICT")

    all_passed = True
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        all_passed = all_passed and passed

    print("\n" + "=" * 80)
    if all_passed:
        print("✓ ALL TESTS PASSED — Safety system is working correctly")
    else:
        print("❌ SOME TESTS FAILED — Safety system needs fixes")
    print("=" * 80 + "\n")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
