'use strict';
/*
 * qa-layout.js — DETERMINISTIC SENSOR for text that collides or cannot be read, in the
 * flat motion-graphics style (animation/lesson-lf.html + info-lf.js).
 *
 *     node qa-layout.js          # exit 0 pass / not this style · 2 findings · 3 could not run
 *
 * WHY THIS EXISTS
 * On 2026-10-16 Aroma reported that motion-graphics videos made by the LMS course builder had
 * text overlapping text and text that was hard to read — while the same style made by hand
 * here never did. The renderer was the same. The difference was the WORDS: hand-written beats
 * were sized to the templates' fixed positions and every frame was looked at; the course
 * builder's script model wrote ordinary sentences into the same fields, and nothing checked
 * the frame for one box sitting on another. qa-frames measures type size and spills off the
 * 1920x1080 edge; it could not see two labels on top of each other, a label clipped by its
 * split-screen half, or paper-coloured type that slid off its teal band onto cream.
 *
 * WHAT IT CHECKS, on the real renderer with the real beats (no durations needed, no spend):
 *   1. FIT — after the renderer's own fit pass (LFFit wraps and shrinks crowded type down to a
 *      readable floor), no text unit may still overlap another, sit on a figure or icon, or
 *      run outside its frame / half / band. Whatever remains is text the frame cannot hold.
 *   2. CONTRAST — every text unit a learner is meant to read must stand at least 3:1 against
 *      what is actually behind it at the end of its beat (WCAG large-text minimum; the
 *      smallest type here is 34px). Deliberately stepped-back items (dimmed) are exempt.
 *
 * It runs with the free script checks, BEFORE a person approves the script and before any
 * voice is bought, so a finding is a redraft brief ("say this shorter"), not a ruined render.
 * A style with no lf beats passes at once.
 */
/* global TL -- the timeline animation/lesson-lf.html builds; read inside page.evaluate() */
const fs = require('fs');
const path = require('path');

const CWD = process.cwd();
const MIN_CONTRAST = 3.0;
const SHRINK_MIN = 0.72;   // LFFit may go to 0.55 to save a frame; below 0.72 the text was simply too long

let beats = require(path.join(CWD, 'beats.js'));
try { beats = require(path.join(CWD, 'lib', 'beats-util')).renderable(beats); } catch { /* older folder */ }
const lfBeats = beats.filter((b) => b && b.mode === 'info' && b.info && /^lf[A-Z]/.test(String(b.info.tpl || '')));
if (!lfBeats.length) {
  console.log('[qa-layout] ⏭  no motion-graphics beats — nothing to measure.');
  process.exit(0);
}

const LESSON_HTML = /lesson-lf\.html$/.test(process.env.LESSON_HTML || '') ? process.env.LESSON_HTML : 'animation/lesson-lf.html';
const htmlPath = path.join(CWD, LESSON_HTML);
if (!fs.existsSync(htmlPath)) {
  console.log(`[qa-layout] ❌ could not run — ${LESSON_HTML} is missing, so the frames cannot be measured.`);
  process.exit(3);
}
let puppeteer;
try { puppeteer = require('puppeteer'); } catch {
  console.log('[qa-layout] ❌ could not run — puppeteer is not installed here.');
  process.exit(3);
}

