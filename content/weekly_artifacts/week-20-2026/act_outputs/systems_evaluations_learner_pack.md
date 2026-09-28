# Session Summary — Systems Evaluations
**Course**: Agentic AI | **Week**: 20 | **Date**: 2026-05-11
**Duration**: 90 minutes | **Format**: Lecture + Live Build + Hands-on Lab

---

## Learning Outcomes

By the end of this session, you will be able to:

1. **Define systems evaluation** — understand what it is, why it matters, how it differs from testing
2. **Design an evaluation framework** — pick metrics, write automated checks, create human rubrics
3. **Implement metrics and tests** — write Python code to measure agent quality
4. **Interpret evaluation results** — understand what metrics tell you and when they mislead
5. **Apply evaluation to real agents** — see how Drawing Room uses evaluation to improve quality

---

## Key Concepts

### What is Systems Evaluation?

**Systems Evaluation** — the practice of measuring whether an agent (system) achieves its goals and meets quality standards.

Think of it as quality control for agents. You build an agent, then you ask:
- Does it work?
- Does it meet standards?
- Where does it fail?
- How do you make it better?

Evaluation answers these questions.

### Key Difference from Testing

| Aspect | Testing | Evaluation |
|--------|---------|-----------|
| **What?** | Code works (unit tests, integration tests) | Agent achieves goals (quality, usefulness) |
| **How?** | Run code, check if it breaks | Run agent, measure quality metrics |
| **When?** | During development | During AND after deployment |
| **Scope** | Individual functions | End-to-end agent behavior |
| **Question** | Does the code execute? | Does the output satisfy users? |

### The Evaluation Framework (MEASURE Loop)

1. **Measure** what matters — pick 3-5 key metrics
2. **Explore** failures — collect data, understand errors
3. **Assess** root causes — debug why things went wrong
4. **Sum up** health — calculate pass rates, quality scores
5. **Unblock** improvements — decide what to fix

This loop runs continuously: measure → improve → measure → improve.

### Three Types of Evaluation

1. **Metrics** (quantitative)
   - Numbers: accuracy, latency, cost, pass rate
   - Calculated from test data
   - Good for tracking trends

