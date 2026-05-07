import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import ContentUnit, LearnerPack
from config import MODEL_SONNET
from logger import log_info, log_error, log_decision


SYSTEM_PROMPT = """You are ContentProductionSkill — the Act stage of an L&D content orchestrator.

Your job: generate a complete learner-facing pack for a content unit.

Output a JSON object with these fields:
- unit_id: same as input
- session_summary: markdown string (heading + Learning Outcomes + Key Concepts + Common Misconceptions + Next Steps)
- glossary: markdown table (Term | Definition | Example) — min 5 terms
- watch_order: markdown ordered list (essential edit first, then concept clips, then optional quiz)
- key_concepts: list of concept strings (3-7 concepts)
- common_misconceptions: list of {misconception, clarification} dicts

Rules:
- Plain language: 12-14 year reading level unless course specifies otherwise
- Outcomes must be observable behaviours, not vague feelings
- Glossary definitions must be one sentence maximum
- Output ONLY valid JSON — no prose, no markdown fences
"""


class ContentProductionSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_SONNET

    def call(self, unit: ContentUnit) -> LearnerPack | None:
        log_info("ContentProductionSkill", f"Generating learner pack for unit {unit.id}")

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": json.dumps(unit.model_dump())}]
            )

            data = json.loads(response.content[0].text)
            pack = LearnerPack(**data)

            log_decision(
                "ContentProductionSkill", "learner_pack_generated", "success",
                f"Pack for unit {unit.id}: {len(pack.key_concepts)} concepts, {len(pack.common_misconceptions)} misconceptions addressed",
                rationale="LLM output validated against LearnerPack schema"
            )
            return pack

        except Exception as e:
            log_error("ContentProductionSkill", "GenerationError", str(e),
                      action_taken=f"unit {unit.id} flagged for manual review")
            return None