// Which field of the beat a piece of on-screen text came from, so the finding names it.
const fieldOf = (data, text) => {
  const want = String(text || '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 24);
  if (!want) return null;
  let hit = null;
  const walk = (v, at) => {
    if (hit) return;
    if (typeof v === 'string') {
      const s = v.replace(/\s+/g, ' ').trim().toLowerCase();
      if (s && (want.includes(s.slice(0, 24)) || s.startsWith(want.slice(0, Math.min(want.length, 18))))) hit = at;
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${i}]`));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, at ? `${at}.${k}` : k));
  };
  walk(data, '');
  return hit;
};

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      ...(process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH
        ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH }
        : {}),
    });
  } catch (e) {
    console.log(`[qa-layout] ❌ could not run — the browser did not start: ${e.message}`);
    process.exit(3);
  }
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  // Timing does not change layout; 6s a beat stands in when no voice has been made yet.
  let durations = {};
  try { durations = JSON.parse(fs.readFileSync(path.join(CWD, 'durations.json'), 'utf8')); } catch { /* script stage */ }
  const timed = Object.fromEntries(beats.map((b) => [b.id, durations[b.id] || 6]));
  await page.evaluateOnNewDocument((data) => { window.__DATA = data; }, { beats, durations: timed });
  await page.goto('file:///' + htmlPath.split(path.sep).join('/'), { waitUntil: 'load' });
  await page.waitForFunction(() => window.ready === true, { timeout: 60000 });

  const hasFit = await page.evaluate(() => Boolean(window.LFFit && window.__fit));
  if (!hasFit) {
    await browser.close();
    console.log('[qa-layout] ❌ could not run — this folder\'s animation/info-lf.js predates the fit pass '
      + '(no window.LFFit). Refresh it from the skill templates.');
    process.exit(3);
  }

  const result = await page.evaluate((MIN, SHRINK_MIN) => {
    const parse = (c) => {
      const m = String(c || '').match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a] = m[1].split(',').map((x) => parseFloat(x));
      return { r, g, b, a: Number.isFinite(a) ? a : 1 };
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
    const over = (top, base) => ({
      r: top.r * top.a + base.r * (1 - top.a), g: top.g * top.a + base.g * (1 - top.a),
      b: top.b * top.a + base.b * (1 - top.a), a: 1,
    });
    const opacityChain = (n, stop) => {
      let o = 1;
      for (let p = n; p && p !== stop; p = p.parentElement) o *= parseFloat(getComputedStyle(p).opacity);
      return o;
    };
    const SHAPES = new Set(['rect', 'circle', 'ellipse', 'path', 'polygon', 'polyline']);
    const UNIT = '.lf-head, .lbl, .tag, .bubble, .card, .row-card, .row-stamp, [data-fit]';
    const out = {};

    TL.forEach((it) => {
      const layer = it.layer;
      // Measured here, not read from the renderer's own report: a renderer that skipped its fit
      // pass would report nothing wrong and pass a frame full of collisions.
      const found = window.LFFit.check(layer).map((x) => x.msg);
      TL.forEach((o) => { o.layer.style.display = o === it ? '' : 'none'; });
      const units = [...layer.querySelectorAll(UNIT)].filter((u) => !(u.parentElement && u.parentElement.closest(UNIT)));
      units.forEach((u) => {
        // Fitted, but only by shrinking it far below its design: a title smaller than its own
        // marker, a bubble that is a wall of small print. That is text too long for the frame.
        const sc = parseFloat(u.dataset.fitScale || '1');
        if (sc < SHRINK_MIN) {
          const t = (u.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
          found.push({ msg: `"${t}" only fits at ${Math.round(sc * 100)}% of its designed size — too long for this frame` });
        }
        // read it when it is on screen: near the end of the beat, or just before it fades out
        let until = 1;
        for (let p = u; p && p !== layer; p = p.parentElement) if (p.dataset && p.dataset.until != null) until = Math.min(until, parseFloat(p.dataset.until));
        window.seekTo(it.start + it.dur * Math.max(0.05, Math.min(0.97, until - 0.03)));
        if (opacityChain(u, layer) < 0.5) return;   // stepped back on purpose
        const textEl = [u, ...u.querySelectorAll('*')].find((n) => [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()));
        if (!textEl) return;
        const fg0 = parse(getComputedStyle(textEl).color);
        if (!fg0) return;
        const rg = document.createRange(); rg.selectNodeContents(u);
        const lines = [...rg.getClientRects()].filter((r) => r.width > 4 && r.height > 4);
        const ratios = [];
        lines.slice(0, 4).forEach((r) => [0.2, 0.5, 0.8].forEach((fx) => [0.3, 0.7].forEach((fy) => {
          const x = r.left + r.width * fx, y = r.top + r.height * fy;
          if (x < 0 || y < 0 || x > 1920 || y > 1080) return;
          const stack = document.elementsFromPoint(x, y);
          const layers = [];
          for (const el of stack) {
            if (!layer.contains(el)) continue;
            if (el !== u && u.contains(el)) continue;           // the glyphs themselves
            const cs = getComputedStyle(el);
            let c = null;
            if (SHAPES.has(el.tagName.toLowerCase())) {
              c = parse(cs.fill);
              if (c) c.a *= parseFloat(cs.fillOpacity || '1');
            } else {
              c = parse(cs.backgroundColor);
            }
            if (!c || c.a < 0.02) continue;
            c.a *= opacityChain(el, layer);
            if (c.a < 0.02) continue;
            layers.push(c);
            if (c.a > 0.98) break;
          }
          let bg = { r: 251, g: 240, b: 217, a: 1 };          // --cream, the stage behind everything
          for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
          const fg = over({ ...fg0, a: fg0.a * opacityChain(textEl, layer) }, bg);
          ratios.push(ratio(fg, bg));
        })));
        if (!ratios.length) return;
        ratios.sort((a, b) => a - b);
        const median = ratios[Math.floor(ratios.length / 2)];
        if (median < MIN) {
          const t = (u.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
          found.push({ contrast: median, text: t, msg: `"${t}" is hard to read: ${median.toFixed(1)}:1 against what is behind it (needs ${MIN}:1)` });
        }
      });
      TL.forEach((o) => { o.layer.style.display = ''; });
      if (found.length) out[it.id] = found.map((f) => (typeof f === 'string' ? { msg: f } : f));
    });
    return out;
  }, MIN_CONTRAST, SHRINK_MIN);

  await browser.close();

  const problems = [];
  for (const [id, list] of Object.entries(result)) {
    const b = beats.find((x) => String(x.id) === String(id));
    const tpl = b && b.info ? b.info.tpl : '?';
    const seen = new Set();
    list.forEach((f) => {
      if (seen.has(f.msg)) return; seen.add(f.msg);
      const quoted = (f.msg.match(/"([^"]+)"/) || [])[1];
      const field = b && b.info ? fieldOf(b.info.data, quoted) : null;
      problems.push(`beat ${id} (${tpl}): ${f.msg}${field ? ` — field \`${field}\`` : ''}`);
    });
  }

  if (!problems.length) {
    console.log(`[qa-layout] ✅ PASS — ${lfBeats.length} motion-graphics beat(s): no text overlaps text or a figure, `
      + `nothing leaves its frame, every line reads at ${MIN_CONTRAST}:1 or better.`);
    process.exit(0);
  }
  console.log(`[qa-layout] ❌ FAIL — ${problems.length} problem(s):\n`);
  problems.forEach((p) => console.log('  · ' + p));
  if (problems.some((p) => !/hard to read:/.test(p))) {
    console.log('\nThe renderer already wrapped and shrank this text to its smallest readable size and it still '
      + 'does not fit. Make the on-screen text SHORTER (the voice carries the detail), or split the idea across '
      + 'two beats. Do not just reword it at the same length.');
  }
  if (problems.some((p) => /hard to read:/.test(p))) {
    console.log('\nText that is hard to read is the wrong colour for its background: use the template\'s '
      + 'documented `bg` values (e.g. lfOptions and lfTalk on "teal"), not another colour field.');
  }
  process.exit(2);
})().catch((e) => {
  console.log(`[qa-layout] ❌ could not run — ${e && e.message ? e.message : e}`);
  process.exit(3);
});
