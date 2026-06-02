---
type: reference
last_verified: 2026-06-02
owner: aroma
---

# QA Rating System — Complete Overview

Your internal video quality assurance framework. Every video rated on 7 factors before publication.

---

## What You Now Have

### 📋 **Standards & Rubrics**
- **`.claude/standards/QA_RATING_SYSTEM.md`** — Complete 7-factor rubric with detailed scoring (0.0–1.0 per factor)
  - Accuracy, Objectives Coverage, Post-Production, Visuals, Storytelling, Voice-Over Quality, QA at Each Step
  - Scoring guidance for each factor (1.0 = perfect, 0.5 = poor, 0.0 = unacceptable)
  - Minimum threshold: **6.0/7.0** (default, adjustable per course)
  - Remediation workflow (what to do if video fails)

### 📚 **Quick References**
- **`docs/QA_QUICK_REFERENCE.md`** — One-page guide to the 7 factors, scoring, and red flags
- **`docs/QA_USAGE_EXAMPLE.md`** — Real examples of rating videos, remediation, and weekly reports
- **`docs/QA_SYSTEM_OVERVIEW.md`** — This file. High-level reference.

### 🔧 **Automation & Tools**
- **`prompts/quality_rating.txt`** — Claude's evaluation prompt (rates videos against rubric)
- **`skills/quality_rating.py`** — Python skill to:
  - `rate_video()` — Evaluate a video, return 7 factor scores + combined score
  - `check_video_gate()` — Full QA gate (rate + determine pass/fail)
  - `log_rating()` — Append rating to `.beads/qa_ratings.jsonl` (audit trail)
  - `generate_weekly_report()` — Create weekly quality metrics report

### 📊 **Logging & Reporting**
- **`.beads/qa_ratings.jsonl`** — Append-only log. One JSON per line, one rating per video.
  - Captures: video_id, timestamp, all 7 factor scores, combined score, status, notes
  - Used to generate weekly/monthly quality reports
  - Tracks remediation history

---

## The 7 Quality Factors (At a Glance)

| # | Factor | Checks | Score 1.0 | Score 0.0 |
|---|--------|--------|----------|----------|
| 1 | **Accuracy** | Facts verified, no errors | Expert-reviewed, all correct | Multiple errors, misinformation |
| 2 | **Objectives** | All LOs taught | 100% explicit coverage | <60% of objectives addressed |
| 3 | **Post-Prod** | Audio, color, sync, encoding | Professional finish, clean | Glitches, sync loss, artifacts |
| 4 | **Visuals** | Text safe, typography, diagrams | Safe zone, no cutoff, readable | Text cutoff, unsafe zone breach |
| 5 | **Storytelling** | Narrative, concept depth, examples | Clear arc, WHY/HOW, 3+ diverse examples | Surface-level, only Taleemabad |
| 6 | **VO Quality** | Audio clarity, sync, pacing | Clear, tight sync, engaging | Muffled, sync drift, uneven |
| 7 | **QA Process** | Pre-render checks, gates, smoke test | All gates passed, documented | Process gaps, unchecked items |

---

## Scoring: From 0.0 to 7.0

### Combined Score Scale

```
7.0  ███████████████████████████████████ ✅ EXCELLENT
5.5  ✅ PASS (publish immediately)
4.9  ✅ PASS (minimum threshold)  ← DEFAULT MINIMUM
0.0  ❌ FAIL (must be remade)
```

### Decision Rules

| Combined Score | Status | Publication | Remediation |
|---|---|---|---|
| **5.5–7.0** | ✅ GOOD | Publish immediately | None |
| **4.9–5.4** | ✅ PASS | Publish + monitor | None (but watch quality) |
| **<4.9** | ❌ FAIL | DO NOT PUBLISH | Must remediate & re-rate |

---

## Key Rules (Never Break These)

### 🚫 Storytelling Requires 3+ Diverse Examples
- If only Taleemabad/ed-tech shown: **max score 0.7** (FAIL)
- Diverse domains: manufacturing, healthcare, finance, sports, cooking, architecture, etc.
- Taleemabad must be **final example**, not only one

### 🚫 Visuals Must Respect Safe Zone
- Text padding: **80px vertical, 120px horizontal** (from edge)
- Font size: **≥24px body, ≥28px bullets**
- SVG diagrams: **≥850px height** (no text cutoff)
- Typography: **Georgia serif, correct weights**

### 🚫 QA Process All Gates Checked
- Frame count: **VO_seconds × 30 ± 30 frames** (verified)
- Smoke test: **passed** (bash .claude/scripts/smoke-test.sh)
- Pre-render checks: **all documented**
- Git commits: **submodule FIRST, then main**

### 🚫 Minimum Threshold: 6.0/7.0
- Below 6.0: **cannot publish** (score <5.5 = immediate fail)
- 6.0–6.4: **acceptable** (pass with notes)
- 6.5+: **exemplary** (publish immediately)

---

## Workflow: From Video to Publication

```
Raw Video (Silent Render)
    ↓
Extract Voiceover (ffmpeg)
    ↓
Mux Audio + Video (ffmpeg)
    ↓
Formal QA Rating (rating_skill)
    │
    ├─→ 5.5–7.0: ✅ PUBLISH (no action)
    │
    ├─→ 4.9–5.4: ✅ PUBLISH + MONITOR (watch for issues)
    │
    └─→ <4.9: ❌ FAIL (return to production)
        ├─ Identify failing factors
        ├─ Create remediation ticket
        ├─ Fix (re-script, re-render, or re-check)
        ├─ Re-rate
        └─ Loop until ≥4.9
    ↓
Log to `.beads/qa_ratings.jsonl`
    ↓
Move to `updated/` folder
    ↓
Publish to Taleemabad
```

