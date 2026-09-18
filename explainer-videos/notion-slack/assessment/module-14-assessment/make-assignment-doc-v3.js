'use strict';
/*
 * make-assignment-doc-v3.js — "Module 14 - Assignment (Connect Your Own Project).docx"
 *
 * Rebuilt 2026-09-17 around Aroma's own three-part script, replacing the seven-part version.
 * The shape is hers: Part 1 is already done if you watched the videos (but redo it on your REAL
 * project), Part 2 is one Slack message that makes the agent prove itself in writing, Part 3 is
 * breaking it on purpose and writing the reflection by hand.
 *
 * Same Word styling as the harness / self-healing / evals assignments: blue headers, teal sub-heads,
 * monospace command blocks, amber call-outs, tick boxes.
 *
 *   node make-assignment-doc-v3.js
 */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} = require('docx');

const BLUE = '1F4E79', ACCENT = '2E7D6B', GRAY = '595959', WARN = '8A5A00', CODEBG = 'F2F3F5', MONO = 'Consolas';
const gap = (after = 120) => ({ after });
const h1 = (t, sub) => [
  new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: t, bold: true, size: 44, color: BLUE, font: 'Calibri' })] }),
  new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: sub, size: 24, color: GRAY, italics: true, font: 'Calibri' })] }),
];
const h2 = (t) => new Paragraph({ spacing: { before: 300, after: 120 }, border: { bottom: { color: BLUE, size: 6, style: BorderStyle.SINGLE, space: 4 } }, children: [new TextRun({ text: t, bold: true, size: 30, color: BLUE, font: 'Calibri' })] });
const h3 = (t) => new Paragraph({ spacing: { before: 180, after: 80 }, children: [new TextRun({ text: t, bold: true, size: 26, color: ACCENT, font: 'Calibri' })] });
const p = (t, o = {}) => new Paragraph({ spacing: gap(o.after ?? 120), children: [new TextRun({ text: t, size: 22, font: 'Calibri' })] });
const bullet = (t, level = 0) => new Paragraph({ bullet: { level }, spacing: gap(60), children: [new TextRun({ text: t, size: 22, font: 'Calibri' })] });
const check = (t) => new Paragraph({ spacing: gap(70), children: [new TextRun({ text: '☐  ', size: 24 }), new TextRun({ text: t, size: 22, font: 'Calibri' })] });
const note = (label, t) => new Paragraph({
  spacing: { before: 140, after: 140 }, shading: { type: ShadingType.SOLID, color: 'FDF6E3', fill: 'FDF6E3' },
  border: { left: { color: 'C9A227', size: 18, style: BorderStyle.SINGLE, space: 10 } },
  children: [new TextRun({ text: label + '  ', bold: true, size: 22, color: WARN, font: 'Calibri' }), new TextRun({ text: t, size: 22, font: 'Calibri' })] });
const code = (lines, o = {}) => lines.map((l, i) => new Paragraph({
  spacing: { before: i === 0 ? 100 : 0, after: i === lines.length - 1 ? 120 : 0 },
  shading: { type: ShadingType.SOLID, color: o.bg || CODEBG, fill: o.bg || CODEBG },
  children: [new TextRun({ text: '  ' + l, font: MONO, size: o.size || 19 })] }));
const cell = (t, o = {}) => new TableCell({
  width: { size: o.w || 33, type: WidthType.PERCENTAGE },
  shading: o.head ? { type: ShadingType.SOLID, color: 'EAF1F7', fill: 'EAF1F7' } : undefined,
  children: [new Paragraph({ spacing: gap(40), children: [new TextRun({ text: t, size: 20, bold: !!o.head, font: 'Calibri' })] })] });
const table = (rows, widths) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: rows.map((r, i) => new TableRow({ children: r.map((c, j) => cell(c, { head: i === 0, w: widths[j] })) })) });

/*
 * The prompt is reproduced here EXACTLY as the video reads it, wrapped for the page. Learners copy
 * this block, so any drift between the video, this document and what the marker expects to see in
 * assignment.md shows up as a missing field in every submission at once.
 */
