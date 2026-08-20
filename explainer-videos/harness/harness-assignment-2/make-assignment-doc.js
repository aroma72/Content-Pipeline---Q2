'use strict';
/*
 * make-assignment-doc.js — harness-assignment-2-assignment.docx (companion to the Assignment 2 video).
 * Same pattern/styling as Assignment 1. Content = "build an effective harness on your own repo",
 * grounded in reference/HARNESS_BOOTSTRAP.md: Guides (steer before) + Sensors (catch after) + Memory
 * (beads) + Report card (evals). Professional Word styling: blue headers, monospace prompt blocks.
 */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} = require('docx');

const BLUE = '1F4E79', ACCENT = '2E7D6B', GRAY = '595959', CODEBG = 'F2F3F5', MONO = 'Consolas';
const gap = (after = 120) => ({ after });
const h2 = (t) => new Paragraph({ spacing: { before: 260, after: 120 }, border: { bottom: { color: BLUE, size: 6, style: BorderStyle.SINGLE, space: 4 } }, children: [new TextRun({ text: t, bold: true, size: 30, color: BLUE, font: 'Calibri' })] });
const h3 = (t) => new Paragraph({ spacing: { before: 180, after: 80 }, children: [new TextRun({ text: t, bold: true, size: 26, color: ACCENT, font: 'Calibri' })] });
const p = (runs, o = {}) => new Paragraph({ spacing: gap(o.after ?? 120), children: Array.isArray(runs) ? runs : [new TextRun({ text: runs, size: 22, font: 'Calibri' })] });
const small = (t) => new Paragraph({ spacing: gap(60), children: [new TextRun({ text: t, size: 18, color: ACCENT, bold: true, allCaps: true, font: 'Calibri' })] });
const bullet = (t, level = 0) => new Paragraph({ bullet: { level }, spacing: gap(60), children: [new TextRun({ text: t, size: 22, font: 'Calibri' })] });
const check = (t) => new Paragraph({ spacing: gap(60), children: [new TextRun({ text: '☐  ', size: 24 }), new TextRun({ text: t, size: 22, font: 'Calibri' })] });
const num = (n, t) => new Paragraph({ spacing: gap(60), children: [new TextRun({ text: `${n}.  `, bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: t, size: 22, font: 'Calibri' })] });
function code(lines, label) {
  const out = [];
  if (label) out.push(new Paragraph({ spacing: { before: 120, after: 40 }, children: [new TextRun({ text: label, bold: true, size: 20, color: ACCENT, font: 'Calibri' })] }));
  const arr = Array.isArray(lines) ? lines : [lines];
  arr.forEach((ln, i) => out.push(new Paragraph({
    shading: { type: ShadingType.SOLID, color: CODEBG, fill: CODEBG },
    spacing: { before: i === 0 ? 40 : 0, after: i === arr.length - 1 ? 140 : 0, line: 264 },
    border: { left: { color: ACCENT, size: 18, style: BorderStyle.SINGLE, space: 8 },
      top: i === 0 ? { color: 'DDDDDD', size: 4, style: BorderStyle.SINGLE, space: 4 } : undefined,
      bottom: i === arr.length - 1 ? { color: 'DDDDDD', size: 4, style: BorderStyle.SINGLE, space: 4 } : undefined },
    children: [new TextRun({ text: ln || ' ', font: MONO, size: 20, color: '1A1A1A' })] })));
  return out;
}
const cell = (t, o = {}) => new TableCell({ width: o.w ? { size: o.w, type: WidthType.PERCENTAGE } : undefined, shading: o.fill ? { type: ShadingType.SOLID, color: o.fill, fill: o.fill } : undefined, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: o.bold, size: 20, color: o.white ? 'FFFFFF' : '1A1A1A', font: 'Calibri' })] })] });
function table(headers, rows) {
  const mk = (cells, header) => new TableRow({ tableHeader: header, children: cells.map((c, i) => cell(c, header ? { bold: true, white: true, fill: BLUE, w: i === 0 ? 30 : 35 } : { fill: i === 0 ? CODEBG : undefined, bold: i === 0 })) });
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [mk(headers, true), ...rows.map(r => mk(r, false))] });
}

const kids = [];
const push = (...xs) => xs.forEach(x => Array.isArray(x) ? kids.push(...x) : kids.push(x));

