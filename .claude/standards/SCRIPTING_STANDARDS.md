---
type: standards
last_verified: 2026-06-19
owner: aroma
---

# Scripting Standards

Requirements for all script generation (voiceover, video narration, explainer content).

## Core Requirement: Concept Depth via a Single Protagonist Story

> **House style (effective 2026-06-19):** scripts teach a concept by following **ONE named
> protagonist through ONE running scenario**, going *deep* — not by listing several short
> examples from different domains. Depth now comes from staying with one person across the
> whole lifecycle of the concept (the pain → the fix → the structure → the failure mode →
> the payoff), not from breadth. This **supersedes** the old "3+ diverse examples" rule.
> See [feedback_scripting_standards](../../memory/feedback_scripting_standards.md).


Every script MUST demonstrate genuine conceptual understanding through:

### 0. Research-Grounded — Web-First (Non-Negotiable)

Before drafting, the writer MUST research the topic on the web (via the `writing-explainer-scripts`
skill's Step 0). Two tracks: (a) **latest accurate facts** on the topic, and (b) the **best proven
techniques for teaching it** (analogies, worked examples, common misconceptions). Produce a cited
`research.md` (verified facts with source URLs + dates, best analogy, misconceptions to pre-empt,
current numbers/tool names). The script's metaphor, failure-mode beat, and any on-screen numbers MUST
trace to that brief. Never script a topic from memory alone — facts must be current and sourced.

### 1. Concept Depth (Non-Negotiable)

- **Define the core principle explicitly** — don't assume learners know it
- **Explain the WHY** — not just WHAT the concept is
- **Show the mechanism** — how does this principle work under the hood?
- **Identify common patterns** — what would learners recognize this pattern in?

**❌ Shallow:**
"Variables store data. You can use them to hold numbers or text."

**✅ Deep:**
"Variables are named containers that let you refer to data by a meaningful label instead of remembering its location in memory. This matters because it makes code readable and reusable — imagine if you had to remember 50 memory addresses instead of using names like `student_score` or `course_title`. When you change what's stored in a variable, everywhere you use that label automatically gets the new value."

### 2. Single Protagonist Story (Required)

Teach the concept through **ONE named, invented protagonist** living **ONE concrete scenario**,
followed in depth for the whole script. Do **not** list 3 short examples from different domains.

**Rules for the protagonist:**
- **One character, ALWAYS named "Ali", generic role** — e.g. "Meet Ali. Ali is a statistician at a
  research lab." The protagonist's name is **always Ali** (never Bilal or any other name), for any
  example in any video. Give Ali a real job and a recurring task. **Never use a real colleague's name.**
- **One scenario, carried the whole way through** — the same person and task illustrate every part
  of the concept. Don't switch to a factory, then a hospital, then a kitchen.
- **Go deep, not wide** — walk the protagonist through the concept's full arc: the friction they
  feel → the fix → each part of the structure shown *on their concrete task* → the failure mode they
  nearly hit → the payoff. This depth is what replaces breadth.
- **Continuity across a series** — when a week has multiple videos, keep the *same* protagonist across
  all of them so the story compounds (Ali in V1 builds a skill, in V2 learns skills-vs-agents, etc.).
- **Taleemabad** is no longer required as a "final example." The protagonist may inhabit a
  Taleemabad-flavoured task, but the teaching rides on the character's story, not a tacked-on case.

**❌ Wrong (multiple shallow domain examples):**
"Retail: a chain standardized restocking and errors fell 40%. Healthcare: a hospital issued one
blood-draw protocol and rejections dropped. Taleemabad: you turn a recording into a summary..."

**✅ Correct (one protagonist, deep):**
"Meet Ali, a statistician. Every Monday a new dataset lands on his desk... [we follow Ali feeling the
pain of re-explaining the task, writing his first skill file, naming it, listing the steps, nearly
bundling too much into one file, and sharpening it the next week]." One person, one task, full depth.

### 3. Structural Pattern for Scripts

**Lead with the answer (Pyramid):** State the takeaway in the first line.
```
"The fastest way to [outcome] is to [the one move]. Lead with that — everything else follows."
```

**Meet the protagonist:** Introduce the one character + their recurring task.
```
"Meet [Name]. [Name] is a [generic role] who, every [cadence], has to [recurring task]."
```

**Friction → Question:** Show the pain in their world, then the question that unlocks the concept.
```
"So every week [Name] [does the painful thing]... until they stop and ask: [the key question]."
```

**Mechanism, shown on their task:** Explain how the concept works *using the protagonist's scenario*,
including each structural part and the common failure mode they nearly hit.

**Consolidation + handoff to the learner:** Return to the principle, then turn it on the viewer.
```
"So here's your move: [reflection prompt applied to the learner's own work]."
```

### 3b. Interactive Question — QUESTION → REVEAL (Required, effective 2026-08-17)

> **House rule (effective 2026-08-17):** EVERY video MUST contain an in-video interactive
> **QUESTION → REVEAL** pair, so the audience actively answers before being told, and feels engaged.
> Established on the autonomy series ([interactive_quiz_card](../../memory/interactive_quiz_card.md)).
> This is non-negotiable and applies to every new video and every re-cut.

