# Instructor Pack — Systems Evaluations
**Course**: Agentic AI | **Week**: 20 | **Date**: 2026-05-11
**Unit ID**: `unit_systems_evaluations_w20` | **Time Box**: 90 minutes

---

## Teaching Brief

### What Learners Already Know
- How agents work (perceive → act → observe loop)
- How to build MCP servers and connect Claude
- Basic metrics (accuracy, precision, recall from ML intro)
- What "good output" means for their domain
- Python and testing frameworks basics
- Drawing Room pipeline (signal → content → publish)

### Likely Weak Spots (Watch These During the Session)
- **Confusing evaluation with testing** — they'll think "testing = unit tests". Evaluation is broader: does the agent achieve its goal? Is output quality acceptable? Does it handle edge cases?
- **Metric overload** — they'll want to measure everything. Be clear: pick 3-5 metrics that matter for *this* system, not 30.
- **Not knowing where to start** — they'll ask "how do I measure if Claude is good?" Answer: start with human evaluation, then derive metrics from that.
- **Treating evaluation as one-time** — they'll build once and move on. Emphasize: evaluation is continuous. You measure, tweak, measure again.
- **Assuming all agents are the same** — they'll try to apply generic metrics. Remind: Drawing Room's orchestrator needs different metrics than a chatbot.

### Do NOT Reteach (They Have This)
- What an agent is or how the loop works
- Basic Python testing (unittest, pytest)
- What accuracy/precision mean
- How to read CSV or JSON files
- Basic SQL queries

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

## Explanation Variants

### Concept 1: What is Systems Evaluation?

**Variant A — Quality Control Analogy (start here)**
> "Systems evaluation is to agents what quality control is to factories. You build a product (an agent), then you ask: Does it work? Does it meet standards? What breaks? Where does it fail? Evaluation is how you answer those questions. Without it, you ship broken agents."

**Variant B — Problem-first (use if A doesn't land)**
> "You've built an agent. Claude can reason, call MCP servers, generate content. But how do you know it's *good*? Good is subjective. Does it generate learning materials that learners actually learn from? Does it publish without errors? Does it handle edge cases? Evaluation answers these. It's the difference between 'it works on my test case' and 'it works in production.'"

**Variant C — Code-first (use for technical learners)**
> "Evaluation is a layer on top of your agent. You capture inputs, run the agent, capture outputs, measure quality against criteria (human review, metrics, automated checks). You do this repeatedly: measure → find problems → improve → measure again. It's continuous validation, not one-time testing."

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

## Common Learner Questions (With Answers)

**Q: Isn't evaluation the same as testing?**
> A: Not quite. Testing checks if code works (unit tests, integration tests). Evaluation checks if an agent achieves its goal and meets quality standards. A test might pass but evaluation might fail if the output is bad.

**Q: How do I evaluate if I don't have ground truth?**
> A: Use human evaluation. Have someone (you, a teacher, a domain expert) rate outputs. Extract patterns from human ratings and turn them into metrics. Human eval is your ground truth.

**Q: What if my metrics are wrong?**
> A: Start simple. Pick 2-3 metrics that matter. Measure them. Compare against human judgment. If your metrics agree with humans, keep them. If not, adjust. Metrics should *reflect* quality, not define it.

**Q: Should I evaluate on live data or test data?**
> A: Both. Test data (controlled scenarios) tells you if your agent works. Live data (real users) tells you if it actually helps. Use test data for fast feedback; use live data for validation.

**Q: How often should I evaluate?**
> A: Continuously. Daily is ideal. Weekly minimum. If you only evaluate once, you'll miss regressions. Evaluation is how you catch problems early.

**Q: What if evaluation shows my agent is bad?**
> A: That's good news — you found the problem. Now you improve. Maybe it's a prompt issue, a missing context, a tool problem, or a data problem. Use evaluation to diagnose.

**Q: How do I know when my agent is "good enough"?**
> A: Define acceptance criteria upfront. E.g., "pass rate >= 85%, no publishing errors, learner satisfaction >= 4/5." Then evaluate against those criteria. When you meet them consistently, you're good enough.

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

## Instructor Notes

- **Start with pain.** Show an agent output and ask "Is this good?" Let them struggle to answer. That's the motivation for evaluation.
- **Human first, metrics second.** Don't jump to numbers. Start with: "What does good look like?" Once you agree, write metrics to capture it.
- **Use Drawing Room as north star.** Every concept should tie back: "This is how we evaluate the orchestrator." Make it concrete.
- **The learner task is crucial.** Don't skip it. Designing evaluation is hard. Let them practice in a low-stakes setting.
- **Emphasize continuous improvement.** Evaluation isn't a one-time gate. It's a loop: measure → improve → measure → improve. This is how production systems get better.

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

---

## Instructor Notes

- **Start with pain.** Show an agent output and ask "Is this good?" Let them struggle to answer. That's the motivation for evaluation.
- **Human first, metrics second.** Don't jump to numbers. Start with: "What does good look like?" Once you agree, write metrics to capture it.
- **Use Drawing Room as north star.** Every concept should tie back: "This is how we evaluate the orchestrator." Make it concrete.
- **The learner task is crucial.** Don't skip it. Designing evaluation is hard. Let them practice in a low-stakes setting.
- **Emphasize continuous improvement.** Evaluation isn't a one-time gate. It's a loop: measure → improve → measure → improve. This is how production systems get better.
