import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import ContentUnit, InstructorBrief
from config import MODEL_SONNET
from logger import log_info, log_error, log_decision
from datetime import date


SYSTEM_PROMPT = """You are InstructorPackSkill — the Act stage of an L&D content orchestrator.

Your job: generate a ready-to-teach instructor brief for a content unit.

Output a JSON object with:
- content_unit_id: same as input
- session_date: ISO date string
- already_know: list of prerequisites learners likely have
- likely_weak: list of concepts learners are commonly confused about
- do_not_reteach: list of topics learners typically understand already
- explanation_variants: dict mapping each hard concept to a list of 2-3 alternative phrasings
- example_bank: list of {title, code_or_scenario, difficulty: easy|medium|hard} dicts (min 5)
- time_box_minutes: recommended session time for this unit

Rules:
- Write for a confident instructor who knows the subject but wants ready-to-use material
- explanation_variants must be genuinely different (metaphor, analogy, code-first, diagram-first)
- example_bank items must be self-contained and runnable/completable by learner alone
- Output ONLY valid JSON — no prose, no markdown fences
"""


class InstructorPackSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_SONNET

    def call(self, unit: ContentUnit) -> InstructorBrief | None:
        log_info("InstructorPackSkill", f"Generating instructor brief for unit {unit.id}")

        payload = {**unit.model_dump(), "session_date": str(date.today())}

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": json.dumps(payload)}]
            )

            data = json.loads(response.content[0].text)
            brief = InstructorBrief(**data)

            log_decision(
                "InstructorPackSkill", "instructor_brief_generated", "success",
                f"Brief for unit {unit.id}: {len(brief.example_bank)} examples, "
                f"{brief.time_box_minutes} min time box",
                rationale="Schema validated; all required fields populated"
            )
            return brief

        except Exception as e:
            log_error("InstructorPackSkill", "GenerationError", str(e),
                      action_taken=f"unit {unit.id} instructor brief skipped")
            return None
