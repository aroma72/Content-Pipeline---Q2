---
type: reference
last_verified: 2026-09-21
owner: Aroma Tahir
---

# Harness audit — what is here, and what of it was running

Measured 2026-09-20 against commit `d584618`, by reading the files and running
them, not by reading the documents that describe them. Updated 2026-09-21 with the
QA-threshold fix (§3) and the hook-path fix. Where a claim here says a
thing did not run, that was checked by grepping for every call site.

The short version: this repo's guardrails are real and mostly well built. Three
wiring faults meant a large part of them was not connected to anything. Those are
now fixed; this document records what was found, so the next reader can tell the
difference between a guarantee and a sentence about one.

---

## 1. Persistent state

Five independent mechanisms, which is worth knowing because they are often
mistaken for one.

| # | Mechanism | Where | Written by |
|---|---|---|---|
| 1 | **Tiered session memory (hot/warm/cold)** | `.claude/memories/` + `.claude/memory-db/` | memory hooks, `/memory-distill` — added 2026-09-21 |
| 1b | Claude-harness notes | `~/.claude/projects/E--Content-Pipeline---Q2/memory/` | the harness, per session — now a pointer at (1) |
| 2 | The app's own agent memory | `agent_memory.json` + `memory_manager.py` | `AgentMemoryManager` |
| 3 | Work and quality logs | `.beads/*.jsonl` (7 files) | `spine.js`, `qa.js`, `gates/lib/feedback.js`, and by hand |
| 4 | Job / queue / ledger store | Railway volume `/data/cq-jobs`, else `.jobstore/` | `server/lib/job-store.js` |
| 5 | Per-run resume state | `orchestrator/.runs/<runId>.json` | `orchestrator/lib/state.js` |

### The job store has no hot / warm / cold tiering, and that is deliberate

> **Amended 2026-09-21.** This section is about **job storage**, and its argument stands. Claude's
> *session memory* is a different concern and now **is** tiered — see
> `.claude/standards/MEMORY_TIERS.md`. The two do not conflict: one is about where a single
> durable store landed, the other about how knowledge ages out of a context window.


`server/lib/job-store.js:48-60` resolves **one** directory through a ladder —
`JOB_STORE_DIR` → `RAILWAY_VOLUME_MOUNT_PATH` → repo-local `.jobstore` → OS temp →
memory — and reports which it got. That is a *durability* ladder, not a cache
hierarchy: it describes where the single store landed, not data moving between
levels. `docs/SERVICE_DURABILITY_AND_CONTRACTS.md:59` states the intent plainly —
*"One directory, one write-probe, one durability tier."*

Durability is detected, never asserted: `open()` writes a real `.write-probe`
(`job-store.js:106-110`) rather than trusting that a directory exists, and the
memory fallback makes `POST /courses/build` return 503 rather than accept a spend
it could not record.

Retention exists, and is flat rather than tiered:

| What | Default | Set by |
|---|---|---|
| Idempotency records | 24 hours | `IDEMPOTENCY_TTL_HOURS` (`job-store.js:298`) |
| Terminal jobs (published/failed/rejected) | 7 days | `JOB_STORE_TTL_DAYS` (`job-store.js:239`) |
| Non-terminal jobs — reported stuck, not deleted | 30 days | `JOB_STORE_STUCK_TTL_DAYS` (`job-store.js:240`) |

The TTL runs from the **last transition**, not from creation (`job-store.js:233`) —
a deliberate fix, because a job waiting on a human review is waiting by design.

**The real gap is elsewhere:** no `.beads/*.jsonl` has any rotation, compaction or
size cap. *(Partly addressed 2026-09-21: `mem.py ingest-beads` now reads `failures.jsonl`
into the memory index, filtering the 317 test-fixture rows, so the ledger is at least
consumed rather than only written. It still has no size cap.)* `runs.jsonl` is ~1.5 MB and grows monotonically, and it embeds whole beat
arrays per run. `.beads/README.md` states the append-only rule; nothing states an
end to it.

---

## 2. What was wired to nothing

Each of these shipped, was documented as active, and had no call site.

| Thing | Documented as | Actually |
|---|---|---|
| 4 of 5 hook families | live, across several `.claude/*.md` docs | **never parsed** — see below |
| `qa-checkpoint.js` | CLAUDE.md:95 "Enforced … (fails the build)" | invoked by nothing — now wired |
| `qa-info.js` | `reviewing-explainer-scripts/SKILL.md:47` | invoked by nothing — now wired |
| `qa-frames.js` | `creating-explainer-videos/SKILL.md:49`, which even specifies "after TTS, before compile" | invoked by nothing — now wired, exactly there |
| `.github/hooks/pre-commit` | its own header says to install it | `.git/hooks/` held only `.sample` files — now installed |
| `smoke-test.sh` as pre-push gate | 6 documents call it that | no pre-push hook existed — now created |
| `gates/` (7 LLM gates) | `gates/README.md` | still wired to nothing — see §6 |

### The hook config was structurally invalid

