#!/usr/bin/env node
'use strict';
// Skill eval harness. Three layers, all deterministic, all $0, no network.
//   Layer 1  the frontmatter contract every SKILL.md must satisfy to load at all
//   Layer 2  routing fixtures - does each description carry its trigger surface
//   Layer 3  gate regression - validate-beats over every committed beats.js
// Exit 0 when every layer passes, 1 on any failure. Safe to run in CI.

const fs = require('fs');
const path = require('path');
const { REPO, skillDirs, looseSkillFiles, parseFrontmatter, rankSkills } = require('./lib');

const only = (process.argv.find(a => a.startsWith('--layer=')) || '').split('=')[1];
const results = [];
let pass = 0, fail = 0;

function check(layer, what, ok, detail) {
  results.push({ layer, what, ok, detail });
  if (ok) pass++; else fail++;
}

// ---------------------------------------------------------------- Layer 1
const RESERVED = ['anthropic', 'claude'];

function layer1() {
  const skills = skillDirs();
  check(1, 'at least one skill exists', skills.length > 0, 'found ' + skills.length);

  const loose = looseSkillFiles();
  check(1, 'no loose .md directly in .claude/skills (they can never load)',
    loose.length === 0, loose.join(', ') || 'none');

  const descs = [];
  for (const s of skills) {
    const raw = fs.readFileSync(s.file, 'utf8');
    const fm = parseFrontmatter(raw);
    const at = s.name + '/SKILL.md';

    if (!fm.ok) { check(1, at + ': has frontmatter', false, fm.reason); continue; }
    check(1, at + ': frontmatter parses', (fm.problems || []).length === 0,
      (fm.problems || []).join(' | ') || 'clean');

    const name = fm.fields.name;
    check(1, at + ': has name', !!name, name || 'MISSING');
    if (name) {
      check(1, at + ': name matches directory', name === s.name, name + ' vs ' + s.name);
      check(1, at + ': name is lowercase-hyphen, <=64 chars',
        /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) && name.length <= 64, name);
      check(1, at + ': name avoids reserved words',
        !RESERVED.some(r => name.includes(r)), name);
    }

    const d = fm.fields.description;
    check(1, at + ': has description', !!d && d.trim().length > 0, d ? d.length + ' chars' : 'MISSING');
    if (d) {
      check(1, at + ': description <=1024 chars', d.length <= 1024, String(d.length));
      check(1, at + ': description is third person',
        !/^\s*(I |I'|You can |You should |Use me )/.test(d), d.slice(0, 40));
      check(1, at + ': description says when to use', /\buse\b/i.test(d), d.slice(0, 40));
      descs.push({ name: s.name, description: d });
    }

    check(1, at + ': body under 500 lines', fm.bodyLines <= 500, fm.bodyLines + ' lines');

    // Every relative link must resolve, and references must stay one level deep.
    const links = [...raw.matchAll(/\]\(([^)#:]+\.md)\)/g)].map(m => m[1]);
    for (const l of links) {
      const target = path.resolve(s.dir, l);
      check(1, at + ': link resolves -> ' + l, fs.existsSync(target), target);
      const depth = l.split('/').filter(p => p && p !== '.').length;
      check(1, at + ': link one level deep -> ' + l, depth <= 2, 'depth ' + depth);
    }
  }

  // Descriptions must be distinguishable from one another.
  for (let i = 0; i < descs.length; i++) {
    for (let j = i + 1; j < descs.length; j++) {
      check(1, 'descriptions differ: ' + descs[i].name + ' vs ' + descs[j].name,
        descs[i].description !== descs[j].description, 'identical text');
    }
  }

  // CLAUDE.md must not point at files that do not exist. This is the check that
  // would have caught five dead navigation rows.
  const claude = path.join(REPO, 'CLAUDE.md');
  if (fs.existsSync(claude)) {
    const txt = fs.readFileSync(claude, 'utf8');
    const refs = new Set([...txt.matchAll(/`([A-Za-z0-9_./-]+\.(?:md|js|sh|json))`/g)].map(m => m[1]));
    for (const r of refs) {
      if (!r.includes('/')) continue;                 // bare filenames are prose, not paths
      check(1, 'CLAUDE.md reference exists: ' + r, fs.existsSync(path.join(REPO, r)), r);
    }
  }
}

// ---------------------------------------------------------------- Layer 2
function layer2() {
  const skills = skillDirs().map(s => {
    const fm = parseFrontmatter(fs.readFileSync(s.file, 'utf8'));
    return { name: s.name, description: (fm.fields && fm.fields.description) || '' };
  });
  const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'routing.json'), 'utf8')).cases;

  for (const c of cases) {
    const ranked = rankSkills(c.query, skills);
    const top = ranked[0];
    if (c.expect === null) {
      // Near-miss negative: nothing should claim it strongly.
      check(2, 'no skill claims: "' + c.query + '"', top.score < 0.34,
        'top ' + top.name + ' @ ' + top.score.toFixed(2));
    } else {
      const want = ranked.find(r => r.name === c.expect) || { score: 0 };
      check(2, '"' + c.query + '" -> ' + c.expect, top.name === c.expect,
        'got ' + top.name + ' @ ' + top.score.toFixed(2) +
        ' (expected ' + c.expect + ' @ ' + want.score.toFixed(2) + ')');
    }
  }
}

// ---------------------------------------------------------------- Layer 3
function findBeats(dir, out) {
  out = out || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) findBeats(p, out);
    else if (e.name === 'beats.js') out.push(p);
  }
  return out;
}

