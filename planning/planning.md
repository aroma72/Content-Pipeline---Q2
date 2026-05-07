# Aroma Agentic Content Plan (Consolidated)

## Objective
Build an agentic content system for Aroma that continuously runs:

`Perceive -> Plan -> Act -> Observe -> Reflect -> Perceive`

The system focuses on learner-facing and instructor-support content, with special emphasis on turning in-person session recordings into high-quality learner assets quickly.

## Scope (Aroma Only)

### Included
- Signal-based content planning and prioritization
- Learner-facing content generation
- Instructor-facing pack generation
- Session recording processing for platform publishing
- Weekly content effectiveness review with improvement decisions

### Excluded
- LMS phase progression logic implementation
- Intervention ladder ownership
- Platform-wide intelligence governance outside content decisions

## Anthropic-Aligned Build Principles

This plan follows Anthropic best practices for effective agents:
- Start simple and only add complexity when needed.
- Prefer workflow reliability first, then autonomous behaviors.
- Define specific, measurable success criteria before scaling.
- Use clear tool boundaries and token-efficient outputs.
- Run evaluations on realistic tasks and edge cases, then iterate.

Practical implication for this plan:
- Begin with one orchestrator and skill modules.
- Split into multiple worker agents only where specialization materially improves quality.

## Technology & Tool Stack

### Agent Framework & Models
- **Orchestrator & Skills Framework**: Claude API with managed agents or LangGraph (decision pending Week 1).
- **Planning/Content Generation**: Claude Opus 4.7 (reasoning-heavy tasks).
- **Content Drafting/Instructor Pack**: Claude Sonnet 4.6 (balanced quality/speed).
- **QA/Reflection/Scoring**: Claude Haiku 4.5 (lighter classification tasks).
- **Video Agents**: Claude Opus 4.7 (transcription analysis, segmentation logic).

### Video & Media Processing
- **Transcription**: OpenAI Whisper (local or API) with speaker diarization.
- **Video Editing**: ffmpeg (essential edit, clip generation, subtitle burns).
- **Subtitle Generation**: Whisper-generated captions + manual review queue.
- **Clip Packaging**: ffmpeg + metadata JSON (for platform ingestion).

### Storage & Infrastructure
- **Recording Ingest**: Local folder monitored by file watcher OR webhook from Zoom/Google Meet.
- **Draft Assets**: Local working directory (raw transcript, segmentation JSON, edit timeline).
- **Published Assets**: Platform-native storage (LMS or dedicated video CMS).
- **Artifacts & Logs**: Local filesystem (`signal_backlog.md`, `weekly_content_map.md`, etc.) synced to backup (e.g., Google Drive or S3).
- **Hosting**: Local machine for pilot; AWS Lambda or Cloud Run for scale (auto-triggered by file arrival).

### Database / Schema Storage
- **In-memory during agent run**: Python/JavaScript data classes.
- **Persisted artifacts**: JSON + Markdown files in timestamped weekly folders.
- No external DB required until >10 weekly cycles (defer to Week 4 evaluation).

## Storage & File Architecture

### Directory Structure
```
ContentQueen/
├── recordings/
│   ├── 2026-05-15_ai-mastery_session-1.mp4
│   └── 2026-05-16_eq_session-2.mp4
├── drafts/
│   ├── 2026-05-15_session-1/
│   │   ├── transcript.vtt
│   │   ├── segments.json
│   │   ├── essential_edit_draft.mp4
│   │   └── clips/
│   │       ├── clip_1_concept-A.mp4
│   │       └── clip_2_misconception-B.mp4
├── published/
│   ├── 2026-05-15_session-1/
│   │   ├── essential_session.mp4
│   │   ├── concept_clips/
│   │   ├── session_summary.md
│   │   ├── glossary.md
│   │   └── watch_order.md
├── weekly_artifacts/
│   ├── week-19-2026/
│   │   ├── signal_backlog.md
│   │   ├── weekly_content_map.md
│   │   ├── published_assets_log.md
│   │   └── content_health_table.md
└── review_queue/
    ├── flagged_2026-05-15_session-1.json
    └── approval_log.md
```

### File Naming Conventions
- **Recordings**: `YYYY-MM-DD_course_session-N.mp4`
- **Session Assets**: `YYYY-MM-DD_session-N_[type].mp4` or `.md`
- **Concept Clips**: `YYYY-MM-DD_session-N_clip-M_[concept-slug].mp4`
- **Weekly Artifacts**: `week-W-YYYY_[artifact_type].md`

### Platform Publishing
- **Target**: Taleemabad LMS (or custom learning platform).
- **Integration**: Batch API call or direct folder sync (details in Week 1 discovery).
- **Format**: MP4 + metadata JSON (title, description, tags, transcript SRT).
- **Approval Flow**: Published only after human sign-off on flagged quality checks.

## Recording Ingestion & Trigger

