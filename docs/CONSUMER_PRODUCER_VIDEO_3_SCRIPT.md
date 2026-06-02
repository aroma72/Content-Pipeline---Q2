# CONSUMER VS PRODUCER
## Building Agents in Practice

**Video 3 of 3 Series**

---

### Video Specifications

| Property | Value |
|----------|-------|
| **Duration** | 3 minutes maximum |
| **Voiceover** | ~810 words |
| **Learning Goal** | Design and implement basic producer-consumer agent systems |
| **Key Concepts** | Code, error handling, chaining, scaling |
| **Complexity** | High (code heavy) |
| **Pacing** | 270 words/minute (measured) |

---

## SCRIPT

### OPENING (0:00–0:20) — 54 words

**[VISUAL: Code editor with blank file, title appearing]**

> Theory is done. Let's build.
>
> We're going to create a real producer-consumer agent system. Simple code. Real principles.
>
> By the end, you'll know how to design and build your own agent pair.
>
> Let's go.

**[VISUAL: Transition to code blocks]**

---

### PRODUCER AGENT CODE (0:20–1:00) — 216 words

**[VISUAL: Code block with syntax highlighting, key sections highlighted in color]**

```python
class FeedbackProducerAgent:
    def produce(self):
        # Step 1: Fetch raw feedback
        feedback = self.fetch_from_sources()

        # Step 2: Clean and validate
        structured = []
        for item in feedback:
            cleaned = self.clean_text(item)
            if self.is_quality(cleaned):
                structured.append({
                    'text': cleaned,
                    'sentiment': self.analyze_sentiment(cleaned),
                    'source': item.source
                })

        # Step 3: Output to queue
        self.queue.put(structured)
        return len(structured)
```

> **What's happening?**
>
> **Step 1: Fetch** from emails, surveys, social media. Get raw feedback.
>
> **Step 2: Clean** messy text. Analyze sentiment. Check quality. If it's bad, drop it. Only good data passes through.
>
> **Step 3: Put clean data into a queue.** Don't wait. Move on.
>
> ### THIS IS KEY:
>
> Producer does **ONE job.** Produce clean data. That's it.
>
> It doesn't analyze. Doesn't generate reports. Just produces.
>
> And it **doesn't wait for the consumer.** Queue handles the handoff.
>
> This separation is everything. This is what lets systems scale.

**[VISUAL: Highlight fetch section in green, clean section in blue, queue output in orange]**

---

### CONSUMER AGENT CODE (1:00–1:45) — 243 words

**[VISUAL: New code block, consumer agent, error handling highlighted]**

```python
class FeedbackAnalysisConsumerAgent:
    def consume(self):
        # Step 1: Get batch from queue
        batch = self.queue.get_batch(size=10)

        if not batch:
            return None  # Queue empty, nothing to do

        # Step 2: Analyze
        insights = []
        for feedback in batch:
            try:
                topics = self.extract_topics(feedback['text'])
                urgency = self.assess_urgency(feedback['sentiment'])

                insight = {
                    'topics': topics,
                    'urgency': urgency,
                    'source': feedback['source']
                }
                insights.append(insight)

            except Exception as e:
                self.log_error(f'Failed: {e}')
                continue  # Keep going, don't crash

        # Step 3: Output insights
        self.output(insights)
        return insights
```

> **What's happening?**
>
> **Step 1: Pull batch** of 10 items from queue. Efficient.
>
> **Step 2: Analyze each one.** Extract topics. Assess urgency.
>
> See the `try-except`? **If one feedback item breaks, we log the error and keep going.** We don't crash. The system keeps running.
>
> **Step 3: Output** insights for the next stage.
>
> ### Notice something important:
>
> Consumer is **ALSO a producer.** It produces insights.
>
> This is how chains work. Agent A produces for Agent B. Agent B produces for Agent C.
>
> And the queue in between means **nobody is waiting.** Nobody is blocked. Everyone works at their own pace.

**[VISUAL: Highlight get_batch in green, analysis loop in blue, error handling in red, output in orange]**

---

### REAL SCENARIO (1:45–2:45) — 270 words

**[VISUAL: Complex pipeline diagram - multiple agents with queues between them]**

> **Real-world scenario:** Content processing pipeline.
>
> You have session recordings coming in. You need to extract clips, generate scripts, build videos.
>
> **Four agents working together:**

```
Agent 1 (PRODUCER): Session Ingestion
├─ Takes raw video recordings
├─ Extracts key moments
└─ Produces: structured segments with timestamps

          ↓ Queue 1

Agent 2 (CONSUMER/PRODUCER): Script Generation
├─ Takes segments
├─ Generates narration script
└─ Produces: script with metadata

          ↓ Queue 2

Agent 3 (CONSUMER/PRODUCER): Video Assembly
├─ Takes script
├─ Builds Remotion composition
└─ Produces: silent video file

          ↓ Queue 3

Agent 4 (CONSUMER): Publishing
├─ Takes video
└─ Publishes to platform
```

