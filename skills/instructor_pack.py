import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import ContentUnit, InstructorBrief
from config import MODEL_SONNET, PROMPTS_DIR
from logger import log_info, log_error, log_decision
from datetime import date


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


class InstructorPackSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_SONNET

    def call(self, unit: ContentUnit) -> InstructorBrief | None:
        log_info("InstructorPackSkill", f"Generating instructor brief for unit {unit.id}")

        payload = {**unit.model_dump(), "session_date": str(date.today())}

        try:
            system_prompt = _load_prompt("instructor_pack")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
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
