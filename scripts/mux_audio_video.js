#!/usr/bin/env node

/**
 * Mux audio and video using Node.js child_process
 * Requires ffmpeg to be installed and available in PATH
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VIDEO_INPUT = 'c:\\Users\\Aroma Tahir\\Downloads\\Content Queen\\video_production\\consumer-to-producer-mindset\\consumer_producer_mindset_silent.mp4';
const AUDIO_INPUT = 'c:\\Users\\Aroma Tahir\\Downloads\\Content Queen\\video_production\\consumer-to-producer-mindset\\consumer_producer_vo.mp3';
const OUTPUT = 'c:\\Users\\Aroma Tahir\\Downloads\\Content Queen\\video_production\\consumer-to-producer-mindset\\consumer_producer_mindset_final.mp4';

console.log('Muxing audio and video...');
console.log(`Video: ${VIDEO_INPUT}`);
console.log(`Audio: ${AUDIO_INPUT}`);
console.log(`Output: ${OUTPUT}`);

// Check if inputs exist
if (!fs.existsSync(VIDEO_INPUT)) {
  console.error(`ERROR: Video file not found: ${VIDEO_INPUT}`);
  process.exit(1);
}

if (!fs.existsSync(AUDIO_INPUT)) {
  console.error(`ERROR: Audio file not found: ${AUDIO_INPUT}`);
  process.exit(1);
}

try {
  // Use ffmpeg to mux audio and video
  // -i video -i audio -c:v copy -c:a aac -shortest output.mp4
  const cmd = `ffmpeg -i "${VIDEO_INPUT}" -i "${AUDIO_INPUT}" -c:v copy -c:a aac -shortest "${OUTPUT}" -y`;

  console.log('Running ffmpeg...');
  execSync(cmd, { stdio: 'inherit' });

  // Check if output was created
  if (fs.existsSync(OUTPUT)) {
    const stats = fs.statSync(OUTPUT);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n✓ Mux successful!`);
    console.log(`  Output: ${OUTPUT}`);
    console.log(`  Size: ${sizeMB} MB`);
  } else {
    console.error('ERROR: Output file was not created');
    process.exit(1);
  }
} catch (error) {
  console.error('ERROR: Mux failed');
  console.error(error.message);
  process.exit(1);
}
