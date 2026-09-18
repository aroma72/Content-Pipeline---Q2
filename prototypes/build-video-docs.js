// PROTOTYPE TOOL — render the Make a Video handoff documents to PDF.
//   node prototypes/build-video-docs.js
//
// Verifies what the earlier build script learned to verify: that the fonts the
// design depends on actually resolved, and that the PDF has the number of pages
// its own footers claim. Counting `.page` divs instead reports the INTENDED
// number even when a section has overflowed onto an extra sheet, which is the
// one failure worth catching in a document you hand to someone else.

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

const DOCS = [
  { src: 'video-builder-concept.html',   out: 'Make-A-Video-Concept.pdf' },
  { src: 'video-builder-technical.html', out: 'Make-A-Video-Technical.pdf' },
  { src: 'lms-reply-2026-09-17.html',     out: 'LMS-Reply-2026-09-17.pdf' },
  { src: 'lms-reply-2026-09-18.html',     out: 'LMS-Reply-2026-09-18.pdf' },
  // The course-builder pair was built by hand and so drifted from its source --
  // including a credential that had been scrubbed from the HTML but survived in
  // the PDF. Anything we send has to be rebuildable by running this.
  { src: 'course-builder-concept.html',   out: 'Course-Builder-Concept.pdf' },
  { src: 'course-builder-technical.html', out: 'Course-Builder-Technical.pdf' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const problems = [];
  try {
    for (const d of DOCS) {
      const src = path.join(__dirname, d.src);
      const out = path.join(__dirname, d.out);
      if (!fs.existsSync(src)) throw new Error(`missing source: ${d.src}`);

      const page = await browser.newPage();
      await page.goto('file://' + src, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);

      // The design uses faces Windows ships, so the PDF has no webfont
      // dependency -- but a missing one falls back silently, so check.
      const fontsOk = await page.evaluate(() =>
        document.fonts.check('700 24pt Georgia') && document.fonts.check('9pt "Segoe UI"'));
      if (!fontsOk) problems.push(`${d.out}: Georgia / Segoe UI unavailable, fell back silently`);

      // Nothing should overflow its sheet horizontally either.
      const wide = await page.evaluate(() => {
        const w = document.documentElement.scrollWidth;
        return w > document.documentElement.clientWidth + 2 ? w : 0;
      });
      if (wide) problems.push(`${d.out}: content is ${wide}px wide and will be clipped`);

      await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
      await page.close();

      const buf = fs.readFileSync(out).toString('latin1');
      const pages = (buf.match(/\/Type\s*\/Page[^s]/g) || []).length;
      const declared = (fs.readFileSync(src, 'utf8').match(/Page \d+ of (\d+)/) || [])[1];
      if (declared && Number(declared) !== pages) {
        problems.push(`${d.out}: footers say "of ${declared}" but the PDF has ${pages} pages ` +
                      '-- a section overflowed its sheet');
      }
      console.log(`${d.out} · ${pages} pages · ${(fs.statSync(out).size / 1024).toFixed(0)}KB`);
    }
  } finally {
    await browser.close();
  }

  if (problems.length) {
    console.error('\nPROBLEMS:\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  console.log('\nboth documents check out: fonts resolved, no overflow, page counts honest');
})().catch((e) => { console.error(e.message || e); process.exit(1); });
