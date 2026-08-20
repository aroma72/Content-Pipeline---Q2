'use strict';
/*
 * make-assignment-doc.js — builds harness-assessment-assignment.docx (the written companion to
 * the harness-assessment video), following the exact pattern of the evals Module 11 assignment:
 * header · title · subtitle · intro · "what you'll hand in" · summary table · Parts A–D with
 * checkboxes and "Type to Claude" prompts · copy-paste prompt bank · individual steps · when
 * something breaks · common gaps · footer. Professional Word styling: blue headers, monospace
 * prompt blocks with light shading, consistent spacing.
 */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} = require('docx');

const BLUE = '1F4E79';       // section headers
const ACCENT = '2E7D6B';     // teal accent (Taleemabad-ish)
const GRAY = '595959';
const CODEBG = 'F2F3F5';
const MONO = 'Consolas';

// ---- helpers ---------------------------------------------------------------
const gap = (after = 120) => ({ after });

function h1(text) {
  return new Paragraph({ spacing: { before: 120, after: 160 },
    children: [new TextRun({ text, bold: true, size: 40, color: BLUE, font: 'Calibri' })] });
}
function h2(text) {
  return new Paragraph({ spacing: { before: 260, after: 120 },
    border: { bottom: { color: BLUE, size: 6, style: BorderStyle.SINGLE, space: 4 } },
    children: [new TextRun({ text, bold: true, size: 30, color: BLUE, font: 'Calibri' })] });
}
function h3(text) {
  return new Paragraph({ spacing: { before: 180, after: 80 },
    children: [new TextRun({ text, bold: true, size: 26, color: ACCENT, font: 'Calibri' })] });
}
function p(runs, opts = {}) {
  const arr = Array.isArray(runs) ? runs : [new TextRun({ text: runs, size: 22, font: 'Calibri' })];
  return new Paragraph({ spacing: gap(opts.after ?? 120), alignment: opts.align, children: arr });
}
function small(text) {
  return new Paragraph({ spacing: gap(60),
    children: [new TextRun({ text, size: 18, color: ACCENT, bold: true, allCaps: true, font: 'Calibri' })] });
}
function bullet(text, level = 0) {
  return new Paragraph({ bullet: { level }, spacing: gap(60),
    children: [new TextRun({ text, size: 22, font: 'Calibri' })] });
}
function check(text) {
  return new Paragraph({ spacing: gap(60),
    children: [new TextRun({ text: '☐  ', size: 24 }), new TextRun({ text, size: 22, font: 'Calibri' })] });
}
function num(n, text) {
  return new Paragraph({ spacing: gap(60),
    children: [new TextRun({ text: `${n}.  `, bold: true, size: 22, font: 'Calibri' }),
               new TextRun({ text, size: 22, font: 'Calibri' })] });
}
// monospace prompt / code block with light shading
function code(lines, label) {
  const out = [];
  if (label) out.push(new Paragraph({ spacing: { before: 120, after: 40 },
    children: [new TextRun({ text: label, bold: true, size: 20, color: ACCENT, font: 'Calibri' })] }));
  const arr = Array.isArray(lines) ? lines : [lines];
  arr.forEach((ln, i) => out.push(new Paragraph({
    shading: { type: ShadingType.SOLID, color: CODEBG, fill: CODEBG },
    spacing: { before: i === 0 ? 40 : 0, after: i === arr.length - 1 ? 140 : 0, line: 264 },
    border: {
      left: { color: ACCENT, size: 18, style: BorderStyle.SINGLE, space: 8 },
      top: i === 0 ? { color: 'DDDDDD', size: 4, style: BorderStyle.SINGLE, space: 4 } : undefined,
      bottom: i === arr.length - 1 ? { color: 'DDDDDD', size: 4, style: BorderStyle.SINGLE, space: 4 } : undefined,
    },
    children: [new TextRun({ text: ln || ' ', font: MONO, size: 20, color: '1A1A1A' })] })));
  return out;
}
function cell(text, { bold = false, fill, white = false, w } = {}) {
  return new TableCell({
    width: w ? { size: w, type: WidthType.PERCENTAGE } : undefined,
    shading: fill ? { type: ShadingType.SOLID, color: fill, fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, bold, size: 20,
      color: white ? 'FFFFFF' : '1A1A1A', font: 'Calibri' })] })] });
}
function table(headers, rows) {
  const mk = (cells, header) => new TableRow({ tableHeader: header,
    children: cells.map((c, i) => cell(c, header
      ? { bold: true, white: true, fill: BLUE, w: i === 0 ? 34 : 33 }
      : { fill: i === 0 ? CODEBG : undefined, bold: i === 0 })) });
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [mk(headers, true), ...rows.map(r => mk(r, false))] });
}

