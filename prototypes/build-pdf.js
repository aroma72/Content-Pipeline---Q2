// PROTOTYPE TOOL — render the handoff document to a shareable PDF.
//   node prototypes/build-pdf.js
// Run prototypes/build.js first: this consumes the stills it captures.

const fs = require('fs');
const path = require('path');

const PUPPET_CANDIDATES = [
  '../drawing-room-video/drawing-room-remotion/node_modules/puppeteer',
  '../explainer-videos/autonomy/node_modules/puppeteer',
  '../explainer-videos/brand-intro-outro/node_modules/puppeteer',
];
let puppeteer = null;
for (const c of PUPPET_CANDIDATES) {
  try { puppeteer = require(path.resolve(__dirname, c)); break; } catch { /* next */ }
}
if (!puppeteer) throw new Error('puppeteer not found in:\n  ' + PUPPET_CANDIDATES.join('\n  '));

const SRC = path.join(__dirname, 'handoff-print.html');
const OUT = path.join(__dirname, 'In-Video-Question-Checkpoint.pdf');

const NEEDED = ['baked-quiz.jpg', 'a-playing.jpg', 'b-question.jpg', 'c-correct.jpg', 'd-wrong.jpg'];

(async () => {
  const missing = NEEDED.filter((f) => !fs.existsSync(path.join(__dirname, 'pdf-assets', f)));
  if (missing.length) {
    throw new Error('missing stills: ' + missing.join(', ') + '\n  run: node prototypes/build.js');
  }

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto('file://' + SRC, { waitUntil: 'networkidle0' });
    // Without this the PDF can render in a fallback face, silently.
    await page.evaluate(() => document.fonts.ready);

    // The document deliberately uses the faces the renderer itself uses, so the
    // PDF has no webfont dependency and cannot fall back silently.
    const fontsOk = await page.evaluate(() =>
      document.fonts.check('700 26pt Georgia') && document.fonts.check('10pt "Segoe UI"'));
    if (!fontsOk) console.warn('WARNING: Georgia / Segoe UI unavailable; PDF will use a fallback face');

    // Every image must have decoded, or a page prints with a blank box.
    const broken = await page.evaluate(() => [...document.images]
      .filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')));
    if (broken.length) throw new Error('images failed to load: ' + broken.join(', '));

    await page.pdf({
      path: OUT,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    // Count the real pages in the output. Counting `.page` divs instead is the
    // trap: it reports the intended number even when a section has overflowed
    // onto an extra sheet, which is exactly the failure worth catching.
    const buf = fs.readFileSync(OUT).toString('latin1');
    const pages = (buf.match(/\/Type\s*\/Page[^s]/g) || []).length;

    // The footers say "Page N of M". PDF text streams are compressed, so read M
    // from the source instead, and fail if the document lies about its length.
    const declared = (fs.readFileSync(SRC, 'utf8').match(/Page \d+ of (\d+)/) || [])[1];
    if (declared && Number(declared) !== pages) {
      throw new Error(`the document's footers say "of ${declared}" but the PDF has ` +
        `${pages} pages — a section overflowed its sheet`);
    }
    console.log(`PDF written: ${path.basename(OUT)} · ${pages} pages · ` +
      `${(fs.statSync(OUT).size / 1024).toFixed(0)}KB`);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
