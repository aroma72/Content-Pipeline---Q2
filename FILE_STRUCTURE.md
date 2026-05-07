# Drawing Room — Project File Structure

```
Content Queen/
├── CLAUDE.md ............................ Project summary (brief + skills/agents folders listed)
├── SETUP_SUMMARY.md ..................... This setup guide (what was created and why)
├── FILE_STRUCTURE.md .................... This file
├── planning/
│   └── planning.md ...................... Comprehensive spec (schemas, SLAs, tech stack, orchestrator workflow)
├── skills/
│   ├── README.md ........................ Skill modules list + template
│   ├── signal_intake.py ................. (To be created Week 2)
│   ├── content_planner.py ............... (To be created Week 2)
│   ├── content_producer.py .............. (To be created Week 2)
│   ├── instructor_pack.py ............... (To be created Week 2)
│   ├── assignment_authoring.py .......... (To be created Week 2)
│   ├── session_close.py ................. (To be created Week 3)
│   ├── assignment_evaluation.py ......... (To be created Week 2)
│   └── content_reflect.py ............... (To be created Week 4)
├── agents/
│   ├── README.md ........................ Agent modules list + template
│   ├── recording_ingest_agent.py ........ (To be created Week 3)
│   ├── concept_segmentation_agent.py ... (To be created Week 3)
│   ├── essential_edit_agent.py ......... (To be created Week 3)
│   ├── micro_video_agent.py ............ (To be created Week 3)
│   ├── video_quality_gate_agent.py ..... (To be created Week 3)
│   └── learner_pack_publisher_agent.py . (To be created Week 3)
├── tests/
│   ├── README.md ........................ Testing structure
│   ├── test_signal_intake.py ........... (To be created Week 2)
│   ├── test_content_planner.py ......... (To be created Week 2)
│   ├── eval_dataset/ ................... Sample sessions (3 pilot + 1 blind held-out)
│   └── conftest.py ..................... Pytest fixtures + helpers
│
├── .claude/
│   ├── settings.json .................... Project hooks (context monitoring, logging, memory)
│   └── logs/
│       ├── session.log .................. Tool calls, gate transitions (auto-populated)
│       ├── decisions.log ................ Gate decisions, approvals, rebuilds (JSON audit trail)
│       ├── errors.log ................... Failures, retries, escalations (categorized)
│       └── archive/ ..................... (created by rotation, logs >7 days old)
│
├── memory/
│   ├── MEMORY.md ........................ Index of all memory files (one-line per entry)
│   ├── user_aroma.md .................... Role, responsibilities, decision authority
│   ├── project_goals.md ................. Mission, success metrics, scope boundaries
│   ├── project_timeline.md .............. 4-week phases, gate dates, contingencies
│   ├── arch_tech_stack.md ............... Models (Opus/Sonnet/Haiku), Whisper, ffmpeg, hosting, costs
│   ├── arch_schemas.md .................. Data contracts (ContentSignal, ContentUnit, etc.)
│   ├── feedback_build_philosophy.md ..... 6 core rules (start simple, measure, specialize, gates, logs)
│   ├── feedback_quality_gates.md ........ Weekly gates, SLAs, escalation paths, metrics
│   ├── ref_taleemabad.md ................ LMS integration, API endpoint, publishing format
│   └── ref_anthropic_practices.md ....... Agent patterns, caching, error handling, hooks, testing
│
├── weekly_artifacts/ .................... (Created weekly during Reflect stage)
│   └── week-W-YYYY/
│       ├── signal_backlog.md ............ Signals from Perceive (priorities, confidences)
│       ├── weekly_content_map.md ........ Content units from Plan (outcomes, signal refs)
│       ├── published_assets_log.md ...... Assets published (session IDs, URLs)
│       └── content_health_table.md ...... Outcomes: pass rates, completion, teacher confidence, decisions
│
├── recordings/ .......................... (To be created; monitored for new files)
│   ├── 2026-05-15_ai-mastery_session-1.mp4
│   ├── 2026-05-16_eq_session-2.mp4
│   └── ...
│
├── drafts/ ............................. (To be created; in-progress working files)
│   └── 2026-05-15_session-1/
│       ├── transcript.vtt
│       ├── segments.json
│       ├── essential_edit_draft.mp4
│       └── clips/
│           ├── clip_1_concept-A.mp4
│           └── clip_2_misconception-B.mp4
│
├── published/ .......................... (To be created; final bundles before platform push)
│   └── 2026-05-15_session-1/
│       ├── essential_session.mp4
│       ├── concept_clips/
│       ├── session_summary.md
│       ├── glossary.md
│       └── watch_order.md
│
├── review_queue/ ....................... (To be created; Aroma's approval queue)
│   ├── flagged_2026-05-15_session-1.json
│   └── approval_log.md
│
└── prompts/ ............................ (To be created Week 1; one per skill)
    ├── signal_intake.txt
    ├── content_planner.txt
    ├── content_producer.txt
    ├── instructor_pack.txt
    ├── session_close.txt
    ├── video_segmentation.txt
    ├── assignment_authoring.txt
    ├── assignment_evaluation.txt
    └── content_reflect.txt
```

