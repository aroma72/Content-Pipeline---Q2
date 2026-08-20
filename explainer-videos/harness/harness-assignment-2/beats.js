'use strict';
/*
 * beats.js — "The Harness — Assignment 2" (build an effective harness on your own repo).
 * Claude Code IDE-screencast format (matches Assignment 1 / M11 assessment; assessment.html renderer).
 * Grounded in Taleemabad's Context Engineering Harness bootstrap (reference/HARNESS_BOOTSTRAP.md +
 * README.md): an effective harness = GUIDES (steer before) + SENSORS (catch after) + MEMORY (survives
 * resets) + a REPORT CARD (evals prove it). Narrated; wrapped in Taleemabad bumpers.
 * Interactive QUESTION -> REVEAL (card beats, holdAfter) per house rule. No character art (i2v N/A).
 */

const T = {
  claude:    { name: 'CLAUDE.md' },
  dotclaude: { name: '.claude/' },
  settings:  { name: 'settings.json', indent: 1 },
  hooks:     { name: 'hooks/', indent: 1 },
  skills:    { name: 'skills/', indent: 1 },
  agents:    { name: 'agents/', indent: 1 },
  evals:     { name: 'evals/', indent: 1 },
  beads:     { name: '.beads/' },
  status:    { name: 'status.jsonl', indent: 1 },
  decisions: { name: 'decisions.jsonl', indent: 1 },
  failures:  { name: 'failures.jsonl', indent: 1 },
  src:       { name: 'src/' },
  env:       { name: '.env' },
};
const BASE = [T.claude, T.dotclaude, T.src, T.env];
const withFiles = (...extra) => BASE.concat(extra);

