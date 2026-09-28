# Systems Evaluations — Instructor Pack
## Teaching Autonomous Systems Evaluation to Agentic AI Cohort

**Course**: Agentic AI | **Module**: Systems Evaluations  
**Audience**: Instructors preparing to teach evaluation frameworks to agent-building students  
**Version**: 1.0 | **Last Updated**: 2026-05-13

---

## Part 1: Course Overview & Objectives

### What This Course Teaches

**Systems Evaluations** teaches learners how to assess whether an autonomous system or AI agent is actually working—not just technically, but in practice. It moves beyond "does the code compile?" to "does the agent solve the problem it's supposed to solve?"

**Core Question**: A chatbot passes all tests but gives wrong information to users. How did this happen? And how do we prevent it?

### Learning Objectives

By the end of this course, learners will be able to:

1. **Distinguish testing from evaluation**
   - Testing: Does the code run? Does it execute correctly?
   - Evaluation: Does the system achieve its goals? Is the output actually useful?

2. **Implement the MEASURE framework**
   - Identify metrics that matter for their specific agent
   - Collect and analyze failure data
   - Root-cause assessment for failures
   - Iterate improvements based on evidence

3. **Select and apply evaluation methods**
   - Code review for logical correctness
   - End-to-end testing for integration behavior
   - Safety hooks for boundary conditions
   - LLM-as-judge for subjective quality (tone, helpfulness, etc.)

4. **Build continuous evaluation loops**
   - Set up monitoring for production agents
   - Detect regressions early
   - Track quality trends over time
   - Know when to escalate

5. **Apply evaluation to their own projects**
   - Bank reconciliation agents (Muhammad Zain)
   - Multi-tool pipelines (Moiz, Muzzammil)
   - Autonomous report generators (Hasnat)
   - Data connector systems (Muhammad Zain)

---

## Part 2: Key Concepts for Instructors

### Concept 1: Testing ≠ Evaluation

**What instructors need to know**: Your cohort comes from strong Python backgrounds with testing experience (pytest, unit tests). They understand mocking and test coverage. **DO NOT assume they understand evaluation.**

**The mistake they'll make**: "I have 95% test coverage, so my agent is good."

**Your talking point**:
> "Test coverage measures code paths. Evaluation measures outcome quality. A test can pass but the user experience can fail. Imagine Muhammad Zain's bank reconciliation agent: Tests might verify 'Did the agent process 100 transactions?' (✓ passes). But evaluation asks: 'Did it reconcile correctly? Are the flagged discrepancies *actually* discrepancies? Would an accountant trust this output?' Two different questions."

**Real example from cohort**:
- **Moiz's 7-agent pipeline**: Each agent is tested individually (outputs JSON correctly). But evaluation asks: Does the final output make sense? Do agents' decisions compound errors? Did agent 3's output mislead agent 4?
- **Bushra's rules engine**: She explicitly chose rules over LLMs to be "auditable." Evaluation extends this: Are the rules preventing bad outcomes? Or just making bad outcomes traceable?

**The why it matters**: Autonomous systems in production harm users when they fail silently. A test passes → code ships → agent gives wrong answer → user loses time/money. Evaluation catches this before ship.

---

### Concept 2: The MEASURE Framework

**What instructors need to know**: This is the core scaffolding for continuous evaluation. It's not one-time QA; it's a loop.

```
MEASURE Loop (Continuous)
├─ M: Measure what matters (pick 3-5 metrics)
├─ E: Explore failures (collect data on what broke)
├─ A: Assess root causes (why did it break?)
├─ S: Sum up health (aggregate findings)
├─ U: Unblock improvements (what do we fix?)
└─ Loop back to M (measure again, see if we improved)
```

**Real-world example for this cohort**:

