/**
 * make-pdfs.js — render the Module 14 scripts to ONE review PDF.
 *
 *   node make-pdfs.js            → Module-14-Notion-Slack-Scripts.pdf (cover + contents + all scripts)
 *   node make-pdfs.js --split    → also one PDF per script into pdf/
 *   node make-pdfs.js --png      → also a first-page preview PNG per script (self-check only)
 *
 * Borrows puppeteer from ../autonomy/node_modules (no install needed here).
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'pdf');
const puppeteer = require(path.join(ROOT, '..', 'autonomy', 'node_modules', 'puppeteer'));

const FILES = [
  ['Scripts/notion-slack-00-module-overview.md', 'notion-slack-00-module-overview.pdf', 'Module overview — the six videos, in order'],
  ['Scripts/notion-slack-01-locked-out.md', 'notion-slack-01-locked-out.pdf', 'Video 1 · Locked Out of the Room'],
  ['Scripts/notion-slack-02-two-doors.md', 'notion-slack-02-two-doors.pdf', 'Video 2 · Two Doors In: Connector or Key'],
  ['Scripts/notion-slack-03-key-one-room.md', 'notion-slack-03-key-one-room.pdf', 'Video 3 · The Key Only Opens One Room'],
  ['Scripts/notion-slack-04-rows-not-paragraphs.md', 'notion-slack-04-rows-not-paragraphs.pdf', 'Video 4 · Rows, Not Paragraphs'],
  ['Scripts/notion-slack-05-speaking-without-spamming.md', 'notion-slack-05-speaking-without-spamming.pdf', 'Video 5 · Speaking Without Spamming'],
  ['Scripts/notion-slack-06-safe-then-run.md', 'notion-slack-06-safe-then-run.pdf', 'Video 6 · Safe, Then Let It Run'],
  ['Scripts/notion-slack-07-notion-click-by-click.md', 'notion-slack-07-notion-click-by-click.pdf', 'Video 7 · Notion, Click by Click (screencast)'],
  ['Scripts/notion-slack-08-slack-click-by-click.md', 'notion-slack-08-slack-click-by-click.pdf', 'Video 8 · Slack, Click by Click (screencast)'],
  ['research.md', 'notion-slack-research-brief.pdf', 'Appendix · Research brief (every fact, sourced)'],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
}

function mdToHtml(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  // strip YAML frontmatter
  if (lines[0].trim() === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) lines.splice(0, end + 1);
  }
  const out = [];
  let para = [];
  let list = null;

  const flushPara = () => {
    if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
  };
  const flushList = () => {
    if (list) { out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`); list = null; }
  };
  const flush = () => { flushPara(); flushList(); };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) { flush(); continue; }

    // table block
    if (line.startsWith('|')) {
      flush();
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim());
        i++;
      }
      i--;
      const cells = (r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const isSep = (r) => /^\|[\s:|-]+\|?$/.test(r);
      const head = cells(rows[0]);
      const body = rows.slice(isSep(rows[1] || '') ? 2 : 1).filter((r) => !isSep(r));
      out.push(
        `<table><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead>` +
        `<tbody>${body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      );
      continue;
    }

    // headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { flush(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }

    // horizontal rule
    if (/^---+$/.test(line)) { flush(); out.push('<hr>'); continue; }

    // beat line:  "12. [ali]  text"  /  "8a. [info] text"
    const beat = line.match(/^(\d+[a-z]?)\.\s+\[(\w+)\]\s*(.*)$/);
    if (beat) {
      flush();
      out.push(
        `<div class="beat"><span class="n">${beat[1]}</span>` +
        `<span class="mode m-${beat[2]}">${beat[2]}</span>` +
        `<span class="vo">${inline(beat[3])}</span></div>`
      );
      continue;
    }

    // bullets
    const li = line.match(/^[-*]\s+(.*)$/);
    if (li) { flushPara(); (list = list || []).push(li[1]); continue; }

    if (list) { list[list.length - 1] += ' ' + line; continue; }
    // a line opening with a bold label ("**Teaches:** …") stands as its own paragraph
    if (line.startsWith('**') && para.length) flushPara();
    para.push(line);
  }
  flush();
  return out.join('\n');
}

const CSS = `
  @page { size: A4; margin: 18mm 16mm 16mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Calibri, Helvetica, Arial, sans-serif; color: #23201c;
         background: #fffdf8; font-size: 10.5pt; line-height: 1.5; margin: 0; }
  .doc { page-break-after: always; }
  .doc:last-child { page-break-after: auto; }
  .brand { font-size: 8pt; letter-spacing: .16em; text-transform: uppercase; color: #a8977c;
           border-bottom: 1px solid #e8dfcd; padding-bottom: 6px; margin-bottom: 18px; }
  h1 { font-size: 20pt; line-height: 1.2; margin: 0 0 10px; color: #1c4e46; }
  h2 { font-size: 13pt; margin: 22px 0 8px; color: #1c4e46; border-bottom: 1px solid #ece3d2;
       padding-bottom: 4px; page-break-after: avoid; }
  h3 { font-size: 11pt; margin: 16px 0 6px; color: #2f2a24; page-break-after: avoid; }
  p { margin: 0 0 8px; }
  ul { margin: 0 0 10px; padding-left: 18px; }
  li { margin-bottom: 4px; }
  hr { border: 0; border-top: 1px solid #ece3d2; margin: 16px 0; }
  code { font-family: Consolas, "Courier New", monospace; font-size: 9pt; background: #f3ede0;
         border: 1px solid #e7ddc8; border-radius: 3px; padding: 0 3px; }
  a { color: #1c4e46; text-decoration: none; border-bottom: 1px dotted #9fb8b1; }
  strong { color: #14322d; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 9pt; }
  th, td { border: 1px solid #e2d8c4; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f4efe3; color: #1c4e46; font-weight: 600; }
  .beat { display: flex; gap: 8px; align-items: baseline; padding: 3px 0 3px 0;
          border-bottom: 1px solid #f2ebdc; page-break-inside: avoid; }
  .beat .n { flex: 0 0 22px; text-align: right; color: #a8977c; font-size: 9pt; font-variant-numeric: tabular-nums; }
  .beat .mode { flex: 0 0 46px; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em;
                text-align: center; border-radius: 3px; padding: 1px 0; }
  .m-ali { background: #e6efe9; color: #1c4e46; }
  .m-scene { background: #f7e8d8; color: #8a5a25; }
  .m-info { background: #e6eaf3; color: #2f4373; }
  .m-ui { background: #e2eef1; color: #1d5563; }      /* screencast: interface screen */
  .m-card { background: #f0ece2; color: #6b5f48; }    /* screencast: full-screen card */
  .beat .vo { flex: 1; }
  .beat em { color: #7a6f5f; font-size: 9pt; }
  @media screen { body { padding: 14mm; } }  /* only for --png previews; print uses @page margins */

  /* cover + contents */
  .cover { page-break-after: always; padding-top: 34mm; }
  .cover .kicker { font-size: 9pt; letter-spacing: .2em; text-transform: uppercase; color: #a8977c; }
  .cover h1 { font-size: 30pt; margin: 12px 0 6px; line-height: 1.1; }
  .cover .sub { font-size: 13pt; color: #4a4238; margin-bottom: 26px; }
  .cover .meta { font-size: 9.5pt; color: #6d6357; border-top: 1px solid #e8dfcd; padding-top: 12px; }
  .toc { margin: 26px 0 0; }
  .toc h2 { border: 0; margin-bottom: 6px; }
  .toc ol { padding-left: 0; list-style: none; margin: 0; }
  .toc li { display: flex; gap: 10px; padding: 5px 0; border-bottom: 1px solid #f2ebdc; font-size: 10.5pt; }
  .toc li span.i { flex: 0 0 26px; color: #a8977c; font-variant-numeric: tabular-nums; }
`;

function page(html) {
  return `<div class="doc"><div class="brand">Taleemabad University · Module 14 · Notion + Slack · script draft for review</div>${html}</div>`;
}

function cover(entries) {
  return `<div class="cover">
    <div class="kicker">Taleemabad University · Agentic AI Mastery</div>
    <h1>Module 14 — Connecting Your Agent to Notion and Slack</h1>
    <div class="sub">Eight video scripts · six concept + two screencast walkthroughs · draft for review</div>
    <div class="meta">
      One protagonist (Ali) · one setting (the back room of his stationery shop) · one running project
      (his order agent) · ~26 beats and ~2 minutes per video.<br>
      Videos 7 and 8 are step-by-step walkthroughs on the real Notion and Slack screens, with the
      capture list for every screen.<br>
      Every fact in these scripts traces to the sourced research brief at the back.<br>
      No art, voiceover or render has been generated. Nothing is built until you approve the scripts.
    </div>
    <div class="toc"><h2>Contents</h2><ol>
      ${entries.map((t, i) => `<li><span class="i">${String(i + 1).padStart(2, '0')}</span><span>${esc(t)}</span></li>`).join('')}
    </ol></div>
  </div>`;
}

(async () => {
  const split = process.argv.includes('--split');
  const png = process.argv.includes('--png');
  if (split || png) fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  const parts = [cover(FILES.map(([, , title]) => title))];

  for (const [src, dest] of FILES) {
    const md = fs.readFileSync(path.join(ROOT, src), 'utf8');
    const body = page(mdToHtml(md));
    parts.push(body);
    if (!split && !png) continue;

    const p = await browser.newPage();
    await p.setContent(`<!doctype html><meta charset="utf-8"><style>${CSS}</style>${body}`, { waitUntil: 'load' });
    if (split) await p.pdf({ path: path.join(OUT, dest), format: 'A4', printBackground: true });
    if (png) {
      await p.setViewport({ width: 794, height: 1123 });
      await p.screenshot({ path: path.join(OUT, dest.replace(/\.pdf$/, '.png')) });
    }
    await p.close();
    console.log('  ·', dest.replace(/\.pdf$/, ''), split ? '(pdf)' : '(png)');
  }

  const one = path.join(ROOT, 'Module-14-Notion-Slack-Scripts.pdf');
  const p = await browser.newPage();
  await p.setContent(`<!doctype html><meta charset="utf-8"><style>${CSS}</style>${parts.join('\n')}`, { waitUntil: 'load' });
  await p.pdf({ path: one, format: 'A4', printBackground: true });
  if (process.env.PREVIEW_COVER) {          // self-check: eyeball the cover page before shipping
    await p.setViewport({ width: 794, height: 1123 });
    await p.screenshot({ path: process.env.PREVIEW_COVER });
  }
  await p.close();
  console.log('  ✓', path.basename(one), `(${(fs.statSync(one).size / 1024).toFixed(0)} KB, all scripts + research brief)`);

  await browser.close();
})();