`.claude/settings.json` declared `PreToolUse`, `PostToolUse`, `SessionStart` and
`SessionEnd` as `{"name", "script", "description"}`. Claude Code reads
`{"matcher", "hooks":[{"type":"command","command"}]}`. Only the `Stop` hook had
been written in the supported shape, so only `Stop` had ever fired. Every document
under `.claude/` describing the safety system as live — `HOOKS_REFERENCE.md`,
`QA_HARD_LOCK_SYSTEM.md`, `SAFETY_SYSTEM_VERIFICATION_INDEX.md` and others — was
describing configuration the runtime ignored.

A second hole sat behind it: `PreToolUse` matched `Bash` only, while the primary
shell on the maintainer's machine is the **PowerShell** tool, a different tool
name. Force-push-to-main, staging a dotenv file and the ElevenLabs guard were all
reachable around by using the default shell. The matcher is now `Bash|PowerShell`,
verified by piping synthetic payloads for both names.

### CI was red, and the redness meant nothing

22 of the 40 runs before 2026-09-18 failed, including on `main`. The cause was
`156 passed, 2 failed`, and neither failure was a regression — one asserted an env
var that only exists when `.env` is present, one spawned the `claude` binary, which
no runner has. A permanently red build is worse than no build: it teaches everyone
to stop reading it, which is what happened to the one automated gate that ran on
every push.

Both now skip on a missing prerequisite, using the third outcome
`test-regressions.js:35` already defines for exactly this. A skip is counted
separately, so a suite that has quietly stopped testing stays visible.

### What the unenforced checkpoint rule cost

`qa-checkpoint.js` run across the 55 real `beats.js` files in `explainer-videos/`:
**13 pass, 42 have no checkpoint beat at all.** Every one of the 13 dates from
2026-09-11 or later, so the 42 are a legacy backlog from before the rule rather
than ongoing breakage. They are a backlog decision, not a bug.

---

## 3. Still documented, still unenforced

Fixing the wiring did not fix these. They are listed so nobody mistakes the
sentence for the guarantee.

| Claim | Where | Reality |
|---|---|---|
| Markdown frontmatter is mandatory | CLAUDE.md:105, `METADATA_CONTRACT.md` | `validate-after-write.sh` prints the block then exits 0; `smoke-test.sh` samples only the **first 10** `.md` files and warns |
| Submodule committed FIRST | CLAUDE.md:65 | nothing checks ordering; smoke-test warns on *dirtiness* only |
| SVG viewBox ≥ 850px for 7-node radials | CLAUDE.md:75 | the literal `850` appears in **no code** — only a `session-start.sh` echo |
| `frames = VO_seconds × 30` | CLAUDE.md:69 | `smoke-test.sh:176-207` warns, never fails, and skips entirely when `video_production/voiceovers/` is absent |
| Reviewer comments → `REVIEW_LOG.md` | CLAUDE.md:82, `REVIEWER_GATED_PIPELINE.md` | `grep REVIEW_LOG` across all `.js`/`.py` returns **zero** hits |

### The QA threshold disagreed with itself — fixed 2026-09-21

`orchestrator/lib/stages/qa.js` enforces **4.9** and is the only one that runs — it
recomputes the factor sum rather than trusting the model's arithmetic
(`qa.js:97-101`) and throws `RejectedError` on FAIL.

The full count was worse than five: **4.9 in ~48 statements, 6.0 in ~30, and a
`CONDITIONAL_PASS` band at 4.5 in 5.** And it was not only prose. `qa.js:85` hands the
judge `threshold: 4.9` in its input while the system prompt told it the default was
6.0 and asked for a `CONDITIONAL_PASS` the schema cannot carry — two bars, one model,
every run. The prompt's whole output contract also disagreed with the enforced schema
(it demanded `status`, `minimum_threshold`, `passing_factors`, `remediation_required`,
`timestamps`; it never mentioned `weakest_factor`, which the schema *requires*), and
`llm-cli.js:508` appends that schema to the prompt, so the model received both.

What was done:

- `THRESHOLD`, `FACTORS` and `SCHEMA` are exported from `qa.js` — the single source.
- `prompts/quality_rating.txt` now states 4.9 and no other bar, asks for exactly the
  four fields the schema accepts, documents `weakest_factor`, and no longer tells the
  judge to watch a video it cannot open.
- `skills/quality_rating.py` **deleted** — imported by nothing, defaulted to 6.0, and
  wrote this log in a third incompatible shape that would have crashed its own
  weekly-report function on the existing file.
- `README.md` also listed **seven entirely different factor names** (Concept Clarity,
  Example Relevance, Pacing…) matching nothing in the code. Corrected.
- Four regression checks now assert the prompt, `CLAUDE.md` and `QA_RATING_SYSTEM.md`
  state the number `qa.js` enforces, and that the prompt's fields equal
  `SCHEMA.required`. Negative-tested: reintroducing 6.0, `CONDITIONAL_PASS`, a missing
  `weakest_factor` or a resurrected `minimum_threshold` each fails the suite.

