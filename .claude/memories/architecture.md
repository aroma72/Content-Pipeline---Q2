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

How Drawing Room is built: model choices, media tooling, and the schema contracts between stages.

## Agent Framework & Model Selection

### Claude API + Managed Agents (Recommended Path)
- **Orchestrator**: Claude API (direct calls) or Claude Managed Agents (if multi-turn state needed)
- **Models by task**:
  - **Planning/reasoning**: Claude Opus 4.7 (SignalIntakeSkill, ContentPlannerSkill, ContentReflectSkill)
  - **Generation**: Claude Sonnet 4.6 (ContentProductionSkill, InstructorPackSkill, AssignmentAuthoringSkill)
  - **Classification**: Claude Haiku 4.5 (VideoQualityGateAgent, AssignmentEvaluationSkill, tag/flag decisions)
- **Why**: Opus for reasoning-heavy tasks (planning), Sonnet for balanced quality/speed (generation), Haiku for lightweight classification (cost-effective)

### Prompt Caching Strategy
- **ContentPlannerSkill**: Cache signal schema + past unit examples → reuse across cycles
- **ContentProductionSkill**: Cache learner template + rubric examples → consistent formatting
- **VideoQualityGateAgent**: Cache quality checklist + sample transcripts → fast validation
- **Expected savings**: ~20-30% reduction in token usage per weekly cycle

---

## Video & Media Tools

### Transcription & Speaker Diarization
- **Primary**: OpenAI Whisper (local install or API)
- **Output**: VTT captions + speaker labels (Speaker 1, Speaker 2, etc.)
- **Why**: Open-source, runs locally (privacy); handles accents reasonably well

### Video Editing & Clipping
- **Tool**: ffmpeg (open-source, batch-compatible)
- **Operations**:
  - Extract segment by timecode range
  - Concatenate clips with fade transitions
  - Burn subtitles into video
  - Transcode to MP4 (H.264 + AAC stereo)
- **Why**: Scriptable, no UI bottleneck, production-ready quality

### Media Format & Specs
- **Input**: MP4, WebM, MOV (auto-convert to MP4)
- **Output**:
  - Essential edit: MP4, 1080p H.264, AAC stereo, VTT captions burned in
  - Concept clips: MP4, 1080p H.264, AAC stereo, 2-4 min duration
  - Metadata: JSON (title, description, timecodes, transcript SRT)

---

## Storage & File Architecture

### Local Workflow Storage
```
ContentQueen/
├── recordings/               # Raw ingest
├── drafts/                  # Working files (transcript, segments, timelines)
├── published/               # Final assets before platform push
├── weekly_artifacts/        # Markdown logs (decisions, health scores)
└── review_queue/            # Flagged items for human approval
```

