---
name: Data Schema Contracts
description: Core entity definitions for Drawing Room (ContentSignal, ContentUnit, etc.)
type: project
---

## Reference
Full schema definitions are in [planning/planning.md](../planning/planning.md) under "Content Schema Definitions" section. **This is a quick reference; source of truth is the planning doc.**

## Key Contracts

### ContentSignal
Represents an observed learner weakness or confusion pattern.
- **id**: UUID
- **source**: `learner_question`, `repeated_confusion`, `instructor_note`, `assignment_pattern`
- **concept_id**: Links to concept ontology
- **confidence**: 0.0-1.0 (strength of signal)
- **observed_date**: When was this detected?

### ContentUnit
A teachable concept + its artifacts + success criteria.
- **id**: UUID
- **outcome**: "Learner will be able to [verb] [concept] by [method]"
- **signal_ids**: Which signals map to this unit?
- **format**: `video`, `interactive`, `reading`, `assignment`
- **status**: `draft`, `ready_for_review`, `published`, `rebuild`, `archived`
- **evidence_method**: How we measure success (`assignment`, `quiz`, `artifact`)

### InstructorBrief
Ready-to-teach instructional material for a content unit.
- **content_unit_id**: Which unit does this brief support?
- **already_know**: Likely prerequisite knowledge
- **likely_weak**: Predicted misconceptions (watch during teaching)
- **do_not_reteach**: Topics learners usually get
- **explanation_variants**: 2-3 ways to explain the concept
- **example_bank**: Difficulty-ranked worked examples

### SessionAssetBundle
Final published outputs from a recorded session.
- **session_id**: UUID
- **essential_edit_mp4**: Path to cleaned-up core video
- **concept_clips**: List of 2-4 min clips
- **session_summary**: Markdown summary + key takeaways
- **glossary**: Term definitions
- **watch_order**: Recommended viewing sequence
- **status**: `draft`, `needs_review`, `publish_ready`, `published`

### ContentHealthRecord
Post-session evaluation: did the unit work?
- **unit_id**: Which unit was this?
- **cycle_week**: Which weekly cycle?
- **assignment_attempt_rate**: % learners who tried it
- **assignment_pass_rate_first_attempt**: % passed first try
- **video_completion_rate**: % watched to end
- **teacher_confidence**: Did instructor feel it worked?
- **decision**: `keep` (reuse), `rebuild` (improve), `kill` (remove)
- **decision_rationale**: Why this decision? (logged for audit)

---

## Schema Validation & Testing (Week 1)
- Validate schemas against at least 3 real prior session datasets
- Test round-tripping: signal → unit → asset → health record (no data loss)
- Define default values for optional fields
- Create examples for each schema (populate with real prior session data)

---

## Integration Points
- **SignalIntakeSkill** produces: ContentSignal (list)
- **ContentPlannerSkill** consumes: ContentSignal; produces: ContentUnit (list)
- **ContentProductionSkill** consumes: ContentUnit; produces: SessionAssetBundle (partial)
- **SessionCloseSkill** consumes: SessionAssetBundle (draft); produces: SessionAssetBundle (publish_ready)
- **ContentReflectSkill** consumes: SessionAssetBundle (published), assignment evaluations; produces: ContentHealthRecord

This is the contract — no agent deviates without consent from Aroma + course lead.
