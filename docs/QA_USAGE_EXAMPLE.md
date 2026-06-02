---
type: guide
last_verified: 2026-06-02
owner: aroma
---

# QA Rating System — Usage Examples

How to evaluate videos using the quality rating system.

---

## Example 1: Quick Evaluation (Visual Check)

**Scenario:** You've just rendered a new video and want to do a quick visual inspection before formal QA.

**Steps:**

1. **Open the video** in your video player
2. **Use the quick checklist** from `docs/QA_QUICK_REFERENCE.md`
3. **Score each factor 0–1:**
   - Accuracy: Are all facts correct? ✅ → 1.0
   - Objectives: Are all LOs covered? ✅ → 1.0
   - Post-Production: Audio/color/sync clean? ✅ → 0.95 (minor color inconsistency)
   - Visuals: Safe zone, typography correct? ✅ → 1.0
   - Storytelling: 3+ examples, WHY explained? ✅ → 0.90 (good but pacing slightly fast)
   - VO Quality: Clear, synced, proper pacing? ✅ → 0.95 (excellent overall)
   - QA Process: All checks passed? ✅ → 1.0

4. **Sum factors:** 1.0 + 1.0 + 0.95 + 1.0 + 0.90 + 0.95 + 1.0 = **6.8/7.0**

5. **Compare to threshold:** 6.8 ≥ 6.0 ✅ **PASS** → Approve for publication

---

## Example 2: Formal Rating with Python Skill

**Scenario:** You need a formal quality evaluation with documentation.

```python
from skills.quality_rating import rate_video, log_rating, check_video_gate

# Define your video
video_id = "autonomous_systems_part1"
video_path = "updated/autonomous_part1.mp4"
learning_outcomes = [
    "Explain autonomous system architecture",
    "Identify key components and their roles",
    "Describe feedback loops and control mechanisms"
]
script_text = """
Today we're exploring autonomous systems...
[full script here]
"""
context = {
    "course": "Autonomous Systems 101",
    "learner_level": "intermediate"
}

# Rate the video
rating = rate_video(
    video_id=video_id,
    video_path=video_path,
    learning_outcomes=learning_outcomes,
    script_text=script_text,
    context=context,
    minimum_threshold=6.0
)

# Log the rating
log_rating(rating)

# Check if it passes the publication gate
passes_gate, rating_data = check_video_gate(
    video_id=video_id,
    video_path=video_path,
    learning_outcomes=learning_outcomes,
    script_text=script_text,
    context=context,
    minimum_threshold=6.0
)

if passes_gate:
    print(f"✅ Video approved for publication (score: {rating['combined_score']}/7.0)")
else:
    print(f"❌ Video requires remediation (score: {rating['combined_score']}/7.0)")
    print(f"Failing factors: {rating['low_scoring_factors']}")
```

**Output:**
```json
{
  "video_id": "autonomous_systems_part1",
  "factors": {
    "accuracy": 0.95,
    "objectives_coverage": 1.0,
    "post_production": 0.85,
    "visuals": 0.90,
    "storytelling": 0.88,
    "voiceover_quality": 0.92,
    "qa_at_each_step": 1.0
  },
  "combined_score": 6.4,
  "status": "PASS",
  "minimum_threshold": 6.0,
  "passing_factors": 7,
  "failing_factors": 0,
  "low_scoring_factors": ["post_production (0.85)"],
  "remediation_required": false,
  "notes": "Minor color grading inconsistency frames 45-60. All other factors exemplary."
}
```

**Action:** ✅ Approve for publication. Post-production scored 0.85 (not critical), all other factors strong.

---

## Example 3: Identifying Remediation Issues

**Scenario:** A video scored 5.2/7.0 and failed. You need to figure out what to fix.

**Rating Output:**
```json
{
  "video_id": "data_structures_intro",
  "combined_score": 5.2,
  "status": "FAIL",
  "factors": {
    "accuracy": 0.95,
    "objectives_coverage": 0.70,
    "post_production": 0.90,
    "visuals": 0.85,
    "storytelling": 0.50,
    "voiceover_quality": 0.85,
    "qa_at_each_step": 0.95
  },
  "low_scoring_factors": [
    "objectives_coverage (0.70)",
    "storytelling (0.50)"
  ]
}
```

**Analysis:**

1. **Failing factors** (<0.6): Storytelling (0.50)
2. **Below-target factors** (0.6–0.8): Objectives Coverage (0.70)

**Root Causes:**

| Factor | Issue | Evidence |
|--------|-------|----------|
| **Storytelling 0.50** | Only Taleemabad example shown. Missing diverse domain examples. | Script review shows: "Learning platforms use arrays to store course data" (only ed-tech context) |
| **Objectives 0.70** | One learning outcome underexplored. | Outcome "Implement binary search" not covered with code example |

