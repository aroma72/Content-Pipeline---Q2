---
type: reference
last_verified: 2026-09-28
owner: aroma
---

# legacy/ — the pre-explainer code

Everything here predates the explainer pipeline and was last changed around May 2026. Nothing ships
in the image. It is kept because some of it still runs, and CI still tests part of it.

| Folder | What it is |
|--|--|
| `python/` | The original Python content pipeline, moved from the root **as one piece** |
| `python/agents/`, `python/skills/`, `python/utils/` | Its workers and API wrappers — moved intact, zero edits |
| `python/checks/` | Nine ad-hoc scripts, formerly `test_*.py` at the root |
| `node/` | Remotion-era render, mux and voiceover scripts |
| `powershell/` | Windows render and voiceover drivers |
| `scratch/` | Debug scratch and dead variants, kept only so history is browsable |

## Running it

**Always from the repo root:** `python legacy/python/main.py --dry-run` (this is what CI runs). The
paths inside these scripts are root-relative, and `agent_memory.json` / `.claude/logs` are read from
the working directory.

## Why `python/` moved whole

Every file in `python/agents/` and `python/skills/` opens with
`sys.path.insert(0, Path(__file__).parent.parent)` — "my grandparent is where `legacy/python/config.py` is".
Moving `legacy/python/config.py`, `legacy/python/logger.py`, `legacy/python/schemas.py` and `legacy/python/memory_manager.py` together with them keeps that
true, so none of those lines changed. Anything that imports `config` must sit **directly** in
`legacy/python/`, beside it.

## The two traps

**Depth, not location, is what breaks.** Here `Path(__file__).parent` is `legacy/python`, not the
repo root. Anything that means "the repo root" is `Path(__file__).resolve().parents[2]` from
`legacy/python/`, and `parents[3]` from `python/checks/` or `python/skills/`. In `node/`, it is
`path.join(__dirname, '..', '..')`. `legacy/python/config.py`'s `BASE_DIR` is the sharpest case: anchored wrong it
silently builds a second `media/` + `content/` tree in here, because its `mkdir` loop never errors.

**`checks/` are not tests, and some spend money.** They were `test_*.py` but are ad-hoc scripts;
`legacy/python/checks/check_claude.py` calls the Anthropic API **at import**, with no `__main__` guard. They are named
`check_*` precisely so a bare `pytest` can never collect them. Run one only on purpose, and never
rename one back to `test_*`.

## What is not installed

Some skills import packages that `requirements.txt` does not list (`reportlab` for the PDF skills,
`gdown` for `session_editor_skill`). `orchestrator/test-layout.js` §12 names them rather than
failing, because they were missing before the move too.

Back to the map: [docs/FILE_STRUCTURE.md](../docs/FILE_STRUCTURE.md).