### Recording Input
- **Source**: Zoom/Google Meet exports OR manual upload to `recordings/` folder.
- **Formats Accepted**: MP4, WebM, MOV (auto-converted to MP4 if needed).
- **Trigger**: File watcher script watches `recordings/` folder; on arrival → `RecordingIngestAgent` starts.
- **Metadata**: Optional `session_metadata.json` (course, topic, instructor, learner count).
- **Pre-check**: Basic validation (file not corrupt, audio present, duration >15 mins) before processing.

### Quality Thresholds
- Audio level: -20dB minimum RMS (if below, flag for manual review).
- Video resolution: 1080p preferred; 720p minimum.
- Duration: >15 min sessions only (shorter = live demo, skip full pipeline).

## Content Schema Definitions

### ContentSignal
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | yes | UUID-based |
| source | enum | yes | `learner_question`, `repeated_confusion`, `instructor_note`, `assignment_pattern` |
| concept_id | string | yes | Foreign key to concept ontology |
| confidence | float [0-1] | yes | How strong is this signal? |
| description | string | yes | What was observed? |
| observed_date | date | yes | When was it observed? |
| priority | enum | no | `high`, `medium`, `low` (default: inferred from confidence) |

### ContentUnit
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | yes | UUID-based |
| outcome | string | yes | Learner behavior objective (e.g., "Explain gradient descent in own words") |
| signal_ids | list[string] | yes | Which signals map to this unit? |
| format | enum | yes | `video`, `interactive`, `reading`, `assignment` |
| status | enum | yes | `draft`, `ready_for_review`, `published`, `rebuild`, `archived` |
| created_date | date | yes | When was this unit planned? |
| assigned_agent | string | yes | Which skill generates this? |
| target_publish_date | date | yes | Deadline for this unit |
| evidence_method | enum | yes | How will we know if learner learned? (`assignment`, `quiz`, `artifact`) |

### InstructorBrief
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| content_unit_id | string | yes | Foreign key to ContentUnit |
| session_date | date | yes | When will this be taught? |
| already_know | list[string] | yes | Prereqs learners likely have |
| likely_weak | list[string] | yes | Misconceptions to watch for |
| do_not_reteach | list[string] | yes | Topics learners usually understand |
| explanation_variants | dict[string, string] | yes | Concept → 2-3 alternative explanations |
| example_bank | list[string] | yes | Worked examples keyed by difficulty |
| time_box_minutes | int | no | Suggested session time for this unit |

### ContentHealthRecord
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| unit_id | string | yes | Foreign key to ContentUnit |
| cycle_week | int | yes | Which weekly cycle? |
| assignment_attempt_rate | float [0-1] | yes | % learners who attempted |
| assignment_pass_rate_first_attempt | float [0-1] | yes | % passed without rework |
| avg_time_to_completion_minutes | float | no | Engagement signal |
| video_completion_rate | float [0-1] | no | % of learners watching to end |
| learner_feedback_sentiment | enum | no | `positive`, `neutral`, `negative` |
| teacher_confidence | enum | no | Did instructor feel confident teaching? |
| decision | enum | yes | `keep`, `rebuild`, `kill` |
| decision_rationale | string | yes | Why this decision? (e.g., "pass rate 85%, keep for next cycle") |
| rebuild_priority | enum | no | `high`, `medium`, `low` (only if decision=`rebuild`) |

### SessionAssetBundle
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| session_id | string | yes | UUID-based |
| session_date | date | yes | When did this session happen? |
| course_id | string | yes | Which course? |
| essential_edit_mp4 | string | yes | Path to final edited video |
| concept_clips | list[string] | yes | Paths to 2-4 min clips (≥5 clips) |
| session_summary | string | yes | Path to `.md` summary |
| glossary | string | yes | Path to concept definitions |
| watch_order | string | yes | Path to recommended viewing sequence |
| transcript_vtt | string | yes | Full transcript with timecodes |
| status | enum | yes | `draft`, `needs_review`, `publish_ready`, `published` |
| reviewed_by | string | no | Human reviewer name (if applicable) |
| published_date | date | no | When was this published to platform? |

---

## Human Review Queue & Approval Flow

### Review Queue Location
- **Tool**: Notion database with `flagged_assets` table (linked to `content_health` master table).
- **Alternative**: Slack bot posting thumbnail + decision link (if Notion unavailable).
- **Access**: Simple "Approve" / "Reject" / "Request Changes" button (no file manipulation needed).

### Review Triggers
Aroma reviews when:
- `VideoQualityGateAgent` flags `needs_review` (audio quality, concept gaps, duration).
- Assignment pass rate is <70% (decide: rebuild or publish anyway?).
- Instructor report indicates learner confusion during session.

### SLA & Workflow
- **Target turnaround**: Flagged items → reviewed within 24 hours.
- **Rejection path**: Agent re-runs with feedback; does not reuse prior attempt.
- **Approval**: Asset moves to `published/` folder + platform sync queued.
- **Escalation**: If >3 rejections, escalate to course lead before retry.

