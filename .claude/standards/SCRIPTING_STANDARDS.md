---
type: standards
last_verified: 2026-06-02
owner: aroma
---

# Scripting Standards

Requirements for all script generation (voiceover, video narration, explainer content).

## Core Requirement: Concept Depth & Diverse Examples

Every script MUST demonstrate genuine conceptual understanding through:

### 1. Concept Depth (Non-Negotiable)

- **Define the core principle explicitly** — don't assume learners know it
- **Explain the WHY** — not just WHAT the concept is
- **Show the mechanism** — how does this principle work under the hood?
- **Identify common patterns** — what would learners recognize this pattern in?

**❌ Shallow:**
"Variables store data. You can use them to hold numbers or text."

**✅ Deep:**
"Variables are named containers that let you refer to data by a meaningful label instead of remembering its location in memory. This matters because it makes code readable and reusable — imagine if you had to remember 50 memory addresses instead of using names like `student_score` or `course_title`. When you change what's stored in a variable, everywhere you use that label automatically gets the new value."

### 2. Diverse Examples (Required)

Scripts must include examples from AT LEAST 3 different domains, **never only ed-tech or Taleemabad context**.

**Example domains to choose from:**
- Manufacturing / supply chain
- Healthcare / medical diagnosis
- Finance / banking
- Sports / fitness
- Cooking / culinary
- Architecture / construction
- Music / audio production
- Transportation / logistics
- Agriculture / farming
- Retail / e-commerce
- Environmental science
- Social dynamics / psychology
- Mechanics / physics

**❌ Wrong (only ed-tech examples):**
"Conditional logic is used in Learning Management Systems to decide which module students see based on their test scores."

**✅ Correct (3+ diverse domains):**
"Conditional logic decides what happens next based on a condition. In a medical diagnosis system, if blood pressure > 140, the alert is 'hypertension risk.' In a restaurant kitchen, if order size > 50, the chef switches to batch prep instead of individual plates. In a factory, if temperature > 90°C, the cooling system activates. In a Taleemabad course, if quiz_score ≥ 80%, unlock next lesson. Same principle, different contexts."

### 3. Structural Pattern for Scripts

**Header:** Name the concept + state its purpose
```
"Today we're exploring [CONCEPT]. This matters because [WHY]."
```

**Mechanism:** Explain how it works
```
"Here's how [CONCEPT] works: [STEP 1] → [STEP 2] → [RESULT]"
```

**Diverse Examples (3+):** Show in unrelated contexts
```
"You see this in [Domain 1]: [example]
You see it in [Domain 2]: [example]  
You see it in [Domain 3]: [example]
And in Taleemabad: [example]"
```

**Consolidation:** Bring learner back to the principle
```
"So at its core, [CONCEPT] is about [PRINCIPLE]. When you encounter [SIGNAL], you'll know to [ACTION]."
```

---

## 4. Mentor Tone & Emotional Pacing

Scripts for learners new to AI often hit moments of difficulty. Your tone should acknowledge this and keep them feeling supported, not overwhelmed.

**Rule:** Every script must include at least 2 moments of emotional acknowledgment:
- **One early** (normalize the unfamiliar before diving in)
- **One at a technical peak** (reassure before or after complexity)

### 5 Mentor Tone Techniques

**1. Normalize confusion upfront**  
Before introducing anything technical, acknowledge that the learner is stepping into unfamiliar territory. This is expected, not a failure.

✓ "If you've never thought about this before, that's completely fine — most people haven't."  
✓ "This might sound abstract at first. Stick with me."

**2. Anchor to what they already know**  
Connect new concepts to experiences the learner already has. Adult learners respond powerfully when their prior experience is validated.

✓ "You already do a version of this every day when you..."  
✓ "Think about the last time you decided whether to..."

**3. Pace through complexity**  
At technical peaks, slow down and signal it explicitly. Don't rush past hard parts.

✓ "Let's slow down here — this is the part that trips people up."  
✓ "This is where it gets a little more precise. Take a breath."

**4. Celebrate small wins**  
After a hard concept lands, acknowledge that the learner has just crossed a threshold.

✓ "If that clicked, you've just understood something most people never think to ask."  
✓ "That's actually the hardest part. Everything else builds on this."

**5. Never shame the gap**  
Avoid phrasing that implies the learner should already know this, or that the concept is "simple" or "obvious."

