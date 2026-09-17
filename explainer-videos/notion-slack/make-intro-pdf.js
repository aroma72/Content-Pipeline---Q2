/**
 * make-intro-pdf.js — render the module intro script to a review PDF.
 *
 *   node make-intro-pdf.js          → Module-14-Intro-Four-Connections.pdf
 *   node make-intro-pdf.js --png    → also a first-page preview for self-checking
 *
 * Shares the markdown converter and stylesheet with make-pdfs.js.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const { mdToHtml, esc, CSS } = require(path.join(ROOT, 'make-pdfs.js'));
const puppeteer = require(path.join(ROOT, '..', 'autonomy', 'node_modules', 'puppeteer'));

const SRC = 'Scripts/notion-slack-00-four-connections.md';
const OUT = 'Module-14-Intro-Four-Connections.pdf';

const cover = `<div class="cover">
  <div class="kicker">Taleemabad University · Agentic AI Mastery · Module 14</div>
  <h1>Four Connections, Four Jobs</h1>
  <div class="sub">Module intro — why an agentic system needs Slack, Notion, GitHub and Railway</div>
  <div class="meta">
    Script draft for review · 23 beats · about 2 minutes · illustrated format, same Ali and the same
    back room as the rest of the module.<br>
    One idea: each connection does a job none of the others can do — work is <strong>asked for</strong>
    in Slack, <strong>remembered</strong> in Notion, <strong>lands reviewably</strong> in GitHub, and
    <strong>keeps running</strong> on Railway.<br>
    Every figure on screen traces to the sourced research brief (F16, F18).<br>
    No art, voiceover or render has been generated. Nothing is built until you approve the script.
  </div>
</div>`;

(async () => {
  const md = fs.readFileSync(path.join(ROOT, SRC), 'utf8');
  const html = `<!doctype html><meta charset="utf-8"><style>${CSS}</style>${cover}`
    + `<div class="doc"><div class="brand">Taleemabad University · Module 14 · Intro · script draft for review</div>`
    + `${mdToHtml(md)}</div>`;

  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  const p = await browser.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  const dest = path.join(ROOT, OUT);
  await p.pdf({ path: dest, format: 'A4', printBackground: true });
  if (process.argv.includes('--png')) {
    await p.setViewport({ width: 794, height: 1123 });
    fs.mkdirSync(path.join(ROOT, 'pdf'), { recursive: true });
    await p.screenshot({ path: path.join(ROOT, 'pdf', OUT.replace(/\.pdf$/, '.png')) });
  }
  await p.close();
  await browser.close();
  console.log('  ✓', OUT, `(${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
})();