// ---- content ---------------------------------------------------------------
const kids = [];
const push = (...xs) => xs.forEach(x => Array.isArray(x) ? kids.push(...x) : kids.push(x));

push(small('The Harness series · Assessment'));
push(new Paragraph({ spacing: gap(60), children: [new TextRun({
  text: 'The Harness Assessment — Build and Prove Your Own Harness', bold: true, size: 46, color: '111111', font: 'Calibri' })] }));
push(new Paragraph({ spacing: gap(200), children: [new TextRun({
  text: 'From “the model will fix it” to a number that moves on the same model — on your real project.',
  italics: true, size: 24, color: GRAY, font: 'Calibri' })] }));

push(p('In this series you learned what a harness actually is (the room around the brain that turns talk into done work), how it differs from the model and the interface, and the parts a real harness is made of — memory, tools, guardrails, and a way to see what happened. Now you’ll build one on your own Claude Code project and prove it did the work.'));
push(p('One project, four methods. Name your three parts, build the room, set the guardrails, and then prove the harness — not the model — moved the result. You type the prompts; Claude works inside the room you build. Your job is to build the room and measure it.'));
push(p([
  new TextRun({ text: 'Why this matters — ', bold: true, size: 22, font: 'Calibri' }),
  new TextRun({ text: 'a smarter model in a bare room still does nothing; teams have found the model is only about a tenth of what makes an AI helper work. The leverage is the harness. A CLAUDE.md and a settings file sitting in a repo are homework; a room your helper actually acts inside, with a number that moved on the same model, is a product.', size: 22, font: 'Calibri' }),
]));
push(p([
  new TextRun({ text: '📘  Step-by-step walkthrough: ', bold: true, size: 22, font: 'Calibri' }),
  new TextRun({ text: 'the Harness Assessment video (the assessment-guide) has this same assessment written out in full, with every screen and every prompt.', size: 22, font: 'Calibri' }),
]));

push(h2('What you’ll hand in'));
push(p('One Google Doc, set to “anyone with the link → viewer”, submitted as a single link on the LMS. Plus a public (or shared) link to your project repo. The doc has these sections:'));
push(num(1, 'Your three parts — one line each: what is the model, the interface, and the harness in your project.'));
push(num(2, 'Your room — your CLAUDE.md and your .claude/settings.json (pasted or screenshotted).'));
push(num(3, 'Your guardrails + a peek at the log — what runs alone, what needs your yes, and where actions are recorded.'));
push(num(4, 'Your proof — the before-and-after number from one harness change on the same model (eval-results.md).'));
push(p('Plus a 3-line reflection at the bottom of the doc.'));

push(h2('At a glance'));
push(table(
  ['Method', 'Where', 'What you produce'],
  [
    ['1 · Name the three parts', 'Your project', 'One line each: model · interface · harness'],
    ['2 · Build the room', 'Your project', 'CLAUDE.md (memory) + settings.json (tools) + one job done'],
    ['3 · Guardrails + see', 'Your project', 'allow / ask / deny in settings.json + where actions are logged'],
    ['4 · Prove the harness', 'Your project', 'eval-results.md — same model, one change, a number that moved'],
  ]));

