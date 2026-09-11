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

### 3b. Interactive Question — the CHECKPOINT beat (Required, effective 2026-09-11)

> **House rule (supersedes the in-video QUESTION → REVEAL of 2026-08-17):** EVERY video MUST contain
> at least one **checkpoint** — one multiple-choice question the learner actually answers. It is
> **never drawn and never spoken.** The video simply **pauses** at that point and the learner's LMS
> shows the question as a popup. Non-negotiable for every new video and every re-cut.

**Why it changed.** The cards taught the answer to a viewer who could not answer, and a video cannot
know whether anyone got it right. Moving the question into the player makes it a real question:
the learner answers, the LMS marks it, and the explanation is written for someone who just chose wrong.

```js
// beats.js — sits BETWEEN two spoken beats, at roughly the two-thirds mark
{ id: '14', mode: 'checkpoint',
  quiz: {
    stem: 'One question about the concept just taught.',
    options: ['…', '…', '…', '…'],          // 3–4 plausible options
    answer: 1,                               // 0-based index
    explain: 'Why that is right — and why the tempting wrong one is wrong.',
  } },
```

- **It occupies zero time.** No voiceover, so no entry in `durations.json`, so no frames. Its position
  in the array *is* the pause point.
- **The pause is always on a sentence boundary.** Every beat is one spoken sentence followed by a short
  trailing pause, so a checkpoint between two beats can never cut into a sentence. Never place one
  first or last — with no sentence either side the API marks `pause.safe: false` and the LMS won't fire it.
- **Write `explain` for the learner who got it wrong.** It is the only feedback they see; the old
  six-word on-screen caption is not good enough and the API now reports `explanationSource: 'missing'`
  when it is absent.
- **Mechanics:** `lib/beats-util.js` `renderable()` filters checkpoints out; `tts-lesson.js`,
  `compile-lesson.js` and `verify.js` all render `renderable(beats)`. Port `lib/beats-util.js` into any
  folder that lacks it. This is format-agnostic — the same beat works in the illustrated and the
  IDE-screencast formats.
- **Delivery:** `server/lib/checkpoints.js` reads `beats.js` + `durations.json` and serves
  `GET /api/v1/videos/:videoId/checkpoints` with `atSeconds` measured **from the start of the delivered
  `_final.mp4`** (brand intro included). Committing `beats.js` and `durations.json` is what publishes a
  question — no separate upload step.
- **Legacy videos** built before this rule still carry their cards on screen; the API reports them as
  `rendersInVideo: true` / `questionStyle: 'on-screen'` so the LMS can choose not to pause over a
  question the video is already answering out loud.

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
- **Every clip must pass `node qa-clips.js` BEFORE compiling** (REQUIRED effective 2026-09-02). It is a
  self-healing gate: detect → repair → verify → reject if unrepairable. Three defects, all found in the
  self-healing module:
  | Defect | Cause | Gate action |
  |---|---|---|
  | **Frozen tail** ("the transition is lagging") | kie returns ONLY 5s or 10s clips, so a 5–7s beat gets 5s and holds its last frame for the remainder. Hit **8 of 18** clips | **Auto-repaired** — retimed with `setpts` to fill the beat (7–24% slowdown is imperceptible, costs no credits) |
  | **Frozen clip** (ssim > 0.985 early vs late) | paid for motion, got a still | Rejected — regenerate |
  | **Morphed / re-framed** (ssim < 0.55) | model rebuilt the scene: subject melted into a blob, or camera zoomed in and cropped the character out | Rejected — regenerate with simpler physical motion, or choose a different beat |
  Prevention at source: `generate-lesson-video-omni.js` now requests a **10s clip for any beat > 4.75s**.
  Pick beats where ONE object moves physically (a stack landing, a hand writing, a slip stopping) — never
  a beat where the model must hold a complex composition together; that is what produces blobs.
- Exempt: IDE-screencast assignment/assessment videos (no character art; i2v does not apply).

---

### 3d. The Evals-Grade Visual Standard (Required, effective 2026-08-21)