**Hasnat's WhatsApp auto-reporter** (autonomous, 54 groups, triggers at 9 AM):
- **M**: Measure: "Did report generate?" "Did it send?" "Was content relevant?" "Did users engage?" → 4 metrics
- **E**: Explore: Collect 20 failures from logs → "7 instances where report was empty," "3 where it hit rate limit," "10 where content wasn't relevant to group"
- **A**: Assess: Root causes → "Empty reports when session has <3 messages (edge case in prompt)" "Rate limit when 4+ groups trigger simultaneously (timing issue)" "Content irrelevant when summarizer ignores group topic (context not passed to LLM)"
- **S**: Sum up: "Report success rate: 87%. Top blocker: Empty reports (35% of failures)"
- **U**: Unblock: "Add minimum message threshold check before generating report. Add delay between concurrent reporters."
- **Loop back**: New measurement shows success rate → 94%. New failure patterns emerge → loop continues

**Your talking point**:
> "Evaluation is not a destination. It's a treadmill. You measure, you improve, you measure again. Forever. The systems that stay good are the ones that never stop measuring."

---

### Concept 3: Four Methods of Evaluation

**What instructors need to know**: Students need to learn that different systems require different evaluation approaches. They're not interchangeable.

#### Method 1: Code Review
- **What it measures**: Does the logic match the intent? Are there edge cases?
- **When to use**: Logic-heavy systems, decision trees, pipelines with explicit rules
- **Your cohort example**: Bushra's rules engine. Evaluation via code review: "Is each rule correct? Do rules interact? Do edge cases break?" 
- **Limitation**: Can't catch emergent behaviors or LLM hallucinations

#### Method 2: End-to-End Testing
- **What it measures**: Does the full system produce the right output for real inputs?
- **When to use**: Multi-stage pipelines, integrations
- **Your cohort example**: Muhammad Zain's 8 data connectors → Bank reconciliation agent pipeline. E2E test: "Given real transactions from Oracle, does the agent flag *actual* discrepancies?" Not just "does it run," but "does it solve the problem?"
- **Limitation**: Can't test every input combination; sample-based

#### Method 3: Safety Hooks
- **What it measures**: Does the system fail gracefully? Are boundaries enforced?
- **When to use**: Production systems where failure means harm
- **Your cohort example**: Hasnat's auto-reporter. Safety hook: "If report is empty, don't send it. Alert instead." Muaiz's blocked project (waiting for API key): If the MCP server doesn't respond, the agent shouldn't try to proceed.
- **Limitation**: Catches boundary conditions but not subtle correctness issues

