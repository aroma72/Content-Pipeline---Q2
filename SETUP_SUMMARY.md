# Drawing Room — Setup Complete

## What Was Created (2026-05-04)

This document summarizes the complete project setup following Anthropic best practices for agentic systems.

---

## 1. Project Configuration

### CLAUDE.md (Updated)
- **Location**: `./CLAUDE.md`
- **Purpose**: Concise project overview (58 words)
- **Key point**: Emphasizes memory + logs auto-update at 95% context window

### Settings with Hooks
- **Location**: `./.claude/settings.json`
- **Purpose**: Defines project-level hooks for context monitoring, logging, and memory persistence
- **Hooks configured**:
  - ✅ `context_window_threshold_percent: 95` — triggers memory flush + notification
  - ✅ `before_tool_call` — logs all tool inputs
  - ✅ `after_tool_call` — logs results and errors
  - ✅ `on_session_start` — loads memory context
  - ✅ `on_session_end` — archives logs and updates memory index

**Why**: Prevents context loss during long sessions; creates audit trail.

---

## 2. Memory System (Per Anthropic Docs)

### MEMORY.md (Index)
- **Location**: `./memory/MEMORY.md`
- **Purpose**: Master index of all memory files (max ~150 chars per entry)
- **Structure**: Organized by type (User, Project, Architecture, Feedback, References)

### Memory Files Created

#### User Profile
- **[user_aroma.md](./memory/user_aroma.md)** — Aroma's role, responsibilities, decision authority, work style

#### Project Context
- **[project_goals.md](./memory/project_goals.md)** — Mission, success metrics, critical path, scope boundaries
- **[project_timeline.md](./memory/project_timeline.md)** — 4-week build phases, gate dates, risk contingencies

#### Architecture & Tech
- **[arch_tech_stack.md](./memory/arch_tech_stack.md)** — Claude models per task, Whisper, ffmpeg, hosting, cost estimates, storage design
- **[arch_schemas.md](./memory/arch_schemas.md)** — Data contracts for ContentSignal, ContentUnit, InstructorBrief, SessionAssetBundle, ContentHealthRecord

#### Feedback & Constraints
- **[feedback_build_philosophy.md](./memory/feedback_build_philosophy.md)** — 6 core rules: start simple, measure weekly, specialize only when needed, no half-finished work, gates are non-negotiable, log all decisions
- **[feedback_quality_gates.md](./memory/feedback_quality_gates.md)** — 5 weekly loop gates, human review checkpoints, SLAs, escalation paths, metrics

#### References
- **[ref_taleemabad.md](./memory/ref_taleemabad.md)** — LMS integration endpoint, API format, publishing workflow
- **[ref_anthropic_practices.md](./memory/ref_anthropic_practices.md)** — Core principles, tool patterns, prompt caching, error handling, hook config, model selection, testing checklist

**Why memory files**:
- Future sessions load context without re-reading planning docs
- Decisions are auditable and searchable
- Constraints are explicit (no blind spots when iterating)
- Team members can onboard by reading MEMORY.md

---

## 3. Logging Infrastructure

### Log Directory
- **Location**: `./.claude/logs/`
- **Files created**:
  - **session.log** — Tool calls, gate transitions, skill completions
  - **decisions.log** — Gate outcomes, approvals, rebuilds, escalations (JSON format for parsing)
  - **errors.log** — Failures, retries, escalations with categorization

**Why separate logs**:
- Session = operational trace (what happened?)
- Decisions = decision audit trail (why was this chosen?)
- Errors = troubleshooting + pattern detection (what broke and how often?)

**Auto-rotation**:
- Hooks flush logs when context reaches 95%
- Daily rotation; archived after 90 days
- Decision log kept indefinitely for audit

---

## 4. Key Artifacts & Their Locations

### Planning Documents
- **./planning/planning.md** — Comprehensive plan with schema definitions, storage architecture, quality gates, cost estimates

