#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const voDir = 'voiceover-windows-formal';
const videoFile = 'course-overview-with-captions.mp4';
const outputFile = 'course-overview-final.mp4';

console.log('\n🎬 MUXING VOICEOVER WITH VIDEO\n');

// Check if voiceover files exist
const voFiles = [
  '01_opening.wav',
  '02_problem.wav',
  '03_foundations.wav',
  '04_journey.wav',
  '05_why_matters.wav',
  '06_closing.wav'
];

console.log('1. Checking voiceover files...');
let allExist = true;
for (const file of voFiles) {
  const fullPath = path.join(voDir, file);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    console.log(`   ✓ ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.log(`   ✗ ${file} NOT FOUND`);
    allExist = false;
  }
}

if (!allExist) {
  console.log('\nError: Some voiceover files are missing');
  process.exit(1);
}

// Create concat file for WAV files
console.log('\n2. Creating audio concat file...');
const concatFile = path.join(voDir, 'concat.txt');
const concatContent = voFiles.map(f => `file '${path.join(voDir, f)}'`).join('\n');
fs.writeFileSync(concatFile, concatContent);
console.log('   ✓ Concat file created');

// Concatenate audio files
console.log('\n3. Concatenating audio segments...');
const audioOutput = path.join(voDir, 'combined_voiceover.aac');
try {
  execSync(`ffmpeg -f concat -safe 0 -i "${concatFile}" -c:a aac -y "${audioOutput}"`, {
    stdio: 'inherit',
  });
  console.log('   ✓ Audio concatenated');
} catch (e) {
  console.log('   ✗ Audio concatenation failed');
  console.log('   Note: Ensure ffmpeg is installed');
  process.exit(1);
}

// Mux audio with video
console.log('\n4. Muxing audio with video...');
try {
  execSync(
    `ffmpeg -i "${videoFile}" -i "${audioOutput}" -c:v copy -c:a aac -shortest -y "${outputFile}"`,
    { stdio: 'inherit' }
  );
  console.log('   ✓ Video muxed with audio');
} catch (e) {
  console.log('   ✗ Muxing failed');
  process.exit(1);
}

// Verify final output
console.log('\n5. Verifying final video...');
if (fs.existsSync(outputFile)) {
  const stats = fs.statSync(outputFile);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`   ✓ Final video created: ${sizeMB} MB`);

  console.log('\n✅ COMPLETE!\n');
  console.log(`📁 Final Video: ${outputFile}`);
  console.log(`📊 Size: ${sizeMB} MB`);
  console.log(`📝 Contains: Captions + Voiceover (Formal Script)`);
  console.log(`🎬 Ready for publishing to Taleemabad!\n`);
} else {
  console.log('   ✗ Final video not created');
  process.exit(1);
}
