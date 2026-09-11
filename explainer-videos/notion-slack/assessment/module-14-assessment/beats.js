'use strict';
/*
 * beats.js — "Module 14 — Notion + Slack — Assessment" (companion video to the assignment docx).
 * Claude Code IDE-screencast format (matches harness Assignment 1/2, M11 evals assessment and the
 * self-healing assignment; assessment.html renderer). Content = the Ship From Slack assessment,
 * walked through on screen in the SAME six parts as the docx: A three keys · B your board ·
 * C one tick · D order it from Slack · E land it and lock it down · F read the repo critically.
 * Grounded in videos 01-08 of the module and in the real Orenda-Project/orchestration-harness-v2.
 * Narrated; wrapped in Taleemabad bumpers. Interactive QUESTION -> REVEAL (card beats, holdAfter)
 * per house rule. No character art, no Imagen, no i2v — TTS-only cost.
 *
 * Editor lines are capped at ~34 chars — the editor column wraps beyond that and the alignment breaks.
 * The renderer prefixes the banner with "Part", so `method` values start at the letter.
 *
 * Build:  LESSON_HTML=animation/assessment.html node compile-lesson.js
 */

const T = {
  setup:     { name: 'SETUP.md' },
  harness:   { name: 'harness/' },
  env:       { name: '.env', indent: 1 },
  skills:    { name: 'skills/', indent: 1 },
  pollslack: { name: 'poll-slack.md', indent: 1 },
  db:        { name: 'harness.db', indent: 1 },
  workspace: { name: 'workspace/', indent: 1 },
  gitignore: { name: '.gitignore' },
};
const BASE = [T.setup, T.harness, T.env, T.skills, T.gitignore];
const withFiles = (...extra) => [T.setup, T.harness, T.env, T.skills].concat(extra, [T.gitignore]);