---

## Prompt Management & Versioning

### Prompt Storage
- **Location**: `prompts/` folder (one `.txt` per skill/agent).
  - `prompts/signal_intake.txt`
  - `prompts/content_planner.txt`
  - `prompts/content_producer.txt`
  - `prompts/video_segmentation.txt`
  - etc.
- **Version Control**: Commit to git; tag stable versions (e.g., `v1.0-week-2`, `v1.1-improvement-qa-feedback`).
- **Testing**: Each prompt change evaluated on 2-3 real session examples before merging to main.

### Prompt Drift Mitigation
- Quarterly prompt audit: compare outputs on same input across 3 months.
- If drift detected, rollback to last stable and debug.
- Lock prompts for 2 weeks post-publish (only hotfixes allowed).

---

## Pre-Launch Evaluation & Test Dataset

### Evaluation Dataset
- **Pilot Sessions**: 3 diverse real sessions (AI Mastery, EQ, SQ format each).
- **Held Out Blind Set**: 1 session for final validation (not seen during Week 2-3 builds).
- **Edge Cases**: 1 short session (<30 mins), 1 large session (>3 hours), 1 heavy accent/background noise.

### Pass Criteria (Before Production)
| Agent/Skill | Success Metric | Threshold |
|------------|----------------|-----------|
| RecordingIngestAgent | Transcript accuracy (WER) | <5% word error rate |
| ConceptSegmentationAgent | Segment relevance (human review) | ≥85% of `must_keep` segments are truly essential |
| EssentialEditAgent | Continuity (reviewable by instructor) | ≥4/5 instructor approval; no jarring cuts |
| MicroVideoAgent | Clip duration compliance | 100% of clips are 2-4 mins; no orphaned audio |
| VideoQualityGateAgent | False positive rate | <10% of "needs_review" are actually publish-ready |
| ContentPlannerSkill | Signal→Unit mapping | 100% of units traceable to ≥1 signal |
| ContentProductionSkill | Clarity (learner survey) | ≥75% of learners rate content as clear/relevant |
| AssignmentAuthoringSkill | Rubric validity (TA test) | ≥80% TA agreement on pass/fail judgment |

---

## Privacy, Consent & Policy

### Recording Publication Rules
- **Learner Privacy**: Learner names removed from captions; only first names in attribution if clip has student example work.
- **Instructor Credit**: Full instructor name + title in session summary.
- **Consent**: Sessions recorded with visible notice; learners have opt-out at start. Consent log checked before publish.
- **Data Retention**: Raw recordings archived after 6 months; published assets retained indefinitely per LMS policy.

### Content Policy Checks
- **No PII**: Automated scan for email, phone number, SSN patterns in captions/subtitles.
- **Inclusive language**: Flagged if certain terms detected (list TBD Week 1); human review before publish.
- **Attribution**: All external examples cited; sources logged in metadata.

---

## Cost & Resource Estimates (Per Weekly Cycle)

### API Costs (Pilot Scale: 2 sessions/week)
| Service | Unit | Rate | Weekly | Notes |
|---------|------|------|--------|-------|
| Claude API (Opus planning) | 1M input tokens | $15 | ~$5 | 1 cycle of planning |
| Claude API (Sonnet content draft) | 1M input tokens | $3 | ~$8 | 2 sessions × generation |
| Claude API (Haiku eval) | 1M input tokens | $0.80 | ~$2 | Assignment eval, QA |
| Whisper transcription | 1 hour audio | $0.02 | ~$4 | 2 sessions @ ~2 hrs ea |
| **Weekly API Total** | | | ~$19 | |

### Compute Costs (Local Machine)
- Storage: 2 sessions × 2 hrs × 2GB/hr codec ≈ 8GB/week (cumulative storage $0 local, ~$0.30/month S3 backup).
- Video encoding: ffmpeg (free, CPU-bound; ~4 hours compute/week on standard laptop).

### Staffing
- **Aroma review time**: 2-3 hours/week (flagged quality gates, assignment feedback, reflect decisions).
- **Course lead feedback**: 1 hour/week (signal validation, rebuild decisions).

### Budget Ceiling (Pilot)
- Target: <$50/week API + storage costs.
- Alert threshold: >$75/week (investigate cost overrun).

---

## Rollback & Asset Versioning

### Versioning Strategy
- **Published Assets**: Immutable once published; version tracked in metadata (`v1`, `v1-revision`, etc.).
- **Recorded History**: If a published asset has errors, create `v1-revision` and flag old version as superseded.
- **Notification**: Course lead notified via email; learner-facing LMS shows "Updated" date.

### Rollback Scenarios
- **Broken clip** (audio dropout): Republish v1-revision within 4 hours; notify instructors.
- **Content error found**: Annotate with erratum; decide: re-record or move to `rebuild` queue for next cycle.
- **Privacy breach** (learner name in caption): Immediately pull asset; re-process; publish v1-revision next day.

