'use strict';
/*
 * make-assignment-doc-v2.js — "Module 14 - Assignment (Connect Your Own Project).docx"
 *
 * Companion to the assignment guide video. Replaces the earlier "Ship From Slack" assignment, which
 * was built around the orchestration-harness repo. Aroma chose (2026-09-17) the version that mirrors
 * the seven videos: the learner connects THEIR OWN project, doing exactly what videos 3-6 taught.
 *
 * Same Word styling as the harness / self-healing / evals assignments: blue headers, teal sub-heads,
 * monospace command blocks, amber call-outs, tick boxes.
 *
 *   node make-assignment-doc-v2.js
 */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType,
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
const code = (lines) => lines.map((l, i) => new Paragraph({
  spacing: { before: i === 0 ? 100 : 0, after: i === lines.length - 1 ? 120 : 0 },
  shading: { type: ShadingType.SOLID, color: CODEBG, fill: CODEBG },
  children: [new TextRun({ text: '  ' + l, font: MONO, size: 19 })] }));
const cell = (t, o = {}) => new TableCell({
  width: { size: o.w || 33, type: WidthType.PERCENTAGE },
  shading: o.head ? { type: ShadingType.SOLID, color: 'EAF1F7', fill: 'EAF1F7' } : undefined,
  children: [new Paragraph({ spacing: gap(40), children: [new TextRun({ text: t, size: 20, bold: !!o.head, font: 'Calibri' })] })] });
const table = (rows, widths) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: rows.map((r, i) => new TableRow({ children: r.map((c, j) => cell(c, { head: i === 0, w: widths[j] })) })) });

