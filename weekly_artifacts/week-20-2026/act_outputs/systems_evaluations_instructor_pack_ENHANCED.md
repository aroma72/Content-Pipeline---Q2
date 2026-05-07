# Instructor Pack — Systems Evaluations (ENHANCED)
**Course**: Agentic AI | **Week**: 20 | **Date**: 2026-05-11  
**Unit ID**: `unit_systems_evaluations_w20` | **Time Box**: 90 minutes  
**Pedagogical Framework**: Scaffolding + TPACK + Project-Based Learning

---

## Learning Objectives (SMART)

By the end of this 90-minute session, learners will:

1. **Define** what systems evaluation means (vs testing) and articulate why it matters for production AI agents
2. **Design** a 3-5 metric evaluation framework for a specific agent use case (not generic)
3. **Build** a hybrid evaluation suite combining automated checks + human review (hands-on code)
4. **Apply** scaffolded thinking: start with human judgment, then derive metrics from that
5. **Reflect** on ethical dimensions: bias, fairness, and documentation in evaluation systems

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

| Issue | Why It Happens | What To Do | Signal to Watch |
|-------|---|---|---|
| **Confusing evaluation with testing** | Mental model: "testing = unit tests". Don't know evaluation is broader | Use the Quality Control analogy (Variant A). Show: testing checks code logic; evaluation checks business value | They say "Is this a test?" when you say evaluation |
| **Metric overload** | Fear of missing something. Want perfect visibility | Explicitly say "Pick 3-5 that matter for THIS system. Ignore the rest." Show Drawing Room example | Ask "How many metrics should we track?" and they say "All of them" |
| **Not knowing where to start** | No mental model for evaluation design | Start with human eval first (Slide 8 exercise). Then derive metrics from that | They ask "What metrics do we use?" before knowing what good looks like |
| **Treating evaluation as one-time** | Waterfall thinking: "We test, we ship, done" | Emphasize continuous loop: measure → improve → measure. Show production example | They ask "When do we evaluate?" and expect a single answer |
| **Assuming all agents are the same** | Generic metric thinking | Explicit: "Drawing Room metrics ≠ chatbot metrics ≠ code agent metrics. Design for YOUR system" | They try to apply checklist metrics to new domains |

### Do NOT Reteach (They Have This)
- What an agent is or how the loop works
- Basic Python testing (unittest, pytest)
- What accuracy/precision mean
- How to read CSV or JSON files
- Basic SQL queries

### Pre-Session Checklist
- [ ] Have 2-3 real agent outputs ready (both good and bad examples)
- [ ] Set up code editor for live build segment
- [ ] Print or share the rubric example from Slide 6
- [ ] Prepare 1-2 local case studies from your organization

---

## Pedagogical Scaffolding Strategy

**Goal**: Move learners from abstract ("What is evaluation?") to concrete ("I can design and code it") in 90 minutes.

### Phase 1: Build Mental Model (0:00-0:25)
- **Activation**: Show an agent output. Ask: "Is this good? How do you know?" (forces them to define "good")
- **Anchor**: Quality Control analogy. Evaluation = does the system achieve its goals in production?
- **Concept**: The MEASURE loop (Measure → Explore → Assess → Sum → Unblock)
- **Scaffold**: Give them the framework before examples

### Phase 2: Add Procedural Knowledge (0:25-0:65)
- **Model**: Live code three evaluation approaches (automated check → metric → human eval)
- **Show**: Narrate as you code. "I'm checking if X exists, because Y matters for this system"
- **Reduce Support**: Have them modify one example, then write their own simple check
- **Feedback Loop**: Run code immediately. Show results. Celebrate when it works

### Phase 3: Apply & Reflect (0:65-0:90)
- **Problem**: Design evaluation for Drawing Room orchestrator (real system, not toy)
- **Groups**: Pair learners. One writes checks, one writes metrics. Then swap
- **Monitor**: Circulate. Ask: "Why did you pick this metric? What's your ground truth?"
- **Debrief**: How would you know your evaluation is working? What could go wrong?

---

## Session Plan (90 Minutes)

