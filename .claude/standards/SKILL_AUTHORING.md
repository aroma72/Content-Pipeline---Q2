---
type: standard
last_verified: 2026-09-23
owner: aroma
---

# Skill authoring standard

How a skill in `.claude/skills/` must be written so Claude can actually find and use it, and how we
know it still works. Enforced by `evals/skills/run.js`, which runs in `smoke-test.sh` before a push.

This exists because four skills — `audio-mux`, `git-workflow`, `video-render`, `pipeline-review` —
shipped with no `name` or `description` and were invisible to Claude for months, and because
`creating-explainer-videos`, the default pipeline, had a description YAML could not parse. Nothing
caught either one.

## 1. Location and shape

```
.claude/skills/<skill-name>/
├── SKILL.md          required
├── references/       optional, loaded only when SKILL.md links to it
├── scripts/          optional, deterministic helpers
└── assets/           optional, files that appear in output
```

A loose `.md` file directly in `.claude/skills/` **never loads**. It must be a directory with a
`SKILL.md` inside it.

## 2. Frontmatter contract

```yaml
---
name: paid-run-protocol          # must equal the directory name
description: ...                 # what it does AND when to use it
type: skill
last_verified: 2026-09-23
owner: aroma
---
```

| Field | Rule |
|---|---|
| `name` | required · lowercase, digits and single hyphens · ≤64 chars · **must match the directory name** · must not contain `anthropic` or `claude` |
| `description` | required · ≤1024 chars · third person · says what it does **and when to use it** |
| `type` / `last_verified` / `owner` | required by `METADATA_CONTRACT.md` |

### The colon trap

A YAML scalar cannot contain `": "` unless it is quoted. This silently broke four descriptions here:

```yaml
description: Runs the pipeline: a reviewer after each step.   # BROKEN - loads with no description
description: Runs the pipeline - a reviewer after each step.  # fine
description: "Runs the pipeline: a reviewer after each step." # also fine
```

There is no error. The skill simply loads with its heading as the description. Only the eval catches
it.

## 3. Writing the description

Claude sees **only the name and description** when deciding whether to invoke a skill. The body is
loaded afterwards. So the description is the entire trigger surface, and it must carry the words a
person would actually type.

**Pattern:** what it does · when to use it, in the user's words · what it is NOT for.

```
Extracts a voiceover track out of an MP4 and muxes audio into a silent render using ffmpeg.
Use when asked to extract VO, mux audio, add the voiceover back onto a video, or when a
rendered video has no sound. NOT for generating new voiceover - the explainer pipeline uses
Gemini TTS for that.
```

Rules:

- **Third person.** "Extracts...", not "I can extract..." or "You can use this to...".
- **Symptoms, not jargon.** People ask *"why does the cutout look sliced"*, not *"help me tune
  segmentation in lesson.html"*. `animation-motion-design` was undiscoverable until its description
  named the symptom.
- **Put a `NOT for` clause last**, as its own sentence. The eval strips a sentence-initial `NOT`
  clause before scoring, so naming a sibling skill there does not steal its triggers.
- **Do not claim a neighbour's job.** `script-lint-preflight` saying "use while writing" tied it
  with `writing-explainer-scripts` on every drafting query.

## 4. The body

- Under **500 lines**. Split anything longer into `references/`.
- Links to references must be **one level deep** from SKILL.md — Claude partially reads files
  reached through a chain of links, and gets incomplete information.
- Any reference over ~100 lines starts with a table of contents.
- Prefer a bundled script over prose for anything deterministic: the script's code never enters the
  context window, only its output.
- Explain **why**, and cite the incident. A rule with its scar attached survives review; a rule in
  shouted capitals does not.

## 5. Evals come before the body

Per Anthropic's guidance, write the evaluation first, then the minimum instructions that pass it.

1. Add routing cases to `evals/skills/routing.json` — real phrasings a person would type, plus
   **near-miss** negatives. An easy negative tests nothing.
2. Add boundary fixtures to `evals/skills/fixtures/` **in pairs**, one either side of the line, so a
   later change cannot quietly break the other direction.
3. Run `node evals/skills/run.js`.
4. **Break it deliberately and watch it fail.** A check you have never seen go red is not a check.

```bash
node evals/skills/run.js              # all three layers
node evals/skills/run.js --layer=2    # routing only, while iterating
```

Layer 2 grades offline by weighted keyword overlap. It proves a **necessary** condition — that the
description carries the trigger surface — not that the model will fire the skill. Only a live eval
proves that; see `evals/skills/README.md` for the paid option.

## 6. Checklist before you commit a skill

- [ ] Directory name equals `name`
- [ ] Description is third person, says when to use it, has no unquoted `": "`
- [ ] Description names the symptoms a person would actually type
- [ ] `NOT for` clause is a final sentence
- [ ] Body under 500 lines; references one level deep
- [ ] Routing cases added, including a near-miss negative
- [ ] `node evals/skills/run.js` green, and seen failing at least once
- [ ] Listed in `CLAUDE.md` under Skills