✗ "Obviously, agents work by..."  
✗ "As you probably know..."  
✓ "Here's how it actually works..."  
✓ "Let's look at what's really going on under the hood."

---

## Validation Checklist

Before finalizing any script, verify:

- [ ] **Concept defined explicitly** — could a person unfamiliar with this topic understand the core principle?
- [ ] **WHY explained** — does the script say why this concept matters?
- [ ] **Mechanism shown** — can the learner see how it actually works?
- [ ] **3+ diverse examples** — are examples from different industries/domains, not just ed-tech?
- [ ] **Taleemabad context last** — is the course example the final example, not the only one?
- [ ] **No jargon without definition** — are technical terms explained when first introduced?
- [ ] **Plain language** — can a 12-14 year old understand the core explanation?
- [ ] **Emotional acknowledgment (2+ moments)** — does the script normalize confusion early and reassure at technical peaks?
- [ ] **No shaming language** — are words like "obviously," "as you know," "simple," or "just" avoided?

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| "This is how Taleemabad uses it..." (only example) | Add 3 examples from other domains first |
| Concept stated but not explained | Add WHY + HOW section before examples |
| Examples all from tech/ed | Pick from manufacturing, healthcare, sports, cooking, etc. |
| Learner can't see the mechanism | Add step-by-step breakdown or visual sequence |
| Examples too similar | Vary domain AND context (factory ≠ hospital ≠ kitchen) |
| Script goes technical without emotional buffer | Add normalizing phrase before complexity; add slow-down signal at peak |
| Uses "obviously," "simply," "as you know," "just" | Replace with "here's how it works" or "let's look at this together" |

---

## Script Review Criteria

When reviewing scripts, ask:

1. **Depth:** Does this explain the concept's core mechanism, or just name it?
2. **Examples:** Are there 3+ examples from different industries?
3. **Context:** Is Taleemabad one of many examples, not the primary one?
4. **Clarity:** Could someone with no background understand this?
5. **Tone:** Does the script acknowledge difficulty and reassure the learner at hard moments? Are there at least 2 emotional checkpoints?

---

## 5. Visual-Audio Sync & Pacing

For video scripts, slides and voiceover must align. Learners with little AI background need visual anchors + audio explanation, not conflicting information.

**📖 For comprehensive best practices:** See [VIDEO_SCRIPTING_BEST_PRACTICES.md](VIDEO_SCRIPTING_BEST_PRACTICES.md) — research-backed principles for cognitive load, multimedia learning, temporal sync, and pacing.

### Rule: Same Content, VO Goes Deeper

**Slides and VO must show the same content.** VO can explain in more detail, but NOT about a different topic.

✅ **CORRECT — Same content, VO deeper:**
- Slide: "Agents have 3 parts: input, reasoning, output"
- VO: "Agents receive input from users. They reason through what to do — this is where they run your instructions or make decisions. Then they produce output."

❌ **WRONG — Different topics:**
- Slide: "Agents have 3 parts"
- VO: "Now let's talk about deploying agents to production..." (completely different topic)

### Pacing Guidelines

**Minimum screen time per slide:** 3-5 seconds

**VO word count rule:** ~130 words ≈ 60 seconds of speech
- Count VO words for each slide
- If VO is 200 words but slide only shows 3 seconds, VO is too fast
- Solution: Add more slides OR slow down VO delivery

**Pause signals:** Use moments of silence or signaling phrases to give learners time to absorb
- "Let's slow down here..."
- "Notice how..."
- "Here's the key part..."
- (Optional: 1-2 second pause in VO)

### Script Structure for Video Content

**Step 1: Write slide text first** (concise, visual)

**Step 2: Write VO script second** (explains the slide, elaborates, but stays on topic)

**Step 3: Validate sync**
- Does VO answer/expand on what's on screen?
- Does VO wander into a different topic?
- If yes: either add it to the slide or remove it from VO

**Step 4: Verify pacing**
- Count VO words
- Calculate if they fit in the planned slide duration
- Adjust slide count or VO speed if needed

### Validation Checklist for Video Scripts

- [ ] Each visual slide/scene has 3-5 seconds minimum
- [ ] VO explains the SAME topic as its corresponding slide
- [ ] When VO goes deeper, it's still on-topic (not wandering)
- [ ] No section feels rushed (learner can follow without rewinding)
- [ ] Pacing has deliberate pauses between ideas, not constant speech

---

*Last verified: 2026-06-02*
