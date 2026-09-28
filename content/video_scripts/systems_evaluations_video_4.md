# Systems Evaluations — Video 4: Building Your Evaluation System
**Course**: Agentic AI | **Topic**: Systems Evaluations  
**Video**: 4 of 4  
**Target Duration**: ~15 minutes  
**Objective**: Learners build a complete evaluation system for their own agent, integrating MEASURE framework, evaluation methods, metrics, and continuous monitoring.

---

## Scene 4.1: The Full Picture

**Visual**: Complex system diagram appearing gradually. Start simple (Agent → Output), then add layers: Metrics layer (tracking success), Evaluation layer (code review, E2E, safety hooks, LLM-as-judge), Analysis layer (MEASURE loop), and Feedback layer (improvements → agent update).

**Narration**: "You've learned the pieces: metrics, the MEASURE framework, four evaluation methods. Now we put them together into a system that keeps your agent good forever. This is what production evaluation looks like. It's not one tool, not one test, not one metric. It's a system."

**Animation**: Title appears: "Building Complete Agent Evaluation Systems"

---

## Scene 4.2: Start With Your Agent

**Visual**: Agent codebase displayed (could be any real agent: chatbot, reconciliation, data connector, etc.). Show the agent's inputs and outputs clearly labeled. Annotate with questions: "What's this agent supposed to do?" "What success looks like?" "What could go wrong?"

**Narration**: "Step 1: Understand your agent. Not the code—the purpose. What is your agent supposed to do? For a customer support chatbot: resolve user questions quickly and accurately. For a bank reconciliation agent: flag real discrepancies without false positives. For a data pipeline: extract and transform data correctly. Write this down. Be specific. This is your north star."

**Animation**: Purpose statement appears as a clear declaration: "Agent Purpose: [Specific goal]"

**Narration** (continued): "Everything else flows from this. Metrics come from this. Evaluation methods come from this. If you don't know what your agent is supposed to do, you can't evaluate if it's working."

---

## Scene 4.3: Define Success Metrics

**Visual**: Metric design worksheet appearing. Rows for each potential metric: "Success Rate," "Latency," "Accuracy," "User Satisfaction," "Cost," "Safety." For each, show evaluation: "Does this measure if agent achieves its purpose?" Yes/No/Maybe.

**Narration**: "Step 2: Define 3-5 metrics that measure success. Not just any metrics—metrics that matter for your agent's purpose. For a chatbot, response time matters. But if the response is wrong, fast doesn't help users. For a reconciliation agent, accuracy matters. But if it takes 10 minutes per transaction, it's not useful. Pick metrics that actually tell you if your agent is working."

**Animation**: Show the metric selection process:
1. Brainstorm candidate metrics (10-15 ideas)
2. Filter by: "Does this tell me if agent achieves its purpose?" (keep 5-8)
3. Pick 3-5 you can actually measure and track
4. Set baseline and targets

**Example metrics appear**:
- Support Chatbot: Success rate (user satisfied), first-response time (< 2s), hallucination rate (0%)
- Reconciliation Agent: Accuracy (> 95%), false positive rate (< 5%), processing time (< 100ms/txn)
- Data Pipeline: Completeness (all required fields extracted), correctness (values match source), latency (< 5 min)

**Narration** (continued): "Set baselines. If you don't have data yet, estimate. You'll refine as you measure."

---

## Scene 4.4: Choose Evaluation Methods

**Visual**: Decision matrix appearing. Rows: Agent types (Rule-based, Multi-stage, LLM-heavy, etc.). Columns: Code Review, E2E Testing, Safety Hooks, LLM-as-Judge. Checkmarks show which methods to use for each type.

**Narration**: "Step 3: Pick evaluation methods for your agent. Remember from Video 3: different agents need different methods. A rule-based agent needs code review. A multi-stage pipeline needs E2E testing. An LLM-heavy agent might need safety hooks and LLM-as-judge. Look at your agent. Ask: What could go wrong? Which method catches that?"

**Animation**: Decision tree appears:
- "Agent has explicit logic?" → Code Review
- "Agent integrates multiple systems?" → E2E Testing
- "Agent's failures have high consequences?" → Safety Hooks
- "Agent generates text/recommendations?" → LLM-as-Judge

**Narration** (continued): "You probably pick 2-3 methods, not all four. Start with what matters most for your agent."

---

## Scene 4.5: Build the Measurement Infrastructure

**Visual**: Dashboard/monitoring system appearing. Show real-time metrics, historical trends, alerts. Log collection system → data warehouse → visualization layer.

**Narration**: "Step 4: Build infrastructure to collect and track metrics. You need: logs from your agent (what decisions did it make?), storage for historical data (what was accuracy last month?), and visualization (can anyone see the trend?). This doesn't have to be complex. Start simple: log success/failure for every run. Store it in a file or database. Plot weekly trends."

**Animation**: Show a simple setup:
- Logging: `log_event(agent_name, success=True/False, latency_ms=150, accuracy=0.95)`
- Storage: CSV or database table
- Visualization: Spreadsheet chart or simple dashboard

