# Systems Evaluations — Video 2: The MEASURE Framework
**Course**: Agentic AI | **Topic**: Systems Evaluations  
**Video**: 2 of 4  
**Target Duration**: ~14 minutes  
**Objective**: Learners understand the MEASURE framework (Measure → Explore → Assess → Sum → Unblock) and can apply it to their own agents.

---

## Scene 2.1: The Gap Between Testing and Evaluation

**Visual**: Split screen animation. Left side: Green checkmarks cascading (tests passing). Right side: Production server showing errors, confused users, alert notifications. A large arrow bridges them labeled "The MEASURE Gap."

**Narration**: "You've built an agent. Your tests pass. You feel confident. You deploy. Then in production, something happens that your tests never caught. Your agent makes a decision that surprises users. It misses an edge case. It's slower than expected. How do you find these problems before they become disasters? That's where the MEASURE framework comes in. It's a continuous loop that catches what testing misses."

**Animation**: Title card slides in: "MEASURE: Continuous Quality Evaluation"

---

## Scene 2.2: M — Measure What Matters

**Visual**: Dashboard mockup with multiple metric tiles appearing one at a time. Show: Success Rate %, Latency (ms), Cost ($), Accuracy (%), User Satisfaction (stars). Some metrics glow green (good), some yellow (concerning).

**Narration**: "M stands for Measure. But you can't measure everything. That's paralysis. Instead, pick 3-5 metrics that actually tell you if your agent is working. For a customer support chatbot: success rate (does it resolve the issue?), response time (is it fast enough?), accuracy (is the answer correct?), user satisfaction (do people like it?). Those four metrics tell you almost everything. If any drop, you know something's wrong."

**Animation**: Each metric appears with a definition. Show example thresholds: "Success Rate: 90%+ good, 80-90% warning, <80% alert." Real data points populate the dashboard.

**Narration** (continued): "But here's the critical part: metrics must be measurable and tied to your agent's actual job. Not 'is my code clean' (that's code review). But 'is my agent doing what it's supposed to do?'"

---

## Scene 2.3: E — Explore Failures

**Visual**: Animated file folder opening to reveal failure logs. Start with a zoomed-out view of thousands of rows, then zoom in to show individual failure cases. Highlight different types: timeout errors (red), wrong answers (yellow), edge cases (blue).

**Narration**: "E is Explore. When metrics show a problem, you dive into the data. You collect failures. Real failures from production. Maybe your metric says 'success rate dropped from 92% to 85%' and you need to know why. So you collect 50 recent failures, look at them, and sort them into categories. 'These 20 failed because of timeouts. These 15 failed because the input was malformed. These 10 failed because the agent didn't understand the context.'"

**Animation**: Failures appear in a list, then get colored and grouped into categories. Show a pie chart emerging: "Timeout: 40%, Malformed Input: 30%, Context Error: 20%, Other: 10%"

**Narration** (continued): "You're not guessing what went wrong. You're looking at actual data."

---

## Scene 2.4: A — Assess Root Causes

**Visual**: Tree diagram appearing. Root cause at the top, branches downward showing contributing factors. For each failure category, show deeper investigation. Example: "Timeout" branches into "Slow API call," "Rate limit hit," "Concurrency issue."

**Narration**: "A is Assess. Now that you know *what* failed, you dig deeper: *why* did it fail? Take those 20 timeout failures. Are they slow API calls? Rate limits? Concurrency problems? Each 'why' points to a different fix. If it's slow APIs, you optimize the API call or add caching. If it's rate limits, you add backoff logic. If it's concurrency, you serialize requests. You can't fix it if you don't know the root cause."

**Animation**: Show a real example. "Agent calls Stripe API 5 times in parallel. Stripe rate-limits after 2 concurrent calls. All 3 subsequent calls timeout." The root cause is now clear: The agent design violates Stripe's concurrency limits.

**Narration** (continued): "This is where most evaluation fails. Teams see 'timeout' and add more retry logic. But if the root cause is rate limits, retries just make it worse. Exploration saves you from this."

---

## Scene 2.5: S — Sum Up Health

**Visual**: Executive summary dashboard appearing. Show: "Overall Health: 85%". Breakdown: Success Rate 92%, Latency 150ms (good), Accuracy 88% (acceptable), User Satisfaction 4.1/5 (good). Highlight: "Top blocker: Accuracy drops when input is non-English (78%)."

**Narration**: "S is Sum up health. You've measured, explored, and assessed. Now you compile it into a clear summary: 'Here's what's working. Here's what's not. Here's what's blocking us.' For a bank reconciliation agent, it might be: 'Overall: 91% of reconciliations are correct. Failures cluster in three areas: foreign currency transactions (2% failure rate), late-posted transactions (5% failure rate), and manual adjustments (8% failure rate). Foreign currency is our biggest blocker.'"

**Animation**: The summary is clean, unambiguous. Anyone reading it understands the agent's health instantly.

**Narration** (continued): "This is your baseline. This is the state you're in *today*. You'll use this to measure progress."

---

## Scene 2.6: U — Unblock Improvements

**Visual**: Fix actions appearing on screen as checkboxes. For each root cause identified, show the corresponding action. "Rate Limit Issue → Add exponential backoff" "Non-English input → Improve prompt translation" "Late-posted transactions → Add 48-hour lookback window"

**Narration**: "U is Unblock. Based on what you learned, what do you fix? Pick one thing. Not everything—one. Why? Because if you change three things at once, you won't know which one actually helped. Fix the top blocker. Make one improvement. Then loop back to M."