module.exports = [
  { id: '01', mode: 'card',
    vo: 'This is your second assignment: build a harness that actually holds.',
    card: { small: 'The Harness · Assignment 2', big: 'Build a harness with two halves — one that steers, one that catches.' } },

  { id: '02', mode: 'ide',
    vo: 'Open your own Claude Code project — the repo you want to make reliable.',
    screen: { tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# My project', '', 'The repo I want to make reliable.'] }, chat: [] } },

  { id: '03', mode: 'ide',
    vo: 'An effective harness has four parts; you build each one on your repo.',
    screen: { tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# My project', '', 'The repo I want to make reliable.'] },
      chat: [{ role: 'claude', text: 'Four parts to build:\n1. Guides — steer before it acts\n2. Sensors — catch after it acts\n3. Memory — survives resets\n4. A report card — proves it works' }] } },

  // ---- METHOD 1: Guides (steer before) ----
  { id: '04', mode: 'ide',
    vo: 'Method one, guides: a short map it reads first, with the rules and where things live.',
    screen: { method: '1 · Guides (steer before)', tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# My project — routing only', '', '## Go to', '- Deploy → docs/deploy.md', '- Schema → docs/schema.md', '', '## Rules', '- Never commit .env', '- Every task gets a bead'] },
      chat: [{ role: 'you', text: 'Make my CLAUDE.md a short router: navigation and critical rules only, under 150 lines. Move detail to L2 and L3.' }] } },

  { id: '05', mode: 'ide',
    vo: 'Keep that map short, because every extra line buries the rule that mattered.',
    screen: { method: '1 · Guides (steer before)', tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['L1  CLAUDE.md   ≤150 lines   always', 'L2  folder routers   on demand', 'L3  docs & runbooks   when needed', '', 'context is depletable — load the few, not the all'] },
      chat: [{ role: 'claude', text: 'Progressive disclosure: L1 router (always) → L2 folder routers (on demand) → L3 docs (only when blocked).' }] } },

  { id: '06', mode: 'ide',
    vo: 'Then add named shortcuts and scoped helpers for the jobs you repeat.',
    screen: { method: '1 · Guides (steer before)', tree: withFiles({ name: 'skills/', indent: 1, tag: 'new' }, { name: 'agents/', indent: 1, tag: 'new' }), active: 'skills/',
      editor: { name: '.claude/skills/deploy/SKILL.md', lines: ['# /deploy', '', 'The steps to ship, in one shortcut.'] },
      chat: [{ role: 'you', text: 'Add a /deploy skill and a docs-updater agent for the things I do again and again.' }] } },

  // ---- METHOD 2: Sensors (catch after) ----
  { id: '07', mode: 'ide',
    vo: 'Method two, sensors: small checks that fire automatically after it acts.',
    screen: { method: '2 · Sensors (catch after)', tree: withFiles({ name: 'settings.json', indent: 1, tag: 'new' }, { name: 'hooks/', indent: 1, tag: 'new' }), active: 'settings.json',
      editor: { name: '.claude/settings.json', lines: ['"hooks": {', '  "PreToolUse": [block .env, block force-push],', '  "PostToolUse": [check CLAUDE.md ≤150],', '  "Stop": [remind: unclosed beads]', '}'] },
      chat: [{ role: 'you', text: 'Add hooks: block committing .env, block force-push to main, and check CLAUDE.md stays under 150 lines.' }] } },

  { id: '08', mode: 'ide',
    vo: 'A good check says nothing when all is well, and blocks loudly when it is not.',
    screen: { method: '2 · Sensors (catch after)', tree: withFiles({ name: 'settings.json', indent: 1 }, { name: 'hooks/', indent: 1, tag: 'ok' }), active: 'hooks/',
      editor: { name: '.claude/hooks/block-bad-commands.sh', lines: ['# exit 0 = allow (silent)', '# exit 2 = block (explain the fix)'] },
      chat: [{ role: 'claude', text: 'Blocked: committing .env — credentials must never be committed.' }],
      terminal: ['$ git commit .env', 'BLOCKED (exit 2): credentials must never be committed'] } },

  { id: '09', mode: 'ide',
    vo: 'Guides without sensors are a rulebook nobody enforces.',
    screen: { method: '2 · Sensors (catch after)', tree: withFiles({ name: 'settings.json', indent: 1 }, { name: 'hooks/', indent: 1, tag: 'ok' }), active: 'settings.json',
      editor: { name: '.claude/settings.json', lines: ['// rules only bite when something checks them', '// build BOTH halves'] },
      chat: [{ role: 'claude', text: '⚠ Rules only bite when a sensor checks them. Guides + sensors, always both.' }] } },

  // ---- METHOD 3: Memory that survives ----
  { id: '10', mode: 'ide',
    vo: 'Method three, memory: a logbook that survives when the context resets.',
    screen: { method: '3 · Memory that survives', tree: withFiles({ name: '.beads/', tag: 'new' }, { name: 'status.jsonl', indent: 1, tag: 'new' }, { name: 'decisions.jsonl', indent: 1, tag: 'new' }, { name: 'failures.jsonl', indent: 1, tag: 'new' }), active: 'status.jsonl',
      editor: { name: '.beads/status.jsonl', lines: ['{"id":"bd-001","title":"Bootstrap harness","status":"in_progress"}', '', 'append-only — open before work, close after'] },
      chat: [{ role: 'you', text: 'Set up beads: open one before each task, and log every decision and failure.' }] } },

  { id: '11', mode: 'ide',
    vo: 'The failures log is the most valuable file: every incident becomes a rule.',
    screen: { method: '3 · Memory that survives', tree: withFiles({ name: '.beads/' }, { name: 'failures.jsonl', indent: 1, tag: 'ok' }), active: 'failures.jsonl',
      editor: { name: '.beads/failures.jsonl', lines: ['incident: committed a secret by mistake', 'root cause: no pre-commit check', 'fix: added block-bad-commands hook', 'lesson: a failure becomes a new sensor'] },
      chat: [{ role: 'claude', text: 'Each failure: root cause, the fix, and the lesson that stops it happening again.' }] } },

  // ---- METHOD 4: The report card ----
  { id: '12', mode: 'ide',
    vo: 'Method four, the report card: prove the docs actually route Claude right.',
    screen: { method: '4 · The report card', tree: withFiles({ name: '.claude/', }, { name: 'evals/', indent: 1, tag: 'new' }), active: 'evals/',
      editor: { name: '.claude/evals/tasks/eval-001.yaml', lines: ['input: "Where are the DB credentials?"', 'expected:', '  route: docs/credentials.md', '  max_hops: 1', '  must_not_load: [changelog.md]'] },
      chat: [{ role: 'you', text: 'Add evals: can Claude reach the right doc in two hops, without loading the wrong ones?' }] } },

  { id: '13', mode: 'ide',
    vo: 'Aim for the right file in two hops, and a wrong-route rate under five percent.',
    screen: { method: '4 · The report card', tree: withFiles({ name: '.claude/' }, { name: 'evals/', indent: 1, tag: 'ok' }), active: 'eval-results.jsonl',
      editor: { name: '.claude/evals/baselines/run.jsonl', lines: ['avg_hops: 1.2', 'wrong_route: 0%', 'precision: 88%', 'cost_usd: 0.07'] },
      chat: [{ role: 'claude', text: '8 / 8 routed correctly in ≤2 hops. Wrong-route 0%.' }],
      terminal: ['$ node .claude/evals/run.js', '8/8 pass · avg 1.2 hops · $0.07'] } },

  // ---- QUESTION -> REVEAL ----
  { id: '14', mode: 'card', holdAfter: 6,
    vo: 'Quick question: great rules, but nothing checks them — what do you have? Write it down.',
    card: { small: 'Your turn — write it down', big: 'Great rules, but nothing checks them. What do you have?',
      sub: 'A) A complete harness     B) A rulebook no one enforces     C) A report card' } },

  { id: '15', mode: 'card',
    vo: 'The answer is B: without sensors, the rules never bite.',
    card: { small: 'The answer', big: 'B — a rulebook no one enforces.',
      sub: 'Guides need sensors, or the rules never bite.' } },

  // ---- submit + close ----
  { id: '16', mode: 'ide',
    vo: 'Submit five things: your short map, your hooks, your beads, your eval results, and your repo link.',
    screen: { tree: withFiles({ name: 'settings.json', indent: 1, tag: 'ok' }, { name: '.beads/', tag: 'ok' }, { name: 'evals/', indent: 1, tag: 'ok' }), active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# the harness you built', '', 'guides · sensors · memory · a report card'] },
      chat: [{ role: 'claude', text: 'Submit on the LMS:\n1. CLAUDE.md — your short router\n2. .claude/hooks/ + settings.json\n3. .beads/ — status, decisions, failures\n4. eval results — hops + wrong-route\n5. your repo link' }] } },

  { id: '17', mode: 'card',
    vo: 'Guides steer it, sensors catch it, memory keeps it, evals prove it — a harness that holds.',
    card: { small: 'The Harness', big: 'Guides · Sensors · Memory · Evals ✓', sub: 'Steer before. Catch after. Improve over time.' } },
];

module.exports.title = 'The Harness — Assignment 2';
