import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import Assignment, AssignmentEvaluation
from config import MODEL_HAIKU, PROMPTS_DIR
from logger import log_info, log_error, log_decision


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


_SYSTEM_PROMPT_TEXT = """You are AssignmentEvaluationSkill — the Observe stage of an L&D content orchestrator.

Your job: evaluate a batch of learner submissions against the assignment rubric.

Output a JSON object with:
- unit_id: same as input
- total_submissions: integer
- passed_first_attempt: integer
- pass_rate_first_attempt: float 0-1
- avg_time_to_completion_minutes: float
- by_learner: list of {learner_id, passed, attempts, feedback_note} dicts

Rules:
- A submission PASSES only if it meets ALL pass_criteria in the rubric
- Do not invent data; only evaluate submissions provided
- feedback_note must be actionable (1 sentence: what to fix or what was strong)
- Output ONLY valid JSON — no prose, no markdown fences
"""


class AssignmentEvaluationSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_HAIKU

    def call(self, assignment: Assignment, submissions: list[dict]) -> AssignmentEvaluation | None:
        log_info("AssignmentEvaluationSkill",
                 f"Evaluating {len(submissions)} submissions for unit {assignment.unit_id}")

        if not submissions:
            log_error("AssignmentEvaluationSkill", "NoSubmissions",
                      "No submissions to evaluate", action_taken="returning empty eval")
            return None

        payload = {
            "assignment": assignment.model_dump(),
            "submissions": submissions
        }

        try:
            system_prompt = _load_prompt("assignment_evaluation")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": json.dumps(payload)}]
            )

            data = json.loads(response.content[0].text)
            evaluation = AssignmentEvaluation(**data)

            log_decision(
                "AssignmentEvaluationSkill", "evaluation_complete", "success",
                f"Unit {assignment.unit_id}: pass rate {evaluation.pass_rate_first_attempt:.0%} "
                f"({evaluation.passed_first_attempt}/{evaluation.total_submissions})",
                rationale="All submissions evaluated against rubric pass_criteria"
            )
            return evaluation

        except Exception as e:
            log_error("AssignmentEvaluationSkill", "EvaluationError", str(e),
                      action_taken="evaluation skipped; health record will show null pass_rate")
            return None
