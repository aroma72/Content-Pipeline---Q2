---
type: router
last_verified: 2026-06-02
owner: aroma
---

# Drawing Room — Claude Operating Manual

**Owner:** Aroma Tahir  
**Purpose:** L&D content factory — converts session recordings into learner assets (video, clips, glossary, assignments, instructor packs)

---

## Quick Navigation

| I want to... | Go to... |
|--|--|
| Produce a video with reviewer gates (human-approved, step-by-step) | `/pipeline-review` → `.claude/standards/REVIEWER_GATED_PIPELINE.md` |
| Evaluate video quality (QA rating system) | `docs/QA_QUICK_REFERENCE.md` → `.claude/standards/QA_RATING_SYSTEM.md` |
| Write scripts (concept depth, single protagonist story) | `.claude/standards/SCRIPTING_STANDARDS.md` |
| Render videos (Remotion) | `docs/video-production.md` |
| Extract & mux voiceover | `docs/audio-extraction.md` |
| Understand frame count formula | `docs/design-standards.md` |
| Fix text cutoff in diagrams | `docs/troubleshooting.md` |
| Track my work | `.beads/status.jsonl` |
| Understand the content pipeline | `docs/content-pipeline.md` |
| Maintain infrastructure | `docs/infrastructure-maintenance.md` |
| See design standards | `.claude/standards/VIDEO_PRODUCTION_RULES.md` |

---

## Folder Structure

| Folder | Contents |
|--------|----------|
| `src/` | Python orchestrators, skills, agents |
| `skills/` | Synchronous Claude API wrappers |
| `agents/` | Async workers (ingest, edit, QA, publish) |
| `docs/` | Reference documentation |
| `.claude/` | Harness config: hooks, standards, agents, skills |
| `.beads/` | Work tracking (append-only JSONL) |
| `drawing-room-video/drawing-room-remotion/` | Remotion React components (submodule) |
| `video_production/` | Rendered output folders |
| `updated/` | Final published videos (with VO muxed) |

---

## Critical Rules (Never Break These)

🚫 **Voiceover:**
- Never use ElevenLabs without explicit permission
- Never regenerate VO — extract from existing and edit visuals to match
- Extract: `ffmpeg -i input.mp4 -vn -acodec aac -y output.aac`

🚫 **Git:**
- Always commit submodule FIRST, then main repo pointer
- Never force-push to main

🚫 **Video Rendering:**
- Frame count: `frames = VO_seconds × 30fps` (max +30 buffer)
- Verify before render: Root.tsx `durationInFrames` matches formula
- Final videos go in `updated/` folder

🚫 **SVG Diagrams:**
- ViewBox minimum 850px height for 7-node radials
- Labels below circles need 60px clearance

🚫 **Reviewer-Gated Pipeline:**
- Every pipeline step is followed by a reviewer (as-specified + complete + high quality)
- Share a SIMPLE report after each step; advance ONLY on Aroma's explicit approval
- On dissatisfaction: save feedback to `.beads/content_feedback.jsonl`, redo, never re-ask a resolved preference
- All reviewer comments/interventions logged to `video_production/<project>/REVIEW_LOG.md`

🚫 **Quality Assurance:**
- Every video MUST pass QA_RATING_SYSTEM.md before publication
- Minimum acceptable combined score: **4.9/7.0** (all 7 factors rated)
- Scores <4.9: FAIL — video must be remade
- Scores 4.9–5.4: PASS (with notes) — publish and monitor
- All ratings logged to `.beads/qa_ratings.jsonl` for weekly reporting

🚫 **Scripting:**
- All scripts MUST follow SCRIPTING_STANDARDS.md — concept depth + a SINGLE protagonist story (supersedes the old "3+ diverse examples" rule)
- Teach through ONE named, invented protagonist (e.g. "Ali, a statistician") in ONE running scenario, followed in depth — NOT a list of multiple domain examples
- Go deep, not wide: friction → fix → structure → failure mode → payoff, all on the protagonist's task; reuse the same protagonist across a video series; never use a real colleague's name

🚫 **Infrastructure:**
- Never hardcode SYSTEM_PROMPT — extract to `prompts/{name}.txt`
- Never delete `prompts/`, `tests/`, or `.claude/logs/`
- All skills load prompts using `_load_prompt()` from PROMPTS_DIR
- Keep pytest in requirements.txt — testing is mandatory

🚫 **Documentation:**
- CLAUDE.md stays under 150 lines — route to L3 docs
- All markdown files: frontmatter with `type:`, `last_verified:`, `owner:`

---

## Agents

| Agent | Purpose |
|-------|---------|
| render-all-videos | TSX → silent render → extract VO → mux → copy → commit |
| daily-git-sync | Auto-commit daily @ 12pm |
| quality-checker | Validate frame counts vs VO before render |

---

## Skills

| Skill | Command |
|-------|---------|
| pipeline-review | `/pipeline-review` |
| video-render | `/video-render` |
| audio-mux | `/audio-mux` |
| git-workflow | `/git-workflow` |

---

## Standards Documents

- **REVIEWER_GATED_PIPELINE.md** — Per-step reviewers, human-approval gates, feedback persistence, Review Log artifact
- **QA_RATING_SYSTEM.md** — 7-factor quality rubric, scoring 0–7, minimum thresholds, remediation workflow
- **SCRIPTING_STANDARDS.md** — Concept depth, single protagonist story, validation checklist (CRITICAL for all scripts)
- **VIDEO_PRODUCTION_RULES.md** — Frame math, SVG safety, text prevention
- **VOICEOVER_POLICY.md** — ElevenLabs policy, extraction workflow
- **DOC_TYPE_SYSTEM.md** — Doc types and line limits
- **METADATA_CONTRACT.md** — Frontmatter requirements

---

## Known Failures (See `.beads/failures.jsonl`)

- Text cutoff in SVG → expand viewBox to 850px
- Blank slides beyond audio → frame count = VO_seconds × 30
- Wrong submodule order → commit submodule FIRST
- Stale frame counts → validate before rendering

---

## Pre-Push Quality Gate

```bash
bash .claude/scripts/smoke-test.sh
```

---

*Last updated: 2026-06-02*
