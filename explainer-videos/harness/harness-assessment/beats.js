'use strict';
/*
 * beats.js — "The Harness — Assessment" (harness series capstone). Claude Code IDE-screencast
 * format (matches the M11 evals assessment guide). Narrated; wrapped in Taleemabad bumpers.
 * Pulls the WHOLE harness series into ONE applied loop on the learner's OWN project, as FOUR
 * labelled methods they set up and Claude runs inside:
 *   1. Name the three parts   (V2: brain=model, window=Claude Code, room=harness)
 *   2. Build the room         (V1/V4/V5: memory in CLAUDE.md + tools + one real job)
 *   3. Guardrails + see        (V6: settings.json allow/ask/deny + read the action log)
 *   4. Prove the harness       (V3 + evals: same model, change ONE harness thing, measure)
 * Every method beat carries `screen.method` — assessment.html renders it as a persistent banner.
 * No Imagen art in this format (card + ide screens only) — TTS-only cost.
 */

const T = {
  claude:   { name: 'CLAUDE.md' },
  dotclaude:{ name: '.claude/' },
  settings: { name: 'settings.json', indent: 1 },
  src:      { name: 'src/' },
  app:      { name: 'app.js', indent: 1 },
  env:      { name: '.env' },
};
const BASE = [T.claude, T.dotclaude, T.settings, T.src, T.app, T.env];
const withFiles = (...extra) => BASE.concat(extra);

