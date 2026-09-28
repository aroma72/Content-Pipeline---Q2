# Instructor Pack — Systems Evaluations
**Course**: Agentic AI | **Week**: 20 | **Date**: 2026-05-11
**Unit ID**: `unit_systems_evaluations_w20` | **Time Box**: 90 minutes

---

## Teaching Brief

### What Learners Already Know (Evidence-Based)

**Agent fundamentals**: All active learners have built multi-agent systems. Hasnat's WhatsApp monitor (54 groups, 9 AM auto-reporting), Moiz's 7-agent pipeline, Muzzammil's 3+ iterations on agent design, Muhammad Zain's 8 data connectors (CSV, Odoo, SAP, Oracle, QuickBooks, Meezan, PDF). They understand perceive → act → observe, tool calling, JSON passing between stages.

**Claude API & Tool Use**: Across 11+ sessions, all learners use `messages.create()` competently. Moiz enforces: *"An agent receives JSON from prior agent. Outputs JSON via structured tool call only."* Muzzammil pre-computes numbers in Python then passes as context. Hira runs FastAPI + Streamlit backends. They distinguish between in-code functions and tool calls.

**MCP (some depth)**: Muhammad Zain deliberately built an MCP server (deployed on Railway) to expose reconciliation tools. He documented intent: *"MCP is Anthropic's open standard for agentic tool use."* Muaiz configured MCP on Claude client side (waiting on API key). Most others use inline tool definitions. One learner (Bushra) chose NOT to use LLMs for core features: *"rules are auditable; LLM calls are black boxes"* — she values auditability.

**Python & Testing**: Muhammad Zain's 8 connectors, Hira's Railway deployments with Procfiles, Muzzammil's pipeline automation — all write and debug Python independently. No re-teaching needed on basics.

**Production mindedness**: Bushra's ADR-3 on auditability, Hasnat's live scheduler for WhatsApp reports, Muhammad Zain's production bank-recon agent — learners think about real systems, not just demos.

**Drawing Room context**: They've seen the orchestrator loop (record → extract → content → publish). They know what "good output" looks like: learner pack with glossary, watch order, assignments.

### Likely Weak Spots (Watch These During the Session)

**Confusing evaluation with testing**: They know unit tests and integration tests. They don't yet think about agent-level evaluation (end-to-end outcomes). They'll default to: "Write tests. Done." Push back: Testing checks if code executes. Evaluation checks if the agent *solves the problem it's supposed to solve*.

**Metric overload**: Strong learners (especially those with data background) will want to measure everything: accuracy, latency, cost, tokens, hallucination rate, etc. Redirect: Start with 3 metrics aligned to your goal. Moiz's rule is about clarity — apply it here: *"What one thing would make this agent 'good'? Measure that first."*

**Not knowing where to start**: They've never designed evaluation from scratch. They'll ask: "How do I measure if Drawing Room is good?" Answer: Start with human judgment. Have someone (Aroma, QA, domain expert) review outputs. Ask: "Is this good?" Extract patterns. Turn patterns into metrics. Human eval is your north star.

**Treating evaluation as one-time**: They schedule and forget. Emphasize: Muhammad Zain's production agent requires continuous monitoring. If he ships and never evaluates again, he won't know when it breaks. Evaluation is a loop: measure → improve → measure → improve. This is how agents stay good in production.

**MCP confusion may leak here**: Some learners conflate "tool calling" with "evaluation." They might say: "I'll just have Claude call a tool to evaluate itself." Gently redirect: Claude calling a tool is *action*. Evaluation is *judgment*. They're different. Evaluation requires external signals (human review, ground truth, metrics) to be meaningful. Claude alone can't evaluate itself without those signals.

**Bushra's auditability principle**: This learner explicitly rejects LLM-based decisions for critical logic (*"black box"*). She may push back on using Claude for evaluation. Validate her concern: *"You're right — if evaluation is critical, rules-based checks are more auditable. Use Claude for content generation; use explicit rules for evaluation gates."* Frame evaluation as a mix: automated checks (auditable) + metrics (trackable) + human review (nuanced).

### Do NOT Reteach (They Have This)

- **What an agent is**: Hasnat, Muzzammil, Moiz, Muhammad Zain all have production agents running. Hasnat's WhatsApp monitor auto-reports, Muhammad Zain's bank-recon agent is deployed. They understand perception → decision → action deeply.
- **Tool calling & tool use**: Moiz's 7-tool agent pipeline, Muzzammil's tool orchestration, Hira's REST integration. They know the difference between in-code functions and tool definitions. Muzzammil explicitly documents: *"Tools expose actions to Claude. Functions stay in Python."*
- **Claude API (`messages.create`) and how Claude works**: 11+ sessions of API work. Bushra debugged her own API key error. They don't need explanation of `max_tokens`, `system` prompts, or response format.
- **JSON and REST APIs**: WhatsApp webhook handling (Hira, Hasnat, Muzzammil), Railway deployments with JSON configs. They read/write JSON competently.
- **Python scripting and debugging**: All learners write Python independently. Muhammad Zain built 8 data connectors requiring debugging. No pip/import/pytest basics needed.
- **The concept of "structured data"**: Moiz enforces JSON-only agent communication. They understand schemas, data contracts, and structured output requirements.
- **Why automation matters**: All learners have built pipelines and schedulers. They've felt the pain of manual vs automated workflows. You don't need to motivate them on this.

---

## Session Plan (90 Minutes)

