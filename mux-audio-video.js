#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Try to find ffmpeg
function findFFmpeg() {
  const possiblePaths = [
    'ffmpeg',
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
  ];

  for (const p of possiblePaths) {
    try {
      const result = spawn(p, ['-version'], { stdio: 'pipe' });
      return p;
    } catch (e) {
      // Continue to next
    }
  }
  return null;
}

function muxAudioVideo(videoPath, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpegPath = findFFmpeg();

    if (!ffmpegPath) {
      // Fallback: use ffmpeg from npm package if available
      try {
        const ffmpegStatic = require('ffmpeg-static');
        muxWithFFmpeg(ffmpegStatic, videoPath, audioPath, outputPath, resolve, reject);
      } catch (e) {
        reject(new Error('FFmpeg not found. Please install ffmpeg or use ffmpeg-static npm package.'));
      }
      return;
    }

    muxWithFFmpeg(ffmpegPath, videoPath, audioPath, outputPath, resolve, reject);
  });
}

function muxWithFFmpeg(ffmpegPath, videoPath, audioPath, outputPath, resolve, reject) {
  console.log(`🎬 Muxing: ${path.basename(videoPath)} + ${path.basename(audioPath)}`);

  const args = [
    '-i', videoPath,
    '-i', audioPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-shortest',
    '-y',
    outputPath
  ];

  const process = spawn(ffmpegPath, args, { stdio: 'inherit' });

  process.on('close', (code) => {
    if (code === 0) {
      console.log(`✓ Created: ${outputPath}`);
      resolve(outputPath);
    } else {
      reject(new Error(`FFmpeg exited with code ${code}`));
    }
  });

  process.on('error', reject);
}

async function main() {
  const segments = [
    {
      id: 1,
      video: 'session2_segment1_silent.mp4',
      audio: 'voiceover_session2_segment1.wav',
      output: 'session2_segment1_final.mp4'
    },
    {
      id: 2,
      video: 'session2_segment2_silent.mp4',
      audio: 'voiceover_session2_segment2.wav',
      output: 'session2_segment2_final.mp4'
    }
  ];

  try {
    console.log('🎙️  Muxing voiceovers with video files...\n');

    for (const segment of segments) {
      if (!fs.existsSync(segment.video)) {
        throw new Error(`Video file not found: ${segment.video}`);
      }
      if (!fs.existsSync(segment.audio)) {
        throw new Error(`Audio file not found: ${segment.audio}`);
      }

      await muxAudioVideo(segment.video, segment.audio, segment.output);
    }

    console.log('\n✅ All segments muxed successfully!');
    console.log(`   ${segments[0].output}`);
    console.log(`   ${segments[1].output}`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
