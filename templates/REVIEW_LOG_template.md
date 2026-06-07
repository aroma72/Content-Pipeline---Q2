---
type: reference
last_verified: 2026-06-05
owner: Aroma Tahir
---

# Review Log — <PROJECT NAME>

**Project:** <project id>
**Started:** <date>
**Pipeline:** reviewer-gated, human-approved (see `.claude/standards/REVIEWER_GATED_PIPELINE.md`)
**Status:** in progress

> Append-only audit trail. One block per step. Never overwrite prior entries.

---

## Step <n>: <Step Name>  — <date/time>

**Output produced:** <file path + 1-line description>
**Checked against:** <skill/standard names>

**Reviewer findings**
- As specified: ✅/❌ — <detail>
- Complete: ✅/❌ — <detail>
- Quality: ✅/❌ — <detail>

**Saved feedback applied:** <which entries from content_feedback.jsonl, or "none on file">

**Reviewer interventions** (auto-fixes before showing Aroma)
| # | Issue | Root cause | Before → After |
|---|-------|-----------|----------------|
| 1 | <...> | <...> | <...> |

**Simple report shown to Aroma:**
```
<paste the exact card shown>
```

**Gate decision:** ⬜ Approved · ⬜ Changes requested — <date/time>
**Aroma's feedback (verbatim):** <... or "approved as-is">

**Redo iterations** (if any)
- Iteration 1: <what changed in response to feedback> → re-review verdict
- ...

---

<!-- copy the block above for each subsequent step -->

## Sign-off
- [ ] All steps approved by Aroma
- [ ] Feedback persisted to `.beads/content_feedback.jsonl`
- [ ] Durable preferences written to memory
- [ ] Final delivered to `updated/`
