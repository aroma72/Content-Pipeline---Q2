# Skill: pipeline-review

Run the **reviewer-gated, human-approved pipeline**: after every production step, an adversarial reviewer checks the output, shares a simple report, and waits for Aroma's approval before the pipeline advances.

Governing standard: `.claude/standards/REVIEWER_GATED_PIPELINE.md` (read it first).

---

## When to use

Any time a video/session is produced through the pipeline. This skill wraps each step with: review → simple report → satisfaction gate → (redo on feedback) → approval → next step.

---

## Procedure (per step)

1. **Init (first step only):** create the Review Log from `templates/REVIEW_LOG_template.md` at
   `video_production/<project>/REVIEW_LOG.md`. Ensure `.beads/content_feedback.jsonl` exists.

2. **Load saved feedback:** read `.beads/content_feedback.jsonl`, keep entries whose `step` matches the
   current step or whose `scope` is `all-future-content`. The output MUST honor these.

3. **Run the step**, then **spawn the Step Reviewer** (use the Agent tool). The reviewer checks the
   three dimensions for this step (AS-SPECIFIED / COMPLETE / HIGH QUALITY) against the governing
   skill/standard from the table in REVIEWER_GATED_PIPELINE.md, plus the loaded feedback. Reviewer
   returns: per-dimension verdict, interventions it made, plain-language feedback.

4. **If the reviewer finds blocking issues**, fix/redo and re-review BEFORE involving Aroma
   (debug to root cause — never paper over).

5. **Append to the Review Log:** findings, interventions (before→after), the simple report, and leave
   the gate decision blank pending Aroma.

6. **Share the SIMPLE report** (exact format in the standard) and ask the gate question via
   `AskUserQuestion`:
   - Header: "Step <n> gate" · Question: "Are you satisfied with this step?"
   - Options: **"Yes — proceed"**, **"No — needs changes"** (Aroma can type specifics via Other/notes).

7. **Gate handling:**
   - **Yes →** record approval + timestamp in the Review Log; advance to the next step.
   - **No →** capture Aroma's exact words. Append to `.beads/content_feedback.jsonl` (schema in the
     standard). If it's a durable rule, also write a `feedback` memory + `MEMORY.md` line. Redo the
     step applying the feedback, re-review (step 3), and re-ask. Repeat until "Yes".

8. After the final step's approval, write `PRODUCTION_SUMMARY.md` + `DELIVERY_MANIFEST.md`,
   log QA to `.beads/qa_ratings.jsonl`, copy the final to `updated/`.

---

## Rules

- **Never advance a step without explicit approval.** One gate per step.
- **Never re-ask a resolved preference** — load and apply `content_feedback.jsonl` every step.
- **Log every reviewer intervention** in the Review Log (before → after).
- Keep reports simple — the standard's card format, no jargon dumps.
- Reviewers are adversarial and skeptical by default.

---

## Outputs

| Artifact | Purpose |
|---|---|
| `video_production/<project>/REVIEW_LOG.md` | Full audit trail of reviewer comments, interventions, gate decisions, feedback |
| `.beads/content_feedback.jsonl` | Persistent feedback store, loaded every step |
| Simple per-step report (in chat) | What Aroma reviews before approving |

*Related: `.claude/standards/REVIEWER_GATED_PIPELINE.md` · `docs/PIPELINE.md`*
