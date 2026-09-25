#!/usr/bin/env node
'use strict';
// Stage the project skills into the eval plugin root.
//
// `claude plugin eval` only loads skills from <plugin root>/skills/. This repo's
// skills live in .claude/skills/, and the repo root's own skills/ directory is
// already taken by the Python API wrappers - so the eval plugin gets its own
// root, and this script copies the skills into it.
//
// The copy is GENERATED and gitignored, and it is wiped and rebuilt on every
// run. That matters: a stale copy would quietly evaluate skills that no longer
// match the ones in .claude/skills, which is the copy-paste fan-out failure this
// repo has hit three times. Never edit evals/agent-plugin/skills by hand.

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const SRC = path.join(REPO, '.claude', 'skills');
const DEST = path.join(REPO, 'evals', 'agent-plugin', 'skills');

if (!fs.existsSync(SRC)) {
  console.error('FATAL: no .claude/skills to stage from — ' + SRC);
  process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.cpSync(SRC, DEST, { recursive: true });

const staged = fs.readdirSync(DEST, { withFileTypes: true })
  .filter(e => e.isDirectory() && fs.existsSync(path.join(DEST, e.name, 'SKILL.md')))
  .map(e => e.name);

// Fail loudly. A plugin that loads with zero skills still runs, still spends,
// and reports "Skill called 0x" on every case — a red build wearing green.
if (staged.length === 0) {
  console.error('FATAL: staged 0 skills. The eval would spend money measuring nothing.');
  process.exit(1);
}

console.log('staged ' + staged.length + ' skills into evals/agent-plugin/skills/');
console.log('  ' + staged.join(', '));
