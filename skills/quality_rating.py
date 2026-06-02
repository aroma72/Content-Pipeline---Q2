"""
QualityRatingSkill — evaluate video quality against 7-factor rubric.

Outputs JSON rating with combined 0–7 score, pass/fail status, and remediation requirements.
"""

import json
import os
from pathlib import Path
from datetime import datetime
import anthropic

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
QA_LOG_FILE = Path(__file__).parent.parent / ".beads" / "qa_ratings.jsonl"


def _load_prompt(name: str) -> str:
    """Load prompt from prompts/ directory."""
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text()


def rate_video(
    video_id: str,
    video_path: str,
    learning_outcomes: list[str],
    script_text: str,
    context: dict | None = None,
    minimum_threshold: float = 6.0,
) -> dict:
    """
    Evaluate a video against the QA_RATING_SYSTEM rubric.

    Args:
        video_id: Unique video identifier
        video_path: Path to MP4 file
        learning_outcomes: List of stated learning objectives
        script_text: Full narration script
        context: Optional context dict (course name, learner level, etc.)
        minimum_threshold: Minimum acceptable combined score (default 6.0)

    Returns:
        dict with factors, combined_score, status, and notes
    """
    if not Path(video_path).exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    if context is None:
        context = {"course": "Drawing Room", "learner_level": "general"}

    prompt = _load_prompt("quality_rating")

    client = anthropic.Anthropic()

    evaluation_input = {
        "video_id": video_id,
        "video_path": video_path,
        "learning_outcomes": learning_outcomes,
        "script_text": script_text,
        "context": context,
    }

    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": f"""{prompt}

EVALUATION INPUT:
{json.dumps(evaluation_input, indent=2)}

Evaluate this video and output the JSON assessment.""",
            }
        ],
    )

    response_text = response.content[0].text

    try:
        rating_data = json.loads(response_text)
    except json.JSONDecodeError:
        raise ValueError(f"Failed to parse rating response as JSON: {response_text}")

    rating_data["minimum_threshold"] = minimum_threshold

    rating_data["combined_score"] = sum(
        [
            rating_data["factors"].get(f, 0.0)
            for f in [
                "accuracy",
                "objectives_coverage",
                "post_production",
                "visuals",
                "storytelling",
                "voiceover_quality",
                "qa_at_each_step",
            ]
        ]
    )

    if rating_data["combined_score"] >= minimum_threshold:
        rating_data["status"] = "PASS"
        rating_data["remediation_required"] = False
    elif rating_data["combined_score"] >= 4.5:
        rating_data["status"] = "CONDITIONAL_PASS"
        rating_data["remediation_required"] = (
            rating_data["failing_factors"] > 0
        )
    else:
        rating_data["status"] = "FAIL"
        rating_data["remediation_required"] = True

    return rating_data


def log_rating(rating_data: dict) -> None:
    """
    Append rating to .beads/qa_ratings.jsonl log.

    Args:
        rating_data: Rating dict from rate_video()
    """
    QA_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

    log_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        **rating_data,
    }

    with open(QA_LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def check_video_gate(
    video_id: str,
    video_path: str,
    learning_outcomes: list[str],
    script_text: str,
    context: dict | None = None,
    minimum_threshold: float = 6.0,
) -> tuple[bool, dict]:
    """
    Full QA gate: evaluate video and determine if it passes publication gate.

    Returns:
        (passes_gate: bool, rating_data: dict)
    """
    rating_data = rate_video(
        video_id=video_id,
        video_path=video_path,
        learning_outcomes=learning_outcomes,
        script_text=script_text,
        context=context,
        minimum_threshold=minimum_threshold,
    )

    log_rating(rating_data)

    passes_gate = (
        rating_data["status"] == "PASS"
        or (
            rating_data["status"] == "CONDITIONAL_PASS"
            and rating_data["failing_factors"] == 0
        )
    )

    return passes_gate, rating_data


def generate_weekly_report(week_start_date: str) -> str:
    """
    Generate a weekly QA report from qa_ratings.jsonl.

    Args:
        week_start_date: ISO date string (e.g., "2026-06-02")

    Returns:
        Formatted markdown report
    """
    if not QA_LOG_FILE.exists():
        return "No QA ratings found yet."

    ratings = []
    with open(QA_LOG_FILE) as f:
        for line in f:
            entry = json.loads(line)
            timestamp = entry.get("timestamp", "")
            if timestamp.startswith(week_start_date[:7]):
                ratings.append(entry)

    if not ratings:
        return f"No QA ratings found for week starting {week_start_date}."

    total = len(ratings)
    passed = sum(1 for r in ratings if r["status"] == "PASS")
    conditional = sum(1 for r in ratings if r["status"] == "CONDITIONAL_PASS")
    failed = sum(1 for r in ratings if r["status"] == "FAIL")

    avg_score = sum(r["combined_score"] for r in ratings) / total if total else 0

    factor_scores = {
        "accuracy": [],
        "objectives_coverage": [],
        "post_production": [],
        "visuals": [],
        "storytelling": [],
        "voiceover_quality": [],
        "qa_at_each_step": [],
    }

    for rating in ratings:
        for factor, score in rating["factors"].items():
            if factor in factor_scores:
                factor_scores[factor].append(score)

    factor_averages = {
        k: sum(v) / len(v) if v else 0 for k, v in factor_scores.items()
    }

    report = f"""# Weekly QA Report — {week_start_date}

