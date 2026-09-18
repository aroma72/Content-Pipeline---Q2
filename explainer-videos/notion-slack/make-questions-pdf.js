/**
 * make-questions-pdf.js — the seven in-video questions, exactly as Railway serves them.
 *
 *   node make-questions-pdf.js
 *
 * Reads _questions-live.json (pulled from the live API, not from beats.js) so the document cannot
 * drift from what the LMS actually receives. Renders Module-14-Questions.pdf.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const { esc, CSS } = require(path.join(ROOT, 'make-pdfs.js'));
const puppeteer = require(path.join(ROOT, '..', 'autonomy', 'node_modules', 'puppeteer'));

const data = JSON.parse(fs.readFileSync(path.join(ROOT, '_questions-live.json'), 'utf8'));
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const EXTRA = `
  .q { page-break-inside: avoid; margin-bottom: 26px; }
  .qhead { display:flex; align-items:baseline; gap:12px; border-bottom:2px solid #1c4e46;
           padding-bottom:6px; margin-bottom:12px; }
  .qhead .t { font-size:13pt; font-weight:700; color:#1c4e46; flex:1; }
  .qhead .at { font-family:Consolas,monospace; font-size:10pt; color:#a8977c; }
  .stem { font-size:11.5pt; font-weight:600; margin:10px 0 12px; }
  .opt { display:flex; gap:10px; padding:7px 12px; border:1px solid #e2d8c4; border-radius:6px;
         margin-bottom:6px; font-size:10pt; }
  .opt .l { flex:0 0 22px; color:#a8977c; font-weight:700; }
  .opt.right { border-color:#2f7a52; background:#f1f7f3; }
  .opt.right .l { color:#2f7a52; }
  .opt .mark { margin-left:auto; color:#2f7a52; font-weight:700; font-size:9pt; letter-spacing:.08em; }
  .fb { border-left:3px solid #c9a227; background:#faf6ec; padding:9px 13px; margin:9px 0; font-size:10pt; }
  .fb b { color:#7a5c00; }
  .meta { font-size:8.5pt; color:#8a7f6d; font-family:Consolas,monospace; margin-top:8px; }
`;

const body = data.map((d) => {
  const c = d.c;
  const opts = c.options.map((o, i) => `
    <div class="opt${i === c.correctIndex ? ' right' : ''}">
      <span class="l">${String.fromCharCode(65 + i)}</span><span>${esc(o)}</span>
      ${i === c.correctIndex ? '<span class="mark">CORRECT</span>' : ''}
    </div>`).join('');
  return `<div class="q">
    <div class="qhead"><span class="t">${esc(d.title)}</span>
      <span class="at">pauses at ${mmss(c.atSeconds)} (${c.atSeconds}s)</span></div>
    <div class="stem">${esc(c.stem)}</div>
    ${opts}
    <div class="fb"><b>If they answer correctly:</b> ${esc(c.feedback.correct)}</div>
    <div class="fb"><b>If they answer wrongly:</b> ${esc(c.feedback.incorrect)}</div>
    <div class="meta">videoId ${d.id} · resumes at ${c.resumeAtSeconds}s · requiresAnswer ${c.requiresAnswer}
      · allowSkip ${c.allowSkip} · timing.trusted ${d.t.trusted} · pause between beats ${c.pause.afterBeatId}→${c.pause.beforeBeatId}</div>
  </div>`;
}).join('');

const html = `<!doctype html><meta charset="utf-8"><style>${CSS}${EXTRA}</style>
<div class="cover">
  <div class="kicker">Taleemabad University · Agentic AI Mastery · Module 14</div>
  <h1>The Eight In-Video Questions</h1>
  <div class="sub">Exactly as the LMS receives them from Railway</div>
  <div class="meta">
    Pulled live from <code>/api/v1/videos/&lt;id&gt;/checkpoints</code> on ${new Date().toISOString().slice(0, 10)},
    so this document cannot drift from what learners actually see.<br>
    Each video <strong>pauses</strong> at the time shown. The LMS presents the question, and
    <strong>the learner must click an option to continue</strong> — no skip, no dismiss, no seeking past it.
    They then see the feedback for their answer, and playback resumes at the same instant.<br>
    The correct option is marked. Both feedback texts are the real strings being served.
  </div>
</div>
<div class="doc"><div class="brand">Taleemabad University · Module 14 · in-video questions · live from Railway</div>
${body}</div>`;

(async () => {
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  const p = await browser.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  const out = path.join(ROOT, 'Module-14-Questions.pdf');
  await p.pdf({ path: out, format: 'A4', printBackground: true });
  await p.close(); await browser.close();
  console.log('  ✓ Module-14-Questions.pdf', `(${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${data.length} questions)`);
})();
