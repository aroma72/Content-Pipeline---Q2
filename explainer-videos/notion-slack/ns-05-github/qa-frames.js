'use strict';
/*
 * qa-frames.js — DETERMINISTIC SENSOR for what the frame actually looks like.
 *
 *     node qa-frames.js                 # exits 2 on any violation
 *     LESSON_HTML=animation/walkthrough.html node qa-frames.js
 *
 * WHY THIS EXISTS
 * On 2026-09-17 a video passed every gate in the pipeline and shipped with text rendering at roughly
 * 20px on a 1920x1080 frame — unreadable. The cause was one missing <link>: the renderer loaded
 * info.js but not info.css, so every info template fell back to browser-default type. Aroma watched
 * it and said "very small text".
 *
 * Nothing could have caught it. qa-info checks the card's DATA shape. qa-checkpoint checks the
 * question. verify.js checks the container (codec, fps, duration, audio). None of them looks at a
 * pixel. A video can be green on all of them and be illegible.
 *
 * So this gate opens the real renderer with the real beats and measures the real computed styles:
 *   1. NOTHING BELOW THE FLOOR — no visible text under 28px (VIDEO_PRODUCTION_RULES typography scale)
 *   2. TEXT-ONLY SLIDES READ AS STATEMENTS — a beat with no window/diagram must lead at >= 60px
 *   3. NO BLANK FRAMES — every beat must render some visible text
 *   4. NOTHING OFF-CANVAS — no visible element spilling outside 1920x1080
 *
 * It measures styles rather than pixels, so it is exact and fast: one browser, no screenshots.
 */
const fs = require('fs');
const path = require('path');

const CWD = process.cwd();
/*
 * Which renderer to measure. Defaulting blindly to lesson.html made this gate report every `card`
 * beat of a technical how-to as "a blank frame" — lesson.html has no card/ui mode, so it genuinely
 * rendered nothing, and the finding said nothing about the video that will actually be compiled.
 * So: honour LESSON_HTML when set, otherwise pick the renderer that can draw these beats.
 */
const pickRenderer = (list) => {
  if (process.env.LESSON_HTML) return process.env.LESSON_HTML;
  const needsWalkthrough = list.some((b) => b && (b.mode === 'ui' || b.mode === 'card'));
  if (needsWalkthrough && fs.existsSync(path.join(CWD, 'animation', 'walkthrough.html'))) {
    return 'animation/walkthrough.html';
  }
  return 'animation/lesson.html';
};
const MIN_ANY = 28;        // the floor from the typography scale
const MIN_TEXT_ONLY = 60;  // a bare sentence on screen has to carry the frame

const beatsAll = require(path.join(CWD, 'beats.js'));
let beats = beatsAll;
try {
  const { renderable } = require(path.join(CWD, 'lib', 'beats-util'));
  beats = renderable(beatsAll);
} catch { /* older folder without the helper */ }

const durFile = path.join(CWD, 'durations.json');
const durations = fs.existsSync(durFile) ? JSON.parse(fs.readFileSync(durFile, 'utf8')) : {};
if (!Object.keys(durations).length) {
  console.log('[qa-frames] ⏭  no durations.json yet — run tts-lesson.js first, then this gate.');
  process.exit(0);
}

const LESSON_HTML = pickRenderer(beats);
const htmlPath = path.join(CWD, LESSON_HTML);
if (!fs.existsSync(htmlPath)) {
  console.log(`[qa-frames] ⏭  ${LESSON_HTML} not found — nothing to measure.`);
  process.exit(0);
}

let puppeteer;
try { puppeteer = require('puppeteer'); }
catch { console.log('[qa-frames] ⏭  puppeteer not installed here.'); process.exit(0); }

