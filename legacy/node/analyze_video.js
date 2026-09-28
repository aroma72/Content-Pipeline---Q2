const fs = require('fs');
const path = require('path');
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

async function analyzeFrames() {
  const framesDir = 'C:\\Users\\Aroma Tahir\\AppData\\Local\\Temp\\frames';

  // Sample frames at intervals (every 15 frames = ~7.5 minutes)
  const framesToAnalyze = [];
  for (let i = 1; i <= 154; i += 15) {
    const frameNum = String(i).padStart(4, '0');
    const framePath = path.join(framesDir, `frame_${frameNum}.png`);
    if (fs.existsSync(framePath)) {
      const imageData = fs.readFileSync(framePath);
      const base64 = imageData.toString('base64');
      const timeSeconds = i * 30; // Each frame is 30 seconds apart
      const minutes = Math.floor(timeSeconds / 60);
      const seconds = timeSeconds % 60;
      framesToAnalyze.push({
        frame: frameNum,
        time: `${minutes}:${String(seconds).padStart(2, '0')}`,
        base64
      });
    }
  }

  console.log(`Analyzing ${framesToAnalyze.length} frames...\n`);

  for (const {frame, time, base64} of framesToAnalyze) {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: base64
            }
          },
          {
            type: 'text',
            text: 'What is shown in this frame? Identify the topic or content (e.g., "Overview of curriculum", "5 domains diagram", "Claude IDE discussion", "Git repository setup", etc.). Be brief.'
          }
        ]
      }]
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log(`[${time}] Frame ${frame}: ${content}`);
  }
}

analyzeFrames().catch(console.error);
