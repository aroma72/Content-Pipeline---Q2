#!/usr/bin/env node
'use strict';
// Validate ONE SKILL.md against the frontmatter contract. Used by the
// PostToolUse hook so a broken skill is reported the moment it is written,
// rather than at push time. Advisory by design: it reports, it never blocks.
//
// Usage: node evals/skills/check-one.js <path-to-SKILL.md>

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./lib');

const file = process.argv[2];
if (!file || !fs.existsSync(file)) process.exit(0);

const dirName = path.basename(path.dirname(path.resolve(file)));
const fm = parseFrontmatter(fs.readFileSync(file, 'utf8'));
const problems = [];

if (!fm.ok) {
  problems.push(fm.reason + ' - without frontmatter this skill can never be invoked');
} else {
  for (const p of fm.problems || []) problems.push(p);

  const name = fm.fields.name;
  if (!name) problems.push('no "name" - Claude cannot invoke this skill');
  else {
    if (name !== dirName) problems.push('name "' + name + '" does not match directory "' + dirName + '"');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) problems.push('name must be lowercase words joined by single hyphens');
    if (name.length > 64) problems.push('name is over 64 characters');
    if (/anthropic|claude/.test(name)) problems.push('name uses a reserved word (anthropic / claude)');
  }

  const d = fm.fields.description;
  if (!d || !d.trim()) problems.push('no "description" - Claude selects skills on this field alone, so the skill is invisible');
  else {
    if (d.length > 1024) problems.push('description is ' + d.length + ' chars, over the 1024 limit');
    if (/^\s*(I |I'|You can |You should |Use me )/.test(d)) problems.push('description should be third person ("Extracts...", not "I can extract...")');
    if (!/\buse\b/i.test(d)) problems.push('description does not say WHEN to use the skill');
  }

  if (fm.bodyLines > 500) problems.push('body is ' + fm.bodyLines + ' lines - split detail into references/ (limit 500)');
}

if (problems.length) {
  console.log('SKILL.md contract problems in ' + file + ':');
  for (const p of problems) console.log('  - ' + p);
  console.log('  See .claude/standards/SKILL_AUTHORING.md');
}
process.exit(0);
