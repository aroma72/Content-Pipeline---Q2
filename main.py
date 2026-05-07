"""
main.py — entry point for the Drawing Room orchestrator.

Usage:
    python main.py                        # run this week's cycle with sample data
    python main.py --week 20              # run cycle for a specific week number
    python main.py --session path/to.mp4  # process a single session recording
"""
import argparse
import json
from datetime import date
from pathlib import Path

from orchestrator import ContentOrchestrator
from logger import log_info


# ─── Sample / Stub Data ────────────────────────────────────────────────────────
# Replace these with real data sources (LMS API, forum scraper, Aroma's notes)

SAMPLE_RAW_SIGNALS = [
    {
        "source": "learner_question",
        "concept": "gradient_descent",
        "text": "I don't understand why we subtract the gradient. Shouldn't adding make it go up?",
        "date": str(date.today()),
        "recurrence": 4
    },
    {
        "source": "repeated_confusion",
        "concept": "backpropagation",
        "text": "Multiple learners confused about how gradients flow backwards through layers",
        "date": str(date.today()),
        "recurrence": 6
    },
    {
        "source": "assignment_pattern",
        "concept": "learning_rate",
        "text": "75% of learners set learning_rate=0.001 without justification; missed the tuning step",
        "date": str(date.today()),
        "recurrence": 8
    },
    {
        "source": "instructor_note",
        "concept": "loss_function",
        "text": "Students confusing MSE with cross-entropy; used MSE on classification task",
        "date": str(date.today()),
        "recurrence": 3
    }
]

SAMPLE_SESSIONS = [
    # Set recording_path to an actual .mp4 file to trigger the full video pipeline.
    # Leave as empty string or missing file to skip video processing gracefully.
    {
        "session_id": f"session_{date.today().isoformat()}_ai_mastery",
        "recording_path": "recordings/sample_session.mp4",
        "course_id": "ai_mastery"
    }
]

# Stub submissions: in production, pull from LMS API
SAMPLE_SUBMISSIONS: dict[str, list] = {}

# Stub feedback: in production, pull from instructor debrief notes
SAMPLE_FEEDBACK: dict[str, dict] = {}


# ─── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Drawing Room Orchestrator")
    parser.add_argument("--week",    type=int,  default=None,  help="Cycle week number (default: current ISO week)")
    parser.add_argument("--session", type=str,  default=None,  help="Path to a single recording to process")
    parser.add_argument("--dry-run", action="store_true",      help="Log what would happen without calling APIs")
    args = parser.parse_args()

    if args.dry_run:
        print("\n🔍 DRY RUN MODE — no API calls will be made\n")
        _dry_run_report(args.week)
        return

    if args.session:
        _run_single_session(args.session)
        return

    _run_weekly_cycle(args.week)


def _run_weekly_cycle(week: int | None):
    orchestrator = ContentOrchestrator(cycle_week=week)

    log_info("main", f"Starting weekly cycle {orchestrator.cycle_week}")
    print(f"\n🚀 Drawing Room — Weekly Cycle {orchestrator.cycle_week} ({date.today()})\n")

    result = orchestrator.run_weekly_cycle(
        raw_signals=SAMPLE_RAW_SIGNALS,
        scheduled_sessions=SAMPLE_SESSIONS,
        assignment_submissions=SAMPLE_SUBMISSIONS,
        instructor_feedback=SAMPLE_FEEDBACK
    )

    print(f"\n✅ Cycle {orchestrator.cycle_week} status: {result['status']}")
    if result["status"] == "complete":
        health = result.get("health_records", [])
        keep    = sum(1 for h in health if h["decision"] == "keep")
        rebuild = sum(1 for h in health if h["decision"] == "rebuild")
        kill    = sum(1 for h in health if h["decision"] == "kill")
        print(f"   Health: {keep} keep | {rebuild} rebuild | {kill} kill")
        print(f"   Artifacts saved to: weekly_artifacts/week-{orchestrator.cycle_week}-{date.today().year}/")
    else:
        print(f"   Error: {result.get('error', 'unknown')}")


def _run_single_session(recording_path: str):
    import asyncio
    from agents.recording_ingest_agent     import RecordingIngestAgent
    from agents.concept_segmentation_agent import ConceptSegmentationAgent
    from agents.essential_edit_agent       import EssentialEditAgent
    from agents.micro_video_agent          import MicroVideoAgent
    from agents.video_quality_gate_agent   import VideoQualityGateAgent
    from datetime import date
    import json
    from pathlib import Path

    session_id = f"manual_{date.today().isoformat()}"
    print(f"\n🎬 Processing single session: {recording_path}")
    print(f"   Session ID: {session_id}\n")

    async def _pipeline():
        ingest = RecordingIngestAgent()
        r = await ingest.run_async(session_id, recording_path)
        if r.get("status") != "success":
            print(f"❌ Ingest failed: {r.get('error', 'unknown')}")
            return

        transcript = Path(r["transcript_path"]).read_text(encoding="utf-8")
        segs_raw   = json.loads(Path(r["segments_path"]).read_text(encoding="utf-8"))

        seg_agent = ConceptSegmentationAgent()
        seg = await seg_agent.run_async(session_id, transcript, segs_raw)

        edit_task  = asyncio.create_task(
            EssentialEditAgent().run_async(session_id, seg["must_keep"], seg["optional"], recording_path)
        )
        clips_task = asyncio.create_task(
            MicroVideoAgent().run_async(session_id, seg["must_keep"], recording_path)
        )
        edit_r, clips_r = await asyncio.gather(edit_task, clips_task)

        qa_agent = VideoQualityGateAgent()
        clips = clips_r.get("clips", [])
        qa = await qa_agent.run_async(session_id, edit_r.get("essential_edit_path"), clips, transcript)

        print(f"\n✅ Session pipeline complete:")
        print(f"   Essential edit: {edit_r.get('essential_edit_path', 'n/a')}")
        print(f"   Clips: {len(clips)}")
        print(f"   QA: {qa.get('publish_ready_count', 0)} ready, {qa.get('needs_review_count', 0)} flagged")

    asyncio.run(_pipeline())


def _dry_run_report(week: int | None):
    from datetime import date
    week = week or date.today().isocalendar().week
    print(f"Weekly cycle {week} would:")
    print(f"  1. PERCEIVE — process {len(SAMPLE_RAW_SIGNALS)} raw signals")
    print(f"  2. PLAN — convert signals to content units")
    print(f"  3. ACT — generate learner packs, instructor briefs, assignments")
    print(f"  4. OBSERVE — process {len(SAMPLE_SESSIONS)} session recording(s)")
    print(f"  5. REFLECT — evaluate outcomes; generate health table")
    print(f"  6. REENTRY — seed next cycle")
    print(f"\n  Artifacts would be written to: weekly_artifacts/week-{week}-{date.today().year}/")


if __name__ == "__main__":
    main()
