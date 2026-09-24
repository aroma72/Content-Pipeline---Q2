---
type: router
last_verified: 2026-09-20
owner: aroma
---

# Drawing Room — Claude Operating Manual

**Owner:** Aroma Tahir  
**Purpose:** L&D content factory — converts session recordings into learner assets (video, clips, glossary, assignments, instructor packs)

---

## Quick Navigation

| I want to... | Go to... |
|--|--|
| **Make an explainer/lesson video (DEFAULT pipeline)** | **`creating-explainer-videos` skill → `explainer-videos/EXPLAINER-VIDEO-PIPELINE-SPEC.md`** |
| Produce a video with reviewer gates (human-approved, step-by-step) | `/pipeline-review` → `.claude/standards/REVIEWER_GATED_PIPELINE.md` |
| Evaluate video quality (QA rating system) | `docs/QA_QUICK_REFERENCE.md` → `.claude/standards/QA_RATING_SYSTEM.md` |
| Write scripts (concept depth, single protagonist story) | `.claude/standards/SCRIPTING_STANDARDS.md` |
| Render videos (Remotion — LEGACY, pre-explainer only) | `video-render` skill |
| Extract & mux voiceover | `audio-mux` skill → `.claude/standards/VOICEOVER_POLICY.md` |
| Understand frame count formula | `.claude/standards/VIDEO_PRODUCTION_RULES.md` |
| Fix text cutoff in diagrams | `.claude/standards/VIDEO_PRODUCTION_RULES.md` |
| **Operate the live service (durability, tenants, deploying, freeing disk)** | **`docs/SERVICE_DURABILITY_AND_CONTRACTS.md`** (§4a = videos → TU Drive) |
| **Check a script before spending money** | **`script-lint-preflight` skill** |
| **Quote / approve a paid run** | **`paid-run-protocol` skill** |
| Prove a change actually works | `verify-before-claiming` skill |
| Hit a Windows / Git-Bash / python3 trap | `this-machine` skill |
| Run the LLM content gates | `gates/run-gates.js` |
| Check the skills themselves still load | `evals/skills/run.js` |
| Track my work | `.beads/status.jsonl` |
| **Know what past sessions learned (hot/warm/cold memory)** | **`.claude/memories/MEMORY-INDEX.md`** → `.claude/standards/MEMORY_TIERS.md` |
| Understand the content pipeline | `docs/PIPELINE.md` |
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
| `explainer-videos/` | DEFAULT pipeline: brand bumpers + per-video folders (beats.js → branded MP4) |
| `drawing-room-video/drawing-room-remotion/` | Remotion React components (LEGACY) |
| `video_production/` | Rendered output folders (legacy) |
| `updated/` | Final published videos (with VO muxed) |

---

## Critical Rules (Never Break These)

🚫 **Default Video Pipeline (explainer/lesson videos):**
- New content uses the `creating-explainer-videos` skill (beats.js → Imagen art → Python cutout → Gemini TTS → Puppeteer/ffmpeg → brand bumpers). Spec: `explainer-videos/EXPLAINER-VIDEO-PIPELINE-SPEC.md`
- Every video MUST meet the **Explainer Video Quality Standard** (skill SKILL.md "Quality bar"): protagonist always named **Ali**, warm human voice, breathing pauses, consistent flat-illustration visuals, no baked-in text, cutouts never cut an object halfway (whole object or `scene` mode), visible movement in every beat, Taleemabad bumpers, subtle calm ducked music
- Remotion + ElevenLabs are LEGACY — use only to maintain pre-existing videos, not for new ones
- Deliverable is always `<name>_final.mp4` (wrapped in brand bumpers), never the bare render
- No paid AI video (Veo rejected). Follow the LAWS in the skill's SKILL.md

🚫 **Finished videos → TU Drive, then reclaim disk** (§4a): no approval gate (saving ≠ publishing); capture attributes → upload → **verify md5** → record → only then delete; **never delete `beats.js`/`durations.json`** (checkpoints recompute from them); backfill `scripts/offload-deliverables-to-drive.js` is dry-run by default

🚫 **Voiceover:**
- Default is **Gemini TTS** via the explainer pipeline, one-take normalized (`tts-lesson.js`); paid Imagen/TTS never fire without `--yes`/`CONFIRM_SPEND=1` (ask first)
- ElevenLabs (legacy): never use without explicit permission; never regenerate — extract & edit visuals to match (`ffmpeg -i in.mp4 -vn -acodec aac -y out.aac`)