## Summary
- **Total Videos Evaluated:** {total}
- **Passed (≥6.0):** {passed} ({100*passed/total:.0f}%)
- **Conditional Pass:** {conditional} ({100*conditional/total:.0f}%)
- **Failed (<4.5):** {failed} ({100*failed/total:.0f}%)

## Quality Scores
- **Average Combined Score:** {avg_score:.2f}/7.0
- **Median Score:** {sorted([r["combined_score"] for r in ratings])[len(ratings)//2]:.2f}/7.0

## Factor Health

| Factor | Average | Status |
|--------|---------|--------|
| Accuracy | {factor_averages['accuracy']:.2f} | {"✅" if factor_averages['accuracy'] >= 0.85 else "⚠️"} |
| Objectives Coverage | {factor_averages['objectives_coverage']:.2f} | {"✅" if factor_averages['objectives_coverage'] >= 0.85 else "⚠️"} |
| Post-Production | {factor_averages['post_production']:.2f} | {"✅" if factor_averages['post_production'] >= 0.85 else "⚠️"} |
| Visuals | {factor_averages['visuals']:.2f} | {"✅" if factor_averages['visuals'] >= 0.85 else "⚠️"} |
| Storytelling | {factor_averages['storytelling']:.2f} | {"✅" if factor_averages['storytelling'] >= 0.85 else "⚠️"} |
| VO Quality | {factor_averages['voiceover_quality']:.2f} | {"✅" if factor_averages['voiceover_quality'] >= 0.85 else "⚠️"} |
| QA Process | {factor_averages['qa_at_each_step']:.2f} | {"✅" if factor_averages['qa_at_each_step'] >= 0.85 else "⚠️"} |

## Videos Requiring Remediation

"""
    remediation_videos = [r for r in ratings if r.get("remediation_required")]
    if remediation_videos:
        for rv in remediation_videos:
            report += f"\n### {rv['video_id']}\n"
            report += f"- **Score:** {rv['combined_score']:.2f}/7.0 → **{rv['status']}**\n"
            report += f"- **Failing Factors:** {', '.join(rv.get('low_scoring_factors', []))}\n"
            report += f"- **Notes:** {rv.get('notes', 'No notes')}\n"
    else:
        report += "None — all videos at or above minimum threshold.\n"

    return report


if __name__ == "__main__":
    print("QualityRatingSkill loaded. Use rate_video() or check_video_gate() to evaluate.")
