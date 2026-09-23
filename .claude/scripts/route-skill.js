#!/usr/bin/env node
'use strict';
// Suggest a skill for the prompt just submitted. Prints at most ONE short line,
// or nothing at all.
//
// This runs on EVERY turn, so it is deliberately shy: it stays silent unless one
// skill both scores well and is clearly ahead of the runner-up. A routing hint
// that fires constantly is one the reader learns to skip, which is worse than
// no hint.
//
// Usage: node .claude/scripts/route-skill.js "<prompt text>"
//        echo "<prompt text>" | node .claude/scripts/route-skill.js

const fs = require('fs');
const path = require('path');

const MIN_SCORE = 0.55;   // the winner must actually match
const MIN_MARGIN = 0.12;  // and must be clearly ahead of the next one

let lib;
try {
  lib = require(path.resolve(__dirname, '..', '..', 'evals', 'skills', 'lib.js'));
} catch (e) {
  process.exit(0);        // harness plumbing missing is not the user's problem
}

function readPrompt() {
  const arg = process.argv.slice(2).join(' ').trim();
  if (arg) return arg;
  try { return fs.readFileSync(0, 'utf8').trim(); } catch (e) { return ''; }
}

const prompt = readPrompt();
// A long prompt is a briefing, not a request that needs routing.
if (!prompt || prompt.length < 8 || prompt.length > 600) process.exit(0);

let skills;
try {
  skills = lib.skillDirs().map(s => {
    const fm = lib.parseFrontmatter(fs.readFileSync(s.file, 'utf8'));
    return { name: s.name, description: (fm.fields && fm.fields.description) || '' };
  }).filter(s => s.description);
} catch (e) {
  process.exit(0);
}
if (!skills.length) process.exit(0);

const ranked = lib.rankSkills(prompt, skills);
const top = ranked[0];
const next = ranked[1] || { score: 0 };

if (top.score >= MIN_SCORE && top.score - next.score >= MIN_MARGIN) {
  console.log('SKILL ROUTING: "' + top.name + '" looks relevant to this request. '
    + 'Check it before answering; ignore it if it does not fit.');
}
process.exit(0);
