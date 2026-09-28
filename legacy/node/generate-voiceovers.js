#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice (works with v2)

if (!API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in .env');
  process.exit(1);
}

// Segment scripts
const segments = [
  {
    id: 1,
    text: `Welcome to Agentic AI Mastery. In the next 14 weeks, something fundamental is going to shift in how you think about artificial intelligence.

Most people use AI. They ask ChatGPT questions. They use tools that others built. That's the consumer mindset — and it has a hard ceiling.

But there's another path. There's a producer mindset.

Producers don't just use AI. They build with it. They design agents, systems, and workflows that amplify their capabilities. They turn AI into their unfair advantage.

The difference between these two approaches? It determines everything — your career trajectory, the problems you can solve, the impact you can have.

This course exists for one reason: to move you from consumer to producer. Not in theory. In practice. By week 14, you won't just understand AI. You'll be building with it.`,
    output: 'voiceover_session2_segment1.wav'
  },
  {
    id: 2,
    text: `So what happens in these 14 weeks?

You'll master five foundations. How to design agents that work autonomously. How to architect memory systems that scale. How to integrate AI into real-world workflows. How to build multi-agent systems that collaborate. And how to evaluate when and where AI actually adds value.

But here's what makes this rare: You'll do this through real projects. Not tutorials. Real problems, real constraints, real iterations.

By the end, you'll have gone through the complete journey — from understanding why agentic AI matters, to building your first autonomous system, to deploying production-grade solutions.

This isn't about becoming an AI researcher. It's about becoming someone who builds confidently with AI. Someone who understands not just the technology, but the strategy, the systems thinking, the human elements.

The producer mindset doesn't come from watching. It comes from doing. Over the next 14 weeks, you're going to do a lot.

Let's begin.`,
    output: 'voiceover_session2_segment2.wav'
  }
];

function generateVoiceover(text, outputPath) {
  return new Promise((resolve, reject) => {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${VOICE_ID}`,
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    };

    const body = JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.47,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      }
    });

    const req = https.request(options, (res) => {
      let data = Buffer.alloc(0);

      res.on('data', (chunk) => {
        data = Buffer.concat([data, chunk]);
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          fs.writeFileSync(outputPath, data);
          resolve(outputPath);
        } else {
          reject(new Error(`API error: ${res.statusCode} - ${data.toString()}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🎙️  Generating Session 2 voiceovers...\n');

  try {
    for (const segment of segments) {
      console.log(`  Generating Segment ${segment.id}...`);
      await generateVoiceover(segment.text, segment.output);
      console.log(`  ✓ Segment ${segment.id} saved to ${segment.output}`);
    }

    console.log('\n✅ All voiceovers generated successfully!');
    console.log(`   ${segments[0].output}`);
    console.log(`   ${segments[1].output}`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