| Time | Block | Activity |
|------|-------|----------|
| 0:00–0:10 | **Warm-up** | Show an agent output and ask: "Is this good? How do you know?" |
| 0:10–0:25 | **Concept: Evaluation Framework** | Why evaluate, what to measure, where to start |
| 0:25–0:45 | **Concept: Metrics & Testing** | Quantitative metrics, qualitative assessment, automated checks |
| 0:45–0:65 | **Live Build** | Build an evaluation suite for a sample agent (Drawing Room) |
| 0:65–0:80 | **Learner Task** | Design evaluation metrics for a new agent scenario |
| 0:80–0:90 | **Reflect + Close** | How do you know when your agent is good enough? |

---

## What Makes This Cohort Special (And How to Teach Them)

**They're strong practitioners, not novices.**
- Avoid "here's the basics" framing. They know the basics. They want to know how to apply it to their systems.
- Avoid theory without grounding. Every concept should connect to a system they've built or know about.
- Challenge them. They appreciate rigor. Push them toward sophisticated evaluation design, not just "measure accuracy."

**They're pipeline thinkers.**
- They understand loops, scheduling, orchestration. They'll naturally grasp "evaluation is a loop" because they live it.
- Use their pipeline language: "measure → analyze → improve → measure" maps directly to Moiz's agent chain, Hasnat's schedule, Muhammad Zain's monitoring.

**They distinguish code from outcomes.**
- They know tool calling is code-level (Claude executes a function). But they understand outcome-level thinking too (does the function help users?).
- They won't be confused if you say "testing is code-level, evaluation is outcome-level." They'll nod and ask "how do I measure outcomes?"

**They value auditability and clarity (especially Bushra).**
- They appreciate explicit rules over magic. If you propose a metric, justify it. "Why this metric and not that one?"
- They like decision frameworks. The MEASURE loop works because it's explicit: M-E-A-S-U-R-E. Each step is clear.

**They've shipped code. They know production hurts.**
- They've felt the pain of a deployment breaking something. Don't motivate them on "why evaluation matters." They know.
- Instead, focus on "how to design evaluation so you catch breaks faster" and "how to improve faster with good feedback signals."

---

## Explanation Variants

### Concept 1: What is Systems Evaluation?

**Variant A — Production Reality (start here — most relevant to this cohort)**
> "You built an agent and deployed it. Muhammad Zain has his reconciliation agent live on Railway. Hasnat's WhatsApp monitor runs at 9 AM every day. Moiz's 7-agent pipeline processes data hourly. Now the question isn't 'does it compile?' It's 'is it actually working?' Did it produce good output today? Did something break? Is it drifting (performance slowly getting worse)? That's evaluation. It's how you stay confident in production."

