---
name: 4-Week Build Timeline
description: Drawing Room implementation phases and deadlines
type: project
---

## Timeline (Start: 2026-05-04)

### Week 1: Foundation (2026-05-04 to 2026-05-10)
**Goal**: Lock all schemas, templates, and evaluation rubrics.

- Finalize `ContentSignal`, `ContentUnit`, `InstructorBrief`, `SessionAssetBundle`, `ContentHealthRecord` schemas
- Lock learner/instructor template formats (markdown + MP4 spec)
- Define content health scoring rubric + keep/rebuild/kill decision matrix
- Define assignment schema + evaluation rubric template
- **Deliverable**: schemas.json + templates/ folder + rubrics.md
- **No code implementation yet** — contracts only

**Why**: Week 2 devs need zero ambiguity on data contracts. A week of planning saves 2 weeks of rework.

### Week 2: Pipeline V1 (2026-05-11 to 2026-05-17)
**Goal**: End-to-end orchestrator + skills on one real module (AI Mastery).

- Implement `SignalIntakeSkill` → prioritized backlog
- Implement `ContentPlannerSkill` → weekly content units from signals
- Implement learner + instructor pack generation
- Implement assignment authoring + evaluation
- **Pilot**: Run full weekly loop on AI Mastery; publish one test content unit
- **Deliverable**: Orchestrator + 4 skills operational; 1 test cycle logged

### Week 3: Video + Publishing (2026-05-18 to 2026-05-24)
**Goal**: Recording pipeline + learner asset automation + quality gates.

- Implement `RecordingIngestAgent` (transcription + speaker diarization)
- Implement `ConceptSegmentationAgent` + `EssentialEditAgent`
- Implement `MicroVideoAgent` + `VideoQualityGateAgent`
- Implement `LearnerPackPublisherAgent` → platform sync
- **Pilot**: Run on 2 live sessions; publish learner bundles to LMS
- **Connect**: Assignment evidence → reflect pipeline
- **Deliverable**: Recording ingest to published bundle in <8 hours per session

### Week 4: Reflect + Iterate (2026-05-25 to 2026-05-31)
**Goal**: Close the loop; measure outcomes; identify next improvements.

- Implement `ContentReflectSkill` (outcomes vs observed, keep/rebuild/kill decisions)
- Run full weekly reflect cycle; generate `content_health_table.md`
- Rebuild at least 2 underperforming units from prior cycles
- **Evaluate**: Test dataset pass/fail rates for all agents
- **Package**: Document process + agent setup for EQ/SQ modules
- **Deliverable**: First production-grade weekly cycle; ready to hand off to ops

---

## Immediate Next 10 Days (By 2026-05-14)
- Complete Week 1 schemas
- Run one full loop end-to-end (real session or synthetic)
- Publish one complete learner bundle from raw recording
- Generate first `content_health_table.md`

**Gate**: If schemas are ambiguous or templates don't work, Week 2 is blocked. No shortcuts.

---

## Risks & Contingency
- **Video processing cost overrun**: Throttle to 1 session/week if >$75/week
- **Assignment eval accuracy low (<70%)**: Extend Week 3 → run on 4 sessions before proceeding
- **Publishing API integration delayed**: Use manual LMS upload; automate in Week 4
- **Instructor feedback sparse**: Activate signal intake from office hours; lower confidence threshold

**Escalation**: If any gate deadline misses, Aroma + course lead decide: extend week or defer feature to Week 4 iteration.