- **The QUESTION beat** poses one multiple-choice question about the concept just taught, with
  3–4 plausible options, and a `note` like "Write your answer down." It uses `holdAfter` (≈6s) so the
  video pauses long enough for the viewer to actually answer.
- **The REVEAL beat** comes a few beats later: the same stem + options, now with the correct `answer`
  marked and a one-line `note` explaining why.
- Place the QUESTION at roughly the two-thirds mark (after the concept is taught, before the payoff),
  and the REVEAL shortly after so the loop closes inside the video.
- Mechanics (explainer pipeline): use the `info` template `quiz`.
  - QUESTION: `{ id, mode:'info', holdAfter:6, vo, cap, info:{ tpl:'quiz', data:{ stem, options:[…], note:'Write your answer down.' } } }`
  - REVEAL:   `{ id, mode:'info', vo, cap, info:{ tpl:'quiz', data:{ stem, options:[…], answer:<index>, note:'…why…' } } }`
  - Requires `T.quiz` in `animation/info.js`, the `.quiz*` styles in `animation/info.css`, and the
    `+ (b.holdAfter||0)` term in `tts-lesson.js`'s pause calc. Port these into any folder that lacks them.
- For non-`info` formats (e.g. the Claude Code IDE-screencast assessment), pose the QUESTION and
  REVEAL as two `card`/screen beats that carry the same "answer first, then reveal" structure.

---

### 3c. Animation at the Story Points — omni i2v (Required, effective 2026-08-17)

> **Rule:** Every video moves in every beat (Ken Burns / cutout-puppet / evolving infographics), AND
> **2–4 beats carry real generated motion** because movement genuinely helps the teaching there.
> Established on the autonomy + evals series ([feedback_use_animations](../../memory/feedback_use_animations.md)).

- **Pick the beats while writing the script, not after.** The script author names them; the gate
  (`reviewing-explainer-scripts`) hard-fails a script that doesn't.
- **Choose beats where motion teaches**, not beats where motion decorates:
  - an emotional turn (the protagonist's realisation, the moment it goes wrong),
  - a metaphor coming alive (the thing the whole video hangs on),
  - the closing invite (the last beat, so the video doesn't end on a still).
  A static definition or a list beat does **not** get i2v — an evolving infographic already moves.
- **Declare them** at the bottom of `beats.js`:
  `module.exports.animateIds = ['04','12','22'];  // i2v story beats`
- **Generate with omni** (paid, kie-gated, confirm spend):
  `ART_IDS=04,12,22 node generate-lesson-video-omni.js --yes` → `clips/<id>.mp4`.
  `compile-lesson.js` uses a clip automatically when present and **falls back to Ken Burns** when it
  isn't — so a credit-out never blocks the render, it just quietly costs the motion.
- **Two modes, always ask first** ([feedback_omni_two_modes](../../memory/feedback_omni_two_modes.md)):
  full i2v animation vs camera-pan on stills. Ali must stay consistent in either.
- Exempt: IDE-screencast assignment/assessment videos (no character art; i2v does not apply).

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
- [ ] **Single protagonist** — is there ONE named, invented character (not a real colleague) carrying the whole script?
- [ ] **One scenario, deep** — does the script stay in that character's situation the whole way (no domain-hopping)?
- [ ] **Full concept arc** — do we see the friction → fix → structure → failure mode → payoff on the protagonist's task?
- [ ] **Continuity** — in a series, is it the same protagonist across videos?
- [ ] **No jargon without definition** — are technical terms explained when first introduced?
- [ ] **Plain language** — can a 12-14 year old understand the core explanation?
- [ ] **Emotional acknowledgment (2+ moments)** — does the script normalize confusion early and reassure at technical peaks?
- [ ] **Interactive QUESTION → REVEAL present** — is there an in-video multiple-choice question (with `holdAfter` so the viewer can answer) AND a matching reveal a few beats later? (Required in EVERY video.)
- [ ] **No shaming language** — are words like "obviously," "as you know," "simple," or "just" avoided?

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Lists several short examples from different domains | Collapse into ONE protagonist + ONE scenario, followed in depth |
| Switches characters/contexts mid-script (factory → hospital → kitchen) | Keep the same person and task throughout |
| Uses a real colleague's name | Use an invented persona + generic role (e.g. "Ali, a statistician") |
| Protagonist named but concept stays abstract | Show every structural part *on the protagonist's concrete task* |
| Story skips the hard parts | Include the friction they feel and the failure mode they nearly hit |
| Different protagonist each video in a series | Reuse the same protagonist so the story compounds |
| Concept stated but not explained | Add WHY + HOW before the story arc |
| Script goes technical without emotional buffer | Add normalizing phrase before complexity; add slow-down signal at peak |
| Uses "obviously," "simply," "as you know," "just" | Replace with "here's how it works" or "let's look at this together" |

---

## Script Review Criteria

When reviewing scripts, ask:

1. **Depth:** Does this explain the concept's core mechanism, or just name it?
2. **Protagonist:** Is there ONE named, invented character (not a real colleague) carrying the whole script?
3. **One scenario, deep:** Does the script stay in that character's situation — friction, fix, structure, failure mode, payoff — without domain-hopping?
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

*Last verified: 2026-08-17 — added the required in-video QUESTION → REVEAL interactive beat (§3b).*