const doc = new Document({ sections: [{ children: [
  ...h1('Module 14 — Assignment', 'Connect your own project: Notion, Slack, GitHub and your deployment'),

  p('You have watched seven videos. This assignment is the same work, done on a project of your own. '
    + 'By the end, a message you type in Slack becomes a card in Notion, a pull request on GitHub, and a '
    + 'reply back in your channel — with nothing running on your laptop.'),

  note('The test of done', 'From your phone, in Slack, you ask for a change. Within about a minute a Notion '
    + 'card exists, a pull request is open, and the agent has replied in your thread. You never opened an editor.'),

  h2('Before you start'),
  p('Tick all six before Part 1. Missing one of these is the usual reason this takes a whole evening instead of two hours.'),
  check('You can create a Notion integration, and you have a page you are willing to share with it.'),
  check('You can install a Slack app in your workspace — or you have asked an admin and they have said yes. Ask today, not on the day you start.'),
  check('You have a small GitHub repository of your own that you are willing to let an agent change. A scratch repo with a README is ideal. Not your dissertation.'),
  check('You already have a project deployed somewhere — Railway, Render, Vercel, Fly. Any of them. You are not setting up a new host.'),
  check('You have created a test Slack channel. Not #general.'),
  check('Your project has a .env file, and .env is already listed in .gitignore.'),

  note('Tip — let /mcp do the wiring', 'You do not have to hand-write every API call. In Claude Code, run '
    + '/mcp and connect Slack and Notion as MCP servers; your agent can then read and write both through '
    + 'that connection. The credentials underneath are the same ones you are about to make, and the same '
    + 'two gotchas still bite: the integration must be added under Connections, and the bot must be invited '
    + 'to the channel. What /mcp saves you is the plumbing, not the permissions.'),

  h2('Part 1 — Notion, the task board'),
  p('Video 3. The agent needs somewhere to track its own work that survives the session ending.'),
  check('Create an integration at notion.so/my-integrations and copy the Internal Integration Secret.'),
  check('Build a database with four columns: Name (title), Status (select), Priority (select), Notes (rich text).'),
  check('Status options: To Do, In Progress, Done, Blocked. Priority: Low, Medium, High.'),
  check('Open the board → ··· → Connections → add your integration by name.'),
  check('Copy the database ID from the URL — the 32 characters BEFORE the question mark.'),
  note('The step everyone misses', 'Creating the integration grants it nothing. Until you add it under '
    + 'Connections, every call returns 404 object_not_found — on a database you can see perfectly well in your browser.'),
  h3('Evidence A'), p('A screenshot of the Connections panel showing your integration listed, and a screenshot of your board with its four columns.'),

  h2('Part 2 — Slack, outbound'),
  p('Video 4, first half. Let the agent speak.'),
  check('Create an app at api.slack.com/apps → From scratch.'),
  check('OAuth & Permissions → Bot Token Scopes → add chat:write, app_mentions:read, channels:history.'),
  check('Install to Workspace, and copy the Bot User OAuth Token (it starts xoxb-).'),
  check('In Slack itself, in your test channel, run /invite @your-bot.'),
  check('Copy the Channel ID from the bottom of the channel details panel.'),
  note('The same rule again', 'A token is permission, not presence. Without the /invite, posting fails '
    + 'with not_in_channel — which is Slack telling you it found the channel fine and your bot simply is not in it.'),
  h3('Evidence B'), p('A screenshot of your Bot Token Scopes (token value NOT visible) and the "added to the channel" line in Slack.'),

  h2('Part 3 — Slack, inbound'),
  p('Video 4, second half. This is what makes it two-way — and it needs Part 5 before it can be finished.'),
  check('Event Subscriptions → toggle on. Leave the Request URL empty for now.'),
  check('Subscribe to bot events: app_mention and message.channels.'),
  check('Basic Information → copy the Signing Secret.'),
  check('Make sure your server echoes the one-time challenge, or the URL will never verify.'),
  ...code([
    'if payload["type"] == "url_verification":',
    '    return {"challenge": payload["challenge"]}' ]),
  h3('Evidence C'), p('The three-line challenge handler from your own code, and your signature-check function.'),

  h2('Part 4 — GitHub, two jobs'),
  p('Video 5. A token so it can commit, and a webhook so it can be woken.'),
  check('Settings → Developer settings → Fine-grained personal access token.'),
  check('Scope it to ONE repository. Grant Contents: Read and write. Nothing else.'),
  check('Repo → Settings → Webhooks → Add webhook. Content type application/json.'),
  check('Set a webhook secret, and set the SAME string as GITHUB_WEBHOOK_SECRET on your host.'),
  note('Why fine-grained', 'One repo means a leaked token costs you one repo. A classic token scoped to '
    + 'everything means a leak costs you everything.'),
  h3('Evidence D'), p('A screenshot of the token permissions page showing Contents: Read and write, scoped to one repository.'),

  h2('Part 5 — Your deployment'),
  p('Video 6. Three things on the host you already have. Only one is code.'),
  check('Paste all seven values into your host\'s variables page: NOTION_API_KEY, NOTION_GOALS_DB_ID, SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_CHANNEL_ID, GITHUB_TOKEN, GITHUB_WEBHOOK_SECRET.'),
  check('Copy your app\'s public URL and paste it into Slack\'s Request URL — go back to the tab from Part 3. Watch it verify.'),
  check('Paste the same address plus /webhooks/github into GitHub\'s payload URL.'),
  check('Add the check-in loop.'),
  ...code([
    '# Python',
    'scheduler.add_job(run_session, "interval", seconds=60)',
    '',
    '// Node',
    'cron.schedule("* * * * *", runSession)' ]),
  check('Open your logs, send a test message in Slack, and watch it arrive within a second or two.'),
  note('If nothing appears', 'Nothing is listening. Either the URL is wrong, or the app is asleep — some '
    + 'free tiers spin down when idle, so the first message after a quiet period is delayed.'),
  h3('Evidence E'), p('A screenshot of Slack showing Request URL = Verified, and a log line showing a test message arriving.'),

  h2('Part 6 — Prove the loop'),
  p('The whole point. One request, all the way round, without opening an editor.'),
  check('From Slack, ask for a small real change to your scratch repo.'),
  check('Confirm a Notion card appears, and that its status moves as the work proceeds.'),
  check('Confirm a pull request opens on GitHub.'),
  check('Confirm the agent replies in your Slack thread with the result.'),
  check('Merge the pull request yourself. The agent proposes; you decide.'),
  h3('Evidence F'), p('Your Slack thread showing the request and the reply, the Notion card, and the pull request URL.'),

  h2('Part 7 — Break it on purpose'),
  p('Video 7. Cause each of the four deliberately, write down the exact error, and fix it. An integration '
    + 'you cannot break on demand is one you cannot debug under pressure.'),
  table([
    ['Do this', 'Expect', 'Fix it by'],
    ['Remove your integration from the board\'s Connections', '404 object_not_found', 'Re-adding it under Connections'],
    ['Point the Slack Request URL at localhost', 'Verification fails', 'Using your real public address'],
    ['Change the webhook secret on the host only', '403 on every delivery', 'Making both strings match exactly'],
    ['Search your repo for token prefixes', 'Ideally nothing', 'Rotating anything you find, then .gitignore'],
  ], [34, 30, 36]),
  h3('Evidence G'), p('A four-row table in your own words: what you did, what the error said, what fixed it.'),

  h2('What to hand in'),
  p('One document named module-14-<yourname>, containing:'),
  bullet('Links to your scratch repo and your deployed app.'),
  bullet('Evidence A through G, in order, each with a one-line caption saying what it proves.'),
  bullet('A short section titled "What broke and how I found it" — the real story, including the thing that cost you the most time. This is marked, and honesty scores higher than a clean run.'),
  bullet('Two sentences: what you would let this agent do on a real project, and what you would not.'),
  note('Zero tolerance', 'Mask every token in every screenshot. A submission containing a live credential '
    + 'is returned unmarked, and you should rotate that credential the same day.'),

  h2('How this is marked (100 points)'),
  table([
    ['Area', 'Points', 'Full marks means'],
    ['Notion board + Connections', '12', 'Four columns with their options; integration listed under Connections (A)'],
    ['Slack outbound', '12', 'Three scopes, installed, invited, channel ID (B)'],
    ['Slack inbound', '14', 'Events subscribed, challenge handled, signature verified (C)'],
    ['GitHub two jobs', '14', 'Fine-grained token on one repo + webhook with a matching secret (D)'],
    ['Deployment', '14', 'Seven variables set, URL verified, check-in loop running, logs shown (E)'],
    ['The loop proven', '24', 'Slack → Notion → PR → Slack, evidenced end to end (F)'],
    ['Broke it and fixed it', '10', 'All four reproduced with exact errors and fixes (G)'],
    ['Deduction', '−100', 'A live credential visible anywhere in the submission'],
  ], [34, 12, 54]),
  p('Pass: 60. Strong: 80+.', { after: 60 }),
  note('If the loop never fully works', 'Parts 1–5 and 7 are still worth 76 points. Submit what you built '
    + 'and what you diagnosed. A careful debugging narrative from someone who did not finish beats a bare claim that it worked.'),

  h2('Troubleshooting'),
  table([
    ['Symptom', 'Almost always'],
    ['404 object_not_found on a database you can see', 'Not shared under Connections'],
    ['not_in_channel when posting', 'The bot was never /invited'],
    ['missing_scope', 'A scope was added but the app was not reinstalled'],
    ['Slack will not verify the Request URL', 'localhost, or the app is not running'],
    ['403 on every webhook delivery', 'The secret differs between GitHub and the host'],
    ['Everything worked, then the token died overnight', 'It was committed; rotate it and check .gitignore'],
  ], [46, 54]),
] }] });

Packer.toBuffer(doc).then((buf) => {
  const out = 'Module 14 - Assignment (Connect Your Own Project).docx';
  fs.writeFileSync(out, buf);
  console.log('  ✓', out, `(${(buf.length / 1024).toFixed(0)} KB)`);
});
