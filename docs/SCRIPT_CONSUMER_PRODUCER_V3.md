---
type: script
last_verified: 2026-06-02
owner: aroma
video: Consumer vs Producer - Video 3 (Practical Implementation)
duration: 7-8 minutes
---

# Video 3: "Building Producer-Consumer Agents"

**Duration:** 7–8 minutes (approx 2,100 words)  
**Learning Goal:** Design and implement basic producer-consumer agents; handle errors and scaling  
**Concept Depth:** HOW to build, WHAT breaks, WHY practical concerns matter

---

## SCRIPT

### OPENING (0:00–0:45) — 270 words

[VISUAL: Title card, code editor opening with blank file]

"Okay. Theory is done. Now let's actually build something.

We're going to create a real producer-consumer agent system. The kind of system you'd actually use in production.

We'll see working code. We'll see what breaks. We'll see how to fix it. And by the end, you'll be able to design and build your own producer-consumer agent pair.

Let's start simple. Then we'll make it real.

The scenario: You have customer feedback coming in from multiple sources—emails, surveys, social media. You need to process it. Analyze it. Understand what customers are saying.

One agent produces clean, structured data from that feedback. Another agent analyzes it. Simple producer-consumer.

Let's build it."

[VISUAL: Show feedback coming from multiple sources - emails, surveys, social icons]

---

### PART 1: THE PRODUCER AGENT (0:45–2:45) — 1,200 words

[VISUAL: Code block appearing, highlighted syntax]

"Here's our producer agent. I'll explain as we go.

```python
class FeedbackProducerAgent:
    def __init__(self, sources):
        self.sources = sources  # Email, surveys, social media
        self.data_quality_threshold = 0.7
    
    def produce(self):
        feedback_items = []
        
        # Step 1: Fetch raw feedback
        for source in self.sources:
            raw_feedback = self.fetch_from_source(source)
            feedback_items.extend(raw_feedback)
        
        # Step 2: Clean and validate
        structured_feedback = []
        for item in feedback_items:
            cleaned = self.clean_text(item['text'])
            sentiment = self.analyze_sentiment(cleaned)
            source_type = item['source']
            quality_score = self.assess_quality(cleaned)
            
            if quality_score >= self.data_quality_threshold:
                structured = {
                    'id': item['id'],
                    'text': cleaned,
                    'sentiment': sentiment,
                    'source': source_type,
                    'quality': quality_score,
                    'timestamp': item['timestamp']
                }
                structured_feedback.append(structured)
        
        # Step 3: Output to queue
        self.output_to_queue(structured_feedback)
        return len(structured_feedback)
```

**What's happening here?**

**Step 1: Fetch.** The agent goes to multiple sources. Emails, surveys, social media APIs. It grabs the raw feedback.

**Step 2: Clean.** Raw feedback is messy. Typos, inconsistent formatting, random symbols. The agent cleans it. It analyzes sentiment—is this customer happy or upset? It scores the quality. If the quality is too low, it drops it.

**Step 3: Output.** The agent puts structured data into a queue. A queue, not a direct handoff. Why? Because the consumer agent might be busy. The producer doesn't need to wait.

**The key point:** This agent has ONE job. Produce clean, structured feedback. That's it. It doesn't analyze. It doesn't generate reports. It produces good input for the next agent.

[VISUAL: Code highlighting Key sections - fetch, clean, output]

Notice the data_quality_threshold. The agent doesn't just pump out everything. It validates. If the data isn't good enough, it doesn't pass it along. The consumer gets good input.

Also notice the output_to_queue() call. The producer doesn't wait for the consumer. It puts data in the queue and moves on. This is decoupling. This is resilience.

**Now, what could go wrong?**

What if an API is down? What if a source fails to respond? The agent tries to fetch and... nothing comes back.

In our simple code above, that would crash. Let's fix it."

[VISUAL: Code update, showing error handling]

```python
def produce(self):
    feedback_items = []
    
    # Step 1: Fetch raw feedback with error handling
    for source in self.sources:
        try:
            raw_feedback = self.fetch_from_source(source)
            feedback_items.extend(raw_feedback)
        except SourceUnavailableError:
            self.log_error(f'Source {source} unavailable, skipping')
            continue  # Keep going, don't crash
        except Exception as e:
            self.log_error(f'Unexpected error from {source}: {e}')
            continue
    
    # If we got NO data from any source, we need to know
    if not feedback_items:
        self.alert('No feedback received from any source')
        return 0
```

See the difference? Now if one source fails, the agent keeps going. It gets what it can from other sources.

If ALL sources fail, it doesn't silently produce nothing. It alerts. The system knows something is wrong.

This is resilience. The agent doesn't break when something goes wrong. It handles it. It keeps going. It tells you about problems.

