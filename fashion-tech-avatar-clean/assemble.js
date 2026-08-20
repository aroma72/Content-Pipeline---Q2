'use strict';
/*
 * assemble.js — concatenate the per-chunk lip-sync clips into one continuous
 * ~60s talking-avatar MP4 (same girl, same framing throughout). Re-encodes to a
 * uniform 1280x720 / 30fps / yuv420p / AAC via the concat filter so mismatched
 * clip params can't break the join. Output: out/fashion-tech-avatar.mp4.
 * Then prints duration + confirms an audio stream is present (fail loudly if not).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static');
const script = require('./script.js');

const CLIPS = path.join(process.cwd(), 'clips');
const OUT = path.join(process.cwd(), 'out');
fs.mkdirSync(OUT, { recursive: true });

const ids = script.map((c) => c.id).filter((id) => fs.existsSync(path.join(CLIPS, `${id}.mp4`)));
if (!ids.length) { console.error('[assemble] no clips found — run generate-lipsync.js first.'); process.exit(1); }
if (ids.length !== script.length) console.warn(`[assemble] ⚠ only ${ids.length}/${script.length} clips present: ${ids.join(', ')}`);

const inputs = [];
ids.forEach((id) => { inputs.push('-i', path.join(CLIPS, `${id}.mp4`)); });

// build concat filter: normalize each input to 1280x720/30fps + resampled audio, then concat
let fc = '';
ids.forEach((_, i) => {
  fc += `[${i}:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=30,format=yuv420p[v${i}];`;
  fc += `[${i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}];`;
});
ids.forEach((_, i) => { fc += `[v${i}][a${i}]`; });
fc += `concat=n=${ids.length}:v=1:a=1[v][a]`;

const outFile = path.join(OUT, 'fashion-tech-avatar.mp4');
console.log(`[assemble] concatenating ${ids.length} clip(s) -> ${outFile}`);
execFileSync(ffmpeg, [
  '-y', ...inputs, '-filter_complex', fc, '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '18',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outFile,
], { stdio: ['ignore', 'ignore', 'inherit'] });

// verify: duration + audio stream present
const probe = JSON.parse(execFileSync(ffprobe.path, [
  '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', outFile,
]).toString());
const dur = +probe.format.duration;
const hasAudio = probe.streams.some((s) => s.codec_type === 'audio');
const hasVideo = probe.streams.some((s) => s.codec_type === 'video');
console.log(`[assemble] ✅ ${outFile}`);
console.log(`[assemble]    duration ${dur.toFixed(1)}s · video ${hasVideo ? 'yes' : 'NO'} · audio ${hasAudio ? 'yes' : 'NO'}`);
if (!hasAudio || !hasVideo) { console.error('[assemble] ❌ missing a stream — check the source clips.'); process.exit(1); }
