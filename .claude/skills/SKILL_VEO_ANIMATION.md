# Google Veo 3.1 Animation Generation Skill
*Invocation: `/veo-animate`, `/generate-video`, or `/veo`*
*Last updated: 2026-05-20*

---

## What This Skill Does

Generates **animated educational videos** directly via Google Veo 3.1 (via Gemini API) in the **School of Life** aesthetic — hand-drawn, warm, textural, emotionally intelligent motion graphics.

No static frames. No Remotion. Just prompt → video.

```
Define video concept (prompt) → Generate video via Google Veo 3.1
→ Concatenate videos → Add voiceover (optional)
→ Final narrative-driven educational video
```

---

## Why Google Veo Over Static Frames?

| Approach | Frames | Motion | Setup | Time |
|---|---|---|---|---|
| **Static Frames + Remotion** | Generate PNGs | Manual animation | Complex | Slow |
| **Google Veo** | N/A | AI-generated motion | Simple API call | Fast |

**Winner:** Veo. Animation is built-in. One API call per video segment.

---

## Video Prompts for School of Life Style

Each prompt generates a **15-30 second animated video**. Focus on:
- **Narrative arc** (beginning → middle → end)
- **Camera movement** (gentle pan, slow zoom, parallax)
- **Emotional tone** (warm, welcoming, thoughtful)
- **Metaphorical clarity** (what concept does this visualize?)

### Topic 1: Overview of Curriculum
```
Animated hand-drawn illustration in warm School of Life style.
A person enters a beautiful library, walking past shelves of glowing books.
The camera gently pans across the shelves, lingering on key titles.
Soft watercolor clouds drift in the background.
The person stops at the center, arms open, looking up with wonder.
Text emerges: "A journey of learning"
15 seconds. Warm, hopeful, inviting. Textural hand-drawn aesthetic.
Soft color palette: cream, terracotta, sage green.
```

### Topic 2: Five Domains
```
Animated hand-drawn illustration in warm School of Life style.
Five illustrated circles gently float onto screen, one by one.
Each circle contains: heart (emotional), brain (cognitive), hand (practical), 
compass (directional), tree (growth).
As they settle, soft lines connect them, suggesting relationship.
Text labels appear naturally: "Emotional", "Cognitive", "Practical", "Purpose", "Growth"
Camera gently zooms out to show all five connected.
15 seconds. Organic, flowing motion. No rigid diagrams.
```

### Topic 3: Claude, Cursor, Git Tools
```
Animated hand-drawn illustration in warm School of Life style.
Three illustrated figures stand separately, then gradually move closer.
Figure 1: AI assistant (Claude) with warm expression
Figure 2: Developer at glowing computer (Cursor)
Figure 3: Network node / connected terminals (Git)
They join hands / connect together.
A flow of data streams between them gently.
Text overlays: "Three Tools", "One Workflow"
15 seconds. Emphasize collaboration and harmony, not technical jargon.
```

### Topic 4: Create Repository
```
Animated hand-drawn illustration in warm School of Life style.
A person kneels and plants a small seed in rich soil.
The camera focuses on the seed as it begins to sprout.
A digital tree grows upward with branches, each branch representing files/folders.
The tree grows organically, branches reaching outward.
In the background, a GitHub interface glows softly.
Text: "Plant your project"
20 seconds. Warm, organic growth metaphor. Hopeful and creative energy.
```

---

## Full Pipeline (Node.js + Gemini API)

### Step 1: Generate Videos via Google Veo

```js
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_STUDIO_API_KEY);
const OUT = path.join(__dirname, 'animated-videos');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function generateVideo(prompt, outputPath, videoName) {
  console.log(`\n📹 Generating: ${videoName}`);
  console.log('   Prompt:', prompt.substring(0, 100) + '...');
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const response = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });

    const responseText = response.response.text();
    
    // Extract video URL from response (Veo returns a playable video URL)
    const videoMatch = responseText.match(/https:\/\/[^\s]+\.mp4/);
    if (videoMatch) {
      const videoUrl = videoMatch[0];
      console.log('   ✓ Video generated:', videoUrl);
      
      // Download and save video
      const videoRes = await fetch(videoUrl);
      const buffer = await videoRes.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      console.log('   ✓ Saved to:', outputPath);
      return videoUrl;
    } else {
      console.log('   Response:', responseText.substring(0, 200));
      return null;
    }
  } catch (err) {
    console.error('   ✗ Error:', err.message);
    return null;
  }
}

const VIDEOS = [
  {
    filename: '01_overview.mp4',
    name: 'Overview of Curriculum',
    prompt: `Generate a 15-second animated video in the School of Life style.