| Time | Block | Activity | Pedagogical Purpose | What to Watch |
|------|-------|----------|---|---|
| 0:00–0:10 | **Warm-up: Activate Prior Knowledge** | Show agent output. Ask: "Is this good?" Force them to define criteria | Surface misconceptions early. Establish that "good" is subjective without evaluation framework | Are they thinking about code or output quality? |
| 0:10–0:25 | **Concept 1: What is Evaluation?** | Quality Control analogy + MEASURE loop (5 steps) | Build shared mental model. Make evaluation concrete | Do they see it as different from testing? |
| 0:25–0:40 | **Concept 2: Types of Evaluation** | Automated checks, metrics, human eval (when to use each) | Establish that no single method is complete. All three are tools | Do they see tradeoffs? |
| 0:40–0:65 | **Live Build: Code 3 Evaluators** | Model → Minimal check (2 min) → Metric calc (3 min) → Human rubric template (2 min) | Show procedural knowledge. Narrate thinking. Let them see it in action | Are they following the logic? |
| 0:65–0:80 | **Learner Task: Design Rubric** | Pairs. Given scenario, design evaluation for new agent. Code one check + one metric | Transfer. Guided practice with support still present | Are they designing for the system or generic? |
| 0:80–0:90 | **Reflect + Close** | "How do you know when your agent is good enough?" Discuss continuous improvement + ethics | Metacognition. Connect back to learning objectives. Plant the idea of iteration | Do they see evaluation as ongoing? |

---

## Explanation Variants (Multiple Entry Points)

### Concept 1: What is Systems Evaluation?

**Variant A — Quality Control Analogy (start here)**
> "Systems evaluation is to agents what quality control is to factories. You build a product (an agent), then you ask: Does it work? Does it meet standards? What breaks? Where does it fail? Evaluation is how you answer those questions. Without it, you ship broken agents."
>
> **Why it works**: Concrete, relatable, anchors abstract concept in physical world.

