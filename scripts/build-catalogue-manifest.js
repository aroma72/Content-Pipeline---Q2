#!/usr/bin/env node
'use strict';
/**
 * Record which videos are committed to git, so the running service can tell a
 * durable catalogue row from one that will vanish on the next redeploy.
 *
 *   node scripts/build-catalogue-manifest.js            # write the manifest
 *   node scripts/build-catalogue-manifest.js --check    # fail if it is stale
 *
 * WHY A BUILD STEP AND NOT A RUNTIME CHECK
 * .dockerignore excludes .git, so git is unavailable inside the image AND inside
 * the docker build. The question "is this row in git" can only be answered on a
 * machine that has the repository, which means before the build, and the answer
 * has to be committed.
 *
 * WHAT IT IS FOR
 * The LMS reported a slug that 404'd a day after they cited it. Slugs are in fact
 * immutable -- the suffix is minted once, before the pipeline runs, and never
 * rewritten. What churned was EXISTENCE: `made/*` videos are created at runtime
 * into the container filesystem, and out/, art/ and *.mp4 are stripped from the
 * image, so a redeploy takes them with it. From outside, a lesson re-made after a
 * redeploy reappears under a new videoId, which is indistinguishable from a
 * rename. This manifest is how the catalogue says, per row, whether an LMS can
 * safely link a lesson block to it.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'server', 'catalogue-manifest.json');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function committedVideoPaths() {
  let listed = '';
  try {
    listed = git(['ls-files', '--', 'explainer-videos/**/beats.js']);
  } catch (e) {
    throw new Error(`git ls-files failed: ${e.message}`);
  }
  const out = new Set();
  for (const line of listed.split('\n')) {
    const f = line.trim();
    if (!f.endsWith('/beats.js')) continue;
    // 'explainer-videos/<series>/<slug>/beats.js' -> '<series>/<slug>'
    const rel = f.slice('explainer-videos/'.length, -'/beats.js'.length);
    if (rel) out.add(rel);
  }
  return out;
}

/** When each beats.js was last committed. One git log pass, not one per file. */
function lastCommitted(paths) {
  const when = new Map();
  let log = '';
  try {
    log = git(['log', '--format=%H%x09%cI', '--name-only', '--', 'explainer-videos']);
  } catch { return when; }

  let stamp = null;
  for (const line of log.split('\n')) {
    if (!line.trim()) continue;
    const head = /^([0-9a-f]{40})\t(.+)$/.exec(line);
    if (head) { stamp = head[2]; continue; }
    if (!stamp || !line.endsWith('/beats.js')) continue;
    const rel = line.slice('explainer-videos/'.length, -'/beats.js'.length);
    // git log is newest-first, so the first sighting is the latest commit.
    if (paths.has(rel) && !when.has(rel)) when.set(rel, stamp);
  }
  return when;
}

function build() {
  const paths = committedVideoPaths();
  const when = lastCommitted(paths);
  let commit = null;
  try { commit = git(['rev-parse', 'HEAD']).trim(); } catch { /* shallow or no repo */ }

  const out = { generatedAt: new Date().toISOString(), gitCommit: commit, paths: {} };
  for (const rel of [...paths].sort()) {
    out.paths[rel] = { committedAt: when.get(rel) || null };
  }
  return out;
}

function main() {
  const check = process.argv.includes('--check');
  const next = build();

  let current = null;
  try { current = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { /* absent */ }

  const same = current
    && JSON.stringify(Object.keys(current.paths || {}).sort())
      === JSON.stringify(Object.keys(next.paths).sort());

  if (check) {
    if (!current) {
      console.error('catalogue manifest is missing. Run: node scripts/build-catalogue-manifest.js');
      process.exit(1);
    }
    if (!same) {
      const a = new Set(Object.keys(current.paths || {}));
      const b = new Set(Object.keys(next.paths));
      const added = [...b].filter((x) => !a.has(x));
      const gone = [...a].filter((x) => !b.has(x));
      console.error('catalogue manifest is stale.');
      if (added.length) console.error(`  missing from the manifest: ${added.join(', ')}`);
      if (gone.length) console.error(`  no longer in git: ${gone.join(', ')}`);
      console.error('Run: node scripts/build-catalogue-manifest.js');
      process.exit(1);
    }
    console.log(`catalogue manifest is current (${Object.keys(next.paths).length} committed videos)`);
    return;
  }

  fs.writeFileSync(OUT, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`wrote ${path.relative(ROOT, OUT)} — ${Object.keys(next.paths).length} committed videos`);
}

if (require.main === module) main();
module.exports = { build, OUT };
