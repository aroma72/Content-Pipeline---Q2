#!/usr/bin/env node
/**
 * Generate missing voiceover segments for Consumer vs Producer Mindset video.
 * Uses ElevenLabs API v2 with turbo model for natural pauses.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) {
  console.error('ERROR: ELEVENLABS_API_KEY not found in .env');
  process.exit(1);
}

const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
const BASE_URL = 'https://api.elevenlabs.io/v1';

// Missing VO text - approximately 45 seconds
const MISSING_VO_TEXT = `Now they talk to each other. You connect them. Suddenly you have infrastructure generating value continuously. Consumers never get there. This might sound ambitious, but stay with me — building systems is a learnable skill, not magic. You're here to learn to think like a producer. That's what this course is about. Next: How do producers actually think? What's their mental model?`;

async function generateVO(text, outputPath) {
  console.log(`Generating VO: ${text.length} characters`);
  console.log(`Output: ${outputPath}`);

  const url = new URL(`${BASE_URL}/text-to-speech/${VOICE_ID}`);

  const payload = JSON.stringify({
    text: text,
    model_id: 'eleven_turbo_v2_5', // Faster, natural model
    voice_settings: {
      stability: 0.35,              // Natural pauses
      similarity_boost: 0.65,        // Balance between naturalness and voice match
      style: 0.0,
      use_speaker_boost: true
    }
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 120000
    };

    const req = https.request(options, (res) => {
      let data = Buffer.alloc(0);

      res.on('data', (chunk) => {
        data = Buffer.concat([data, chunk]);
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          fs.writeFileSync(outputPath, data);
          const fileSize = fs.statSync(outputPath).size;
          console.log(`✓ Generated: ${outputPath}`);
          console.log(`  File size: ${fileSize.toLocaleString()} bytes`);

          // Rough estimate: size_bytes / (128000/8) = duration_seconds
          const estimatedDuration = fileSize / (128000 / 8);
          console.log(`  Estimated duration: ${estimatedDuration.toFixed(1)} seconds`);

          resolve(true);
        } else {
          const responseText = data.toString('utf-8', 0, Math.min(500, data.length));
          console.error(`ERROR: Status ${res.statusCode}`);
          console.error(`Response: ${responseText}`);
          reject(new Error(`API returned ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error(`ERROR: ${err.message}`);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  const outputDir = path.join(__dirname, '..', 'video_production', 'session_2_video_1_mindset');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, 'vo_missing_parts.mp3');

  if (fs.existsSync(outputFile)) {
    console.log(`Note: ${outputFile} already exists. Will overwrite.`);
  }

  try {
    await generateVO(MISSING_VO_TEXT, outputFile);
    console.log('\n✓ Missing VO generated successfully');
    process.exit(0);
  } catch (error) {
    console.log('\n✗ Failed to generate missing VO');
    console.error(error);
    process.exit(1);
  }
}

main();
