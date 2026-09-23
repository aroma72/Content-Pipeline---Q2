'use strict';
// Shared helpers for the skill eval harness. No dependencies, no network, no spend.
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');

function skillDirs() {
  const base = path.join(REPO, '.claude', 'skills');
  return fs.readdirSync(base, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => ({ name: e.name, dir: path.join(base, e.name), file: path.join(base, e.name, 'SKILL.md') }))
    .filter(s => fs.existsSync(s.file));
}

function looseSkillFiles() {
  const base = path.join(REPO, '.claude', 'skills');
  return fs.readdirSync(base, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.md'))
    .map(e => e.name);
}

// Frontmatter parse that mirrors how a YAML loader actually behaves, including
// the failure that silently broke four skills here: an unquoted scalar
// containing ": " does not parse, and the skill loads with no description at all.
function parseFrontmatter(text) {
  const norm = text.replace(/\r\n/g, '\n');
  if (!norm.startsWith('---\n')) return { ok: false, reason: 'no frontmatter block', fields: {} };
  const end = norm.indexOf('\n---', 3);
  if (end === -1) return { ok: false, reason: 'frontmatter never closes', fields: {} };
  const body = norm.slice(end + 4);
  const fields = {};
  const problems = [];
  for (const line of norm.slice(4, end).split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const m = line.match(/^([A-Za-z0-9_-]+):\s?(.*)$/);
    if (!m) { problems.push('unparseable frontmatter line: ' + line); continue; }
    const key = m[1];
    const val = m[2].trim();
    const quoted = /^(".*"|'.*')$/.test(val);
    if (!quoted && val.includes(': ')) {
      problems.push(key + ' is an unquoted scalar containing ": " - YAML will not parse it, '
        + 'and the skill silently loads with no ' + key);
    }
    fields[key] = quoted ? val.slice(1, -1) : val;
  }
  return { ok: true, fields, problems, bodyLines: body.split('\n').length };
}

// ---------------------------------------------------------------------------
// Layer 2 scoring: does a description carry the trigger surface for a query?
// Deliberately crude and free. It proves a NECESSARY condition - the words are
// there to match on - not that the model will actually fire the skill. Only a
// live eval can prove that.
// ---------------------------------------------------------------------------

const STOP = new Set(('a an the is are was were be been being do does did of for to in on at by with '
  + 'and or but if then than that this these those it its my our your i we you me us how what why '
  + 'when where which who can could should would will shall may might must not no yes from into out '
  + 'up down over under again just also very so such as about out came come got get').split(' '));

// Hyphenated compounds are emitted whole AND in parts, so the skill name
// "creating-explainer-videos" can match the single word "explainer".
function tokens(s) {
  const raw = String(s).toLowerCase().match(/[a-z0-9._-]{2,}/g) || [];
  const out = [];
  for (const t of raw) {
    const clean = t.replace(/^[._-]+|[._-]+$/g, '');
    if (clean.length >= 2) out.push(clean);
    if (clean.includes('-')) {
      for (const part of clean.split('-')) if (part.length >= 3) out.push(part);
    }
  }
  return out;
}

function contentTokens(s) {
  return [...new Set(tokens(s).filter(t => !STOP.has(t)))];
}

// Crude stemmer, applied to BOTH sides so "create" meets "creating" and
// "rendered" meets "render". It must run to a FIXPOINT: a single pass took
// "writes" to "write" and "write" to "writ", so the two never met and a query
// saying "write" missed a description saying "Writes".
function stem(t) {
  let s = t, prev;
  do { prev = s; s = s.replace(/(ings|ing|ers|er|ed|es|s|e)$/, ''); }
  while (s !== prev && s.length > 3);
  return s.length >= 3 ? s : t;
}

// A trailing "NOT for ..." clause names OTHER skills on purpose. Crediting those
// words made creating-avatar-videos tie with creating-explainer-videos on the
// word "explainer", so the disclaimer is dropped before scoring.
//
// Only a SENTENCE-INITIAL "NOT" is a disclaimer. An earlier naive version split
// on any "NOT" and silently truncated reviewing-explainer-scripts at its own
// verdict vocabulary ("READY / NEEDS WORK / NOT READY"), throwing away the half
// of the description that carried its triggers.
function triggerSurface(description) {
  const parts = String(description).split(/(?:^|(?<=\.)\s+)NOT\b/);
  return parts[0];
}

// Inverse document frequency: a word that appears in many descriptions barely
// discriminates, so "render" counts for less than "remotion". Without this,
// ties fell back to alphabetical order, which is not a measurement.
function idf(skills) {
  const df = new Map();
  for (const s of skills) {
    for (const t of new Set(tokens(triggerSurface(s.description) + ' ' + s.name).map(stem))) {
      df.set(t, (df.get(t) || 0) + 1);
    }
  }
  const n = skills.length || 1;
  return t => Math.log((n + 1) / ((df.get(t) || 0) + 1)) + 1;
}

function scoreQuery(query, description, name, weight) {
  const w = weight || (() => 1);
  const hay = new Set(tokens(triggerSurface(description) + ' ' + name).map(stem));
  const q = contentTokens(query);
  if (!q.length) return 0;
  let hit = 0, total = 0;
  for (const t of q) {
    const st = stem(t);
    const wt = w(st);
    total += wt;
    if (hay.has(st)) hit += wt;
  }
  return total ? hit / total : 0;
}

function rankSkills(query, skills) {
  const w = idf(skills);
  return skills
    .map(s => ({ name: s.name, score: scoreQuery(query, s.description, s.name, w) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

module.exports = {
  REPO, skillDirs, looseSkillFiles, parseFrontmatter,
  rankSkills, scoreQuery, contentTokens, triggerSurface,
};
