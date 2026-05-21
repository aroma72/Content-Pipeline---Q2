#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_STUDIO_API_KEY);
const OUT = path.join(__dirname, 'animated-videos');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function generateVideo(prompt, outputPath, videoName) {
  console.log(`\n📹 ${videoName}`);
  process.stdout.write('   Generating...');

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const response = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: prompt
        }]
      }]
    });

    const responseText = response.response.text();
    console.log('\n   ✓ Video generated');
    console.log('   Response:', responseText.substring(0, 150) + '...');
    return responseText;
  } catch (err) {
    console.error('\n   ✗ Error:', err.message);
    return null;
  }
}

const VIDEOS = [
  {
    filename: '01_overview.mp4',
    name: '📖 Overview of Curriculum',
    prompt: `Generate a 15-second animated video in the School of Life style (hand-drawn, warm, textural).

A person enters a beautiful warm library. The camera gently pans across shelves of glowing books.
Soft watercolor clouds drift in the background. The person stops at center, arms open,
looking up with wonder. Text emerges: "A journey of learning"

Style: Hand-drawn illustration, cream/terracotta/sage green colors, textural, organic,
emotionally warm. 16:9 format.`
  },
  {
    filename: '02_five_domains.mp4',
    name: '🔄 Five Domains',
    prompt: `Generate a 15-second animated video in the School of Life style (hand-drawn, warm, textural).

Five illustrated circles gently float onto screen one by one. Each contains:
heart (emotional), brain (cognitive), hand (practical), compass (directional), tree (growth).
Soft lines connect them. Text labels appear: "Emotional", "Cognitive", "Practical", "Purpose", "Growth".
Camera gently zooms out to show all five connected organically.

Style: Hand-drawn, warm palette, flowing motion (no rigid diagrams), emotionally intelligent. 16:9 format.`
  },
  {
    filename: '03_tools_collaboration.mp4',
    name: '🤝 Tools & Collaboration',
    prompt: `Generate a 15-second animated video in the School of Life style (hand-drawn, warm, textural).

Three illustrated figures stand separately: Claude (AI assistant with warm expression),
Developer (at glowing computer), and Git (network node). They gradually move closer.
They join together. Gentle data flows between them.
Text: "Three Tools", "One Workflow"

Style: Hand-drawn, warm colors, collaborative harmony, organic motion, emotionally resonant. 16:9 format.`
  },
  {
    filename: '04_create_repo.mp4',
    name: '🌱 Create Repository',
    prompt: `Generate a 20-second animated video in the School of Life style (hand-drawn, warm, textural).

A person kneels and plants a small seed in rich soil. Camera focuses as seed sprouts.
A digital tree grows upward with branches (representing files/folders). Branches reach organically.
GitHub interface glows softly in background.
Text: "Plant your project"

Style: Hand-drawn, warm organic growth metaphor, hopeful/creative energy, watercolor-like, inspiring. 16:9 format.`
  }
];

async function main() {
  console.log('\n🎬 Generating School of Life animated videos via Google Veo 3.1');
  console.log(`\n⏳ Generating ${VIDEOS.length} videos...\n`);

  for (const video of VIDEOS) {
    const outputPath = path.join(OUT, video.filename);
    await generateVideo(video.prompt, outputPath, video.name);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n\n✓ Done. Check ./animated-videos/ for generated videos.');
}

main().catch(console.error);
