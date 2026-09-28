# Systems Evaluations — Video 3: Four Methods of Evaluation
**Course**: Agentic AI | **Topic**: Systems Evaluations  
**Video**: 3 of 4  
**Target Duration**: ~13 minutes  
**Objective**: Learners understand four evaluation methods (Code Review, E2E Testing, Safety Hooks, LLM as Judge), when to use each, and their tradeoffs.

---

## Scene 3.1: The Wrong Question

**Visual**: Agent codebase displayed on screen. Multiple programming languages and frameworks visible (Python, TypeScript, SQL, config files). A hand points at different parts asking "Is this good?" with question marks appearing.

**Narration**: "You know how to build agents. You can write code, wire up APIs, handle errors. But here's a question you probably haven't asked: *How* do you evaluate an agent? Not 'does it run,' but 'is it good?' Most teams pick one evaluation method and stick with it. That's a mistake. Different agents need different evaluation approaches."

**Animation**: Title appears: "Four Methods of Agent Evaluation"

---

## Scene 3.2: Method 1 — Code Review

**Visual**: Code editor showing agent logic. A reviewer annotation tool appears, highlighting specific lines with comments: "✅ This handles null inputs correctly," "⚠️ What if the API times out?", "❌ This race condition could fail under concurrency."

**Narration**: "Method 1 is Code Review. A human (or another AI) looks at the code and asks: Does the logic make sense? Are there bugs? Are there edge cases that break it? Code review is powerful for finding logical errors, security issues, and performance problems. It's how every production system should work."

**Animation**: Show a checklist appearing: "☑ Null handling ☑ Error recovery ☑ Concurrency safety ☑ Performance ☑ Security"

**Narration** (continued): "When to use it: Any agent with explicit decision logic. If your agent has rules, conditionals, or API orchestration, code review catches problems before runtime."

**Animation**: Real example appears. Show a Python agent that calls three APIs in sequence. Code review catches: "If API 1 fails, APIs 2 and 3 still run and waste resources. Add early exit logic."

**Narration** (continued): "Limitation: Code review can't catch behavioral problems. An agent might have perfect code but still give users wrong answers or be too slow. That's where the next methods come in."

---

## Scene 3.3: Method 2 — End-to-End (E2E) Testing

**Visual**: Video showing a full workflow: User input → Agent processes → Output generated. Show multiple E2E test runs in parallel. Some pass (green checkmark), some fail (red X). Real transaction examples flow through the agent.

**Narration**: "Method 2 is End-to-End Testing. You take real inputs, run them through the agent, and check if the output is correct. This tests the whole system, not just the code. Bank reconciliation example: Real transactions come in. Agent processes them. Does it flag the right discrepancies? E2E testing answers that."

**Animation**: Show a comparison between unit test (tests one function) vs E2E test (tests entire workflow). Unit test might pass, but E2E test reveals the output doesn't help users.

**Narration** (continued): "When to use it: Multi-stage pipelines, integrations, anything where the final output matters more than the logic."

**Animation**: Show E2E test results. "Ran 1000 real transactions. Agent correctly flagged 910 (91% accuracy). False positives: 80. Missed discrepancies: 10."

**Narration** (continued): "Limitation: E2E testing is sample-based. You can't test every input combination. You test representative scenarios. If an edge case exists that you didn't test, it slips through."

**Animation**: Show a failure slipping past E2E tests—an edge case that wasn't in the test set catches the agent in production.

---

## Scene 3.4: Method 3 — Safety Hooks

**Visual**: Agent execution flow displayed with gates/barriers. At certain checkpoints, barriers appear asking "Is this safe to continue?" Green lights allow forward progress, red lights halt and alert.

**Narration**: "Method 3 is Safety Hooks. You add checks *during* execution: If something looks wrong, stop and alert instead of proceeding. Think of it as circuit breakers for your agent. Example: Your agent recommends trades on a financial account. Safety hook: 'If the recommended trade is larger than 10% of the account, don't execute. Alert the user instead.'"

**Animation**: Show a scenario where safety hook prevents harm. Agent recommends liquidating 80% of assets due to a data error. Safety hook catches it: "This recommendation is > 10% of account. Halting. Alert user." The disaster is prevented.

**Narration** (continued): "When to use it: High-risk systems where failure has real consequences. Anything touching money, health, security, or user data should have safety hooks."

**Animation**: Show various safety hook examples: 
- Payment agent: "Halt if transfer > $10,000"
- Healthcare agent: "Halt if medication recommendation is contraindicated"
- Support agent: "Halt if response contains prohibited content"