push(small('The Harness series · Assignment 2'));
push(new Paragraph({ spacing: gap(60), children: [new TextRun({ text: 'Assignment 2 — Build an Effective Harness on Your Repo', bold: true, size: 46, color: '111111', font: 'Calibri' })] }));
push(new Paragraph({ spacing: gap(200), children: [new TextRun({ text: 'Two halves that work together: guides that steer before it acts, and sensors that catch after.', italics: true, size: 24, color: GRAY, font: 'Calibri' })] }));

push(p('In this series you learned what a harness is and what it is made of. Now you build a real, self-reinforcing one on your own Claude Code repo. An effective harness has four parts: GUIDES that steer Claude before it acts, SENSORS that catch mistakes after it acts, MEMORY that survives context resets, and a REPORT CARD that proves the whole thing works.'));
push(p([new TextRun({ text: 'Why this matters — ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'guides without sensors are a rulebook nobody enforces; sensors without guides means fixing mistakes you could have prevented. The CEO OS and Rumi repos work because violations are caught mechanically, not by asking Claude to be disciplined. You are building both halves.', size: 22, font: 'Calibri' })]));
push(p([new TextRun({ text: '📘  Walkthrough: ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'the Assignment 2 video shows this build on screen. The full 9-phase source is in ', size: 22, font: 'Calibri' }), new TextRun({ text: 'reference/HARNESS_BOOTSTRAP.md', font: MONO, size: 20 }), new TextRun({ text: ' — paste it into a fresh session and say "build the harness described here, phase by phase."', size: 22, font: 'Calibri' })]));

push(h2('What you’ll hand in'));
push(p('One Google Doc (link on the LMS, "anyone with the link → viewer") plus a link to your repo. The doc has five numbered sections:'));
push(num(1, 'Your CLAUDE.md — the short L1 router (under 150 lines), plus one L2 or L3 doc.'));
push(num(2, 'Your sensors — .claude/settings.json + the hook scripts, and one screenshot of a hook blocking a bad move.'));
push(num(3, 'Your memory — the three .beads/ files (status, decisions, failures) with at least one real entry each.'));
push(num(4, 'Your report card — your eval tasks + one results line (hops and wrong-route rate).'));
push(num(5, 'Your repo link — everything committed; .env NOT committed.'));
push(p('Plus a 3-line reflection at the bottom.'));

push(h2('At a glance'));
push(table(['Part', 'What it is', 'What you produce'],
  [['A · Guides', 'Steer before it acts', 'CLAUDE.md L1 router (≤150) + L2/L3 + a skill'],
   ['B · Sensors', 'Catch after it acts', '.claude/hooks/ + settings.json (block/validate)'],
   ['C · Memory', 'Survives context resets', '.beads/ status · decisions · failures'],
   ['D · Report card', 'Proves it works', 'evals: right doc in ≤2 hops, wrong-route < 5%']]));

// Part A
push(h2('Part A — Guides (steer before it acts)'));
push(p('Make the context Claude reads a short, high-signal map — not a fat manual. Context is a depletable resource: every extra line buries the rule that mattered.'));
push(check('CLAUDE.md is an L1 router: navigation + critical rules only, under 150 lines.'));
push(check('Detail moved to L2 folder routers / L3 docs, each with YAML frontmatter (type, last_verified, owner).'));
push(check('At least one skill (a repeated job as a shortcut) and, optionally, one scoped agent.'));
push(code('Make my CLAUDE.md a short router — navigation and critical rules only, under\n150 lines. Move the detail into L2 folder routers and L3 docs with frontmatter.', 'Type to Claude:'));

// Part B
push(h2('Part B — Sensors (catch after it acts)'));
push(p('Hooks fire at lifecycle events and enforce rules mechanically. Exit 0 = allow (silent). Exit 2 = block, and tell Claude how to fix it. Silent on success, loud on failure.'));
push(check('.claude/settings.json wires PreToolUse (block) + PostToolUse (validate) + Stop (session-end).'));
push(check('A hook that blocks committing .env and force-pushing to main.'));
push(check('A hook that blocks CLAUDE.md if it grows past 150 lines.'));
push(check('One screenshot of a hook actually blocking a bad move.'));
push(code('Add hooks in .claude/settings.json: block committing .env, block force-push\nto main, and block writing CLAUDE.md if it exceeds 150 lines. Silent on\nsuccess, exit 2 with a fix message on failure.', 'Type to Claude:'));

// Part C
push(h2('Part C — Memory that survives'));
push(p('Claude has no memory across context resets. Beads are append-only JSONL that survive — a session-start hook re-injects open ones every session. Never edit a prior line; the history is the value.'));
push(check('.beads/status.jsonl — open a bead before a task, close it with a resolution (what was done + how to verify).'));
push(check('.beads/decisions.jsonl — one real architectural decision with its rationale and alternatives.'));
push(check('.beads/failures.jsonl — one real incident: root cause, fix, and the lesson that prevents recurrence.'));
push(code('Set up beads in .beads/: status, decisions, failures (append-only JSONL).\nOpen bd-001 for this harness build, and add a session-start hook that\nre-injects open beads each session.', 'Type to Claude:'));

// Part D
push(h2('Part D — The report card (evals)'));
push(p('An eval proves your docs route Claude to the right file fast. Hops = files loaded before the answer; aim for ≤2 (L1 → L2 → L3). 3+ hops means the routing is broken — fix the router, not the destination.'));
push(check('At least 4 eval tasks covering explicit, implicit, contextual, and negative cases.'));
push(check('One results line: average hops and wrong-route rate (target ≤2 hops, wrong-route < 5%).'));
push(check('Cost recorded (the eval run’s cost_usd).'));
push(code('Add evals in .claude/evals/: for each, a question, the doc you should load,\nthe docs you should NOT load, and max_hops. Run them and tell me average\nhops, wrong-route rate, and the cost.', 'Type to Claude:'));

// Part E
push(h2('Part E — Commit, then submit'));
push(p('Commit and push: CLAUDE.md, .claude/ (hooks, settings, skills, evals), and .beads/ in; .env out. Then submit one Google Doc link with the five sections, plus a 3-line reflection:'));
push(num(1, 'the one rule your sensors now enforce that used to rely on discipline;'));
push(num(2, 'your eval result — average hops and wrong-route rate;'));
push(num(3, 'one thing your harness will catch next month that it cannot catch today.'));

push(h2('Copy-paste prompt bank'));
push(p([new TextRun({ text: '🔑  Build the whole harness (step by step)', bold: true, size: 22, color: ACCENT, font: 'Calibri' })]));
push(code([
  "I'm doing Assignment 2 — building an effective harness on my repo.",
  '',
  'Project: <name>. What it does: <one line>.',
  '',
  'Work through this with me one step at a time, and stop for my OK after each:',
  '',
  '1. GUIDES: make CLAUDE.md a short L1 router (<150 lines); move detail to',
  '   L2/L3 docs with frontmatter. Add one /skill for a repeated job.',
  '2. SENSORS: add hooks in .claude/settings.json — block .env commits and',
  '   force-push, block CLAUDE.md over 150 lines. Silent on success, exit 2 on fail.',
  '3. MEMORY: set up .beads/ (status, decisions, failures) + a session-start',
  '   hook that re-injects open beads.',
  '4. REPORT CARD: add 4 evals (explicit, implicit, contextual, negative);',
  '   run them and report average hops, wrong-route rate, and cost.',
  '5. Commit CLAUDE.md, .claude/, .beads/; keep .env out. Confirm no secret',
  '   was committed.',
]));

push(h2('Common gaps to watch for'));
push(bullet('Putting content in CLAUDE.md — it loads every session; route detail to L3.'));
push(bullet('Hooks that talk on success — noise. Silent on success, loud on failure.'));
push(bullet('Only guides, no sensors — a rulebook nobody enforces. Build both halves.'));
push(bullet('Skipping the failures log — it is the most valuable file; incidents become rules.'));
push(bullet('Committing .env or any secret — rotate it immediately if you do.'));
push(bullet('No evals — then you never know Claude is routing right until a session goes wrong.'));

push(new Paragraph({ spacing: { before: 280 }, border: { top: { color: 'CCCCCC', size: 4, style: BorderStyle.SINGLE, space: 6 } }, children: [new TextRun({ text: 'Companion to the Assignment 2 video (harness series). Built from Taleemabad’s Context Engineering Harness (CEO OS + Rumi patterns) — full source in reference/HARNESS_BOOTSTRAP.md.', italics: true, size: 18, color: GRAY, font: 'Calibri' })] }));

const doc = new Document({ creator: 'Drawing Room', title: 'The Harness — Assignment 2',
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: kids }] });
Packer.toBuffer(doc).then(buf => { fs.writeFileSync('harness-assignment-2-assignment.docx', buf); console.log('wrote harness-assignment-2-assignment.docx (' + (buf.length / 1024).toFixed(0) + ' KB, ' + kids.length + ' blocks)'); });