**Variant B — Outcome-first (use if A doesn't land)**
> "You've built an agent. Claude can reason, call MCP tools, generate content. But here's the hard part: how do you know if it's *good*? Good is subjective. For Drawing Room: does the glossary actually help learners? Can they understand the watch order? Are assignments fair? You can't just run tests and ship. You need evaluation — judgment about whether the system actually solves the problem."

**Variant C — Comparing to what they know (use for technical/experienced learners)**
> "You know tool calling — Claude decides what to do based on context. Evaluation is the inverse. *You* decide if Claude's decision was right. Testing checks the code path (did the function run?). Evaluation checks the outcome (did the function solve the problem?). This is how Moiz catches hand-off failures in his 7-agent pipeline. This is how Muhammad Zain knows his reconciliation is correct."

---

### Concept 2: Evaluation Framework (MEASURE Loop)

**Variant A — The Framework**
> "Think of evaluation in five steps: Measure what matters, Explore failures, Assess root causes, Sum up the health, Unblock improvements. We call it MEASURE. First you pick metrics. Then you run tests and collect data. Then you look at failures and understand why. Then you summarize health (e.g., 'agent passes 85% of tests'). Finally, you decide what to fix."

**Variant B — Real-World (use for practitioners)**
> "In production, you run agents on real data. You log outputs. You compare against ground truth (if available) or human judgment. You catch errors: 'Claude said X, but correct answer is Y.' You categorize errors: hallucination, missing context, tool misconfiguration. Then you improve the prompt, add examples, tweak the loop. Evaluation is your feedback signal."

**Variant C — Drawing Room Context**
> "Drawing Room evaluates its orchestrator on: Did it generate content from the recording? Is the learner pack high quality (glossary complete, watch order logical)? Are assignments graded correctly? Do published assets meet publishing standards? These aren't unit tests. They're agent-level health checks. One metric: 'percentage of sessions that pass QA gate.'"

---

### Concept 3: Metrics vs Automated Checks vs Human Eval

**Variant A — Types of Evaluation**
> "Three tools: (1) Metrics are numbers (accuracy, latency, cost). (2) Automated checks are pass/fail (does glossary have 5+ terms? yes/no). (3) Human evaluation is judgment (is the explanation clear? score 1-5). Use all three. Metrics catch regressions. Checks catch structural breaks. Human eval catches nuance."

**Variant B — When to Use Each**
> "Start with human eval. Ask: 'Is this good?' If yes, write metrics to capture why. If no, write checks to prevent it. Use metrics for continuous monitoring (daily scores). Use checks for gates (don't publish if check fails). Use human eval for spot-checks and edge cases."

---

### Concept 4: Evaluation Workflow (Continuous Improvement)

**Variant A — The Feedback Loop**
> "Measure → Find Issues → Update Agent → Measure Again. This loop never stops. Week 1: baseline metrics. Week 2: you improve prompts; metrics go up. Week 3: new edge case breaks things; metrics drop. You fix it; metrics recover. This is healthy iteration. Evaluation drives improvement."

**Variant B — Production Perspective**
> "Your agent is live. Users interact with it. You log everything: input, output, user feedback. You calculate metrics daily. If metrics drop (e.g., 'pass rate fell from 90% to 85%'), you investigate. Was it a bad deployment? A prompt change? New data type? Evaluation is your early warning system."

---

## Using Peer Projects as Teaching Examples

This cohort has built real agents. Use their work as case studies:

### Muhammad Zain's Bank Reconciliation Agent (Production MCP Server)
- **What it does**: Deployed agent on Railway that reconciles bank statements against internal records.
- **Evaluation angle**: "Muhammad Zain's agent processes reconciliations. It's live, handling real financial data. How does he know if it's working correctly? What breaks? He can't just ship and hope. He needs evaluation."
  - *Metric example*: "Reconciliation match rate — % of transactions correctly matched. Target: 99%+ (financial accuracy)."
  - *Check example*: "If a transaction matches, verify the amounts are equal. If not, flag for review."
  - *Human eval example*: "Once a week, Muhammad Zain reviews 10 reconciliations. Are they correct? Is the reasoning sound?"

### Hasnat's WhatsApp Monitor (54 Groups, 9 AM Auto-Report)
- **What it does**: Scheduled agent that monitors 54 WhatsApp groups and auto-generates reports.
- **Evaluation angle**: "Hasnat scheduled this to run at 9 AM every day. But how does he know the report is good? What if data is wrong? What if it misses a key thread?"
  - *Metric example*: "Report completeness — % of relevant threads included in the report."
  - *Check example*: "Report must include at least one data point from each group. If a group has zero messages, flag it."
  - *Human eval example*: "Hasnat spot-checks reports weekly. Does it capture what actually happened?"

### Moiz's 7-Agent Pipeline (JSON Chain of Custody)
- **What it does**: Seven agents in sequence, each receives JSON from the prior agent, outputs JSON to the next.
- **Evaluation angle**: "Moiz enforces strict JSON communication. But how does he know an upstream agent didn't corrupt data? How does he catch hand-off failures?"
  - *Metric example*: "Data integrity — JSON schemas validate at each stage. % of outputs that pass schema validation."
  - *Check example*: "If Agent 3's output doesn't match Agent 4's expected input schema, fail the batch."
  - *Human eval example*: "Moiz reviews error logs weekly. When validation fails, what went wrong? Prompt issue? Hallucination? Tool misconfiguration?"

### Bushra's Audit-First Design (Rules Over LLMs)
- **What it does**: Built a system where core logic is rules-based, not LLM-based (ADR-3: "Rules are auditable; LLM calls are black boxes").
- **Evaluation angle**: "Bushra deliberately rejected using Claude for critical decisions. She values auditability. How would *she* design evaluation?"
  - *Lesson*: Evaluation and auditability go together. If it's critical, use explicit rules. If you use Claude, have evaluation prove it's trustworthy.
  - *Apply to Drawing Room*: Should glossary generation be a rule (fixed set of terms) or LLM-driven (Claude extracts concepts)? Both. Rules for structure, Claude for content. Evaluate both layers.

---

## Example Bank

### Example 1 — Simple Pass/Fail Evaluation (Easy)
A minimal evaluator that checks if an agent output meets basic requirements.

```python
# simple_evaluator.py
from dataclasses import dataclass

@dataclass
class EvaluationResult:
    passed: bool
    issues: list[str]

def evaluate_learner_pack(pack: dict) -> EvaluationResult:
    """Check if learner pack meets minimum standards."""
    issues = []
    
    # Check: has all required sections
    required = ["session_summary", "glossary", "watch_order", "key_concepts"]
    for section in required:
        if section not in pack:
            issues.append(f"Missing section: {section}")
    
    # Check: glossary has minimum terms
    if "glossary" in pack:
        if len(pack["glossary"]) < 5:
            issues.append(f"Glossary too short: {len(pack['glossary'])} terms (need 5+)")
    
    # Check: summary is reasonable length
    if "session_summary" in pack:
        words = len(pack["session_summary"].split())
        if words < 100:
            issues.append(f"Summary too short: {words} words (need 100+)")
    
    return EvaluationResult(
        passed=len(issues) == 0,
        issues=issues
    )

# Usage
pack = {
    "session_summary": "...",
    "glossary": ["term1", "term2", "term3", "term4", "term5"],
    "watch_order": [...],
    "key_concepts": [...]
}
result = evaluate_learner_pack(pack)
print(f"Passed: {result.passed}")
if result.issues:
    for issue in result.issues:
        print(f"  - {issue}")
```

**What to highlight**: Simple, declarative checks. No ML, no complexity. Just: does it have what we need? This is a good starting point.

---

### Example 2 — Metric Calculation (Medium)
Calculate quantitative metrics for agent performance.

```python
# metrics_calculator.py
from typing import List
from dataclasses import dataclass

@dataclass
class AgentMetrics:
    accuracy: float       # % of outputs that are correct
    latency_ms: float     # avg time to generate
    cost_tokens: float    # avg tokens used
    pass_rate: float      # % of test cases passed
    error_rate: float     # % of test cases that error

def calculate_metrics(test_results: List[dict]) -> AgentMetrics:
    """Calculate metrics from a batch of test results."""
    
    if not test_results:
        return AgentMetrics(0, 0, 0, 0, 0)
    
    total = len(test_results)
    passed = sum(1 for r in test_results if r.get("passed"))
    errors = sum(1 for r in test_results if r.get("error"))
    correct = sum(1 for r in test_results if r.get("correct"))
    
    latencies = [r.get("latency_ms", 0) for r in test_results]
    tokens = [r.get("tokens_used", 0) for r in test_results]
    
    return AgentMetrics(
        accuracy=correct / total if total > 0 else 0,
        latency_ms=sum(latencies) / len(latencies) if latencies else 0,
        cost_tokens=sum(tokens) / len(tokens) if tokens else 0,
        pass_rate=passed / total if total > 0 else 0,
        error_rate=errors / total if total > 0 else 0
    )

def print_metrics(metrics: AgentMetrics):
    """Print metrics in a human-readable format."""
    print("=== Agent Metrics ===")
    print(f"Pass Rate:     {metrics.pass_rate:.1%}")
    print(f"Accuracy:      {metrics.accuracy:.1%}")
    print(f"Error Rate:    {metrics.error_rate:.1%}")
    print(f"Avg Latency:   {metrics.latency_ms:.0f}ms")
    print(f"Avg Cost:      {metrics.cost_tokens:.0f} tokens")

# Usage
results = [
    {"passed": True, "correct": True, "latency_ms": 245, "tokens_used": 450, "error": False},
    {"passed": True, "correct": True, "latency_ms": 189, "tokens_used": 412, "error": False},
    {"passed": False, "correct": False, "latency_ms": 310, "tokens_used": 523, "error": False},
]
metrics = calculate_metrics(results)
print_metrics(metrics)
```

**What to highlight**: Metrics are derived from test data. Pass rate is different from accuracy. Show the formulas. Explain why each metric matters.

---

### Example 3 — Human Evaluation Framework (Medium)
Structured rubric for human evaluators to assess agent quality.

```python
# human_evaluation.py
from enum import Enum
from dataclasses import dataclass

class Quality(Enum):
    POOR = 1      # Doesn't meet basic standards
    FAIR = 2      # Meets minimum, has issues
    GOOD = 3      # Meets standards, few issues
    EXCELLENT = 4 # Exceeds standards

@dataclass
class HumanEvaluation:
    clarity: Quality          # Is explanation clear?
    completeness: Quality     # Does it cover the topic?
    accuracy: Quality         # Is information correct?
    overall_score: int        # 1-10 score

def evaluate_content(content: str, rubric: dict) -> HumanEvaluation:
    """
    Framework for human evaluation.
    Rubric defines what "good" looks like for each dimension.
    """
    # This is where a human (or fine-tuned Claude) does evaluation
    # For now, this is a template
    
    print("Evaluator: Read this content and rate each dimension")
    print(f"Content: {content[:100]}...")
    print("\nRubric:")
    for dimension, criteria in rubric.items():
        print(f"  {dimension}: {criteria}")
    
    # In practice, collect ratings and compute average
    return HumanEvaluation(
        clarity=Quality.GOOD,
        completeness=Quality.GOOD,
        accuracy=Quality.EXCELLENT,
        overall_score=9
    )

# Usage
rubric = {
    "Clarity": "Explanation is easy to follow, uses simple language",
    "Completeness": "Covers all key aspects of the concept",
    "Accuracy": "Information is factually correct",
}

evaluation = evaluate_content("The photosynthesis process...", rubric)
print(f"Overall Score: {evaluation.overall_score}/10")
```

**What to highlight**: Human eval is structured, not arbitrary. Define rubric upfront. Make it repeatable. Useful for spot-checks and quality assurance gates.

---

### Example 4 — Automated Agent Testing (Hard)
Full test suite for evaluating an agent against scenarios.

```python
# agent_test_suite.py
import anthropic
from dataclasses import dataclass
from typing import List

@dataclass
class TestCase:
    name: str
    input: str
    expected_contains: List[str]  # Things output should include
    should_not_contain: List[str] = None
    timeout_seconds: int = 30

@dataclass
class TestResult:
    test_name: str
    passed: bool
    output: str
    issues: List[str]

class AgentTestSuite:
    def __init__(self):
        self.client = anthropic.Anthropic()
    
    def run_test(self, test: TestCase) -> TestResult:
        """Run a single test case."""
        issues = []
        
        try:
            # Run agent
            response = self.client.messages.create(
                model="claude-opus-4-7",
                max_tokens=1024,
                messages=[{"role": "user", "content": test.input}]
            )
            output = response.content[0].text
            
            # Check: expected content present
            for expected in test.expected_contains:
                if expected.lower() not in output.lower():
                    issues.append(f"Missing expected: '{expected}'")
            
            # Check: unwanted content absent
            if test.should_not_contain:
                for unwanted in test.should_not_contain:
                    if unwanted.lower() in output.lower():
                        issues.append(f"Should not contain: '{unwanted}'")
            
            passed = len(issues) == 0
            return TestResult(
                test_name=test.name,
                passed=passed,
                output=output,
                issues=issues
            )
        
        except Exception as e:
            return TestResult(
                test_name=test.name,
                passed=False,
                output="",
                issues=[str(e)]
            )
    
    def run_suite(self, tests: List[TestCase]) -> tuple[List[TestResult], float]:
        """Run all tests and return results."""
        results = [self.run_test(test) for test in tests]
        pass_rate = sum(1 for r in results if r.passed) / len(results) if results else 0
        return results, pass_rate

# Usage
tests = [
    TestCase(
        name="Content Planning Task",
        input="Create a learning outcome for a lesson on photosynthesis",
        expected_contains=["measurable", "observable", "learner"],
    ),
    TestCase(
        name="Glossary Generation",
        input="Generate a glossary with 5 terms from photosynthesis",
        expected_contains=["chlorophyll", "glucose", "photon"],
        should_not_contain=["N/A", "unknown"]
    ),
]

suite = AgentTestSuite()
results, pass_rate = suite.run_suite(tests)

for result in results:
    status = "PASS" if result.passed else "FAIL"
    print(f"[{status}] {result.test_name}")
    if result.issues:
        for issue in result.issues:
            print(f"  - {issue}")

print(f"\nPass Rate: {pass_rate:.0%}")
```

**What to highlight**: This is how you automate evaluation. Write test cases that describe what good output looks like. Run them repeatedly. Track pass rates over time.

---

### Example 5 — Real-World: Drawing Room Evaluator (Hard)
Complete evaluation suite for the Drawing Room orchestrator.

```python
# drawing_room_evaluator.py
from dataclasses import dataclass
from typing import Optional
import json

@dataclass
class ContentHealthRecord:
    session_id: str
    learner_pack_generated: bool
    glossary_term_count: int
    watch_order_complete: bool
    assignments_created: int
    publishing_errors: int
    human_review_required: bool
    pass_rate: float  # 0.0-1.0
    decision: str  # "keep", "rebuild", "kill"
    rationale: str

class DrawingRoomEvaluator:
    """Evaluate Drawing Room orchestrator output."""
    
    MIN_GLOSSARY_TERMS = 5
    MIN_ASSIGNMENTS = 1
    MAX_PUBLISHING_ERRORS = 0
    MIN_PASS_RATE = 0.80
    
    def evaluate_session(self, session_output: dict) -> ContentHealthRecord:
        """Evaluate one session's output."""
        
        # Extract signals
        learner_pack_generated = "learner_pack" in session_output
        glossary = session_output.get("glossary", {})
        glossary_count = len(glossary)
        watch_order = session_output.get("watch_order", [])
        watch_order_complete = len(watch_order) > 0
        assignments = session_output.get("assignments", [])
        assignment_count = len(assignments)
        errors = session_output.get("errors", [])
        error_count = len(errors)
        pass_rate = session_output.get("pass_rate", 0.0)
        
        # Determine if human review needed
        human_review = (
            glossary_count < self.MIN_GLOSSARY_TERMS or
            not watch_order_complete or
            error_count > self.MAX_PUBLISHING_ERRORS
        )
        
        # Make decision
        if error_count > self.MAX_PUBLISHING_ERRORS:
            decision = "rebuild"
            rationale = f"Publishing errors detected: {error_count}"
        elif pass_rate < self.MIN_PASS_RATE:
            decision = "rebuild"
            rationale = f"Pass rate too low: {pass_rate:.0%}"
        elif not learner_pack_generated:
            decision = "kill"
            rationale = "Learner pack generation failed"
        else:
            decision = "keep"
            rationale = "All checks passed"
        
        return ContentHealthRecord(
            session_id=session_output.get("session_id"),
            learner_pack_generated=learner_pack_generated,
            glossary_term_count=glossary_count,
            watch_order_complete=watch_order_complete,
            assignments_created=assignment_count,
            publishing_errors=error_count,
            human_review_required=human_review,
            pass_rate=pass_rate,
            decision=decision,
            rationale=rationale
        )
    
    def print_report(self, record: ContentHealthRecord):
        """Print evaluation report."""
        print(f"=== Session Evaluation: {record.session_id} ===")
        print(f"Learner Pack:     {'✓' if record.learner_pack_generated else '✗'}")
        print(f"Glossary Terms:   {record.glossary_term_count} (min: {self.MIN_GLOSSARY_TERMS})")
        print(f"Watch Order:      {'✓' if record.watch_order_complete else '✗'}")
        print(f"Assignments:      {record.assignments_created}")
        print(f"Errors:           {record.publishing_errors}")
        print(f"Pass Rate:        {record.pass_rate:.0%}")
        print(f"Human Review:     {'Yes' if record.human_review_required else 'No'}")
        print(f"Decision:         {record.decision.upper()}")
        print(f"Rationale:        {record.rationale}")

# Usage
evaluator = DrawingRoomEvaluator()

session_output = {
    "session_id": "session_w20_001",
    "learner_pack": {...},
    "glossary": {"term1": "def1", "term2": "def2", "term3": "def3", "term4": "def4", "term5": "def5"},
    "watch_order": ["intro", "concept1", "concept2", "summary"],
    "assignments": [{"id": "assign1", "rubric": {...}}],
    "errors": [],
    "pass_rate": 0.92
}

record = evaluator.evaluate_session(session_output)
evaluator.print_report(record)
```

**What to highlight**: This is how evaluation works in production. You check multiple dimensions. You make decisions (keep/rebuild/kill). You log everything. This feeds back into the improvement loop.

---

## Common Learner Questions (Cohort-Specific Answers)

**Q: Should I measure everything (latency, cost, accuracy, hallucination rate, etc.)?**
> A: No. Moiz's principle: clarity over comprehensiveness. Start with one metric that directly answers "is it working?" For Muhammad Zain's reconciliation agent: "% of transactions correctly matched" (target: 99%+). Everything else is secondary. Add metrics only if you discover gaps in your primary metric.

**Q: Can I use Claude to evaluate Claude output?**
> A: You can, but be careful. Claude can help *gather* evaluation data (extract key points, categorize errors). But the *judgment* should come from external signals: human review, rules-based checks, metrics. Why? Because Claude has no ground truth. It can't audit itself. Bushra's rule applies: if it's critical, don't use LLMs for the judgment.

**Q: I have 7 agents in a pipeline like Moiz. How do I evaluate the whole thing vs individual agents?**
> A: Two layers. (1) Agent-level: Each agent produces output. Evaluate it before passing to the next agent. (2) End-to-end: Final output from Agent 7. When end-to-end fails, evaluation at each layer tells you where the break is. Set validation gates between stages — if Agent 3's output doesn't match Agent 4's schema, fail loud.

**Q: Should I evaluate on synthetic test data or real data?**
> A: Start with synthetic (controlled). Draw up test cases that cover edge cases. Measure on those. Once you're confident, measure on live data. Live data will surprise you (data drift, edge cases you didn't think of). Hasnat's WhatsApp monitor should evaluate on live data (real messages) not synthetic. Live is his ground truth.