---

## How to Use It

### Quick Manual Evaluation (Pen & Paper)

1. Watch video start-to-finish
2. Open `docs/QA_QUICK_REFERENCE.md`
3. Score each of 7 factors (0–1) using the checklist
4. Sum → Combined score
5. Compare to minimum threshold
6. Log result (or pass to skill for formal rating)

### Formal Rating (Python Skill)

```python
from skills.quality_rating import check_video_gate

passes_gate, rating = check_video_gate(
    video_id="my_video_id",
    video_path="path/to/video.mp4",
    learning_outcomes=["objective 1", "objective 2"],
    script_text="full narration script",
    minimum_threshold=6.0
)

if passes_gate:
    print(f"✅ Approved (score: {rating['combined_score']}/7.0)")
else:
    print(f"❌ Rejected (score: {rating['combined_score']}/7.0)")
    print(f"Fix: {rating['low_scoring_factors']}")
```

### Weekly Quality Report

```python
from skills.quality_rating import generate_weekly_report

report = generate_weekly_report("2026-06-02")
print(report)  # Markdown report with metrics
```

---

## When a Video Fails (Score <6.0)

### Step 1: Identify Issues
- **Failing factors:** those scoring <0.6
- **Below-target factors:** 0.6–0.8
- Find the notes/timestamps explaining what's wrong

### Step 2: Categorize & Fix

| Issue Type | Failing Factors | Fix Action |
|---|---|---|
| **Script/Content** | Accuracy, Objectives, Storytelling | Rewrite script, add missing examples, re-record VO |
| **Visual/Design** | Visuals, Post-Production | Fix design, re-render, or re-mux |
| **Process** | QA at Each Step | Re-run checks, find & fix root cause |

### Step 3: Remediation Ticket

Create ticket with:
- Video ID
- Failing factors (with scores)
- Specific fix required
- Example: "Add 3 diverse domain examples + healthcare case study"

### Step 4: Fix & Re-Rate
- Implement fix
- Re-rate (must reach ≥6.0)
- If 2+ failures: escalate to design review

---

## Integration with Other Systems

### With SCRIPTING_STANDARDS.md
- **Storytelling factor** enforces SCRIPTING_STANDARDS.md rules
- Must have: concept depth (WHAT/WHY/HOW) + 3+ diverse examples
- Max score 0.7 if only Taleemabad context shown

### With VIDEO_PRODUCTION_RULES.md
- **Visuals factor** enforces text safety, SVG rules, typography
- **Post-Production factor** enforces frame count formula, audio/color standards
- **QA at Each Step** enforces pre-render checklist from standards

### With Content Pipeline
- QA gate comes **after** video muxing, **before** publishing
- Failed videos returned to production queue
- Approved videos moved to `updated/` folder
- All ratings logged for weekly reporting

---

## Reports & Dashboards

### Weekly Quality Report
```
Total Evaluated: 12
Passed: 9 (75%)
Conditional: 2 (16%)
Failed: 1 (8%)

Average Score: 6.2/7.0
Factor Health: [accuracy: 0.91, objectives: 0.94, post-prod: 0.78, ...]
Remediation: [1 video requires fixes]
```

### Tracking Metrics
- Pass rate (% scoring ≥6.0)
- Factor health (avg per factor)
- Failure rate trends
- Remediation count
- Time-to-publish (with/without remediation)

---

## Files & Locations

### Core System
- **`.claude/standards/QA_RATING_SYSTEM.md`** — Full rubric (detailed)
- **`prompts/quality_rating.txt`** — Claude's evaluation prompt
- **`skills/quality_rating.py`** — Python skill (orchestration)

### Quick Guides
- **`docs/QA_QUICK_REFERENCE.md`** — One-page checklist
- **`docs/QA_USAGE_EXAMPLE.md`** — Real examples & use cases
- **`docs/QA_SYSTEM_OVERVIEW.md`** — This file

### Data
- **`.beads/qa_ratings.jsonl`** — Append-only rating log
- **`.beads/failures.jsonl`** — Known issues (related)

### Related Standards
- **`.claude/standards/SCRIPTING_STANDARDS.md`** — Script requirements
- **`.claude/standards/VIDEO_PRODUCTION_RULES.md`** — Visual/technical rules
- **`.claude/standards/VOICEOVER_POLICY.md`** — Audio extraction/ElevenLabs

---

## Success Metrics

Your QA system is working when:

- ✅ **85%+ of videos pass first rating** (≥4.9)
- ✅ **Failing factors identifiable & fixable** (clear remediation path)
- ✅ **<5% videos fail after 1 remediation attempt** (process is working)
- ✅ **Post-Production factor >0.70 avg** (technical quality acceptable)
- ✅ **Storytelling factor >0.70 avg** (script quality good)
- ✅ **All 7 factors tracked weekly** (metrics visible)

---

## Next Steps

1. **First video:** Rate manually using `docs/QA_QUICK_REFERENCE.md`
2. **Second video:** Use Python skill `check_video_gate()`
3. **Weekly:** Generate report with `generate_weekly_report()`
4. **Monthly:** Review trends, adjust if needed

---

*Built: 2026-06-02*
*Minimum Threshold: 6.0/7.0*
*Remediation Required: Yes (if score <6.0)*
