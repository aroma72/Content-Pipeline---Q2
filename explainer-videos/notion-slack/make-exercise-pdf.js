/**
 * make-exercise-pdf.js — render the Module 14 exercise to PDF.
 *
 *   node make-exercise-pdf.js          → Module-14-Exercise-Ship-From-Slack.pdf  (learner)
 *                                        Module-14-Exercise-Facilitator-Key.pdf  (answers — do not distribute)
 *   node make-exercise-pdf.js --png    → also a first-page preview PNG of each (self-check only)
 *
 * Shares the markdown converter and stylesheet with make-pdfs.js.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const { mdToHtml, esc, CSS } = require(path.join(ROOT, 'make-pdfs.js'));
const puppeteer = require(path.join(ROOT, '..', 'autonomy', 'node_modules', 'puppeteer'));

const DOCS = [
  {
    src: 'Exercise/module-14-exercise-ship-from-slack.md',
    out: 'Module-14-Exercise-Ship-From-Slack.pdf',
    band: 'Taleemabad University · Module 14 · Exercise · Ship From Slack',
    kicker: 'Taleemabad University · Agentic AI Mastery · Module 14',
    title: 'Exercise — Ship From Slack',
    sub: 'Wire Slack, Notion and GitHub to your project with the orchestration harness',
    meta: `Repo: <code>Orenda-Project/orchestration-harness-v2</code> · about 3 hours · do it after videos 1–8.<br>
           You finish when a message you type in Slack becomes a Notion ticket, an agent session, a pull
           request on GitHub, and a reply in your thread — without opening your editor.<br>
           Work only in your own fork, against a throwaway Notion database, Slack channel and repo.`,
  },
  {
    src: 'Exercise/module-14-exercise-facilitator-key.md',
    out: 'Module-14-Exercise-Facilitator-Key.pdf',
    band: 'Taleemabad University · Module 14 · Facilitator key · not for learners',
    kicker: 'Taleemabad University · Module 14 · Facilitator copy',
    title: 'Exercise Key — Ship From Slack',
    sub: 'Answers, marking notes and the pre-flight checklist',
    meta: `<strong>Do not distribute.</strong> Contains the answers to Parts 3, 5, 7 and 9.<br>
           Read the pre-flight checklist before running this with a cohort — the reference repo has
           credentials committed in <code>harness/tick.sh</code> that must be rotated first.`,
  },
];

const cover = (d) => `<div class="cover">
  <div class="kicker">${d.kicker}</div>
  <h1>${esc(d.title)}</h1>
  <div class="sub">${esc(d.sub)}</div>
  <div class="meta">${d.meta}</div>
</div>`;

(async () => {
  const png = process.argv.includes('--png');
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });

  for (const d of DOCS) {
    const md = fs.readFileSync(path.join(ROOT, d.src), 'utf8');
    const html = `<!doctype html><meta charset="utf-8"><style>${CSS}</style>${cover(d)}` +
      `<div class="doc"><div class="brand">${d.band}</div>${mdToHtml(md)}</div>`;

    const p = await browser.newPage();
    await p.setContent(html, { waitUntil: 'load' });
    const dest = path.join(ROOT, d.out);
    await p.pdf({ path: dest, format: 'A4', printBackground: true });
    if (png) {
      await p.setViewport({ width: 794, height: 1123 });
      await p.screenshot({ path: path.join(ROOT, 'pdf', d.out.replace(/\.pdf$/, '.png')), fullPage: false });
    }
    await p.close();
    console.log('  ✓', d.out, `(${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
  }

  await browser.close();
})();