#### Method 4: LLM as Judge
- **What it measures**: Subjective quality (tone, helpfulness, safety, alignment)
- **When to use**: Systems generating text, making recommendations, evaluating other LLM outputs
- **Your cohort example**: Glossary generation (Scene 1.4 example: "Is this definition clear? Accurate? Complete?"). Another LLM judges. Hira's customer support chatbot: "Is the response helpful? Professional? Empathetic?"
- **Limitation**: Meta-problem (you're using LLM to judge LLM). Requires careful prompt design.

---

## Part 3: Teaching Strategies (Cohort-Specific)

### What Your Cohort Already Knows

Based on the teaching brief, your students:
- ✅ Understand autonomous agents (Hasnat's WhatsApp monitor, Moiz's 7-agent pipeline)
- ✅ Can debug async code and integrations (Hira's FastAPI + Streamlit, Railway deployments)
- ✅ Know what JSON is and can structure data (multi-agent systems with structured handoffs)
- ✅ Have shipped production code (Muhammad Zain's bank-recon on Railway)

**Do NOT reteach these.**

### What They'll Struggle With

**1. Confusing evaluation with logging**
- **Mistake**: "I'll just log everything and review logs later."
- **Reality**: Logs are data. Evaluation is a framework for *what* to measure and *why*.
- **Your response**: "Logging is infrastructure. Evaluation is strategy. You need both, but they're not the same."

**2. Thinking evaluation = one-time QA before ship**
- **Mistake**: "I'll evaluate once, then deploy."
- **Reality**: Evaluation is continuous (MEASURE loop).
- **Your response**: "Your agent in production is different from your agent in testing. Real data surprises you. You need to measure continuously."

**3. Assuming their project doesn't need evaluation**
- **Mistake**: "My system is small/simple, so I don't need to evaluate."
- **Reality**: Even simple systems have failure modes. Muhammad Zain's bank-recon might miss a discrepancy type. Hasnat's reporter might hit a rate limit. Muaiz's MCP tool might timeout.
- **Your response**: "Evaluation isn't about size. It's about 'What can go wrong, and how will we know?' Even a simple agent can fail in production."

---

## Part 4: Teaching Tactics (By Cohort Segment)

### For Builders of Autonomous Triggers (Hasnat, Muzzammil)

**Their strength**: They understand state machines and repeated execution.

**Your hook**: "Your auto-triggering agent runs thousands of times. You need to know: Which runs fail? When? Why? Are failures increasing? Evaluation tells you."

**Activity**: 
1. Have them identify 3 metrics for their agent
2. Pick one to track over one week
3. Show them the data; they'll see patterns they didn't expect
4. Have them hypothesize why
5. Have them measure again after fixing

**Example for Hasnat**: WhatsApp auto-reporter metrics: success rate, average report length, engagement rate (do users react?), message relevance score

---

### For Builders of Multi-Tool Pipelines (Moiz, Muzzammil, Muhammad Zain)

**Their strength**: They understand data flow and debugging across stages.

**Your hook**: "Each tool works fine alone. But what happens when Tool A's output is Tool B's input? Evaluation checks: Is the data loss acceptable? Does the error compound?"

**Activity**:
1. Have them trace a failure through their pipeline
2. At which stage did it originate?
3. Could earlier stages have detected it?
4. Should there be a checkpoint between stages?

**Example for Muhammad Zain**: Bank-recon pipeline (Oracle → Connector → AI Agent → Reconciliation output). If Oracle data is misaligned, does the agent notice? Or does it produce wrong reconciliations? Safety hook: "If discrepancy count seems too high, flag for review before outputting."

---

### For Builders of Data Connectors (Muhammad Zain, Bushra)

**Their strength**: They understand data quality and schema validation.

**Your hook**: "You've validated the schema. But does the data make sense in context? Evaluation moves from 'is it valid?' to 'is it useful?'"

**Activity**:
1. Have them define success for their connector
2. "Valid schema" is a baseline; what else matters?
3. Completeness? Timeliness? Consistency?
4. Have them measure one of these

**Example for Muhammad Zain**: SAP connector—valid JSON but some fields are null. Evaluation question: "For reconciliation, which null fields are acceptable? Which are failures?"

---

### For Pragmatists (Bushra)

**Their strength**: They think operationally. "Is this actually better?"

**Your hook**: "Evaluation is how you prove 'actually better.' Not opinions. Data."

**Activity**:
1. Bushra's rules vs LLM decision: "Which is better?" can be measured
2. Have her define "better" (accuracy, auditability, speed, cost)
3. Have her build evaluation for each metric
4. Show her the data

---

## Part 5: Video Content Guidance for Instructors

### Video 1: "What is Systems Evaluation?"

**What students see**:
- Chatbot story (tests pass, output is wrong)
- Testing vs Evaluation comparison
- MEASURE framework loop

**What you emphasize**:
- The gap: Tests validate code, evaluation validates outcomes
- The consequence: Production failures happen when you skip evaluation
- The opportunity: You can catch failures before users do

**Discussion prompt during/after video**:
> "In your projects, what's an example of 'tests pass but output is bad'? If you don't have one yet, you will. When you do, remember: evaluation would have caught it."

**Common question you'll get**:
> "Isn't evaluation just more testing?"

**Your answer**:
> "Testing is yes/no: Does this code path execute correctly? Evaluation is quantitative: How often does this system achieve its goal? At what quality? Testing is binary; evaluation is continuous and measures what actually matters to users."

---

### Video 2: "MEASURE Framework & Three Types of Evaluation" (Coming in Video 2)

**What students will see**: Deep dive into MEASURE with real code examples

**What you should prep to explain**:
- Why MEASURE is a loop, not a checklist
- How to pick the right 3-5 metrics (spoiler: it's hard; help them)
- Why assessment of root causes is non-negotiable (if you don't know why it failed, you can't fix it)

**Discussion prompt**:
> "For Hasnat's WhatsApp reporter: What would 'Explore failures' look like? What data would you collect? What questions would you ask?"

---

### Video 3-4: "Methods & Implementation" (Coming)

**What to prepare in advance**:
- Have students pick one method that fits their project
- Have them brainstorm: "What would we evaluate with this method?"
- Be ready to scaffold: Most won't get specificity on first try

---

## Part 6: Assessment & Checkpoints

### Formative Assessment (During Learning)

**Checkpoint 1 (After Video 1)**: Can they distinguish testing from evaluation?
- **Prompt**: "You have a system that passes all tests. What questions would evaluation ask that testing doesn't?"
- **Rubric**: 
  - ❌ Confuses testing with evaluation ("Test more")
  - ⚠️ Names some differences but doesn't explain why they matter
  - ✅ Clearly states testing validates code; evaluation validates outcomes
  - ✅ Gives an example from their own project

**Checkpoint 2 (After Video 2)**: Can they define the MEASURE loop for their project?
- **Prompt**: "For your agent, define one MEASURE loop cycle. What do you measure? How will you explore failures? How will you know if you improved?"
- **Rubric**:
  - ❌ MEASURE isn't a loop; they treat it as a one-time checklist
  - ⚠️ Identifies M & U, misses E and A
  - ✅ Full loop; continuous iteration is clear
  - ✅ Metrics are specific and measurable

**Checkpoint 3 (After Methods)**: Can they pick and justify an evaluation method?
- **Prompt**: "You built a multi-tool agent. Which evaluation method (code review, E2E, safety hooks, LLM-as-judge) would you use? Why? What would you be checking for?"
- **Rubric**:
  - ❌ Doesn't pick a method or picks wrong one for the system
  - ⚠️ Picks a method but reasoning is shallow
  - ✅ Method is justified; explains what it catches and what it misses
  - ✅ Can describe the actual evaluation in concrete terms

---

### Summative Assessment (End of Course)

**Final Project**: Evaluation Plan for Their Agent

**Requirements**:
1. Define 3-5 metrics that matter for success (specific, measurable)
2. Design one evaluation method (code review OR E2E OR safety hooks OR LLM-as-judge)
3. Show a MEASURE loop cycle (one full iteration: measure → explore → assess → sum → unblock)
4. Identify a potential failure mode and how your evaluation catches it
5. Document how you'll monitor this continuously

**Example for Muhammad Zain's bank-recon**:
- Metrics: reconciliation accuracy, discrepancy detection rate, false positive rate, user confidence
- Method: E2E testing with real Oracle data + manual spot-check of flagged discrepancies
- MEASURE loop: Monthly review of accuracy scores → manual inspection of 10 failed reconciliations → root cause analysis → improvements to prompt/logic → re-measure
- Failure mode: Agent flags legitimate business transactions as discrepancies → continuous evaluation catches high false-positive rate → alerts for review
- Monitoring: Weekly accuracy dashboard, alerting if accuracy drops below 95%

---

## Part 7: Common Misconceptions & Fixes

| Misconception | Student Says | Your Response |
|---|---|---|
| Evaluation = Testing | "I'll write more tests to evaluate my agent" | Tests validate code execution. Evaluation validates outcome quality. Different purposes. |
| Evaluation = QA checklist | "I'll evaluate once before shipping" | Evaluation is a continuous loop. Real data surprises you in production. You measure forever. |
| Only big systems need evaluation | "My agent is simple, I don't need evaluation" | Failure modes exist at any scale. Even simple systems fail in production. Muhammad Zain's discrepancy detection is simple logic—but still needs evaluation. |
| Evaluation = all metrics | "I'll track everything" | You can't. Pick 3-5 that matter most. Hasnat picks: success, relevance, engagement. Not: CPU time, memory, token count. Focus. |
| LLM-as-judge is always the answer | "I'll use an LLM to evaluate everything" | LLM judging LLM is a meta-problem. It works for subjective quality (tone, helpfulness). Doesn't work for factual accuracy. Use the right method for your question. |

---

## Part 8: Resources for Teaching

### Real Projects from Cohort (Use These Examples)

| Project | Type | Evaluation Questions |
|---|---|---|
| Muhammad Zain's Bank Reconciliation | Multi-tool pipeline | Does it flag real discrepancies? Any false positives? Is accuracy consistent across data sources? |
| Hasnat's WhatsApp Auto-Reporter | Autonomous trigger | What % succeed? Are reports relevant? Do users engage? Any silent failures (doesn't send but doesn't alert)? |
| Moiz's 7-Agent Pipeline | Sequential agents | Where do errors compound? Does agent N's output confuse agent N+1? |
| Hira's FastAPI + Streamlit | Multi-component system | Do backend and frontend stay in sync? Are failures transparent? |
| Bushra's Rules Engine | Logic-heavy system | Do rules interact correctly? Any edge cases? Is it actually better than LLM? |

### Discussion Prompts to Use

1. **For the "tests pass but output is bad" story**: 
   > "What would you have measured to catch this before shipping?"

2. **For the MEASURE framework**:
   > "In Hasnat's reporter, what happens if 'Explore failures' finds reports are sent but silent (no errors, but users ignore them)? How does the MEASURE loop respond?"

3. **For method selection**:
   > "Muhammad Zain's bank-recon uses real Oracle data. Is this E2E testing or evaluation? Why does it matter?"

4. **For production failures**:
   > "When Muaiz's MCP server doesn't respond, what should happen? Safety hook, code review, or E2E test?"

---

## Part 9: Teaching Schedule

### Suggested Pacing

| Session | Content | Duration | Checkpoint |
|---|---|---|---|
| 1 | Video 1 + Discussion | 45 min | Can they distinguish testing/evaluation? |
| 2 | MEASURE loop deep-dive + student projects | 50 min | Can they define a MEASURE cycle? |
| 3 | Video 2 (coming) + Methods overview | 50 min | Can they pick a method for their project? |
| 4 | Live coding: Evaluation setup for one student project | 60 min | Can they implement checkpoint monitoring? |
| 5 | Student presentations: Evaluation plans | 45 min | Final project assessment |

**Homework between sessions**:
- Session 1 → 2: Identify 3-5 metrics for their project
- Session 2 → 3: Design one MEASURE cycle
- Session 3 → 4: Implement measurement for one metric
- Session 4 → 5: Complete evaluation plan

---

## Part 10: Instructor Preparation Checklist

Before teaching this course:

- [ ] Watch all videos (1-4) yourself; take notes on talking points
- [ ] Review all student projects (cohort list at top of this document)
- [ ] Pick 2 student projects to use as live examples during teaching
- [ ] Prepare 3 discussion prompts relevant to their work
- [ ] Design the final evaluation plan assignment (use template in Part 6)
- [ ] Set up a shared document where students post checkpoint answers
- [ ] Identify a student whose project is "evaluation-ready" (has data, runs in production) for live demo
- [ ] Prepare the "tests pass but output is bad" failure story with specific details (don't make it generic)
- [ ] Block time for 1-on-1 office hours (every student will need help defining metrics)

---

## Part 11: Closing Notes for Instructors

### The Bigger Picture

This course teaches a professional practice. Evaluation isn't theory; it's how systems stay good in production. When Hasnat's reporter hits 10K groups, he won't know if it's working without evaluation. When Muhammad Zain's reconciliation agent processes real company data, he's legally responsible for accuracy—evaluation is his evidence.

### The Cohort's Advantage

Your students are builders. They have working systems. They have production data. This makes evaluation real and urgent, not abstract.

**Your job**: Help them see that measurement answers questions they *actually have*: 
- Hasnat: "Am I hitting 9 AM trigger reliably?" 
- Muhammad Zain: "Is this better than manual reconciliation?"
- Bushra: "Are my rules actually more trustworthy than an LLM?"

Evaluation is the answer to real problems they face right now.