**Narration** (continued): "Advanced teams use proper observability stacks. But even a simple system works. The key is: you must have data."

---

## Scene 4.6: Implement the MEASURE Loop

**Visual**: Animated MEASURE loop running. Each week: 1) Measure (check metrics), 2) Explore (look at failures), 3) Assess (root cause), 4) Sum (compile health), 5) Unblock (plan fix).

**Narration**: "Step 5: Run the MEASURE loop regularly. Weekly is good to start. Every week: Pull your metrics. 'How are we doing?' Look at failures from the past week. 'What went wrong?' Understand why. 'Root cause?' Compile a summary. 'Agent health: accuracy 91%, latency 45ms, success rate 87%. Top blocker: accuracy drops on edge cases.' Plan one fix. 'We'll improve edge case handling this week.' Deploy. Measure again. Repeat."

**Animation**: Show a real 4-week timeline:
- Week 1: MEASURE cycle identifies "timeout on large requests"
- Week 2: Fix deployed (add timeout handling)
- Week 3: MEASURE shows timeout rate dropped 40%
- Week 4: New issue surfaces (memory leak). Next cycle begins

**Narration** (continued): "The loop is continuous. You're always measuring, improving, measuring."

---

## Scene 4.7: Integrate Evaluation Methods Into the Loop

**Visual**: MEASURE loop expanded. Each step now includes evaluation method checkpoints:
- Measure: Run code review on new code
- Explore: Run E2E tests on failure cases
- Assess: Safety hooks alert on anomalies
- Sum: LLM-as-judge scores output quality
- Unblock: Decide what to fix based on all signals

**Narration**: "Now integrate your evaluation methods into this loop. Code review happens before deployment. E2E tests run regularly. Safety hooks run during execution. LLM-as-judge runs periodically. Together, they feed data into your MEASURE loop, telling you what to fix."

**Animation**: Show a week-long evaluation timeline:
- Monday: Code review of new changes
- Tuesday-Thursday: E2E tests run nightly
- Friday: Safety hook alerts reviewed, LLM-as-judge evaluation run
- Friday PM: MEASURE analysis; decide on one improvement for next week

**Narration** (continued): "You're not running these methods randomly. You're running them on a schedule, collecting data, and using it to make decisions."

---

## Scene 4.8: Real Example: Building a Full Evaluation System

**Visual**: Screen share showing a real setup. Show: 
1. Agent code (Python, SQL, API calls)
2. Test suite (E2E tests in pytest)
3. Monitoring dashboard (metrics over time)
4. Weekly MEASURE report (text summary)

**Narration**: "Let me show you a real example. This is a bank reconciliation agent. Here's the complete evaluation system. First, the agent itself. It takes transactions, applies reconciliation logic, flags discrepancies. Second, the test suite. We E2E test on 100 sample transactions daily. We have code review checklist for logic changes. Third, monitoring. Dashboard shows accuracy, false positives, latency, processing cost. Fourth, MEASURE reports. Every Friday, we generate a report: accuracy 92%, top blocker is foreign currency transactions (85% accuracy vs 96% for domestic)."

**Animation**: Each component is highlighted as it's mentioned. Show code, tests, dashboard, and report.

**Narration** (continued): "We run the loop every week. This week, we're fixing the foreign currency accuracy issue. Next week, we measure to see if we improved. This cycle has been running for 6 months. The agent went from 88% accuracy to 94%. And we know exactly why—because we measured every step."

---

## Scene 4.9: Common Pitfalls

**Visual**: Red warning icons appearing with each pitfall:

**Pitfall 1**: "Metrics that don't matter"
**Visual**: Dashboard showing "CPU usage," "memory," "network latency"—technical metrics but nothing about user success.
**Narration**: "Don't measure what's easy to measure. Measure what matters. CPU usage doesn't tell you if your agent is good. User success does."

**Pitfall 2**: "Evaluating once, then shipping"
**Visual**: Timeline showing evaluation at day 1, then silence for weeks.
**Narration**: "Don't evaluate once and assume you're done. Evaluation is continuous. Your agent will change. Users will surprise you. The world will shift. You need to measure forever."

**Pitfall 3**: "Drowning in data, no action"
**Visual**: Dashboard with 50+ metrics, none of them clearly highlighting problems.
**Narration**: "Don't collect data you don't use. You can't optimize everything. Pick 3-5 metrics that guide decisions. Use them. Ignore the rest."

**Pitfall 4**: "Safety without understanding"
**Visual**: Safety hook halting the agent 100 times per day. User is frustrated.
**Narration**: "Don't add safety hooks without understanding what you're protecting against. A hook that triggers too often becomes noise, not safety."

**Pitfall 5**: "LLM-as-judge with bad prompts"
**Visual**: Judge LLM scoring something incorrectly due to vague evaluation criteria.
**Narration**: "Don't use an LLM to judge without careful prompt design. Test your judge. Calibrate it. Check that it's actually evaluating what you think it is."