**More practical detail:**

Real agents also log what they're doing.

```python
def produce(self):
    self.log('Starting feedback production cycle')
    
    feedback_items = []
    for source in self.sources:
        try:
            self.log(f'Fetching from {source}...')
            raw_feedback = self.fetch_from_source(source)
            self.log(f'Got {len(raw_feedback)} raw items from {source}')
            feedback_items.extend(raw_feedback)
        except Exception as e:
            self.log_error(f'Failed on {source}: {e}')
    
    self.log(f'Total raw items: {len(feedback_items)}')
    
    # ... cleaning process ...
    
    self.log(f'Produced {len(structured_feedback)} quality items')
    self.output_to_queue(structured_feedback)
```

Why? Because when something breaks, you need to know what happened. Logging is how you see what's happening. You can trace the data flow. You can debug problems.

A producer that just silently fails? Nightmare. A producer that tells you everything it's doing? Manageable."

[VISUAL: Log output scrolling, showing agent activity]

---

### PART 2: THE CONSUMER AGENT (2:45–4:15) — 840 words

[VISUAL: New code block, consumer agent]

"Now the consumer agent. Same principle, opposite direction.

```python
class FeedbackAnalysisConsumerAgent:
    def __init__(self, queue):
        self.queue = queue  # The queue the producer uses
        self.batch_size = 10
    
    def consume(self):
        # Step 1: Get structured data from queue
        batch = self.queue.get_batch(self.batch_size)
        
        if not batch:
            self.log('No feedback in queue, sleeping')
            return None
        
        self.log(f'Processing batch of {len(batch)} feedback items')
        
        # Step 2: Analyze
        insights = []
        for feedback_item in batch:
            sentiment = feedback_item['sentiment']
            text = feedback_item['text']
            
            # Extract topics, themes, patterns
            topics = self.extract_topics(text)
            urgency = self.assess_urgency(sentiment, topics)
            category = self.categorize(topics)
            
            insight = {
                'feedback_id': feedback_item['id'],
                'topics': topics,
                'category': category,
                'urgency': urgency,
                'sentiment': sentiment,
                'source': feedback_item['source']
            }
            insights.append(insight)
        
        # Step 3: Output to next queue or database
        self.output_insights(insights)
        self.log(f'Analyzed {len(insights)} feedback items')
        return insights
```

**What's happening?**

**Step 1: Get from queue.** The consumer doesn't ask the producer 'Are you ready?' It just checks the queue. Is there data? Pull it. No data? Move on (or sleep).

Notice the batch_size = 10. The consumer pulls in batches. Why? Efficiency. Process 10 at a time rather than one at a time.

**Step 2: Analyze.** This is the consumer's job. It takes the producer's clean data and does something with it. Extracts topics, assesses urgency, categorizes.

**Step 3: Output.** Here's an interesting part. The consumer is also a producer. It outputs insights to another queue or database. It's in the middle of a chain.

This is how multi-agent systems work. Agent B is a consumer of Agent A, and a producer for Agent C.

**What could go wrong with the consumer?**

If the analysis is slow? That's okay. The queue fills up. The producer sees the queue is full, slows down or waits. That's visibility. You know there's a bottleneck.

If the consumer crashes? The queue still has data. You restart the consumer. It picks up where it left off.

But what if the consumer processes something wrong? What if it marks something as 'low urgency' when it should be 'high urgency'?

Let's add validation:

```python
def consume(self):
    batch = self.queue.get_batch(self.batch_size)
    
    if not batch:
        return None
    
    insights = []
    for feedback_item in batch:
        try:
            # ... analysis code ...
            
            # Validate the insight before outputting
            if not self.validate_insight(insight):
                self.log_error(f'Insight failed validation for {feedback_item["id"]}')
                self.queue.mark_failed(feedback_item['id'])
                continue
            
            insights.append(insight)
        except Exception as e:
            self.log_error(f'Error analyzing feedback {feedback_item["id"]}: {e}')
            self.queue.mark_failed(feedback_item['id'])
    
    if insights:
        self.output_insights(insights)
    
    return insights
```

Now if something goes wrong, the consumer doesn't just skip it silently. It marks it as failed. That item goes back in the queue (or to a dead-letter queue). It can be retried, or reviewed manually.

This is error resilience. The system doesn't lose data. It flags problems. You can fix them."

[VISUAL: Code showing error handling, queue visualization showing failed items]

---

### PART 3: ORCHESTRATION & SCALING (4:15–6:30) — 1,290 words

[VISUAL: Diagram showing the two agents connected by queue]

"Okay, so we have a producer and a consumer. How do they actually work together?