2. **Automated Checks** (binary)
   - Pass/fail checks: does glossary have 5+ terms? Yes/no
   - Run on every output
   - Good for gates (don't publish if check fails)

3. **Human Evaluation** (qualitative)
   - Expert judgment: is this explanation clear? Rate 1-5
   - Spot-checks and edge cases
   - Good for nuance and validation

Use all three together.

---

## Common Misconceptions

### Misconception 1: Evaluation is the same as testing
**Clarification**: Testing checks if code works. Evaluation checks if an agent achieves its goals. Different scope, different questions.

### Misconception 2: I can evaluate without ground truth
**Clarification**: True. You use human evaluation as ground truth. Have an expert rate outputs. Use those ratings to derive metrics.

### Misconception 3: Metrics are perfect measures of quality
**Clarification**: No metric is perfect. Metrics are proxies. Use multiple metrics. Compare against human judgment. Adjust if they disagree.

### Misconception 4: I evaluate once, then I'm done
**Clarification**: Evaluation is continuous. Measure daily, weekly, always. Catch regressions early. Use evaluation to drive improvement.

### Misconception 5: All agents need the same evaluation
**Clarification**: Wrong. A chatbot needs different evaluation than an orchestrator. Different goals = different metrics. Customize evaluation to your agent.

### Misconception 6: Metrics can be gamed
**Clarification**: Yes. If you optimize for a metric, you might miss the real goal. Always validate metrics against human judgment.

---

## Next Steps (Recommended Watch Order)

1. **Essential Edit** (watch this; ~45 min)
   - Full session recording, core concepts only
   - Explains why evaluation matters, framework, examples
   - You'll understand the "why" before diving into code

2. **Concept Clip: Metrics vs Checks vs Human Eval** (3 min)
   - Quick comparison of three evaluation types
   - Watch if you're confused about when to use each

3. **Concept Clip: Designing Metrics** (4 min)
   - How to pick metrics that actually matter
   - Watch if you're not sure how to start

4. **Concept Clip: Interpreting Results** (3 min)
   - What do metrics tell you? When do they mislead?
   - Watch before you act on evaluation data

5. **Concept Clip: Continuous Improvement** (3 min)
   - How evaluation drives improvement loops
   - Watch to understand the production workflow

6. **Assignment: Design Evaluation Framework** (15 min, in-session)
   - You'll design metrics for a new agent
   - Complete before moving on

---

## Glossary

| Term | Definition | In Context |
|------|-----------|-----------|
| **Evaluation** | Measuring whether an agent achieves its goals and meets quality standards. | "We run evaluation daily to ensure the orchestrator produces high-quality content." |
| **Metric** | A quantitative measure of quality (e.g., accuracy, latency, pass rate). | "Our primary metric is pass_rate: what % of sessions pass the QA gate?" |
| **Automated Check** | A binary pass/fail check run on every output (e.g., glossary has 5+ terms). | "We have a check: if glossary is empty, fail." |
| **Human Evaluation** | Expert judgment of quality, typically on a scale (e.g., 1-5). | "A teacher rated each learner pack 1-5 for clarity. Average was 4.2." |
| **Test Case** | A scenario used to evaluate an agent (input + expected behavior). | "We have 20 test cases covering common agent scenarios." |
| **Pass Rate** | The percentage of test cases the agent passes. | "Agent pass_rate is 92%. That's good." |
| **Latency** | How long the agent takes to respond (usually in seconds or milliseconds). | "Our agent has avg latency of 2.3 seconds per request." |
| **Ground Truth** | The correct/desired output, used to evaluate agent performance. | "We have human-curated learning outcomes as ground truth. Agent performance is measured against these." |
| **Baseline** | A reference performance level to compare against. | "Our baseline pass_rate is 80%. Any improvement above that is progress." |
| **Regression** | A drop in performance metrics (usually unwanted). | "Last week's change caused a regression: pass_rate dropped from 90% to 82%." |
| **Rubric** | A structured framework for human evaluation, defining quality dimensions. | "Our glossary rubric has three dimensions: completeness, clarity, accuracy." |

---

## Session Checklist

**Before the session:**
- [ ] Watch the Essential Edit (45 min)
- [ ] Skim the Glossary above so terms don't surprise you
- [ ] Think: "What would I measure for my agent?"

**During the session:**
- [ ] Follow the live build (don't code ahead; ask if stuck)
- [ ] Ask clarifying questions as they come up
- [ ] Complete the hands-on task (design evaluation framework)

**After the session:**
- [ ] Re-watch the Concept Clips (8 min total) to cement details
- [ ] Try the assignment at home if you didn't finish in session
- [ ] Think: "How would I evaluate Drawing Room?"

---

## Assignment

**Goal**: Design a complete evaluation framework for a new agent.

**Scenario**: You're building an "Explanation Simplifier Agent" that takes complex explanations and rewrites them for beginners.

**What you need to deliver**:

1. **List 3 metrics** (quantitative measures)
   - Example: "clarity_score: how readable is the output (1-10)"
   - For each: explain what it measures and why it matters

2. **Write 3 automated checks** (binary pass/fail rules)
   - Example: "output must be < 80% of input length"
   - For each: state the condition and why it's important

3. **Design a rubric** for human evaluation
   - Dimensions: pick 2-3 (e.g., clarity, correctness, completeness)
   - For each dimension: define poor=1, fair=2, good=3, excellent=4

4. **Set acceptance criteria**
   - When is the agent "good enough"?
   - Example: "Pass all automated checks AND human eval avg >= 3.5/4"

**Submission format**:
```
METRICS:
1. [metric name]: [definition] - [why it matters]
2. [metric name]: ...
3. [metric name]: ...

AUTOMATED CHECKS:
1. if [condition]: pass / fail - [why important]
2. if [condition]: pass / fail - [why important]
3. if [condition]: pass / fail - [why important]

HUMAN RUBRIC:
- [Dimension 1] ([definition]):
  poor (1) = [description]
  fair (2) = [description]
  good (3) = [description]
  excellent (4) = [description]
- [Dimension 2]: ...

ACCEPTANCE CRITERIA:
- [criteria 1]
- [criteria 2]
- [criteria 3]
```

**Stretch goal** (if you finish early):
- Write pseudocode for how you'd implement one of your metrics in Python
- Sketch how you'd visualize evaluation results (e.g., metrics over time)

**Debrief questions** (think about these):
1. How would you collect data for your metrics? (Manual? Automated?)
2. What's the hardest metric to measure?
3. How would you handle an edge case where a metric disagrees with human judgment?

---

## FAQ

**Q: Can I evaluate without human judgment?**  
A: You can start with metrics. But metrics can mislead. Always validate against human eval. Human judgment is your ground truth.

**Q: What if my metrics don't match my intuition?**  
A: That's valuable feedback. Either your metrics are wrong, or your intuition is. Investigate. Maybe the metric captures something you didn't expect.

**Q: How many test cases do I need?**  
A: Start small (10-20). Run them. Categorize failures. Add more test cases to cover failure modes. There's no magic number.

**Q: Can I automate human evaluation?**  
A: Partially. Use Claude with a prompt + rubric. But human eval is still useful for spot-checks, edge cases, and validation.

**Q: What if my agent is too slow?**  
A: Latency is a metric. Track it. If it's a problem, optimize the agent (smaller model, caching, parallel processing) and track improvement.

**Q: How do I compare two agents?**  
A: Evaluate both on the same test set. Compare metrics side-by-side. Also do human eval on a subset. Metrics + human judgment = reliable comparison.

---

## Key Takeaway

**Evaluation is how you know if your agent is good.** Without it, you're flying blind. With it, you get feedback, catch problems early, and improve systematically. Evaluation isn't a one-time gate — it's a continuous loop that drives agent quality.

**In one sentence**: Evaluation = measurement + interpretation + improvement, repeated continuously.

---

**Ready to evaluate agents?** Start with the Essential Edit. Ask questions in the chat. Complete the assignment. You've got this!
