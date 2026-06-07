# Drawing Room — L&D Content Factory

**A high-velocity content production system that converts session recordings into learner assets (video, clips, glossary, assignments, instructor packs).**

---

## Quick Start

| I want to... | Go to... |
|--|--|
| Produce a video with reviewer gates | `/pipeline-review` → `.claude/standards/REVIEWER_GATED_PIPELINE.md` |
| Evaluate video quality | `docs/QA_QUICK_REFERENCE.md` |
| Write scripts | `.claude/standards/SCRIPTING_STANDARDS.md` |
| Render videos | `/video-render` or `docs/video-production.md` |
| Extract & mux voiceover | `/audio-mux` or `docs/audio-extraction.md` |
| Understand frame count formula | `docs/design-standards.md` |
| Track progress | `.beads/status.jsonl` (append-only work log) |

---

## Project Overview

**Drawing Room** is the L&D content factory for the **14-week Agentic AI Masterclass** and related training programs. It orchestrates the production pipeline from session recordings → rendered videos → interactive learner assets.

### Key Stats
- **14-week course plan** with weekly video deliverables
- **7-stage production pipeline** with human review gates at each step
- **Quality gates**: 7-factor QA rubric, minimum 6.0/7.0 to publish
- **Infrastructure**: Python orchestrators + Remotion (React video framework)
- **Tech Stack**: Claude API, Whisper, ffmpeg, Remotion, ElevenLabs (voice-over)

---

## Folder Structure

```
.
├── src/                          # Python orchestrators & agents
├── skills/                       # Claude API wrappers (synchronous)
├── agents/                       # Async workers (ingest, edit, publish)
├── docs/                         # Reference documentation
├── .claude/                      # Harness config (standards, agents, skills)
├── .beads/                       # Work tracking (append-only JSONL)
├── drawing-room-video/           # Remotion video components (git submodule)
│   └── drawing-room-remotion/
├── video_production/             # Rendered output (staging)
├── updated/                      # Final published videos (VO muxed)
└── CLAUDE.md                     # Project operating manual
```

---

## Critical Rules

🚫 **Never break these:**

| Rule | Reason |
|------|--------|
| Extract SYSTEM_PROMPT to `prompts/{name}.txt`, use `_load_prompt()` | Enable prompt versioning & review |
| Always commit submodule FIRST, then main repo pointer | Prevents orphaned commits |
| Frame count = `VO_seconds × 30fps` (max +30 buffer) | Prevents blank slides at end |
| Every video MUST pass QA before publish | Minimum 6.0/7.0 combined score |
| No scripts with only Taleemabad examples | Requires 3+ diverse domains |
| Never force-push to main | Preserve history & collab work |

See `CLAUDE.md` for full rules.

---

## Pipeline Architecture

```
Session Recording
    ↓
[1] INGEST (Whisper transcript)
    ↓
[2] CONCEPT SEGMENTATION (identify topics)
    ↓ (REVIEWER GATE: concepts approved?)
[3] SCRIPT WRITING (3+ diverse examples)
    ↓ (REVIEWER GATE: script approved?)
[4] VISUAL DESIGN (Remotion components)
    ↓ (REVIEWER GATE: visuals reviewed?)
[5] VOICEOVER (ElevenLabs or manual)
    ↓ (REVIEWER GATE: audio approved?)
[6] AUDIO-VIDEO SYNC (ffmpeg mux)
    ↓ (REVIEWER GATE: sync checked?)
[7] QUALITY ASSURANCE (7-factor rubric)
    ↓ (QA PASS? min 6.0/7.0)
PUBLISH → Taleemabad LMS
```

**Each step is followed by a human reviewer** (see `.claude/standards/REVIEWER_GATED_PIPELINE.md`).

---

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+ (for Remotion)
- ffmpeg
- ElevenLabs API key (optional, for voiceover)
- Claude API key (required)

### Installation

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node dependencies (for Remotion)
cd drawing-room-video/drawing-room-remotion
npm install

# Load environment variables
# Create .env with:
# - ANTHROPIC_API_KEY
# - ELEVENLABS_API_KEY (if using TTS)
```

### Running the Pipeline

```bash
# View available skills/agents
ls .claude/skills/
ls src/agents/

# Run video rendering
/video-render

# Run audio mux
/audio-mux