```python
# Simple orchestration
producer = FeedbackProducerAgent(['email', 'survey', 'social'])
consumer = FeedbackAnalysisConsumerAgent(queue=producer.output_queue)

# Producer runs continuously
while True:
    producer.produce()
    time.sleep(60)  # Run every minute

# Consumer runs independently
while True:
    consumer.consume()
    time.sleep(30)  # Run every 30 seconds
```

Producer and consumer run on different schedules. Producer might run every minute. Consumer every 30 seconds. They're independent.

If producer is slow? Consumer just waits for data in the queue.
If consumer is slow? Queue builds up. You see it. That's information.

**Now let's talk about scaling. What if you get 10x more feedback?**

The queue fills up faster. The single consumer can't keep up. What do you do?

Simple: add more consumers.

```python
producer = FeedbackProducerAgent(['email', 'survey', 'social'])

# Multiple consumers working on the same queue
consumer_1 = FeedbackAnalysisConsumerAgent(queue=producer.output_queue)
consumer_2 = FeedbackAnalysisConsumerAgent(queue=producer.output_queue)
consumer_3 = FeedbackAnalysisConsumerAgent(queue=producer.output_queue)

# All three pull from the same queue
# Each processes what it pulls
# They work in parallel
```

Each consumer pulls a batch from the queue. They work independently. If one is slow, the others keep going.

The queue distributes work automatically. This is the power of decoupling.

[VISUAL: Show queue with three consumers pulling from it simultaneously]

**What about monitoring?**

You can't just set this up and hope it works. You need to see what's happening.

```python
class QueueMonitor:
    def __init__(self, queue):
        self.queue = queue
    
    def report(self):
        queue_size = self.queue.size()
        age_of_oldest = self.queue.oldest_item_age()
        items_processed = self.queue.processed_count()
        errors = self.queue.error_count()
        
        print(f'Queue size: {queue_size}')
        print(f'Oldest item age: {age_of_oldest} seconds')
        print(f'Items processed: {items_processed}')
        print(f'Errors: {errors}')
        
        if queue_size > 1000:
            alert('Queue backing up, consider adding consumers')
        if errors > 10:
            alert('High error rate, investigate')
```

This gives you visibility. You can see:
- Is the queue growing? (Producer too fast, consumer too slow)
- Are items getting old in the queue? (Consumer is slow)
- Are there errors? (Something is broken)

Real systems have dashboards. You can see these metrics in real-time.

**One more practical thing: error recovery**

What if the consumer crashes mid-process? What if the whole system goes down?

With direct connection: Lost. The data is gone.

With queue-based? The data is still in the queue. You restart the consumer. It picks up where it left off.

```python
# Queue tracks what's been processed
class PersistentQueue:
    def mark_processed(self, item_id):
        # Mark this item as done
        self.db.insert('processed', item_id)
    
    def get_unprocessed(self):
        # Get items that haven't been marked processed
        return self.db.select('items where id NOT IN processed')
```

Even if the consumer crashes, the queue knows what was processed. Restart it, it only processes what's left.

This is resilience. This is why real systems use queues."

[VISUAL: Show queue persistence, crashed consumer restarting, queue recovery]

---

### PART 4: REAL-WORLD SCENARIO (6:30–7:30) — 600 words

[VISUAL: Complex pipeline diagram with multiple stages]

"Let's look at a real scenario: building a product recommendation system.

You have customer data coming in constantly. You need to process it. Analyze it. Update recommendations. In real-time.

This is producer-consumer, but at scale.

**The pipeline:**

Agent 1 (Producer): Customer Activity Ingestion
- Watches user interactions (clicks, purchases, reviews)
- Produces clean, timestamped activity data
- Outputs to Queue 1

Agent 2 (Consumer/Producer): Feature Extraction
- Consumes activity data
- Extracts features (product categories, price range, ratings)
- Produces feature vectors
- Outputs to Queue 2

Agent 3 (Consumer/Producer): Model Inference
- Consumes feature vectors
- Runs ML model
- Produces recommendations
- Outputs to Queue 3

Agent 4 (Consumer): Publishing
- Consumes recommendations
- Updates the database
- Makes recommendations live to the website

[VISUAL: Show each agent, each queue, data flowing through]

Each agent has one job. Each agent produces output that the next agent consumes.

Separate queues between each stage. Why? Because they might run at different speeds.

Agent 1 might produce 1,000 activities per second.
Agent 2 might process 500 features per second.
Queue 1 fills up. That's okay. It means Agent 1 is doing well, Agent 2 has work waiting.

You see the bottleneck. You can optimize Agent 2. Add more instances. Make it faster.

If you had one big agent doing everything? You'd have no visibility into where the bottleneck is. The whole thing would be slow.

**Practical reality:**

This system doesn't start perfect. You build it. You run it. Things fail.

Queue 2 fills up → Agent 2 is slow → Investigate → It's making too many API calls to get features → Optimize → Add caching → Queue shrinks.

