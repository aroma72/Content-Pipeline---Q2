'use strict';
/*
 * make-assignment-doc.js — "Notion and Slack - Module 14 Assessment (assignment).docx"
 * Companion to the assessment video (beats.js). Same pattern/styling as the harness and self-healing
 * assignments. Content = the Ship From Slack exercise: wire Slack + Notion + GitHub to one real project
 * using Orenda-Project/orchestration-harness-v2, prove the whole chain, break it on purpose, lock it
 * down. Grounded in videos 01-08 of the Notion + Slack module.
 * Professional Word styling: blue headers, monospace command blocks.
 */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} = require('docx');

const BLUE = '1F4E79', ACCENT = '2E7D6B', GRAY = '595959', WARN = '8A5A00', CODEBG = 'F2F3F5', MONO = 'Consolas';
const gap = (after = 120) => ({ after });
const h2 = (t) => new Paragraph({ spacing: { before: 260, after: 120 }, border: { bottom: { color: BLUE, size: 6, style: BorderStyle.SINGLE, space: 4 } }, children: [new TextRun({ text: t, bold: true, size: 30, color: BLUE, font: 'Calibri' })] });
const h3 = (t) => new Paragraph({ spacing: { before: 180, after: 80 }, children: [new TextRun({ text: t, bold: true, size: 26, color: ACCENT, font: 'Calibri' })] });
const p = (runs, o = {}) => new Paragraph({ spacing: gap(o.after ?? 120), children: Array.isArray(runs) ? runs : [new TextRun({ text: runs, size: 22, font: 'Calibri' })] });
const small = (t) => new Paragraph({ spacing: gap(60), children: [new TextRun({ text: t, size: 18, color: ACCENT, bold: true, allCaps: true, font: 'Calibri' })] });
const bullet = (t, level = 0) => new Paragraph({ bullet: { level }, spacing: gap(60), children: [new TextRun({ text: t, size: 22, font: 'Calibri' })] });
const check = (t) => new Paragraph({ spacing: gap(60), children: [new TextRun({ text: '☐  ', size: 24 }), new TextRun({ text: t, size: 22, font: 'Calibri' })] });
const num = (n, t) => new Paragraph({ spacing: gap(60), children: [new TextRun({ text: `${n}.  `, bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: t, size: 22, font: 'Calibri' })] });
const note = (label, t) => new Paragraph({
  spacing: { before: 140, after: 140 }, shading: { type: ShadingType.SOLID, color: 'FDF6E3', fill: 'FDF6E3' },
  border: { left: { color: 'C9A227', size: 18, style: BorderStyle.SINGLE, space: 10 } },
  children: [new TextRun({ text: label + '  ', bold: true, size: 22, color: WARN, font: 'Calibri' }), new TextRun({ text: t, size: 22, font: 'Calibri' })] });
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

push(small('Connecting Your Agent to Notion and Slack · Module 14 · Assessment'));
push(new Paragraph({ spacing: gap(60), children: [new TextRun({ text: 'Assessment — Ship From Slack', bold: true, size: 44, color: '111111', font: 'Calibri' })] }));
push(new Paragraph({ spacing: gap(200), children: [new TextRun({ text: 'Wire Slack, Notion and GitHub to one real project — then change that project from your phone.', italics: true, size: 24, color: GRAY, font: 'Calibri' })] }));