A person enters a beautiful warm library. The camera gently pans across shelves of glowing books.
Soft watercolor clouds drift in the background. The person stops at the center, arms open, 
looking up with wonder. Text emerges: "A journey of learning"

Style: Hand-drawn illustration, warm colors (cream, terracotta, sage green), textural, 
organic shapes, soft line work, emotionally warm and inviting, accessible tone.
Duration: 15 seconds.`
  },
  {
    filename: '02_five_domains.mp4',
    name: 'Five Domains',
    prompt: `Generate a 15-second animated video in the School of Life style.

Five illustrated circles gently float onto screen, one by one. Each contains an icon:
heart (emotional), brain (cognitive), hand (practical), compass (directional), tree (growth).
As they settle, soft lines connect them. Text labels appear: "Emotional", "Cognitive", 
"Practical", "Purpose", "Growth". Camera gently zooms out.

Style: Hand-drawn, warm palette, organic flowing motion, no rigid diagrams, 
emotionally intelligent, connected but not overwhelming.
Duration: 15 seconds.`
  },
  {
    filename: '03_tools_collaboration.mp4',
    name: 'Claude, Cursor, Git - Tools & Collaboration',
    prompt: `Generate a 15-second animated video in the School of Life style.

Three illustrated figures stand separately, then gradually move closer together.
Figure 1: AI assistant (Claude) with warm expression.
Figure 2: Developer at a glowing computer (Cursor).
Figure 3: Network node / connected terminals (Git).
They join together. Data flows between them gently.
Text overlays: "Three Tools", "One Workflow"

Style: Hand-drawn, warm colors, emphasize collaboration and harmony not technical details,
organic motion, emotionally resonant, accessible narrative.
Duration: 15 seconds.`
  },
  {
    filename: '04_create_repo.mp4',
    name: 'Create Repository',
    prompt: `Generate a 20-second animated video in the School of Life style.

A person kneels and plants a small seed in rich soil. The camera focuses as the seed 
sprouts. A digital tree grows upward with branches (representing files/folders). 
Branches reach organically outward. A GitHub interface glows softly in the background.
Text: "Plant your project"

Style: Hand-drawn, warm organic growth metaphor, hopeful and creative energy,
textural aesthetic, watercolor-like fills, emotionally warm and inspiring.
Duration: 20 seconds.`
  }
];

async function main() {
  console.log('\n🎬 Generating School of Life animated videos via Google Veo...');
  console.log(`\nGenerating ${VIDEOS.length} videos...\n`);

  for (const video of VIDEOS) {
    const outputPath = path.join(OUT, video.filename);
    await generateVideo(video.prompt, outputPath, video.name);
    await new Promise(r => setTimeout(r, 2000)); // rate limit
  }

  console.log('\n✓ Done. Videos generated in ./animated-videos/');
}

main().catch(console.error);
```

---

## Installation

```bash
npm install @google/generative-ai
```

---

## How to Run

```bash
node generate-videos.js
```

---

## Concatenate Videos (Optional)

Once videos are generated, concatenate them into one:

```bash
ffmpegPath=$(node -e "console.log(require('ffmpeg-static'))")
cat > concat.txt << EOF
file '01_overview.mp4'
file '02_five_domains.mp4'
file '03_tools_collaboration.mp4'
file '04_create_repo.mp4'
EOF

"$ffmpegPath" -f concat -safe 0 -i concat.txt -c copy final-course-intro.mp4
```

---

## Add Voiceover (ElevenLabs)

You already have ElevenLabs API key. After generating videos:

```bash
# Generate voiceover for each segment
node generate-voiceover.js

# Mux video + audio
ffmpegPath=$(node -e "console.log(require('ffmpeg-static'))")
"$ffmpegPath" -i 01_overview.mp4 -i 01_voiceover.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 01_with_audio.mp4
```

---

## Google Veo Pricing

- **Free tier:** ~10-20 video generations/month
- **Paid:** ~$0.10-0.30 per 15-second video
- Your project (4 videos): **Free or < $2**

---

## Credentials

```bash
# In .env:
GOOGLE_STUDIO_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_key (for optional voiceover)
```

You already have `GOOGLE_STUDIO_API_KEY` in your .env file.

---

*Skill updated: 2026-05-20 | Generates video directly via Google Veo 3.1*