# Review-gated pipeline (human approvals at each step)
/pipeline-review
```

---

## Key Documents

- **`CLAUDE.md`** — Project operating manual (critical rules, quick navigation)
- **`.claude/standards/REVIEWER_GATED_PIPELINE.md`** — Per-step reviewers & approval gates
- **`.claude/standards/QA_RATING_SYSTEM.md`** — 7-factor quality rubric & scoring
- **`.claude/standards/SCRIPTING_STANDARDS.md`** — Concept depth + diverse examples checklist
- **`.claude/standards/VIDEO_PRODUCTION_RULES.md`** — Frame math, SVG safety, design rules
- **`docs/PIPELINE.md`** — Content production workflow
- **`docs/video-production.md`** — Remotion rendering guide
- **`docs/audio-extraction.md`** — ffmpeg VO extraction & mux workflow

---

## Quality Gates

Every video is evaluated on **7 factors** (0.0–7.0 scale):

1. **Concept Clarity** — Is the core idea clear?
2. **Example Relevance** — Do examples illustrate the concept?
3. **Pacing** — Is the pace deliberate or rushed?
4. **Visual-Audio Sync** — Do slides match voiceover content?
5. **Production Quality** — Video/audio technical quality
6. **Learner Engagement** — Does it hold attention?
7. **Actionability** — Can learners apply what they learned?

**Minimum Combined Score: 6.0/7.0** → Pass and publish  
**Below 6.0:** FAIL → Remake video

---

## Known Issues & Troubleshooting

| Issue | Solution | See |
|-------|----------|-----|
| Text cutoff in SVG diagrams | Expand viewBox to 850px minimum | `docs/troubleshooting.md` |
| Blank slides beyond audio | Frame count = VO_seconds × 30 | `docs/design-standards.md` |
| Wrong submodule commit | Commit submodule FIRST, then pointer | `CLAUDE.md` |
| Frozen/static video | Check Root.tsx durationInFrames | `feedback_animation_static_root_cause.md` |

---

## Weekly Progress Tracking

Work is logged to `.beads/status.jsonl` (append-only):

```bash
# View this week's work
cat .beads/status.jsonl | jq 'select(.week == 2)'

# View QA ratings
cat .beads/qa_ratings.jsonl | jq '.[] | {video, score, factors}'
```

---

## Integration

### Taleemabad LMS
Videos are published to the Taleemabad learning platform (see `ref_taleemabad.md` for integration details).

### Remotion (Video Rendering)
Open-source React video framework. Components live in `drawing-room-video/drawing-room-remotion/src/`.

See [Remotion docs](https://www.remotion.dev) for custom composition development.

---

## Feedback & Iteration

Reviewer feedback is logged to:
- **`.beads/content_feedback.jsonl`** — Structured feedback from each review gate
- **`video_production/<project>/REVIEW_LOG.md`** — Human-readable review history

See `.claude/standards/REVIEWER_GATED_PIPELINE.md` for feedback workflow.

---

## Architecture Decisions

| Decision | Why | Trade-off |
|----------|-----|-----------|
| Remotion (React) vs Runway/JSON2Video | Open-source, full control, -65% cost ($180/mo savings) | Steeper learning curve, self-hosted |
| Python + Claude API for orchestration | Agentic workflows, prompt caching, tool use | Dependency on Anthropic API |
| Append-only JSONL for work tracking | Immutable audit trail, easy to replay | No mutable project state |

---

## Roadmap

- **Week 1** (✅ Done) — Schema contracts & pipeline v1
- **Week 2** (In progress) — Video production automation + QA system
- **Week 3** — Publish pipeline + learner pack generation
- **Week 4** — Reflect & iterate on workflow

---

## Contributing

All changes require:
1. ✅ Pass pre-commit hooks (no hardcoded prompts, pytest in requirements.txt)
2. ✅ Reviewer approval (see REVIEWER_GATED_PIPELINE.md)
3. ✅ QA pass (min 6.0/7.0 for video changes)
4. ✅ Updated `.beads/status.jsonl` with work log

---

## Owner

**Aroma Tahir** — Content Creator & Project Lead  
Email: aroma.tahir@taleemabad.com

---

## License

Internal — Taleemabad / Drawing Room project.

---

*Last Updated: 2026-06-08*  
*Repository: https://github.com/aroma72/Content-Pipeline---Q2*