**Narration** (continued): "Safety hooks don't prevent problems. They prevent *disasters*. They don't catch all issues, but they catch the ones that matter most."

**Animation**: Limitation shown: "Safety hook stops the agent, but doesn't fix the underlying problem. The user still has to intervene."

---

## Scene 3.5: Method 4 — LLM as Judge

**Visual**: Two outputs shown side-by-side. A judge avatar (or just "Judge LLM" label) compares them with scoring: Output A scores 4/5 (helpful, clear, professional). Output B scores 2/5 (vague, confusing, unhelpful).

**Narration**: "Method 4 is LLM as Judge. You use another LLM to evaluate your agent's output. Does this response sound helpful? Professional? Accurate? LLM-as-judge evaluates subjective qualities that are hard to measure with code."

**Animation**: Show example evaluation. Glossary generated by agent. Judge LLM evaluates: "Is each definition clear? Complete? Accurate? Free of jargon?" Scores appear for each definition.

**Narration** (continued): "When to use it: Anything involving natural language generation, tone, helpfulness, alignment. Customer support chatbots, content generation, recommendation systems—these need LLM evaluation."

**Animation**: Show scoring rubric appearing. "Clarity (1-5): ☑4 Completeness: ☑3 Accuracy: ☑5 Tone: ☑4 | Overall: 4/5"

**Narration** (continued): "Limitation: You're using an LLM to judge an LLM. It works surprisingly well, but it's not perfect. An evaluator LLM might miss nuances or have biases. You need careful prompt design and regular audits."

**Animation**: Show the meta-problem. "How do you know the judge LLM is right? You might need to sample-check 10-20 evaluations manually to calibrate the judge."

---

## Scene 3.6: Choosing the Right Method

**Visual**: Decision tree appearing. Starting point: "What do you need to evaluate?" Branches: "Logic?" → Code Review. "Workflow correctness?" → E2E Testing. "Risk tolerance?" → Safety Hooks. "Output quality?" → LLM as Judge.

**Narration**: "You don't use one method. You use *all of them*, but for different purposes. Code review for logic. E2E testing for correctness. Safety hooks for risk. LLM-as-judge for quality. Pick the ones that fit your agent."

**Animation**: Show a multi-agent pipeline with evaluation methods assigned to each stage.
- Agent 1 (data fetching): Code review (logic correct?) + E2E test (real data retrieved?)
- Agent 2 (reconciliation): Code review (algorithm correct?) + E2E test (output accurate?) + LLM-as-judge (is it actionable?)
- Agent 3 (recommendations): Safety hooks (prevent bad recommendations?) + LLM-as-judge (is it helpful?)

**Narration** (continued): "You layer them. Together, they give you confidence that your agent is actually working."

---

## Scene 3.7: Real Example: Customer Support Chatbot

**Visual**: Chat interface showing customer conversations. Show a problematic exchange: Customer asks question → Chatbot gives wrong answer → Customer is frustrated. Then show how each method catches it.

**Narration**: "Let's trace through a customer support chatbot. Customer asks a question. The bot responds. Later, we find out the response was wrong and unhelpful. How would each method catch this?"

**Animation**: Show each method in sequence:

1. **Code Review**: "Does the agent call the knowledge base API correctly? Does it validate the response? The code looks fine—it calls the API and returns the result."

2. **E2E Testing**: "We tested 50 common questions. This one isn't in the test set. E2E testing doesn't catch it because it's an edge case."

3. **Safety Hook**: "No safety hook is in place for 'incorrect information.' The hook checks latency and error codes, not correctness."

4. **LLM as Judge**: "We score all bot responses using another LLM. Rubric: Correctness, clarity, tone. This response scores 1/5 for correctness. Judge flags it as a problem."

**Animation**: LLM-as-judge catches the issue first. The method that worked was the one designed for subjective quality.

**Narration** (continued): "In this case, LLM-as-judge saved us. But next week, a different method might catch a different problem. You need all four."

---

## Scene 3.8: Tradeoffs and Costs

**Visual**: Comparison chart appearing. Rows: Code Review, E2E Testing, Safety Hooks, LLM-as-Judge. Columns: Setup cost, Runtime cost, Coverage, Accuracy at catching problems.

