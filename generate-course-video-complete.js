#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
const OUT = path.join(__dirname, 'course-overview-assets');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Voiceover segments - FORMAL VERSION
const VOICEOVER_SEGMENTS = [
  {
    name: '01_opening',
    text: `Hello. I imagine you have been exploring AI platforms like ChatGPT or Claude.
But here is the distinction. Using AI is one skill. Building with AI is something entirely different.
This course teaches you how to build.`,
    duration: 15
  },
  {
    name: '02_problem',
    text: `Think about your last week. How much time did you spend solving problems as they appeared? Responding to crises. Reacting. No time to actually construct anything lasting?
That is the reality for most teams. They are stuck in a cycle of response.
But some teams have figured something out. They do not respond to fires. They build systems that prevent fires from occurring in the first place.
That is the difference. And that is what we teach here.`,
    duration: 20
  },
  {
    name: '03_foundations',
    text: `There are five essential components to building AI systems that actually function.
Mental Models. First, you must understand how AI actually operates. Not how you assume it works, but what it genuinely does. Most people make the same mistake. They assume AI remembers. It does not. That is the first problem.
Memory Architecture. So we correct that. We teach your AI to remember. We provide it with a system. A structured notebook. Something that maintains knowledge across conversations.
Skills and Patterns. Then we enable your AI to perform real tasks. Not merely conversation. Actual action. Think of it as providing your AI with genuine capabilities.
Real World Systems. We connect it to databases. To APIs. To actual tools. Your AI transforms from a chatbot into something genuinely useful.
Advanced Patterns. Finally, we test thoroughly. We ensure the system is robust. Because delivering something broken is worse than delivering nothing.`,
    duration: 20
  },
  {
    name: '04_journey',
    text: `Here is how this progresses, week by week.
Week one, you establish your foundation. Tools. Mindset. You transition from being a consumer to becoming a producer. That shift alone transforms everything.
Weeks two and three, you build memory systems. You create the infrastructure that allows your AI to retain information accurately. You move beyond repetitive prompting. You are architecting something real.
Weeks four and five, you integrate everything. Databases. APIs. Your AI transitions from being an experimental notebook project into a tool that performs actual work.
Week six and beyond, you refine. You test rigorously. You iterate. You observe your system become more capable.
And here is what is remarkable. By completion? You will not simply understand AI. You will know how to construct something that functions. Something that people genuinely need and use.`,
    duration: 30
  },
  {
    name: '05_why_matters',
    text: `Anyone can engage with AI now. That is no longer a valuable skill. That is simply conversation.
But constructing an AI system that solves real problems? That scales properly? That continues working reliably?
That is rare. That is valuable. That is what separates those building the future from everyone else.`,
    duration: 15
  },
  {
    name: '06_closing',
    text: `Everything we teach you here, we have built. Real projects. Real challenges. Real solutions.
This is not theory. This is not hypothetical.
You are not learning in isolation. You are learning what actually works in practice.
So, are you ready?`,
    duration: 20
  }
];

async function generateVoiceover(text, filename) {
  process.stdout.write(`  ${filename}...`);

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL', {
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
      const error = await response.text();
      console.log(` ✗ (${response.status})`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      console.log(' ✗ (empty response)');
      return null;
    }

    const filepath = path.join(OUT, `${filename}.mp3`);
    fs.writeFileSync(filepath, Buffer.from(buffer));
    console.log(' ✓');
    return filepath;
  } catch (err) {
    console.log(` ✗ Error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('\n🎬 GENERATING COURSE OVERVIEW VIDEO\n');

  console.log('📢 Generating Voiceover Segments (Female Voice - Rachel)\n');

  const voicefiles = [];
  for (const segment of VOICEOVER_SEGMENTS) {
    const filepath = await generateVoiceover(segment.text, segment.name);
    if (filepath) {
      voicefiles.push({
        segment: segment.name,
        file: filepath,
        duration: segment.duration
      });
    }
    await new Promise(r => setTimeout(r, 300)); // rate limit
  }

  console.log(`\n✓ Generated ${voicefiles.length}/${VOICEOVER_SEGMENTS.length} voiceover segments`);

  if (voicefiles.length === VOICEOVER_SEGMENTS.length) {
    console.log('\n✓ Voiceover generation complete!');
    console.log('\nNext steps:');
    console.log('1. Generate Google Veo videos (3 dynamic segments)');
    console.log('2. Create Remotion animations (3 explainer segments)');
    console.log('3. Assemble all components with ffmpeg');
    console.log('\nAssets location: ./course-overview-assets/');
  }

  return voicefiles;
}

main().catch(console.error);
