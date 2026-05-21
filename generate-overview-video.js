#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
const OUT = path.join(__dirname, 'overview-video-assets');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Script segments with timings
const VOICEOVER_SEGMENTS = [
  {
    name: '01_opening',
    text: `Hey. So you've been playing with AI, right? ChatGPT, Claude, whatever.
But here's the thing — using it is one skill. Building with it? That's a completely different game.
This course teaches you that game.`,
    duration: 15
  },
  {
    name: '02_problem',
    text: `I want you to think about your last week. How much of it was you solving problems that came out of nowhere? Firefighting. Reacting. No time to actually build anything?
That's most teams. They're stuck on a treadmill.
But some teams figured something out. They don't fight fires. They build systems that prevent fires in the first place.
That's the difference. And that's what we're teaching you here.`,
    duration: 20
  },
  {
    name: '03_foundations',
    text: `There are five things you need to understand to build AI that actually works.
Mental Models — First, you gotta understand how AI actually thinks. Not what you think it thinks. What it actually does. Most people get this wrong. They assume AI remembers. It doesn't. That's problem number one.
Memory Architecture — So we fix that. We teach your AI to remember. We give it a system. A notebook. Something that actually keeps track.
Skills and Patterns — Then we teach your AI to do things. Real things. Not just talk — actually act. Like giving it superpowers.
Real World Systems — We connect it to databases. To APIs. To actual tools. Your AI stops being a chatbot. It becomes useful.
Advanced Patterns — Finally, we test it. We make sure it's bulletproof. Because shipping something broken is worse than shipping nothing at all.`,
    duration: 20
  },
  {
    name: '04_journey',
    text: `So here's how this works, week by week.
Week one, you set up. Tools. Mindset. You stop being a consumer and you start being a producer. That shift alone changes everything.
Weeks two and three, you build memory. You create the system that lets your AI actually remember things. You're not copy-pasting prompts anymore. You're architecting something real.
Weeks four and five, you connect everything. Databases. APIs. Your AI stops being an experiment in your notebook and becomes a tool that actually does work.
Week six and beyond, you sharpen. You test. You iterate. You watch your system get better.
And here's what's wild — by the end? You won't just understand AI. You'll actually know how to build something that works. Something people want to use.`,
    duration: 30
  },
  {
    name: '05_why_it_matters',
    text: `Look, anyone can chat with an AI now. That's not a skill anymore. That's just... talking.
But building an AI system that actually solves problems? That scales? That keeps working?
That's rare. That's valuable. That's the thing that separates the people building the future from everyone else.`,
    duration: 15
  },
  {
    name: '06_closing',
    text: `Everything we're teaching you here? We built it. Real projects. Real problems. Real solutions.
This isn't theory. This isn't hypothetical.
You're not learning in a classroom. You're learning what actually works.
So... you ready?`,
    duration: 20
  }
];

async function generateVoiceover(text, filename) {
  console.log(`  📢 Generating: ${filename}`);

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      console.log(`    ✗ Error: ${response.status}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const filepath = path.join(OUT, `${filename}.mp3`);
    fs.writeFileSync(filepath, Buffer.from(buffer));
    console.log(`    ✓ Saved: ${filename}.mp3`);
    return filepath;
  } catch (err) {
    console.error(`    ✗ Error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('\n🎤 Generating Course Overview Voiceover (Female Voice)\n');

  const files = [];
  for (const segment of VOICEOVER_SEGMENTS) {
    const filepath = await generateVoiceover(segment.text, segment.name);
    if (filepath) {
      files.push({ segment: segment.name, file: filepath, duration: segment.duration });
    }
    await new Promise(r => setTimeout(r, 500)); // rate limit
  }

  console.log(`\n✓ Generated ${files.length} voiceover segments`);
  console.log('\nNext steps:');
  console.log('1. Generate Veo videos');
  console.log('2. Create Remotion animations');
  console.log('3. Combine with ffmpeg');

  return files;
}

main().catch(console.error);
