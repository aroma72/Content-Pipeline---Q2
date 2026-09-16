// PROTOTYPE TOOL — redistribute the Make a Video docs across A4 sheets.
//   node prototypes/reflow-video-docs.js && node prototypes/build-video-docs.js
//
// Editing page breaks by hand produced footers that lied about the page count
// three times in this repository, so the distribution is DECLARED here: each
// entry in LAYOUT is one sheet, listing its sections by <h2> text. Sections are
// matched on that text, and a name that matches nothing fails loudly rather than
// silently dropping a section from the document.
//
// Page 1 keeps the title block; every later sheet is `.page cont`, which hides
// the title and lede. Repeating a 27pt heading and a three-line lede on every
// sheet cost ~60mm each and was what doubled both documents.
//
// Footers are generated, never typed. build-video-docs.js then counts the real
// pages in the PDF and fails if they disagree.

const fs = require('fs');
const path = require('path');

const DOCS = [
  {
    file: 'video-builder-concept.html',
    rh: '<span>Taleemabad University · <b>Make a Video</b></span><span>Concept · for the LMS team</span>',
    label: 'Make a Video · Concept',
    lastLabel: 'Make a Video · Concept · the technical companion has the endpoints',
    layout: [
      ['Why one video, not a course'],
      ['The seven stages', 'Two decisions, not one'],
      ['Six things every script must do', 'The gate sends work back; it does not just refuse it',
        'What the reviewer at stage 6 is actually for'],
      ['The question is not in the video', 'What a learner sees'],
      ['What to expect, in numbers', 'One limitation to design around'],
    ],
  },
  {
    file: 'video-builder-technical.html',
    rh: '<span>Taleemabad University · <b>Make a Video</b></span><span>Technical reference · v2</span>',
    label: 'Make a Video · Technical reference',
    lastLabel: 'Make a Video · Technical reference · questions to Aroma Tahir',
    layout: [
      ['1 · Authentication'],
      ['2 · Creating a video — the job API'],
      ['3 · The job lifecycle', '6b · A fixed sample to build against'],
      ['4 · The script, once written'],
      ['5 · The finished video, awaiting approval', "6 · Reading a video's checkpoints"],
      ['7 · Five fields to respect', '8 · Listing what is available'],
      ['9 · Firing the popup', '10 · What to store on your side'],
      ['11 · Failure modes worth handling'],
    ],
  },
];

/** Split the body into its title block, its loose blocks, and its sections. */
function parse(html) {
  const bodyStart = html.indexOf('<body>') + '<body>'.length;
  const bodyEnd = html.indexOf('</body>');
  const body = html.slice(bodyStart, bodyEnd);

  // Everything from the first .eyebrow up to (not including) the first <section>
  // is the title block, including any warning panel that follows the lede.
  const titleStart = body.indexOf('<div class="eyebrow">');
  const firstSection = body.indexOf('<section>');
  if (titleStart < 0 || firstSection < 0) throw new Error('no title block or no sections');
  const title = body.slice(titleStart, firstSection).replace(/\s*$/, '');

  const sections = [];
  const re = /<section>[\s\S]*?<\/section>/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const h2 = (m[0].match(/<h2>([\s\S]*?)<\/h2>/) || [])[1];
    if (!h2) throw new Error('a section has no <h2> to match on');
    sections.push({ h2: h2.replace(/<[^>]+>/g, '').trim(), html: m[0] });
  }
  return { head: html.slice(0, bodyStart), tail: html.slice(bodyEnd), title, sections };
}

let failed = false;

for (const doc of DOCS) {
  const file = path.join(__dirname, doc.file);
  const html = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
  const { head, tail, title, sections } = parse(html);

  const byName = new Map(sections.map((s) => [s.h2, s]));
  const used = new Set();
  const total = doc.layout.length;
  const pages = [];

  doc.layout.forEach((names, i) => {
    const parts = names.map((n) => {
      const s = byName.get(n);
      if (!s) {
        console.error(`${doc.file}: LAYOUT names a section that does not exist: "${n}"`);
        failed = true;
        return '';
      }
      used.add(n);
      return s.html;
    });
    const cont = i === 0 ? '' : ' cont';
    const label = i === total - 1 ? doc.lastLabel : doc.label;
    pages.push([
      `<!-- ══ ${i + 1} ══════════════════════════════════════════════════════ -->`,
      `<div class="page${cont}">`,
      `  <div class="rh">${doc.rh}</div>`,
      '',
      i === 0 ? title : '',
      '',
      parts.join('\n\n'),
      '',
      `  <div class="foot"><span>${label}</span><span>Page ${i + 1} of ${total}</span></div>`,
      '</div>',
    ].filter((l) => l !== '').join('\n'));
  });

  // A section left out of LAYOUT would vanish from the PDF without a word.
  for (const s of sections) {
    if (!used.has(s.h2)) {
      console.error(`${doc.file}: section "${s.h2}" is in the document but not in LAYOUT`);
      failed = true;
    }
  }

  fs.writeFileSync(file, `${head}\n\n${pages.join('\n\n')}\n\n${tail}`);
  console.log(`${doc.file}: ${sections.length} sections over ${total} sheets`);
}

if (failed) process.exit(1);
console.log('\nrun: node prototypes/build-video-docs.js');