> **Rule:** Every video's visuals are built the way the **evals series** built them — a concrete place,
> a real device, full scenes, and numbers on screen. Established after Aroma rejected self-healing v01
> ("the visuals are not great", "why is the helper a blob of glow"). **This is the DEFAULT for every
> video from now on, unless she asks for something else.**
> Enforced mechanically by `node qa-visuals.js` (exit 2 on violation) — run it BEFORE spending on art.

**The six rules**

| # | Rule | What it means |
|---|------|---------------|
| 1 | **Persistent concrete setting** | Define ONE physical place as a const (`SHOP`, `STALL`, `DESK`) and repeat it in **every** `scene` prompt — "in Ali's small tidy shop, tall wooden shelves of neatly stacked parcels and tins, a polished counter with a large open paper ledger, a brass desk lamp, a wooden filing drawer". **Never** an abstract "room with soft rounded walls". |
| 2 | **The AI is a real device** | An open **laptop** (or phone/tablet) with a **plain blank screen** — the evals `DESK` convention. **Never** a glowing orb / ball of light / blob. The AI's actual output is crisp HTML (`screen`, `answers`, `promptcard`), never baked into the art. |
| 3 | **Scene-led** | **≥28%** of beats are `scene` (full illustration + Ken Burns). Narrative beats belong in the real place, not floating on cream. |
| 4 | **At most 2 plain text cards** | `statement` is for the opening idea and maybe one pivot. Everything else earns a data visual. |
| 5 | **Real data on screen** | **≥3 distinct** data templates (`bignum`, `bars`, `tally`, `piles`, `gauge`, `grid`, `scoresheet`, `answers`, `screen`, `twocard`, `spectrum`, `checks`) **and real numbers** — the story must carry countable stakes (quantities, money, time, a before/after). |
| 6 | **Physical actions in scenes** | A scene shows something being **done** — held, written, dropped, lifted, pulled open — not merely an expression. |

**Storytelling shape that goes with it** (the evals spine, proven on the mango crate and the ledger):
one protagonist, in one place, with one physical object that carries the concept · a concrete
**cost** when it goes wrong (Ali: 14 unpaid orders, 62,400 rupees, 3 weeks late) · the fix applied to
that same object · a **measured** before/after (0 → 14) so the payoff is a number, not a claim.

Reference implementations: `explainer-videos/self-healing/self-healing-01-fixes-its-own-mistakes/beats.js`
(ledger + laptop) and `explainer-videos/evals/evals-01-check-more-than-one/beats.js` (mango crate + tally).
Exempt: IDE-screencast assignment/assessment videos (no character art) — `qa-visuals.js` skips them.

**Rule 7 — the art itself must be inspected (`node qa-art.js`, REQUIRED effective 2026-08-21).**
`qa-visuals.js` reads the SCRIPT; it cannot see what the image generator actually drew. A vision judge
must check every `art/*.png` BEFORE any TTS or render, and the build fails on:
impossible hands (thumb on the wrong side, palm/back confused, a wrist that does not connect) ·
wrong finger counts · merged, duplicated or floating limbs · broken or asymmetric faces ·
an object sliced in half · **any readable text, number or LOGO** (the art must be textless and
unbranded — draw props as "plain unbranded", with "no logo, badge or emblem").
Established after Aroma spotted an anatomically flipped hand in self-healing v02 beat 05; the first
run of the new gate also found a real **Apple logo** baked into the laptop in four beats, which no
script-level check could ever have caught. Advisory WARN for an expression that reads clearly angrier
or sadder than the beat intends. See memory `feedback_art_vision_gate`.

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
- [ ] **CHECKPOINT beat present** — one `{mode:'checkpoint', quiz:{stem, options, answer, explain}}` beat between two spoken beats (never first or last), 3–4 options, valid 0-based `answer`, and an `explain` written for the learner who chose wrong. Nothing about it is drawn or spoken. (Required in EVERY video.)
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

*Last verified: 2026-09-11 — §3b replaced: the in-video QUESTION → REVEAL pair becomes a non-rendered CHECKPOINT beat; the player pauses and the LMS asks.*
