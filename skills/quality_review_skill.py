import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import QualityReport
from config import MODEL_OPUS, PROMPTS_DIR
from logger import log_info, log_error, log_decision


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


_SYSTEM_PROMPT_TEXT = """You are QualityReviewSkill — assess quality of video production artifacts.

Given production artifacts and quality criteria, provide:
- overall_score: float 0-1 (how well does output meet spec?)
- passed: bool (true if score >= threshold)
- issues: list of specific problems found
- recommendations: list of concrete improvements
- summary: 1-2 sentence assessment

Be objective. Common issues:
- Voiceover: pacing (too fast/slow), clarity, tone mismatch
- Animation: smoothness, color accuracy, timing alignment
- Video: sync issues, audio levels, resolution
- Captions: accuracy, timing, readability

Output ONLY valid JSON — no prose.
"""


class QualityReviewSkill:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = MODEL_OPUS

    def call(self, step_name: str, artifacts: dict, spec: dict, threshold: float = 0.80) -> QualityReport | None:
        """Review and score quality of any production step's output."""

        log_info("QualityReviewSkill", f"Reviewing {step_name}")

        try:
            # Ask Claude to assess quality
            system_prompt = _load_prompt("quality_review")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": json.dumps({
                        "step_name": step_name,
                        "artifacts": artifacts,  # paths, metadata, stats
                        "quality_spec": spec,    # expected criteria
                        "threshold": threshold
                    })
                }]
            )

            data = json.loads(response.content[0].text)

            # Validate and coerce to QualityReport schema
            report = QualityReport(
                step_name=step_name,
                overall_score=float(data.get("overall_score", 0.5)),
                passed=bool(data.get("passed", False)),
                issues=data.get("issues", []),
                recommendations=data.get("recommendations", []),
                summary=data.get("summary", "Review complete")
            )

            decision = "PASS" if report.passed else "NEEDS WORK"
            log_decision(
                "QualityReviewSkill", f"quality_review_{step_name}", decision,
                f"Score: {report.overall_score:.2f}/{threshold}. Issues: {len(report.issues)}. "
                f"Recommendations: {len(report.recommendations)}",
                rationale=report.summary
            )

            return report

        except json.JSONDecodeError as e:
            log_error("QualityReviewSkill", "ParseError", str(e),
                     action_taken="returning default low-quality report")
            return QualityReport(
                step_name=step_name,
                overall_score=0.5,
                passed=False,
                issues=["Quality assessment failed; manual review recommended"],
                recommendations=[],
                summary="Could not automatically assess quality"
            )
        except Exception as e:
            log_error("QualityReviewSkill", "ReviewError", str(e),
                     action_taken="returning default low-quality report")
            return QualityReport(
                step_name=step_name,
                overall_score=0.5,
                passed=False,
                issues=["Quality review encountered an error"],
                recommendations=[],
                summary="Manual review recommended"
            )
