---
name: Quality Gates & SLA Targets
description: Non-negotiable gates per loop stage, human review checkpoints, and deadline expectations
type: feedback
---

## Weekly Loop Gates (Non-Negotiable)

### Perceive Gate — Monday 6am
**Requirement:** New signals in backlog OR explicit "no-new-signal" log
- Signal sources: learner forum posts, instructor confusion notes, assignment failures, office hours debrief
- Confidence threshold: ≥0.6 (logged in ContentSignal.confidence)
- **Failure mode:** No signals collected → loop stalls, carry forward to Tuesday with escalation

### Plan Gate — Monday 6pm
**Requirement:** Content units mapped 1:1 to signals (no signal left unmapped)
- Each ContentUnit must reference ≥1 signal_id
- Each unit has defined outcome, evidence method, and target publish date
- Instructor + Aroma review planned units; flag unclear outcomes for replanning
- **Failure mode:** Plan is ambiguous → gate extended to Tuesday; hold Act until Plan is clear

### Act Gate — Wednesday 6pm
**Requirement:** Learner pack + instructor pack both exist and reviewed by Aroma
- Learner pack: session summary, glossary, watch order (markdown templates filled)
- Instructor pack: teaching brief, example bank, time boxes (ready to use in class)
- Aroma spot-checks 20% of generated content (first 5 units + random sampling after)
- **Failure mode:** Content quality <70% (clarity/relevance) → rebuild with feedback, reschedule publish

### Observe Gate — End of Session (same day)
**Requirement:** Learner publishing bundle complete (essential edit + ≥5 concept clips)
- Essential edit: 30-60 mins, chapter markers, burned captions
- Concept clips: 2-4 mins each, one concept per clip, ready to publish
- Session summary: populated with key takeaways
- **Failure mode:** Video processing >8 hrs → flag for cost review; publish essential edit only, defer clips to next day

### Reflect Gate — Friday 6pm
**Requirement:** Each content unit tagged keep/rebuild/kill with rationale logged
- Compare: expected outcome (from plan) vs observed outcome (assignment pass rate, video completion, teacher feedback)
- Minimum metrics: assignment_attempt_rate, assignment_pass_rate_first_attempt, decision_rationale (required field)
- Aroma signs off on reflect decisions; escalates to course lead if rebuild ratio >30%
- **Failure mode:** Reflect missing deadline → hold weekly cycle status; publish incomplete health table as-is with "pending" marker

---

## Human Review Checkpoints (Aroma's Authority)

### Content Review (Wed)
**Trigger:** ContentProductionSkill outputs learner pack (draft)
**SLA:** Aroma reviews within 24 hours
**Decision:**
- ✅ Approve: Move to QA gate
- ❌ Reject: Return to skill with feedback for rebuild
- 🔄 Revise: Skill makes specific changes, Aroma re-reviews (max 2 rounds)

**Metrics checked:**
- Concept clarity (learner can understand without live explanation)
- Example relevance (examples match learner level, not course level)
- Tone consistency (matches course voice)

### Video QA Review (Thu-Fri)
**Trigger:** VideoQualityGateAgent flags `needs_review` (audio quality, concept gaps, duration non-compliance)
**SLA:** Aroma approves/rejects flagged clips within 24 hours
**Decision:**
- ✅ Approve: Flagged clip is actually publish-ready; override gate to publish
- ❌ Reject: Clip must be re-cut or re-transcribed; return to agent
- 🔄 Request Changes: Re-cut with specific feedback (e.g., "start at 2:15, end at 4:50")

**Metrics checked:**
- Audio quality: No dropouts, clear speech, acceptable background noise
- Concept completeness: Clip stands alone without prior context
- Duration: Exactly 2-4 minutes (or approved variation)
- Captions: Accurate, no drops, readable timing

### Reflect Review (Fri evening)
**Trigger:** ContentReflectSkill outputs health table with keep/rebuild/kill decisions
**SLA:** Aroma reviews and signs off by Friday 6pm
**Decision:**
- ✅ Approve: Decisions are sound; publish health table
- ❌ Override: Aroma disagrees with a decision; logs rationale and reclassifies unit
- 🔄 Escalate: Rebuild ratio >30% or cost overrun → involve course lead before finalizing

**Metrics checked:**
- Decision alignment: Does decision match metrics? (e.g., low pass rate = rebuild, not keep)
- Rebuild priority: Are highest-impact units prioritized first?
- Cost-benefit: Is rework justified by expected improvement?

---

## SLA Targets (Per 2-Hour Session Recording)

| Stage | Input | Output | Target | Buffer |
|-------|-------|--------|--------|--------|
| **Perceive** | — | signal_backlog.md | Weekly (Mon 6am) | — |
| **Plan** | signals | weekly_content_map.md | 12 hrs (Mon 6pm) | — |
| **Act** | units | learner + instructor packs | 24 hrs | — |
| **Observe** | recording | essential_edit.mp4 + 5+ clips | 8 hrs same-day | 4 hrs (next morning ok) |
| **Reflect** | outcomes | content_health_table.md | Weekly (Fri 6pm) | — |
| **Publish** | bundle | live on platform | Same-day after Aroma approval | — |

---

## Failure Escalation Path

### Perceive/Plan Gate Misses (by Tuesday 6am)
1. Log `loop_blocked` + reason in decision_log
2. Notify Aroma: what's blocking? (no signals? ambiguous plan?)
3. Decision: extend deadline 1 day OR trim plan scope
4. Carry forward unresolved signals to next week

### Act Gate Misses (by Thu)
1. Log content quality issues; specify which units failed review
2. Notify Aroma with feedback; assign to skill for rebuild
3. Parallel decision: publish only passing units Friday, defer rest to next week

### Observe Gate Misses (by EOD Thursday)
1. Log video processing error + duration
2. If >8 hrs: publish essential edit only; defer concept clips to Friday+
3. Cost review: if recurring, lower video resolution or reduce clip count

### Reflect Gate Misses (by Saturday morning)
1. Publish partial health table with `pending` status
2. Carry decisions forward to next week's plan
3. Aroma reviews and logs decisions early Monday

### Cost Overrun (>$75/week)
1. Log cost event with breakdown (API, storage, compute)
2. Notify Aroma + course lead immediately
3. Decision: throttle to 1 session/week, OR reduce video quality, OR reduce clip count
4. Adjust Week 4+ build plan if trend continues

---

## Metrics for Assessing Gate Health

- **Perceive on-time rate**: % weeks signal gate fires by Mon 6am target
- **Plan clarity**: % units that pass Act gate on first submission (no rework)
- **Act velocity**: Average hours from plan → learner pack ready
- **Observe throughput**: % sessions with publish bundle <8 hrs
- **Reflect completeness**: % units with decision + rationale logged
- **Overall loop reliability**: % weeks with zero blocked gates

**Target:** >90% on-time gate fires; <10% first-try rejections on Act; 0 silent failures.