function layer3() {
  let validateBeats;
  try {
    validateBeats = require(path.join(REPO, 'orchestrator/lib/validate-beats.js')).validateBeats;
  } catch (e) {
    check(3, 'validate-beats.js loads', false, e.message);
    return;
  }
  check(3, 'validate-beats.js loads', true, 'ok');

  // Boundary fixtures: each asserts one rule, and the pairs assert both directions.
  const fx = path.join(__dirname, 'fixtures');
  const fixtures = fs.existsSync(fx) ? fs.readdirSync(fx).filter(n => n.endsWith('.json')) : [];
  check(3, 'boundary fixtures present', fixtures.length > 0, fixtures.length + ' fixtures');

  for (const name of fixtures) {
    const c = JSON.parse(fs.readFileSync(path.join(fx, name), 'utf8'));
    const errors = validateBeats(c.beats, fx, c.opts || {}).errors;
    const got = errors.join(' | ');
    if (c.expect_error) {
      check(3, 'fixture ' + name + ': rejects (' + c.why + ')',
        errors.length > 0 && got.toLowerCase().includes(c.expect_error.toLowerCase()),
        got || 'ACCEPTED with no error');
    } else {
      check(3, 'fixture ' + name + ': accepts (' + c.why + ')', errors.length === 0, got || 'clean');
    }
  }

  // Regression snapshot over every committed beats.js. We assert against a
  // recorded baseline, not against zero errors - some of these are known-broken
  // scaffolds. What must not change silently is WHICH ones are broken.
  const base = path.join(__dirname, 'baseline.json');
  const snapshot = {};
  for (const f of findBeats(path.join(REPO, 'explainer-videos'))) {
    const rel = path.relative(REPO, f).replace(/\\/g, '/');
    let n;
    try {
      delete require.cache[require.resolve(f)];
      const mod = require(f);
      const beats = Array.isArray(mod) ? mod : mod.beats;
      n = validateBeats(beats, path.dirname(f)).errors.length;
    } catch (e) {
      n = 'load-error';
    }
    snapshot[rel] = n;
  }
  const count = Object.keys(snapshot).length;
  check(3, 'found committed beats.js files to check', count > 0, count + ' files');

  if (!fs.existsSync(base)) {
    fs.writeFileSync(base, JSON.stringify(snapshot, null, 2) + '\n');
    check(3, 'baseline written (first run)', true,
      count + ' files recorded -> evals/skills/baseline.json');
  } else {
    const prev = JSON.parse(fs.readFileSync(base, 'utf8'));
    const drift = [];
    const keys = new Set(Object.keys(prev).concat(Object.keys(snapshot)));
    for (const k of keys) {
      if (String(prev[k]) !== String(snapshot[k])) {
        drift.push(k + ': ' + (prev[k] === undefined ? 'new' : prev[k]) +
          ' -> ' + (snapshot[k] === undefined ? 'removed' : snapshot[k]));
      }
    }
    check(3, 'no unexplained drift vs baseline', drift.length === 0,
      drift.slice(0, 8).join(' | ') + (drift.length > 8 ? ' | +' + (drift.length - 8) + ' more' : '') || 'stable');
  }
}

// ---------------------------------------------------------------- run
const layers = only ? [Number(only)] : [1, 2, 3];
if (layers.includes(1)) layer1();
if (layers.includes(2)) layer2();
if (layers.includes(3)) layer3();

for (const l of layers) {
  const rows = results.filter(r => r.layer === l);
  const bad = rows.filter(r => !r.ok);
  console.log('\nLayer ' + l + ': ' + (rows.length - bad.length) + '/' + rows.length + ' passed');
  for (const r of bad) console.log('  FAIL  ' + r.what + '\n        ' + r.detail);
}
console.log('\nTOTAL ' + pass + '/' + (pass + fail) + ' assertions passed');
process.exit(fail === 0 ? 0 : 1);