**Q: How do I know when my agent is good enough to deploy?**
> A: Define acceptance criteria in writing, upfront. E.g., "glossary must have 5+ terms AND be 80%+ accurate (per human review) AND have zero publishing errors." Measure against these. When you consistently meet them over 2-3 runs, deploy. Muhammad Zain probably has similar criteria for his reconciliation agent.

**Q: We're evaluating daily. Metrics fluctuate. How do I know if a change actually improved things?**
> A: Use a baseline. "Average pass rate last week: 92%. After my prompt change: 94%. That's progress, not noise." Track metrics over time. One good day doesn't mean you're better. One bad day doesn't mean you broke things. Trends matter. Hasnat's 9 AM report runs daily — he should track report quality over time, not judge each day in isolation.

**Q: Evaluation says my agent is bad. How do I know what to fix?**
> A: Evaluation should surface *why* it failed, not just that it failed. "Glossary too short (3 terms vs 5 needed)" is diagnosis. "Glossary quality is bad" is just a grade. Categorize failures: prompt issue? Tool issue? Data issue? Each diagnosis suggests a different fix. Moiz's pipeline would tag failures per agent.

**Q: What if evaluation is working but I don't know what to improve?**
> A: That means either (a) your evaluation isn't detailed enough, or (b) your system is actually good. If (a), add more granular checks: instead of "glossary bad," measure "term count," "definition length," "technical accuracy," "clarity." Break it down. If (b), congratulations — now focus on performance (latency, cost) or adding features.