(async () => {
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  // __DATA must exist BEFORE the page's own init script runs, or the renderer builds
  // nothing and this gate passes vacuously — which it did on its first run.
  await page.evaluateOnNewDocument((data) => { window.__DATA = data; }, { beats, durations });
  await page.goto('file:///' + htmlPath.split(path.sep).join('/'), { waitUntil: 'load' });
  await page.waitForFunction(() => window.ready === true, { timeout: 30000 });
  const built = await page.evaluate(() => document.querySelectorAll('.layer').length);
  if (!built) {
    console.log('[qa-frames] ❌ FAIL — the renderer built 0 layers. It never received the beats.');
    await browser.close(); process.exit(2);
  }

  // Build the timeline in-page exactly as the renderer does, then measure each layer.
  const findings = await page.evaluate(() => {
    const out = [];
    const layers = [...document.querySelectorAll('.layer')];
    layers.forEach((layer, i) => {
      layer.style.opacity = 1;
      const texts = [];
      layer.querySelectorAll('*').forEach((el) => {
        const t = (el.childNodes.length && [...el.childNodes]
          .filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ')) || '';
        if (!t) return;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        texts.push({ text: t.slice(0, 60), size: parseFloat(cs.fontSize) || 0 });
      });
      // "Text only" means a BARE SENTENCE carrying the frame — that is what has to be large.
      // A laid-out component (key/value rows, a ticked list, two cards, a count-up) is a visual:
      // its type is smaller by design and the 28px floor is the right bar for it, not 60px.
      const STRUCTURED = '.win, img, svg, canvas, .cellgrid, .bar-track, .twocard, .fourparts, '
        + '.checks, .bignum, .tally, .bars, .gridwrap, .screen, .promptcard, .quote, .spectrum, '
        + '.gauge, .answers, .piles, .scoresheet, .browser, .dial, .mini-card, .part, .check';
      const hasWindow = Boolean(layer.querySelector(STRUCTURED));
      const sizes = texts.map((t) => t.size).filter((n) => n > 0);
      const rects = [...layer.querySelectorAll('*')].filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2 && (r.left < -8 || r.top < -8 || r.right > 1928 || r.bottom > 1088);
      }).length;
      out.push({
        i, hasWindow, count: texts.length,
        min: sizes.length ? Math.min(...sizes) : 0,
        max: sizes.length ? Math.max(...sizes) : 0,
        smallest: texts.slice().sort((a, b) => a.size - b.size)[0] || null,
        overflow: rects,
      });
      layer.style.opacity = 0;
    });
    return out;
  });

  await browser.close();

  const problems = [];
  const notes = [];
  findings.forEach((f) => {
    const b = beats[f.i];
    if (!b) return;
    const id = `beat ${b.id}`;
    if (!f.count) { problems.push(`${id}: renders NO visible text — a blank frame`); return; }
    if (f.min && f.min < MIN_ANY) {
      problems.push(`${id}: text at ${f.min.toFixed(0)}px — below the ${MIN_ANY}px floor `
        + `("${f.smallest ? f.smallest.text : ''}"). Usually a missing stylesheet, not a size choice.`);
    }
    if (!f.hasWindow && f.max < MIN_TEXT_ONLY) {
      problems.push(`${id}: text-only slide but the largest text is ${f.max.toFixed(0)}px — a bare `
        + `sentence must lead at >= ${MIN_TEXT_ONLY}px, centred, so it carries the frame.`);
    }
    if (f.overflow) problems.push(`${id}: ${f.overflow} element(s) spill outside 1920x1080`);
    notes.push(`${id}: ${f.count} text node(s), ${f.min.toFixed(0)}–${f.max.toFixed(0)}px`
      + (f.hasWindow ? ', has a visual' : ', text only'));
  });

  if (!problems.length) {
    console.log(`[qa-frames] ✅ PASS — ${findings.length} beat(s) measured in ${LESSON_HTML}; `
      + `nothing under ${MIN_ANY}px, every text-only slide leads at ${MIN_TEXT_ONLY}px+.`);
    process.exit(0);
  }
  console.log(`[qa-frames] ❌ FAIL — ${problems.length} problem(s):\n`);
  problems.forEach((p) => console.log('  · ' + p));
  console.log('\nThese are invisible to every other gate — they check data, timing and container, '
    + 'never the rendered frame.');
  process.exit(2);
})();
