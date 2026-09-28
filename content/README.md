---
type: reference
last_verified: 2026-09-28
owner: aroma
---

# content/ — authored material, and the legacy pipeline's working state

Nothing here reaches production. Two kinds of folder live side by side:

**Authored — edit these by hand**

| Folder | What it is |
|--|--|
| `assignments/` | Session assignments (PDF/HTML); `node content/assignments/html_to_pdf.js in.html out.pdf` renders one |
| `video_scripts/` | Legacy long-form scripts, pre-explainer |
| `session-bundles/` | Packaged session deliverables, e.g. `agentic-ai-mastery-session1/` |
| `templates/` | `REVIEW_LOG_template.md`, used by the reviewer-gated pipeline (`.claude/standards/REVIEWER_GATED_PIPELINE.md`). Not the explainer templates — those are in `.claude/skills/creating-explainer-videos/templates/` |
| `planning/` | The original May 2026 spec. Historical: it describes the layout that was planned, not the one that shipped |
| `memory/` | A pointer stub. The real memory store is `.claude/memories/` |

**Pipeline state — written by `legacy/python/config.py`**

`drafts/`, `published/`, `review_queue/`, `weekly_artifacts/`. Importing `legacy/python/config.py` creates all four
(`mkdir(exist_ok=True)`), so they appear on first use even on a clean clone. `published/` and
`review_queue/` are gitignored; `drafts/` and `weekly_artifacts/` hold committed history.

If one of these shows up at the **repo root** again, something is still building the old path —
`orchestrator/test-layout.js` §2 fails on it.

Back to the map: [docs/FILE_STRUCTURE.md](../docs/FILE_STRUCTURE.md).
