---
type: reference
last_verified: 2026-09-23
owner: aroma
---

# Skill evals

```bash
node evals/skills/run.js              # all three layers
node evals/skills/run.js --layer=2    # one layer, while iterating
```

Exit 0 when everything passes, 1 on any failure. No network, no API keys, no spend. It runs inside
`.claude/scripts/smoke-test.sh`, so a broken skill cannot reach main.

The contract it enforces is written down in `.claude/standards/SKILL_AUTHORING.md`.

## Why it exists

Four skills — `audio-mux`, `git-workflow`, `video-render`, `pipeline-review` — shipped with no
`name` or `description` and were invisible to Claude for months. `creating-explainer-videos`, the
default pipeline, had a description that YAML could not parse because it contained an unquoted
`": "`, so it loaded with its heading as its description. Nothing caught either one: `smoke-test.sh`
checked that frontmatter *existed*, not that it *said anything*.

## The three layers

**Layer 1 — contract.** Every `.claude/skills/*/SKILL.md`: `name` present, matching its directory,
lowercase-hyphen, ≤64 chars, no reserved words; `description` present, ≤1024 chars, third person,
saying when to use it, and **parseable as YAML**; body ≤500 lines; no loose `.md` in
`.claude/skills/`; every relative link resolves and stays one level deep; no two skills sharing a
description. It also asserts that every path CLAUDE.md points at exists — the check that caught five
dead navigation rows.

**Layer 2 — routing.** `routing.json` holds queries a person would really type, each with the skill
that must rank first, plus near-miss negatives that must match nothing. Scored offline by
IDF-weighted, stemmed keyword overlap against each description, with any trailing `NOT for ...`
clause stripped first.

> **What this proves, and what it does not.** It proves a *necessary* condition: the description
> carries the words a matching request would contain. It does **not** prove the model will invoke
> the skill. Only a live eval can show that — see below.

**Layer 3 — gates.** Twelve boundary fixtures run through `orchestrator/lib/validate-beats.js`, in
opposite-signed pairs so a later change cannot quietly break one direction: a child in an art prompt
rejects while an adult passes; a checkpoint with a 10-character `explain` rejects while a
60-character one passes. Then every committed `beats.js` is validated and its error count compared
against `baseline.json`. The assertion is **no unexplained drift**, not zero errors — some of those
folders are known-broken scaffolds, and what matters is that *which* ones are broken does not change
by accident.

## Adding a case

1. A routing query → `routing.json`. Include a near-miss negative; an easy negative tests nothing.
2. A gate boundary → a JSON file in `fixtures/`:

```json
{ "why": "a checkpoint needs a sentence either side",
  "expect_error": "first or last",
  "beats": [ ... ] }
```
Omit `expect_error` to assert the fixture is accepted. Always add the opposite case too.

3. Run it, then **break it deliberately and watch it fail.** A check you have never seen go red is
   not a check.

## Updating the baseline

`baseline.json` is written automatically on the first run and is then authoritative. When a
`beats.js` legitimately changes, delete the file, re-run, and commit the new snapshot **in the same
commit as the change that caused it**, so the diff explains itself.

## The agent layer — `claude plugin eval` (built, costs plan usage)

The free harness proves a description *could* match. This layer proves the skill actually changes
what Claude does. Three cases live in `evals/agent-plugin/evals/`:

| case | asks | must |
|---|---|---|
| `quote-a-paid-run` | cost of a 22-beat lesson with 27s of motion | show the $0.05-per-**second** line and require approval before `--yes` |
| `catch-missing-checkpoint` | "is this beat list ready to render?" | refuse, name the missing CHECKPOINT, flag "Aroma" in narration |
| `exit-zero-is-not-evidence` | "it exited 0 through a pipe, is the guard working?" | refuse, blame the pipe, demand the guard be seen blocking |

Each case pairs a result grader with a `tool_used: Skill` routing grader, so a pass that happened
without the skill firing is visible.

```bash
npm run eval:agent:smoke   # 1 case, 1 run, no baseline - proves the wiring
npm run eval:agent         # full suite with the no-plugin baseline arm
```

### Authentication — there is no token to set

`claude plugin eval` spawns *"a full claude child on your own credential"*. There is no
`ANTHROPIC_API_KEY` and no `apiKeyHelper` configured here, so it runs on the **subscription**. The
CLI still prints a dollar figure, but that is **plan usage, not a bill**. Quote it that way — see
`paid-run-protocol`.

Measured: **~$0.11-equivalent and ~21s per agent run.** The full suite is 3 cases x 3 runs x 2 arms
= 18 runs, so roughly **$2 of plan usage and ~7 minutes**. `--ablation none` halves it but gives no
delta.

### Why the plugin has its own root

A plugin loads skills only from `<plugin root>/skills/`, and a manifest **cannot** point elsewhere —
a `"skills"` key is silently ignored. This repo's root `skills/` is the Python API wrappers, so the
eval plugin lives at `evals/agent-plugin/` and `evals/skills/build-plugin.js` copies `.claude/skills`
into it. The copy is generated, gitignored, and rebuilt on every run so it cannot drift; the script
exits 1 if it ever stages zero skills.

That guard exists because the first attempt staged none: the run still completed and still scored
0.75 off its other graders, reporting only `routing: Skill called 0x`. **A plugin that loads no
skills spends money measuring nothing and looks like a result.** Always check the routing line.

### Two flags that matter

- **`--no-publish`** — publishing the HTML report to claude.ai is the *default*. The npm scripts
  pass `--no-publish`; keep it unless you intend to share the report.
- **`--ablation with-without`** (the default) is what makes the delta meaningful. A case scoring the
  same with and without the plugin was not helped by the plugin.
