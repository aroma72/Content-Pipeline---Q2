---
name: Technology Stack & Infrastructure Decisions
description: Tech choices, models, tools, hosting, and architecture patterns for Drawing Room
type: project
---

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