---

## Assignment Delivery & Submission

### Delivery Channel
- **Primary**: LMS assignment module (push to Taleemabad platform at publish time).
- **Fallback**: Email + Google Form (if LMS integration incomplete).
- **Learner Experience**: Assignment appears same day as video publish; visible in learner dashboard.

### Submission Mechanism
- **Evidence Types**:
  - **Code**: GitHub commit link (with proof of test pass).
  - **Write-up**: Markdown or Google Doc (shared with course lead).
  - **Project artifact**: PDF, Figma link, or demo video.
  - **Quiz**: LMS built-in (multiple choice or short answer).
- **Submission deadline**: 5 days after session publish (configurable per course).
- **AssignmentEvaluationSkill** reads submissions from LMS API pull; generates evaluation JSON + feedback.

---

## Content Format Templates

### Session Summary Template (`.md`)
```markdown
# Session: [Topic] — [Date]

## Learning Outcomes
- [Outcome 1]
- [Outcome 2]
- [Outcome 3]

## Key Concepts
- **[Concept A]**: [1-2 sentence definition]
- **[Concept B]**: [1-2 sentence definition]

## Common Misconceptions & Clarifications
- *Misconception*: [Learner often think X]
  *Clarity*: [Actually, Y because Z]

## Watch Order (Recommended)
1. Essential session edit (45 min) — foundation for all concepts.
2. Clip: [Concept A Deep Dive] (3 min)
3. Clip: [Common Mistake Fixed] (2 min)
4. Quiz: [Self-check] (15 min, optional)

## Next Steps
- Complete assignment by [date].
- Optional: review [prerequisite] if you felt shaky.
```

### Glossary Template
```markdown
# Glossary: [Course]

| Term | Definition | Example |
|------|-----------|---------|
| [Term A] | [1-sentence plain English] | [Real code / scenario] |
| [Term B] | [1-sentence plain English] | [Real code / scenario] |
```

### Learner-Facing Asset Standards
- **Video**: MP4 H.264, 1080p, stereo audio, captions embedded.
- **Duration**: Essential edit 30-60 mins; concept clips 2-4 mins; quiz <15 mins.
- **Transcript**: Full VTT with timecodes; searchable.
- **Graphics**: Slide overlays, speaker facecam kept; distracting B-roll removed.

### Instructor Pack Template
- **Session Plan**: Outline with time boxes (e.g., "10 min: review prerequisites; 20 min: live code example").
- **Teaching Brief**: Concept summary + likely weak spots + re-explanation variants.
- **Example Bank**: 5-10 worked examples grouped by difficulty (easy, medium, hard).
- **Q&A Bank**: Top 5 learner questions from prior cycles + suggested answers.
- **Slide Deck**: Annotated with notes on what to emphasize, where learners get stuck.

## Orchestrator-First Architecture

### `ContentOrchestrator` (Primary Controller)
- Owns the full weekly loop and enforces all loop gates.
- Decides which skill/worker to call at each step.
- Tracks deadlines, retries, fallback paths, and completion status.
- Produces weekly execution artifacts and exception reports.

### Orchestrator Workflow (Detailed Agentic Flow)

The orchestrator is a state machine that manages the entire weekly loop. It calls skills sequentially, validates outputs, enforces gates, and handles failures.

#### **Initialization (Monday 6am)**
```
Orchestrator.initialize()
├─ Load prior week's ContentHealthRecords (if any)
├─ Load prior week's keep/rebuild/kill decisions
├─ Set cycle_week counter
├─ Initialize logs (session.log, decisions.log, errors.log)
└─ Emit: "Cycle started; awaiting Perceive trigger"
```

#### **Stage 1: PERCEIVE (Mon 6am-6pm)**

**Gate**: New signals collected OR explicit "no-new-signal" log

```
Orchestrator.perceive()
├─ Call SignalIntakeSkill(sources=[forum, instructor_notes, assignments, office_hours])
│  └─ Input: raw signals from week (>= 1)
│  └─ Output: signal_backlog.md with ContentSignal list
│     • id, source, concept_id, confidence [0-1], observed_date
├─ Validate output schema
│  └─ All signals have confidence >= 0.6? YES → continue; NO → escalate
├─ Sort signals by confidence (highest first)
├─ Write signal_backlog.md → weekly_artifacts/week-W-YYYY/
│
├─ GATE CHECK (Perceive Gate):
│  └─ IF signal_backlog.md exists AND signal_count >= 1
│     └─ Gate PASS: log to decisions.log, move to Plan
│  └─ ELSE
│     └─ Gate EXTENDED: carry forward to Tuesday 6am; escalate to Aroma
│
└─ Log decision: "Perceive [PASS|EXTENDED]: N signals collected, confidence [range]"
```