### Weekly Artifacts (To Be Generated)
- `./weekly_artifacts/week-W-YYYY/signal_backlog.md` — Perceive outputs
- `./weekly_artifacts/week-W-YYYY/weekly_content_map.md` — Plan outputs
- `./weekly_artifacts/week-W-YYYY/published_assets_log.md` — Publish outputs
- `./weekly_artifacts/week-W-YYYY/content_health_table.md` — Reflect outputs

### Working Directories (To Be Created)
- `./recordings/` — Raw session videos (monitored by file watcher)
- `./drafts/` — In-progress artifacts (transcript, segments, draft edits)
- `./published/` — Final bundles before platform sync
- `./review_queue/` — Flagged items awaiting Aroma approval

---

## 5. Hooks Overview (Per Anthropic Best Practices)

### Why Hooks?
Hooks automate tedious persistence and logging tasks; they prevent context loss and decision loss.

### Configured Hooks

| Hook | Trigger | Action | Why |
|------|---------|--------|-----|
| `on_context_95_percent` | Context window reaches 95% | Flush memory, logs, plan state; notify user | Prevent mid-session context loss |
| `before_tool_call` | Before any tool execution | Log tool name + inputs | Create operational audit trail |
| `after_tool_call` | After tool completes | Log results + errors; check for failures | Detect issues early; track success rates |
| `on_session_start` | Session begins | Load memory + project context | Start with full context, no cold start |
| `on_session_end` | Session ends | Archive logs; update memory index | Clean shutdown; persist decisions |

### Additional Hooks to Consider (Week 1 Discovery)

1. **`on_gate_transition`** — Log when loop moves between stages (Perceive → Plan → Act → etc.)
   - **When to add**: Once gates are implemented and need monitoring
   - **Action**: Emit structured gate-pass/gate-fail event to decision log

2. **`on_cost_threshold`** — Alert if API/compute costs exceed weekly budget ($50)
   - **When to add**: Week 2, once token counting is integrated
   - **Action**: Notify Aroma; trigger throttling logic (reduce clip count or video quality)

3. **`on_assignment_evaluation_complete`** — Emit pass/fail rates to decision log
   - **When to add**: Week 2, once assignment evals are running
   - **Action**: Log assignment outcomes for ContentReflectSkill consumption

4. **`on_rebuild_decision`** — Flag unit for rework + alert instructor if teach date approaching
   - **When to add**: Week 4, once reflect loop is operational
   - **Action**: Create rebuild task + notify course lead

### How to Add Hooks (When Needed)
1. Edit `./.claude/settings.json` (or `./.claude/settings.local.json` for user overrides)
2. Add new hook entry under `"hooks"` section
3. Document in MEMORY.md / feedback_quality_gates.md
4. Test hook firing during next session

---

## 6. Recommended Next Steps (Week 1 — Before Building)

### Schema & Template Finalization
- [ ] Review all 5 core schemas in `arch_schemas.md`; adjust field names if needed
- [ ] Create example JSON files for each schema (reference data for implementation)
- [ ] Validate schemas against 3 real prior session datasets
- [ ] Get course lead approval on signal confidence thresholds + keep/rebuild/kill decision criteria

### Template Finalization
- [ ] Finalize learner session summary markdown template
- [ ] Finalize instructor brief format (time boxes, explanation variants, example bank structure)
- [ ] Finalize glossary markdown template
- [ ] Finalize watch order format
- [ ] Lock video specs (1080p, MP4, burned captions, duration limits)

### Integration Discovery
- [ ] Confirm Taleemabad LMS API endpoint + authentication method
- [ ] Confirm publishing format (MP4 + JSON metadata or other?)
- [ ] Get LMS rate limits and batch upload specs
- [ ] Identify fallback if API is unavailable (Google Drive? Manual upload?)

### Prompt & Framework Setup
- [ ] Decide: Claude API direct vs managed agents vs LangGraph
- [ ] Set up local Python environment with dependencies (anthropic, whisper, ffmpeg-python, etc.)
- [ ] Create prompt files for each skill (in `./prompts/` directory)
- [ ] Configure prompt caching (schema + template examples)
- [ ] Run smoke test: call Claude API with prompt; verify output structure matches schema