const PROMPT = [
  'Add a footer to this project\'s homepage with my name, the project name, and the',
  'line "Built with Claude." Open a PR when it\'s done. Before opening the PR, write',
  '(or update) a file at the repo root called assignment.md covering this run. Use',
  'real values only, never placeholders: your bot/app\'s name and this project\'s name,',
  'the Slack channel (and workspace, if named) this came through, how many Notion',
  'databases you\'re connected to and which one you used, the exact title of the Notion',
  'card you created with a link to it, its full status history with timestamps',
  '(example: To Do, then In Progress, then Blocked, then In Progress, then Done), the',
  'task text as posted here, your polling or check-in interval, and the pull request\'s',
  'number/link. If any step fails, say so honestly instead of skipping it.',
];

const doc = new Document({ sections: [{ children: [
  ...h1('Module 14 — Assignment', 'Connect your own project: Slack, Notion, GitHub — then make it prove it'),

  p('This is less work than it looks. It comes down to three parts, and if you followed the seven '
    + 'videos you have already done most of the first one.'),

  table([
    ['Part', 'What it is', 'Roughly'],
    ['Part 1', 'Slack, GitHub and Notion connected — on your real project', 'Already done'],
    ['Part 2', 'One message in Slack. Your agent does the rest and reports on itself', '20 minutes'],
    ['Part 3', 'Break it on purpose, and write down what happened in your own words', '30 minutes'],
  ], [12, 64, 24]),

  note('The test of done', 'You send one Slack message and never open an editor. A Notion card appears '
    + 'and moves through its stages, a pull request opens, and assignment.md turns up in the repo '
    + 'describing the whole run in real values.'),

  h2('Part 1 — Already done (with one change)'),
  p('If you sat through the videos and actually connected Slack, GitHub and Notion — webhooks and '
    + 'polling working, API keys set — this part is finished. Tick it off and move on.'),
  check('Slack app installed, bot invited to a channel, events arriving at your deployed app.'),
  check('GitHub token and webhook in place, secrets matching on both sides.'),
  check('Notion integration created AND added to your board under Connections.'),
  check('Your check-in loop or polling interval is running, and you know what the interval is.'),
  check('Every key lives in environment variables. Nothing is committed.'),

  note('The one change — do this on your real project', 'Do not build this on a throwaway test repo. '
    + 'Do it on the project you actually work on. That is what makes this assignment real rather than '
    + 'a demo — and it is also where you find out whether you trust the thing you built.'),

  note('Tip — let /mcp do the wiring', 'You do not have to hand-write every API call. In Claude Code, run '
    + '/mcp and connect Slack and Notion as MCP servers; your agent can then read and write both through '
    + 'that connection. The credentials underneath are the same ones, and the same two gotchas still bite: '
    + 'the integration must be added under Connections, and the bot must be invited to the channel. '
    + 'What /mcp saves you is the plumbing, not the permissions.'),

  h2('Part 2 — One message'),
  p('This part is easy, and it is only easy because Part 1 is done. You open Slack and send your agent '
    + 'one message. It picks it up through the webhook you built, exactly the way it picks up every other '
    + 'task: it creates a Notion card, moves the card through its stages while it works, opens a pull '
    + 'request, and writes a file called assignment.md next to the code describing everything about that '
    + 'run. You never touch an editor.'),

  h3('Send this, exactly as written'),
  p('Swap in your own name. Change nothing else.', { after: 60 }),
  ...code(PROMPT, { bg: 'EFF4F8' }),

  note('Why a footer', 'It was chosen deliberately. Every project has a homepage, a footer needs no '
    + 'authentication and no database, and nobody gets stuck because the task does not fit their setup. '
    + 'The footer is not the point — the trail it leaves behind is.'),

  h3('What assignment.md must contain'),
  p('Your agent writes this file, not you. Everything in it must be a real value it actually observed:'),
  bullet('Your bot or app\'s name, and this project\'s name.'),
  bullet('The Slack channel the task came through — and the workspace, if it is named.'),
  bullet('How many Notion databases it is connected to, and which one it used.'),
  bullet('The exact title of the Notion card it created, with a link to it.'),
  bullet('That card\'s full status history with timestamps — every stage it passed through, including any it went backwards through.'),
  bullet('The task text exactly as you posted it in Slack.'),
  bullet('Its polling or check-in interval.'),
  bullet('The pull request\'s number and link.'),
  bullet('An honest line about anything that failed, instead of a quiet gap where that step should be.'),

  note('Placeholders are the failure here', 'A file full of <your-project-name> and "To Do → Done" with no '
    + 'timestamps means the agent could not actually read its own trail and filled in what sounded right. '
    + 'That is the single thing this file exists to detect, so it is marked hard. An honest "I could not '
    + 'retrieve the status history" scores better than a tidy invention.'),

  h2('Part 3 — Break it on purpose'),
  p('Now go and break your own setup, and watch what the error actually says. Pick one or more:'),
  table([
    ['Do this', 'Expect'],
    ['Remove your integration from the board\'s Connections', '404 object_not_found — on a board you can see perfectly well'],
    ['Remove the bot from the channel, or forget the /invite', 'not_in_channel when it tries to post'],
    ['Change the webhook secret on one side only', '403 on every delivery'],
    ['Point the Slack Request URL somewhere unreachable', 'Verification fails, and nothing arrives'],
  ], [44, 56]),

  h3('Then write reflection.md — by hand'),
  p('At the root of the same repo, in your own words:'),
  bullet('What you broke, and why you chose that one.'),
  bullet('The exact error you saw. Copy the real text.'),
  bullet('How you found it — where you looked first, and whether that was the right place.'),
  bullet('How you fixed it.'),
  note('This part is yours, not your agent\'s', 'Claude was not there when it broke, so it cannot write '
    + 'this honestly for you. A reflection that reads like documentation instead of experience is the '
    + 'easiest thing in this assignment to spot, and it scores as if the part were not done.'),

  h2('What to hand in'),
  p('Send the link to your repo. Three things are being looked for:'),
  bullet('Your working code — the footer, merged or in an open pull request.'),
  bullet('assignment.md — written by your agent, with real values throughout.'),
  bullet('reflection.md — written by you, by hand.'),
  note('Zero tolerance', 'Mask every token in anything you share, and make sure .env is still in '
    + '.gitignore. A submission containing a live credential is returned unmarked, and you should rotate '
    + 'that credential the same day — it is now in a file you have sent to somebody.'),

  h2('How this is marked (100 points)'),
  table([
    ['Area', 'Points', 'Full marks means'],
    ['Part 1 — connected, on your real project', '30', 'All three connected and live on the project you actually work on; keys in environment variables'],
    ['Part 2 — the run', '15', 'The footer PR was opened by the agent, from your Slack message, with no editor involved'],
    ['Part 2 — assignment.md', '20', 'Every field present and real: names, channel, databases, card title and link, status history with timestamps, task text, interval, PR link'],
    ['Part 2 — the Notion trail', '10', 'A card genuinely created and moved through its stages, matching what assignment.md claims'],
    ['Part 3 — reflection.md', '25', 'A real break, the exact error, where you looked, and the fix — in your own voice'],
    ['Deduction', '−100', 'A live credential visible anywhere in the submission'],
  ], [30, 10, 60]),
  p('Pass: 60. Strong: 80+.', { after: 60 }),
  note('If the run never fully works', 'Submit it anyway. Part 1 and Part 3 are worth 55 on their own, and '
    + 'a clear account of how far it got and where it stopped scores better than a claim that it all worked. '
    + 'Say what you saw.'),

  h2('Troubleshooting'),
  table([
    ['Symptom', 'Almost always'],
    ['404 object_not_found on a database you can see', 'Not shared under Connections'],
    ['not_in_channel when posting', 'The bot was never /invited'],
    ['missing_scope', 'A scope was added but the app was not reinstalled'],
    ['The message sits there and nothing happens', 'Nothing is listening — check the Request URL, or the app has spun down'],
    ['403 on every webhook delivery', 'The secret differs between GitHub and the host'],
    ['assignment.md is full of placeholders', 'The agent could not read back what it did — give it the Notion read access it is missing, then rerun'],
    ['Everything worked, then the token died overnight', 'It was committed; rotate it and check .gitignore'],
  ], [46, 54]),
] }] });

Packer.toBuffer(doc).then((buf) => {
  const out = 'Module 14 - Assignment (Connect Your Own Project).docx';
  fs.writeFileSync(out, buf);
  console.log('  ✓', out, `(${(buf.length / 1024).toFixed(0)} KB)`);
});