Queue 3 fills up → Agent 3 takes too long → It's a large ML model → Add GPUs → Agent 3 faster → Queue shrinks.

Agent 1 crashes on bad data → Add validation → Restart → It's working again.

Each problem is isolated. You fix one agent without affecting the others.

This is the power of producer-consumer architecture. This is why it scales."

[VISUAL: Show optimization steps, queue changes, improvements]

---

### CLOSING & SUMMARY (7:30–8:00) — 180 words

[VISUAL: Summary of concepts, recap animation]

"So here's what we've built:

A producer agent that sources, cleans, and validates data. It outputs to a queue. It doesn't wait. It doesn't know who consumes it. It just produces good data.

A consumer agent that pulls from the queue at its own pace. It analyzes. It validates. It outputs to another queue. It's independent of the producer.

Queue-based connection. Asynchronous. Resilient. Scalable.

And we've seen how this pattern extends to whole systems. Multiple agents in a pipeline, each with one job, each independent.

**Here's what you should remember:**

- Producers create and output. Consumers use and process.
- Queue-based decoupling lets you scale. Add more consumers if the queue backs up.
- Logging and monitoring are not optional. You need visibility.
- Error handling is not optional. Real systems fail. You need to handle failures.
- This pattern works for any system: data processing, video production, recommendations, analysis.

You now know how to design agent systems that scale. Systems that are resilient. Systems that are debuggable.

Next time you're building with agents, think about this pattern. Producer, queue, consumer. Clear boundaries. One job per agent. Resilience through decoupling.

That's how real systems work."

[VISUAL: Fade to end card]

---

## VOICEOVER NOTES

- **Pacing:** Faster when explaining concepts, slower when showing code. Pause after each code block to let it land.
- **Tone:** "We're building together." Practical, not theoretical. "Here's what happens..."
- **Emphasis:** "One job," "queue," "resilient," "monitoring," "logging," "independent"
- **Code:**
  - Read code aloud, don't assume viewers will read it themselves
  - Highlight key lines (error handling, logging, validation)
  - Pause after complex sections
  - "What could go wrong?" → show the problem → show the fix
- **Transitions:** Between code sections, briefly recap what we've built before moving to next part

---

## TIMING REFERENCE

| Section | Start | Duration | Content |
|---------|-------|----------|---------|
| Opening | 0:00 | 0:45 | Hook, scenario setup |
| Producer Agent | 0:45 | 2:00 | Code, explanation, error handling |
| Consumer Agent | 2:45 | 1:30 | Code, explanation, validation |
| Orchestration | 4:15 | 2:15 | Multiple agents, scaling, monitoring |
| Real Scenario | 6:30 | 1:00 | Product recommendations pipeline |
| Closing | 7:30 | 0:30 | Summary, key takeaways |

**Total: 8:00**

---

## VISUAL CUES FOR PRODUCTION

- [VISUAL: Code editor] — Clean, syntax-highlighted
- [VISUAL: Producer code block] — Highlight fetch, clean, output steps
- [VISUAL: Error handling added] — Show before/after code
- [VISUAL: Consumer code block] — Highlight queue pull, analysis, output
- [VISUAL: Queue diagram] — Producer → Queue → Consumer, arrows showing data flow
- [VISUAL: Multiple consumers] — Show 3 consumers pulling from same queue simultaneously
- [VISUAL: Log output] — Scrolling logs showing agent activity
- [VISUAL: Complex pipeline] — 4-agent system with queues between each
- [VISUAL: Queue monitoring dashboard] — Queue size, latency, error rates
- [VISUAL: Optimization flow] — Show problem → diagnosis → optimization → improvement

---

## SCRIPTING STANDARDS COMPLIANCE

✅ **Concept Depth:**
- WHAT: How to build producer-consumer agents with code
- WHY: Queue-based design provides resilience, scalability, visibility
- HOW: Code examples showing producer, consumer, orchestration, error handling, monitoring

✅ **Practical Focus:**
- Error handling (API failures, bad data, crashes)
- Logging and monitoring (visibility into system state)
- Scaling (adding more consumers when queue backs up)
- Recovery (persistent queue, restarting failed agents)

✅ **Real Scenario:**
- Product recommendation system pipeline
- 4-agent system with queues between stages
- Shows how pattern scales to complex systems
- Demonstrates bottleneck visibility and optimization

✅ **Code as Teaching:**
- Code is simplified but real
- Comments explain each step
- Problems introduced, then fixed
- Practical concerns shown (validation, error handling, monitoring)

---

*Script Created: 2026-06-02*  
*Status: Ready for Voiceover Recording*  
*Estimated VO Duration: 8:00*  
*Complexity: High (requires code syntax highlighting, diagrams, animations)*
