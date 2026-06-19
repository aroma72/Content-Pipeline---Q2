---
type: standards
last_verified: 2026-06-02
owner: aroma
---

# Video Quality Assurance Rating System

Internal QA framework for evaluating all content videos before publication.

---

## System Overview

### Scoring Structure
- **7 Quality Factors** — each rated independently 0.0 to 1.0
- **Combined Score** — sum of all 7 factors = **0.0 to 7.0** (maximum possible: 7.0)
- **Minimum Acceptable Rating** — set per course/context (typically 5.5–6.0)
- **Fail Threshold** — any video scoring below minimum must be **remade or substantially revised**

### The 7 Quality Factors

| # | Factor | Definition | Ideal State | Weight |
|---|--------|-----------|------------|--------|
| 1 | **Accuracy** | Content correctness, no misinformation, facts verified | All claims verified, no errors, expert-reviewed | 1.0 |
| 2 | **Objectives Coverage** | All stated learning outcomes explicitly addressed | 100% of objectives met, measurable evidence | 1.0 |
| 3 | **Post-Production** | Technical execution: color, sound mix, encoding, timing | No artifacts, clean transitions, professional finish | 1.0 |
| 4 | **Visuals** | Design clarity, typography safety, diagram quality, composition | No text cutoff, 850px+ viewBox, 28px+ bullets, safe zone respected | 1.0 |
| 5 | **Storytelling** | Narrative flow, engagement, pacing, concept depth | Clear progression, ONE protagonist followed in depth, WHY explained | 1.0 |
| 6 | **Voice-Over Quality & Accuracy** | Audio clarity, synchronization with visuals, script fidelity | Clean audio, precise sync, no jargon without definition | 1.0 |
| 7 | **QA at Each Step** | Process adherence, pre-render checks, frame count validation | All gates passed, smoke test clean, checklist complete | 1.0 |

---

## Detailed Rubric: Scoring 0.0 to 1.0 Per Factor

### 1. ACCURACY (0.0 to 1.0)

| Score | Criteria |
|-------|----------|
| **1.0** | ✅ All factual claims verified. No errors detected. Expert reviewed (if applicable). |
| **0.8–0.9** | ✅ Mostly accurate. Minor ambiguities exist but no misinformation. |
| **0.6–0.7** | ⚠️ Accurate overall but contains 1 disputed claim or needs fact-check confirmation. |
| **0.4–0.5** | ⚠️ Contains factual errors or unverified claims that could confuse learners. |
| **0.0–0.3** | ❌ Multiple errors, contradictions, or misinformation. Unsuitable for publication. |

**Evaluation Questions:**
- Are all factual statements correct?
- Have numbers/statistics been verified?
- Are technical definitions accurate?
- Does the script match the visuals (no misalignment)?
- Are there any contradictions within the video?

---

### 2. OBJECTIVES COVERAGE (0.0 to 1.0)

| Score | Criteria |
|-------|----------|
| **1.0** | ✅ All learning outcomes (LOs) explicitly taught. Learners can demonstrate competency. |
| **0.8–0.9** | ✅ 95%+ of LOs covered. One minor LO partially addressed. |
| **0.6–0.7** | ⚠️ 80–95% of LOs covered. 1–2 outcomes underexplored or assumed knowledge. |
| **0.4–0.5** | ⚠️ 60–80% of LOs covered. Multiple outcomes missing or vague. |
| **0.0–0.3** | ❌ <60% of LOs covered. Significant gaps. Learners cannot achieve objectives. |

**Evaluation Questions:**
- Were all learning outcomes explicitly stated at the start?
- Is each outcome addressed with examples and practice opportunity?
- Can a learner complete the assessment after watching?
- Are there gaps in the logical progression?
- Does the video end with explicit reinforcement of all objectives?

**Evidence of Completion:**
- Learning Outcomes checklist completed ✓
- Each outcome appears in video narration ✓
- Assessment aligns with all outcomes ✓

---

### 3. POST-PRODUCTION (0.0 to 1.0)

| Score | Criteria |
|-------|----------|
| **1.0** | ✅ Professional finish. Clean audio mix, correct color balance, smooth transitions, no artifacts. |
| **0.8–0.9** | ✅ Minor audio/color inconsistencies (fixable in <15 min). No glitches. |
| **0.6–0.7** | ⚠️ Noticeable audio levels, color grading issues, or rough transitions. Watchable but unprofessional. |
| **0.4–0.5** | ⚠️ Audio drop-outs, color banding, abrupt transitions, or encoding artifacts. Distracting. |
| **0.0–0.3** | ❌ Multiple technical failures: sync loss, audio clipping, visual glitches. Unwatchable. |

