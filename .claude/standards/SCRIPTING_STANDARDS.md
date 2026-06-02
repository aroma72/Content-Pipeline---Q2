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

## Validation Checklist

Before finalizing any script, verify:

- [ ] **Concept defined explicitly** — could a person unfamiliar with this topic understand the core principle?
- [ ] **WHY explained** — does the script say why this concept matters?
- [ ] **Mechanism shown** — can the learner see how it actually works?
- [ ] **3+ diverse examples** — are examples from different industries/domains, not just ed-tech?
- [ ] **Taleemabad context last** — is the course example the final example, not the only one?
- [ ] **No jargon without definition** — are technical terms explained when first introduced?
- [ ] **Plain language** — can a 12-14 year old understand the core explanation?

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| "This is how Taleemabad uses it..." (only example) | Add 3 examples from other domains first |
| Concept stated but not explained | Add WHY + HOW section before examples |
| Examples all from tech/ed | Pick from manufacturing, healthcare, sports, cooking, etc. |
| Learner can't see the mechanism | Add step-by-step breakdown or visual sequence |
| Examples too similar | Vary domain AND context (factory ≠ hospital ≠ kitchen) |

---

## Script Review Criteria

When reviewing scripts, ask:

1. **Depth:** Does this explain the concept's core mechanism, or just name it?
2. **Examples:** Are there 3+ examples from different industries?
3. **Context:** Is Taleemabad one of many examples, not the primary one?
4. **Clarity:** Could someone with no background understand this?

---

*Last verified: 2026-06-02*