#### **Stage 2: PLAN (Mon 6pm or Tue 6pm)**

**Gate**: Content units mapped 1:1 to signals

```
Orchestrator.plan()
├─ Call ContentPlannerSkill(signals=signal_backlog.md, prior_units=[from last cycle])
│  └─ Input: signal_backlog + prior ContentHealthRecords (for rebuild context)
│  └─ Output: weekly_content_map.md with ContentUnit list
│     • id, outcome, signal_ids[], format, status, evidence_method, target_publish_date
├─ Validate output schema
│  └─ Each unit references >= 1 signal_id? YES → continue; NO → escalate
│  └─ All units have defined outcomes? YES → continue; NO → escalate
│  └─ All units have evidence_method? YES → continue; NO → escalate
├─ Write weekly_content_map.md → weekly_artifacts/week-W-YYYY/
│
├─ GATE CHECK (Plan Gate):
│  └─ IF all signals referenced in unit list AND plan clarity >= 0.8
│     └─ Gate PASS: Aroma reviews + approves; log to decisions.log, move to Act
│  └─ ELSE
│     └─ Gate EXTENDED: send plan to Aroma for clarification; wait for feedback
│        └─ On feedback: re-run ContentPlannerSkill with Aroma's notes, revalidate
│
└─ Log decision: "Plan [PASS|EXTENDED]: N units planned, M signals unmapped"
```

#### **Stage 3: ACT (Tue-Wed, parallel execution)**

**Gate**: Learner pack + instructor pack both exist and reviewed by Aroma

```
Orchestrator.act()
├─ For each ContentUnit in weekly_content_map:
│  ├─ Call ContentProductionSkill(unit=unit_obj)
│  │  └─ Input: ContentUnit details
│  │  └─ Output: learner_pack (session summary, glossary, watch order)
│  │
│  ├─ Call InstructorPackSkill(unit=unit_obj)
│  │  └─ Input: ContentUnit details
│  │  └─ Output: instructor_brief (teaching brief, examples, time boxes)
│  │
│  ├─ Call AssignmentAuthoringSkill(unit=unit_obj)
│  │  └─ Input: ContentUnit outcome + evidence_method
│  │  └─ Output: assignment + rubric
│  │
│  └─ Aggregate outputs into SessionAssetBundle (partial)
│
├─ Validate all outputs:
│  └─ Clarity score (LLM-assessed) >= 0.7? YES → continue; NO → flag for review
│  └─ All templates filled? YES → continue; NO → flag for review
│
├─ HUMAN REVIEW CHECKPOINT (Aroma):
│  ├─ Flag any units with clarity < 0.7 to review_queue/
│  ├─ Aroma reviews within 24 hours:
│  │  ├─ Approve: move to QA gate
│  │  ├─ Reject: return to skill with feedback for rebuild
│  │  └─ Revise: make specific changes, re-review (max 2 rounds)
│  └─ On approval: log to decisions.log
│
├─ GATE CHECK (Act Gate):
│  └─ IF all units cleared by Aroma review
│     └─ Gate PASS: move to Observe
│  └─ ELSE
│     └─ Gate BLOCKED: escalate; carry unresolved units to next week
│
└─ Log decision: "Act [PASS|BLOCKED]: N units approved, M flagged for review"
```

#### **Stage 4: OBSERVE (After each session, same day)**

**Gate**: Learner publishing bundle complete

```
Orchestrator.observe(session_id, recording_path)
├─ Call RecordingIngestAgent(recording=session_id)
│  └─ Input: raw video file
│  └─ Output: transcript.vtt + speaker_segments.json
│
├─ Call ConceptSegmentationAgent(transcript=transcript.vtt)
│  └─ Input: transcript + topic metadata
│  └─ Output: segments.json (must_keep, optional, remove labels)
│
├─ Call EssentialEditAgent(transcript, segments)
│  └─ Input: transcript + segment labels
│  └─ Output: essential_edit_draft.mp4 (30-60 min, chapter marked)
│
├─ Call MicroVideoAgent(segments_list=must_keep_segments)
│  └─ Input: must_keep segments
│  └─ Output: 5+ concept_clips (2-4 min each)
│
├─ Call VideoQualityGateAgent(edit=essential_edit, clips=concept_clips)
│  └─ Input: video files + captions
│  └─ Output: quality_flags (publish_ready | needs_review)
│  └─ Checks: audio quality, concept completeness, duration, privacy
│
├─ Flag any issues → review_queue/
│
├─ HUMAN REVIEW CHECKPOINT (Aroma):
│  ├─ If flagged: Aroma reviews within 24 hours
│  │  ├─ Approve: override flag, mark publish_ready
│  │  ├─ Reject: return to agent for re-cut or re-transcode
│  │  └─ Revise: edit with specific feedback (e.g., "start at 2:15")
│  └─ On approval: log to decisions.log
│
├─ Assemble SessionAssetBundle (final):
│  ├─ essential_session.mp4
│  ├─ concept_clips/ (all approved clips)
│  ├─ session_summary.md
│  ├─ glossary.md
│  ├─ watch_order.md
│  ├─ transcript.vtt
│  └─ metadata.json
│
├─ GATE CHECK (Observe Gate):
│  └─ IF all media ready AND Aroma approved
│     └─ Gate PASS: move to Reflect
│  └─ ELSE IF timeout > 8 hours
│     └─ Gate EXTENDED: publish essential_edit only, defer clips to next day
│
└─ Log decision: "Observe [PASS|EXTENDED]: bundle ready in X hours"
```