**Evaluation Checklist:**
- [ ] Audio level normalized (peak -3dB, RMS -20dB)
- [ ] No background noise or hum
- [ ] VO and music balanced correctly
- [ ] Color corrected for consistency (no sudden shifts)
- [ ] Video bitrate ≥4Mbps (1080p)
- [ ] No frame drops or encoding artifacts
- [ ] Frame count matches VO duration (± 30 frames max)
- [ ] Transitions smooth and purposeful (0.2–0.5s)
- [ ] No black frames at start/end
- [ ] Final codec: H.264, AAC audio

---

### 4. VISUALS (0.0 to 1.0)

| Score | Criteria |
|-------|----------|
| **1.0** | ✅ All text readable, safe zone respected, diagrams clear, no cutoff. Professional composition. |
| **0.8–0.9** | ✅ Text safe and readable. One minor diagram clarity issue (fixable). All typography correct. |
| **0.6–0.7** | ⚠️ Text mostly readable but borders tight. One design element unclear. Some font size issues. |
| **0.4–0.5** | ⚠️ Text cutoff at edges, unsafe zone breaches, or diagram labels too small. Hard to read. |
| **0.0–0.3** | ❌ Major text cutoff, unsafe zone violations, illegible diagrams, or composition fails. |

**Evaluation Checklist:**
- [ ] All text inside safe zone (padding 80px H, 120px V)
- [ ] No text below 24px (body) or 28px (bullets)
- [ ] SVG viewBox ≥850px height for 7-node diagrams
- [ ] Bullet font size ≥28px
- [ ] Max width applied to all text (1400px titles, 1200px body)
- [ ] No text with `white-space: nowrap`
- [ ] School of Life palette (#F5F1E8 bg, #6B5344 headings)
- [ ] Typography: Georgia serif, correct weights (700 titles, 400 body)
- [ ] Line height appropriate (1.15 titles, 1.45 bullets, 1.6 body)
- [ ] No scale() on text containers
- [ ] Images/diagrams visible and in-focus
- [ ] Color contrast ≥4.5:1 (WCAG AA)

---

### 5. STORYTELLING (0.0 to 1.0)

| Score | Criteria |
|-------|----------|
| **1.0** | ✅ Clear narrative arc. WHY explained. ONE protagonist followed in depth (friction→fix→structure→failure mode→payoff). Engaging pacing. Concept depth shown. |
| **0.8–0.9** | ✅ Strong storytelling. WHY and HOW explained. Single protagonist + scenario carried through, minor depth/pacing gap. |
| **0.6–0.7** | ⚠️ Logical progression but WHY shallow, OR the story is abstract (named character but concept not shown on their concrete task). |
| **0.4–0.5** | ⚠️ Disjointed narrative — domain-hops between examples or switches characters mid-script. Concept depth lacking. |
| **0.0–0.3** | ❌ No clear narrative, confusing progression, or purely surface-level explanation. |

**Evaluation Checklist:**
- [ ] Clear opening hook / leads with the answer (why does this matter?)
- [ ] Concept defined explicitly (not assumed knowledge)
- [ ] WHY explained (consequence of understanding/not understanding)
- [ ] HOW explained (mechanism or steps)
- [ ] ONE named, invented protagonist carries the whole script (not a real colleague)
- [ ] Stays in that protagonist's single scenario, in depth — no domain-hopping
- [ ] Pacing steady (no long pauses, no rushed segments)
- [ ] Transitions between topics smooth
- [ ] Closing reinforces main takeaway
- [ ] Follows SCRIPTING_STANDARDS.md
- [ ] No jargon without definition
- [ ] Examples are relatable and varied

---

### 6. VOICE-OVER QUALITY & ACCURACY (0.0 to 1.0)

| Score | Criteria |
|-------|----------|
| **1.0** | ✅ Clear, confident delivery. Proper pacing. Synchronized with visuals. No misspoken words. |
| **0.8–0.9** | ✅ Clear audio, good sync. One minor stumble or accent issue. Overall professional. |
| **0.6–0.7** | ⚠️ Audible but inconsistent pacing. Slight sync issues (< 0.5s drift). Some unclear words. |
| **0.4–0.5** | ⚠️ Audio quality poor or muffled. Sync drifts noticeably. Pacing uneven or too fast. |
| **0.0–0.3** | ❌ Unintelligible audio, major sync loss, or script not followed. |

**Evaluation Checklist:**
- [ ] VO audible and clear (no background noise)
- [ ] Appropriate pacing (not rushed, not dragging)
- [ ] Pronunciation correct (no mispronounced terms)
- [ ] Tone matches content (serious/casual as appropriate)
- [ ] Emphasis on key concepts (not monotone)
- [ ] Sync with visuals tight (±0.1s max drift)
- [ ] No dead air or long pauses
- [ ] Audio levels consistent throughout
- [ ] Script followed accurately (no ad-libs or major changes)
- [ ] VO extracted correctly (if using existing audio)
- [ ] No clipping or distortion
- [ ] Duration matches video duration (within 30 frames)

---

### 7. QA AT EACH STEP (0.0 to 1.0)

| Score | Criteria |
|-------|----------|
| **1.0** | ✅ All pre-render checks passed. Smoke test clean. Full checklist completed. Git commits clean. |
| **0.8–0.9** | ✅ Process followed. 1 minor check skipped but no impact on quality. |
| **0.6–0.7** | ⚠️ Most checks done. 1–2 process steps incomplete but visual result acceptable. |
| **0.4–0.5** | ⚠️ Some checks missing. Process gaps led to fixable issues. |
| **0.0–0.3** | ❌ Multiple process failures. QA gates not followed. Issues detected post-publication. |

**Evaluation Checklist (Process Gates):**
- [ ] **Schema validation:** ContentUnit valid JSON ✓
- [ ] **Script review:** Concept depth + 3+ examples verified ✓
- [ ] **Pre-render checks:**
  - [ ] Frame count = VO_seconds × 30 ± 30 frames
  - [ ] Root.tsx durationInFrames matches formula
  - [ ] SVG viewBox ≥850px (if applicable)
  - [ ] No conditional phase rendering
  - [ ] useCurrentFrame() used (not useVideoConfig())
  - [ ] All text inside safe zone
  - [ ] Max widths applied
  - [ ] Typography correct
- [ ] **Smoke test:** `bash .claude/scripts/smoke-test.sh` passed ✓
- [ ] **Post-render validation:**
  - [ ] Silent video renders (no encoding errors)
  - [ ] Duration correct (ffprobe confirmation)
  - [ ] VO extracted successfully
  - [ ] Mux successful (audio + video sync)
- [ ] **Final checklist (before publish):**
  - [ ] All objectives met
  - [ ] Visual safety verified (no text cutoff)
  - [ ] Audio quality spot-checked (2–3 sections)
  - [ ] No blank slides beyond audio
  - [ ] Video saved to `updated/`
  - [ ] Git commits in correct order (submodule FIRST)
- [ ] **Documentation:** QA log entry created ✓

---

## Quality Thresholds & Action Rules

### Scoring Bands

| Combined Score | Status | Action |
|---|---|---|
| **5.5–7.0** | ✅ **PASS** | Publish immediately. Good quality. |
| **4.9–5.4** | ✅ **PASS** (with notes) | Publish with review notes. Monitor quality. |
| **Below 4.9** | ❌ **FAIL** | Must be remade. Reject and return to production. |

### Minimum Acceptable Rating (Per-Course Baseline)

| Course Type | Minimum Score | Rationale |
|---|---|---|
| **Foundational** (concepts, new skill) | 4.9 | Achievable bar; focus on getting content out |
| **Applied** (case studies, practice) | 4.9 | Lower stakes; learner has foundation |
| **Supplementary** (optional, reference) | 4.9 | Lower stakes; supporting material |
| **Remedial** (re-teach, clarification) | 4.9 | Medium bar; learner struggling |

**Default for Drawing Room:** **4.9 minimum** (all content types)

### Remediation Workflow

**If score < 4.9 (Minimum):**

1. **Identify failing factors** (those scoring <0.6)
2. **Categorize issue type:**
   - **Script issue** (Accuracy, Objectives, Storytelling) → Rewrite script, re-record VO
   - **Visual issue** (Visuals, Post-Production) → Fix design/rendering, re-render
   - **Technical issue** (QA at Each Step) → Re-run checks, fix root cause
3. **Assign to remediation team** with specific factor scores
4. **Create remediation ticket** with required fixes
5. **Re-rate after fixes** (must reach ≥4.9 to proceed)
6. **Track remediation count** (if >2 attempts, escalate for design review)

---

## QA Rating Evaluation Process

### Step 1: Automated Checks (Technical Gates)
- Frame count validation ✓
- Video duration check ✓
- Audio sync verification ✓
- File encoding validation ✓
- SVG viewBox check ✓

### Step 2: Human Review (Rubric-Based)
1. **Watch full video** (note issues as they appear)
2. **Score each of 7 factors** independently (don't let one factor bias others)
3. **Document evidence** for any score <0.8 (cite timestamp, description)
4. **Sum all factors** → combined score
5. **Compare to minimum threshold** → PASS/FAIL/CONDITIONAL

### Step 3: Decision & Documentation
- **PASS:** Log in `.beads/qa_ratings.jsonl` → proceed to publish
- **FAIL:** Create remediation ticket → return to production
- **CONDITIONAL:** Flag for post-publication audit

---

## QA Rating Log Format

**File:** `.beads/qa_ratings.jsonl` (append-only)

```json
{
  "timestamp": "2026-06-02T14:32:00Z",
  "video_id": "autonomous_systems_part1",
  "evaluator": "aroma",
  "duration_seconds": 156.2,
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
  "notes": "Minor color grading inconsistency frames 45-60. Post-production 0.85 instead of 1.0. All other factors exemplary.",
  "passing_factors": 7,
  "failing_factors": 0,
  "low_scoring_factors": ["post_production (0.85)"],
  "remediation_required": false,
  "approved_for_publish": true
}
```

---

## Dashboard & Reporting

### Weekly Quality Report
```
┌─ CONTENT QUALITY REPORT ─────────────────────┐
│ Week of 2026-06-02                           │
├──────────────────────────────────────────────┤
│ Videos Evaluated:     12                      │
│ Passed (≥6.0):        9 (75%)                │
│ Conditional Pass:     2 (16%)                │
│ Failed (<4.5):        1 (8%)                 │
│                                              │
│ Average Score:        6.2/7.0                │
│ Median Score:         6.3/7.0                │
│                                              │
│ Factor Health:                               │
│  • Accuracy:          0.91 ✅                │
│  • Objectives:        0.94 ✅                │
│  • Post-Prod:         0.78 ⚠️ (needs work)  │
│  • Visuals:           0.88 ✅                │
│  • Storytelling:      0.85 ✅                │
│  • VO Quality:        0.82 ✅                │
│  • QA Process:        0.89 ✅                │
│                                              │
│ Remediation:                                 │
│  • New issues:        1 (post-production)    │
│  • Recheck:           1 (visuals)            │
│  • Closure:           1 (accuracy, approved) │
└──────────────────────────────────────────────┘
```

---

## Integration with Content Pipeline

### Pre-Publication Gate

```
Video Ready
    ↓
Automated QA (technical checks) → PASS/FAIL
    ↓ (if PASS)
Human QA Rating (rubric evaluation) → SCORE
    ↓ (if score ≥ minimum)
Publish Gate Cleared ✓
    ↓
Move to `updated/` folder
    ↓
Log in qa_ratings.jsonl
    ↓
Publish to Taleemabad
```

### Remediation Loop

```
Video Ready
    ↓
QA Rating: Score < Minimum
    ↓
Identify failing factors
    ↓
Create remediation ticket (with required fixes)
    ↓
Return to production (script re-record OR re-render)
    ↓
Rerun full QA
    ↓ (if still fails 2nd attempt)
Escalate for design review
```

---

## Notes for Evaluators

**Bias Prevention:**
- Rate each factor independently (don't let one low score affect others)
- If unsure, score conservatively (round down if borderline)
- Document all scores <0.8 with specific evidence

**Common Pitfalls:**
- Don't rate Storytelling 1.0 if the script domain-hops or stays abstract; 1.0 requires ONE protagonist followed in depth on a concrete task
- Don't score Visuals high if any text is outside safe zone (even slightly)
- Don't pass on QA at Each Step if pre-render checks not completed
- Don't score VO high if sync drifts >0.2s

**Remediation Strategy:**
- If 2+ factors <0.6, escalate to design review (not just a quick fix)
- If same factor fails twice, investigate root cause (not just retrying)
- Track patterns (e.g., "post-production consistently 0.75" → systemic issue)

---

*Last verified: 2026-06-02 (threshold updated to 4.9)*