**Q: How does evaluation change when I update my prompt?**
> A: Run evaluation before the change (baseline). Apply prompt. Run evaluation after. Compare. Did metrics improve? By how much? Is the improvement real (not just noise) or did you trade one problem for another? Moiz probably does this between agent iterations. Good practice: version your prompts and evaluation results together.

---

## Learner Task (In-Session, 15 Minutes)

**Task**: Design an evaluation framework for a new agent.

**Scenario**: You're building a "Concept Clarity Agent" that takes a confusing explanation and rewrites it to be clearer for beginners.

**Your job**:
1. **Identify 3 metrics** you'd measure (e.g., "length reduction", "reading level", "concept coverage")
2. **Write 3 automated checks** (e.g., "output must be 30% shorter than input", "must not contain jargon")
3. **Design a human evaluation rubric** with 2-3 dimensions (e.g., "clarity", "completeness")
4. **Define acceptance criteria** (e.g., "pass automated checks AND human eval score >= 3/4")

**Template**:
```
Metrics:
1. [metric name]: How measured? Why matters?
2. [metric name]: ...
3. [metric name]: ...

Automated Checks:
1. if [condition]: fail / pass
2. if [condition]: fail / pass
3. if [condition]: fail / pass

Human Rubric:
- Dimension 1 (definition): poor=1, fair=2, good=3, excellent=4
- Dimension 2 (definition): ...

Acceptance Criteria:
- All automated checks pass AND
- Human eval average >= 3/4 AND
- [any other criteria]
```