🚫 **Git:**
- Always commit submodule FIRST, then main repo pointer
- Never force-push to main

🚫 **Video Rendering (LEGACY Remotion — pre-explainer videos only):**
- Frame count: `frames = VO_seconds × 30fps` (max +30 buffer)
- Verify before render: Root.tsx `durationInFrames` matches formula
- Final videos go in `updated/` folder
- New videos: use the explainer pipeline instead (1920×1080 / 30fps / yuv420p / AAC)

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
- Teach through ONE named, invented protagonist in ONE running scenario, followed in depth — NOT a list of multiple domain examples. **The protagonist is ALWAYS named "Ali"** (never Bilal or any other name), for any example in any video
- Go deep, not wide: friction → fix → structure → failure mode → payoff, all on the protagonist's task; reuse the same protagonist across a video series; never use a real colleague's name
- **EVERY video MUST include a CHECKPOINT beat** — `{mode:'checkpoint', quiz:{stem, options, answer, correctNote, explain}}` — NEVER drawn, NEVER spoken. The player pauses at that beat boundary, the LMS shows the question, **the learner must click an option to continue** (no skip/dismiss/seek-past), gets feedback that explains the mistake, then the video resumes. Enforced by `qa-checkpoint.js` (fails the build) and `scripts/publish-checkpoint.js` (verifies it live on Railway). Settled — do not change the format without Aroma saying so. See SCRIPTING_STANDARDS §3b

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

**`explainer-script-gatekeeper`** — the only loadable subagent; applies `reviewing-explainer-scripts` and returns a VERDICT block.
Prose runbooks (not loadable agents): `render-all-videos` · `quality-checker` · `daily-git-sync` in `.claude/agents/`.


## Skills

Claude picks these from their `description`, so a skill with a broken one is invisible — `evals/skills/run.js` enforces that contract.

**Making video** — `creating-explainer-videos` (DEFAULT) · `writing-explainer-scripts` · `reviewing-explainer-scripts` (step-0 gate) · `script-lint-preflight` (six lint rules + free sensors, before any spend) · `animation-motion-design` · `creating-avatar-videos` (talking head) · `video-render` + `audio-mux` (legacy Remotion)

**Working safely** — `paid-run-protocol` (quote → ceiling → approve → persist → commit) · `verify-before-claiming` (assert on the artefact, never the exit code) · `this-machine` (Windows / Git-Bash / hook traps) · `git-workflow` · `pipeline-review`

**Memory** — `memory-distill` (archive → warm) · `memory-stats` (health)

Authoring a new one: `.claude/standards/SKILL_AUTHORING.md`.


## Standards Documents

All in `.claude/standards/`. **SCRIPTING_STANDARDS** (concept depth, single protagonist — CRITICAL for all scripts) · **QA_RATING_SYSTEM** (7-factor rubric) · **REVIEWER_GATED_PIPELINE** (per-step reviewers, approval gates) · **MEMORY_TIERS** (hot/warm/cold memory) · **VIDEO_PRODUCTION_RULES** (frame math, SVG safety — legacy) · **VOICEOVER_POLICY** · **DOC_TYPE_SYSTEM** · **METADATA_CONTRACT** · **SKILL_AUTHORING** (frontmatter contract, evals)


## Known Failures (See `.beads/failures.jsonl`)

- SVG text cutoff → viewBox 850px · blank slides → frames = VO_seconds × 30 · wrong submodule order → submodule FIRST · stale frame counts → validate first · dark-bg art breaks cutout (force cream) · stale `frames/` → `rm -rf` & re-render · `clips == beats` before compile

---

## Pre-Push Quality Gate: `bash .claude/scripts/smoke-test.sh` — install it: `bash scripts/install-hooks.sh` (once per clone; also adds pre-commit). Audit: `docs/HARNESS_AUDIT.md`
🚫 **Deploy = `node scripts/predeploy-check.js && git push origin <branch>:main && railway redeploy --from-source -y`** — `--from-source` pulls main, so it ROLLS BACK unmerged work; the check refuses while the course worker is building (a redeploy mid-build interrupted a paid lesson on 2026-09-23).
*Last updated: 2026-09-23*