// ---- Part A ----
push(h2('Part A — Name the parts, then build the room'));
push(p('First make the abstract concrete. In your own project, point at the three parts, then start building the one you control — the room.'));
push(check('Name your three parts in one line each: the model (brain), Claude Code (window), the harness (room).'));
push(code('In my project, name the three parts: which is the model, which is\nClaude Code, and which is the harness (everything I configure)?', 'Type to Claude:'));
push(h3('Give it memory'));
push(p('Write a CLAUDE.md so the helper re-reads your project, your rules, and where things live on every run — the room’s long-term memory.'));
push(code('Write a CLAUDE.md with what my project is, my rules, and where things\nlive — so you remember it every run. Keep it under 40 lines.', 'Type to Claude:'));
push(h3('Give it tools and one job'));
push(p('List the tools it may use in .claude/settings.json, then give it one real job so talk becomes done work.'));
push(code([
  '"permissions": {',
  '  "allow": ["Read", "Edit", "Bash(npm test)"]',
  '}',
], 'In .claude/settings.json:'));
push(check('CLAUDE.md written — project, rules, and where things live.'));
push(check('.claude/settings.json lists the tools it may use.'));
push(check('One real job done end to end (it read, edited, and ran something itself).'));

// ---- Part B ----
push(h2('Part B — Guardrails + see everything'));
push(p('A room without guardrails is not safe to leave alone, and a room you cannot see into is not safe to trust. Set both.'));
push(h3('Set what it may do alone'));
push(p('Split your permissions into three: what runs alone, what pauses for your yes, and what is never allowed.'));
push(code([
  '"permissions": {',
  '  "allow": ["Read", "Edit", "Bash(npm test)"],',
  '  "ask":   ["Bash(git push)"],',
  '  "deny":  ["Bash(rm -rf *)"]',
  '}',
], 'In .claude/settings.json:'));
push(h3('Find where actions are recorded'));
push(p('Every real harness writes down what happened so you can replay it. Find your session record and confirm you can see what was read, edited, run, and approved.'));
push(code('Show me where this session’s actions are recorded, and walk me\nthrough the last few steps you took and why.', 'Type to Claude:'));
push(check('settings.json has allow / ask / deny — the risky things pause for you.'));
push(check('You found where actions are logged and can name the last 3 steps taken.'));

// ---- Part C ----
push(h2('Part C — Prove the harness, not the model'));
push(p('This is the whole point. Keep the exact same model, change ONE thing in the room, and show the result moved. Use a tiny eval from the evals series as your measuring stick.'));
push(num(1, 'Write down a baseline: run a small ten-check eval on your task and record the score (e.g. 6 / 10).'));
push(num(2, 'Change ONE harness thing — sharpen CLAUDE.md, add a tool, or tighten a rule. Do not change the model.'));
push(num(3, 'Run the same ten checks again and record the new score (e.g. 9 / 10).'));
push(code([
  'Keep the same model. Run these ten checks and give me a score —',
  "that's my baseline. I'll change ONE harness thing, then you run the",
  'same ten again so we can compare. Name what each point came from.',
], 'Type to Claude:'));
push(check('A baseline number, written down before the change.'));
push(check('Exactly one harness change — the model is untouched.'));
push(check('A second number on the same checks, and it moved (eval-results.md).'));

// ---- Part D ----
push(h2('Part D — Commit, then submit in your Google Doc'));
push(p('Commit and push to your repo — CLAUDE.md, .claude/settings.json, and eval-results.md in; .env out. Then make one Google Doc, set sharing to “anyone with the link → viewer”, and submit that link on the LMS.'));
push(p('Your doc has the four numbered sections above, plus a 3-line reflection:'));
push(num(1, 'your before-and-after number, and the one harness change that moved it;'));
push(num(2, 'the one thing the room now does that the bare model could not;'));
push(num(3, 'one part of your harness you would strengthen next, and why.'));