**Narration**: "Each method has tradeoffs. Code review is cheap and catches logic bugs, but it's manual and doesn't catch behavioral problems. E2E testing is expensive (you need test data and compute) but catches real-world problems. Safety hooks are fast but only catch specific conditions. LLM-as-judge is flexible but costs money (API calls) and can be wrong."

**Animation**: Chart populates:
| Method | Setup | Runtime Cost | Coverage | Catches Edge Cases |
|--------|-------|--------------|----------|------------------|
| Code Review | Low | None | Logic only | Poor |
| E2E Testing | Medium | Medium | Sample-based | Medium |
| Safety Hooks | Medium | Low | Specific conditions | Good (for those conditions) |
| LLM-as-Judge | Medium | High | Any output | Good (but not perfect) |

**Narration** (continued): "Pick your methods based on what matters most. For a customer support bot, you probably prioritize LLM-as-judge and safety hooks. For a data pipeline, E2E testing and code review matter more."

---

## Scene 3.9: Integration Example

**Visual**: Flowchart showing a bank reconciliation agent with all four methods integrated:
1. Code review happens during development (pre-deployment)
2. E2E tests run on new transactions daily
3. Safety hooks execute during live reconciliation (halt if discrepancy count is abnormal)
4. LLM-as-judge evaluates reconciliation quality weekly

**Narration**: "Here's how a real agent uses all four methods. During development, code review catches logic bugs. Before deployment, E2E tests verify the agent works on representative data. In production, safety hooks catch anomalies in real time. Weekly, LLM-as-judge evaluates if reconciliations are actually correct and useful. Together, they ensure the agent is always working well."

**Animation**: Show a timeline over 2 weeks:
- Day 1: Code review finds a bug. Fixed before deployment.
- Day 2: Deployment. E2E tests run on 1000 sample transactions.
- Day 5: Safety hook catches 3 unusual reconciliation patterns. User alerts sent.
- Day 10: Weekly LLM-as-judge evaluation. Score: 94% high-quality reconciliations.

**Narration** (continued): "Notice: Different methods work on different timescales and catch different problems. Code review is pre-deployment. E2E testing is regular. Safety hooks are real-time. LLM-as-judge is periodic. You need this rhythm."

---

## Scene 3.10: Your Agent, Which Methods?

**Visual**: Interactive questionnaire appearing:
- "Does your agent have explicit decision logic?" → Code review
- "Does it process real data end-to-end?" → E2E testing
- "Could it cause harm if it fails?" → Safety hooks
- "Does output quality matter to users?" → LLM-as-judge

**Narration**: "Now think about your agent. Ask yourself these questions. Based on your answers, which methods should you prioritize? You don't need all four on day one. But you should have a plan."

**Animation**: Checklist appears: "☐ Identify evaluation methods for your agent ☐ Plan how/when to run each ☐ Budget cost and effort ☐ Start with one, add others"

**Outro Narration**: "In the next video, we bring it all together. We'll show you how to build a complete evaluation system for your agent: picking metrics, running these methods, feeding data back into the MEASURE loop. You'll see the full picture of continuous agent evaluation."

**Animation**: Title card for next video: "VIDEO 4: Building Your Evaluation System"

---

## Production Notes for Video 3

**Total Duration**: ~13 minutes  
**Pacing**: Fast, method-by-method breakdown  
**Visual Style**: Code editors, flowcharts, test results, comparison tables, real examples  
**Key Animations**: Decision trees, safety hook barriers, comparison charts, integration timeline  
**Tone**: Educational, practical, emphasizing that different agents need different evaluation  
**Color Scheme**: Each method has a color (Code Review=blue, E2E=green, Safety Hooks=red, LLM-as-Judge=purple)  
**Font**: Clear sans-serif, good contrast for code and charts  

**Scene Breakdown** (for Remotion composition):
- Scene 1: Wrong question + title (12s)
- Scene 2: Code Review method + examples (18s)
- Scene 3: E2E Testing method + examples (18s)
- Scene 4: Safety Hooks method + examples (18s)
- Scene 5: LLM-as-Judge method + examples (18s)
- Scene 6: Choosing the right method (decision tree) (15s)
- Scene 7: Customer support chatbot real example (25s)
- Scene 8: Tradeoffs and costs chart (15s)
- Scene 9: Integration example (bank recon) (20s)
- Scene 10: Your turn + questionnaire (12s)

**Total**: ~171s (~2.8 minutes) [Note: Expand with more examples/details for 13 min target]

---

**Created**: 2026-05-13  
**Format**: Video production script for Remotion  
**Status**: Ready for composition
