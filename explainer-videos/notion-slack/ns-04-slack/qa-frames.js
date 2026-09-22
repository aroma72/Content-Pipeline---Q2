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
  // headless 'new', not 'shell': 'shell' makes Puppeteer demand a separate
  // chrome-headless-shell binary, and the image deliberately ships only the system
  // Chromium. That mismatch exited 1 AFTER the render was paid for, and the error
  // was reported to the LMS as a quality finding a person should rule on.
  //
  // executablePath is belt-and-braces. PUPPETEER_EXECUTABLE_PATH in the Dockerfile
  // is what actually resolves this in production; CHROME_PATH is read here too
  // because that is the name the rest of the pipeline already sets.
  //
  // --disable-dev-shm-usage because a container's /dev/shm is small and Chrome
  // crashes writing screenshots into it. Puppeteer's own Docker guidance.
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    ...(process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH
      ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH }
      : {}),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  // __DATA must exist BEFORE the page's own init script runs, or the renderer builds
  // nothing and this gate passes vacuously — which it did on its first run.
  await page.evaluateOnNewDocument((data) => { window.__DATA = data; }, { beats, durations });
  await page.goto('file:///' + htmlPath.split(path.sep).join('/'), { waitUntil: 'load' });
  await page.waitForFunction(() => window.ready === true, { timeout: 30000 });

  // Wait for the layers' images before measuring anything about them.
  // `waitUntil: 'load'` above fires BEFORE the renderer builds the layers from
  // window.__DATA, so every <img> is created after it and none of them are
  // awaited by it. Measuring here without this would report a still-loading
  // image as a missing one -- a false alarm indistinguishable from the real
  // fault, which is the failure mode this gate exists to avoid.
  await page.evaluate(() => Promise.all([...document.images].map(
    (i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; })))));
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
      // Whether the pictures actually arrived. An <img> whose src 404s still sits
      // in the DOM with a box, so element counts and selectors cannot tell a drawn
      // frame from an empty one -- naturalWidth is the only thing that can. This
      // is what makes rule 3 real: art that failed to generate now fails the gate
      // instead of shipping as a silent black rectangle.
      const imgs = [...layer.querySelectorAll('img')];
      const brokenImgs = imgs.filter((im) => im.complete && !im.naturalWidth).length;
      const hasWindow = Boolean(layer.querySelector(STRUCTURED));
      const sizes = texts.map((t) => t.size).filter((n) => n > 0);
      // LAYOUT overflow, not animated overflow.
      //
      // getBoundingClientRect() includes transforms, and the push-in deliberately
      // scales the full-bleed art past the frame -- lesson.html ramps
      // scale(1.04 -> 1.11), and body{overflow:hidden} crops it. That is how a
      // Ken Burns move works, and measuring it post-transform reported a working
      // animation as "1 element spills by 94px" and blocked a paid render.
      //
      // offsetLeft/offsetWidth are the pre-transform layout box, which is what
      // this rule is actually about: something POSITIONED wrong, not something
      // moving on purpose.
      const spills = [...layer.querySelectorAll('*')].map((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return null;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (!(w > 2 && h > 2)) return null;
        let left = 0;
        let top = 0;
        for (let n = el; n && n !== layer; n = n.offsetParent) {
          left += n.offsetLeft;
          top += n.offsetTop;
        }
        const over = Math.max(-left, -top, left + w - 1920, top + h - 1080, 0);
        if (over <= 8) return null;
        const cls = (el.className && String(el.className).split(/\s+/)[0]) || '';
        return { sel: el.tagName.toLowerCase() + (cls ? '.' + cls : ''), over: Math.round(over) };
      }).filter(Boolean);
      const rects = spills.length;
      // Worst first, de-duplicated by selector: 153 rows of the same class is one
      // fault repeated, and saying so is the whole point.
      const byWorst = {};
      for (const s of spills) byWorst[s.sel] = Math.max(byWorst[s.sel] || 0, s.over);
      const spillTop = Object.entries(byWorst).sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([sel, over]) => `${sel} by ${over}px`);
      out.push({
        i, hasWindow, count: texts.length, imgs: imgs.length, brokenImgs,
        min: sizes.length ? Math.min(...sizes) : 0,
        max: sizes.length ? Math.max(...sizes) : 0,
        smallest: texts.slice().sort((a, b) => a.size - b.size)[0] || null,
        overflow: rects, spillTop,
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
    // Does this beat put a PICTURE on screen, as opposed to a bare sentence?
    //
    // The 60px floor exists for a slide that is nothing but words, because a lone
    // sentence has to carry the frame. A laid-out component sits below it by
    // design, so misjudging this blocks a correct video.
    //
    // The beat's own mode answers it, and a hand-maintained CSS selector list does
    // not. That list said `.scoresheet` while the template renders `.scoresheets`,
    // so a two-panel comparison table read as a bare sentence and failed the 60px
    // bar after the art was bought. Any template added since would drift the same
    // way, silently.
    const isInfo = Boolean(b && b.mode === 'info' && b.info && b.info.tpl);
    const hasWindow = isInfo || f.hasWindow || Boolean(f.imgs);
    const id = `beat ${b.id}`;
    // Rule 3, in two parts, because the old single check conflated them and the
    // message sent a reader after the wrong thing for an hour.
    //
    // A layer with no text but a picture is not blank -- that is an illustration
    // beat, and 909 of the 1276 beats in the shipped library are drawn that way.
    // What it must NOT be is wordless: the renderer puts nothing on an ali/scene
    // beat but its art, so a beat with neither a caption nor an overlay leaves a
    // learner watching with the sound off a picture and no point. Say that, and
    // say which field is missing, instead of calling a drawn frame blank.
    if (!f.count) {
      if (f.hasWindow || f.imgs) {
        problems.push(`${id}: draws art but NO words — add a \`cap\` (or an \`overlay\`). `
          + 'The renderer puts no text on an ali/scene beat by itself.');
      } else {
        problems.push(`${id}: renders nothing at all — no text and no visual.`);
      }
      return;
    }
    // A picture that did not load is the genuinely blank frame this gate is named
    // for, and until now it could not see one: a broken <img> keeps its box, so
    // only naturalWidth tells the difference.
    if (f.brokenImgs) {
      problems.push(`${id}: ${f.brokenImgs} image(s) failed to load — the frame is `
        + 'missing its art. Usually art generation failed, not a layout problem.');
    }
    if (f.min && f.min < MIN_ANY) {
      problems.push(`${id}: text at ${f.min.toFixed(0)}px — below the ${MIN_ANY}px floor `
        + `("${f.smallest ? f.smallest.text : ''}"). Usually a missing stylesheet, not a size choice.`);
    }
    if (!hasWindow && f.max < MIN_TEXT_ONLY) {
      problems.push(`${id}: text-only slide but the largest text is ${f.max.toFixed(0)}px — a bare `
        + `sentence must lead at >= ${MIN_TEXT_ONLY}px, centred, so it carries the frame.`);
    }
    if (f.overflow) {
      problems.push(`${id}: ${f.overflow} element(s) spill outside 1920x1080`
        + (f.spillTop && f.spillTop.length ? ` -- worst: ${f.spillTop.join(', ')}` : ''));
    }
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
