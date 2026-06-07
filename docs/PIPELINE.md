---
type: reference
last_verified: 2026-06-05
owner: Aroma Tahir
---

# Content Queen — Full Production Pipeline

**What this is:** End-to-end map of how a session recording (or a scripted concept) becomes a published learner asset. Every stage lists its **inputs**, **sub-steps**, **files generated**, and the **agent/skill/script** that runs it.

The system runs a six-stage agentic loop:

```
Perceive → Plan → Act → Observe → Reflect → (re-enter Perceive)
```

There are two entry points:
- **A. Recording-driven** — a raw session video arrives, gets transcribed, segmented, edited, clipped, QA'd, and published.
- **B. Script-driven** — a concept video is authored from a script, animated in Remotion, voiced, muxed, QA'd, and published.

Both converge at the **QA gate → publish** stages.

---

## Stage 0 — Trigger / Ingestion

**Runs:** file watcher on `recordings/`
**Input:** raw `.mp4` / `.webm` / `.mov` dropped into `recordings/`, optional `session_metadata.json` (course, topic, instructor, learner count)

**Sub-steps**
1. Watcher detects new file in `recordings/`.
2. Quality precheck — audio ≥ −20 dB RMS, ≥ 720p (1080p preferred), duration > 15 min.
3. If checks fail → flagged, not ingested.
4. Creates the working folder for this session.

**Files generated**
- `drafts/YYYY-MM-DD_session-N/` (working folder created)

---

## Stage 1 — Perceive (Transcribe & Diarize)

**Runs:** `agents/recording_ingest_agent.py` (Opus, ~45–90 min)
**Input:** raw recording from Stage 0

**Sub-steps**
1. Whisper transcribes audio to text with timestamps.
2. Speaker diarization splits dialogue by speaker.
3. Word-error-rate check (pass criterion: < 5% WER).

**Files generated**
- `drafts/<session>/transcript.vtt`
- `drafts/<session>/speaker_segments.json`

---

## Stage 2 — Plan (Concept Segmentation)

**Runs:** `agents/concept_segmentation_agent.py` (Opus, ~15–30 min)
**Input:** `transcript.vtt` + topic metadata

**Sub-steps**
1. Read transcript against the week's objectives (must align with the **14-week Agentic AI plan**).
2. Label each segment `must_keep` / `optional` / `remove`.
3. Map segments to concept IDs.
4. Pass criterion: ≥ 85% of kept segments are truly essential.

**Files generated**
- `drafts/<session>/segments.json` (labeled segments + concept map)
- `ContentSignal` records (observed learning issues → backlog)

---

## Stage 3 — Act (Produce Assets)

This is where the two entry points diverge. **3A** for recordings, **3B** for scripted concept videos.

### 3A — Essential Edit + Concept Clips (recording path)

**Runs:** `agents/essential_edit_agent.py` (Opus, ~30–120 min) then `agents/micro_video_agent.py` (Opus, ~30–90 min, parallelizable)
**Input:** transcript + `segments.json` + `speaker_segments.json`

**Sub-steps**
1. Build an edit decision list from `must_keep` segments.
2. ffmpeg cuts the full session down to the essential edit.
3. Slice each concept into a standalone 2–4 min micro-clip.
4. Pass criteria: instructor approval ≥ 4/5; 100% of clips between 2–4 min.

**Files generated**
- `drafts/<session>/edit_timeline.json`
- `drafts/<session>/essential_edit_draft.mp4`
- `drafts/<session>/concept_clips/` (5+ MP4s, one per concept)

### 3B — Scripted Concept Video (Remotion path)

This is the path used for the Consumer→Producer series, Course Overview, "Why AI Important", etc.

#### 3B.1 — Script

**Runs:** authored against `SCRIPTING_STANDARDS.md`
**Sub-steps**
1. Write to concept depth (define WHY → mechanism → pattern).
2. Include ≥ 3 diverse-domain examples; Taleemabad context is the **last** example, never the only one.
3. Mentor-tone passages are **speaking cues only** — never rendered as on-screen text.
4. Apply pacing budget: ~120–140 words per 60 s (deliberate, not rushed).

**Files generated**
- `docs/<NAME>_SCRIPT.md`

#### 3B.2 — Remotion Composition

