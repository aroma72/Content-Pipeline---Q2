# Educational Animation Image Generation Skill
*Invocation: `/animate`, `/anim-gen`, or `/generate-frames`*
*Last updated: 2026-05-20*

---

## What This Skill Does

Generates hand-drawn educational animation frames via Kie.ai in the **School of Life** aesthetic — warm, textural, emotionally intelligent illustrations perfect for complex topic explanations.

The workflow is always:
```
Define animation scenes (prompt + sequence) → Generate illustrated frames via Kie.ai
→ Animate with Remotion (parallax, transitions, text overlays)
→ Create narrative-driven educational video
```

This is **not** explainer-style flat design. It's intimate, illustrated storytelling with depth, texture, and emotional resonance.

---

## Visual Style: School of Life Educational Aesthetic

Hand-drawn, textural illustrations with warm color palettes. Characters, scenes, and concepts are rendered with organic shapes, soft shadows, and emotional clarity. Perfect for topics requiring nuance: curriculum overview, domain explanations, technical setups framed through human narrative.

### Core Style Definition

```js
const SCHOOL_OF_LIFE_STYLE = `
Hand-drawn educational illustration style inspired by School of Life.
Warm, textural aesthetic with organic shapes and soft line work.
Color palette: warm cream (#F5F1E8), soft terracotta (#C97757), sage green (#9CAF88),
warm gray (#A89F94), dusty blue (#5B6E7F), soft gold (#D4A574).
Textured paper background with visible brushwork and grain.
Hand-sketched outlines with watercolor-like fills.
Minimalist but emotionally intelligent — one clear focal point per frame.
Characters (if any) are simple, expressive, relatable.
Typography: warm serif or clean sans-serif, embedded naturally in the scene.
16:9 aspect ratio. Full bleed, no borders.
CRITICAL: Every element must feel hand-drawn and organic. No clinical precision.
Tone: intimate, thoughtful, accessible. Suitable for adult learners.
DO NOT use: bright neons, 3D rendering, geometric isometric precision, digital coldness.
DO NOT include: meta-labels, structural annotations, zone markers. Only narrative content.`;
```

---

## Prompting Rules for School of Life Style

1. **Frame one idea clearly** — don't crowd the composition
2. **Use visual metaphors** — "a person climbing a mountain of books", "branches connecting different concepts"
3. **Include expressive characters** when appropriate — simple faces convey emotion
4. **Describe spatial relationships naturally** — "floating above", "beside", "beneath" (not ZONE LABELS)
5. **Embed key text directly in the image** — slide titles, callouts, key terms
6. **Build narrative sequences** — each frame progresses a story, not just informs

### Example Prompts

#### Topic: Overview of Curriculum
```
Hand-drawn scene showing a warm, inviting classroom library. 
A person stands in the center, arms open to a beautiful collection of books and scrolls on shelves.
A soft glow illuminates the space. Subtle watercolor clouds in the background suggest possibility.
Text at the bottom reads: "A journey of learning"
Warm, hopeful, welcoming tone.
```

#### Topic: Five Domains
```
Five overlapping circles arranged organically (not as a diagram, but like floating balloons).
Each circle contains a simple icon:
- A heart (for emotional)
- A brain (for cognitive)
- A hand (for practical)
- A compass (for directional/purpose)
- A tree (for growth)
Text labels are integrated naturally. Warm cream background with soft shadows between circles.
Lines gently connect the circles, suggesting relationship without rigidity.
```

#### Topic: Claude, Cursor, Git Setup
```
Three illustrated figures shaking hands or collaborating:
- A warm-toned AI assistant (Claude) with a helpful expression
- A developer at a computer (Cursor) focused and creative
- A network node (Git) representing connection and version history
Background shows connected terminals and open pathways.
Text overlays: "Three Tools, One Workflow"
Emphasize collaboration and integration, not technical jargon.
```

#### Topic: Create Repo
```
A person planting a seed in rich soil. Above, a digital plant grows with branches.
Each branch represents a file or folder structure growing naturally.
A small screen shows the GitHub interface in the background.
Metaphor: "Planting the seed of your project"
Warm, organic, hopeful. Emphasizes creation and growth.
```

---

## Style Variations (School of Life Family)

### 1. Minimalist School of Life
Reduce detail even further — mostly whitespace with simple line drawings. Use negative space powerfully. Best for: abstract concepts, data-heavy content.

```js
const MINIMALIST_STYLE = `
Minimalist line-drawing style inspired by School of Life.
Single-color or two-color palette (e.g., warm gray + dusty blue).
Clean, flowing line work with generous whitespace.
No fill, mostly outlines. Paper texture remains visible.
Soft shadows for depth. Typography integrated seamlessly.
16:9 aspect ratio, full bleed, no border.`;
```

### 2. Narrative School of Life (with Character)
Include a consistent character (student, guide, explorer) throughout the deck to anchor the narrative. Same character evolves through the story.

```js
const CHARACTER_STYLE = `
Hand-drawn educational illustration with consistent character protagonist.
A warm, relatable character (student/guide) guides the viewer through concepts.
Character evolves emotionally: starting curious, gaining confidence, reaching mastery.
Same art style as core School of Life above.
Each scene shows character interacting with the topic.
Background and supporting elements change; character remains consistent anchor.`;
```

---

## Full Pipeline (Node.js + Remotion)

### Step 1: Generate Illustrated Frames via Replicate (Free)

```js
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const REPLICATE_KEY = process.env.REPLICATE_API_KEY;
const OUT = path.join(__dirname, 'frames');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const SCHOOL_OF_LIFE_STYLE = `
Hand-drawn educational illustration style inspired by School of Life.
Warm, textural aesthetic with organic shapes and soft line work.
Color palette: warm cream (#F5F1E8), soft terracotta (#C97757), sage green (#9CAF88),
warm gray (#A89F94), dusty blue (#5B6E7F), soft gold (#D4A574).
Textured paper background with visible brushwork and grain.
Hand-sketched outlines with watercolor-like fills.
Minimalist but emotionally intelligent — one clear focal point per frame.
Characters are simple, expressive, relatable.
Typography: warm serif or clean sans-serif, embedded naturally in the scene.
16:9 aspect ratio. Full bleed, no borders.
CRITICAL: Every element must feel hand-drawn and organic. No clinical precision.
Tone: intimate, thoughtful, accessible. Suitable for adult learners.`;

async function generateImage(prompt, outPath) {
  const basename = path.basename(outPath);
  if (fs.existsSync(outPath)) {
    console.log(`  ${basename} — exists, skipping`);
    return 'exists';
  }
  process.stdout.write(`  ${basename}...`);

  // Use Stable Diffusion via Replicate (free tier)
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: 'db21e45d3f7023abc9f30f5e8b7b3f26601a0d43',
      input: {
        prompt: prompt + '\n\n' + SCHOOL_OF_LIFE_STYLE,
        negative_prompt: 'blurry, low quality, digital, cold, geometric, 3D',
        guidance_scale: 7.5,
        num_inference_steps: 30
      }
    })
  });

  const pred = await res.json();
  const predId = pred.id;
  
  if (!predId) { 
    console.log(' FAILED');
    return null; 
  }

  // Poll until done (120 attempts × 2s = 4 minutes max)
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
      headers: { 'Authorization': `Token ${REPLICATE_KEY}` }
    });
    const pdata = await poll.json();
    
    if (pdata.status === 'succeeded') {
      const imageUrl = pdata.output?.[0];
      if (imageUrl) {
        const img = await fetch(imageUrl);
        fs.writeFileSync(outPath, Buffer.from(await img.arrayBuffer()));
        console.log(' ✓');
        return imageUrl;
      }
    }
    if (pdata.status === 'failed') {
      console.log(' FAILED:', pdata.error);
      return null;
    }
    process.stdout.write('.');
  }
  console.log(' TIMEOUT');
  return null;
}

const SCENES = [
  {
    filename: '01_overview.png',
    prompt: `Hand-drawn scene showing a warm, inviting classroom library. 
A person stands in the center, arms open to a beautiful collection of books and scrolls on shelves.
A soft glow illuminates the space. Subtle watercolor clouds in the background suggest possibility.
Text at the bottom reads: "A journey of learning"
Warm, hopeful, welcoming tone.`
  },
  {
    filename: '02_five_domains.png',
    prompt: `Five overlapping circles arranged organically (not as a diagram, but like floating balloons).
Each circle contains a simple icon:
- A heart (for emotional)
- A brain (for cognitive)
- A hand (for practical)
- A compass (for directional/purpose)
- A tree (for growth)
Text labels are integrated naturally. Warm cream background with soft shadows between circles.
Lines gently connect the circles, suggesting relationship without rigidity.`
  },
  {
    filename: '03_tools_collaboration.png',
    prompt: `Three illustrated figures collaborating:
- A warm-toned AI assistant with a helpful expression
- A developer at a computer focused and creative
- A network node representing version control and connection
Background shows connected terminals and open pathways.
Text overlays: "Three Tools, One Workflow"
Emphasize collaboration and integration, not technical jargon.`
  },
  {
    filename: '04_create_repo.png',
    prompt: `A person planting a seed in rich soil. Above, a digital plant grows with branches.
Each branch represents a file or folder structure growing naturally.
A small screen shows the GitHub interface in the background.
Metaphor: "Planting the seed of your project"
Warm, organic, hopeful. Emphasizes creation and growth.`
  }
];

async function main() {
  console.log('Generating School of Life frames...\n');
  for (const scene of SCENES) {
    const outPath = path.join(OUT, scene.filename);
    await generateImage(scene.prompt, outPath);
    await new Promise(r => setTimeout(r, 1000)); // rate limit
  }
  console.log('\nDone. Frames ready in ./frames/');
}

main().catch(console.error);
```

### Step 2: Animate with Remotion

After frames are generated, use Remotion to add motion, transitions, and narration:

```tsx
// composition.tsx
import { Composition, useVideoConfig } from 'remotion';
import { AnimatedScene } from './scenes/AnimatedScene';

export const MyAnimation = () => (
  <Composition
    id="SchoolOfLife"
    component={AnimatedScene}
    durationInFrames={5400} // 3 minutes at 30fps
    fps={30}
    width={1920}
    height={1080}
  />
);

// scenes/AnimatedScene.tsx
import React from 'remotion';
import { AbsoluteFill, Img, Sequence, interpolate, useProgress } from 'remotion';

export const AnimatedScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#F5F1E8' }}>
      {/* Scene 1: Overview (0-30 seconds) */}
      <Sequence from={0} durationInFrames={900}>
        <Img src="/frames/01_overview.png" style={{ width: '100%', height: '100%' }} />
        {/* Optional: text overlay, voiceover sync */}
      </Sequence>

      {/* Scene 2: Five Domains (30-60 seconds) */}
      <Sequence from={900} durationInFrames={900}>
        <Img src="/frames/02_five_domains.png" style={{ width: '100%', height: '100%' }} />
      </Sequence>

      {/* Scene 3: Tools (60-90 seconds) */}
      <Sequence from={1800} durationInFrames={900}>
        <Img src="/frames/03_tools_collaboration.png" style={{ width: '100%', height: '100%' }} />
      </Sequence>

      {/* Scene 4: Create Repo (90-120 seconds) */}
      <Sequence from={2700} durationInFrames={900}>
        <Img src="/frames/04_create_repo.png" style={{ width: '100%', height: '100%' }} />
      </Sequence>
    </AbsoluteFill>
  );
};
```

---

## Remotion Animation Effects for School of Life

School of Life animations use **subtle, natural motion** — no heavy effects. Key techniques:

### 1. Fade In / Fade Out
```tsx
<Sequence from={0} durationInFrames={30}>
  <Img src="frame.png" style={{ opacity: interpolate(progress, [0, 1], [0, 1]) }} />
</Sequence>
```

### 2. Slow Pan (Parallax)
```tsx
<Img 
  src="frame.png" 
  style={{ 
    transform: `translateY(${interpolate(progress, [0, 1], [0, 20])}px)` 
  }} 
/>
```

### 3. Zoom In (Subtle)
```tsx
<Img 
  src="frame.png" 
  style={{ 
    transform: `scale(${interpolate(progress, [0, 1], [1, 1.05])})` 
  }} 
/>
```

### 4. Text Overlay with Fade
```tsx
<Txt
  text="Key Concept"
  fontSize={48}
  fill="#5B6E7F"
  fontFamily="Georgia, serif"
  opacity={interpolate(progress, [0, 0.2, 1], [0, 1, 1])}
/>
```

### 5. Voiceover Sync (with Audio)
```tsx
import { Audio } from 'remotion';

<Audio src="voiceover.mp3" />
// Sync scene transitions to audio markers (use ffprobe to extract timing)
```

---

## Prompt Anti-Patterns

| Don't | Do Instead |
|---|---|
| "SCENE 1: Overview" | "A warm classroom with open books" |
| "ZONE LEFT: teacher, ZONE RIGHT: students" | "A teacher and students gathered around a table" |
| Overly technical language | Metaphorical, emotional, human-centered |
| Bright, neon colors | Warm, muted, earthy tones |
| Geometric precision | Organic, hand-drawn, textured feel |
| Isolated floating objects | Objects in context, part of a narrative scene |

---

## Free Tools Options

### Option 1: Replicate (Recommended - Free Credits)
Sign up free at [replicate.com](https://replicate.com) — includes $10 free credits monthly.

```bash
# In .env file:
REPLICATE_API_KEY=your_key_here
```

Uses open-source Stable Diffusion models. Fast, reliable, free tier is generous.

### Option 2: Hugging Face (Completely Free)
No credit card needed. Sign up at [huggingface.co](https://huggingface.co).

```bash
# In .env file:
HF_API_KEY=your_key_here
```

Uses free inference API. Slower during peak hours but completely free.

### Option 3: Local Stable Diffusion (No API Needed)
If you have a GPU:
```bash
pip install diffusers torch
# Run locally, no internet required, completely free
```

**I recommend Option 1 (Replicate)** — easiest setup, fast, free monthly credits.

### Remotion Project

```bash
npm create video@latest -- --template remotion/next
npm install remotion @remotion/cli
```

---

## Reference

**School of Life Visual DNA:**
- Hand-drawn, textural illustrations
- Warm, limited color palettes
- Emotional, intimate tone
- Simple expressive characters
- Organic shapes and soft lines
- Narrative-driven (not just informational)
- Accessible to adult learners
- Metaphor-rich explanations

**Sources:**
- [School of Life YouTube](https://www.youtube.com/@theschooloflifechannel)
- [Animation Studio Portfolio - Sam Gilmore](https://www.samgilmore.com/project/school-of-life)
- [Wednesday Studio - School of Life](https://www.wearewednesday.com/project/sol)

---

*Skill updated: 2026-05-20 | For questions: check Kie.ai docs or Remotion documentation*