### Cost & Resource Validation
- [ ] Estimate token usage per skill (run on small examples)
- [ ] Estimate video processing time per hour of source video
- [ ] Validate Whisper cost (API vs local model)
- [ ] Set up budget tracking (log costs per cycle in decision log)

### Eval Dataset Preparation
- [ ] Identify 3 diverse past sessions (different modules, lengths, audio quality)
- [ ] Create ground truth for each: expected ContentUnits, expected assignment rubrics
- [ ] Identify 1 blind held-out session for final validation
- [ ] Create eval rubric: how we'll score each agent's output

### Documentation & Handoff
- [ ] Add quick-start guide for future developers (how to run a weekly cycle)
- [ ] Document file structure diagram in README
- [ ] Create troubleshooting guide (common errors + fixes)
- [ ] Set up team access to memory files + decision logs

---

## 7. Critical Files to Reference During Build

| File | Purpose | Who Uses It |
|------|---------|------------|
| `./planning/planning.md` | Full specification + architecture | Developers + Aroma |
| `./memory/MEMORY.md` | Quick context index | Everyone at session start |
| `./memory/arch_schemas.md` | Data contracts | Developers building skills |
| `./memory/arch_tech_stack.md` | Tool choices + setup | DevOps + implementation team |
| `./.claude/settings.json` | Hook configuration | Claude Code + system |
| `./CLAUDE.md` | Project summary | New team members |
| `./.claude/logs/` | Audit trail | Troubleshooting + decision review |

---

## 8. Context Window Management (Key Feature)

### How It Works
1. **During session**: Claude Code monitors context usage
2. **At 95%**: Hook fires automatically
   - Memory files updated (key decisions, timelines, tech decisions logged)
   - Session logs flushed to `./.claude/logs/`
   - Planning state checkpointed
   - **User notified**: "⚠️ Context at 95%. Memory and logs persisted. Consider ending session soon."

3. **Session ends**: Logs archived; memory index updated
4. **Next session starts**: Memory reloaded; context starts fresh + informed

### Why This Matters
- **No lost decisions**: Every keep/rebuild/kill decision is persisted
- **No context reset amnesia**: Next session knows what was learned
- **Audit trail**: All decisions logged with timestamps + rationale
- **Asynchronous recovery**: If Claude Code crashes, memory recovers state

---

## 9. Feedback Rules Summary

### 6 Core Principles (From feedback memory files)
1. **Start simple** — one orchestrator, add workers only when needed
2. **Measure weekly** — no iteration without metrics
3. **Specialize only when justified** — >20% improvement in quality or speed
4. **No half-finished implementations** — complete or defer, don't ship broken
5. **Gates are non-negotiable** — failures are logged and escalated clearly
6. **Log all decisions** — no decision is valid without rationale

---

## 10. Success Metrics (From project goals)

By end of Week 4, the Drawing Room should demonstrate:
- ✅ **Turnaround**: 100% of test sessions have publish-ready assets same day (<8 hrs)
- ✅ **Quality**: ≥85% instructor confidence (no reteach needed)
- ✅ **Learner impact**: ≥75% assignment first-pass completion; ≥80% pass rate
- ✅ **Cost**: <$50/week API + storage for 2 sessions/week
- ✅ **Reliability**: Zero silent loop failures; all gates logged

If any metric is not met, investigation + rebuild happens in Week 4 iteration phase.

---

## Final Checklist Before Starting Code (Week 1)

- [ ] All memory files read and understood by team
- [ ] Hooks tested in dry run
- [ ] Schemas approved by Aroma + course lead
- [ ] Templates finalized
- [ ] LMS integration details confirmed
- [ ] Python environment set up
- [ ] Cost budget ($50/week) acknowledged
- [ ] Eval dataset prepared
- [ ] 4-week timeline agreed (Week 1 schemas, Week 2 pipeline, Week 3 video, Week 4 reflect)

---

**Everything is ready. Next step: finalize Week 1 schemas + templates (no code yet).**

*Setup created by Claude Code on 2026-05-04.*
