---
type: standards
last_verified: 2026-06-03
owner: aroma
---

# Video Scripting Best Practices

**Research-backed principles for educational video content design.**

Built on cognitive load theory, multimedia learning principles, and instructional design best practices.

---

## Core Principles

### 1. Cognitive Load Management — Don't Overwhelm

**The Problem:**  
Human working memory can hold only 5-9 pieces of information at once. When slides are text-heavy AND narration is verbose, learners experience competing cognitive demands.

**The Solution:**  
- **Slides:** Keywords, visuals, diagrams (minimal text)
- **VO:** Explanation, context, elaboration (deeper detail)
- **Never both:** Don't read slides aloud; don't make slides redundant with VO

✅ **Correct — Using both channels effectively:**
- Slide shows: "Agents have 3 parts: Input → Reason → Output"
- VO explains: "The agent first receives input from the user. Then it reasons through what to do using its instructions. Finally, it produces output."

❌ **Wrong — Competing cognitive demands:**
- Slide: "Agents receive input, reason about it, and produce output. They are designed to solve problems by following a sequence of steps."
- VO: "Agents receive input... [repeats everything]"

**Research Source:** [Cognitive Load Theory in eLearning](https://www.soundidea.co.za/cognitive-load-theory-in-elearning-lms-instructional-design/), [Effects of Cognitive Load in Video Production](https://teaching-resources.delta.ncsu.edu/applying-cognitive-load-theory-to-multimedia-in-your-class/)

---

### 2. Temporal Contiguity — Sync Visual & Audio in Time

**The Principle:**  
Words and visuals should be presented simultaneously, not sequentially. Learners learn better when they see and hear related information at the same moment.

**Application:**
- Key term appears on slide **as** VO says it
- Animation progresses **as** VO explains each step
- Diagram reveals progressively **synchronized** with narration

✅ **Good Sync:**
- Slide shows 3 boxes labeled "Input | Reason | Output"
- VO: "First, Input..." (point to first box)
- VO: "Second, Reason..." (point to second box)
- VO: "Third, Output" (point to third box)

❌ **Bad Sync:**
- All 3 boxes appear at once on slide
- VO explains them one at a time while learner is confused about where to look

**Research Source:** [Temporal Contiguity Principle - Multimedia Learning](https://www.kognitivo.net/p/multimedia-principles)

---

### 3. Redundancy Principle — Graphics + Narration > Graphics + Narration + Text

**The Rule:**  
People learn better from **graphics + narration** alone, NOT graphics + narration + on-screen text.

Why? On-screen text competes with narration for attention, creating cognitive overload.

✅ **Best:** 
- Slide: [Clear diagram/image]
- VO: "Here's how it works..."

⚠️ **Acceptable (if necessary):**
- Slide: [Diagram + key term label only]
- VO: "This is called an agent..."

❌ **Avoid:**
- Slide: [Diagram + long paragraph of explanatory text]
- VO: "Let me read this explanation to you..."

**Research Source:** [Key Design Considerations for Effective Audio and Video](https://teachers.institute/designing-courseware/effective-audio-video-educational-design/), [Multimedia Principles](https://www.lifescied.org/doi/10.1187/cbe.16-03-0125)

---

### 4. Segmentation Principle — Let Learners Control Pacing

**The Principle:**  
Learners absorb better when they control the pace of segments, rather than watching one continuous block.

**Application for Video Scripts:**
- Chunk content into 1-3 minute segments
- Use clear transitions/breaks between topics
- Include pauses that signal "take a moment to absorb"
- In narration: "Let's look at this more closely" = permission to pause/rewind

✅ **Segmented Approach:**
- Segment 1: "What is an Agent?" (1 min)
- Segment 2: "How Agents Think" (1.5 min)
- Segment 3: "Building Your First Agent" (1.5 min)

❌ **One Long Block:**
- One 10-minute video covering all of the above at once = cognitive overload

**Research Source:** [Segmentation Effect in eLearning](https://pdfs.semanticscholar.org/7344/400aeb3e90df44ed74f61b24225b0e97cfc0.pdf), [Cognitive Load Theory Application](https://www.uky.edu/~gmswan3/544/Cognitive_Load_&_ID.pdf)

---

### 5. Worked Examples — Show Before Asking to Do

**The Principle:**  
Novice learners learn better from seeing a worked example first, then attempting a task themselves. Don't ask them to struggle alone.

**Application:**
- First video: "Here's how you build an agent (step-by-step walkthrough)"
- Second video: "Now you try building one (with guided prompts)"
- Not: "Go build an agent yourself (no guidance)"

✅ **Correct Sequence:**
1. Show a complete example (agent architecture walkthrough)
2. Explain each part (VO goes deep)
3. Show a second example from a different domain (reinforce pattern)
4. Then ask learner to apply the pattern to their own problem

❌ **Wrong Sequence:**
1. Teach the concept in theory
2. Immediately ask: "Now build your own agent"
3. Learner has no template and gets overwhelmed

**Why it Matters:**  
Novice learners working from memory alone will randomly generate solutions, which overloads working memory. Worked examples give them a mental schema to build on.

**Research Source:** [Worked Examples Effect](https://link.springer.com/article/10.1007/s10648-019-09465-5), [Cognitive Architecture and Instructional Design](https://educationaltechnology.net/cognitive-load-theory-principles-learning-processes-and-implications-for-instructional-design/)

---

## Practical Script Structure

### Step 1: Determine Your Worked Example

Before writing, decide: "What specific thing will I show learners how to do?"

✅ "How to build an agent that summarizes emails"  
❌ "The theory of agents" (too vague)

### Step 2: Design Slides (Visuals First)

**Slide Design Rules:**

- **One idea per slide** (not 5 ideas on one slide)
- **Conduct 5-second test:** Show slide for 5 seconds, ask what it says. If person can't answer, redesign.
- **Use visuals, not text:** Diagrams, icons, flowcharts, images (not paragraphs)
- **Key terms only:** If text is needed, just the term + label (1-3 words)
- **Visual hierarchy:** Biggest/boldest = most important idea
- **White space:** Generously separate elements

**What Each Slide Should Show:**
- Main visual (diagram, flowchart, screenshot, image) — 70% of slide
- One key concept/term — 20%
- Supporting visual (icon, number) — 10%

### Step 3: Write VO Script (Audio Explanation)

**VO Script Rules:**

- **Explain the slide, don't repeat it** — Slide shows "3 parts: Input, Reason, Output" → VO explains each part in detail
- **Use pausing:** "Let's slow down here. [PAUSE] The first part is input..."
- **~130 words per minute** of video (adjust for your speaking pace)
- **Mentor tone:** Include 1-2 moments of emotional acknowledgment per segment
- **Clear transitions:** "Now, let's look at the second part..."

**VO Structure:**
1. **Introduce** (1-2 sentences): "Today we're looking at how agents reason. This matters because..."
2. **Show worked example** (main body): Walk through step-by-step with visuals
3. **Point out the pattern** (consolidation): "Notice how at each step..."
4. **Pause for absorption** (pacing): "Take a moment with that idea."

### Step 4: Calculate Pacing

**Time per slide:** 3-5 seconds minimum

**Formula:**
```
Slide Duration = (# of words in VO) / (words per minute spoken) × 60

Example:
VO script for slide: "The agent receives input from the user. This could be a question, an image, or text."
Word count: 22 words
Speaking pace: 130 words/min
Duration = (22 / 130) × 60 = 10 seconds ✓ (fits 5-10 sec range)
```

If VO is too long for slide duration:
- **Option A:** Add more slides (split the VO across 2-3 slides)
- **Option B:** Cut VO words (make explanation more concise)
- **Option C:** Slow down VO delivery (130 → 110 wpm)

### Step 5: Add Pacing Signals in VO

Signals that tell learners "this is important" or "take time here":

✓ "Let's slow down here..."  
✓ "Notice how..."  
✓ "Take a moment with this..."  
✓ "Here's the key part..."  
✓ "I want to make sure this lands..."  

Without signals, even well-paced content feels rushed.

---

## Validation Checklist

Before finalizing any video script:

- [ ] **Slides have minimal text** — mostly visuals/diagrams, maybe 1-3 keywords per slide
- [ ] **5-second test passes** — person can identify main idea in 5 seconds
- [ ] **VO explains slides, doesn't repeat them** — VO goes deeper into what's shown
- [ ] **Temporal sync** — key terms appear on screen as VO says them
- [ ] **Pacing calculated** — each slide has 3-5 seconds or more based on VO word count
- [ ] **Pacing signals included** — at least 2 per 3-minute segment ("Let's slow down...", "Notice how...")
- [ ] **Segmented** — video is 1-3 minutes max per segment (not 10 minutes straight)
- [ ] **Worked example shown** — learner sees an example completed before being asked to do one
- [ ] **Redundancy avoided** — no paragraph of text on slide while VO reads it aloud
- [ ] **Mentor tone present** — 2+ emotional acknowledgments (normalize, anchor, pace, celebrate)

---

## Common Mistakes & Fixes

| Mistake | Why It Fails | Fix |
|---------|-----------|-----|
| Text-heavy slides + verbose VO | Cognitive overload; learner doesn't know where to focus | Use visuals on slides, explanations in VO only |
| All info appears at once | Overwhelms learner; no visual progression | Reveal progressively, synchronized with VO |
| Fast narration with fast slide changes | Learner can't process; feels rushed | Slow VO delivery; add pauses; increase slide duration |
| Long paragraphs on slides | Competes with VO for attention (Redundancy Principle) | Use just keywords/labels; full explanation goes in VO |
| One 15-minute video | Exceeds working memory capacity | Segment into 1-3 min chunks |
| Shows concept but no worked example | Learner has no template to build from | Always show a complete example first |
| No mentor tone, just facts | Learners new to AI feel overwhelmed/alone | Add "Let's slow down here", "This is the hardest part", etc. |

---

## Research Summary

These practices are grounded in:
- **Cognitive Load Theory:** Minimize extraneous processing; optimize essential processing
- **Multimedia Learning Principles:** Use both visual & auditory channels effectively
- **Temporal Contiguity:** Present related info simultaneously
- **Redundancy Principle:** Graphics + narration > graphics + narration + text
- **Segmentation Principle:** Learner-controlled chunks > continuous blocks
- **Worked Examples Effect:** Show examples before asking learners to try

---

## Sources

- [Cognitive Load Theory in eLearning](https://www.soundidea.co.za/cognitive-load-theory-in-elearning-lms-instructional-design/)
- [Teaching Resources: Cognitive Load in Video](https://teaching-resources.delta.ncsu.edu/applying-cognitive-load-theory-to-multimedia-in-your-class/)
- [Multimedia Learning Research](https://www.kognitivo.net/p/multimedia-principles)
- [Audio & Video Educational Design](https://teachers.institute/designing-courseware/effective-audio-video-educational-design/)
- [Effective Educational Videos](https://www.lifescied.org/doi/10.1187/cbe.16-03-0125)
- [Cognitive Architecture & Instructional Design](https://link.springer.com/article/10.1007/s10648-019-09465-5)
- [Segmentation Effect](https://pdfs.semanticscholar.org/7344/400aeb3e90df44ed74f61b24225b0e97cfc0.pdf)

---

*Last verified: 2026-06-03*
