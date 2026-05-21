#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const KIE = process.env.KIE_API_KEY;
const OUT = path.join(__dirname, 'animation-frames');
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
Tone: intimate, thoughtful, accessible. Suitable for adult learners.
DO NOT use: bright neons, 3D rendering, geometric precision, digital coldness.`;

async function generateImage(prompt, outPath) {
  const basename = path.basename(outPath);
  if (fs.existsSync(outPath)) {
    console.log(`  ✓ ${basename} — already exists`);
    return 'exists';
  }
  process.stdout.write(`  ${basename}...`);

  const input = {
    prompt: prompt + '\n\n' + SCHOOL_OF_LIFE_STYLE,
    output_format: 'png',
    aspect_ratio: '16:9',
    resolution: '1K'
  };

  try {
    const res = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE}`
      },
      body: JSON.stringify({ model: 'nano-banana-pro', input })
    });

    const data = await res.json();
    const taskId = data.data?.taskId;
    if (!taskId) {
      console.log(' ✗ FAILED (no task ID)');
      return null;
    }

    // Poll until done (120 attempts × 3s = 6 minutes max)
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 3000));

      const poll = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
        headers: { 'Authorization': `Bearer ${KIE}` }
      });
      const pdata = await poll.json();

      if (pdata.data?.state === 'success') {
        const url = JSON.parse(pdata.data.resultJson)?.resultUrls?.[0];
        if (url) {
          const img = await fetch(url);
          fs.writeFileSync(outPath, Buffer.from(await img.arrayBuffer()));
          console.log(' ✓');
          return url;
        }
      }
      if (pdata.data?.state === 'fail') {
        console.log(' ✗ FAILED:', pdata.data?.failMsg);
        return null;
      }
      process.stdout.write('.');
    }
    console.log(' ✗ TIMEOUT');
    return null;
  } catch (err) {
    console.log(' ✗ ERROR:', err.message);
    return null;
  }
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
  console.log('\n🎨 Generating School of Life animation frames...\n');
  let success = 0;
  let failed = 0;

  for (const scene of SCENES) {
    const outPath = path.join(OUT, scene.filename);
    const result = await generateImage(scene.prompt, outPath);
    if (result && result !== 'exists') success++;
    else if (result === 'exists') success++;
    else failed++;
    await new Promise(r => setTimeout(r, 1000)); // rate limit buffer
  }

  console.log(`\n✓ Done. ${success} frames generated in ./animation-frames/`);
  if (failed > 0) console.log(`⚠ ${failed} frames failed`);
}

main().catch(console.error);
