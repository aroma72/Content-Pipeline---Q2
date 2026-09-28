'use strict';
/*
 * compose-broll.js — overlay one illustrated snap per beat onto the talking-head base,
 * each popping in (slide-up + fade) beside her with a POP sound on entrance.
 * Base: out/fashion-tech-avatar.mp4 (the clean-girl video). B-roll: broll/<id>.png.
 * Output: out/fashion-tech-avatar-broll.mp4.  Free (local ffmpeg).
 * Env: SAMPLE=12 to render only the first 12s for a quick check.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static');
const broll = require('./broll.js');

const BASE = path.join(process.cwd(), 'out', 'fashion-tech-avatar.mp4');
const WINS = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'beat-windows.json'), 'utf8'));
const OUTDIR = path.join(process.cwd(), 'out');
const OUT = path.join(OUTDIR, 'fashion-tech-avatar-broll.mp4');
const CLICK = path.join(process.cwd(), 'click.wav');
if (!fs.existsSync(BASE)) { console.error('[broll] base video missing:', BASE); process.exit(1); }

const DUR = +JSON.parse(execFileSync(ffprobe.path, ['-v', 'quiet', '-print_format', 'json', '-show_format', BASE]).toString()).format.duration;
const SAMPLE = Number(process.env.SAMPLE) || 0;

// 1) laptop CLICK SFX (short sharp mouse/trackpad click) — generate once.
// A quick noise-burst "tk" (random()) + a bright tick, both with fast decay.
if (!fs.existsSync(CLICK)) {
  execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i',
    "aevalsrc=exprs=0.75*(random(0)*2-1)*exp(-600*t)+0.3*sin(2*PI*2600*t)*exp(-500*t):s=48000:d=0.045",
    '-ac', '2', '-af', 'volume=1.3', CLICK], { stdio: 'ignore' });
  console.log('[broll] synthesized click.wav (laptop click)');
}

// 2) card geometry
const CW = 360, PAD = 12, CAP = 70;            // content, border, polaroid caption strip
const CANW = CW + PAD * 2, CANH = CW + PAD + CAP; // 384 x 442
const Y = Math.round((720 - CANH) / 2);         // vertically centered
const X_RIGHT = 1280 - CANW - 40, X_LEFT = 40;

// 3) build inputs + filter graph
const inputs = ['-i', BASE];
broll.forEach((b) => { inputs.push('-framerate', '30', '-loop', '1', '-t', String(DUR), '-i', path.join(process.cwd(), 'broll', `${b.id}.png`)); });
inputs.push('-i', CLICK); // audio click source (index = broll.length + 1)

const win = (id) => WINS.find((w) => w.id === id);
const cards = broll.map((b, i) => {
  const w = win(b.id);
  const app = +(w.start + 0.5).toFixed(2);      // pop-in a beat after she starts the point
  const dis = +(w.end - 0.4).toFixed(2);         // pop-out before the beat ends
  const x = b.side === 'right' ? X_RIGHT : X_LEFT;
  return { idx: i + 1, app, dis, x };
});

let fc = '';
cards.forEach((c) => {
  fc += `[${c.idx}:v]scale=${CW}:${CW}:force_original_aspect_ratio=increase,crop=${CW}:${CW},setsar=1,` +
    `pad=${CANW}:${CANH}:${PAD}:${PAD}:color=white,format=rgba,` +
    `fade=t=in:st=${c.app}:d=0.25:alpha=1,fade=t=out:st=${(c.dis - 0.25).toFixed(2)}:d=0.25:alpha=1[c${c.idx}];`;
});
let prev = '[0:v]';
cards.forEach((c, k) => {
  const out = `[o${k}]`;
  fc += `${prev}[c${c.idx}]overlay=x=${c.x}:y='${Y}+26*(1-min(1,(t-${c.app})/0.25))':enable='between(t,${c.app},${c.dis})'${out};`;
  prev = out;
});
const vlabel = `[o${cards.length - 1}]`;

// audio: split the pop source into one delayed copy per card, mix over the base track
const popIdx = broll.length + 1;
fc += `[${popIdx}:a]asplit=${cards.length}${cards.map((_, k) => `[pa${k}]`).join('')};`;
cards.forEach((c, k) => { const ms = Math.round(c.app * 1000); fc += `[pa${k}]adelay=${ms}|${ms}[pd${k}];`; });
fc += `[0:a]${cards.map((_, k) => `[pd${k}]`).join('')}amix=inputs=${cards.length + 1}:normalize=0:dropout_transition=0[aout]`;

const args = ['-y', ...inputs, '-filter_complex', fc, '-map', vlabel, '-map', '[aout]'];
if (SAMPLE) args.push('-t', String(SAMPLE));
args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '18',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT);

console.log(`[broll] compositing ${cards.length} snaps${SAMPLE ? ` (SAMPLE ${SAMPLE}s)` : ''} -> ${OUT}`);
cards.forEach((c) => console.log(`   snap ${c.idx} @ ${c.app}s–${c.dis}s  x=${c.x}`));
execFileSync(ffmpeg, args, { stdio: ['ignore', 'ignore', 'inherit'] });

const probe = JSON.parse(execFileSync(ffprobe.path, ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', OUT]).toString());
console.log(`[broll] ✅ ${OUT}`);
console.log(`[broll]    duration ${(+probe.format.duration).toFixed(1)}s · video ${probe.streams.some(s => s.codec_type === 'video') ? 'yes' : 'NO'} · audio ${probe.streams.some(s => s.codec_type === 'audio') ? 'yes' : 'NO'}`);
