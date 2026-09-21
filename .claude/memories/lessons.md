---
name: Build Philosophy & Principles
description: Core approach to Drawing Room development — simplicity, measurement, specialization only when justified
type: feedback
---

## Rule: Start Simple, Add Complexity Only When Needed

**What this means:**
- Week 1-2: Single orchestrator + skill modules (no separate worker agents yet)
- Week 2: Inline video processing with ffmpeg; no complex transcoding pipelines
- Week 3: Only if video processing becomes a bottleneck (multi-hour turns) → consider async workers
- Never add: feature flags, backwards compatibility shims, "we might need this later" abstractions

**Why:** Anthropic's agent best practice — simplicity is faster to debug, easier to measure, and clearer to improve. Complexity should be added only after you've proven the simple version works and identified its specific constraints.

**How to apply:**
- Before proposing a new agent or module, ask: "Can the orchestrator handle this with an added skill?"
- Before adding async processing, ask: "Is the current bottleneck documented and quantified?"
- Before adding a feature, ask: "Does it improve quality or speed materially (>10%)?"

---

## Rule: Measure Weekly, Then Decide

**What this means:**
- Run full weekly cycles (Perceive→Plan→Act→Observe→Reflect)
- At end of each week, generate content_health_table.md with keep/rebuild/kill decisions
- Use explicit metrics: assignment pass rate, video completion rate, teacher confidence, cost per unit
- Do NOT ship changes without measuring their effect on prior cycle outcomes

**Why:** Without measurement, iteration is guessing. Weekly cycles give fast feedback loops (1 week = clear signal).

**How to apply:**
- ContentReflectSkill runs every Friday and fills content_health_table.md
- If a rebuilt unit's pass rate improves <5%, revisit the rebuild strategy
- If cost per session exceeds $50, implement throttling (reduce video quality or clip count)
- Carry unresolved units forward with priority labels; don't abandon

---

## Rule: Specialize Only If Quality or Speed Improves Materially

**What this means:**
- Keep planning, drafting, and assignment logic in orchestrator
- Move to a separate agent only if:
  - It reduces delivery time by >20% (e.g., parallel video processing)
  - Quality for that task is consistently <70% (needs a specialized model)
  - Failure in that task cascades to others (isolation needed)
- Do NOT specialize for cleanliness or "separation of concerns" alone

**Why:** Orchestrator state management is simpler than distributed agents. Multi-agent systems introduce async bugs, coordination overhead, and harder debugging. Specialize only when single-agent hits a real wall.

**How to apply:**
- Video processing (transcode, segment, edit) → likely needs workers (parallelizable, compute-heavy)
- Planning and content generation → stay in orchestrator (interdependent, low compute)
- If orchestrator call latency hits 5+ minutes → add async workers to video pipeline

---

## Rule: No Half-Finished Implementations

**What this means:**
- Code shipping to production must be measurable and complete for its scope
- If assignment evaluation is <70% accurate, don't ship it; rebuild or defer to next cycle
- If video QA pipeline flags >20% false positives, don't publish those flags; improve or disable gate
- Incomplete = risky (silent failures, misleading metrics, rework down the line)

**Why:** Half-finished features hide problems. Better to defer a feature than ship something that looks ready but isn't.

**How to apply:**
- Before Week 2 ships, verify all agents meet their pass criteria on eval dataset
- Before Week 3 ships, run on 2 live sessions; don't publish results from 1
- Before Week 4 ships, run reflect cycle and validate keep/rebuild/kill logic on real outcomes

---

## Rule: Gates Are Non-Negotiable

**What this means:**
The weekly loop has 5 gates. If a gate misses deadline:
- Mark `loop_blocked`
- Publish minimum viable learner package (essential edit only, no clips)
- Escalate to Aroma + course lead for decision: extend week or defer feature
- Carry unresolved units to next cycle with high priority

**Why:** Predictable, transparent failure is better than silent breakage. Gates force conversations about tradeoffs.

**How to apply:**
- Perceive gate (Monday): New signals or explicit "no new signals" log → failure = no plan
- Plan gate (Monday EOD): Content units mapped to signals → failure = no act target
- Act gate (Wednesday): Learner + instructor packs exist → failure = no review
- Observe gate (after session): Learner publishing bundle complete → failure = no publish
- Reflect gate (Friday): Each unit tagged keep/rebuild/kill → failure = loop stalls

---

## Rule: Log All Decisions

**What this means:**
- Every keep/rebuild/kill decision includes rationale (logged in ContentHealthRecord.decision_rationale)
- Every gate success or failure is logged with timestamp
- Every instructor debrief and signal is timestamped and attributed
- No decision is made in a Slack message or verbal only — it goes in the logs

**Why:** Aroma needs to audit and learn. Undocumented decisions = impossible to improve.

**How to apply:**
- ContentReflectSkill emits decision logs: `decision_log/week-W-YYYY.md` with each unit's rationale
- Aroma's approval on flagged assets goes in decision_log with her name + timestamp
- Rebuilds reference prior cycle's decision; include improvement hypothesis
