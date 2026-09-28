---
type: reference
last_verified: 2026-09-28
owner: aroma
---

# media/ — render output, and the kits that make it

Nothing here reaches production (`.dockerignore` excludes it). Most of it is gitignored output.
Run every script in here **from the repo root**; the paths inside are root-relative.

| Folder | What it is | Tracked? |
|--|--|--|
| `fashion-tech/avatar`, `broll`, `clean`, `real` | Four talking-avatar experiments (kie.ai lip-sync). Each needs `npm install` first — their `node_modules` are not committed | code yes, output no |
| `avatar-video-kit/` | The reusable avatar kit; `cp -r media/avatar-video-kit/templates <new-folder>` to start one | yes |
| `blender/` | Blender scene scripts, driven by `media/tools/blender-render.js` | yes |
| `tools/` | CLI helpers: Blender render, YouTube transcript/metadata/frames, video and link analysers | yes |
| `drawing-room-video/` | The **legacy** Remotion project (see the trap below) | partly |
| `video_production/` | Legacy per-production folders; `legacy/python/config.py` → `VIDEO_PRODUCTION_DIR` | mostly no |
| `updated/` | Legacy final videos with VO muxed | no |
| `recordings/` | Raw session recordings the legacy pipeline ingests | no |
| `voiceovers/`, `voiceover-windows-formal/` | Generated voiceover audio | no |
| `animation-frames/`, `course-overview-video-output/` | Legacy render output | partly |

New explainer videos do **not** land here — they live in `explainer-videos/<series>/<slug>/`, and
finished ones go to the TU Drive (`docs/SERVICE_DURABILITY_AND_CONTRACTS.md` §4a).

## The trap

`media/drawing-room-video/drawing-room-remotion` is a git **gitlink with no `.gitmodules`** and an
empty checkout. `git submodule status` errors, nothing under `src/` exists on this machine, and any
doc that says "cd into the Remotion project" is describing a checkout you do not have. It predates
the 2026-09-28 reorganisation and is tracked as its own problem.

Back to the map: [docs/FILE_STRUCTURE.md](../docs/FILE_STRUCTURE.md).
