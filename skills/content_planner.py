import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import ContentSignal, ContentUnit
from config import MODEL_OPUS, PROMPTS_DIR
from logger import log_info, log_error, log_decision
from datetime import date, timedelta


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


class ContentPlannerSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_OPUS

    def call(self, signals: list[ContentSignal], prior_health: list[dict] | None = None) -> list[ContentUnit]:
        log_info("ContentPlannerSkill", f"Planning units for {len(signals)} signals")

        payload = {
            "signals": [s.model_dump() for s in signals],
            "prior_health": prior_health or [],
            "today": str(date.today()),
            "publish_deadline": str(date.today() + timedelta(days=5))
        }

        try:
            system_prompt = _load_prompt("content_planner")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": json.dumps(payload)}]
            )

            data = json.loads(response.content[0].text)
            units = [ContentUnit(**item) for item in data]

            # Verify all signal IDs are referenced
            all_input_ids = {s.id for s in signals}
            mapped_ids = {sid for u in units for sid in u.signal_ids}
            unmapped = all_input_ids - mapped_ids

            if unmapped:
                log_error("ContentPlannerSkill", "UnmappedSignals",
                          f"{len(unmapped)} signal(s) not mapped to any unit",
                          action_taken="logged; gate will flag")

            log_decision(
                "ContentPlannerSkill", "plan_output", "success",
                f"{len(units)} units created; {len(unmapped)} signals unmapped",
                rationale=f"All signals processed; {len(signals) - len(unmapped)} fully covered"
            )
            return units

        except Exception as e:
            log_error("ContentPlannerSkill", "PlanningError", str(e), action_taken="returning empty list")
            return []