> ### Why does this work?
>
> **Each agent does ONE job.** Each is independent.
>
> - Agent 1 is fast? Segments pile up in Queue 1. That's visible.
> - Agent 2 is slow? Queue 1 fills up. You see the bottleneck. You optimize Agent 2 or add more instances.
> - Agent 3 crashes? Queues 1 and 2 still have data. Restart Agent 3, it continues.
>
> **This is scalability.** This is resilience. This is how real systems work.
>
> You're not building one monolithic agent doing everything. You're building **independent agents that work together through clear interfaces.**
>
> Producer-consumer pattern. Queue-based. Resilient. Scalable.

**[VISUAL: Show all four agents with arrows between queues, highlight queue buildup if one is slow, show recovery when one restarts]**

---

### CLOSING (2:45–3:00) — 81 words

**[VISUAL: Recap of all three videos - concepts flash on screen]**

> Producer-consumer is about **separation of concerns.**
>
> **Each agent does one job.** One job done well.
>
> **Producer outputs to queue.** Consumer pulls when ready.
>
> **Independent. Decoupled. Scalable.**
>
> You now know how to design agent systems that work.
>
> That's the pattern. That's how real systems scale.
>
> Go build something.

**[VISUAL: Final frame with course completion message]**

---

## PRODUCTION GUIDE

### Timeline

| Time | Section | Duration | Content |
|------|---------|----------|---------|
| 0:00–0:20 | Opening | 20s | Hook, setup |
| 0:20–1:00 | Producer Code | 40s | Code + explanation |
| 1:00–1:45 | Consumer Code | 45s | Code + error handling |
| 1:45–2:45 | Real Scenario | 60s | 4-agent pipeline |
| 2:45–3:00 | Closing | 15s | Summary & completion |
| **Total** | | **3:00** | Exact timing |

### Code Display Requirements

- [ ] **Syntax highlighting active:** keywords blue, strings green, comments gray
- [ ] **Font:** Monospace (Courier, Consolas, JetBrains Mono) minimum 16pt
- [ ] **Line numbers:** Optional but recommended for reference
- [ ] **Highlight sections:** Use color borders or background for key areas
  - Fetch: Green border
  - Clean/Analyze: Blue border
  - Error handling: Red border
  - Queue operations: Orange border
  - Output: Purple border

### Visual Elements Checklist

- [ ] Code editor opening with blank file
- [ ] Producer code block (syntax highlighted)
- [ ] Section highlights (fetch, clean, queue)
- [ ] Consumer code block (syntax highlighted)
- [ ] Error handling highlighted in red
- [ ] Complex 4-agent pipeline diagram
- [ ] Queue filling visualization (bottleneck scenario)
- [ ] Agent restart/recovery visualization
- [ ] Recap flash (all three videos' concepts)
- [ ] Smooth transitions between sections

### Color Palette

| Element | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| Producer | Green | #4CAF50 | Agent 1, fetch |
| Consumer | Blue | #2196F3 | Agent 2, consume |
| Queue/Buffer | Orange | #FF9800 | Queue operations |
| Error/Alert | Red | #F44336 | Error handling |
| Secondary | Purple | #9C27B0 | Output, events |
| Code BG | Dark Gray | #2D2D2D | Code blocks |
| Code Text | Light Gray | #F8F8F2 | Code syntax |
| Page BG | Cream | #F5F1E8 | Overall background |

### Voiceover Style Guide

✓ **Tone:** Measured, clear (more code to explain)  
✓ **Pacing:** 270 words/minute (slower around code sections)  
✓ **Emphasis:** Point to code as you explain it: "Notice the try-except"  
✓ **Pauses:** Longer pauses after code blocks (3 seconds)  
✓ **Build:** Culminate in multi-agent scenario for payoff  
✓ **Confidence:** End strong: "You now know..."  

---

## Learning Outcomes (Complete Series)

After watching all 3 videos, learners can:

✓ Identify producer-consumer relationships in any system  
✓ Explain why separation of concerns matters  
✓ Choose the right connection pattern (direct, queue, events)  
✓ Understand coupling, decoupling, and resilience  
✓ Design multi-agent systems with producer-consumer pattern  
✓ Implement basic producer and consumer agents  
✓ Handle errors and failures gracefully  
✓ Recognize bottlenecks and scale systems  

---

*Script prepared for voiceover recording and video production*  
*Ready for rendering in Remotion or equivalent video framework*  
*All three videos total 9 minutes | Global audience (no Taleemabad context)*