#### **Stage 5: REFLECT (Friday 6pm)**

**Gate**: Each unit tagged keep/rebuild/kill with rationale

```
Orchestrator.reflect()
├─ For each published ContentUnit:
│  ├─ Retrieve assignment submissions from LMS
│  │  └─ Extract: attempt_rate, pass_rate_first_attempt, avg_time_to_completion
│  │
│  ├─ Call AssignmentEvaluationSkill(submissions_batch)
│  │  └─ Input: student responses + rubric
│  │  └─ Output: pass/fail per submission + aggregated stats
│  │
│  ├─ Retrieve video completion metrics from platform
│  │  └─ Extract: completion_rate, avg_watch_time
│  │
│  ├─ Gather instructor feedback (office hours, direct email)
│  │  └─ Sentiment: positive|neutral|negative
│  │  └─ Confidence: high|medium|low (did content work?)
│  │
│  ├─ Call ContentReflectSkill(unit_outcome, observed_metrics)
│  │  └─ Input: expected outcome + all observed data
│  │  └─ Output: decision (keep|rebuild|kill) + rationale
│  │
│  └─ Create ContentHealthRecord:
│     ├─ unit_id, cycle_week
│     ├─ assignment_attempt_rate, assignment_pass_rate_first_attempt
│     ├─ video_completion_rate, learner_feedback_sentiment
│     ├─ teacher_confidence
│     ├─ decision (keep|rebuild|kill)
│     └─ decision_rationale (logged for audit)
│
├─ Generate content_health_table.md:
│  └─ Summary table: unit_id | outcome | pass_rate | completion_rate | teacher_confidence | decision
│
├─ HUMAN REVIEW CHECKPOINT (Aroma):
│  ├─ Review content_health_table.md by Friday 6pm
│  ├─ Decision logic check:
│  │  ├─ pass_rate >= 0.80 AND completion >= 0.75 → keep? ✓
│  │  ├─ pass_rate < 0.70 AND rebuild_hypothesis defined → rebuild? ✓
│  │  └─ pass_rate < 0.50 AND no clear fix → kill? ✓
│  ├─ IF rebuild_ratio > 30% → escalate to course_lead for alignment
│  └─ Aroma signs off; log to decisions.log
│
├─ GATE CHECK (Reflect Gate):
│  └─ IF all units have [decision + rationale] AND Aroma approved
│     └─ Gate PASS: publish content_health_table.md, advance to Reentry
│  └─ ELSE
│     └─ Gate EXTENDED: publish table as "pending", carry forward to next week
│
└─ Log decision: "Reflect [PASS|EXTENDED]: N keep, M rebuild, K kill"
```

#### **Stage 6: RE-ENTRY (Sunday 6pm or Monday 6am)**

**Auto-feeding the next cycle**

```
Orchestrator.reentry()
├─ Export content_health_table.md → project knowledge
├─ Flag all rebuild units with priority markers (high|medium|low)
├─ Mark killed units as "do not reteach" in next cycle's signal intake
├─ Load keep decisions into ContentUnit library (reuse-ready)
│
├─ Emit event: "Weekly cycle complete; cycle_week += 1; restart at Perceive"
│
└─ Log decision: "Reentry: cycle closure complete; next cycle prepared"
```

---

#### **Error Handling & Retries**

```
Orchestrator.on_skill_error(skill_name, error_type):
├─ IF error_type == "TransientError" (timeout, rate_limit, API glitch)
│  ├─ Retry with exponential backoff (max 3 attempts)
│  ├─ Log to errors.log
│  └─ Continue on success; escalate if all retries fail
│
├─ IF error_type == "ValidationError" (schema mismatch, missing field)
│  ├─ Log detailed error
│  ├─ Emit to errors.log + decisions.log
│  ├─ Do NOT retry (fix required)
│  └─ Escalate to developer + Aroma
│
├─ IF error_type == "GateFailed" (Perceive found no signals, Plan unclear)
│  ├─ Log gate failure with reason
│  ├─ Emit notification to Aroma
│  ├─ Hold at gate; wait for manual decision (extend? skip? reduce scope?)
│  └─ On Aroma decision: execute remediation or skip stage
│
└─ ALL errors logged to errors.log with:
   └─ timestamp, component, error_message, stack_trace, action_taken, resolved (bool)
```

