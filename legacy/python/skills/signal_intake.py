import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import ContentSignal
from config import MODEL_OPUS, MIN_SIGNAL_CONFIDENCE, PROMPTS_DIR
from logger import log_info, log_error, log_decision


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


class SignalIntakeSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_OPUS

    def call(self, raw_signals: list[dict]) -> list[ContentSignal]:
        log_info("SignalIntakeSkill", f"Processing {len(raw_signals)} raw signals")

        try:
            system_prompt = _load_prompt("signal_intake")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": json.dumps({"raw_signals": raw_signals, "min_confidence": MIN_SIGNAL_CONFIDENCE})
                }]
            )

            data = json.loads(response.content[0].text)
            signals = [ContentSignal(**item) for item in data]

            log_decision(
                "SignalIntakeSkill", "perceive_output", "success",
                f"{len(signals)} signals extracted (confidence range: "
                f"{min(s.confidence for s in signals):.2f}-{max(s.confidence for s in signals):.2f})",
                rationale="Signals validated against schema and confidence threshold"
            )
            return signals

        except Exception as e:
            log_error("SignalIntakeSkill", "ExtractionError", str(e), action_taken="returning empty list")
            return []