push(p('In this module you learned where an agent can read, where it can speak, and why permission is separate from membership in both tools. Now you connect all three systems around a project you own, using a real orchestration harness, and prove the whole chain works end to end.'));
push(p([new TextRun({ text: 'The test of done — ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'from your phone, in Slack, you ask for a change to your project, and within three minutes a Notion ticket exists, an agent has worked on it, a pull request is open on GitHub, and the agent has replied in your thread.', size: 22, font: 'Calibri' })]));
push(p([new TextRun({ text: 'Why this matters — ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'an agent that only runs when you are sitting in front of it is a demo. The moment it reads where your team\'s memory lives and speaks where their attention is, it becomes infrastructure — and everything you learned about scopes, sharing and approval stops being theory.', size: 22, font: 'Calibri' })]));
push(p([new TextRun({ text: '📘  Walkthrough: ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'the assessment video walks this build on screen, step by step. Videos 01–08 of the module cover the ideas behind each part; videos 07 and 08 are the click-by-click setup.', size: 22, font: 'Calibri' })]));

push(p([new TextRun({ text: 'Repository: ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'Orenda-Project/orchestration-harness-v2', font: MONO, size: 20 }), new TextRun({ text: '  ·  Time: about 3 hours  ·  Do it after video 08.', size: 22, font: 'Calibri' })]));

push(h2('Before you start'));
push(p('Tick every box before you clone anything. Missing one of these is the single most common reason this takes five hours instead of three.'));
push(check('You have watched videos 03, 07 and 08, and your Notion integration and Slack app already exist.'));
push(check('You can install a Slack app in your workspace — or you have asked an admin and they have said yes. Ask today, not on the day you start.'));
push(check('You have access to the harness repo. It is private — your instructor will grant access or give you a copy.'));
push(check('You have a small project repository of your own on GitHub that you are willing to let an agent change. Not your dissertation. A scratch repo with a README is perfect.'));
push(check('You have git, python3, sqlite3 and Claude Code installed and working.'));
push(check('You have created three throwaway things: a Notion database, a private Slack channel, and a GitHub repo. Nothing real.'));

push(note('Safety brief — read before you clone.', 'This repo was built for one person\'s real workspace and still has their fingerprints in it. At the time of writing, harness/tick.sh contains credentials pasted directly into the script, and the Slack poller is hardcoded to one specific person and one specific bot. Do not run tick.sh as it is, do not copy any key you find inside the repo, and do not push anything back to the original. Work in your own fork. If a key in there is still live, it belongs to someone else — report it to your instructor rather than using it. Video 06 is about exactly this failure, and you are about to meet it in the wild.'));

push(h2('How the harness works (one page, so you are not running magic)'));
push(p('The harness has no server and no daemon. It is a loop running inside Claude Code. Every tick — by default every 180 seconds — it does the same five things:'));
push(table(['Step', 'What happens'],
  [['1 · sync-state', 'Takes a tick lock so two ticks can never run at once, and reads last_sync_at — the moment it last caught up to.'],
   ['2 · poll', 'Asks Notion, Slack and GitHub what changed since last_sync_at. Anything actionable becomes an event row in a local SQLite database.'],
   ['3 · dispatch', 'Groups pending events by context key, skips any context that already has a session running, and spawns one agent session per context.'],
   ['4 · sync-state', 'Moves last_sync_at forward and releases the lock.'],
   ['5 · self-improve', 'Only when idle and 24 hours have passed. Ignore it for this assessment.']], [22, 78]));
push(p('Four words you need, from the repo\'s own glossary:'));
push(bullet('Event — one normalised signal ("someone mentioned the agent in Slack"). Its ID is built from source plus external ID, so the same message can never be queued twice.'));
push(bullet('Entity — one external object being tracked: a Notion ticket, a Slack thread, a GitHub pull request.'));
push(bullet('Context key — always the Notion ticket. Never the Slack thread, never the PR. That is why work starting in Slack gets a stub ticket created for it.'));
push(bullet('Workspace — harness/workspace/, a local clone of your project. That is what the agent edits. It is not the harness repo.'));
push(p([new TextRun({ text: 'So the shape of the whole thing is: ', size: 22, font: 'Calibri' }), new TextRun({ text: 'Slack is the doorbell, Notion is the work board, GitHub is the result, and the loop is the thing that keeps looking.', bold: true, size: 22, font: 'Calibri' })]));

push(h2('At a glance'));
push(table(['Part', 'What it is', 'What you produce'],
  [['A · Three keys', 'Credentials that actually validate', '.env, untracked, six checks passing'],
   ['B · Your board', 'Notion properties the harness expects', 'Five properties + the title name settled'],
   ['C · One tick', 'Prove the loop runs and releases', 'Three SQLite queries'],
   ['D · From Slack', 'The whole chain, triggered by a message', 'Ticket, session, workspace change, reply'],
   ['E · Land + lock', 'A merged PR and a safe setup', 'PR link, secret scan, approval rule'],
   ['F · Read it', 'Judge the repo you just ran', 'Three contradictions, one about keys']]));

// ---- PART A ----
push(h2('Part A — The three keys'));
push(p('You need three credentials. Two of them you made in videos 07 and 08.'));
push(check('Notion: your integration secret, database ID, and the agent\'s Notion user ID. Share the database under "…" → Connections — creating the integration grants nothing.'));
push(check('Slack: your bot token (xoxb-), your test channel ID, and the bot invited with /invite.'));
push(check('Slack, one extra thing: the harness polls with the search API, and search needs a user token (xoxp-) with the search:read scope. A bot token is rejected. Add it and reinstall.'));
push(check('GitHub: a personal access token scoped to your scratch repo, and the repo as owner/repo.'));
push(p('Fork the harness, clone your fork, open Claude Code inside it, and run the setup wizard. It validates every credential before writing the file — that validation is the point, and it is the difference between "I pasted a token" and "the token works".'));
push(table(['Service', 'Check', 'Pass looks like'],
  [['Notion', 'GET /v1/users/me', '200'],
   ['Notion', 'GET /v1/databases/<id>', '200 — a 404 means you skipped Connections'],
   ['Notion', 'GET /v1/users/<agent id>', '200'],
   ['Slack', 'auth.test', 'ok'],
   ['Slack', 'conversations.info', 'ok — not_in_channel means you skipped /invite'],
   ['GitHub', 'GET /repos/<owner>/<repo>', '200']], [16, 40, 44]));
push(check('Confirm harness/.env exists and that git status never shows it.'));
push(p([new TextRun({ text: 'Evidence E1: ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'a screenshot of your Bot Token Scopes and User Token Scopes, with the token values not visible.  ', size: 22, font: 'Calibri' }), new TextRun({ text: 'Evidence E2: ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'terminal output showing all six validations passing, tokens masked.', size: 22, font: 'Calibri' })]));

// ---- PART B ----
push(h2('Part B — Point it at your board'));
push(p('The harness expects four custom properties beyond Status: Agent Session ID, Last Agent Update, GitHub PR, and Slack Thread. Add them, or let the setup wizard provision them.'));
push(h3('Then settle the title-property argument'));
push(p('The repo disagrees with itself about what your title column is called. One skill expects "Task name"; another file expects "Deliverable". Your database probably says "Name". One of the three has to change.'));
push(note('This is the assessment, not a bug to route around.', 'Real integration work is mostly making two systems agree about a name. If you paper over it, the poller will create tickets the dispatcher cannot see, and you will lose an hour wondering why nothing runs.'));
push(p([new TextRun({ text: 'Evidence E3: ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'a screenshot of your database showing all five properties, and one sentence naming the file(s) you edited.', size: 22, font: 'Calibri' })]));

// ---- PART C ----
push(h2('Part C — Prove one tick'));
push(p('Run a single tick and watch it. Do not start the full loop yet. Then read the database directly, rather than trusting a log line.'));
push(code([
  'sqlite3 harness/db/harness.db "SELECT * FROM sync_state;"',
  'sqlite3 harness/db/harness.db "SELECT * FROM tick_lock;"',
  'sqlite3 harness/db/harness.db "SELECT id, source, type, status FROM events;"',
], 'Read the state yourself'));
push(check('Expect zero events on a fresh harness. That is a pass, not a failure — nothing has happened since last_sync_at was set.'));
push(check('Confirm the tick released its lock. A tick killed halfway leaves the lock held, and the next tick refuses to run for thirty minutes.'));
push(p([new TextRun({ text: 'Evidence E4: ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'the output of those three queries after your first successful tick.', size: 22, font: 'Calibri' })]));

// ---- PART D ----
push(h2('Part D — Order work from Slack'));
push(p('This is the part the whole assessment exists for.'));
push(check('Find your bot\'s Slack user ID and put it in the Slack poller. As shipped, it searches for a bot from another workspace and will never match yours.'));
push(check('While you are in that file, notice it also filters for one named person. Decide your own rule and change it. Write down what you chose.'));
push(check('Start the loop, then post in your test channel: "@your-bot please add a CONTRIBUTING.md with a one-paragraph description of this project."'));
push(check('Wait one full tick — up to 180 seconds. Do not touch anything. This is the hard part.'));
push(p('Then check each link in the chain, in this order, and stop at the first one that did not happen:'));
push(table(['Check', 'Where', 'What you should see'],
  [['Event queued', 'SQLite events table', 'a row with source slack, pending then done'],
   ['Ticket created', 'Your Notion board', 'a row titled "From Slack: <timestamp>" with the thread URL'],
   ['Session dispatched', 'SQLite sessions table', 'one row: scheduled → running → completed'],
   ['Agent worked', 'harness/workspace/', 'your project, cloned locally, with the change made'],
   ['It spoke back', 'Your Slack thread', 'a reply in the same thread, not a new channel message']], [24, 28, 48]));
push(note('If nothing happened, do not restart everything.', 'Work the chain in order and find the first broken link. Nine times out of ten it is one of four things: the bot ID you did not change, last_sync_at being newer than your message, the title property name, or a held tick lock.'));
push(p([new TextRun({ text: 'Evidence E5: ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'a screenshot of your Slack thread showing the request and the bot\'s reply, plus the auto-created Notion ticket.', size: 22, font: 'Calibri' })]));

// ---- PART E ----
push(h2('Part E — Land it, break it, lock it down'));
push(h3('Land it'));
push(check('From Slack, ask for a change that must end up as a pull request on your scratch repo.'));
push(check('Confirm the PR exists, and that the ticket\'s GitHub PR property points at it.'));
push(check('Reply in the same thread asking for one revision — you should get one session continuing, not a second ticket.'));
push(check('Merge it yourself. The agent proposes; you approve. That rule from video 06 still applies here.'));
push(h3('Break it on purpose'));
push(p('You met these four errors in videos 03, 05 and 07. Cause each one deliberately, write down the exact message, then fix it. An integration you cannot break on demand is one you cannot debug under pressure.'));
push(table(['Do this', 'Expect', 'Fix it by'],
  [['Remove the integration from Connections', 'object_not_found (404)', 're-adding it under Connections'],
   ['Remove the bot from your channel', 'not_in_channel', '/invite @your-bot'],
   ['Delete a scope without reinstalling', 'missing_scope', 'adding it back and reinstalling'],
   ['Kill a tick mid-run, start another', 'the second tick refuses — lock held', 'clearing the stale lock, or waiting 30 minutes']], [34, 26, 40]));
push(h3('Lock it down'));
push(check('Confirm .env is in .gitignore and that git status never shows it.'));
push(check('Scan your own fork for secrets before you push anything.'));
push(code('grep -rn "ntn_\\|xoxb-\\|xoxp-\\|xapp-\\|ghp_" .', 'Anything outside .env is a problem — whoever wrote it'));
push(check('Write one line each: which action your agent must never take without your approval, and where you would look to find out what it did.'));
push(check('Rotate anything you exposed today. Assume a key that touched a chat window is burned.'));
push(p([new TextRun({ text: 'Evidence E6: ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'the PR URL and the ticket showing the link.  ', size: 22, font: 'Calibri' }), new TextRun({ text: 'E7: ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'your four-row table of what you did, what the error said, what fixed it.  ', size: 22, font: 'Calibri' }), new TextRun({ text: 'E8: ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'your secret-scan output and the two one-line answers.', size: 22, font: 'Calibri' })]));

// ---- PART F ----
push(h2('Part F — Read the repo critically'));
push(p('This repo works, and it is also full of decisions you should not copy. That is normal — most real internal tooling looks like this.'));
push(check('Find three places where this repository contradicts something this module taught you. For each: what the repo does, which video says otherwise, what you would change.'));
push(check('At least one of your three must be about credentials.'));
push(check('Look at the Notion-Version header the repo sends, then at what video 04 said about database IDs and data sources. Write two sentences on what would break, and when.'));
push(p([new TextRun({ text: 'Evidence E9: ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'your three findings, in a short table.', size: 22, font: 'Calibri' })]));

// ---- HAND IN ----
push(h2('What you\'ll hand in'));
push(p('One Google Doc (link on the LMS, "anyone with the link → viewer"), named module-14-<yourname>. It contains:'));
push(num(1, 'The link to your fork of the harness, and to your scratch project repo.'));
push(num(2, 'Evidence E1 through E9, in order, each with a one-line caption saying what it proves.'));
push(num(3, 'A section titled "What broke and how I found it" — the real story, including the thing that cost you the most time.'));
push(num(4, 'Two sentences: what you would let this harness do on your real project, and what you would not.'));
push(note('Mask every token in every screenshot.', 'A submission containing a live credential is returned unmarked, and you rotate that credential the same day.'));

push(h2('How this is marked (100 points)'));
push(table(['Area', 'Points', 'What earns full marks'],
  [['Setup validated', '15', 'All six service validations pass (E2), .env untracked'],
   ['Notion board correct', '10', 'Five properties, title mismatch found and fixed, files named (E3)'],
   ['First tick clean', '10', 'Lock acquired and released, last_sync_at moved, queries shown (E4)'],
   ['Slack → Notion → agent', '25', 'The full chain evidenced (E5): event, ticket, session, workspace change, threaded reply'],
   ['Change lands in GitHub', '15', 'PR exists, linked on the ticket, revision reused the same context key (E6)'],
   ['Broke it and fixed it', '10', 'Four errors reproduced with exact messages and fixes (E7)'],
   ['Made it safe', '10', 'Secret scan run, approval rule and log location named (E8)'],
   ['Read it critically', '10', 'Three real contradictions, one about credentials, plus the API-version answer (E9)'],
   ['Deduction', '−100', 'A live credential visible anywhere in the submission']], [30, 12, 58]));
push(p([new TextRun({ text: 'Pass: 60.  Strong: 80+.  ', bold: true, size: 22, font: 'Calibri' }), new TextRun({ text: 'If you never get the full chain working, full marks are still reachable at 60 through Parts A, B, C, E and F — so do not fake E5.', size: 22, font: 'Calibri' })]));

push(h2('Troubleshooting'));
push(table(['Symptom', 'Most likely cause', 'Fix'],
  [['"Tick already running"', 'A previous tick died holding the lock', 'Inspect tick_lock; clear it or wait 30 minutes'],
   ['No events, ever', 'Your message is older than last_sync_at', 'Post a fresh message and wait one full tick'],
   ['No events, message is new', 'The poller still searches for the original bot ID', 'Change it to your bot\'s U… ID'],
   ['Slack search returns nothing', 'You are searching with the bot token', 'Search needs the user token with search:read'],
   ['Notion 404 on a visible database', 'Never shared with the integration', '"…" → Connections → add it. Check the parent page too'],
   ['Ticket created, nothing dispatches', 'Title property name mismatch', 'Make the poller and your database agree'],
   ['The agent edits the wrong files', 'You are in the harness repo, not the workspace', 'harness/workspace/ is the clone of your project'],
   ['Two tickets for one conversation', 'The context key was not reused', 'Reply in the thread, not as a new message']], [30, 32, 38]));

push(h2('If you want to go further'));
push(bullet('Set the loop interval deliberately and justify it. The repo polls every 180 seconds; more frequent polling costs more API calls and more money. What is right for a project nobody is watching at 3 a.m.?'));
push(bullet('Add a human approval step before the agent may merge anything, and prove it blocks.'));
push(bullet('Read the Gmail polling already in the repo and decide whether you would ship it.'));
push(bullet('Replace polling with an event subscription for one source, then write a paragraph on what you gained and what you now have to run.'));

push(new Paragraph({ spacing: { before: 280 }, border: { top: { color: 'CCCCCC', size: 4, style: BorderStyle.SINGLE, space: 6 } }, children: [new TextRun({ text: 'Companion to the assessment video (Connecting Your Agent to Notion and Slack, videos 01–08). Permission is not membership, and a key in your code is a key you have already lost.', italics: true, size: 18, color: GRAY, font: 'Calibri' })] }));

const doc = new Document({ creator: 'Drawing Room', title: 'Module 14 — Notion + Slack — Assessment',
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: kids }] });
const OUT = 'Notion and Slack - Module 14 Assessment (assignment).docx';
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log('wrote ' + OUT + ' (' + (buf.length / 1024).toFixed(0) + ' KB, ' + kids.length + ' blocks)'); });
