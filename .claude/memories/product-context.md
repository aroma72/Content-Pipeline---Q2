---
type: reference
last_verified: 2026-05-07
owner: aroma
---

> **Migrated 2026-09-21** from `memory/` into the warm tier, verbatim — no content was
> summarised or dropped. It has **not** been re-verified against the codebase since
> 2026-05-07, and much of it describes the originally-planned pipeline rather than the
> explainer-video pipeline that now ships. Treat it per the decay schedule in
> `.claude/standards/MEMORY_TIERS.md` §2: over 180 days, re-verify before acting.

Who owns what, what the project is for, and the LMS it publishes into.

## Role
Aroma is the primary content orchestrator for Taleemabad's agentic L&D system (Drawing Room). She:
- Approves content units and quality gates
- Reviews flagged assets before publication
- Provides signal validation (learner confusion, concept weakness)
- Decides on weekly keep/rebuild/kill decisions
- Owns instructor communication and session feedback loops

## Responsibilities
- **Weekly loop**: Perceive signals (3 hrs), approve plan (1 hr), review QA flags (2-3 hrs), reflect/decide (1 hr)
- **Session management**: Post-session asset review within 24 hours
- **Escalation**: Course lead alignment on rebuild decisions
- **Feedback loop**: Instructor debrief → signal intake → next cycle planning

## Work Style
- Prefers actionable summaries over verbose documentation
- Values clear decision artifacts (keep/rebuild/kill rationale logged)
- Wants terse status updates, not commentary
- Expects memory to be updated automatically when context is high; no manual archiving

## Decision Authority
- Approve/reject session content before platform publication
- Override agent flags if human judgment warrants
- Define signal thresholds for each course (confidence levels, concept weight)

Email: aroma.tahir@taleemabad.com


---

# Project Goals & Objectives

<!-- migrated verbatim from memory/project_goals.md on 2026-09-21 -->

## Primary Goal
Build an agentic content system that **automates session recording → learner asset pipeline** while maintaining pedagogical quality and instructor agency.

**Key outcome**: From a 2-hour raw session recording, produce publish-ready learner bundle (essential edit + 5+ concept clips + glossary + assignment) in <8 hours, with zero manual editing overhead.

## Success Metrics
- **Turnaround**: 100% of sessions with publish-ready assets same day
- **Quality**: ≥85% instructor confidence in generated content (no reteach needed)
- **Learner impact**: ≥75% assignment first-pass completion rate; ≥80% pass rate
- **Cost**: <$50/week API + storage for pilot (2 sessions/week)
- **Reliability**: Zero silent loop failures; all gates logged and recoverable

## Critical Path
1. **Week 1**: Finalize schemas + templates → no implementation risk in Week 2
2. **Week 2**: Signal→unit planning + content generation on 1 module (AI Mastery)
3. **Week 3**: Video pipeline (ingest→segment→edit→clip) on 2 live sessions + publish
4. **Week 4**: First reflect cycle, rebuild at least 1 low-performer, document process

## In Scope
- Session recording processing (transcription, segmentation, editing, clipping)
- Learner-facing content generation (summaries, glossary, watch order, assignments)
- Instructor pack generation (teaching brief, examples, time boxes)
- Weekly reflect loop with keep/rebuild/kill decisions
- Assignment evaluation + evidence aggregation

## Out of Scope
- LMS phase progression logic
- Intervention ladder ownership
- Platform-wide governance (handled outside Aroma)
- Live class delivery or 1:1 tutoring

**Why this scope**: Focuses Aroma on high-ROI content automation; partner teams own learner progression and support.


---

# Taleemabad LMS Integration Reference

<!-- migrated verbatim from memory/ref_taleemabad.md on 2026-09-21 -->

## Platform Details
- **Name**: Taleemabad LMS
- **Organization**: Internal learning management system for Agentic AI course and other modules
- **URL**: (TBD in Week 1)
- **Contact**: Course lead for API credentials + endpoint validation

## Publishing Integration

### API Endpoint (TBD Week 1)
- **Base URL**: (to be confirmed)
- **Method**: Batch upload (preferred) or per-asset upload (fallback)
- **Authentication**: API key (store in `.env`, never commit)
- **Rate limits**: (TBD)

### Asset Format Requirements
- **Video**: MP4, H.264 codec, AAC stereo, 1080p preferred
- **Metadata**: JSON with title, description, tags, duration, transcript (SRT)
- **Captions**: VTT or SRT format (check platform standard)
- **Thumbnail**: Optional; auto-generate from first frame if missing

### Publishing Workflow
1. SessionAssetBundle marked `publish_ready` after human approval
2. `LearnerPackPublisherAgent` batches assets → metadata JSON
3. Batch uploaded to Taleemabad API endpoint
4. Platform returns asset IDs and URLs
5. Watch order page auto-generated from metadata
6. Learners notified of new session materials (TBD)

### Known Limitations
- (TBD — discover in Week 1 API integration work)

## Contact & Escalation
- **Technical questions**: (Course lead or LMS admin)
- **Integration blockers**: Escalate to Aroma + course lead for workaround
- **Publishing delays**: If API is down, publish to Google Drive + notify learners (manual fallback)

## Examples (From Prior Sessions)
- (To be collected after first live session publish in Week 3)