---

## Scene 4.10: Rolling Out Your Evaluation System

**Visual**: Phased rollout plan appearing:
- Phase 1 (Week 1-2): Define metrics, set baselines
- Phase 2 (Week 3-4): Implement first evaluation method (code review or E2E)
- Phase 3 (Week 5-6): Run first MEASURE loop
- Phase 4 (Week 7+): Add more methods, scale monitoring

**Narration**: "You don't build the entire system at once. Here's a realistic rollout. Week 1-2: Define your 3-5 metrics and establish baselines. Week 3-4: Implement your first evaluation method (probably code review and E2E tests). Week 5-6: Run your first MEASURE loop. You measure, explore failures, assess causes, and plan one fix. Week 7+: Add more methods, expand monitoring, tighten the loop."

**Animation**: Show a calendar with milestones:
- Day 7: Metrics defined ✓
- Day 21: First evaluation method running ✓
- Day 35: First MEASURE cycle complete ✓
- Day 60: Second improvement deployed, re-measured ✓

**Narration** (continued): "In 2 months, you have a working evaluation system. It improves from there."

---

## Scene 4.11: Scaling Evaluation

**Visual**: Evolution chart showing how evaluation evolves as the agent scales:
- Day 1: One agent, basic metrics
- Month 1: Multiple features in one agent, code review + E2E tests
- Month 3: Multi-agent system, distributed MEASURE loops per agent
- Month 6: Continuous monitoring, real-time alerts, automated improvement suggestions

**Narration**: "As your agent matures, evaluation scales with it. Early on, you manually run tests and analyze data weekly. Later, you automate tests, set up real-time monitoring, and run MEASURE loops continuously. Eventually, your system detects problems and suggests fixes automatically."

**Animation**: Show architecture growing from simple (local evaluation) to complex (distributed monitoring, alert systems, automated remediation).

**Narration** (continued): "You don't need all this complexity on day one. But plan for it. Build evaluation so it can scale."

---

## Scene 4.12: Your Evaluation Blueprint

**Visual**: Interactive template appearing:
```
Agent Name: ________________
Agent Purpose: ________________
Success Metrics:
  1. ________________ (baseline: ____)
  2. ________________ (baseline: ____)
  3. ________________ (baseline: ____)
Evaluation Methods:
  ☐ Code Review
  ☐ E2E Testing
  ☐ Safety Hooks
  ☐ LLM-as-Judge
MEASURE Loop Frequency: ________________
First Improvement Target: ________________
Timeline: Start this week? ________________
```

**Narration**: "Here's your template. Fill this out for your agent. Print it. Share it with your team. This is your evaluation blueprint. What's your agent's purpose? What 3-5 metrics matter? Which evaluation methods will you use? When will you run your first MEASURE loop? When will you deploy your first improvement? This blueprint is your commitment to building a good agent."

**Animation**: Checklist appears: "☐ Fill out evaluation blueprint ☐ Share with team ☐ Run first MEASURE cycle this week"

**Outro Narration**: "You've now learned everything about evaluating agents. Testing vs evaluation. The MEASURE framework. Four evaluation methods. How to build a complete system. Evaluation isn't glamorous. It's not the part people talk about. But it's the difference between agents that work and agents that fail. It's how you build systems users trust. Start measuring. Start improving. That's how you build good agents."

**Animation**: Final title card: "Systems Evaluation: The Foundation of Reliable AI Agents"

---

## Production Notes for Video 4

**Total Duration**: ~15 minutes  
**Pacing**: Practical, step-by-step, with real examples  
**Visual Style**: System diagrams, dashboards, code editors, templates, timelines  
**Key Animations**: MEASURE loop running in real time, infrastructure diagrams, phased rollout, scaling evolution  
**Tone**: Empowering, pragmatic, emphasizing that this is achievable and necessary  
**Color Scheme**: Professional: blues, greens for healthy metrics, reds for issues, grays for infrastructure  
**Font**: Clear sans-serif, good contrast for code and dashboards  

**Scene Breakdown** (for Remotion composition):
- Scene 1: Full picture intro + title (12s)
- Scene 2: Start with your agent + purpose (15s)
- Scene 3: Define success metrics + examples (20s)
- Scene 4: Choose evaluation methods (18s)
- Scene 5: Build measurement infrastructure (18s)
- Scene 6: Implement MEASURE loop (20s)
- Scene 7: Integrate methods into loop (18s)
- Scene 8: Real example: full system walkthrough (35s)
- Scene 9: Common pitfalls (30s)
- Scene 10: Phased rollout plan (20s)
- Scene 11: Scaling evaluation (15s)
- Scene 12: Your evaluation blueprint (15s)

**Total**: ~236s (~3.9 minutes) [Note: Expand with more detailed walkthroughs and examples for 15 min target]

---

**Created**: 2026-05-13  
**Format**: Video production script for Remotion  
**Status**: Ready for composition
