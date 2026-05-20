import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import ContentUnit, LearnerPack
from config import MODEL_SONNET, PROMPTS_DIR
from logger import log_info, log_error, log_decision


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


class ContentProductionSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_SONNET

    def call(self, unit: ContentUnit) -> LearnerPack | None:
        log_info("ContentProductionSkill", f"Generating learner pack for unit {unit.id}")

        try:
            system_prompt = _load_prompt("content_producer")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
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