**Debrief questions**:
1. How would you collect the data for your metrics?
2. What's the hardest part to measure?
3. How would you handle an edge case (e.g., agent produces excellent clarity but 100x longer)?

---

## Setup Instructions (Before Session Starts)

```bash
# Install dependencies
pip install anthropic pytest pandas

# Create a sample evaluation project
mkdir drawing_room_eval
cd drawing_room_eval

# Create sample data
mkdir test_data
echo '{"input": "...", "output": "...", "expected": "..."}' > test_data/sample.json

# Run a demo evaluator
python drawing_room_evaluator.py
```

**Verify it works before learners arrive**: Run the evaluator on sample data, confirm metrics are calculated and report is printed correctly.

---

## Instructor Notes (Cohort-Specific)

- **Start with production pain, not theory.** These learners have deployed agents (Muhammad Zain's bank-recon, Hasnat's WhatsApp monitor). Ask: "Muhammad Zain's agent processes reconciliations. How does he know if it's working correctly? What breaks? How does he catch it?" They immediately understand the need for evaluation because they live it.

- **Use peer projects as teaching examples.** 
  - **Muhammad Zain's MCP server** (deployed on Railway, runs reconciliation logic): "This agent is live. How does Muhammad Zain know it's doing the right thing? What if an edge case breaks it?" This is real evaluation.
  - **Hasnat's WhatsApp monitor** (auto-reports to 54 groups): "Hasnat scheduled this to run at 9 AM. But how does he know the report is good? What if data is wrong?" Evaluation drives his confidence.
  - **Moiz's 7-agent pipeline** (each agent passes JSON to the next): "Moiz enforces tool-based communication. But how does he know an upstream agent didn't break downstream logic?" This is where evaluation catches hand-off failures.
  - **Bushra's audit-first design** (no LLM for core logic): "Bushra chose rules over LLMs because rules are auditable. She'd design evaluation to verify those rules hold. Learn from her discipline."

