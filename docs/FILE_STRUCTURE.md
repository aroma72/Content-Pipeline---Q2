---
type: reference
last_verified: 2026-09-28
owner: aroma
---

# File Structure — where everything lives

The one map of this repo. `CLAUDE.md` routes here for "where is X"; this page routes on to a
folder's own README when you need the detail.

```
CLAUDE.md                      L1  router: what to do, and the rules
  └─ docs/FILE_STRUCTURE.md    L3  this page: every top-level entry, a lookup index, what moved
       └─ <folder>/README.md       media/, content/, legacy/, docs/ — what is inside, and the traps
```

**Enforced, not just documented.** `orchestrator/test-layout.js` (part of `npm test`) fails if the
root gains a file or folder, if anything still points at a pre-2026-09-28 location, or if a path in
backticks on this page stops existing. Change the layout and this page together.

---

## The root at a glance

| Entry | What it is |
|--|--|
| `server/` | **Live.** The Express service; Railway runs `server/index.js` |
| `orchestrator/` | **Live.** Pipeline spine and stages, job store helpers, the regression suites |
| `explainer-videos/` | **Live.** The default video pipeline: brand bumpers + one folder per video |
| `prompts/` | **Live.** Every system prompt. Never inline one — CI blocks it |
| `scripts/` | Deploy, predeploy, live verification, `verify-all.js`, fixtures |
| `prototypes/` | The three HTML pages the service serves, and the scripts that build them |
| `gates/` | LLM content gates (`gates/run-gates.js`); installs its own deps |
| `evals/` | Skill-contract evals (`evals/skills/run.js`) |
| `tests/` | The pytest suite for the legacy Python layer |
| `media/` | Render output, and the kits that produce media → [media/README.md](../media/README.md) |
| `content/` | Authored material and pipeline working state → [content/README.md](../content/README.md) |
| `legacy/` | Pre-explainer code, including the whole Python pipeline → [legacy/README.md](../legacy/README.md) |
| `docs/` | Reference documentation → [docs/README.md](README.md) |
| `.claude/` | Harness: skills, standards, hooks, agents, memories |
| `.beads/` | Append-only work tracking (`.beads/status.jsonl`, `failures.jsonl`, `qa_ratings.jsonl`) |
| `.github/` | CI (`.github/workflows/test.yml`) and the pre-commit hook source |

Root files — each is pinned by something that breaks if it moves:

| File | Pinned by |
|--|--|
| `Dockerfile`, `.dockerignore`, `package.json`, `package-lock.json` | CI matches them anchored at the root (`^Dockerfile$`); move one and the image job silently stops running |
| `railway.json`, `.railwayignore` | Railway reads them from the upload root |
| `eslint.config.mjs` | ESLint flat-config discovery |
| `requirements.txt` | CI and `.github/hooks/pre-commit` read it by name |
| `CLAUDE.md` | the smoke test requires it and caps it at 150 lines |
| `agent_memory.json` | read at runtime by `legacy/python/memory_manager.py` |
| `.gitignore`, `.env.example`, `README.md` | convention |

## What reaches production

`.dockerignore` denies everything (`*`) and re-admits a short allowlist: `package.json`,
`package-lock.json`, `build.json` (stamped at deploy time), `server/`, `orchestrator/`, `prompts/`,
`.claude/`, `explainer-videos/`, three pages from `prototypes/`, and `.beads/publish_review.jsonl`.
**Nothing in `media/`, `content/`, `legacy/` or `docs/` ships.** A file the service must read has to
live under an allowlisted path.

---

## Where do I find…

