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

const { renderable } = require('./lib/beats-util');
// checkpoint beats are LMS pause points, never drawn and never spoken — see lib/beats-util.js
const beats = renderable(require('./beats.js'));
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
  const udir = path.join(CWD, '.chrome-profile', `${NAME}-${process.pid}${launchOpts.__w != null ? '-w' + launchOpts.__w : ''}`);
  fs.mkdirSync(udir, { recursive: true });
  // A 2K-art beat can exceed the default 180s protocol timeout mid-screenshot.
  const o = { headless: 'new', userDataDir: udir, protocolTimeout: 300000,
    args: ['--no-sandbox', '--force-color-profile=srgb'] };
  const candidates = [process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean);
  const found = candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } });
  if (found) o.executablePath = found; else o.channel = 'chrome';
  return o;
}


// PARALLEL RENDER (2026-08-21): the frame loop was single-threaded — one page, one frame at a time
// — using ~1 of 8 cores. Frames are INDEPENDENT because window.seekTo(ms) recomputes every visual
// from time (LAW 10), so N workers each render a stripe. RENDER_WORKERS=1 restores serial.
/**
 * What the page said before it died.
 *
 * A render failure surfaced as 'UnhandledPromiseRejection ... "#<ErrorEvent>"'
 * and nothing else. An ErrorEvent is what the browser fires for a FAILED
 * RESOURCE -- an <img> that 404s, most often a missing art PNG -- and it carries
 * no message and no stack, so Node printed the constructor name and that was the
 * entire diagnosis. These listeners keep the last few real events so the thrown
 * error can name the file that was actually missing.
 */
const pageTrouble = [];
function watchPage(page, who) {
  const note = (kind, detail) => {
    pageTrouble.push(`[${who}] ${kind}: ${detail}`);
    if (pageTrouble.length > 12) pageTrouble.shift();
  };
  page.on('pageerror', (e) => note('page error', (e && e.message) || String(e)));
  page.on('requestfailed', (r) => {
    const url = r.url();
    // data: URIs are inlined art and fail noisily on abort during teardown.
    if (!url.startsWith('data:')) note('failed to load', `${url.split('/').pop()} (${(r.failure() || {}).errorText})`);
  });
  page.on('console', (m) => { if (m.type() === 'error') note('console', m.text().slice(0, 200)); });
}

/**
 * Turn whatever a page rejected with into something a person can act on.
 * Puppeteer hands back the raw value, and an ErrorEvent stringifies to nothing.
 */
function explain(err) {
  const e = err || {};
  let msg = e.message || e.text || (typeof e === 'string' ? e : '');
  if (!msg && e.constructor && e.constructor.name) msg = `the page threw a ${e.constructor.name}`;
  if (!msg) msg = String(err);
  if (e.filename || e.lineno) msg += ` (at ${e.filename || 'page'}:${e.lineno || '?'})`;
  const out = new Error(msg);
  if (pageTrouble.length) out.message += '\n  the page reported:\n    ' + pageTrouble.join('\n    ');
  return out;
}

async function openPage(worker) {
  launchOpts.__w = worker;            // unique Chrome profile per worker (they cannot share one)
  const opts = launchOpts();
  launchOpts.__w = undefined;
  const browser = await puppeteer.launch(opts);
  const page = await browser.newPage();
  watchPage(page, worker);
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((data) => { window.__DATA = data; }, { beats, durations, anchors, clips, rigs });
  const htmlRel = process.env.LESSON_HTML || 'animation/lesson.html';
  const url = 'file://' + path.join(__dirname, htmlRel).replace(/\\/g, '/');
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.ready === true', { timeout: 60000 });
  // The page sets this instead of hanging when its own setup fails.
  const readyError = await page.evaluate(() => window.__readyError || null);
  if (readyError) throw new Error(`the lesson page failed to initialise: ${readyError}`);
  return { browser, page };
}

async function withPage(fn) {
  const browser = await puppeteer.launch(launchOpts());
  try {
    const page = await browser.newPage();
    watchPage(page, 'sample');
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    // inject data BEFORE the page scripts run (avoids file:// fetch/CORS issues)
    await page.evaluateOnNewDocument((data) => { window.__DATA = data; }, { beats, durations, anchors, clips, rigs });
    const url = 'file://' + path.join(__dirname, process.env.LESSON_HTML || 'animation/lesson.html').replace(/\\/g, '/');
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
  // Six headless Chromes at 1920x1080 is ~500MB each, which a build container does
  // not have. When Chrome is killed the puppeteer websocket rejects the pending
  // screenshot with an ErrorEvent -- no message, no stack -- which is how a render
  // failure arrived as 'UnhandledPromiseRejection ... "#<ErrorEvent>"'. So the
  // worker count is bounded by MEMORY as well as cores: a core with no RAM behind
  // it cannot render a frame.
  const os = require('os');
  const gb = os.totalmem() / 1073741824;
  const byMemory = Math.max(1, Math.floor(gb / 1.2));   // ~1.2GB per Chrome, measured
  const WORKERS = Math.max(1, Math.min(
    parseInt(process.env.RENDER_WORKERS || '6', 10),
    os.cpus().length - 2,
    byMemory,
    totalFrames));
  if (WORKERS < Math.min(6, os.cpus().length - 2)) {
    console.log(`[compile] ${gb.toFixed(1)}GB RAM -> capping at ${WORKERS} worker(s)`);
  }
  console.log(`[compile] rendering with ${WORKERS} parallel worker(s)`);
  let done = 0;
  const stripe = async (w) => {
    const { browser, page } = await openPage(w);
    try {
      for (let f = w; f < totalFrames; f += WORKERS) {
        await page.evaluate((t) => window.seekTo(t), (f / FPS) * 1000);
        await page.screenshot({ path: path.join(framesDir, `f_${String(f).padStart(6, '0')}.png`) });
        if ((++done) % 120 === 0) process.stdout.write(`\r[compile] frame ${done}/${totalFrames}`);
      }
    } finally { await browser.close(); }
  };
  // allSettled, not all: with Promise.all a second worker's rejection arrives
  // after the first has already rejected the combined promise, and becomes an
  // unhandled rejection of its own -- which is how one missing PNG killed the
  // process with a message naming no file.
  const results = await Promise.allSettled(Array.from({ length: WORKERS }, (_, w) => stripe(w)));
  const failure = results.find((r) => r.status === 'rejected');
  if (failure) throw explain(failure.reason);
  process.stdout.write(`\r[compile] frame ${totalFrames}/${totalFrames}\n`);
  const written = fs.readdirSync(framesDir).filter((f) => f.endsWith('.png')).length;
  if (written !== totalFrames) throw new Error(`render incomplete: ${written}/${totalFrames} frames`);
  console.log(`[compile] all ${written} frames verified present`);
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

// Without this catch, any rejection above reaches Node's unhandled-rejection
// handler, which in Node 22 kills the process and prints the raw reason. That is
// how a render failure came back as 'Exit 1: UnhandledPromiseRejection ...
// "#<ErrorEvent>"' with no indication of what was wrong or where.
(async () => {
  if (isSample) { await renderSample(); return; }
  await renderFull();
  encode();
})().catch((err) => {
  const e = explain(err);
  console.error(`\n[compile] FAILED: ${e.message}`);
  if (err && err.stack && err.stack !== e.stack) console.error(err.stack.split('\n').slice(0, 4).join('\n'));
  process.exit(1);
});
