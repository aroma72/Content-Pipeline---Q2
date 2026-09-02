'use strict';
/*
 * make-scripts-doc.js — one Word document containing the FULL SCRIPT of every video in the
 * Self-Healing & Self-Improving module, including the assignment video, for review.
 * Per beat: the spoken narration, the on-screen caption, and what is actually shown
 * (illustrated scene / character / which infographic, with its real data).
 *   node make-scripts-doc.js      ->  Self-Healing-Module-Scripts.docx
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, BorderStyle, ShadingType,
  Table, TableRow, TableCell, WidthType, AlignmentType,
} = require('docx');

const BLUE = '1F4E79', ACCENT = '2E7D6B', GRAY = '595959', CODEBG = 'F2F3F5', MONO = 'Consolas';

const VIDEOS = [
  ['self-healing-01-fixes-its-own-mistakes', '01', 'The Room That Fixes Its Own Mistakes',
    'Self-healing = act → check → retry. The brain never changed; the room did. Names "debugging in a loop".'],
  ['self-healing-02-who-checks-the-work', '02', 'Who Checks The Work',
    'The critic: a rule, a test, a second model, or a person — and picking the cheapest one that catches your failure.'],
  ['self-healing-03-remembering-the-fix', '03', 'Remembering The Fix',
    'Self-improving: the fix is kept. Where does the learning get stored? Six places outside the model, one inside.'],
  ['self-healing-04-changing-the-brain', '04', 'Changing The Brain Itself',
    'Fine-tuning: the seventh place. The five conditions that must all hold, and the engineering job it buys you.'],
  ['self-healing-05-fix-the-system-first', '05', 'Fix The System Before The Brain',
    'The six-rung diagnosis ladder, and which parts of a system may improve themselves without asking.'],
  ['self-healing-06-prove-it-got-better', '06', 'Prove It Got Better',
    'The learning-from-failure discipline and eval-driven improvement: the failure log becomes the eval set.'],
  ['self-healing-assignment', '—', 'Assignment — Build a Loop That Recovers',
    'Claude Code IDE-screencast format. Companion to the assignment doc. Build Act → Critic → Retry → Remember.'],
];

const h1 = (t) => new Paragraph({ spacing: { before: 400, after: 140 }, pageBreakBefore: true,
  border: { bottom: { color: BLUE, size: 12, style: BorderStyle.SINGLE, space: 4 } },
  children: [new TextRun({ text: t, bold: true, size: 34, color: BLUE, font: 'Calibri' })] });
const p = (t, o = {}) => new Paragraph({ spacing: { after: o.after ?? 100 },
  children: [new TextRun({ text: t, size: o.size ?? 22, italics: o.italics, bold: o.bold,
    color: o.color, font: 'Calibri' })] });
const small = (t) => new Paragraph({ spacing: { after: 60 },
  children: [new TextRun({ text: t, size: 18, color: ACCENT, bold: true, allCaps: true, font: 'Calibri' })] });

const cell = (t, o = {}) => new TableCell({
  width: o.w ? { size: o.w, type: WidthType.PERCENTAGE } : undefined,
  shading: o.fill ? { type: ShadingType.SOLID, color: o.fill, fill: o.fill } : undefined,
  margins: { top: 70, bottom: 70, left: 110, right: 110 },
  children: String(t).split('\n').map((line) => new Paragraph({
    children: [new TextRun({ text: line, bold: o.bold, size: o.size ?? 20,
      color: o.white ? 'FFFFFF' : '1A1A1A', font: o.mono ? MONO : 'Calibri' })] })),
});

// describe what the viewer actually SEES on a beat
function visual(b) {
  if (b.mode === 'info' && b.info) {
    const d = b.info.data || {};
    const bits = [];
    if (d.title) bits.push('"' + d.title + '"');
    if (d.text) bits.push('"' + d.text + '"');
    if (d.stem) bits.push('Q: ' + d.stem);
    if (Array.isArray(d.options)) {
      bits.push(d.options.map((o, i) => (d.answer === i ? '[✓] ' : '') + o).join(' · '));
    }
    if (d.lines) bits.push(d.lines.map((l) => l.k + ': ' + l.v).join(' · '));
    if (d.items && !Array.isArray(d.options)) {
      bits.push(d.items.map((i) => (typeof i === 'string' ? i
        : (i.label || '') + (i.value != null ? ' = ' + i.value : '') + (i.count != null ? ' = ' + i.count : ''))).join(' · '));
    }
    if (d.left && d.right) {
      const side = (s) => (s.title ? s.title + ': ' : '') + (s.items ? s.items.join(', ') : (s.big || '') + ' ' + (s.lab || ''));
      bits.push(side(d.left) + '   |   ' + side(d.right));
    }
    if (d.label) bits.push(d.label + (d.value != null ? ' = ' + d.value : ''));
    if (d.n) bits.push(d.n + ' cells');
    if (d.note) bits.push('note: ' + d.note);
    if (d.caption) bits.push('caption: ' + d.caption);
    if (d.text && b.info.tpl === 'promptcard') bits.length = 0, bits.push('"' + d.text + '"');
    return 'INFOGRAPHIC (' + b.info.tpl + ')\n' + bits.join('\n');
  }
  if (b.mode === 'card' && b.card) {
    return 'TITLE CARD\n' + [b.card.small, b.card.big, b.card.sub].filter(Boolean).join('\n');
  }
  if (b.mode === 'ide' && b.screen) {
    const s = b.screen;
    const bits = [];
    if (s.method) bits.push('step: ' + s.method);
    if (s.editor) bits.push('editor ' + s.editor.name + ': ' + (s.editor.lines || []).slice(0, 3).join(' / '));
    if (s.chat) bits.push(s.chat.map((c) => c.role + ': ' + String(c.text).split('\n')[0]).join(' | '));
    if (s.terminal) bits.push('terminal: ' + s.terminal.join(' / '));
    return 'CLAUDE CODE SCREEN\n' + bits.join('\n');
  }
  // scene / ali — strip the boilerplate style + setting so the action is readable
  let a = String(b.art || '');
  a = a.replace(/flat 2D vector editorial illustration[\s\S]*$/i, '')
       .replace(/Ali, a friendly South Asian man[^,]*,([^,]*,){0,3}/i, 'Ali ')
       .replace(/in Ali's small tidy shop[\s\S]*?end of the counter,?/i, '[the shop] ')
       .replace(/an open silver laptop standing on the counter[\s\S]*?on it/i, '[the laptop]')
       .replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim().replace(/[,\s]+$/, '');
  return (b.mode === 'scene' ? 'ILLUSTRATED SCENE\n' : 'ALI (cut-out, on cream)\n') + a;
}

const kids = [];
const push = (...xs) => xs.forEach((x) => (Array.isArray(x) ? kids.push(...x) : kids.push(x)));

// ---- cover ----
push(small('Taleemabad · Agentic AI Mastery'));
push(new Paragraph({ spacing: { after: 80 },
  children: [new TextRun({ text: 'Self-Healing & Self-Improving Agents', bold: true, size: 48, color: '111111', font: 'Calibri' })] }));
push(p('Full narration scripts for all six lesson videos and the assignment video.', { italics: true, size: 24, color: GRAY, after: 240 }));
push(p('Every beat below is one spoken sentence plus the visual shown while it is spoken. The visual format follows the Evals-Grade Visual Standard: one concrete setting (Ali’s shop — shelves, counter, paper ledger, brass lamp, records drawer), the AI helper drawn as a real laptop with a blank screen, and real numbers carried on infographics rather than plain text cards.'));

const rows = [new TableRow({ tableHeader: true, children: [
  cell('#', { bold: true, white: true, fill: BLUE, w: 8 }),
  cell('Video', { bold: true, white: true, fill: BLUE, w: 34 }),
  cell('Beats', { bold: true, white: true, fill: BLUE, w: 10 }),
  cell('Length', { bold: true, white: true, fill: BLUE, w: 12 }),
  cell('One concept', { bold: true, white: true, fill: BLUE, w: 36 }),
] })];

const loaded = [];
for (const [dir, num, title, concept] of VIDEOS) {
  const bp = path.join(__dirname, dir, 'beats.js');
  if (!fs.existsSync(bp)) { console.log('skip (no beats.js): ' + dir); continue; }
  delete require.cache[require.resolve(bp)];
  const beats = require(bp);
  let secs = null;
  const dp = path.join(__dirname, dir, 'durations.json');
  if (fs.existsSync(dp)) {
    const d = JSON.parse(fs.readFileSync(dp, 'utf8'));
    secs = Object.values(d).filter((x) => typeof x === 'number').reduce((a, c) => a + c, 0);
  }
  loaded.push({ dir, num, title, concept, beats, secs });
  const mmss = secs ? Math.floor(secs / 60) + ':' + String(Math.round(secs % 60)).padStart(2, '0') : '—';
  rows.push(new TableRow({ children: [
    cell(num, { bold: true, fill: CODEBG }), cell(title), cell(String(beats.length)),
    cell(mmss), cell(concept, { size: 18 }),
  ] }));
}
push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));

// ---- one section per video ----
for (const v of loaded) {
  push(h1(v.num === '—' ? v.title : 'Video ' + v.num + ' — ' + v.title));
  push(p(v.concept, { italics: true, color: GRAY }));
  const mmss = v.secs ? Math.floor(v.secs / 60) + ':' + String(Math.round(v.secs % 60)).padStart(2, '0') : '—';
  push(small(v.beats.length + ' beats  ·  ' + mmss + ' of narration  ·  ' + v.dir));

  const brows = [new TableRow({ tableHeader: true, children: [
    cell('#', { bold: true, white: true, fill: BLUE, w: 5 }),
    cell('Narration (spoken)', { bold: true, white: true, fill: BLUE, w: 38 }),
    cell('On-screen caption', { bold: true, white: true, fill: BLUE, w: 17 }),
    cell('What is shown', { bold: true, white: true, fill: BLUE, w: 40 }),
  ] })];
  for (const b of v.beats) {
    const q = b.holdAfter ? ' ⏸' : '';
    brows.push(new TableRow({ children: [
      cell(b.id + q, { bold: true, fill: CODEBG }),
      cell(b.vo, { size: 20 }),
      cell(b.cap || (b.card ? b.card.small : '') || '', { size: 18 }),
      cell(visual(b), { size: 16 }),
    ] }));
  }
  push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: brows }));
  push(p('⏸ = the interactive QUESTION beat, held so the viewer can answer before the reveal.',
    { size: 16, italics: true, color: GRAY }));
}

const doc = new Document({
  creator: 'Drawing Room', title: 'Self-Healing & Self-Improving — All Scripts',
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } } }, children: kids }],
});
Packer.toBuffer(doc).then((buf) => {
  const out = 'Self-Healing-Module-Scripts.docx';
  fs.writeFileSync(path.join(__dirname, out), buf);
  console.log('wrote ' + out + ' (' + (buf.length / 1024).toFixed(0) + ' KB) — ' +
    loaded.length + ' videos, ' + loaded.reduce((a, v) => a + v.beats.length, 0) + ' beats');
});