---

## Directory Legend

### Root Level
- **CLAUDE.md** — Project identity (58 words, concise)
- **SETUP_SUMMARY.md** — What was set up and why (this session)
- **FILE_STRUCTURE.md** — This file

### planning/
- **planning.md** — Complete specification (250 lines, comprehensive)
  - Sections: Objective, Scope, Build Principles, Architecture, Agent/Skill Stack, Recording→Learner Pipeline, Gates, SLAs, Artifacts, Failure Handling, Weekly Rhythm, Publishing Standard, Assignment Layer, 4-Week Build Plan, Next 10 Days

### .claude/ (Project-Level Configuration)
- **settings.json** — Hooks for context monitoring, logging, memory management
  - Hooks: `on_context_95_percent`, `before_tool_call`, `after_tool_call`, `on_session_start`, `on_session_end`
  - Memory: auto-save interval, checkpoint on tool completion
  - Logging: session, decision, error logs

- **logs/** — Audit trail (auto-populated by hooks)
  - **session.log** — Operational trace (tool calls, gate transitions)
  - **decisions.log** — Decision audit (JSON format; gate outcomes, approvals, rebuilds)
  - **errors.log** — Failure tracking (categorized; transient vs non-retryable)
  - **archive/** — Rotated logs (daily; kept 7 days in active, then archived 90 days)

### memory/ (Project Knowledge Base)
- **MEMORY.md** — Index of all memory files (searchable, one-line per entry)
- **user_aroma.md** — Aroma's role, work style, decision authority
- **project_goals.md** — Mission, success metrics, scope, in/out of bounds
- **project_timeline.md** — 4-week phases, gate dates, risks, contingencies
- **arch_tech_stack.md** — Models (Opus/Sonnet/Haiku), tools (Whisper, ffmpeg), hosting, cost estimates
- **arch_schemas.md** — Data contracts for all core entities (quick reference)
- **feedback_build_philosophy.md** — 6 core rules + why + how to apply
- **feedback_quality_gates.md** — Weekly gates, SLAs, human review, escalation paths
- **ref_taleemabad.md** — LMS endpoint, API format, publishing workflow
- **ref_anthropic_practices.md** — Agent patterns, tool use, caching, hooks, testing

### weekly_artifacts/ (Generated Weekly)
- **week-W-YYYY/** — One folder per week (e.g., week-19-2026)
  - **signal_backlog.md** — Output from SignalIntakeSkill (Perceive stage)
  - **weekly_content_map.md** — Output from ContentPlannerSkill (Plan stage)
  - **published_assets_log.md** — Output from LearnerPackPublisherAgent (Observe stage)
  - **content_health_table.md** — Output from ContentReflectSkill (Reflect stage)

### recordings/ (Raw Input)
- **2026-05-15_ai-mastery_session-1.mp4** — Raw session video from Zoom/Google Meet
- Monitored by file watcher → triggers RecordingIngestAgent on arrival
- Formats: MP4, WebM, MOV (auto-convert to MP4)

### drafts/ (Work-in-Progress)
- **YYYY-MM-DD_session-N/** — One folder per session being processed
  - **transcript.vtt** — Full transcript from Whisper (with speaker labels)
  - **segments.json** — Concept segments from ConceptSegmentationAgent (must_keep, optional, remove)
  - **essential_edit_draft.mp4** — Draft from EssentialEditAgent (may be rough)
  - **clips/** — Concept clips from MicroVideoAgent (one per concept)

### published/ (Final Bundles)
- **YYYY-MM-DD_session-N/** — Ready for platform publication
  - **essential_session.mp4** — Final polished core video (30-60 mins)
  - **concept_clips/** — 5+ finished clips (2-4 mins each)
  - **session_summary.md** — Markdown summary + key takeaways
  - **glossary.md** — Term definitions
  - **watch_order.md** — Recommended viewing sequence
  - **metadata.json** — Platform publishing info (title, tags, transcript SRT)

### review_queue/ (Human Approval Gate)
- **flagged_YYYY-MM-DD_session-N.json** — Asset flagged by VideoQualityGateAgent
  - Contains: asset path, reason flagged, proposed action (approve/reject/revise)
  - Aroma reviews and approves/rejects within 24 hrs
- **approval_log.md** — Log of all approvals/rejections (audit trail)

### prompts/ (Week 1 Deliverable)
- **signal_intake.txt** — System prompt for SignalIntakeSkill
- **content_planner.txt** — System prompt for ContentPlannerSkill
- **content_producer.txt** — System prompt for ContentProductionSkill
- **instructor_pack.txt** — System prompt for InstructorPackSkill
- **session_close.txt** — System prompt for SessionCloseSkill
- **video_segmentation.txt** — System prompt for ConceptSegmentationAgent
- **assignment_authoring.txt** — System prompt for AssignmentAuthoringSkill
- **assignment_evaluation.txt** — System prompt for AssignmentEvaluationSkill
- **content_reflect.txt** — System prompt for ContentReflectSkill

Each prompt includes:
- Task description (what is the skill supposed to do?)
- Input schema (what does it receive?)
- Output schema (what must it produce?)
- Examples (3-5 real prior examples for prompt caching)
- Constraints (rules it must follow)

---

## File Creation & Auto-Population Timeline

### Already Created (Week 0 — Setup)
✅ CLAUDE.md (updated)
✅ SETUP_SUMMARY.md (this setup)
✅ FILE_STRUCTURE.md (this file)
✅ planning/planning.md (comprehensive spec + orchestrator workflow)
✅ .claude/settings.json (hooks)
✅ .claude/logs/session.log (template)
✅ .claude/logs/decisions.log (template)
✅ .claude/logs/errors.log (template)
✅ .claude/HOOKS_REFERENCE.md (all hooks + phases)
✅ memory/MEMORY.md (index)
✅ memory/user_aroma.md (all 9 memory files)
✅ memory/project_goals.md
✅ memory/project_timeline.md
✅ memory/arch_tech_stack.md
✅ memory/arch_schemas.md
✅ memory/feedback_build_philosophy.md
✅ memory/feedback_quality_gates.md
✅ memory/ref_taleemabad.md
✅ memory/ref_anthropic_practices.md
✅ skills/README.md (skill modules list + template)
✅ agents/README.md (agent modules list + template)
✅ tests/ (directory created; README TBD Week 1)

### To Be Created (Week 1)
⏳ prompts/*.txt (9 skill prompts; system prompts, examples, constraints)
⏳ tests/README.md (testing structure + fixtures)
⏳ tests/conftest.py (pytest fixtures + eval dataset loader)
⏳ config/orchestrator.yaml (Perceive→Plan→Act→Observe→Reflect sequencing)

### To Be Created (Weekly During Operation)
⏳ weekly_artifacts/week-W-YYYY/*.md (signal backlog, content map, health table)
⏳ recordings/*.mp4 (ingest via file watcher)
⏳ drafts/YYYY-MM-DD_session-N/* (work-in-progress)
⏳ published/YYYY-MM-DD_session-N/* (final bundles)
⏳ review_queue/* (flagged items for Aroma approval)

### Auto-Rotated Logs
⏳ .claude/logs/archive/session_YYYY-MM-DD.log (daily)
⏳ .claude/logs/archive/errors_YYYY-MM-DD.log (daily)

---

## Key Points for Implementation

1. **Prompts are Week 1 deliverable** — Create all 9 prompt files before any skill implementation
2. **Schemas are in planning.md + arch_schemas.md** — Implementation must match exactly
3. **Gates are logged automatically** — Hook fires on gate transitions
4. **Memory is auto-loaded** — Next session starts with context from MEMORY.md
5. **Decisions are auditable** — Every keep/rebuild/kill logged with rationale

---

*File structure finalized 2026-05-04. No changes without team approval.*