---

#### **State Management**

```
Orchestrator maintains:
├─ cycle_week (integer, resets weekly)
├─ current_stage (Perceive|Plan|Act|Observe|Reflect|Reentry)
├─ completed_units (list of unit_ids successfully processed)
├─ pending_units (list of unit_ids awaiting Aroma review)
├─ failed_units (list of unit_ids with errors)
├─ logs (session.log, decisions.log, errors.log file handles)
└─ All state persisted to .claude/logs/ on hook flush (at 95% context)
```

---

#### **Pseudocode (Week 2 Implementation Reference)**

```python
class ContentOrchestrator:
    def __init__(self):
        self.cycle_week = get_current_week()
        self.state = {}
        self.logs = init_logs()
    
    def run_weekly_cycle(self):
        try:
            # Stage 1: Perceive
            signal_backlog = self.perceive()
            self.check_gate("perceive", len(signal_backlog) >= 1)
            
            # Stage 2: Plan
            content_units = self.plan(signal_backlog)
            self.check_gate("plan", all_mapped_to_signals(content_units))
            
            # Stage 3: Act
            learner_packs = self.act(content_units)
            aroma_approval = self.wait_for_human_review(learner_packs)
            self.check_gate("act", aroma_approval)
            
            # Stage 4: Observe (per session)
            for session_id in scheduled_sessions():
                bundle = self.observe(session_id)
                self.check_gate("observe", bundle.is_complete())
                self.publish(bundle)
            
            # Stage 5: Reflect
            health_table = self.reflect(content_units, observed_metrics)
            aroma_signoff = self.wait_for_reflect_review(health_table)
            self.check_gate("reflect", aroma_signoff)
            
            # Stage 6: Reentry
            self.reentry(health_table)
            
        except GateFailedError as e:
            self.log_gate_failure(e)
            self.escalate_to_aroma(e)
        except Exception as e:
            self.log_error(e)
            self.escalate_to_developer(e)
    
    def check_gate(self, stage_name, condition):
        if not condition:
            raise GateFailedError(f"{stage_name} gate blocked")
        self.log_decision(f"{stage_name} gate PASSED")
    
    def wait_for_human_review(self, items):
        # Flag items in review_queue/
        # Poll for Aroma decision (or webhook callback)
        # Return approval status
        pass
```

## Skills vs Many Agents (Decision Framework)

Default architecture:
- **One orchestrator + skill modules** inside the same agent.

Add separate worker agents only if one of these is true:
- Work can run in parallel and meaningfully reduce delivery time.
- Task needs a distinct model/tool setup (for example, heavy media processing).
- Quality is consistently poor without specialization.
- Failure isolation is required for reliability.

Initial recommendation for your case:
- Keep planning, content drafting, instructor pack, and reflection as orchestrator skills.
- Keep video pipeline (`transcribe`, `segment`, `edit`, `microclip`, `qa`) as specialized workers under orchestrator control.

## Core Agent/Skill Stack

### 1) `SignalIntakeSkill` (Perceive)
- Collects weak confidence concepts, repeated learner questions, and instructor confusion signals.
- Produces prioritized signal backlog.

### 2) `ContentPlannerSkill` (Plan)
- Converts signals into weekly content units.
- Each unit includes: one outcome, one expected learner artifact, one evidence check.

### 3) `ContentProductionSkill` (Act)
- Generates learner-facing assets for each content unit.
- Outputs session learning materials, prompts, and glossary inputs.

### 4) `InstructorPackSkill` (Act)
- Generates ready-to-teach instructor pack:
  - Session plan with time boxes
  - Teaching brief (`already know`, `likely weak`, `do not reteach`)
  - Explanation variants for hard concepts
  - Example bank

### 5) `SessionCloseSkill` (Observe/Act)
- Generates post-session learner publishing assets:
  - Recording index and chapter markers
  - Concept clips package
  - Session summary
  - Follow-up prompts

### 6) `ContentReflectSkill` (Reflect)
- Compares expected vs observed outcomes.
- Tags each unit as `keep`, `rebuild`, or `kill` for next cycle.

## Recording -> Learner Video Automation

## Goal
From each in-person recording, automatically produce:
- One essential long edit (core learning only)
- Multiple 2-4 minute concept videos

## Workflow

### A) `RecordingIngestAgent`
- Input: raw session video (+ optional slides/topic metadata)
- Output: timecoded transcript + speaker segmentation

### B) `ConceptSegmentationAgent`
- Detects core explanations, misconception fixes, and removable sections
- Labels segments: `must_keep`, `optional`, `remove`

### C) `EssentialEditAgent`
- Removes admin chatter, dead time, repetition, off-topic discussion
- Preserves concept continuity and adds chapter markers
- Typical output for a 2-hour recording: focused core edit (~35-60 mins, depending on density)

