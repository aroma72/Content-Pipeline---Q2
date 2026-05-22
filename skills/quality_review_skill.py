import json
import sys
from pathlib import Path
from datetime import datetime
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import QualityReport
from config import MODEL_OPUS, PROMPTS_DIR, VIDEO_PRODUCTION_DIR
from logger import log_info, log_error, log_decision
from memory_manager import AgentMemoryManager


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


# ═══════════════════════════════════════════════════════════════════════════
# LOCKED: MINIMUM PASSING CHECKS — Pipeline cannot proceed without these
# ═══════════════════════════════════════════════════════════════════════════
MINIMUM_PASSING_CHECKS = {
    "resolution": {
        "description": "Output resolution matches target (1920x1080)",
        "min_score": 0.85
    },
    "fps": {
        "description": "Frame rate is stable at target FPS (30)",
        "min_score": 0.85
    },
    "audio_quality": {
        "description": "Audio levels, clarity, and sync are acceptable",
        "min_score": 0.85
    },
    "animation_quality": {
        "description": "Visuals are genuinely animated — elements move between frames, no frozen static slides",
        "min_score": 0.70
    },
    "vo_sync": {
        "description": "Visual phase transitions land at natural speech pauses — not mid-sentence",
        "min_score": 0.70
    },
    "layout_stacking": {
        "description": "Phases replace each other — content does not pile up on screen simultaneously",
        "min_score": 0.70
    },
    "visual_identity": {
        "description": "Background has brand colour presence — not near-white or colourless",
        "min_score": 0.70
    }
}


_SYSTEM_PROMPT_TEXT = """You are QualityReviewSkill — assess quality of video production artifacts.

Given production artifacts and quality criteria, provide:
- overall_score: float 0-1 (how well does output meet spec?)
- passed: bool (true if score >= threshold)
- issues: list of specific problems found
- recommendations: list of concrete improvements
- summary: 1-2 sentence assessment
- check_scores: dict with individual check scores (resolution, fps, audio_quality, etc.)

Be objective. Common issues:
- Voiceover: pacing (too fast/slow), clarity, tone mismatch
- Animation: smoothness, color accuracy, timing alignment
- Video: sync issues, audio levels, resolution
- Captions: accuracy, timing, readability

Output ONLY valid JSON — no prose.
"""


class QualityReviewSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_OPUS
        self.memory_manager = AgentMemoryManager()

    def validate_minimum_checks(self, check_scores: dict) -> dict:
        """
        LOCKED: Validate that minimum passing checks are all present and scoring >= 0.85.

        Returns: {
            "passed": bool (True if all minimum checks pass),
            "failures": list of check names that failed,
            "details": dict with each check's score and requirement
        }
        """
        failures = []
        details = {}

        for check_name, check_config in MINIMUM_PASSING_CHECKS.items():
            score = check_scores.get(check_name, 0.0)
            min_required = check_config["min_score"]
            is_passing = score >= min_required

            details[check_name] = {
                "description": check_config["description"],
                "score": score,
                "required": min_required,
                "status": "PASS" if is_passing else "FAIL"
            }

            if not is_passing:
                failures.append(check_name)

        return {
            "passed": len(failures) == 0,
            "failures": failures,
            "details": details
        }

    def write_qa_lock(self, production_id: str, reason: str = "failed QA minimum"):
        """
        LOCKED: Write QA lock to state.json. Pipeline cannot resume without --force-unlock.
        """
        state_path = VIDEO_PRODUCTION_DIR / production_id / "state.json"

        try:
            if state_path.exists():
                state_data = json.loads(state_path.read_text(encoding="utf-8"))
            else:
                state_data = {}

            state_data["qa_lock"] = {
                "locked": True,
                "reason": reason,
                "locked_at": datetime.now().isoformat(),
                "requires_unlock": True
            }

            state_path.write_text(json.dumps(state_data, indent=2), encoding="utf-8")
            log_error("QualityReviewSkill", "QALockEngaged",
                     f"Production {production_id} locked: {reason}")
        except Exception as e:
            log_error("QualityReviewSkill", "QALockWriteError", str(e))

    def check_qa_lock(self, production_id: str) -> bool:
        """
        Check if production has QA lock. Returns True if locked (cannot proceed).
        """
        state_path = VIDEO_PRODUCTION_DIR / production_id / "state.json"

        try:
            if state_path.exists():
                state_data = json.loads(state_path.read_text(encoding="utf-8"))
                return state_data.get("qa_lock", {}).get("locked", False)
        except:
            pass

        return False

    def unlock_qa_lock(self, production_id: str, reason_override: str):
        """
        Remove QA lock and log the unlock action to agent_memory.json.
        Requires explicit reason for audit trail.
        """
        state_path = VIDEO_PRODUCTION_DIR / production_id / "state.json"

        try:
            if state_path.exists():
                state_data = json.loads(state_path.read_text(encoding="utf-8"))

                # Log unlock to memory (audit trail)
                unlock_entry = {
                    "correction_type": "QA_LOCK_OVERRIDE",
                    "production_id": production_id,
                    "timestamp": datetime.now().isoformat(),
                    "reason": reason_override,
                    "action": "Manually unlocked QA gate"
                }
                self.memory_manager.log_new_mistake("QualityReviewSkill", unlock_entry)

                # Remove lock from state
                state_data["qa_lock"] = {
                    "locked": False,
                    "unlocked_at": datetime.now().isoformat(),
                    "unlock_reason": reason_override
                }

                state_path.write_text(json.dumps(state_data, indent=2), encoding="utf-8")
                log_info("QualityReviewSkill", f"QA lock removed for {production_id}")
                log_info("QualityReviewSkill", f"Unlock reason: {reason_override}")

                return True
        except Exception as e:
            log_error("QualityReviewSkill", "QAUnlockError", str(e))
            return False

    def call(self, step_name: str, artifacts: dict, spec: dict, threshold: float = 0.80,
             production_id: str = None) -> QualityReport | None:
        """Review and score quality of any production step's output.

        For QA stage: Validate minimum passing checks (resolution, fps, audio_quality).
        If minimum checks fail, engage QA LOCK and prevent distribution.
        """

        log_info("QualityReviewSkill", f"Reviewing {step_name}")

        # LOCKED: Check if this production has QA lock (cannot proceed to distribution)
        if step_name == "final_qa" and production_id:
            if self.check_qa_lock(production_id):
                log_error("QualityReviewSkill", "QALocked",
                         f"Production {production_id} is QA-locked. Cannot proceed without --force-unlock.")
                return QualityReport(
                    step_name=step_name,
                    overall_score=0.0,
                    passed=False,
                    issues=["QA LOCK ENGAGED: Pipeline halted. Cannot proceed without manual unlock."],
                    recommendations=["Use --force-unlock {production_id} to override with documented reason."],
                    summary="Production locked by QA gate"
                )

        try:
            # Ask Claude to assess quality
            system_prompt = _load_prompt("quality_review")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": json.dumps({
                        "step_name": step_name,
                        "artifacts": artifacts,  # paths, metadata, stats
                        "quality_spec": spec,    # expected criteria
                        "threshold": threshold,
                        "required_checks": list(MINIMUM_PASSING_CHECKS.keys()) if step_name == "final_qa" else []
                    })
                }]
            )

            data = json.loads(response.content[0].text)

            # Validate and coerce to QualityReport schema
            report = QualityReport(
                step_name=step_name,
                overall_score=float(data.get("overall_score", 0.5)),
                passed=bool(data.get("passed", False)),
                issues=data.get("issues", []),
                recommendations=data.get("recommendations", []),
                summary=data.get("summary", "Review complete")
            )

            # LOCKED: For QA stage, validate minimum passing checks
            if step_name == "final_qa":
                check_scores = data.get("check_scores", {})
                min_checks = self.validate_minimum_checks(check_scores)

                log_info("QualityReviewSkill", f"Minimum checks validation: {min_checks['passed']}")

                if not min_checks["passed"]:
                    # LOCK: Minimum checks failed — engage QA lock
                    failed_checks = ", ".join(min_checks["failures"])
                    log_error("QualityReviewSkill", "MinimumChecksFailed",
                             f"Failed checks: {failed_checks}")

                    if production_id:
                        self.write_qa_lock(production_id, f"failed QA minimum: {failed_checks}")

                    report.passed = False
                    report.issues.append(f"LOCKED: Minimum QA checks failed: {failed_checks}")
                    report.summary = "QA LOCK ENGAGED: Cannot proceed to distribution"
                else:
                    log_info("QualityReviewSkill", "All minimum checks passed")

            decision = "PASS" if report.passed else "NEEDS WORK"
            log_decision(
                "QualityReviewSkill", f"quality_review_{step_name}", decision,
                f"Score: {report.overall_score:.2f}/{threshold}. Issues: {len(report.issues)}. "
                f"Recommendations: {len(report.recommendations)}",
                rationale=report.summary
            )

            return report

        except json.JSONDecodeError as e:
            log_error("QualityReviewSkill", "ParseError", str(e),
                     action_taken="returning default low-quality report")
            return QualityReport(
                step_name=step_name,
                overall_score=0.5,
                passed=False,
                issues=["Quality assessment failed; manual review recommended"],
                recommendations=[],
                summary="Could not automatically assess quality"
            )
        except Exception as e:
            log_error("QualityReviewSkill", "ReviewError", str(e),
                     action_taken="returning default low-quality report")
            return QualityReport(
                step_name=step_name,
                overall_score=0.5,
                passed=False,
                issues=["Quality review encountered an error"],
                recommendations=[],
                summary="Manual review recommended"
            )
