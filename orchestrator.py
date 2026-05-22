"""
ContentOrchestrator — main loop controller.

Runs the full weekly cycle:
  Perceive → Plan → Act → Observe → Reflect → Reentry
"""
import asyncio
import json
from datetime import date
from pathlib import Path

from schemas import (
    ContentSignal, ContentUnit, SessionAssetBundle,
    ContentHealthRecord, OrchestratorState
)
from config import (
    ARTIFACTS_DIR, REVIEW_DIR, MIN_SIGNAL_CONFIDENCE,
    MIN_PASS_RATE, AROMA_EMAIL
)
from logger import log_info, log_decision, log_error, log_warning

# ─── Skills ────────────────────────────────────────────────────────────────────
from skills.signal_intake       import SignalIntakeSkill
from skills.content_planner     import ContentPlannerSkill
from skills.content_producer    import ContentProductionSkill
from skills.instructor_pack     import InstructorPackSkill
from skills.assignment_authoring import AssignmentAuthoringSkill
from skills.assignment_evaluation import AssignmentEvaluationSkill
from skills.session_close       import SessionCloseSkill
from skills.content_reflect     import ContentReflectSkill

# ─── Agents ────────────────────────────────────────────────────────────────────
from agents.recording_ingest_agent       import RecordingIngestAgent
from agents.concept_segmentation_agent   import ConceptSegmentationAgent
from agents.essential_edit_agent         import EssentialEditAgent
from agents.micro_video_agent            import MicroVideoAgent
from agents.video_quality_gate_agent     import VideoQualityGateAgent
from agents.learner_pack_publisher_agent import LearnerPackPublisherAgent


class GateFailedError(Exception):
    pass