**Remediation Plan:**

**Option A (Script-based fix):**
- Add 3+ diverse examples to script (manufacturing inventory, hospital patient records, e-commerce product catalog)
- Add code example for binary search implementation
- Re-record voiceover with new script
- Re-render video
- Re-rate

**Option B (If time-constrained):**
- Extend video with supplementary segment (code walkthrough for binary search)
- Add graphics showing real-world examples (warehouse, hospital, store)
- Mux updated version
- Re-rate

**Next Steps:**

1. Create ticket: "Data Structures Intro — Remediation (Storytelling 0.50, Objectives 0.70)"
2. Implement fix (likely Option A — script + re-record)
3. Submit for re-evaluation
4. Log outcome in `.beads/qa_ratings.jsonl`

---

## Example 4: Weekly Quality Report

**Scenario:** End of week. You want to see quality metrics across all videos published this week.

```python
from skills.quality_rating import generate_weekly_report

report = generate_weekly_report("2026-06-02")
print(report)
```

**Output:**
```
# Weekly QA Report — 2026-06-02

## Summary
- **Total Videos Evaluated:** 12
- **Passed (≥6.0):** 9 (75%)
- **Conditional Pass:** 2 (16%)
- **Failed (<4.5):** 1 (8%)

## Quality Scores
- **Average Combined Score:** 6.2/7.0
- **Median Score:** 6.3/7.0

## Factor Health

| Factor | Average | Status |
|--------|---------|--------|
| Accuracy | 0.91 | ✅ |
| Objectives Coverage | 0.94 | ✅ |
| Post-Production | 0.78 | ⚠️ (needs work) |
| Visuals | 0.88 | ✅ |
| Storytelling | 0.85 | ✅ |
| VO Quality | 0.82 | ✅ |
| QA Process | 0.89 | ✅ |

## Videos Requiring Remediation

### data_structures_intro
- **Score:** 5.2/7.0 → **FAIL**
- **Failing Factors:** storytelling (0.50), objectives_coverage (0.70)
- **Notes:** Only Taleemabad example shown, binary search not covered with code example.
```

**Insights:**
- 75% pass rate is good ✅
- Post-Production factor at 0.78 (trend issue?) — investigate color grading process
- 1 critical failure requiring remediation
- Overall health: 6.2/7.0 is solid

---

## Example 5: Red Flags (When to Escalate)

**Scenario:** You're reviewing ratings and notice patterns.

### Red Flag 1: Same Factor Fails Twice
```
Video 1: storytelling 0.45 → Remediates → Video 1 retry: storytelling 0.50
Problem: Storytelling consistently failing despite rework
Action: Escalate to design review (systemic script issue?)
```

### Red Flag 2: Factor Trending Down
```
Week 1: Post-Production avg 0.88
Week 2: Post-Production avg 0.82
Week 3: Post-Production avg 0.75
Problem: Quality degrading
Action: Review audio/color/sync process. Has something changed?
```

### Red Flag 3: High Fail Rate
```
Week 4: 5 fails out of 10 videos (50% fail rate)
Problem: Unusual spike
Action: Check for script issues, rendering setup changes, or QA process breakdown
```

---

## Checklist: Before Submitting for Rating

Before sending a video for official QA evaluation, make sure it passes this pre-flight check:

- [ ] **Learning outcomes stated** at the start of the video
- [ ] **All objectives explicitly covered** in narration (with examples)
- [ ] **Script reviewed** for concept depth + 3+ diverse examples (see SCRIPTING_STANDARDS.md)
- [ ] **Frame count validated** — Root.tsx durationInFrames = (VO_seconds × 30) ± 30 frames
- [ ] **Text in safe zone** — all text inside padding 80px V, 120px H
- [ ] **SVG diagrams safe** — viewBox ≥850px height (if applicable)
- [ ] **Audio synced** — VO matches visuals (±0.1s)
- [ ] **All typography correct** — Georgia serif, correct sizes, max widths applied
- [ ] **Smoke test passed** — bash .claude/scripts/smoke-test.sh ✓
- [ ] **Pre-render checks documented** — all gates logged
- [ ] **No obvious errors** — watch the video start-to-finish once

**If all checked:** Video is ready for formal QA rating.

---

## Common QA Outcomes & Actions

| Score | Status | Action |
|-------|--------|--------|
| 5.5–7.0 | ✅ GOOD | Publish immediately. Log to `.beads/qa_ratings.jsonl`. |
| 4.9–5.4 | ✅ PASS | Publish + monitor. Note any concerns for next iteration. |
| <4.9 | ❌ FAIL | Return to production. Create remediation ticket. |

---

*For detailed rubrics, see `.claude/standards/QA_RATING_SYSTEM.md`*
*For quick reference, see `docs/QA_QUICK_REFERENCE.md`*
