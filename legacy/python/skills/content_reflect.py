import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import ContentUnit, AssignmentEvaluation, ContentHealthRecord
from config import MODEL_OPUS, MIN_PASS_RATE, PROMPTS_DIR
from logger import log_info, log_error, log_decision


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


_SYSTEM_PROMPT_TEXT = """You are ContentReflectSkill — the Reflect stage of an L&D content orchestrator.

Your job: compare expected outcomes against observed metrics and decide what to do with each content unit.

For each unit, output a JSON object (ContentHealthRecord) with:
- unit_id
- cycle_week
- assignment_attempt_rate: float 0-1
- assignment_pass_rate_first_attempt: float 0-1
- video_completion_rate: float 0-1 (if available, else null)
- learner_feedback_sentiment: positive|neutral|negative (if available, else null)
- teacher_confidence: high|medium|low (if available, else null)
- decision: keep | rebuild | kill
- decision_rationale: 1-2 sentence explanation
- rebuild_priority: high|medium|low (only if decision=rebuild, else null)

Decision logic:
- KEEP: pass_rate >= 0.80 AND completion >= 0.75 (or null) AND teacher says high/medium
- REBUILD: pass_rate between 0.50-0.79 OR teacher says low confidence AND clear hypothesis exists
- KILL: pass_rate < 0.50 AND no clear fix OR concept no longer in syllabus
- When in doubt between keep and rebuild, choose rebuild

Output ONLY valid JSON — no prose, no markdown fences.
"""


class ContentReflectSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_OPUS

    def call(
        self,
        unit: ContentUnit,
        evaluation: AssignmentEvaluation | None,
        cycle_week: int,
        video_completion_rate: float | None = None,
        learner_feedback: str | None = None,
        teacher_confidence: str | None = None
    ) -> ContentHealthRecord | None:
        log_info("ContentReflectSkill", f"Reflecting on unit {unit.id}")

        payload = {
            "unit": unit.model_dump(),
            "evaluation": evaluation.model_dump() if evaluation else None,
            "cycle_week": cycle_week,
            "video_completion_rate": video_completion_rate,
            "learner_feedback_sentiment": learner_feedback,
            "teacher_confidence": teacher_confidence,
            "pass_rate_target": MIN_PASS_RATE
        }

        try:
            system_prompt = _load_prompt("content_reflect")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": json.dumps(payload)}]
            )

            data = json.loads(response.content[0].text)
            record = ContentHealthRecord(**data)

            log_decision(
                "ContentReflectSkill", "reflect_decision", "success",
                f"Unit {unit.id}: decision={record.decision}, "
                f"pass_rate={record.assignment_pass_rate_first_attempt:.0%}",
                rationale=record.decision_rationale
            )
            return record

        except Exception as e:
            log_error("ContentReflectSkill", "ReflectError", str(e),
                      action_taken=f"unit {unit.id} health record skipped; marked pending")
            return None
