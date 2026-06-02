---
type: quick-reference
last_verified: 2026-06-02
owner: aroma
---

# QA Rating System — Quick Reference

One-page guide to the 7-factor quality rating system.

---

## The 7 Factors (0.0–1.0 each)

| Factor | What It Means | ✅ Score 1.0 | ❌ Score 0.0 |
|--------|---|---|---|
| **1. Accuracy** | All facts correct | All claims verified, no errors | Multiple factual errors |
| **2. Objectives** | All learning outcomes covered | 100% of objectives explicitly taught | <60% of objectives addressed |
| **3. Post-Prod** | Technical polish (audio, color, sync) | Clean audio, correct color, smooth transitions | Audio glitches, sync loss, artifacts |
| **4. Visuals** | Text safe, diagrams clear | Safe zone respected, no cutoff, Georgia serif | Text cutoff, unsafe zone breaches |
| **5. Storytelling** | Narrative & concept depth | Clear arc, WHY explained, 3+ diverse examples | Surface-level only, Taleemabad context only |
| **6. VO Quality** | Audio clarity & sync | Clear delivery, tight sync, proper pacing | Muffled audio, sync drift, unclear |
| **7. QA Process** | Pre-render checks done | All gates passed, smoke test clean | Process gaps, unchecked items |

---

## Combined Score → Status

```
7.0  ═══════════════════════════════════════════════
     ✅ EXCELLENT (5.5–7.0)
     → Publish immediately

5.5  ═══════════════════════════════════════════════
     ✅ PASS (4.9–5.4)
     → Publish with notes, monitor quality

4.9  ═══════════════════════════════════════════════ (MINIMUM THRESHOLD)
     
0.0  ❌ FAIL (<4.9)
     → Must be remade, return to production
```

---

## What Each Factor Actually Checks

### 1️⃣ ACCURACY
- [ ] All facts verified (no wrong dates, stats, definitions)
- [ ] No contradictions within video
- [ ] Script matches visuals (no mismatch)
- [ ] Technical terms defined correctly

### 2️⃣ OBJECTIVES COVERAGE
- [ ] All learning outcomes stated at start
- [ ] Each outcome explicitly addressed in narration
- [ ] Examples/evidence for each objective
- [ ] Learner can pass assessment after watching

### 3️⃣ POST-PRODUCTION
- [ ] Audio normalized (-3dB peak, -20dB RMS)
- [ ] No background noise, clipping, or distortion
- [ ] Colors consistent (no sudden shifts)
- [ ] Video bitrate ≥4Mbps
- [ ] No frame drops or encoding artifacts
- [ ] Sync tight (audio/video aligned)

### 4️⃣ VISUALS
- [ ] Text inside safe zone (80px V, 120px H padding)
- [ ] Font size ≥24px body, ≥28px bullets
- [ ] SVG diagrams ≥850px viewBox height
- [ ] Georgia serif font (no system UI)
- [ ] Max width applied (1400px titles, 1200px body)
- [ ] Color contrast ≥4.5:1 (readable)
- [ ] No text with `white-space: nowrap`

### 5️⃣ STORYTELLING
- [ ] Opening hook (why does this matter?)
- [ ] Concept defined explicitly
- [ ] WHY explained (consequence/relevance)
- [ ] HOW explained (mechanism/steps)
- [ ] 3+ diverse examples from different domains
- [ ] Taleemabad example is FINAL, not only one
- [ ] Follows SCRIPTING_STANDARDS.md
- [ ] Pacing consistent (not rushed, not dragging)

### 6️⃣ VOICEOVER QUALITY
- [ ] Audio clear and audible (no background noise)
- [ ] Appropriate pacing (not rushed, not slow)
- [ ] Proper pronunciation (no mispronounced terms)
- [ ] Emphasis on key concepts (not monotone)
- [ ] Sync with visuals tight (±0.1s max drift)
- [ ] No long dead air or pauses
- [ ] Consistent audio levels throughout
- [ ] Duration matches video (within 30 frames)

### 7️⃣ QA AT EACH STEP
- [ ] Frame count validated (VO_seconds × 30 ± 30 frames)
- [ ] SVG safe checked (viewBox ≥850px)
- [ ] useCurrentFrame() used (not useVideoConfig())
- [ ] Text safe zone verified
- [ ] Pre-render checks documented
- [ ] Smoke test passed
- [ ] Audio/video mux successful
- [ ] Git commits correct (submodule FIRST)

---

## Scoring Decisions

