import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import ContentSignal
from config import MODEL_OPUS, MIN_SIGNAL_CONFIDENCE
from logger import log_info, log_error, log_decision


SYSTEM_PROMPT = """You are SignalIntakeSkill — the Perceive stage of an L&D content orchestrator.

Your job: analyse raw observations from learners, instructors, and assignments.
Output a ranked list of ContentSignal objects as a JSON array.

Each signal must include:
- id: a UUID string
- source: one of [learner_question, repeated_confusion, instructor_note, assignment_pattern]
- concept_id: short slug of the concept (e.g. "gradient_descent", "backpropagation")
- description: 1-2 sentence summary of what was observed
- confidence: float 0-1 (how strong/clear is this signal?)
- observed_date: ISO date string
- priority: high | medium | low (based on confidence + recurrence)

Rules:
- Only include signals with confidence >= 0.6
- Sort descending by confidence
- Merge near-duplicate signals into one with higher confidence
- Output ONLY valid JSON — no prose, no markdown fences
"""


class SignalIntakeSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_OPUS

    def call(self, raw_signals: list[dict]) -> list[ContentSignal]:
        log_info("SignalIntakeSkill", f"Processing {len(raw_signals)} raw signals")

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=SYSTEM_PROMPT,
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