module.exports = [
  { id: '01', mode: 'card',
    vo: 'This is your Module 14 assessment, and it ends with your project taking orders from Slack.',
    card: { small: 'Notion + Slack · Assessment', big: 'Ship from Slack — without opening your laptop.' } },

  { id: '02', mode: 'ide',
    vo: 'You will wire three things together around one small project you actually own.',
    screen: { tree: BASE, active: 'SETUP.md',
      editor: { name: 'SETUP.md', lines: ['Slack  — the front door', 'Notion — the work board', 'GitHub — where it lands', '', 'the harness — the loop between'] },
      chat: [] } },

  { id: '03', mode: 'ide',
    vo: 'Six parts, and you are done when a message you type becomes a pull request.',
    screen: { tree: BASE, active: 'SETUP.md',
      editor: { name: 'SETUP.md', lines: ['# Done means', '', 'I type in Slack.', 'A ticket appears.', 'An agent works.', 'A PR opens.', 'It replies in my thread.'] },
      chat: [{ role: 'claude', text: 'Six parts:\nA. Get the three keys\nB. Point it at your board\nC. Prove one tick\nD. Order it from Slack\nE. Land it and lock it down\nF. Read the repo critically' }] } },

  // ---- PART A: the three keys ----
  { id: '04', mode: 'ide',
    vo: 'Part A: every key goes in the environment file, never in the code.',
    screen: { method: 'A · Get the three keys', tree: BASE, active: '.env',
      editor: { name: 'harness/.env', lines: ['NOTION_API_KEY=••••', 'NOTION_DATABASE_ID=••••', 'SLACK_BOT_TOKEN=xoxb-••••', 'SLACK_USER_TOKEN=xoxp-••••', 'GITHUB_TOKEN=••••', 'GITHUB_REPO=me/scratch-repo'] },
      chat: [{ role: 'you', text: 'Set up my credentials from .env.example, and check that .env is already in .gitignore.' }] } },

  { id: '05', mode: 'ide',
    vo: 'One catch — Slack search needs a user token, because a bot token cannot search.',
    screen: { method: 'A · Get the three keys', tree: BASE, active: '.env',
      editor: { name: 'harness/.env', lines: ['xoxb-…  the bot speaks', 'xoxp-…  the user searches', '', 'user token scope:', '  search:read'] },
      chat: [{ role: 'claude', text: 'The poller uses search.messages. That endpoint rejects a bot token — add a user token with search:read, then reinstall.' }] } },

  { id: '06', mode: 'ide',
    vo: 'The setup wizard checks all six before it writes anything, so failures surface now.',
    screen: { method: 'A · Get the three keys', tree: BASE, active: '.env',
      editor: { name: 'validation', lines: ['notion  users/me        200 ✓', 'notion  databases/<id>  200 ✓', 'notion  users/<agent>   200 ✓', 'slack   auth.test        ok ✓', 'slack   conversations    ok ✓', 'github  repos/<repo>    200 ✓'] },
      chat: [{ role: 'claude', text: 'A 404 on the database means you never shared it under Connections. not_in_channel means you never invited the bot.' }] } },

  // ---- PART B: your board ----
  { id: '07', mode: 'ide',
    vo: 'Part B: your Notion board needs four properties the harness expects to find.',
    screen: { method: 'B · Point it at your board', tree: BASE, active: 'SETUP.md',
      editor: { name: 'notion properties', lines: ['Status            (built in)', 'Agent Session ID', 'Last Agent Update', 'GitHub PR', 'Slack Thread'] },
      chat: [{ role: 'you', text: 'Add the four custom properties to my database, then tell me what my title property is actually called.' }] } },

  { id: '08', mode: 'ide',
    vo: 'The repo disagrees with itself about your title column, and you must settle it.',
    screen: { method: 'B · Point it at your board', tree: withFiles(T.pollslack), active: 'poll-slack.md',
      editor: { name: 'harness/skills/poll-slack.md', lines: ['"Task name"    ← the poller', '"Deliverable"  ← tick.sh', '', 'your database says "Name"', '', 'pick one. make them agree.'] },
      chat: [{ role: 'claude', text: 'This is the job, not a bug to route around. Two systems have to agree about a name before anything runs.' }] } },

  // ---- PART C: one tick ----
  { id: '09', mode: 'ide',
    vo: 'Part C: run one tick and read the database yourself, before trusting anything.',
    screen: { method: 'C · Prove one tick', tree: withFiles(T.db), active: 'harness.db',
      editor: { name: 'sqlite3 harness/db/harness.db', lines: ['select * from sync_state;', '  global | 09:14:02Z', '', 'select * from tick_lock;', '  (empty)', '', 'select * from events;', '  (0 rows)'] },
      chat: [{ role: 'claude', text: 'Zero events on a fresh harness is a pass, not a failure. Nothing has happened since last_sync_at was set.' }] } },

  { id: '10', mode: 'ide',
    vo: 'Check the lock was released, or the next tick refuses for thirty minutes.',
    screen: { method: 'C · Prove one tick', tree: withFiles({ name: 'harness.db', indent: 1, tag: 'ok' }), active: 'harness.db',
      editor: { name: 'one tick', lines: ['1  lock acquired', '2  polled all sources', '3  dispatched 0', '4  last_sync_at moved', '5  lock released ✓'] },
      chat: [{ role: 'you', text: 'Did that tick release its lock? If I kill a tick halfway, show me how to clear the stale one.' }] } },

  // ---- PART D: order it from Slack ----
  { id: '11', mode: 'ide',
    vo: 'Part D, and this is the step that blocks almost everyone who skips it.',
    screen: { method: 'D · Order it from Slack', tree: withFiles(T.pollslack), active: 'poll-slack.md',
      editor: { name: 'harness/skills/poll-slack.md', lines: ['query=<@U0B7ZN35MQA>', '        ↑', '   someone else\'s bot,', '   in another workspace', '', 'put YOUR bot id here'] },
      chat: [{ role: 'claude', text: 'Until this is your own bot id, the search matches nothing and no event is ever queued.' }] } },

  { id: '12', mode: 'ide',
    vo: 'Now mention your bot in your test channel, and wait one full tick.',
    screen: { method: 'D · Order it from Slack', tree: withFiles(T.db, T.workspace), active: 'harness.db',
      editor: { name: 'the chain', lines: ['message   → event', 'event     → ticket', 'ticket    → session', 'session   → workspace/ edited', 'workspace → reply in thread'] },
      chat: [{ role: 'you', text: '@order-agent please add a CONTRIBUTING.md with a one-paragraph description of this project.' }] } },

  { id: '13', mode: 'ide',
    vo: 'Check the chain in order, and stop at the first link that did not happen.',
    screen: { method: 'D · Order it from Slack', tree: withFiles(T.db, { name: 'workspace/', indent: 1, tag: 'ok' }), active: 'workspace/',
      editor: { name: 'harness/workspace/', lines: ['this is YOUR project,', 'cloned locally.', '', 'not the harness repo.', '', 'the agent edits here.'] },
      chat: [{ role: 'claude', text: 'If nothing arrived: is the loop running, is your message newer than last_sync_at, did you change the bot id, are you searching with the user token?' }] } },

  // ---- PART E: land it and lock it down ----
  { id: '14', mode: 'ide',
    vo: 'Part E: the agent opens the pull request, and you are the one who merges it.',
    screen: { method: 'E · Land it and lock it down', tree: withFiles(T.db, { name: 'workspace/', indent: 1, tag: 'ok' }), active: 'workspace/',
      editor: { name: 'pull request', lines: ['#1  add CONTRIBUTING.md', '    opened by order-agent', '', 'ticket → GitHub PR ✓', '', 'merged by: you'] },
      chat: [{ role: 'claude', text: 'It proposes, you approve, then it happens. Reply in the same thread for a revision and the same ticket is reused.' }] } },

  { id: '15', mode: 'ide',
    vo: 'Then break it four ways on purpose, because an error you have never seen is one you cannot fix.',
    screen: { method: 'E · Land it and lock it down', tree: BASE, active: 'SETUP.md',
      editor: { name: 'break it on purpose', lines: ['remove the Connection', '   → object_not_found', 'remove the bot', '   → not_in_channel', 'drop a scope', '   → missing_scope', 'kill a tick mid-run', '   → lock still held'] },
      chat: [{ role: 'you', text: 'Walk me through causing each of these deliberately, then fixing it, and write down the exact message each time.' }] } },

  { id: '16', mode: 'ide',
    vo: 'Scan your own fork for keys, and rotate anything you exposed today.',
    screen: { method: 'E · Land it and lock it down', tree: withFiles({ name: '.gitignore', tag: 'ok' }), active: '.gitignore',
      editor: { name: 'scan before you push', lines: ['grep -rn "ntn_|xoxb-|ghp_" .', '', 'anything outside .env', 'is a problem — whoever', 'wrote it. then rotate it.'] },
      chat: [{ role: 'claude', text: 'This repo has keys committed inside a tracked script. .gitignore covered .env; the practice went around it. Do not copy any key you find.' }] } },

  // ---- PART F: read the repo critically ----
  { id: '17', mode: 'ide',
    vo: 'Part F: judge the repo you just ran, and find three things it gets wrong.',
    screen: { method: 'F · Read the repo critically', tree: BASE, active: 'SETUP.md',
      editor: { name: 'three contradictions', lines: ['keys in a tracked script', 'one person hardcoded in', 'an API version from 2022', '', 'one must be about keys'] },
      chat: [{ role: 'claude', text: 'For each one: what the repo does, which video says otherwise, and what you would change. Most real internal tooling looks like this.' }] } },

  // ---- CHECKPOINT (LMS popup — nothing rendered, the player pauses here) ----
  // Sits between beat 17 and beat 20, so the pause lands on a whole-sentence
  // boundary. Never voiced, never drawn: the question exists only in the popup.
  { id: '18', mode: 'checkpoint',
    quiz: {
      stem: 'You mention the bot in your test channel, wait three minutes, and nothing happens. What is it most likely to be?',
      options: [
        'Slack is down',
        'The poller is still searching for someone else\'s bot id',
        'You need a paid Notion plan',
        'The agent finished but did not reply',
      ],
      answer: 1,
      explain: 'The poller ships with a bot id from the workspace it was written in, so search.messages matches nothing and no event is ever queued. Slack being down would fail loudly, and none of this needs a paid Notion plan. Read the code you cloned before you blame your setup.',
    } },

  // ---- submit + close ----
  { id: '20', mode: 'ide',
    vo: 'Hand in nine pieces of evidence, and the honest story of what broke.',
    screen: { tree: withFiles({ name: 'harness.db', indent: 1, tag: 'ok' }, { name: 'workspace/', indent: 1, tag: 'ok' }), active: 'SETUP.md',
      editor: { name: 'submit', lines: ['E1 scopes      E4 first tick', 'E2 validation  E5 the chain', 'E3 board       E6 the PR', 'E7 four errors E8 secret scan', 'E9 three findings'] },
      chat: [{ role: 'claude', text: 'Plus "What broke and how I found it". A clean run with no story scores lower than a hard one told honestly.\nMask every token in every screenshot.' }] } },

  { id: '21', mode: 'card',
    vo: 'Permission, then membership, then let it run — and keep the key where it belongs.',
    card: { small: 'Notion + Slack · Assessment', big: 'Ship from Slack ✓', sub: 'Permission, then membership. The agent proposes; you approve.' } },
];

module.exports.title = 'Module 14 — Notion + Slack — Assessment';
