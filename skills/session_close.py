import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import SessionAssetBundle, LearnerPack
from config import MODEL_SONNET, PUBLISHED_DIR, PROMPTS_DIR
from logger import log_info, log_error, log_decision
from datetime import date


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


_SYSTEM_PROMPT_TEXT = """You are SessionCloseSkill — the Observe stage of an L&D content orchestrator.

Your job: generate the final session summary, glossary, and watch order for a session asset bundle.

Given the session transcript and concept list, output a JSON object with:
- session_summary: full markdown session summary (outcomes, key concepts, misconceptions, next steps)
- glossary: markdown table (Term | Definition | Example), minimum 5 terms
- watch_order: markdown ordered list (recommended viewing sequence with time estimates)

Rules:
- Summary must be usable by a learner who missed the session
- Glossary must match concepts actually discussed (do not invent terms)
- Watch order lists essential edit first, then clips by concept dependency order
- Output ONLY valid JSON — no prose, no markdown fences
"""


class SessionCloseSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_SONNET

    def call(
        self,
        bundle: SessionAssetBundle,
        transcript: str,
        concepts: list[str]
    ) -> SessionAssetBundle:
        log_info("SessionCloseSkill", f"Closing session {bundle.session_id}")

        payload = {
            "session_id": bundle.session_id,
            "session_date": bundle.session_date,
            "transcript_excerpt": transcript[:6000],
            "concept_clips": bundle.concept_clips,
            "concepts": concepts
        }

        try:
            system_prompt = _load_prompt("session_close")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": json.dumps(payload)}]
            )

            data = json.loads(response.content[0].text)

            # Write markdown files to published dir
            session_dir = PUBLISHED_DIR / bundle.session_id
            session_dir.mkdir(parents=True, exist_ok=True)

            summary_path = session_dir / "session_summary.md"
            glossary_path = session_dir / "glossary.md"
            watch_order_path = session_dir / "watch_order.md"

            summary_path.write_text(data["session_summary"], encoding="utf-8")
            glossary_path.write_text(data["glossary"], encoding="utf-8")
            watch_order_path.write_text(data["watch_order"], encoding="utf-8")

            bundle.session_summary = str(summary_path)
            bundle.glossary = str(glossary_path)
            bundle.watch_order = str(watch_order_path)
            bundle.status = "needs_review"

            log_decision(
                "SessionCloseSkill", "session_closed", "success",
                f"Session {bundle.session_id}: summary, glossary, watch_order written to {session_dir}",
                rationale="All markdown assets generated and persisted; ready for Aroma review"
            )
            return bundle

        except Exception as e:
            log_error("SessionCloseSkill", "CloseError", str(e),
                      action_taken="partial bundle returned; session flagged needs_review")
            bundle.status = "needs_review"
            return bundle
