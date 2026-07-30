'use strict';
/*
 * compile-lesson.js — render the seekable timeline to frames, then encode the
 * BARE lesson MP4 (1920x1080 / 30fps / h264 yuv420p / AAC). NOT the deliverable
 * (stitch-brand.js wraps it in the bumpers -> _final.mp4).
 *
 * LAW 3 (force fresh render): frames are wiped and re-rendered unless --reuse.
 * LAW 7 (deterministic/seekable): we drive window.seekTo(ms) per frame.
 *
 * Modes:
 *   node compile-lesson.js            full bare render -> out/lesson.mp4
 *   node compile-lesson.js --reuse    keep existing frames, just re-encode
 *   SAMPLE_IDS=03,05 node compile-lesson.js --sample
 *                                     spot-check: early/mid/late frame WITHIN
 *                                     each named beat -> preview-lesson/
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const puppeteer = require('puppeteer');
const ffmpeg = require('ffmpeg-static');
const { mixAudio } = require('./mix-audio');

const beats = require('./beats.js');
const CWD = process.cwd();
const NAME = process.env.LESSON_NAME || 'lesson';
const FPS = 30, W = 1920, H = 1080;

const durPath = path.join(CWD, 'durations.json');
if (!fs.existsSync(durPath)) { console.error('[compile] durations.json missing — run tts-lesson.js first.'); process.exit(1); }
const durations = JSON.parse(fs.readFileSync(durPath, 'utf8'));

// assert clips == beats (repurposing a folder can leave OLD voiceover under new visuals)
for (const b of beats) {
  if (!(b.id in durations)) { console.error(`[compile] no duration for beat ${b.id} — re-run tts-lesson.js.`); process.exit(1); }
  const sidecar = path.join(CWD, 'audio', `vo_${b.id}.txt`);
  if (fs.existsSync(sidecar) && fs.readFileSync(sidecar, 'utf8') !== b.vo) {
    console.error(`[compile] beat ${b.id}: audio sidecar != beat.vo — re-run tts-lesson.js (stale VO).`); process.exit(1);
  }
}

const starts = {}; let total = 0;
for (const b of beats) { starts[b.id] = total; total += durations[b.id]; }

// gather per-beat cutout anchors (for puppet placement) if segmentation ran
const anchors = {};
for (const b of beats) {
  const ap = path.join(CWD, 'layers', b.id, 'anchors.json');
  if (fs.existsSync(ap)) { try { anchors[b.id] = JSON.parse(fs.readFileSync(ap, 'utf8')); } catch {} }
}

// gather per-beat moving clips (Video A: image-to-video) if generated
const clips = {};
for (const b of beats) {
  if (fs.existsSync(path.join(CWD, 'clips', `${b.id}.mp4`))) clips[b.id] = true;
}

// gather per-beat head/body rig pivots (Video B: rigged puppet) if split
const rigs = {};
for (const b of beats) {
  const rp = path.join(CWD, 'layers', b.id, 'rig.json');
  if (fs.existsSync(rp)) { try { rigs[b.id] = JSON.parse(fs.readFileSync(rp, 'utf8')); } catch {} }
}

const isSample = process.argv.includes('--sample');
const reuse = process.argv.includes('--reuse');
const framesDir = path.join(CWD, 'frames', NAME);
const previewDir = path.join(CWD, 'preview-lesson');

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }

// Prefer a system Chrome if puppeteer's bundled browser isn't installed.
function launchOpts() {
  // Explicit unique userDataDir: Puppeteer only auto-deletes profiles IT created in
  // the temp dir; giving our own dir means it never runs the close-time unlink that
  // throws EBUSY on Windows (Crashpad/antivirus holds a lock on the profile files).
  const udir = path.join(CWD, '.chrome-profile', `${NAME}-${process.pid}`);
  fs.mkdirSync(udir, { recursive: true });
  const o = { headless: 'new', userDataDir: udir, args: ['--no-sandbox', '--force-color-profile=srgb'] };
  const candidates = [process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean);
  const found = candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } });
  if (found) o.executablePath = found; else o.channel = 'chrome';
  return o;
}

async function withPage(fn) {
  const browser = await puppeteer.launch(launchOpts());
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    // inject data BEFORE the page scripts run (avoids file:// fetch/CORS issues)
    await page.evaluateOnNewDocument((data) => { window.__DATA = data; }, { beats, durations, anchors, clips, rigs });
    const htmlRel = process.env.LESSON_HTML || 'animation/lesson.html';
    const url = 'file://' + path.join(__dirname, htmlRel).replace(/\\/g, '/');
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction('window.ready === true', { timeout: 20000 });
    await fn(page);
  } finally { await browser.close(); }
}

async function renderFull() {
  const totalFrames = Math.round(total * FPS);
  const existing = fs.existsSync(framesDir) ? fs.readdirSync(framesDir).filter(f => f.endsWith('.png')).length : 0;
  if (reuse && existing >= totalFrames) {
    console.log(`[compile] --reuse: keeping ${existing} cached frames, skipping render.`);
    return;
  }
  if (!reuse) { rmrf(framesDir); }
  fs.mkdirSync(framesDir, { recursive: true });
  console.log(`[compile] ${beats.length} beats, ${total.toFixed(1)}s, ${totalFrames} frames -> ${framesDir}`);
  await withPage(async (page) => {
    for (let f = 0; f < totalFrames; f++) {
      const ms = (f / FPS) * 1000;
      await page.evaluate((t) => window.seekTo(t), ms);
      await page.screenshot({ path: path.join(framesDir, `f_${String(f).padStart(6, '0')}.png`) });
      if (f % 30 === 0) process.stdout.write(`\r[compile] frame ${f}/${totalFrames}`);
    }
    process.stdout.write('\n');
  });
}

async function renderSample() {
  const ids = (process.env.SAMPLE_IDS || beats.slice(0, 2).map(b => b.id).join(',')).split(',').map(s => s.trim());
  rmrf(previewDir); fs.mkdirSync(previewDir, { recursive: true });
  console.log(`[compile] SAMPLE beats: ${ids.join(', ')} (early/mid/late within each)`);
  await withPage(async (page) => {
    for (const id of ids) {
      const b = beats.find(x => x.id === id); if (!b) { console.log(`  ! no beat ${id}`); continue; }
      const s = starts[id], d = durations[id];
      for (const [tag, frac] of [['early', 0.08], ['mid', 0.5], ['late', 0.92]]) {
        const ms = (s + d * frac) * 1000;
        await page.evaluate((t) => window.seekTo(t), ms);
        await page.screenshot({ path: path.join(previewDir, `beat_${id}_${tag}.png`) });
      }
      console.log(`  beat ${id}: wrote early/mid/late`);
    }
  });
  console.log('[compile] sample done — confirm the visual CHANGES across early->late (Law 6).');
}

function encode() {
  fs.mkdirSync(path.join(CWD, 'out'), { recursive: true });
  const audio = path.join(CWD, 'audio', `_mix_${NAME}.wav`);
  console.log('[compile] mixing audio (VO placed per-beat + ducked music) …');
  mixAudio({ beats, durations, audioDir: path.join(CWD, 'audio'), outPath: audio });
  const outMp4 = path.join(CWD, 'out', `${NAME}.mp4`);
  console.log('[compile] encoding MP4 …');
  execFileSync(ffmpeg, ['-y',
    '-framerate', String(FPS), '-i', path.join(framesDir, 'f_%06d.png'),
    '-i', audio,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-r', String(FPS), '-s', `${W}x${H}`,
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-shortest', outMp4], { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log(`\n[compile] BARE lesson -> out/${NAME}.mp4  (NOT the deliverable — run stitch-brand.js)`);
}

(async () => {
  if (isSample) { await renderSample(); return; }
  await renderFull();
  encode();
})();