### Score 1.0: Perfect
"No improvement needed. Professional grade."

### Score 0.8–0.9: Good
"Minor issue exists (fixable in <15 min) but overall excellent."

### Score 0.6–0.7: Acceptable
"Noticeable issue but still watchable. Would need fixing in remediation."

### Score 0.4–0.5: Poor
"Multiple issues OR one major deficiency. Video struggles."

### Score 0.0–0.3: Unacceptable
"Fundamental failure. Cannot publish until resolved."

---

## Remediation Workflow

**Video Scores: 5.2/7.0 → FAIL (below 6.0 threshold)**

1. **Identify failing factors** (those <0.6)
   - Example: Storytelling 0.5, Visuals 0.7, VO Quality 0.6
   
2. **Categorize the issues:**
   - Script issue (Accuracy, Objectives, Storytelling) → **Rewrite & re-record VO**
   - Visual issue (Visuals, Post-Prod) → **Re-render video**
   - Process issue (QA at Each Step) → **Re-run checks, find root cause**
   
3. **Create remediation ticket:**
   - Video ID: autonomous_part2
   - Failing factors: Storytelling (0.5), needs 3+ diverse examples
   - Action: Rewrite script with manufacturing + healthcare + finance examples, re-record VO
   
4. **Fix & re-rate:**
   - Rewrite, re-render, rerun QA
   - Submit for re-evaluation
   - Must reach ≥6.0 minimum to proceed
   
5. **If still failing after 2 attempts:**
   - Escalate to design review
   - Investigate systemic issue (not just retrying)

---

## When Factors Commonly Fail

| Factor | Common Cause | Quick Fix |
|--------|---|---|
| **Accuracy** | Script has wrong stats | Verify all facts, update script |
| **Objectives** | Learning outcome not in narration | Add explicit mention to script |
| **Post-Prod** | Audio level too quiet | Normalize audio (-20dB RMS) and re-mux |
| **Visuals** | Text too close to edge | Increase safe zone padding to 80×120 |
| **Storytelling** | Only Taleemabad example | Add 2+ other domain examples to script |
| **VO Quality** | Sync off by 0.5s+ | Re-trim video or adjust VO timing |
| **QA Process** | Frame count not validated | Verify: VO_seconds × 30 ± 30 frames |

---

## Red Flags (Instant Fail)

❌ **Instant Fail (0.0):**
- Text completely cut off (outside viewport)
- Audio unintelligible or missing
- Video unplayable or corrupted
- Script obviously unreviewed/incomplete

⚠️ **Likely Fail (<4.5):**
- Only Taleemabad example shown (Storytelling max 0.5)
- 2+ factors scoring <0.4
- Same factor fails twice (systemic issue)

---

## Pre-Submission Checklist (Before Rating)

Before submitting a video for QA evaluation:

- [ ] **Script reviewed** — concept depth, 3+ diverse examples?
- [ ] **Frame count correct** — Root.tsx durationInFrames = VO_seconds × 30 ± 30?
- [ ] **Text safe zone** — all text inside padding 80×120px?
- [ ] **SVG safe** — viewBox ≥850px height?
- [ ] **Audio synced** — VO matches video (±0.1s)?
- [ ] **Smoke test passes** — bash .claude/scripts/smoke-test.sh ✓
- [ ] **Pre-render checks** — all documented and passed?
- [ ] **Learning outcomes** — stated and explicitly covered in video?

**If all checked:** Ready for QA rating.
**If any unchecked:** Fix before submitting.

---

## Realistic Scoring Targets

**All 7 factors at 1.0 = 7.0:**
- Very rare. Requires perfection across all dimensions.

**Most videos score 4.9–6.0:**
- 5.0–5.5: Acceptable, publishable quality (minimum viable)
- 5.5–6.0: Good quality, no major issues

**Video is viable for publication at 4.9+:**
- Below 4.9: Critical gaps, must remediate
- 4.9+: Can publish, monitor for next iteration

---

## Questions for Evaluators

**When scoring, ask:**

- Can I clearly understand what this video teaches?
- Would a learner be able to apply what they learned?
- Is all text on screen readable?
- Can I hear the narrator clearly?
- Does the pacing feel right (not too fast, not too slow)?
- Are the examples clear and diverse?
- Does the video feel finished and professional?

**If ANY answer is "no," that factor scores <0.8.**

---

*See `.claude/standards/QA_RATING_SYSTEM.md` for full rubrics and detailed scoring guidelines.*