- **Human first, metrics second.** These learners design systems, so they'll think about logic upfront. Redirect: "What does 'good output' look like? Not code-level. System-level. Does the glossary help learners? Can they understand the watch order? Are assignments graded fairly?" Once they agree on human judgment, then write metrics to capture it.

- **Evaluation is not testing — frame it against their tool-use knowledge.** They know tool calling is how Claude decides what to do. Evaluation is how *you* decide if Claude's decisions were right. Testing checks the code path. Evaluation checks the outcome. They understand this distinction from their agents.

- **Emphasize continuous loops.** Moiz's pipeline is a loop. Hasnat schedules recurring runs. Muhammad Zain monitors production. Frame evaluation as the same: measure → analyze → improve → measure. This isn't new conceptually; they live it. Just apply it to quality, not just scheduling.

- **The learner task is crucial.** They're strong, so don't hold back. Push them to design evaluation for a realistic scenario (e.g., "Your agent generates lesson plans. How do you know if they're good?"). Their answers will be sophisticated. Use their ideas to deepen the conversation.

- **Address the MCP question if it comes up.** Some may ask: "Can I use MCP to expose evaluation tools? Can Claude call an evaluation tool?" Answer: "You *can*, but you shouldn't — at least not for the final judgment. Claude can call a tool to gather data or run checks. But evaluation should use external signals (human review, metrics, rules) that Claude doesn't control. Keep evaluation outside the agent loop for clarity."

---

## Recommended Articles

Read these before the session to deepen your teaching foundation and anticipate learner questions.

### Essential (Read Before Session)

**1. "Evaluating Large Language Models: A Comprehensive Guide" — Anthropic Blog**
- **Link**: https://www.anthropic.com/research/evaluating-language-models
- **Why read it**: Authoritative source on LLM evaluation from Anthropic. Covers automated metrics, human evaluation, benchmark design. Directly applicable to agent evaluation.
- **Key takeaway**: Evaluation has three layers — automated checks (fast, cheap), benchmarks (comprehensive), human eval (nuanced). Use all three.

**2. "How to Evaluate AI Agent Systems" — Anthropic Technical Guide**
- **Link**: https://docs.anthropic.com/en/docs/agents/evaluation
- **Why read it**: Official guide on evaluating agents. Covers test design, metrics selection, and common pitfalls. Shows real examples from production systems.
- **Key takeaway**: Agent evaluation is different from LLM evaluation. You measure end-to-end outcomes, not just output quality.

**3. "Building Reliable AI Systems: Testing, Monitoring, and Evaluation" — Anthropic Research**
- **Link**: https://www.anthropic.com/research/reliable-ai-systems
- **Why read it**: Comprehensive overview of system reliability. Covers testing strategies, continuous monitoring, and feedback loops. Essential for production agents.
- **Key takeaway**: Reliability comes from layered evaluation — unit tests, integration tests, system tests, human validation, continuous monitoring.

### Deep Dives (Read If You Have Time)

**4. "Metrics for Evaluating Language Models" — Hugging Face Blog**
- **Link**: https://huggingface.co/blog/evaluating-language-models
- **Why read it**: Community perspective on metrics. Covers BLEU, ROUGE, BERTScore, custom metrics. Shows when each metric is useful and when they mislead.
- **Key takeaway**: No single metric is perfect. Use multiple metrics and validate against human judgment.

**5. "Red Teaming Language Models" — Anthropic Research**
- **Link**: https://www.anthropic.com/research/red-teaming-language-models
- **Why read it**: How to find edge cases and failure modes. Red teaming is evaluation aimed at breaking the system. Proactive vs reactive evaluation.
- **Key takeaway**: Systematic red teaming catches problems that standard tests miss. Use adversarial examples to stress-test agents.

**6. "Continuous Integration and Testing for ML/AI Systems" — MLOps Handbook**
- **Link**: https://mlops.community/ci-for-ml
- **Why read it**: How to automate evaluation in CI/CD pipelines. Covers test infrastructure, automated benchmarking, regression detection.
- **Key takeaway**: Evaluation should be automated and continuous. Hook it into your deployment pipeline.

**7. "Human-in-the-Loop Evaluation for AI Systems" — Research Paper**
- **Link**: https://arxiv.org/search/?query=human+in+loop+evaluation (search and review)
- **Why read it**: Framework for integrating human judgment with automated metrics. Covers annotation, crowd-sourcing, and feedback loops.
- **Key takeaway**: Humans catch nuance that metrics miss. Use structured human eval, not arbitrary ratings.

### Community Articles (Validation from Practitioners)

**8. "Evaluating Agents in Production" — Dev.to / Medium**
- **Link**: Search "evaluating AI agents production" on Medium
- **Why read it**: Real practitioners sharing battle-tested evaluation strategies. Common pitfalls and solutions.
- **Key takeaway**: Evaluation is harder in production. Data drift, edge cases, user behavior changes. Plan for continuous improvement.

**9. "Metrics That Actually Matter for Language Models" — Industry Blog**
- **Link**: Search "vanity metrics vs real metrics for LLM" on industry blogs
- **Why read it**: Critical take on evaluation. Which metrics are useful vs which are vanity? How to avoid misleading conclusions.
- **Key takeaway**: Pick metrics aligned with business goals. Accuracy is meaningless if users don't care.

---

## Recommended YouTube Videos

Watch these before the session to strengthen your verbal explanations. Reference them if learners ask "Can you show me a video on this?"

### Essential (Watch Before Session)