// ---- Prompt bank ----
push(h2('Copy-paste prompt bank'));
push(p([new TextRun({ text: '🔑  Build and prove your harness (step by step)', bold: true, size: 22, color: ACCENT, font: 'Calibri' })]));
push(code([
  "I'm doing my Harness assessment on my own Claude Code project.",
  '',
  'Project: <name>. What it does: <one line>.',
  'The task I want it to get reliably right: <the task>.',
  '',
  'Work through this with me one step at a time, and stop for my OK after each:',
  '',
  '1. Name my three parts: which is the model, which is Claude Code (the',
  '   interface), and which is the harness (everything I configure).',
  '2. Help me write a tight CLAUDE.md: project, rules, where things live.',
  '3. Set .claude/settings.json permissions: allow the safe tools, ask',
  '   before push, deny destructive commands. Explain each line.',
  '4. Run a ten-check baseline on <the task> and give me a score.',
  "5. I'll change ONE harness thing. Then run the same ten checks again",
  '   and compare — same model, so we see what the room did.',
  '6. Commit CLAUDE.md, settings.json, eval-results.md; keep .env out.',
  '   Confirm no secret was committed.',
]));

push(h2('Individual steps'));
push(h3('Name the three parts'));
push(code('In my project, name the model, the interface, and the harness — one line each.'));
push(h3('Build the room (memory + tools)'));
push(code('Write a tight CLAUDE.md (project, rules, locations), then list the tools\nyou may use in .claude/settings.json. Then do one real job with them.'));
push(h3('Guardrails'));
push(code('Split my permissions into allow / ask / deny: safe tools alone, push\nand delete need my yes, destructive commands denied. Explain each.'));
push(h3('Prove it (same model, one change)'));
push(code('Baseline my task with ten checks. I change ONE harness thing. Re-run the\nsame ten. Show me the before and after, and what each point came from.'));
push(h3('Commit safely'));
push(code('Run git status and show me the diff. Confirm .env is ignored and no secret\nis in any tracked file. Then commit CLAUDE.md, settings.json, eval-results.md.'));
push(h3('When something breaks'));
push(code('I tried to run my task inside the harness and got this:\n\n<paste the whole error>\n\nDiagnose it, tell me the actual cause in one line, then fix it.'));

// ---- Common gaps ----
push(h2('Common gaps to watch for'));
push(h3('In your harness'));
push(bullet('Shopping for a smarter model instead of building the room — the leverage is the harness, not the brain.'));
push(bullet('An empty CLAUDE.md — if the helper re-learns your project every run, you never gave it memory.'));
push(bullet('No guardrails — “allow everything” is not a harness you can leave alone. Use ask and deny.'));
push(bullet('No proof — a room with no before-and-after number is a claim, not a result. Measure on the same model.'));
push(h3('In the repo'));
push(bullet('Committing .env or any secret — rotate it immediately if you do.'));
push(bullet('Changing the model and the harness together — then you never know which one moved the number. One change at a time.'));
push(bullet('CLAUDE.md or settings.json missing from the repo — the room is the deliverable, not just the code.'));

push(new Paragraph({ spacing: { before: 280 }, border: { top: { color: 'CCCCCC', size: 4, style: BorderStyle.SINGLE, space: 6 } },
  children: [new TextRun({ text: 'Written companion to the Harness Assessment video (the harness series). The “Type to Claude” prompts are the exact lines from the video; placeholders in <angle brackets> are for you to fill in with your own project.',
    italics: true, size: 18, color: GRAY, font: 'Calibri' })] }));

// ---- build ----
const doc = new Document({
  creator: 'Drawing Room', title: 'The Harness Assessment',
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: kids }],
});
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('harness-assessment-assignment.docx', buf);
  console.log('wrote harness-assessment-assignment.docx (' + (buf.length / 1024).toFixed(0) + ' KB, ' + kids.length + ' blocks)');
});