class ContentOrchestrator:
    def __init__(self, cycle_week: int | None = None):
        self.cycle_week = cycle_week or date.today().isocalendar().week
        self.state = OrchestratorState(cycle_week=self.cycle_week, current_stage="perceive")
        self._week_dir = ARTIFACTS_DIR / f"week-{self.cycle_week}-{date.today().year}"
        self._week_dir.mkdir(parents=True, exist_ok=True)

        # Instantiate all skills
        self.signal_intake     = SignalIntakeSkill()
        self.content_planner   = ContentPlannerSkill()
        self.content_producer  = ContentProductionSkill()
        self.instructor_pack   = InstructorPackSkill()
        self.assignment_auth   = AssignmentAuthoringSkill()
        self.assignment_eval   = AssignmentEvaluationSkill()
        self.session_close     = SessionCloseSkill()
        self.content_reflect   = ContentReflectSkill()

    # ───────────────────────────────────────────────────────────────────────────
    # PUBLIC ENTRY POINTS
    # ───────────────────────────────────────────────────────────────────────────

    def run_weekly_cycle(
        self,
        raw_signals: list[dict],
        scheduled_sessions: list[dict],          # [{session_id, recording_path, course_id}]
        assignment_submissions: dict[str, list],  # {unit_id: [submission dicts]}
        instructor_feedback: dict[str, dict] | None = None,
        prior_health: list[dict] | None = None
    ):
        """
        Run the full Perceive→Plan→Act→Observe→Reflect loop.
        Call this every Monday morning.
        """
        # Log authority hierarchy at startup (non-negotiable instruction priority)
        log_info("Orchestrator", "═" * 79)
        log_info("Orchestrator", "INSTRUCTION PRIORITY (highest to lowest):")
        log_info("Orchestrator", "1. LOCKED RULES in system prompt — never override")
        log_info("Orchestrator", "2. Explicit commands given by user during this run")
        log_info("Orchestrator", "3. Orchestrator defaults and inference")
        log_info("Orchestrator", "")
        log_info("Orchestrator", "If any instruction conflicts with a higher-priority instruction,")
        log_info("Orchestrator", "the higher-priority one always wins. Never silently ignore a user")
        log_info("Orchestrator", "command — if you cannot follow it, say so explicitly before proceeding.")
        log_info("Orchestrator", "═" * 79)

        log_info("Orchestrator", f"=== Weekly cycle {self.cycle_week} started ===")

        try:
            # ── Stage 1: PERCEIVE ──────────────────────────────────────────────
            self.state.current_stage = "perceive"
            signals = self._perceive(raw_signals)

            # ── Stage 2: PLAN ──────────────────────────────────────────────────
            self.state.current_stage = "plan"
            units = self._plan(signals, prior_health)

            # ── Stage 3: ACT ───────────────────────────────────────────────────
            self.state.current_stage = "act"
            act_outputs = self._act(units)

            # ── Stage 4: OBSERVE ───────────────────────────────────────────────
            self.state.current_stage = "observe"
            bundles = asyncio.run(self._observe_all(scheduled_sessions))

            # ── Stage 5: REFLECT ───────────────────────────────────────────────
            self.state.current_stage = "reflect"
            health_records = self._reflect(
                units, act_outputs, assignment_submissions,
                instructor_feedback or {}
            )

            # ── Stage 6: REENTRY ───────────────────────────────────────────────
            self.state.current_stage = "reentry"
            self._reentry(health_records)

            log_info("Orchestrator", f"=== Weekly cycle {self.cycle_week} COMPLETE ===")
            return {"status": "complete", "health_records": [h.model_dump() for h in health_records]}

        except GateFailedError as e:
            self.state.current_stage = "blocked"
            log_error("Orchestrator", "GateBlocked", str(e),
                      action_taken="cycle halted; Aroma notified; carry unresolved units forward")
            self._notify_aroma(f"Gate blocked: {e}")
            return {"status": "blocked", "error": str(e)}

    # ───────────────────────────────────────────────────────────────────────────
    # STAGE 1 — PERCEIVE
    # ───────────────────────────────────────────────────────────────────────────

    def _perceive(self, raw_signals: list[dict]) -> list[ContentSignal]:
        log_info("Orchestrator", "Stage: PERCEIVE")

        signals = self.signal_intake.call(raw_signals)
        strong = [s for s in signals if s.confidence >= MIN_SIGNAL_CONFIDENCE]

        if not strong:
            raise GateFailedError(
                f"Perceive gate: no signals above confidence {MIN_SIGNAL_CONFIDENCE}. "
                "Log 'no-new-signal' or collect more data before proceeding."
            )

        # Persist
        backlog_path = self._week_dir / "signal_backlog.json"
        backlog_path.write_text(
            json.dumps([s.model_dump() for s in strong], indent=2),
            encoding="utf-8"
        )
        self._write_md_artifact(
            "signal_backlog.md",
            "# Signal Backlog\n\n" + "\n".join(
                f"- **{s.concept_id}** ({s.source}, conf={s.confidence:.2f}): {s.description}"
                for s in sorted(strong, key=lambda x: -x.confidence)
            )
        )

        log_decision("Orchestrator", "gate_pass", "Perceive",
                     f"{len(strong)} signals collected (conf >= {MIN_SIGNAL_CONFIDENCE})",
                     rationale="Signal backlog written; proceeding to Plan")
        return strong

    # ───────────────────────────────────────────────────────────────────────────
    # STAGE 2 — PLAN
    # ───────────────────────────────────────────────────────────────────────────

    def _plan(self, signals: list[ContentSignal], prior_health: list[dict] | None) -> list[ContentUnit]:
        log_info("Orchestrator", "Stage: PLAN")

        units = self.content_planner.call(signals, prior_health)
        if not units:
            raise GateFailedError("Plan gate: no content units generated. Check signal quality and planner prompt.")

        # Verify all signals mapped
        mapped_ids = {sid for u in units for sid in u.signal_ids}
        unmapped = [s for s in signals if s.id not in mapped_ids]
        if unmapped:
            log_warning("Orchestrator",
                        f"Plan gate warning: {len(unmapped)} signals unmapped. Gate passes but review recommended.")

        # Persist
        plan_path = self._week_dir / "weekly_content_map.json"
        plan_path.write_text(json.dumps([u.model_dump() for u in units], indent=2), encoding="utf-8")

        self._write_md_artifact(
            "weekly_content_map.md",
            "# Weekly Content Map\n\n" + "\n".join(
                f"## {u.id}\n**Outcome**: {u.outcome}\n**Format**: {u.format}\n**Evidence**: {u.evidence_method}\n**Publish by**: {u.target_publish_date}\n"
                for u in units
            )
        )

        log_decision("Orchestrator", "gate_pass", "Plan",
                     f"{len(units)} units planned; {len(unmapped)} signals unmapped",
                     rationale="weekly_content_map.md written; proceeding to Act")
        return units

    # ───────────────────────────────────────────────────────────────────────────
    # STAGE 3 — ACT
    # ───────────────────────────────────────────────────────────────────────────

    def _act(self, units: list[ContentUnit]) -> dict:
        log_info("Orchestrator", f"Stage: ACT — generating packs for {len(units)} units")

        learner_packs, instructor_briefs, assignments = {}, {}, {}
        failed = []

        for unit in units:
            lp = self.content_producer.call(unit)
            ib = self.instructor_pack.call(unit)
            asgn = self.assignment_auth.call(unit)

            if not lp or not ib or not asgn:
                failed.append(unit.id)
                self.state.failed_units.append(unit.id)
                log_warning("Orchestrator", f"Unit {unit.id} missing one or more Act outputs; flagged for review")
            else:
                learner_packs[unit.id]     = lp
                instructor_briefs[unit.id] = ib
                assignments[unit.id]       = asgn
                self.state.completed_units.append(unit.id)

        # Write act outputs
        act_dir = self._week_dir / "act_outputs"
        act_dir.mkdir(exist_ok=True)
        for uid, pack in learner_packs.items():
            (act_dir / f"{uid}_learner.json").write_text(pack.model_dump_json(indent=2), encoding="utf-8")
        for uid, brief in instructor_briefs.items():
            (act_dir / f"{uid}_instructor.json").write_text(brief.model_dump_json(indent=2), encoding="utf-8")
        for uid, asgn in assignments.items():
            (act_dir / f"{uid}_assignment.json").write_text(asgn.model_dump_json(indent=2), encoding="utf-8")

        if failed:
            log_warning("Orchestrator", f"Act gate: {len(failed)} units failed generation: {failed}")
        if not learner_packs:
            raise GateFailedError("Act gate: zero units produced learner packs. Check content production skill.")

        log_decision("Orchestrator", "gate_pass", "Act",
                     f"{len(learner_packs)}/{len(units)} units completed; {len(failed)} flagged",
                     rationale="Act outputs written; Aroma review pending (check review_queue/)")
        return {"learner_packs": learner_packs, "instructor_briefs": instructor_briefs, "assignments": assignments}

    # ───────────────────────────────────────────────────────────────────────────
    # STAGE 4 — OBSERVE
    # ───────────────────────────────────────────────────────────────────────────

    async def _observe_all(self, sessions: list[dict]) -> list[SessionAssetBundle]:
        """Run Observe pipeline for all scheduled sessions (async)."""
        log_info("Orchestrator", f"Stage: OBSERVE — processing {len(sessions)} session(s)")
        tasks = [self._observe_session(s["session_id"], s["recording_path"], s["course_id"]) for s in sessions]
        return await asyncio.gather(*tasks)

    async def _observe_session(self, session_id: str, recording_path: str, course_id: str) -> SessionAssetBundle:
        log_info("Orchestrator", f"Observe: session {session_id}")

        bundle = SessionAssetBundle(
            session_id=session_id,
            session_date=str(date.today()),
            course_id=course_id
        )

        # ── Step A: Ingest ─────────────────────────────────────────────────────
        ingest_agent = RecordingIngestAgent()
        ingest_result = await ingest_agent.run_async(session_id, recording_path)
        if ingest_result.get("status") != "success":
            log_error("Orchestrator", "IngestFailed", f"Session {session_id} ingest failed",
                      action_taken="session skipped; bundle marked needs_review")
            return bundle

        transcript = Path(ingest_result["transcript_path"]).read_text(encoding="utf-8")
        speaker_segments = json.loads(Path(ingest_result["segments_path"]).read_text(encoding="utf-8"))
        bundle.transcript_path = ingest_result["transcript_path"]

        # ── Step B: Segment ────────────────────────────────────────────────────
        seg_agent = ConceptSegmentationAgent()
        seg_result = await seg_agent.run_async(session_id, transcript, speaker_segments)
        if seg_result.get("status") != "success":
            log_error("Orchestrator", "SegmentFailed", f"Session {session_id} segmentation failed")
            return bundle

        must_keep = seg_result["must_keep"]
        optional  = seg_result["optional"]
        concepts  = seg_result["concepts"]

        # ── Step C: Essential Edit + Clips (PARALLEL) ──────────────────────────
        edit_agent  = EssentialEditAgent()
        micro_agent = MicroVideoAgent()

        edit_task  = asyncio.create_task(edit_agent.run_async(session_id, must_keep, optional, recording_path))
        clips_task = asyncio.create_task(micro_agent.run_async(session_id, must_keep, recording_path))

        edit_result, clips_result = await asyncio.gather(edit_task, clips_task)

        if edit_result.get("status") == "success":
            bundle.essential_edit_path = edit_result["essential_edit_path"]
        if clips_result.get("status") == "success":
            bundle.concept_clips = clips_result["clips"]

        # ── Step D: Session Close (summary, glossary, watch order) ─────────────
        bundle = self.session_close.call(bundle, transcript, concepts)

        # ── Step E: QA Gate ────────────────────────────────────────────────────
        qa_agent = VideoQualityGateAgent()
        qa_result = await qa_agent.run_async(
            session_id, bundle.essential_edit_path, bundle.concept_clips, transcript
        )

        if qa_result.get("status") == "success":
            from schemas import QualityFlag
            bundle.quality_flags = [QualityFlag(**f) for f in qa_result.get("flags", [])]

        needs_review = [f for f in bundle.quality_flags if f.status == "needs_review"]
        if needs_review:
            bundle.status = "needs_review"
            log_warning("Orchestrator",
                        f"Session {session_id}: {len(needs_review)} assets need Aroma review before publish")
            self._notify_aroma(
                f"Session {session_id}: {len(needs_review)} video assets flagged for review. "
                f"Check review_queue/ to approve/reject."
            )
        else:
            bundle.status = "publish_ready"
            log_info("Orchestrator", f"Session {session_id}: all assets publish_ready")

            # ── Step F: Publish ────────────────────────────────────────────────
            publisher = LearnerPackPublisherAgent()
            await publisher.run_async(bundle)

        # Observe gate
        if not bundle.essential_edit_path:
            log_warning("Orchestrator", f"Observe gate: session {session_id} has no essential edit; partial bundle")

        log_decision("Orchestrator", "gate_pass", "Observe",
                     f"Session {session_id}: status={bundle.status}, clips={len(bundle.concept_clips)}",
                     rationale="Session pipeline complete; bundle persisted")
        return bundle

    # ───────────────────────────────────────────────────────────────────────────
    # STAGE 5 — REFLECT
    # ───────────────────────────────────────────────────────────────────────────

    def _reflect(
        self,
        units: list[ContentUnit],
        act_outputs: dict,
        submissions: dict[str, list],
        feedback: dict[str, dict]
    ) -> list[ContentHealthRecord]:
        log_info("Orchestrator", f"Stage: REFLECT — {len(units)} units")

        health_records = []
        assignments = act_outputs.get("assignments", {})

        for unit in units:
            asgn     = assignments.get(unit.id)
            subs     = submissions.get(unit.id, [])
            fb       = feedback.get(unit.id, {})

            # Evaluate submissions
            evaluation = None
            if asgn and subs:
                evaluation = self.assignment_eval.call(asgn, subs)

            # Reflect decision
            record = self.content_reflect.call(
                unit=unit,
                evaluation=evaluation,
                cycle_week=self.cycle_week,
                video_completion_rate=fb.get("video_completion_rate"),
                learner_feedback=fb.get("learner_feedback_sentiment"),
                teacher_confidence=fb.get("teacher_confidence")
            )

            if record:
                health_records.append(record)

        if not health_records:
            raise GateFailedError("Reflect gate: no health records generated. Check evaluation and reflect skills.")

        # Persist health table
        health_path = self._week_dir / "content_health_table.json"
        health_path.write_text(
            json.dumps([h.model_dump() for h in health_records], indent=2),
            encoding="utf-8"
        )
        self._write_md_artifact(
            "content_health_table.md",
            "# Content Health Table — Week " + str(self.cycle_week) + "\n\n"
            "| Unit ID | Pass Rate | Completion | Teacher | Decision | Rationale |\n"
            "|---------|-----------|------------|---------|----------|-----------|\n" +
            "\n".join(
                f"| {h.unit_id[:12]} | {h.assignment_pass_rate_first_attempt:.0%} "
                f"| {h.video_completion_rate or 'n/a'} | {h.teacher_confidence or 'n/a'} "
                f"| **{h.decision}** | {h.decision_rationale} |"
                for h in health_records
            )
        )

        rebuilds = [h for h in health_records if h.decision == "rebuild"]
        kills    = [h for h in health_records if h.decision == "kill"]

        if len(rebuilds) / len(health_records) > 0.30:
            self._notify_aroma(
                f"Reflect: {len(rebuilds)}/{len(health_records)} units need rebuild (>30%). "
                "Course lead review recommended."
            )

        log_decision("Orchestrator", "gate_pass", "Reflect",
                     f"{sum(1 for h in health_records if h.decision=='keep')} keep, "
                     f"{len(rebuilds)} rebuild, {len(kills)} kill",
                     rationale="content_health_table.md written; Aroma review pending")
        return health_records

    # ───────────────────────────────────────────────────────────────────────────
    # STAGE 6 — REENTRY
    # ───────────────────────────────────────────────────────────────────────────

    def _reentry(self, health_records: list[ContentHealthRecord]):
        log_info("Orchestrator", "Stage: REENTRY — preparing next cycle")

        reentry = {
            "cycle_week": self.cycle_week,
            "next_cycle_week": self.cycle_week + 1,
            "keep": [h.unit_id for h in health_records if h.decision == "keep"],
            "rebuild_high":   [h.unit_id for h in health_records if h.decision == "rebuild" and h.rebuild_priority == "high"],
            "rebuild_medium": [h.unit_id for h in health_records if h.decision == "rebuild" and h.rebuild_priority == "medium"],
            "kill": [h.unit_id for h in health_records if h.decision == "kill"],
        }

        reentry_path = self._week_dir / "reentry_plan.json"
        reentry_path.write_text(json.dumps(reentry, indent=2), encoding="utf-8")

        log_decision("Orchestrator", "reentry", "Reentry",
                     f"Cycle {self.cycle_week} closed; next cycle seeded with "
                     f"{len(reentry['keep'])} keeps + {len(reentry['rebuild_high']) + len(reentry['rebuild_medium'])} rebuilds",
                     next_step=f"Start cycle {reentry['next_cycle_week']} with Perceive on Monday")

    # ───────────────────────────────────────────────────────────────────────────
    # HELPERS
    # ───────────────────────────────────────────────────────────────────────────

    def _write_md_artifact(self, filename: str, content: str):
        (self._week_dir / filename).write_text(content, encoding="utf-8")

    def _notify_aroma(self, message: str):
        """Print to console + log. Email integration TBD (Week 3)."""
        print(f"\n📬 NOTIFICATION → {AROMA_EMAIL}: {message}\n")
        log_decision("Orchestrator", "notification_sent", "human_review_required",
                     message, actor="system", next_step="Aroma to review and approve")
