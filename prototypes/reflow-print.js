// PROTOTYPE TOOL — reassemble handoff-print.html from a declarative page layout.
//   node prototypes/reflow-print.js
//
// The document is a fixed set of <section>s; only their distribution across A4
// sheets changes as content grows. Editing page breaks by hand produced footers
// that lied about the page count twice, so the layout is declared here instead:
// change LAYOUT, re-run, then `node prototypes/build-pdf.js` (which fails if the
// footers and the real PDF disagree).
//
// Sections are matched by their <h2> text, so renaming a heading means renaming
// it here too — the script fails loudly rather than silently dropping a section.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'handoff-print.html');
const TOTAL = 7;

const LAYOUT = [
  { cover: true, rh: null, secs: ['What this replaces'],
    foot: 'the question content shown is the live checkpoint from Autonomy 01<br>\n    '
        + 'Frames captured from the rendered lesson and from the live demo linked above' },
  { rh: 'The four states', secs: ['The four states'] },
  { rh: 'Flow and endpoints', secs: ['What happens, in order', 'The endpoints'] },
  // The credential gets a page to itself: it is the page they will look for, and
  // the one page Aroma may not want forwarded.
  { rh: 'Authentication', secs: ['Authentication'] },
  { rh: 'The payload', secs: ["One video's checkpoints", 'The timing rule that will bite you'] },
  { rh: 'Behaviour', secs: ['Behaviour rules', 'Palette'] },
  { rh: 'Decisions', secs: ['Open decisions'],
    foot: 'Drawing Room content pipeline, Taleemabad · prepared by Aroma Tahir<br>\n    '
        + 'Live demo: <a href="https://content-queen-production.up.railway.app/demo/quiz">'
        + 'content-queen-production.up.railway.app/demo/quiz</a>' },
];

const src = fs.readFileSync(FILE, 'utf8');
const head = src.slice(0, src.indexOf('<body>') + 6);
const body = src.slice(src.indexOf('<body>') + 6, src.lastIndexOf('</body>'));

// The cover is everything on page 1 above its first <section>.
const page1 = body.slice(body.indexOf('<div class="page">'));
const cover = page1.slice(page1.indexOf('<div class="eyebrow">'), page1.indexOf('<section>')).trimEnd();
if (!cover.includes('<h1>')) throw new Error('could not locate the cover block');

// Index every section by its heading text.
const sections = {};
for (const m of body.matchAll(/<section>([\s\S]*?)<\/section>/g)) {
  const h = m[1].match(/<h2>([\s\S]*?)<\/h2>/);
  if (!h) continue;
  sections[h[1].replace(/<[^>]+>/g, '').trim()] = '  <section>' + m[1] + '</section>';
}

const wanted = LAYOUT.flatMap((p) => p.secs);
const missing = wanted.filter((k) => !sections[k]);
if (missing.length) {
  throw new Error('sections not found (heading renamed?):\n  ' + missing.join('\n  ')
    + '\navailable:\n  ' + Object.keys(sections).join('\n  '));
}
const orphans = Object.keys(sections).filter((k) => !wanted.includes(k));
if (orphans.length) throw new Error('sections exist but are on no page: ' + orphans.join(', '));
if (LAYOUT.length !== TOTAL) throw new Error(`LAYOUT has ${LAYOUT.length} pages but TOTAL says ${TOTAL}`);

const RH1 = '  <div class="rh"><span>Taleemabad University · integration request</span>'
  + '<span><b>Drawing Room</b> content pipeline</span></div>';
const rhFor = (right) => `  <div class="rh"><span>In-Video Question Checkpoint</span><span>${right}</span></div>`;

const pages = LAYOUT.map((p, i) => {
  const n = i + 1;
  const foot = `Page ${n} of ${TOTAL}` + (p.foot ? ' · ' + p.foot : '');
  const out = [
    `<!-- ── page ${n} ─────────────────────────────────────────────────── -->`,
    '<div class="page">',
    p.rh ? rhFor(p.rh) : RH1,
    '',
  ];
  if (p.cover) out.push(cover, '');
  for (const k of p.secs) out.push(sections[k], '');
  out.push('  <footer>\n    ' + foot + '\n  </footer>', '</div>');
  return out.join('\n');
}).join('\n\n');

fs.writeFileSync(FILE, head + '\n\n' + pages + '\n\n</body>\n</html>\n');
console.log(`reflowed handoff-print.html to ${TOTAL} pages`);
LAYOUT.forEach((p, i) => console.log(`  ${i + 1}. ${(p.cover ? 'cover + ' : '') + p.secs.join(' + ')}`));
