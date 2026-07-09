'use strict';
/*
 * render-bumpers.js — render this repo's brand intro + outro for one lesson.
 * Called by a lesson's stitch-brand.js:
 *   node render-bumpers.js --title "My Lesson" --intro <path> --outro <path>
 *
 * Each bumper renders at the shared invariants (1920x1080 / 30 / yuv420p / AAC 48k
 * with a silent track) so the downstream concat re-encodes cleanly.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const puppeteer = require('puppeteer');
const ffmpeg = require('ffmpeg-static');
const cfg = require('./config');

function arg(n, d) { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] : d; }
const title = arg('title', process.env.LESSON_TITLE || 'Lesson');
const introOut = path.resolve(arg('intro', 'out/intro.mp4'));
const outroOut = path.resolve(arg('outro', 'out/outro.mp4'));
const FPS = 30, W = 1920, H = 1080;

function logoDataUri() {
  const p = path.join(__dirname, cfg.logoFile);
  if (fs.existsSync(p)) return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
  return null;
}

async function renderOne(mode, seconds, outFile) {
  const framesDir = path.join(__dirname, 'frames', mode);
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  const _o = { headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb'] };
  const _cands = [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean);
  const _found = _cands.find(p => { try { return fs.existsSync(p); } catch { return false; } });
  if (_found) _o.executablePath = _found; else _o.channel = 'chrome';
  const browser = await puppeteer.launch(_o);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument((data) => { window.__BUMPER = data; },
      { mode, title, cfg, logoDataUri: logoDataUri() });
    await page.goto('file://' + path.join(__dirname, 'bumper.html').replace(/\\/g, '/'), { waitUntil: 'load' });
    await page.waitForFunction('window.ready === true', { timeout: 15000 });
    const frames = Math.round(seconds * FPS);
    for (let f = 0; f < frames; f++) {
      await page.evaluate((t) => window.seekTo(t), (f / FPS) * 1000);
      await page.screenshot({ path: path.join(framesDir, `f_${String(f).padStart(5, '0')}.png`) });
    }
  } finally { await browser.close(); }

  // encode with a silent stereo AAC track (matches lesson invariants for clean concat)
  execFileSync(ffmpeg, ['-y',
    '-framerate', String(FPS), '-i', path.join(framesDir, 'f_%05d.png'),
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-s', `${W}x${H}`,
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', outFile],
    { stdio: ['ignore', 'ignore', 'inherit'] });
  fs.rmSync(framesDir, { recursive: true, force: true });
  console.log(`[bumper] ${mode} -> ${outFile}`);
}

(async () => {
  await renderOne('intro', cfg.introSeconds, introOut);
  await renderOne('outro', cfg.outroSeconds, outroOut);
})();