| I need… | It is in… |
|--|--|
| every HTTP route | `server/app.js` (`/health`, `/demo/*`, `/tick`) and `server/lib/api.js` (`/api/v1/*`) |
| what `/health` reports | `server/app.js` (the route) and `server/lib/health.js` (the verdict) |
| which credentials the service sees | `server/lib/config.js` → `readiness()` |
| tenants, tokens, owner cookies | `server/lib/tenants.js`, `server/lib/owner.js` |
| the job store | `server/lib/job-store.js` |
| the course worker | `server/lib/course-worker.js` |
| the stage order | `orchestrator/lib/spine.js` → `STAGE_ORDER` |
| one stage's code | `orchestrator/lib/stages/` |
| path constants (Node) | `orchestrator/lib/paths.js` → `PATHS` |
| path constants (Python) | `legacy/python/config.py` → `MEDIA_DIR`, `CONTENT_DIR`, `VIDEO_PRODUCTION_DIR`… |
| beat validation before spend | `orchestrator/lib/validate-beats.js` |
| can this machine render? | `orchestrator/lib/preflight.js` |
| Claude calls (SDK / CLI / routing) | `orchestrator/lib/llm.js`, `orchestrator/lib/llm-cli.js`, `orchestrator/lib/llm-router.js` |
| YouTube and Drive upload | `orchestrator/lib/youtube.js`, `orchestrator/lib/gdrive.js`, `orchestrator/lib/drive-offload.js` |
| persisting a paid deliverable | `orchestrator/lib/deliverables.js` |
| a system prompt | `prompts/<name>.txt` |
| the explainer templates copied into every video | `.claude/skills/creating-explainer-videos/templates/` |
| the brand intro/outro | `explainer-videos/brand-intro-outro/` |
| one video's script and art | `explainer-videos/<series>/<slug>/` (`beats.js`, `art/`, `out/`) |
| the pipeline spec | `explainer-videos/EXPLAINER-VIDEO-PIPELINE-SPEC.md` |
| environment keys | `.env.example` |
| deploy | `scripts/deploy.sh` (Git Bash) or `scripts/deploy.ps1` (PowerShell) |
| "is production healthy?" | `scripts/predeploy-check.js`, `scripts/verify-live.js` |
| **"is everything still working?"** | `npm run verify` → `scripts/verify-all.js` |
| the pre-push gate | `.claude/scripts/smoke-test.sh` |
| the daily health check | `.claude/scripts/infrastructure-check.sh` |
| CI | `.github/workflows/test.yml` |
| the Node tests | `orchestrator/test-regressions.js`, `test-store.js`, `test-server.js`, `test-predeploy.js`, `test-layout.js` |
| the Python tests | `tests/` (run `pytest tests/`, never a bare `pytest` — see legacy/README) |
| scripting, QA, voiceover rules | `.claude/standards/` |
| a skill | `.claude/skills/<name>/SKILL.md` |
| what past sessions learned | `.claude/memories/MEMORY-INDEX.md` |
| operating the live service | `docs/SERVICE_DURABILITY_AND_CONTRACTS.md` |
| the course API contract | `docs/contracts/` |
| the legacy Python entry point | `legacy/python/main.py` (CI runs `--dry-run`) |
| student setup PDFs | `docs/onboarding/` |
| session deliverables (docx/pdf) | `docs/course-materials/` |
| a dated status report | `docs/archive/` |

---

## The areas, briefly

Each folder README has the detail; this is enough to know which one to open.

**`media/`** — `media/fashion-tech/` (four avatar experiments), `media/avatar-video-kit/`,
`media/blender/`, `media/tools/` (Blender and YouTube CLIs), `media/drawing-room-video/` (the legacy
Remotion project), and render output: `media/video_production/`, `media/updated/`,
`media/recordings/`, `media/voiceovers/`, `media/animation-frames/`,
`media/course-overview-video-output/`, `media/voiceover-windows-formal/`.

**`content/`** — authored: `content/assignments/`, `content/video_scripts/`,
`content/session-bundles/`, `content/templates/`, `content/planning/`, `content/memory/`
(a pointer stub). Pipeline state created by `legacy/python/config.py`: `content/drafts/`,
`content/published/`, `content/review_queue/`, `content/weekly_artifacts/`.