**Runs:** edit `drawing-room-video/drawing-room-remotion/src/<Name>.tsx` + register in `src/Root.tsx`
**Sub-steps**
1. Build/edit the `.tsx` composition (scenes, opacity fades, interpolation).
2. Register the composition in `Root.tsx` with `durationInFrames`.
3. **Frame-count rule:** `durationInFrames = VO_seconds × 30` (max +30 buffer). Verify before render.
4. SVG safety: viewBox ≥ 850px height for 7-node radials; 60px label clearance.

**Files generated**
- `drawing-room-video/drawing-room-remotion/src/<Name>.tsx`
- updated `src/Root.tsx` (composition registered)

#### 3B.3 — Render to Silent Video

**Runs:** `/video-render` skill → `npx remotion render <CompositionID>` (1920×1080, 30fps, H.264)
**Sub-steps**
1. Render composition frames.
2. (Frame-sequence variant) `scripts/render_video_from_frames.py` compiles `animated/*.png` → MP4 via OpenCV.
3. Validate: file exists, duration ≈ VO + 0–1 s.

**Files generated**
- `video_production/<project>/animated/scene_*_frame_*.png` (frame sequence, when used)
- `video_production/<project>/<NAME>_FINAL.mp4` (silent)

#### 3B.4 — Voiceover

**Runs:** `agents/voiceover_agent.py` / `scripts/generate_missing_vo.py` (ElevenLabs v2 turbo, Rachel voice)
**Critical policy (`VOICEOVER_POLICY.md`)**
1. **Never** call ElevenLabs without explicit permission.
2. **Never regenerate** existing VO — extract from the existing file and only generate the *missing* segment.
   - Extract: `ffmpeg -i input.mp4 -vn -acodec aac -y output.aac`
3. Moderate, deliberate pacing; natural 0.5–1 s pauses between concepts.

**Files generated**
- `video_production/<project>/vo.mp3` (or `vo.aac`)

#### 3B.5 — Mux Audio + Video

**Runs:** `/audio-mux` skill, or `scripts/add_audio_to_video.py` (moviepy) / `scripts/merge_video_audio_pydub.py` (pydub)
**Sub-steps**
1. Combine silent MP4 + VO with correct stream mapping:
   `ffmpeg -i silent.mp4 -i vo.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -b:a 128k -shortest out.mp4`
2. The `-map` flags are mandatory — omitting them produces a silent/blank deliverable (known failure).

**Files generated**
- `video_production/<project>/<NAME>_WITH_AUDIO.mp4` (final deliverable)

---

## Stage 4 — Observe (Quality Gate)

**Runs:** `agents/video_quality_gate_agent.py` (Haiku, ~5–15 min) + `QA_RATING_SYSTEM.md` scoring
**Input:** the edit/clips (3A) or the `_WITH_AUDIO.mp4` (3B)

**Sub-steps**
1. Automated checks — audio quality, concept completeness, duration bounds, privacy/PII.
2. **7-factor QA rating** (each 0.0–1.0): Accuracy · Objectives Coverage · Post-Production · Visuals · Storytelling · Voice-Over Quality · QA Process.
3. Combined score 0.0–7.0:
   - **< 4.9 → FAIL** — remake the video.
   - **4.9–5.4 → PASS (with notes)** — publish and monitor.
   - Flag `publish_ready` or `needs_review`.

**Files generated**
- quality flags on the `SessionAssetBundle`
- append row to `.beads/qa_ratings.jsonl`
- `video_production/<project>/PRODUCTION_SUMMARY.md`
- `video_production/<project>/DELIVERY_MANIFEST.md`

**Human review queue** (Notion / Slack): triggered on `needs_review`, assignment pass-rate < 70%, or instructor-reported confusion. SLA 24 h. > 3 rejections → escalate to course lead. Rejected items re-run **fresh** (no reuse of the prior attempt).

---

## Stage 5 — Act (Publish)

**Runs:** `agents/learner_pack_publisher_agent.py` (Haiku, ~30 min)
**Input:** `publish_ready` SessionAssetBundle

**Sub-steps**
1. Assemble the learner pack (video, clips, summary, glossary, watch order, transcript).
2. Push to the Taleemabad LMS API.
3. Receive published URLs.
4. Git: **commit submodule FIRST**, then the main-repo submodule pointer. Final videos land in `updated/`.