### D) `MicroVideoAgent`
- Creates 2-4 minute concept clips from `must_keep` segments
- One clip per concept/misconception/example point
- Adds titles, subtitles, and short descriptions

### E) `VideoQualityGateAgent`
- Checks:
  - Concept completeness
  - Audio and subtitle quality
  - Duration compliance (2-4 mins)
  - Privacy/policy checks (if applicable)
- Marks `publish_ready` or `needs_review`

### F) `LearnerPackPublisherAgent`
- Publishes final bundle to platform:
  - Essential session edit
  - Micro concept clips
  - Session summary
  - Glossary
  - Recommended watch order

## Loop Reliability Rules (Non-Negotiable)

To ensure the loop never silently breaks:

- **Perceive gate:** Week cannot start without new signals or explicit `no-new-signal` log.
- **Plan gate:** No session is scheduled without content units mapped to signal IDs.
- **Act gate:** Unit is not shipped unless both learner and instructor packs exist.
- **Observe gate:** Session is not closed until learner publishing bundle is complete.
- **Reflect gate:** Week is not complete until each unit has `keep/rebuild/kill`.
- **Re-entry rule:** Next week must start from prior reflect output (no blank-page planning).

## Mandatory Weekly Artifacts
- `signal_backlog.md`
- `weekly_content_map.md`
- `published_assets_log.md`
- `content_health_table.md`

## Failure Handling
- If any gate fails deadline:
  - Mark `loop_blocked`
  - Trigger fast review checklist
  - Publish minimum viable learner package
  - Carry unresolved units to next cycle with priority

## Weekly Operating Rhythm
- **Monday:** Perceive + Plan finalized
- **Tuesday/Wednesday:** Act (learner + instructor content generation and QA)
- **After each session:** Observe/Act (recording to learner assets)
- **Friday:** Reflect (content health scoring + keep/rebuild/kill decisions)

## Publishing Standard (Each Session)
Minimum learner package:
- `essential_session.mp4`
- At least 5 concept clips (2-4 minutes each, based on session breadth)
- `session_summary.md`
- `glossary.md`
- `watch_order.md`

## Assignment Layer (Proof That Content Worked)

Each content unit must include a learner assignment tied to the intended outcome.

### Assignment design rules
- One assignment per concept unit, mapped to one behavior outcome.
- Assignment must be performable independently (no 1:1 explanation required).
- Submission includes evidence artifact (for example: commit, output, response, mini-project step).
- Rubric has pass criteria and common failure patterns.

### Agent flow for assignments
- `AssignmentAuthoringSkill`: drafts assignment + rubric from content outcome.
- `AssignmentEvaluationSkill`: evaluates submissions/evidence against rubric.
- `AssignmentInsightSkill`: summarizes where learners passed, stalled, or misunderstood.
- Output feeds `ContentReflectSkill` for keep/rebuild/kill.

### Assignment success metrics
- Attempt rate per assignment.
- Pass rate on first attempt.
- Time-to-completion.
- Rework frequency by concept.
- Correlation between clip consumption and assignment pass rate.

## Turnaround SLAs (For a ~2-Hour Session Recording)
- Transcript + segmentation: 45-90 minutes
- Essential edit draft: 2-4 hours
- Micro-clip batch: 3-5 hours
- Full publish-ready learner package: same day target (under 8 hours)

## Metrics Owned by Aroma
- Instructor prep hours per session (down week over week)
- Re-explanation rate per concept (down)
- Time-to-publish post-session assets (same-day target)
- % sessions with same-day essential edit + clips
- % content decisions backed by explicit signals
- Unit effectiveness rate from content health table
- Assignment first-pass success rate by concept
- Assignment completion lag after session publish

## 4-Week Build Plan

### Week 1 - Foundation
- Finalize content schema (`ContentSignal`, `ContentUnit`, `InstructorBrief`, `SessionAssetBundle`, `ContentHealthRecord`)
- Lock learner/instructor template formats
- Define content health scoring rubric
- Define assignment schema and evaluation rubric template

### Week 2 - Pipeline V1
- Implement signal-to-unit planning flow
- Implement learner and instructor pack generation
- Implement assignment authoring and evaluation flow
- Pilot on one AI Mastery module

### Week 3 - Video + Publishing Automation
- Implement recording ingestion, essential edit, micro-clip generation, and packaging
- Add quality gate checklist and review queue
- Connect assignment evidence outputs into reflect pipeline
- Pilot on two live sessions

### Week 4 - Reflect + Improve
- Run weekly reflect pipeline and generate first full content health table
- Rebuild at least two low-performing units
- Package process for reuse across EQ/SQ content formats

## Immediate Next 10 Days
- Run one full weekly loop end-to-end on a real session
- Publish one complete learner bundle from raw recording to platform-ready assets
- Generate first `content_health_table.md`
- Apply at least one `rebuild` decision in next cycle