**Variant B — Problem-first (use if A doesn't land)**
> "You've built an agent. Claude can reason, call MCP servers, generate content. But how do you know it's *good*? Good is subjective. Does it generate learning materials that learners actually learn from? Does it publish without errors? Does it handle edge cases? Evaluation answers these. It's the difference between 'it works on my test case' and 'it works in production.'"
>
> **Why it works**: Addresses learner pain point. Shows relevance. Practical, not theoretical.

**Variant C — Code-first (use for technical learners)**
> "Evaluation is a layer on top of your agent. You capture inputs, run the agent, capture outputs, measure quality against criteria (human review, metrics, automated checks). You do this repeatedly: measure → find problems → improve → measure again. It's continuous validation, not one-time testing."
>
> **Why it works**: Maps to engineering mindset. Emphasizes iteration and feedback loops.

**Variant D — Ethical angle (use for AI-conscious groups)**
> "When you ship an agent, you're responsible for its behavior. Evaluation means: Is it accurate? Does it treat all users fairly? Can you explain why it made a decision? Does it handle edge cases or fail silently? These aren't technical questions—they're ethical ones. Evaluation is how you verify you're not causing harm."
>
> **Why it works**: Connects to values. Shows evaluation as responsibility, not checkbox.

---

### Concept 2: Evaluation Framework (MEASURE Loop)

**Variant A — The Framework**
> "Think of evaluation in five steps: **M**easure what matters, **E**xplore failures, **A**ssess root causes, **S**um up the health, **U**nblock improvements. We call it MEASURE. First you pick metrics. Then you run tests and collect data. Then you look at failures and understand why. Then you summarize health (e.g., 'agent passes 85% of tests'). Finally, you decide what to fix."
>
> **Teaching tip**: Write MEASURE on board. Let them guess what each letter means before revealing.

**Variant B — Real-World (use for practitioners)**
> "In production, you run agents on real data. You log outputs. You compare against ground truth (if available) or human judgment. You catch errors: 'Claude said X, but correct answer is Y.' You categorize errors: hallucination, missing context, tool misconfiguration. Then you improve the prompt, add examples, tweak the loop. Evaluation is your feedback signal."
>
> **Teaching tip**: Tell a story of a real deployment that failed due to lack of evaluation. Make it concrete.

**Variant C — Drawing Room Context**
> "Drawing Room evaluates its orchestrator on: Did it generate content from the recording? Is the learner pack high quality (glossary complete, watch order logical)? Are assignments graded correctly? Do published assets meet publishing standards? These aren't unit tests. They're agent-level health checks. One metric: 'percentage of sessions that pass QA gate.'"
>
> **Teaching tip**: Show the actual code from orchestrator. Make it real.

---

### Concept 3: Metrics vs Automated Checks vs Human Eval

**Variant A — Types of Evaluation**
> "Three tools: (1) Metrics are numbers (accuracy, latency, cost). (2) Automated checks are pass/fail (does glossary have 5+ terms? yes/no). (3) Human evaluation is judgment (is the explanation clear? score 1-5). Use all three. Metrics catch regressions. Checks catch structural breaks. Human eval catches nuance."

**Variant B — When to Use Each**
> "Start with human eval. Ask: 'Is this good?' If yes, write metrics to capture why. If no, write checks to prevent it. Use metrics for continuous monitoring (daily scores). Use checks for gates (don't publish if check fails). Use human eval for spot-checks and edge cases."
>
> **Teaching tip**: This is the scaffolding order. Always start with human judgment, then operationalize it.

**Variant C — Cost-Benefit**
> "Automated checks are cheap ($0.01 per run, instant). Metrics are medium ($0.1 per calc, requires tooling). Human eval is expensive ($5 per example, slow). But humans catch things metrics miss. So: automate the easy stuff, reserve human time for high-stakes decisions."
>
> **Teaching tip**: Show the cost-quality tradeoff. Helps them make design decisions.

---

### Concept 4: Common Misconceptions (Address These Explicitly)

| Misconception | Reality | How to Correct |
|---|---|---|
| "Evaluation = testing" | Evaluation is broader: tests verify code; evaluation verifies business value | Use quality control analogy. Show: test can pass, but agent could still fail in production |
| "One metric is enough" | Different metrics measure different things. Need 3-5 aligned to actual goals | Example: accuracy alone misses speed. F1 score misses interpretability |
| "Evaluation happens once" | Evaluation is continuous. Measure → improve → measure. Metrics change over time | Show the MEASURE loop. Emphasize: this is not a waterfall |
| "I should measure everything" | Metric overload = slow iteration + distraction. Pick 3-5 that matter most | Exercise: Given an agent, prioritize 5 metrics from a list of 15 |
| "All agents need the same metrics" | Different agents = different metrics. Chatbot ≠ code agent ≠ orchestrator | Compare metrics for 3 different agent types |
| "Human eval is not scientific" | Humans bring context + nuance. Make it reproducible with rubrics + calibration | Show how a rubric (well-designed) makes human eval consistent |

---

## Real-World Case Studies

### Case Study 1: The Silent Failure (Chatbot Agent)
**Setup**: Company deploys a customer support bot. All unit tests pass. Metrics look good (90% success rate).

**The Problem**: User feedback reveals bot is rude, dismissive, and makes up information.

**Why Evaluation Missed It**:
- Metrics only measured "did bot produce output" (not quality)
- No human review of actual responses
- Automated checks only verified structural correctness

**The Fix**:
- Add human eval: sample 50 responses weekly, rate for tone/accuracy
- Add metric: "% of responses with no hallucinations" (spot-checked by humans)
- Add check: "response length reasonable" (prevents truncation)

**Lesson for Learners**: "Your metrics can be green while users are unhappy. Always include human eval."

---

### Case Study 2: The Regression Surprise (Content Generation)
**Setup**: Drawing Room's generator worked well Week 1 (88% pass rate). Week 3, metrics drop to 62%.

**Investigation**:
- No code changes. No prompt changes. What changed?
- Root cause: New training data includes novel topics. Agent struggles with unfamiliar domains.

**Fix**:
- Added domain-specific rubrics (one for each topic type)
- Added check: "glossary includes all terms from recording"
- Now: per-domain metrics (vs single global score)

**Lesson for Learners**: "Evaluation drives discovery. The drop revealed a real gap. Without metrics, you'd ship broken content."

---

### Case Study 3: The Bias Trap (Evaluation System)
**Setup**: Building evaluation metrics for fairness. First metric: "does agent treat users equally?"

**The Trap**: What does "equally" mean?
- Equal time? Equal detail? Equal tone?
- Different users may need different support
- A "fair" metric could enforce unfair outcomes

**The Better Approach**:
- Define fairness explicitly: "Same quality for all demographic groups"
- Test: run agent on stratified sample (age, language, background)
- Measure: score distribution across groups (should be similar)
- Audit: review edge cases manually

**Lesson for Learners**: "Evaluation code is not neutral. It encodes values. Be explicit about what you're measuring and why."

---

## Facilitation Notes (How to Lead This)

### Warm-up (0:00-0:10): Make It Interactive
- **Show output**: Display a real agent response on screen (e.g., a generated glossary entry)
- **Ask**: "Is this good? How would you rate it 1-5?" (force criteria)
- **Listen**: Don't correct immediately. Let them name criteria
- **Synthesize**: "You said: accurate, concise, complete. Those are your evaluation metrics."
- **Insight**: "We just did evaluation without even knowing it. Now let's formalize it."

**If They Struggle**: "Imagine you're a learner. Would you understand this? Would you trust it?"

---

### Concept Block (0:10-0:25): Anchor the Framework
- **Board work**: Write MEASURE on board. 
- **Elicit**: "What's the first step of evaluation?" (don't tell, ask)
- **Build**: Fill in MEASURE together with examples
- **Check**: "Can someone rephrase MEASURE in your own words?"

**If Energy Drops**: Use Case Study 2 (the regression). Make it vivid.

---

### Live Build (0:40-0:65): Narrate Your Thinking
- **Set up**: "We're evaluating a real agent. Drawing Room's glossary generator."
- **Show the code**: Project on screen
- **Talk through**: "I'm writing a check for: does glossary have 5+ terms? Why? Because learners need vocabulary. If it's shorter, it fails."
- **Run it**: Execute code. Show it passing, then failing. Let them see the difference.
- **Invite**: "What other checks would you add?" (solicit their ideas)

**Critical**: Never just paste code. Walk them through the logic.

---

### Learner Task (0:65-0:80): Scaffold Their Work
- **Brief**: "Design evaluation for a new agent: code reviewer. It takes a PR and suggests improvements."
- **Pairs**: "One person writes a check ('PR has comments'), one writes a metric ('% of suggestions accepted by dev'). You'll swap."
- **Circulation**: Walk around. Ask:
  - "Why did you pick that check?"
  - "How would you measure if it's good?"
  - "What would ground truth be?"
- **Debrief**: "Who found this hard? What was confusing?" (surface misconceptions for group discussion)

**If They Get Stuck**: 
- Remind: Start with human eval first. "What would a human do to evaluate this?"
- Then: "OK, how do you operationalize that?"

---

### Closing (0:80-0:90): Connect to Real Work
- **Prompt 1**: "You're deploying your agent Monday. What's one thing you'll measure?"
- **Prompt 2**: "What could go wrong if you don't evaluate?"
- **Prompt 3**: "How will you know if your evaluation system is working?"

**Big idea to leave them with**: "Evaluation is not a one-time step. It's a practice. You measure, you improve, you measure again. Forever. This is how you ship high-quality agents."

---

## Hands-On Exercise Guide (0:65-0:80)

### Exercise: Design an Evaluation Suite for a Code Reviewer Agent

**Scenario**: You're building an agent that reviews Python code and suggests improvements. It's not live yet.

**Your Task** (45 minutes, in pairs):

#### Part 1: Human Evaluation (10 min)
- Read the rubric below
- Evaluate 3 sample code reviews (provided in handout)
- Rate each on: Relevance, Clarity, Actionability (1-4 scale)
- Discuss with partner: What makes a good review?

**Rubric for Code Review Quality**:
| Criterion | Level 4 | Level 3 | Level 2 | Level 1 |
|---|---|---|---|---|
| **Relevance** | All suggestions matter; none are nitpicks | Mostly relevant; 1-2 minor distractions | Some irrelevant suggestions mixed in | Suggestions miss the point |
| **Clarity** | Clear explanation + example code shown | Clear explanation, no example | Vague or jargon-heavy | Confusing or incomplete |
| **Actionability** | Dev can implement immediately | Dev knows what to do | Dev needs to ask for clarification | Dev doesn't know how to fix |

#### Part 2: Design Automated Checks (15 min)
- Write 2 simple checks that verify basic quality
- Example check template:
  ```
  Check 1: Does review suggest at least 1 improvement?
  Check 2: Does review explain why? (not just "this is bad")
  ```
- You write:
  - Check 3: ?
  - Check 4: ?

**Hint**: What would you check to prevent obviously bad reviews?

#### Part 3: Design Metrics (15 min)
- Pick 3 metrics you'd track daily
- For each metric, say: What's the target? (e.g., "85% relevance")
- Example:
  - Metric 1: % of reviews rated "Relevant" by humans (target: 85%+)
  - Metric 2: Avg review length (target: 150-300 words)
  - Metric 3: ?

**Hint**: Think about speed, quality, and consistency.

#### Part 4: Share & Discuss (5 min)
- Each pair shares 1 check and 1 metric
- Group votes: Which are most important?

---

## Assessment Checkpoints (How to Verify Understanding)

### Checkpoint 1: Conceptual Understanding (0:25)
**Ask**: "What's the difference between a unit test and an evaluation?"

**Acceptable Answer**:
- Unit test: Does the code do what it's supposed to?
- Evaluation: Does the system achieve its business goal?
- (or similar—key: they distinguish code-level from system-level)

**If They Say** "Unit tests check correctness, evaluation checks performance": 
- Partly right. Ask: "But what about quality? Is that performance?"

---

### Checkpoint 2: Framework Understanding (0:40)
**Show Code**: A simple evaluation (automated check)

**Ask**: "What's this checking? Why would you check this?"

**Acceptable Answer**: They can point to the logic AND explain the reasoning (not just read code)

---

### Checkpoint 3: Application (0:75)
**Observe the Exercise**: Can they write at least one sensible check or metric?

**Green flag**: They ask "What would a human do first?" (shows scaffolding model is working)

**Red flag**: They jump to metrics without defining what "good" means

---

### Checkpoint 4: Reflection (0:90)
**Ask**: "Is evaluation a one-time step or ongoing?"

**Acceptable Answer**: "Ongoing. You measure, improve, and measure again."

**If they say** "One-time": Reinforce with example. "So you evaluate once and ship. What if users say it's bad?" (surface the problem)

---

## Reflection & Discussion Prompts (Deeper Learning)

Use these to extend thinking beyond the mechanics:

### Prompt 1: Values
"Your evaluation metric is 'response accuracy.' But what if the agent is fast but inaccurate? Which do you optimize for? What does that say about your values?"

**Why it matters**: Makes them see metrics as value-laden, not neutral.

---

### Prompt 2: Bias
"You're evaluating an HR agent (screens resumes). You measure 'time to process.' But what if it's faster because it's discriminating against certain groups? How do you catch that with evaluation?"

**Why it matters**: Introduces ethical dimensions. Evaluation isn't just technical.

---

### Prompt 3: Tradeoffs
"You can afford deep human evaluation OR continuous automated metrics, but not both. Which do you choose for: (a) a support chatbot? (b) a code generator? (c) a recruitment tool?"

**Why it matters**: Shows context matters. Evaluation design is a business decision, not just technical.

---

### Prompt 4: Continuous Improvement
"Your agent's accuracy drops from 90% to 85% over 2 weeks. Same code, same team. What changed? How would you investigate?"

**Why it matters**: Connects evaluation to action. Metrics without investigation are useless.

---

### Prompt 5: Ethical Responsibility
"You ship an evaluation system. It says 'agent is 95% accurate.' Later, users find it gives wrong answers to non-English queries. Why didn't evaluation catch this?"

**Why it matters**: Test sets are biased. Evaluation is only as good as your test data.

---

## Extension Activities (For Advanced Learners)

### Extension 1: Design a Fairness Evaluation
**Task**: Create a rubric that tests if your agent treats different user groups equally (age, language, background, etc.)

**Deliverable**: 
- Definition of "fair" for your use case
- Rubric with 2-3 fairness criteria
- How you'd sample test cases to ensure coverage

**Why**: Moves from generic metrics to values-driven evaluation.

---

### Extension 2: Build a Continuous Evaluation Pipeline
**Task**: Design a system that:
- Logs every agent output
- Collects human feedback on sample outputs (weekly)
- Updates metrics daily
- Alerts if metrics drop below threshold

**Deliverable**: System diagram + pseudocode for the alert logic

**Why**: Real-world evaluation is continuous. Not a one-time check.

---

### Extension 3: Evaluate Your Evaluation
**Task**: "Your evaluation system says the agent is good. How do you know if your evaluation is trustworthy?"

**Hint**: Ask:
- Are your test cases representative?
- Are your human raters calibrated?
- Are you measuring the right things?
- What could you be missing?

**Deliverable**: Checklist: "How to audit an evaluation system"

**Why**: Metacognition. Evaluation itself needs evaluation.

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

**Teaching Point**: "Start simple. Don't build complexity you don't need. A basic checklist catches obvious problems."

**Facilitation**: Have learners name 2-3 checks for their own system. Code together.

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

**Teaching Point**: "Metrics are derived from data. Notice: pass_rate ≠ accuracy. Show formulas explicitly."

**Facilitation**: Ask "What's the difference between pass_rate and accuracy?" (common confusion)

---

### Example 3 — Human Evaluation Framework (Medium)
Structured rubric for human evaluators to assess agent quality.

```python
# human_evaluation.py
from enum import Enum
from dataclasses import dataclass
from typing import Dict, List

class Quality(Enum):
    POOR = 1      # Doesn't meet basic standards
    FAIR = 2      # Meets minimum, has issues
    GOOD = 3      # Meets standards, few issues
    EXCELLENT = 4 # Exceeds standards

@dataclass
class HumanEvaluation:
    clarity: Quality
    completeness: Quality
    accuracy: Quality
    overall_score: int      # 1-10

@dataclass
class EvaluationRubric:
    """Defines what 'good' means for a specific dimension."""
    dimension: str
    levels: Dict[int, str]  # 1: description, 2: description, etc.

# Example rubric
CLARITY_RUBRIC = EvaluationRubric(
    dimension="Clarity",
    levels={
        1: "Confusing, hard to follow, uses unexplained jargon",
        2: "Somewhat clear, but could be simpler or better organized",
        3: "Clear and well-organized, easy to understand",
        4: "Exceptionally clear, well-structured, includes helpful examples"
    }
)

def evaluate_content(content: str, rubric: EvaluationRubric) -> int:
    """
    Human evaluation using a rubric.
    Instructor scores the content 1-4 using the rubric as guide.
    """
    print(f"\n=== Evaluating: {rubric.dimension} ===")
    print(f"Content: {content[:200]}...")
    print("\nRubric (guide for scoring):")
    for level, description in rubric.levels.items():
        print(f"  {level}: {description}")
    
    # In a real system, a human reads this and assigns a score
    # For demo, return placeholder
    score = input("Your rating (1-4): ")
    return int(score)

def calibrate_raters(raters: List[str], sample_content: str, rubric: EvaluationRubric):
    """
    Before evaluating, multiple raters score the same examples.
    Compare their scores. If they differ by >1 level, discuss and align.
    """
    print(f"=== Rater Calibration ===")
    print(f"All raters: evaluate this sample using the {rubric.dimension} rubric")
    print(f"\nSample: {sample_content[:300]}...")
    
    scores = {}
    for rater in raters:
        score = evaluate_content(sample_content, rubric)
        scores[rater] = score
    
    print(f"\n Scores: {scores}")
    disagreement = max(scores.values()) - min(scores.values())
    if disagreement > 1:
        print("⚠️  Large disagreement! Discuss and align before evaluating for real.")
    else:
        print("✓ Good alignment. Proceed to evaluation.")
    
    return scores

# Usage
sample = "The agent generated a summary of neural networks..."
raters = ["Alice", "Bob"]
calibrate_raters(raters, sample, CLARITY_RUBRIC)
```

**Teaching Point**: "Rubrics make human evaluation reproducible. Calibration ensures consistency."

**Facilitation**: "Why calibrate raters? Because humans are subjective. Rubric + calibration makes it objective."

---

## Ethical Considerations (Critical for AI)

### E1: Evaluation Encodes Values
Every metric you choose reflects a value judgment. "Accuracy" assumes correctness matters most. But what if speed or empathy matters more?

**In Practice**: Explicitly name your values. "For this system, we prioritize accuracy over speed because..."

**Exercise**: "For an HR resume screener, what should matter most? Accuracy? Speed? Fairness? Design your metrics to reflect your priority."

---

### E2: Test Sets Are Biased
Your evaluation is only as good as your test data. If your test set doesn't include edge cases, minorities, or unusual scenarios, evaluation will miss failures.

**In Practice**: Stratify your test set. Test on:
- Typical cases (80%)
- Edge cases (10%)
- Underrepresented groups (10%)

**Exercise**: "Your agent is 95% accurate overall, but only 60% accurate for non-English inputs. How do you catch this? (Answer: stratified evaluation.)"

---

### E3: Metric Gaming
If you optimize for a metric, humans will game it. "Maximize response length" → agent writes novels. "Minimize latency" → agent gives wrong answers fast.

**In Practice**: Monitor not just the metric you optimize, but also proxy metrics:
- Optimize: Accuracy
- Monitor: User satisfaction, latency, cost

**Exercise**: "Design 3 metrics for a code reviewer agent. Which could be gamed? How do you prevent it?"

---

### E4: Documentation & Audit Trail
You decide to give an agent a "pass" on evaluation. Why? If you can't explain, you're not being accountable.

**In Practice**: For every decision, log:
- What was measured
- Why
- What the threshold was
- Who decided
- When

**Exercise**: "Create a template for logging evaluation decisions."

---

## Resources & Materials

### Slides
- [Systems_Evaluations_Instructor_Slides_Final.pptx](../Systems_Evaluations_Instructor_Slides_Final.pptx) — 12 slides covering all concepts + exercises
- [Systems_Evaluations_Instructor_Slides_Final.pdf](../Systems_Evaluations_Instructor_Slides_Final.pdf) — Shareable PDF version

### Handouts (Print These)
1. **Rubric Guide**: Template for creating evaluation rubrics (1 page)
2. **Metric Worksheet**: Worksheet to design 3-5 metrics for an agent (1 page)
3. **Check Checklist**: Checklist of common automated checks to consider (1 page)
4. **Ethical Audit**: Prompts for evaluating your evaluation system (1 page)

### Code Examples
- All examples in this pack are executable Python. Have them available for copy-paste during live build.
- Commit to GitHub so learners can pull and modify.

### Further Reading
1. [ACUE: 10 Best Practices for AI Assignments](https://acue.org/resources/blog/unlocking-human-ai-potential-10-best-practices-for-ai-assignments-in-higher-ed/)
2. [The TPACK Framework Explained](https://www.powerschool.com/blog/the-tpack-framework-explained-with-classroom-examples/)
3. [Scaffolding Learning Strategies](https://pce.sandiego.edu/scaffolding-in-education-examples/)
4. [Pedagogical Content Knowledge](https://www.structural-learning.com/post/pedagogical-content-knowledge)

---

## Instructor Self-Evaluation (After the Session)

**Reflect on these after teaching:**

- [ ] Did learners distinguish evaluation from testing? (Check: warm-up answers)
- [ ] Did learners grasp the MEASURE loop? (Check: can they name the 5 steps?)
- [ ] Did learners write at least one meaningful check or metric? (Check: exercise deliverables)
- [ ] Which explanation variant worked best? Which fell flat?
- [ ] Did the live build pace feel right? (Too fast? Too slow?)
- [ ] Which learner got stuck? Why? (Plan scaffolding for next cohort)
- [ ] Did discussion prompts generate good thinking? Which one resonated?
- [ ] What would you change next time?

**Iterate**: Each cohort teaches you what works. Document changes for next time.

---

## Sources & References

**Pedagogical Frameworks**:
- [Integrating AI and Machine Learning in the Classroom](https://www.incompassinged.com/post/practical-strategies-for-integrating-ai-and-machine-learning-into-the-classroom)
- [ACUE: 10 Best Practices for AI Assignments in Higher Ed](https://acue.org/resources/blog/unlocking-human-ai-potential-10-best-practices-for-ai-assignments-in-higher-ed/)
- [The TPACK Framework Explained](https://www.powerschool.com/blog/the-tpack-framework-explained-with-classroom-examples/)
- [Pedagogical Content Knowledge](https://www.structural-learning.com/post/pedagogical-content-knowledge)

**Scaffolding & Learning Design**:
- [7 Scaffolding Learning Strategies for the Classroom](https://pce.sandiego.edu/scaffolding-in-education-examples/)
- [Instructional Scaffolding to Improve Learning](https://www.niu.edu/citl/resources/guides/instructional-guide/instructional-scaffolding-to-improve-learning.shtml)
- [Scaffolding in Education: Definition, Benefits, Strategies](https://www.discoveryeducation.com/blog/teaching-and-learning/scaffolding-in-education/)

**Technical Education**:
- [Role of pedagogical approaches in fostering innovation among K-12 students in STEM education](https://www.sciencedirect.com/science/article/pii/S2590291124000366)
- [Pedagogy for Technical Understanding](https://link.springer.com/chapter/10.1007/978-3-030-41548-8_10)

---

**Last Updated**: 2026-05-07  
**Prepared by**: Claude Code  
**Version**: Enhanced with Best Practices (v2.0)