### Backup & Archival
- **Active working files**: Local (SSD, fast iteration)
- **Backup strategy**: Weekly sync to Google Drive or S3 (cost TBD in Week 1)
- **Retention**: Raw recordings archived after 6 months; published assets indefinite
- **Why**: Cost control (don't store unedited video long-term); compliance (keep published for audit)

### Platform Integration
- **Target**: Taleemabad LMS (details TBD Week 1)
- **Publishing method**: Batch API call (preferred) or manual folder sync
- **Format**: MP4 + metadata JSON (title, description, tags, SRT)

---

## Database & State Management

### In-Pilot (Weeks 1-4)
- **No external DB** — use local filesystem
- **Artifact storage**: JSON + Markdown files per weekly cycle
- **Schema persistence**: JSON files in `weekly_artifacts/`
- **Assignment submissions**: Pulled from LMS API per cycle

### Post-Pilot (Scale Phase)
- **Evaluation**: If >10 cycles, consider Supabase or Firebase for:
  - Learner submissions (no additional cost if LMS-native)
  - Content health trends (longitudinal analysis)
  - Signal time-series (track concept weakness over weeks)
- **Why**: Local files sufficient for pilot; external DB adds complexity we don't yet need

---

## Hosting & Compute

### Pilot (Weeks 1-4)
- **Where**: Aroma's local machine (Windows 11 Pro)
- **Trigger**: File watcher on `recordings/` folder (Python watchdog or similar)
- **Execution**: Synchronous (recording arrives → process immediately, blocking)

### Scale (Post-Pilot, optional)
- **Where**: AWS Lambda or Google Cloud Run (auto-scale)
- **Trigger**: Webhook from Zoom/Google Meet or S3 file drop
- **Execution**: Asynchronous (event → queue → process → publish)
- **Cost**: Estimated $50-100/month for 10 sessions/week (TBD Week 1)

---

## Dependencies & Setup

### Python Environment
- Python 3.10+
- `anthropic` SDK (Claude API)
- `openai` (Whisper)
- `ffmpeg-python` (video editing wrapper)
- `watchdog` (file monitoring)
- `pydantic` (schema validation)

### External Services
- **Claude API key** (required, billed per token)
- **Whisper API key** or local Whisper model (billed or free)
- **Taleemabad LMS API credentials** (for publishing)

### Tools Not Included (Out of Scope)
- Video compression optimization (H.265, VP9) — use MP4/H.264 (standard, compatible)
- Subtitle styling/formatting beyond .vtt — keep simple, no fancy CSS
- Audio normalization — trust Whisper's input handling
- Face detection / blur — not in v1; add in scale phase if needed

---

## Architecture Pattern: Orchestrator + Skill Modules

```
ContentOrchestrator (Claude API)
│
├─ SignalIntakeSkill → [signal_backlog.md]
├─ ContentPlannerSkill → [weekly_content_map.md]
├─ ContentProductionSkill → [learner pack]
├─ InstructorPackSkill → [instructor brief + examples]
├─ SessionCloseSkill → [recording → learner assets]
├─ VideoQualityGateAgent → [needs_review flags]
├─ AssignmentAuthoringSkill → [assignment + rubric]
├─ AssignmentEvaluationSkill → [submission eval]
└─ ContentReflectSkill → [keep/rebuild/kill decisions]
```

**Why single orchestrator**: Simpler state management, clear gate sequencing, easier to debug. Split into workers only if parallelization materially improves speed (e.g., Week 3 video processing can be async).

---

## Testing & Evaluation

### Local Test Loop
- 3 diverse pilot sessions (AI Mastery, EQ, SQ)
- 1 blind held-out session for final validation
- Edge cases: short session (<30 min), long session (>3 hrs), poor audio quality

### Per-Agent Pass Criteria (Week 1 definition)
- **RecordingIngestAgent**: <5% word error rate (WER) on transcription
- **ConceptSegmentationAgent**: ≥85% human agreement on `must_keep` segments
- **EssentialEditAgent**: ≥4/5 instructor approval; no jarring cuts
- **VideoQualityGateAgent**: <10% false positive rate on "needs_review"
- **ContentProductionSkill**: ≥75% learner survey = "clear and relevant"
- **AssignmentEvaluationSkill**: ≥80% TA agreement on rubric pass/fail

---

## Next Steps (Week 1)
1. Confirm Claude API access + token budget
2. Set up local Whisper (evaluate API vs local)
3. Confirm Taleemabad LMS API credentials + endpoint
4. Validate ffmpeg + Python environment
5. Pick managed agent framework (CrewAI, LangGraph, or Claude API native)


---

# Data Schema Contracts

<!-- migrated verbatim from memory/arch_schemas.md on 2026-09-21 -->

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


---

# Claude Code Hook Contract

**Verified 2026-09-21** against the published hooks reference. Written down because these facts
get re-derived every few months, and because a hook registered under a name that does not exist is
silently ignored — indistinguishable from one that works.

## Events this harness uses

| Event | Fires | Matchers |
|---|---|---|
| `SessionStart` | session opens | `startup`, `resume`, `clear`, `compact`, `fork` |
| `UserPromptSubmit` | every user prompt | — |
| `PreToolUse` / `PostToolUse` | before / after a **successful** tool call | tool-name regex, or `*` for all |
| `PostToolUseFailure` | after a tool call **fails** | tool-name regex |
| `PreCompact` / `PostCompact` | around context compaction | `manual`, `auto` (PreCompact) |
| `Stop` | **every time Claude finishes responding** — per turn, not per session | — |
| `SessionEnd` | the session terminates | reasons: `clear`, `resume`, `logout`, `prompt_input_exit`, `other` |

## The five facts that matter

1. **`Stop` is per-turn, not per-session.** Anything expensive — opening SQLite, scanning an
   archive — belongs on `SessionEnd`, not `Stop`. A `Stop` hook must also check `stop_hook_active`
   and bail when it is true, or it can push Claude into a continuation loop up to the 8-turn cap.

2. **`SessionEnd` has a 1.5-second shared budget by default**, raisable to 60s via `timeout`.
   Transcript extraction, a SQLite write and a rotation pass will not fit in the default. Set the
   timeout explicitly.

3. **Plain stdout is injected as context** on `SessionStart`, `UserPromptSubmit`,
   `UserPromptExpansion` and `PostModelSwitch`. This is why `session-start.sh` can stay a plain
   `echo` script and still get its content in front of the model — **no JSON needed**. The moment
   a hook prints JSON, every stray `echo` invalidates the object, so it is all-or-nothing.

4. **`additionalContext` must be nested inside `hookSpecificOutput`.** At the top level it is
   silently ignored. Combining `systemMessage` and `additionalContext` on `SessionStart` is
   undocumented — prefer plain stdout there.

5. **Multiple matcher blocks under one event all fire, in parallel.** A second `PostToolUse` block
   with matcher `*` coexists safely with the existing `Write|Edit` block; neither sees the other.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success. On context-injection events, stdout is added to context |
| `2` | **Blocking.** Reason must go to **stderr** |
| other | Non-blocking error; valid JSON on stdout is still applied |

## House wrapper convention

`.claude/settings.json` does the `jq` extraction from stdin and passes **plain positional args** to
the `.sh`; the scripts never read stdin. This sidesteps a Git-Bash-on-Windows bug where
`/dev/stdin` does not resolve when the parent is not a shell. Use command substitution
(`c=$(jq -r ...)`), never `jq ... | read -r c` — `read` stops at the first newline and would hide a
multi-line command from a guard. See `lessons.md` §H2.

## Undocumented — do not assume

The exact stdin payload shape for `PostToolUseFailure` and `PreCompact` is not in the public
reference. Inspect a real run with `claude --debug` before depending on a field name.
