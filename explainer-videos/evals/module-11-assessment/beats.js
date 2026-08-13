'use strict';
/*
 * beats.js — "Module 11 Assessment" (evals). Claude Code IDE-screencast format (matches the
 * M07 assessment guide). Narrated; wrapped in Taleemabad bumpers. Covers the WHOLE module —
 * all seven evals videos — as FOUR labelled methods you type and Claude builds:
 *   1. Checks + baseline  (v1 check-more-than-one, v2 name-failures, v3 what-an-eval-is)
 *   2. End-to-end eval    (v4 e2e: walk the whole flow in a real browser, screenshot each step)
 *   3. Rubric + LLM-as-a-judge (v5 write-the-rubric, v6 llm-as-a-judge — and CHECK your judge)
 *   4. Compare two runs   (v7 baseline -> one change -> compare)
 * Every beat inside a method carries `screen.method` — assessment.html renders it as a persistent
 * labelled banner at the top so the viewer always knows which method they are watching.
 */

const T = {
  claude: { name: 'CLAUDE.md' }, server: { name: 'server.js' }, pub: { name: 'public/' },
  login: { name: 'login.html', indent: 1 }, env: { name: '.env' },
};
const BASE = [T.claude, T.server, T.pub, T.login, T.env];
const withFiles = (...extra) => BASE.concat(extra);