module.exports = [
  { id: '01', mode: 'card',
    vo: 'This is your harness assessment, and it turns the whole series into one thing you can build.',
    card: { small: 'The Harness · Assessment', big: 'Build your own harness — then prove the room, not the model, did the work.' } },

  { id: '02', mode: 'ide',
    vo: 'Open your own Claude Code project — the one you actually work in every day.',
    screen: { tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# My project', '', 'The app I am building.'] }, chat: [] } },

  { id: '03', mode: 'ide',
    vo: 'You will use four methods; you set them up, and Claude works inside them.',
    screen: { tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# My project', '', 'The app I am building.'] },
      chat: [{ role: 'claude', text: 'Four methods — you build the room, and I work inside it:\n1. Name your three parts\n2. Build the room\n3. Guardrails + see everything\n4. Prove the harness, not the model' }] } },

  // ---- METHOD 1: Name the three parts (V2) ----
  { id: '04', mode: 'ide',
    vo: 'Method one: name your three parts — the brain, the window, and the room.',
    screen: { method: '1 · Name the three parts', tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# My project', '', '# brain  = the model', '# window = Claude Code', '# room   = everything below'] },
      chat: [{ role: 'you', text: 'In my project, name the three parts: which is the model, which is Claude Code, and which is the harness?' }] } },

  { id: '05', mode: 'ide',
    vo: 'The brain is the model, the window is Claude Code, and the room is everything you configure around it.',
    screen: { method: '1 · Name the three parts', tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['brain  = the model that thinks', 'window = Claude Code, your way in', 'room   = CLAUDE.md + settings + tools', '', 'the room is the harness — you own it'] },
      chat: [{ role: 'claude', text: 'Brain = the model.\nWindow = Claude Code, how you reach it.\nRoom = CLAUDE.md, settings, tools, rules — the harness you control.' }] } },

  // ---- METHOD 2: Build the room (V1, V4, V5) ----
  { id: '06', mode: 'ide',
    vo: 'Method two: build the room, starting with a memory file that the helper re-reads on every run.',
    screen: { method: '2 · Build the room', tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# My project', '', '## How we work', '- Tests live in tests/', '- Never touch .env', '- Ask before pushing'] },
      chat: [{ role: 'you', text: 'Write a CLAUDE.md with what my project is, my rules, and where things live — so you remember it every run.' }] } },

  { id: '07', mode: 'ide',
    vo: 'Then list the tools it may actually use, and give it one real job to do.',
    screen: { method: '2 · Build the room', tree: withFiles(), active: 'settings.json',
      editor: { name: '.claude/settings.json', lines: ['{', '  "permissions": {', '    "allow": ["Read", "Edit", "Bash(npm test)"]', '  }', '}'] },
      chat: [{ role: 'you', text: 'Here are the tools you may use: read files, edit files, run the tests. Now fix the failing test.' }] } },

  { id: '08', mode: 'ide',
    vo: 'Now talk becomes done work: it reads the code, makes the change, and runs the tests itself.',
    screen: { method: '2 · Build the room', tree: withFiles({ name: 'tests/', tag: 'ok' }), active: 'app.js',
      editor: { name: 'src/app.js', lines: ['// read → edit → verified', '// the room let the brain act'] },
      chat: [{ role: 'claude', text: 'Read src/app.js, made the fix, ran the tests.' }],
      terminal: ['$ npm test', '12 passing — the room let it act'] } },

  // ---- METHOD 3: Guardrails + see everything (V6) ----
  { id: '09', mode: 'ide',
    vo: 'Method three: set the guardrails — decide what it may do alone, and what needs your yes.',
    screen: { method: '3 · Guardrails + see', tree: withFiles(), active: 'settings.json',
      editor: { name: '.claude/settings.json', lines: ['"permissions": {', '  "allow": ["Read", "Edit", "Bash(npm test)"],', '  "ask":   ["Bash(git push)"],', '  "deny":  ["Bash(rm -rf *)"]', '}'] },
      chat: [{ role: 'you', text: 'Let me approve anything that pushes or deletes: the safe things you can do alone.' }] } },

  { id: '10', mode: 'ide',
    vo: 'Then find where every action is written down, so nothing your helper does happens in the dark.',
    screen: { method: '3 · Guardrails + see', tree: withFiles({ name: 'session.log', tag: 'new' }), active: 'session.log',
      editor: { name: 'session.log', lines: ['12:01  Read  src/app.js', '12:01  Edit  src/app.js', '12:02  Bash  npm test → 12 passing', '12:03  ask?  git push  → you approved'] },
      chat: [{ role: 'claude', text: 'Every step is logged: what I read, edited, ran, and what I paused to ask. You can replay all of it.' }] } },

  // ---- METHOD 4: Prove the harness, not the model (V3 + evals) ----
  { id: '11', mode: 'ide',
    vo: 'Method four: prove the harness matters — keep the very same brain, and change one thing in the room.',
    screen: { method: '4 · Prove the harness', tree: withFiles({ name: 'eval-results.md', tag: 'new' }), active: 'eval-results.md',
      editor: { name: 'eval-results.md', lines: ['Baseline: 6 / 10   (same model)', '', 'Change: sharpen CLAUDE.md + add a test tool', '(one change — same brain)'] },
      chat: [{ role: 'you', text: 'Keep the same model. I will improve only the harness — then we re-run the same ten checks.' }] } },

  { id: '12', mode: 'ide',
    vo: 'Run the same small eval before and after, and watch the number move.',
    screen: { method: '4 · Prove the harness', tree: withFiles({ name: 'eval-results.md' }), active: 'eval-results.md',
      editor: { name: 'eval-results.md', lines: ['Baseline:            6 / 10', 'After harness change: 9 / 10', '', '+3 — same model, better room'] },
      chat: [{ role: 'claude', text: 'Same 10 checks, re-run: 6 / 10 → 9 / 10.' }],
      terminal: ['$ node checks/run.js', 'baseline 6 / 10  →  now 9 / 10'] } },

  { id: '13', mode: 'ide',
    vo: 'Same brain, better room, better result — that is the whole point of a harness.',
    screen: { method: '4 · Prove the harness', tree: withFiles({ name: 'eval-results.md', tag: 'ok' }), active: 'eval-results.md',
      editor: { name: 'eval-results.md', lines: ['Baseline:            6 / 10', 'After harness change: 9 / 10  ✓', '', 'The model never changed.'] },
      chat: [{ role: 'claude', text: '⚠ I never swapped the model. Every point came from the harness you built.' }] } },

  { id: '17', mode: 'card', holdAfter: 6,
    vo: 'Quick question: same model, six to nine — what made the score jump? Write it down.',
    card: { small: 'Your turn — write it down', big: 'Same model, 6 → 9. What made the jump?',
      sub: 'A) A smarter model     B) The harness (the room)     C) Luck' } },

  { id: '18', mode: 'card',
    vo: 'The answer is B, the harness — same model, a better room.',
    card: { small: 'The answer', big: 'B — the harness did it.',
      sub: 'Same model, a better room. That is the whole point.' } },

  // ---- submit + close ----
  { id: '14', mode: 'ide',
    vo: 'When your number moves on the same model, your harness is doing real work.',
    screen: { tree: withFiles({ name: 'eval-results.md', tag: 'ok' }, { name: 'session.log', tag: 'ok' }), active: 'eval-results.md',
      editor: { name: 'eval-results.md', lines: ['Baseline:            6 / 10', 'After harness change: 9 / 10  ✓  (same model)'] }, chat: [] } },

  { id: '15', mode: 'ide',
    vo: 'Submit four things on the portal: your memory file, your settings, your before-and-after number, and your repository link.',
    screen: { tree: withFiles({ name: 'eval-results.md', tag: 'ok' }, { name: 'session.log', tag: 'ok' }), active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# the room you built', '', 'memory · tools · guardrails · a number'] },
      chat: [{ role: 'claude', text: 'Submit on the LMS:\n1. CLAUDE.md — your room\n2. .claude/settings.json — tools + guardrails\n3. eval-results.md — 6 / 10 → 9 / 10\n4. your repo link' }] } },

  { id: '16', mode: 'card',
    vo: 'Name the parts, build the room, set the guardrails, and prove it. You build the harness; the model just thinks.',
    card: { small: 'The Harness', big: 'Name · Build · Guard · Prove ✓', sub: 'You build the harness. The model just thinks.' } },
];

module.exports.title = 'The Harness Assessment';
