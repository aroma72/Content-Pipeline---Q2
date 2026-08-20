'use strict';
/*
 * make-assignment-doc.js — self-healing-assignment.docx (companion to the assignment video).
 * Same pattern/styling as the harness assignments. Content = build a real Act -> Critic -> Retry ->
 * Remember loop on one task you actually run, then decide where the learning is stored and where the
 * human line sits. Grounded in videos 01-05 of the Self-Healing & Self-Improving series.
 * Professional Word styling: blue headers, monospace prompt blocks.
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
function table(headers, rows, widths) {
  const w = widths || headers.map((_, i) => (i === 0 ? 30 : Math.floor(70 / (headers.length - 1))));
  const mk = (cells, header) => new TableRow({ tableHeader: header, children: cells.map((c, i) => cell(c, header ? { bold: true, white: true, fill: BLUE, w: w[i] } : { fill: i === 0 ? CODEBG : undefined, bold: i === 0 })) });
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [mk(headers, true), ...rows.map(r => mk(r, false))] });
}

const kids = [];
const push = (...xs) => xs.forEach(x => Array.isArray(x) ? kids.push(...x) : kids.push(x));

push(small('Self-Healing & Self-Improving Agents · Assignment'));
push(new Paragraph({ spacing: gap(60), children: [new TextRun({ text: 'Assignment — Build a Loop That Recovers, Then Stops Needing To', bold: true, size: 44, color: '111111', font: 'Calibri' })] }));
push(new Paragraph({ spacing: gap(200), children: [new TextRun({ text: 'Act → Critic → Retry → Remember. Build all four on one task you actually run.', italics: true, size: 24, color: GRAY, font: 'Calibri' })] }));

push(p('In this module you learned the difference between an AI system that recovers from its mistakes and one that genuinely learns from them. Self-healing changes the execution: the system detects a failure and fixes it, while the model stays exactly the same. Self-improving changes the future behaviour: the fix is stored somewhere, so the same mistake does not come back. Now you build both on a real task.'));
push(p([new TextRun({ text: 'Why this matters — ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'the industry jumps from "the AI got it wrong" straight to "we need to train a better model." Usually you do not. You need a better system. This assignment forces you to prove that on your own work before you ever consider touching the weights.', size: 22, font: 'Calibri' })]));
push(p([new TextRun({ text: '📘  Walkthrough: ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'the assignment video shows this build on screen, step by step. Videos 01–05 of the series cover the ideas behind each part.', size: 22, font: 'Calibri' })]));

push(h2('What you’ll hand in'));
push(p('One Google Doc (link on the LMS, "anyone with the link → viewer") plus a link to your code or a folder of screenshots. The doc has five numbered sections:'));
push(num(1, 'Your three named failures — stated so precisely that a rule or a test could detect each one.'));
push(num(2, 'Your critic — the code or prompt, plus which of the four flavours you chose and why.'));
push(num(3, 'Your loop — act, check, retry with the reason fed back, a cap on tries, and an escalation to a human.'));
push(num(4, 'Your before-and-after — 10 runs before storing the fix, 10 runs after; retries and escalations for each.'));
push(num(5, 'Your POLICY.md — what the system may change about itself alone, what always needs you, plus the five-point fine-tune check.'));
push(p('Plus a 3-line reflection at the bottom.'));

push(h2('At a glance'));
push(table(['Part', 'What it is', 'What you produce'],
  [['A · The failure', 'Name what "wrong" actually looks like', 'Three failures, each checkable'],
   ['B · The critic', 'The cheapest thing that catches it', 'critic.js — returns a reason, not a verdict'],
   ['C · The loop', 'Retry with the reason, capped, then a human', 'loop.js — act → check → retry → escalate'],
   ['D · The memory', 'Where the fix is stored', 'The store + before/after run counts'],
   ['E · The line', 'What may improve itself, what may not', 'POLICY.md + the five-point check']]));

// Part A
push(h2('Part A — Name the failure (before anything else)'));
push(p('Pick ONE task you genuinely run — a weekly report, a support reply, a data pull, a lesson plan draft. Then write down exactly what going wrong looks like. A critic can only catch a failure you can state; "it hallucinates sometimes" is not a failure a rule or a test can ever detect.'));
push(check('One real task, described in three lines: input, output, and how often you run it.'));
push(check('Three named failures, each rewritten until a rule or a test could detect it.'));
push(check('For each: how you find out today (and how late that is).'));
push(table(['Too vague', 'Checkable'],
  [['It hallucinates sometimes', 'It cites a policy number that does not exist in the policy file'],
   ['The output is bad', 'It returns an empty result set'],
   ['It gets refunds wrong', 'It proposes a refund larger than the order total']], [45, 55]));
push(code('Here is one task I run every week: <describe it>. Help me write down the three\nways it actually fails, and rewrite each one until a plain rule or a test could\ndetect it. Reject anything I write that is too vague to check.', 'Type to Claude:'));

// Part B
push(h2('Part B — Build the critic'));
push(p('The critic is the thing that inspects the output before it reaches a human. It comes in four flavours, and the rule of thumb is: use the cheapest critic that catches your real failure. Never pay for a model call where a plain rule will do.'));
push(table(['Critic', 'Cost', 'Catches'],
  [['A plain rule', 'Free, instant', 'Anything you can state exactly (limits, formats, forbidden moves)'],
   ['A test / validator', 'Cheap', 'Anything with a right answer — run it and see if it holds'],
   ['Another model', 'A call + delay', 'The vague and the sloppy no rule could describe — but can be confidently wrong'],
   ['A person', 'Slow, expensive', 'Anything — save it for the moves you cannot take back']], [25, 22, 53]));
push(check('At least one plain rule that fires with no model call at all.'));
push(check('Your critic returns a REASON, not just pass/fail — the reason is what makes the retry work.'));
push(check('If you used a model as critic, say which failure a rule could not have caught.'));
push(code('Write me a critic for this output. Start with plain rules for everything that can\nbe stated exactly. Only add a model call for the failures a rule cannot describe.\nEvery failure must return a specific reason, not just "failed".', 'Type to Claude:'));

// Part C
push(h2('Part C — Close the loop'));
push(p('Now wire it: the agent acts, the critic checks, and on failure the reason goes back in and it tries again. This is self-healing — and notice what you are NOT doing: you are not training anything. The model is the same model it was a minute ago; the system around it is what changed.'));
push(check('The failure reason is passed back into the retry (not just "try again").'));
push(check('The number of tries is capped — 2 or 3. An uncapped loop is an unbounded bill.'));
push(check('After the cap, it stops and hands the whole trail to a person. It never fails silently and never loops forever.'));
push(check('One screenshot or log line showing a real run that failed, retried, and passed.'));
push(code([
  'result = agent.run(task)',
  'check  = critic(result)',
  '',
  'while (!check.ok && tries < 3) {',
  '  result = agent.run(task, check.reason)   // the reason goes back in',
  '  check  = critic(result)',
  '  tries++',
  '}',
  'if (!check.ok) escalateToHuman(result, check.reason)',
], 'The shape you are building:'));

// Part D
push(h2('Part D — Store the fix (this is the improving half)'));
push(p('A loop that heals every time but never gets shorter is not improving — it is repeating. So take the failure that keeps coming back and decide where the lesson gets stored. Six of the seven places never touch the model at all.'));
push(table(['Store it in', 'Use when'],
  [['Memory', 'The lesson is about this customer, this case, what was already tried'],
   ['Retrieval', 'It was guessing because the right source never reached it'],
   ['Instructions', 'It was never told the rule — the most common one by far'],
   ['Tools', 'It kept improvising something it should have been able to look up or do'],
   ['Workflow', 'Too much was asked in one step; split it'],
   ['Checks', 'The failure was real and repeatable — make it a permanent critic'],
   ['The model itself', 'Fine-tuning. See Part E — and only if all five conditions hold']], [30, 70]));
push(check('For each repeated failure: which store you chose, and one line on why.'));
push(check('10 runs BEFORE the fix was stored — record retries and escalations.'));
push(check('10 runs AFTER — the same numbers.'));
push(check('If the retry count did not drop, say so honestly and explain what you think went wrong.'));
push(code('This failure keeps coming back. Walk me through where the fix should be stored —\nmemory, retrieval, instructions, tools, workflow, or a new check — and why that\nplace and not the others. Then help me measure whether it actually stopped.', 'Type to Claude:'));

// Part E
push(h2('Part E — Draw the human line'));
push(p('The interesting question is not "can AI improve itself" — it is which parts of your system are ALLOWED to improve themselves, and which parts always require a human. Write both lists down. Anything that touches rules, money, or the model itself belongs on the human side by default.'));
push(check('POLICY.md with two lists: may change itself alone / only with a person.'));
push(check('One line on why each item is on the side you put it.'));
push(h3('The five-point fine-tune check'));
push(p('Answer all five honestly for your task. Fewer than five yeses means the answer is "fix the system, not the model" — and you should name which rung of the diagnosis ladder you are actually on.'));
push(check('Narrow — one well-defined, repeating task (not "run the whole thing").'));
push(check('High volume — enough that a small improvement is worth the effort.'));
push(check('Real dataset — actual examples of good and bad outputs, not opinions.'));
push(check('Measurable — you can prove the new model beats the old one.'));
push(check('Stable — the task is not changing every few weeks.'));
push(p([new TextRun({ text: 'If you answer yes to all five: ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'also write three lines on what you would then own — data quality, training pipelines, evaluation, model serving, hardware, inference cost, versioning, drift, and ongoing maintenance. That is a different engineering job, not a setting you flip.', size: 22, font: 'Calibri' })]));

push(h2('The diagnosis ladder (use this before you blame the model)'));
push(p('When the output is wrong, climb these in order. Five of the six are fixed in an afternoon, without touching the model.'));
push(num(1, 'The ask — was it unclear, vague, or missing what good looks like?'));
push(num(2, 'The context — was it guessing at something it never saw?'));
push(num(3, 'The tools — did it have the right tool, or was it improvising without one?'));
push(num(4, 'The workflow — was everything asked in one impossible step?'));
push(num(5, 'The check — was the critic simply missing?'));
push(num(6, 'The job — is this genuinely a task the model is not good at?'));

push(h2('Copy-paste prompt bank'));
push(p([new TextRun({ text: '🔑  Build the whole loop (step by step)', bold: true, size: 22, color: ACCENT, font: 'Calibri' })]));
push(code([
  "I'm doing the Self-Healing & Self-Improving assignment.",
  '',
  'My task: <one line>. I run it <how often>. Input: <...>. Output: <...>.',
  '',
  'Work through this with me one step at a time, and stop for my OK after each:',
  '',
  '1. FAILURES: help me name the 3 ways this actually fails, rewritten until a',
  '   rule or test could detect each one. Reject anything too vague to check.',
  '2. CRITIC: write the critic — plain rules first, a model call only for what a',
  '   rule cannot describe. Every failure returns a specific reason.',
  '3. LOOP: act → check → retry with the reason fed back → cap at 3 → escalate',
  '   to me with the full trail.',
  '4. REMEMBER: for each repeated failure, tell me where the fix should be stored',
  '   (memory, retrieval, instructions, tools, workflow, or a new check) and why.',
  '5. MEASURE: run 10 before and 10 after; report retries and escalations for each.',
  '6. POLICY: write POLICY.md — what this may change about itself alone, and what',
  '   always needs me. Then run the five-point fine-tune check honestly.',
]));

push(h2('Common gaps to watch for'));
push(bullet('Failures written too vaguely to check — "it hallucinates" is not something a critic can detect.'));
push(bullet('A critic that returns pass/fail with no reason — the retry then has nothing to work with.'));
push(bullet('An uncapped retry loop — that is an unbounded bill and a helper that never stops.'));
push(bullet('No escalation path — when the cap is hit, a person must get the whole trail, not silence.'));
push(bullet('Healing but never remembering — the loop works forever and never gets shorter. That is not improvement.'));
push(bullet('Reaching for fine-tuning at the first bad output — climb the diagnosis ladder first.'));
push(bullet('Letting the system rewrite its own rules or money limits — those belong on the human side of the line.'));

push(new Paragraph({ spacing: { before: 280 }, border: { top: { color: 'CCCCCC', size: 4, style: BorderStyle.SINGLE, space: 6 } }, children: [new TextRun({ text: 'Companion to the assignment video (Self-Healing & Self-Improving Agents series, videos 01–05). Recovering from a mistake is practical today; learning from one is the harder art.', italics: true, size: 18, color: GRAY, font: 'Calibri' })] }));

const doc = new Document({ creator: 'Drawing Room', title: 'Self-Healing & Self-Improving — Assignment',
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: kids }] });
Packer.toBuffer(doc).then(buf => { fs.writeFileSync('self-healing-assignment.docx', buf); console.log('wrote self-healing-assignment.docx (' + (buf.length / 1024).toFixed(0) + ' KB, ' + kids.length + ' blocks)'); });