module.exports = [
  { id: '01', mode: 'card',
    vo: 'This is your module eleven assessment, and it pulls the whole evals series into one loop.',
    card: { small: 'Module 11 · Assessment', big: 'Give your project a number, a rubric, and proof that one change helped.' } },

  { id: '02', mode: 'ide',
    vo: 'Open your own Claude Code project — the one you have been building all along.',
    screen: { tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# My project', '', 'The app my users sign up on.'] }, chat: [] } },

  { id: '03', mode: 'ide',
    vo: 'You will use four methods; you type, and Claude does the work.',
    screen: { tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# My project', '', 'The app my users sign up on.'] },
      chat: [{ role: 'claude', text: 'Four methods — you type, I build:\n1. Ten checks + a score\n2. End-to-end eval (walk the journey)\n3. Rubric + LLM-as-a-judge\n4. Compare two runs' }] } },

  // ---- METHOD 1: Checks + baseline (v1, v2, v3) ----
  { id: '04', mode: 'ide',
    vo: 'Method one: ask for ten checks on the one flow your users cannot lose.',
    screen: { method: '1 · Checks + baseline', tree: BASE, active: 'server.js',
      editor: { name: 'server.js', lines: ['app.post("/signup", (req, res) => {', '  // the flow you can\'t lose', '})'] },
      chat: [{ role: 'you', text: 'Write ten checks for signing up — the one flow my users can\'t lose. Run them on the app as it is today, give me a score, and name every failure.' }] } },

  { id: '05', mode: 'ide',
    vo: 'You get a number, and every failure has a name.',
    screen: { method: '1 · Checks + baseline', tree: withFiles({ name: 'checks/', tag: 'new' }, { name: 'signup.checks.js', indent: 1, tag: 'new' }), active: 'signup.checks.js',
      editor: { name: 'checks/signup.checks.js', lines: ['check("normal signup")', 'check("number with a space")', 'check("used email")', 'check("short password")', '… + 6 more'] },
      chat: [{ role: 'claude', text: '5 / 10 passed. Failures:\n· number with a space\n· password refused, no reason\n· blank name\n· used email' }],
      terminal: ['$ node checks/signup.checks.js', '5 / 10 passed — 5 failed, named above'] } },

  { id: '06', mode: 'ide',
    vo: 'That number is your baseline; write it down before you touch anything.',
    screen: { method: '1 · Checks + baseline', tree: withFiles({ name: 'eval-results.md', tag: 'new' }), active: 'eval-results.md',
      editor: { name: 'eval-results.md', lines: ['# eval-results', '', 'Baseline: 5 / 10  (Tuesday)', '', 'Failing:', '- number with a space', '- password refused, no reason', '- blank name', '- used email'] }, chat: [] } },

  // ---- METHOD 2: End-to-end eval (v4) ----
  { id: '07', mode: 'ide',
    vo: 'Method two, the end-to-end eval: passing checks are not a working journey, so walk the whole thing like a stranger.',
    screen: { method: '2 · End-to-end eval', tree: withFiles({ name: 'eval-results.md' }), active: 'server.js',
      editor: { name: 'server.js', lines: ['// every step passes on its own', '// …but can a stranger get all the way in?'] },
      chat: [{ role: 'you', text: 'Walk the whole signup as a stranger: list every way it could fail, try each one in a real browser, and screenshot every step.' }] } },

  { id: '08', mode: 'ide',
    vo: 'Claude writes the edge cases, then a browser drives itself through each one.',
    screen: { method: '2 · End-to-end eval', tree: withFiles({ name: 'eval-results.md' }, { name: 'journeys/', tag: 'new' }, { name: 'signup.e2e.js', indent: 1, tag: 'new' }), active: 'signup.e2e.js',
      editor: { name: 'journeys/signup.e2e.js', lines: ['journey("wrong password")', 'journey("used email")', 'journey("blank form")', 'journey("code arrives late")', '… 12 journeys, each screenshotted'] },
      chat: [{ role: 'claude', text: 'Opening a real browser… typing each journey… capturing a screenshot at every step.' }],
      terminal: ['$ claude --browser run journeys/', 'browser opened · 12 journeys'] } },

  { id: '09', mode: 'ide',
    vo: 'Eleven journeys reach the end; one stops dead on a blank page between two passing steps.',
    screen: { method: '2 · End-to-end eval', tree: withFiles({ name: 'eval-results.md' }, { name: 'journeys/' }, { name: 'signup.e2e.js', indent: 1 }), active: 'signup.e2e.js',
      editor: { name: 'journeys/step-3.png', lines: ['[ screenshot: step 3 — a blank white page ]', '', 'the code email arrived 90s late,', 'and the page gave up waiting.'] },
      chat: [{ role: 'claude', text: '11 / 12 journeys finished. 1 stopped dead:\nstep 3 was blank — a timing gap no step-check could see.' }],
      terminal: ['11 / 12 reached the end', '1 stopped: step 3 blank (slow email)'] } },

  { id: '10', mode: 'ide',
    vo: 'Make the page wait longer, run it again, and all twelve get in.',
    screen: { method: '2 · End-to-end eval', tree: withFiles({ name: 'eval-results.md' }, { name: 'journeys/' }, { name: 'signup.e2e.js', indent: 1, tag: 'ok' }), active: 'signup.e2e.js',
      editor: { name: 'journeys/signup.e2e.js', lines: ['// one fix: wait longer for the code', '// re-run the whole journey'] },
      chat: [{ role: 'claude', text: '12 / 12 journeys pass — twelve green screenshots in a row.' }],
      terminal: ['$ claude --browser run journeys/', '12 / 12 journeys pass ✓'] } },

  // ---- METHOD 3: Rubric + LLM-as-a-judge (v5, v6) ----
  { id: '11', mode: 'ide',
    vo: 'Method three, part one: write five yes-or-no lines for what a good message looks like.',
    screen: { method: '3 · Write the rubric', tree: withFiles({ name: 'eval-results.md' }, { name: 'journeys/' }), active: 'server.js',
      editor: { name: 'server.js', lines: ['res.send("Invalid input.")  // true, polite, useless'] },
      chat: [{ role: 'you', text: 'Five lines for a good error message:\n1. says what went wrong\n2. says how to fix it\n3. no jargon\n4. doesn\'t blame the user\n5. under fifteen words' }] } },

  { id: '12', mode: 'ide',
    vo: 'Part two, the LLM as a judge: hand those five lines to a model and make it score every message with a reason.',
    screen: { method: '3 · LLM as a judge', tree: withFiles({ name: 'eval-results.md' }, { name: 'quality-rubric.md', tag: 'new' }), active: 'quality-rubric.md',
      editor: { name: 'quality-rubric.md', lines: ['# quality-rubric', '', '[ ] says what went wrong', '[ ] says how to fix it', '[ ] no jargon', '[ ] doesn\'t blame the user', '[ ] under fifteen words'] },
      chat: [{ role: 'you', text: 'Be my judge: score these ten messages against my five lines — yes or no, with one sentence explaining why — and show me the ones you were least sure about.' }] } },

  { id: '13', mode: 'ide',
    vo: 'Read the reasons, not just the score, because a judge will get some wrong.',
    screen: { method: '3 · LLM as a judge', tree: withFiles({ name: 'eval-results.md' }, { name: 'quality-rubric.md' }), active: 'quality-rubric.md',
      editor: { name: 'quality-rubric.md', lines: ['scored 10 messages against 5 lines', '', 'reasons attached to every verdict'] },
      chat: [{ role: 'claude', text: 'Done. Least sure: "verification code" — is that jargon or plain English?' }] } },

  { id: '14', mode: 'ide',
    vo: 'So always check your judge before you trust it: read twenty, and see where it is wrong.',
    screen: { method: '3 · LLM as a judge', tree: withFiles({ name: 'eval-results.md' }, { name: 'quality-rubric.md', tag: 'ok' }), active: 'quality-rubric.md',
      editor: { name: 'quality-rubric.md', lines: ['Checked the judge on 20:', 'agreed on 19, wrong on 1.', '', 'Now you know it is 95% right —', 'and you sharpened line 3.'] },
      chat: [{ role: 'claude', text: 'You checked 20 by hand: 19 / 20 agree. Now you can trust the other 186.' }] } },

  // ---- METHOD 4: Compare two runs (v7) ----
  { id: '15', mode: 'ide',
    vo: 'Method four, compare two runs: save the score, then make one change and nothing else.',
    screen: { method: '4 · Compare two runs', tree: withFiles({ name: 'eval-results.md' }, { name: 'quality-rubric.md' }), active: 'eval-results.md',
      editor: { name: 'eval-results.md', lines: ['Baseline: 5 / 10  (Tuesday)', '', 'Change: extend the wait for the code', '(one change — nothing else)'] },
      chat: [{ role: 'you', text: 'Save 5 out of 10 as the baseline. I\'ll make one change — extend the wait for the code — then run the same ten again.' }] } },

  { id: '16', mode: 'ide',
    vo: 'Run the same ten again, and compare the two numbers.',
    screen: { method: '4 · Compare two runs', tree: withFiles({ name: 'eval-results.md' }, { name: 'quality-rubric.md' }), active: 'eval-results.md',
      editor: { name: 'eval-results.md', lines: ['Baseline:  5 / 10', 'After one change:  8 / 10', '', '+3 — and you know which change did it'] },
      chat: [{ role: 'claude', text: 'Same 10 checks, re-run: 5 / 10 → 8 / 10' }],
      terminal: ['$ node checks/signup.checks.js', 'baseline 5 / 10  →  now 8 / 10'] } },

  { id: '17', mode: 'ide',
    vo: 'One change at a time, or you will never know which one worked.',
    screen: { method: '4 · Compare two runs', tree: withFiles({ name: 'eval-results.md' }, { name: 'quality-rubric.md' }), active: 'eval-results.md',
      editor: { name: 'eval-results.md', lines: ['Baseline:  5 / 10', 'After one change:  8 / 10', '', 'Still failing: 2 — tomorrow\'s job is written'] },
      chat: [{ role: 'claude', text: '⚠ Change four things at once and the number moves, but you learn nothing. One at a time.' }] } },

  // ---- submit + close ----
  { id: '18', mode: 'ide',
    vo: 'When your two numbers move in the right direction, your assessment is done.',
    screen: { tree: withFiles({ name: 'eval-results.md', tag: 'ok' }, { name: 'quality-rubric.md', tag: 'ok' }, { name: 'journeys/', tag: 'ok' }), active: 'eval-results.md',
      editor: { name: 'eval-results.md', lines: ['Baseline:  5 / 10', 'After one change:  8 / 10  ✓  (target: 8 / 10)'] }, chat: [] } },

  { id: '19', mode: 'ide',
    vo: 'Submit four things on the portal: your two numbers, your journey screenshots, your rubric, and your repository link.',
    screen: { tree: withFiles({ name: 'eval-results.md', tag: 'ok' }, { name: 'quality-rubric.md', tag: 'ok' }, { name: 'journeys/', tag: 'ok' }), active: 'eval-results.md',
      editor: { name: 'eval-results.md', lines: ['Baseline:  5 / 10', 'After one change:  8 / 10  ✓'] },
      chat: [{ role: 'claude', text: 'Submit on the LMS:\n1. eval-results.md — both numbers\n2. journeys/ — 12 green screenshots\n3. quality-rubric.md — 80%+ agreement\n4. your repo link' }] } },

  { id: '20', mode: 'card',
    vo: 'Checks, the whole journey, a judge you checked, and one change compared. You measure; Claude does the work.',
    card: { small: 'Module 11', big: 'Checks · Journey · Judge · Compare ✓', sub: 'You measure. Claude does the work.' } },
];

module.exports.title = 'Module 11 Assessment';
