import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import ContentUnit, Assignment
from config import MODEL_SONNET, PROMPTS_DIR
from logger import log_info, log_error, log_decision


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


_SYSTEM_PROMPT_TEXT = """You are AssignmentAuthoringSkill — the Act stage of an L&D content orchestrator.

Your job: design a learner assignment that proves the unit's outcome was achieved.

Output a JSON object with:
- unit_id: same as input
- title: short assignment title
- description: full assignment description (what to do, what to submit)
- submission_type: one of [commit, writeup, artifact, quiz]
- rubric: dict with keys {pass_criteria, common_failure_patterns, partial_credit_notes}
- deadline_days: integer (default 5)

Rules:
- Assignment must be completable independently (no instructor needed)
- Submission must produce a concrete evidence artifact
- rubric.pass_criteria must be binary and checkable (not vague)
- rubric.common_failure_patterns must list 3-5 known mistakes to watch for
- Output ONLY valid JSON — no prose, no markdown fences
"""


class AssignmentAuthoringSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_SONNET

    def call(self, unit: ContentUnit) -> Assignment | None:
        log_info("AssignmentAuthoringSkill", f"Authoring assignment for unit {unit.id}")

        try:
            system_prompt = _load_prompt("assignment_authoring")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=system_prompt,
                messages=[{"role": "user", "content": json.dumps(unit.model_dump())}]
            )

            data = json.loads(response.content[0].text)
            assignment = Assignment(**data)

            log_decision(
                "AssignmentAuthoringSkill", "assignment_generated", "success",
                f"Assignment '{assignment.title}' for unit {unit.id}; "
                f"type={assignment.submission_type}, deadline={assignment.deadline_days}d",
                rationale="Schema validated; rubric and pass criteria populated"
            )
            return assignment

        except Exception as e:
            log_error("AssignmentAuthoringSkill", "AuthoringError", str(e),
                      action_taken=f"unit {unit.id} assignment skipped")
            return None