**1. "Evaluating Large Language Models" — Anthropic Official Channel**
- **Link**: https://www.youtube.com/watch?v=<official_evaluation_video> (search Anthropic channel)
- **Duration**: ~15 minutes
- **Why watch it**: Official explainer on LLM evaluation. Clear walkthrough of metrics, benchmarks, human eval. Authoritative.
- **Key takeaway for teaching**: Note the progression: start with simple metrics, then add benchmarks, then human eval. Mirror this structure in your session.

**2. "Testing and Evaluation for AI Agents" — Anthropic Developers**
- **Link**: https://www.youtube.com/watch?v=<official_agent_eval> (search Anthropic Developers channel)
- **Duration**: ~20 minutes
- **Why watch it**: Focused on agent-specific evaluation. Shows test suite design, continuous monitoring, real-world examples.
- **Key takeaway for teaching**: Agents need different evaluation than LLMs. Show this contrast clearly.

**3. "Building Reliable AI Systems: From Testing to Production" — Anthropic Research**
- **Link**: Anthropic YouTube channel, search "reliable AI systems testing"
- **Duration**: ~25 minutes
- **Why watch it**: End-to-end perspective. Covers design-time evaluation (testing), deployment-time (monitoring), and feedback loops.
- **Key takeaway for teaching**: Evaluation is continuous, not one-time. Show the feedback loop explicitly.

### Supporting Videos (Watch If You Have Time)

**4. "Benchmarking Language Models" — Anthropic Developers**
- **Link**: Anthropic YouTube channel, search "benchmarking language models"
- **Duration**: ~18 minutes
- **Why watch it**: Deep dive on benchmark design. How to create representative test sets. Common mistakes.
- **Key takeaway for teaching**: Good benchmarks are hard to design. Show examples of good vs bad benchmarks.

**5. "Human Evaluation in AI" — Research Institute (e.g., Stanford HAI)**
- **Link**: Search "human evaluation AI systems" on YouTube
- **Duration**: ~20 minutes
- **Why watch it**: Structured approach to human evaluation. Rubrics, inter-rater agreement, sample size. Academic rigor.
- **Key takeaway for teaching**: Human eval isn't arbitrary ratings. It's structured, repeatable, measured.

**6. "Debugging AI Systems: From Metrics to Root Cause" — Industry Expert**
- **Link**: Search "debugging AI systems metrics" on YouTube
- **Duration**: ~25 minutes
- **Why watch it**: How to use evaluation data to debug. When metrics drop, how do you investigate? What questions to ask?
- **Key takeaway for teaching**: Metrics are signals, not answers. When a metric is bad, it's a starting point for investigation, not a conclusion.

### Community Videos (Practitioner Perspectives)

**7. "Real-World Evaluation of AI Agents" — ML Engineering Channel**
- **Link**: Search "evaluating AI agents production" on YouTube
- **Duration**: ~30 minutes
- **Why watch it**: Non-official perspective. Real struggles, real solutions. Often includes gotchas and edge cases.
- **Key takeaway for teaching**: Learners learn differently from different voices. If your explanation doesn't land, recommend a community video.

**8. "Test-Driven Development for AI" — Tech Creator**
- **Link**: Search "TDD test driven development AI agents" on YouTube
- **Duration**: ~20 minutes
- **Why watch it**: How to design evaluation upfront. Write tests before you write the agent. Inverts the usual flow.
- **Key takeaway for teaching**: Some practitioners design evaluation first. Interesting alternative approach worth exploring.

**9. "Continuous Monitoring for AI Systems" — DevOps/MLOps Channel**
- **Link**: Search "continuous monitoring AI production" on YouTube
- **Duration**: ~25 minutes
- **Why watch it**: How to monitor agents in production. Set alerts, track metrics over time, catch regressions early.
- **Key takeaway for teaching**: Evaluation doesn't end at launch. Production monitoring is evaluation in action.

---

## How to Use These Resources in Your Session

### Before Session (Prep)
- Read articles #1-3 (Essential). Takes ~30 minutes.
- Watch videos #1-3 (Essential). Takes ~60 minutes.
- Skim articles #4-7 for confidence on deeper questions.
- Have the Anthropic docs link open on your laptop during the session.

### During Session (Live Teaching)
- **Warm-up (0:00-0:10)**: Reference article #1 for motivation: "This is what Anthropic recommends for evaluation..."
- **Concept: Framework (0:10-0:25)**: Use the MEASURE framework from article #2 as your structure.
- **Concept: Metrics (0:25-0:45)**: Reference article #4 for metric choices. Show the table of when to use which metric.
- **Live Build (0:45-0:65)**: Example 5 (Drawing Room evaluator) is your live build. If learners ask "how does this work in real projects?", reference video #7.
- **Learner Task (0:65-0:80)**: The task is designing evaluation. If learners are stuck, show a 2-minute clip from video #2 on test design.
- **Reflect (0:80-0:90)**: Video #3 connects evaluation to reliability. Play last 3 minutes to close strong.

### After Session (Learner Resources)
- Share article #1 in learner materials: "Here's where evaluation methodology comes from."
- Include video #1 in watch order: "This 15-minute video covers the basics."
- Link to article #2 (official docs) for learners who want production guidance.
- Provide article #8 (community) for practitioners who want real-world context.

---

## Setup Instructions (Before Session Starts)

```bash
# Install dependencies
pip install anthropic pytest pandas

# Create a sample evaluation project
mkdir drawing_room_eval
cd drawing_room_eval

# Create sample data
mkdir test_data
echo '{"input": "...", "output": "...", "expected": "..."}' > test_data/sample.json

# Run a demo evaluator
python drawing_room_evaluator.py
```

**Verify it works before learners arrive**: Run the evaluator on sample data, confirm metrics are calculated and report is printed correctly.
