'use strict';
/*
 * youtube-frames.js — "watch" a YouTube link visually: download it (yt-dlp) and
 * extract frames (ffmpeg), optionally tiled into contact-sheet montages so a whole
 * video can be eyeballed in a couple of images.
 *
 * Usage:
 *   node tools/youtube-frames.js <url-or-id> [--every 5] [--out DIR] [--montage] [--height 480]
 *
 * --every N   one frame every N seconds (default 5)
 * --montage   also tile frames into montage_###.png grids (5 cols) for quick viewing
 * --out DIR   output dir (default: <scratch>/yt_<id>)
 * --height H  max video height to download (default 480 — enough to read layout/text)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { videoId } = require('./youtube-transcript.js');

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--'));
const opt = (name, def) => { const i = args.indexOf('--' + name); return i !== -1 && args[i + 1] ? args[i + 1] : def; };
const has = (name) => args.includes('--' + name);

const id = videoId(url);
if (!id) { console.error('could not parse video id from:', url); process.exit(1); }
const every = parseFloat(opt('every', '5'));
const height = opt('height', '480');
const outDir = opt('out', path.join(process.env.CLAUDE_SCRATCH || os.tmpdir(), `yt_${id}`));
const framesDir = path.join(outDir, 'frames');
fs.mkdirSync(framesDir, { recursive: true });

function py(argsArr) { return execFileSync('py', ['-m', 'yt_dlp', ...argsArr], { stdio: ['ignore', 'pipe', 'pipe'] }).toString(); }

(async () => {
  const vid = path.join(outDir, 'video.mp4');
  if (!fs.existsSync(vid)) {
    console.log(`[yt] downloading ${id} (<=${height}p) …`);
    py(['-f', `best[height<=${height}][ext=mp4]/best[height<=${height}]/best`, '--merge-output-format', 'mp4',
      '-o', vid, `https://www.youtube.com/watch?v=${id}`]);
  }
  console.log('[yt] extracting 1 frame every', every, 's …');
  execFileSync(ffmpeg, ['-y', '-i', vid, '-vf', `fps=1/${every},scale=640:-1`,
    path.join(framesDir, 'f_%03d.png')], { stdio: 'ignore' });
  const frames = fs.readdirSync(framesDir).filter((f) => f.endsWith('.png')).sort();
  console.log(`[yt] ${frames.length} frames -> ${framesDir}`);

  if (has('montage')) {
    // tile into grids of 15 (5 cols x 3 rows) with a small gap
    const PER = 15, COLS = 5;
    for (let g = 0; g * PER < frames.length; g++) {
      const chunk = frames.slice(g * PER, g * PER + PER);
      const listFile = path.join(outDir, `_m${g}.txt`);
      fs.writeFileSync(listFile, chunk.map((f) => `file '${path.join(framesDir, f).replace(/\\/g, '/')}'`).join('\n'));
      const mont = path.join(outDir, `montage_${String(g + 1).padStart(2, '0')}.png`);
      execFileSync(ffmpeg, ['-y', '-i', path.join(framesDir, `f_%03d.png`),
        '-frames:v', '1', '-vf', `select='between(n,${g * PER},${g * PER + PER - 1})',scale=380:-1,tile=${COLS}x3:margin=8:padding=6:color=0xEDE7D7`,
        mont], { stdio: 'ignore' });
      console.log(`[yt] montage -> ${mont}`);
    }
  }
  console.log('[yt] done.');
})();
