---
type: standards
last_verified: 2026-06-05
owner: Aroma Tahir
---

# Reviewer-Gated Pipeline — Human-Approved, Step-by-Step Production

**Rule (non-negotiable):** Every pipeline step is followed by a **Step Reviewer**. The pipeline does **NOT advance to the next step until Aroma explicitly approves the current step.** No silent progression. No batching steps.

This applies to BOTH pipeline paths (script-driven video and recording-driven session) — see step reviewers below.

---

## What every Step Reviewer checks (3 dimensions)

For the step it guards, the reviewer must confirm all three:

1. **AS-SPECIFIED** — Was the step done *exactly* as defined in the governing skill/standard? (Cite the skill/standard and check each requirement.)
2. **COMPLETE** — Is the output whole? Nothing missing, cut off, truncated, blank, or skipped.
3. **HIGH QUALITY** — Is it genuinely good — not just technically valid? Judge against the goal of the final asset.

A step **cannot be presented as passing** unless all three hold. If any fails, the reviewer fixes it (an "intervention") or flags it for Aroma.

---

## The loop for EVERY step

```
1. Run the step (produce the output).
2. Step Reviewer evaluates: as-specified? complete? high quality?
   - Reviewer loads relevant saved feedback (.beads/content_feedback.jsonl) and checks the output against it.
   - Reviewer may make small corrective interventions; ALL interventions are logged.
3. Reviewer writes its findings to the Review Log artifact (REVIEW_LOG.md).
4. Reviewer shares a SIMPLE report with Aroma (format below) and ASKS: "Are you satisfied with this step?"
5. GATE — wait for Aroma:
   - SATISFIED  -> log approval, advance to next step.
   - NOT SATISFIED -> capture Aroma's feedback, SAVE it to .beads/content_feedback.jsonl
                      (and to memory if it's a durable preference), REDO the step applying the
                      feedback, then return to 2. Repeat until satisfied.
6. Only after explicit approval does the pipeline move to the next step.
```

**Aroma's approval is required at every gate. Never assume it.**

---

## SIMPLE report format (what Aroma sees after each step)

Keep it short. One card per step:

```
─────────────────────────────────────────
STEP <n>/<total>: <Step Name>
─────────────────────────────────────────
✅/⚠️  Status: <Done as specified | Issues found>
📦  Produced: <what + file path>
📏  Checked against: <skill/standard names>
🔍  Result:
     • As specified: ✅/❌  <one line>
     • Complete:     ✅/❌  <one line>
     • Quality:      ✅/❌  <one line>
🛠️  Reviewer interventions: <what the reviewer fixed, or "none">
💬  Reviewer feedback: <2–3 plain-language bullets>
📎  Applied your saved feedback: <which past notes were honored, or "none on file">

👉 Are you satisfied with this step?
   • "yes" → I move to the next step
   • "no, <what to change>" → I redo it and save your note for future content
─────────────────────────────────────────
```

No jargon dumps. Numbers only where they matter (duration, word count, score).

---

## The Review Log artifact (one per video/session)

File: `video_production/<project>/REVIEW_LOG.md` (template in `templates/REVIEW_LOG_template.md`).

It is the single record Aroma can open to see **everything the reviewers did and said**, every gate decision, and every piece of feedback given. The reviewer **appends** to it after each step — it is never overwritten. Sections per step:
- Reviewer findings (3 dimensions)
- Interventions made by the reviewer (with before → after)
- The simple report shown to Aroma
- Aroma's gate decision (approved / changes requested) + verbatim feedback
- Redo iterations (if any), each with what changed

---

## Saving feedback for future content

When Aroma is not satisfied, the reviewer MUST persist the feedback so it is never re-litigated:

- **Always:** append a line to `.beads/content_feedback.jsonl` (schema below).
- **If durable preference** (a rule that should apply to all future content): also write/update a `feedback`-type memory and link it in `MEMORY.md`.
- **At the start of each step**, the reviewer LOADS `content_feedback.jsonl`, filters to entries relevant to that step, and checks the new output against them — so the same correction is never needed twice.

`.beads/content_feedback.jsonl` line schema:
```json
{"timestamp":"<ISO>","project":"<id>","step":"<step name>","output_ref":"<file>","feedback":"<verbatim from Aroma>","interpreted_rule":"<the reusable rule>","scope":"this-video|all-future-content","status":"applied"}
```

---

## Step Reviewers — script-driven video path

| # | Step | Reviewer validates against | Hard-fail (block) conditions |
|---|------|----------------------------|------------------------------|
| 1 | **Script** | `SCRIPTING_STANDARDS.md`, `VIDEO_SCRIPTING_BEST_PRACTICES.md`, duration word-budget | Word count can't be spoken in target seconds; off-topic; missing the required idea/structure; (teaching videos) no single protagonist carried in depth, OR domain-hops/switches characters, OR uses a real colleague's name |
| 2 | **Voiceover** | `VOICEOVER_POLICY.md`, VO pacing feedback | No explicit permission for ElevenLabs; regenerated instead of extracted when extraction was possible; duration > cap; rushed (within-phrase >~6 wps); inaudible; trailing dead air |
| 3 | **Composition (TSX)** | `VIDEO_PRODUCTION_RULES.md` (frame math, SVG safety), visual-audio sync feedback | `durationInFrames` ≠ VO_seconds×30 (±30); text overflow/clipping; on-screen text ≠ VO; "mentor tone"/stage cues rendered on screen; static/boring |
| 4 | **Silent render** | `video-render` skill | Wrong dimensions/fps; duration > cap; blank/black/frozen frames; missing scenes |
| 5 | **Mux** | `audio-mux` skill | Missing `-map` flags → no/near-silent audio; audio stream absent; A/V out of sync; duration > cap |
| 6 | **QA gate** | `QA_RATING_SYSTEM.md` | Combined score < 4.9/7.0; any unaddressed blocking issue |

## Step Reviewers — recording-driven session path

| # | Step | Reviewer validates against | Hard-fail (block) conditions |
|---|------|----------------------------|------------------------------|
| 1 | **Ingest/transcribe** | planning.md pass criteria | WER ≥ 5%; missing speaker segments |
| 2 | **Segmentation** | planning.md, 14-week plan alignment | <85% segments essential; not mapped to objectives |
| 3 | **Essential edit** | planning.md | Instructor approval < 4/5; cuts break continuity |
| 4 | **Micro-clips** | planning.md | Any clip outside 2–4 min; concept incomplete |
| 5 | **Quality gate** | `QA_RATING_SYSTEM.md` | Score < 4.9; privacy/PII leak |
| 6 | **Publish** | git-workflow, LMS contract | Submodule pointer committed before submodule; final not in `updated/` |

---

## Operating notes

- Reviewers are **adversarial** — their job is to catch problems, not to agree. Default to skepticism.
- A step that fails its own reviewer is fixed/redone **before** Aroma is asked — Aroma's gate is about satisfaction with a *passing* output, plus catching anything the reviewer missed.
- Keep the gate question binary and easy: satisfied → proceed; not → say what to change.
- The Review Log is the audit trail; `content_feedback.jsonl` is the learning store. Both are append-only.

*Related: `docs/PIPELINE.md` · `.claude/skills/pipeline-review/SKILL.md` · all standards referenced above.*
