import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import ContentSignal, ContentUnit
from config import MODEL_OPUS
from logger import log_info, log_error, log_decision
from datetime import date, timedelta


SYSTEM_PROMPT = """You are ContentPlannerSkill — the Plan stage of an L&D content orchestrator.

Your job: convert a prioritised signal backlog into a weekly content plan.
Each ContentSignal must map to at least one ContentUnit.

Output a JSON array of ContentUnit objects. Each must include:
- id: UUID string
- outcome: specific learner behaviour (starts with action verb, e.g. "Explain X in own words")
- signal_ids: list of signal IDs that motivated this unit
- format: one of [video, interactive, reading, assignment]
- assigned_agent: name of the skill that will produce this unit
- target_publish_date: ISO date (within 5 days of today)
- evidence_method: one of [assignment, quiz, artifact]

Rules:
- Every signal_id from input must appear in at least one unit
- Outcomes must be measurable and learner-centred
- Prefer video format for concept explanations; assignment for application
- Do NOT create units for signals with confidence < 0.6
- Output ONLY valid JSON — no prose, no markdown fences
"""


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
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
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