**Animation**: Show a calendar with measurements happening weekly. Week 1: "Rate limit issue identified." Week 2: "Fix deployed: exponential backoff added." Week 3: "Measure again: timeout failures down 60%."

---

## Scene 2.7: The Loop — Continuous Iteration

**Visual**: Circular animation showing the MEASURE loop. M → E → A → S → U → back to M. Each step glows as it's executed. Show time markers: "Week 1, 2, 3, 4..." to show this is continuous.

**Narration**: "Here's the key: This isn't a one-time process. It's a loop. You measure, you improve, you measure again. Why? Because improving one thing sometimes breaks something else. Because new failure modes emerge. Because your users' needs change. Evaluation is forever. The agents that stay good are the ones where someone is always running the MEASURE loop."

**Animation**: Show the loop speeding up over time. Early loops take 2-3 weeks. Later loops take 1 week. The team gets faster at finding and fixing problems.

**Narration** (continued): "Your goal is to tighten this loop. Find problems faster. Fix them faster. Measure the improvement faster."

---

## Scene 2.8: Real Example: Bank Reconciliation Agent

**Visual**: Screen share showing a real bank reconciliation scenario. Show transaction data, the agent's decisions, and the reconciliation output. Annotate with success/failure markers.

**Narration**: "Let me show you a real example. This is a bank reconciliation agent. It's responsible for flagging discrepancies between two data sources. Let's run through the MEASURE loop. Step 1: Measure. Our metrics are: reconciliation accuracy (did we flag real discrepancies?), false positive rate (did we flag things that aren't real discrepancies?), and processing time. Baseline: 91% accuracy, 8% false positives, 45ms per transaction."

**Animation**: Dashboard appears with these metrics.

**Narration** (continued): "Step 2: Explore. We collect 20 recent failures. Most are false positives. Specifically: The agent flags 'late-posted transactions' as discrepancies. But late posts are normal and expected. Step 3: Assess. Root cause: The agent's logic doesn't account for transactions that are posted after 48 hours. It treats them as errors. Step 4: Sum up. 'Agent is 91% accurate. Biggest issue: false positives on late-posted transactions (6 out of 20 failures).'"

**Animation**: Data visualization shows the failure distribution.

**Narration** (continued): "Step 5: Unblock. We add a rule: If a transaction posts after 48 hours but matches a pending entry, don't flag it as a discrepancy. We deploy. Step 1 again: New measurement shows 94% accuracy, 3% false positives. We improved. Loop continues."

---

## Scene 2.9: Why This Matters in Production

**Visual**: Timeline showing what happens without the MEASURE loop. Day 1: Agent deploys with 90% accuracy. Day 30: Users have reported errors, confidence is low, team has no data on what's broken. Alternative timeline with MEASURE loop: Day 1: 90% accuracy (baseline). Day 7: First issue identified via MEASURE (late-post transactions). Day 14: Fix deployed. Day 21: New accuracy 94%. Users see continuous improvement.

**Narration**: "Without the MEASURE loop, you're flying blind. Your agent degrades, users complain, and you don't know where to start. With the MEASURE loop, you see problems coming. You fix them before they become disasters. And you have data to prove you're getting better."

**Animation**: Show metrics trending upward over time with the MEASURE loop vs flat or declining without it.

---

## Scene 2.10: Your Turn

**Visual**: Agent project workspace showing a dashboard template. Overlay prompts: "What 3-5 metrics matter for *your* agent? What's a failure mode you've already seen? What root cause would explain it?"

**Narration**: "Now it's your turn. Take your agent. Define 3-5 metrics that actually matter. Collect 10-20 real failures from your logs or testing. Group them into categories. What's the root cause? What's one thing you'd fix? That's you running the MEASURE loop."

**Animation**: Interactive checklist appears: "☐ Define metrics ☐ Collect failures ☐ Group failures ☐ Identify root cause ☐ Plan fix"

**Outro Narration**: "In the next video, we're going deep into the methods of evaluation. You'll learn four specific ways to evaluate your agent and how to pick the right one. For now, start measuring. Start exploring. That's where quality begins."

**Animation**: Title card for next video: "VIDEO 3: Four Methods of Evaluation"

---

## Production Notes for Video 2

**Total Duration**: ~14 minutes  
**Pacing**: Slower than Video 1; more explanation, more data visualization  
**Visual Style**: Data dashboards, metrics, tree diagrams, animated loops, real examples  
**Key Animations**: MEASURE loop (circular), failure categorization, root cause tree, metrics trending over time  
**Tone**: Practical, data-driven, emphasizing continuous improvement  
**Color Scheme**: Green (good metrics), yellow (warning), red (problems), blue (information)  
**Font**: Clear sans-serif for readability on dashboards  

**Scene Breakdown** (for Remotion composition):
- Scene 1: Gap intro + title (13s)
- Scene 2: Measure what matters + dashboard (20s)
- Scene 3: Explore failures + categorization (20s)
- Scene 4: Assess root causes + tree diagram (18s)
- Scene 5: Sum up health + health dashboard (15s)
- Scene 6: Unblock improvements + checklist (15s)
- Scene 7: MEASURE loop animation (18s)
- Scene 8: Real example walkthrough (35s)
- Scene 9: Why this matters (production impact) (15s)
- Scene 10: Your turn + interactive checklist (10s)

**Total**: ~179s (~3 minutes) [Note: Compress or split for actual 12-14 min target]

---

**Created**: 2026-05-13  
**Format**: Video production script for Remotion  
**Status**: Ready for composition
