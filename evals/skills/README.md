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

## The paid layer (not built)

`claude plugin eval` is Anthropic's first-party runner and the only thing that measures whether a
skill actually changes Claude's behaviour. It was deliberately deferred: it needs this repo wrapped
as a plugin, and every run bills.

To pick it up: add `.claude-plugin/plugin.json`, then `evals/<case>/prompt.md` plus
`evals/<case>/graders/*.md`. Give each case one grader on the result and one on the route:

```yaml
---
type: tool_used
tool: Skill
input_match: '"skill"\s*:\s*"(?:[\w-]+:)?script-lint-preflight"'
---
```

Run it pinned and capped, so a model rollout is not mistaken for a regression:

```bash
claude plugin eval . --trust-plugin --json results.json --threshold 0.8 \
  --model claude-sonnet-5 --judge-model claude-haiku-4-5 --no-publish --max-cost-usd 20
```

A case scoring the same with and without the plugin means the plugin did not cause the pass. Treat
this like any other paid stage in this repo: quote the estimate first, and do not run it without
approval. See the `paid-run-protocol` skill.