Still open, deliberately: `docs/QA_SYSTEM_OVERVIEW.md` and `docs/QA_QUICK_REFERENCE.md`
score Storytelling by "3+ diverse examples", the rule CLAUDE.md records as **superseded**
by the single-protagonist standard. Same factor name, opposite criterion — a rubric
change for Aroma to make, not a threshold one.

---

## 4. Known failures versus regression guards

`.beads/failures.jsonl` holds 381 lines: 374 are machine crash telemetry, 7 are
curated known-failures with a stated `prevention`. Whether that prevention is a
guard or a sentence:

| Failure | Guard |
|---|---|
| `clips == beats` before compile | **Hard**, twice — `verify.js:70`, `compile-lesson.js:35` |
| ffmpeg mux flags wrong | **Hard** on the current pipeline — `verify.js:53-86` |
| blank slides / frame count vs VO | Warn-only, legacy-only; the new pipeline's `verify.js:87-99` is a hard gate |
| submodule commit order | Warn-only, and on the wrong property (dirtiness, not order) |
| context reset loses work | Structural (`session-start.sh` / `session-end.sh`), not a test |
| SVG text cutoff → viewBox 850px | **None** |
| absolute-positioning overflow | **None** for the Remotion path |
| Remotion render EISDIR | **None** |
| dark-bg art breaks cutout | **Indirect** — cream is forced at generation; nothing verifies the returned image |
| stale `frames/` directory | **None** — `produce.js:55` has `staleVo()` for audio, no equivalent |

The counter-example is `orchestrator/test-regressions.js`: 2,354 lines, 164 named
assertions, each traced to a specific production defect, and it works. Its subject
is the orchestrator spine, not the seven beads failures — so the repo has a strong
regression culture in one half and prose in the other.

Coverage is correspondingly lopsided: 164 + 34 + 29 Node checks against 8 real
pytest tests. All 15 `agents/` modules and 23 of 24 `skills/` modules have none.

---

## 5. Freshness

`CLAUDE.md` carries two freshness stamps that disagree: frontmatter
`last_verified: 2026-06-02` and a footer `*Last updated: 2026-09-18*`.
`session-start.sh:29` reads the frontmatter, so it warned "110 days stale" every
session about a file that was current — the one automated freshness signal in the
repo, firing a false positive until it was ignored.

**Every one of the eight standards docs has a `last_verified` older than its own
last commit.** The field is never updated when the file is edited, and nothing
checks it. `SCRIPTING_STANDARDS.md` is the widest gap — edited 2026-09-17, claiming
2026-06-19.

Skills split cleanly by era: the explainer skills are current (Sept), the legacy
ones (`audio-mux`, `git-workflow`, `video-render`) are from May. But **the words
"legacy" and "deprecated" appear in zero SKILL.md files.** `video-render/SKILL.md`
is 221 lines of Remotion with no banner, and `SKILL_VEO_ANIMATION.md` is a full
guide to a tool CLAUDE.md records as rejected. The only signal is the CLAUDE.md
table. `pipeline-review/SKILL.md` has no frontmatter at all.

---

## 6. Open items, not addressed here

- **`gates/`** — a complete second judging stack (7 steps, prompts, a self-test
  corpus, its own `node_modules`), last touched 2026-06-16, called by nothing, and
  pinned to model ids (`claude-opus-4-8`, `claude-sonnet-4-6`) that predate the
  current lineup, so it would fail on its first call. Revive or retire.
- **`node_modules` is committed** — 4,163 tracked files. `.gitignore:103` covers
  only `fashion-tech-*/node_modules/`, not the root.
- **No `pytest.ini`** — a bare `pytest` from the root collects 9 ad-hoc
  `test_*.py` scripts that fire live API calls at import, two with hardcoded
  absolute paths under a previous machine's home directory. CI avoids this only by
  invoking `pytest tests/` explicitly.
- **24 dead prompt copies** — `skills/` and `agents/` files define
  `_SYSTEM_PROMPT_TEXT` once and never read it. The leading underscore means
  neither the pre-commit hook nor the CI grep sees them, so each is a second copy
  of a prompt `prompts/*.txt` also holds, free to drift.
- **`npm test` writes to tracked logs** — a full run appends ~150 fixture rows
  (`redraft-loop-test`, `obs-proof`, `nq`) to `.beads/runs.jsonl` and
  `.beads/failures.jsonl`, so the metrics spine mixes real runs with test traffic.
- **No golden-file comparison** — `tests/eval_dataset/expected_outputs/` is loaded
  by a `conftest.py` helper that nothing calls. The `session_blind/` held-out set
  named in `tests/README.md:17` does not exist.
- **`src/` does not exist**, though CLAUDE.md's folder table documents it.
- **Python dependencies are unpinned** — all 8 entries use `>=`, no lockfile.

---

## How to re-run this audit

```bash
bash scripts/install-hooks.sh     # hooks into .git/hooks
npm run lint                      # 104 files
npm test                          # 164 + 34 + 29 checks
bash .claude/scripts/smoke-test.sh
git checkout -- .beads/           # drop the fixture rows npm test appends
```