**Files generated**
- `published/YYYY-MM-DD_session-N/` (pack + URLs)
- `updated/<final video>.mp4`

---

## Stage 6 — Reflect (Health & Learning)

**Runs:** content-reflection skill (Haiku) + `.beads/` logging
**Input:** learner performance after publish

**Sub-steps**
1. Track `ContentHealthRecord` — attempt rate, first-attempt pass rate, completion, teacher confidence.
2. Decide: keep / iterate / rebuild (with `rebuild_priority`).
3. Log decisions and any new failure patterns.
4. New issues become `ContentSignal`s → re-enter Perceive.

**Files generated**
- `weekly_artifacts/week-W-YYYY/` (signal backlog, content map, health table)
- append to `.beads/status.jsonl`, `.beads/decisions.jsonl`, `.beads/failures.jsonl`

---

## Generated-Files Quick Index

| File / Folder | Stage | Produced by |
|---|---|---|
| `drafts/<session>/transcript.vtt` | 1 | recording_ingest_agent |
| `drafts/<session>/speaker_segments.json` | 1 | recording_ingest_agent |
| `drafts/<session>/segments.json` | 2 | concept_segmentation_agent |
| `drafts/<session>/edit_timeline.json` | 3A | essential_edit_agent |
| `drafts/<session>/essential_edit_draft.mp4` | 3A | essential_edit_agent |
| `drafts/<session>/concept_clips/*.mp4` | 3A | micro_video_agent |
| `docs/<NAME>_SCRIPT.md` | 3B.1 | author (SCRIPTING_STANDARDS) |
| `src/<Name>.tsx` + `src/Root.tsx` | 3B.2 | Remotion |
| `video_production/<project>/animated/*.png` | 3B.3 | render_video_from_frames.py |
| `video_production/<project>/<NAME>_FINAL.mp4` | 3B.3 | /video-render |
| `video_production/<project>/vo.mp3` | 3B.4 | voiceover_agent / generate_missing_vo.py |
| `video_production/<project>/<NAME>_WITH_AUDIO.mp4` | 3B.5 | /audio-mux |
| `PRODUCTION_SUMMARY.md` · `DELIVERY_MANIFEST.md` | 4 | quality gate |
| `.beads/qa_ratings.jsonl` | 4 | QA scoring |
| `published/<session>/` · `updated/*.mp4` | 5 | learner_pack_publisher_agent |
| `weekly_artifacts/week-W/` | 6 | content-reflection |
| `.beads/status|decisions|failures.jsonl` | 6 | reflection logging |

---

## Model & Tool Stack

| Layer | Tool | Used in |
|---|---|---|
| Reasoning / planning / video analysis | Claude Opus 4.7 | Stages 1–3A |
| Drafting / instructor packs | Claude Sonnet 4.6 | Stage 3 authoring |
| QA / reflection / scoring | Claude Haiku 4.5 | Stages 4, 6 |
| Transcription + diarization | Whisper | Stage 1 |
| Cuts / clips / mux / subtitles | ffmpeg | Stages 3A, 3B.5 |
| Composition + render | Remotion | Stage 3B |
| Publishing | Taleemabad LMS API | Stage 5 |

**Pilot cost (2 sessions/week):** ~$19/week API (Claude ~$15 + Whisper ~$4); ffmpeg/Remotion run locally. Ceiling $50/week.

---

## Guardrails Enforced Across the Pipeline

- **Frame count:** `frames = VO_seconds × 30` (max +30). Validate before every render.
- **Voiceover:** permission-required; extract, never regenerate.
- **QA:** every video passes `QA_RATING_SYSTEM.md`; < 4.9 fails.
- **Scripting:** concept depth + ≥ 3 diverse-domain examples; Taleemabad last.
- **Git:** submodule commits before main-repo pointer; never force-push main.
- **SVG:** viewBox ≥ 850px for 7-node radials; 60px label clearance.
- **Infra:** no hardcoded `SYSTEM_PROMPT`; never delete `prompts/`, `tests/`, `.claude/logs/`.

---

*Related: `docs/content-pipeline.md` · `planning/planning.md` · `.claude/standards/` · `docs/QA_QUICK_REFERENCE.md`*
