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
  - Minimum threshold: **4.9/7.0** (all content types)
  - Remediation workflow (what to do if video fails)

### 📚 **Quick References**
- **`docs/QA_QUICK_REFERENCE.md`** — One-page guide to the 7 factors, scoring, and red flags
- **`docs/QA_USAGE_EXAMPLE.md`** — Real examples of rating videos, remediation, and weekly reports
- **`docs/QA_SYSTEM_OVERVIEW.md`** — This file. High-level reference.

### 🔧 **Automation & Tools**
- **`prompts/quality_rating.txt`** — Claude's evaluation prompt (rates videos against rubric)
- **`orchestrator/lib/stages/qa.js`** — the QA stage itself, and the only place the
  threshold exists. Scores the 7 factors, recomputes the total from them, appends to
  `.beads/qa_ratings.jsonl`, and rejects the run below the bar.

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

### 🚫 Minimum Threshold: 4.9/7.0
- Below 4.9: **cannot publish** — the run is rejected and the video remade
- 4.9–5.4: **acceptable** (publish with notes, monitor)
- 5.5+: **good** (publish immediately)

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

### Formal Rating (the live path)

Rating is not something you call by hand. The `qa` stage runs inside the
orchestrator spine after `produce` and before `review`
(`orchestrator/lib/stages/qa.js`). It scores the seven factors with an LLM judge,
recomputes the total from the factors rather than trusting the model's arithmetic,
and throws `RejectedError` below the bar — which the spine settles as a failed run,
so the video is never published.

```
node orchestrator/run.js <slug>      # qa runs as part of the pipeline
```

Every rating is appended to `.beads/qa_ratings.jsonl` as
`{type, at, runId, videoId, factors, combinedScore, threshold, status, weakestFactor, notes}`.

The threshold lives in exactly one place — `THRESHOLD` in
`orchestrator/lib/stages/qa.js` — and `orchestrator/test-regressions.js` asserts that
the judge prompt and the standards docs state that same number. There is no Python
entry point; `skills/quality_rating.py` was deleted in 2026-09 because it was
imported by nothing, disagreed with the enforced bar, and wrote this log in a third
incompatible shape.

### Weekly Quality Report

There is no report generator. `.beads/qa_ratings.jsonl` is the audit trail; read it
directly:

```bash
jq -s '[.[] | select(.type == "qa_rating")]
       | {n: length,
          passed: [.[] | select(.status == "PASS")] | length,
          avg: (map(.combinedScore) | add / length)}' .beads/qa_ratings.jsonl
```

Note the file carries one hand-written legacy row from before the stage existed,
which uses `combined_score`/`verdict` instead of `combinedScore`/`status` — hence
the `select(.type == "qa_rating")`.

---

## When a Video Fails (Score <4.9)

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
- Re-rate (must reach ≥4.9)
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
- Pass rate (% scoring ≥4.9)
- Factor health (avg per factor)
- Failure rate trends
- Remediation count
- Time-to-publish (with/without remediation)

---

## Files & Locations

### Core System
- **`.claude/standards/QA_RATING_SYSTEM.md`** — Full rubric (detailed)
- **`prompts/quality_rating.txt`** — Claude's evaluation prompt
- **`orchestrator/lib/stages/qa.js`** — the stage that scores and gates (owns `THRESHOLD`)

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

1. **Spot-check by hand** with `docs/QA_QUICK_REFERENCE.md` when a score looks wrong
2. **Trust the stage** for everything else — it runs on every pipeline execution
3. **Weekly:** read `.beads/qa_ratings.jsonl` (see the jq above)
4. **Monthly:** review trends; if the bar itself should move, change `THRESHOLD` in
   `orchestrator/lib/stages/qa.js` — the regression suite will then tell you every
   document that needs updating with it

---

*Built: 2026-06-02*
*Minimum Threshold: 4.9/7.0*
*Remediation Required: Yes (if score <4.9)*