**`legacy/`** — `legacy/python/` (the original pipeline, moved whole), `legacy/node/`,
`legacy/powershell/`, `legacy/scratch/`.

**`docs/`** — live references at the top level; `docs/guides/` (legacy-stack how-tos),
`docs/archive/`, `docs/onboarding/`, `docs/course-materials/`, `docs/contracts/`,
`docs/integration-requests/`.

---

## Moved on 2026-09-28

Three passes emptied the root. If an archived doc, a memory note or an old habit names a path on
the left, it now lives on the right. (`orchestrator/test-layout.js` holds the same table as code.)

<!-- layout-audit:ignore-start -->
| Was at the root | Now |
|--|--|
| `video_production/`, `updated/`, `recordings/`, `voiceovers/` | `media/…` (same name) |
| `voiceover-windows-formal/`, `animation-frames/`, `course-overview-video-output/` | `media/…` |
| `blender/`, `tools/`, `avatar-video-kit/`, `drawing-room-video/` | `media/…` |
| `fashion-tech-avatar/`, `-avatar-broll/`, `-avatar-clean/`, `fashion-tech-real/` | `media/fashion-tech/avatar/`, `broll/`, `clean/`, `real/` |
| `assignments/`, `video_scripts/`, `templates/`, `planning/`, `memory/` | `content/…` |
| `drafts/`, `published/`, `review_queue/`, `weekly_artifacts/` | `content/…` |
| `Agentic_AI_Mastery_Session1_Bundle/` | `content/session-bundles/agentic-ai-mastery-session1/` |
| `agents/`, `skills/`, `utils/` | `legacy/python/…` |
| all 38 root `*.py` (`config.py`, `main.py`, `orchestrator.py`…) | `legacy/python/` |
| root `test_*.py` (ad-hoc scripts, not tests) | `legacy/python/checks/check_*.py` |
| root `*.js` (render/mux scripts), `*.ps1` | `legacy/node/`, `legacy/powershell/` |
| `.run.sh`, `.t.sh`, `.v2.sh`, `.v3.sh`, `.shot.js`, `.jobid`, `.step3.json` | `legacy/scratch/` (dot dropped) |
| ~40 root `*.md` | `docs/guides/` (how-tos) or `docs/archive/` (status reports) |
| setup PDFs, `generate_setup_manual.py` | `docs/onboarding/` |
| session `.docx`/`.pdf` bundles | `docs/course-materials/` |
| `FILE_STRUCTURE.md` | `docs/FILE_STRUCTURE.md` (this page) |
<!-- layout-audit:ignore-end -->

Also that day: `node_modules/` (10,042 files, committed by mistake) was untracked and is now
gitignored at every depth. Rebuild with `npm ci` at the root and `cd gates && npm ci`.

---

## Adding something new

1. **Not at the root.** The root is pinned; the layout test fails on a new tracked entry there.
2. Code the service runs → an allowlisted path (`server/`, `orchestrator/`, `explainer-videos/`,
   `prompts/`). Anywhere else never reaches production.
3. Render output → under `media/`, and gitignore it. Authored material → `content/`.
4. A script built from `__dirname` / `Path(__file__)` → count the levels to the repo root and
   name them (`path.join(__dirname, '..', '..')`, `Path(__file__).resolve().parents[2]`). Depth is
   what broke on 2026-09-28, not location.
5. A new top-level folder, or a moved one → update this page and `ROOT_DIRS` / `MOVED_DIRS` in
   `orchestrator/test-layout.js` in the same change.

## Known and left alone

- `media/drawing-room-video/drawing-room-remotion` is a mode-160000 gitlink with **no `.gitmodules`
  and an empty checkout**; `git submodule status` errors. Paths inside it have never resolved here.
- About 99 lines name `C:\Users\Aroma Tahir\...` — another machine. Dead before the move; the layout
  test counts them and does not fail on them.
