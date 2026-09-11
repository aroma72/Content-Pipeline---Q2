#!/usr/bin/env node
'use strict';
/**
 * publish-checkpoint -- make a video's in-video question reachable by the LMS.
 *
 *   node scripts/publish-checkpoint.js                 # every changed video
 *   node scripts/publish-checkpoint.js autonomy/autonomy-01-spectrum
 *   node scripts/publish-checkpoint.js --check         # validate only, no push
 *
 * WHY THIS EXISTS
 * Taleemabad University draws the in-video question popup from
 * GET /api/v1/videos/<slug>/checkpoints. That API reads `beats.js` and
 * `durations.json` off the container's own filesystem, and the container has no
 * volume and no git -- so a video's question reaches learners only once those
 * two files are committed, pushed, and Railway has rebuilt. A video whose
 * checkpoint never lands ships with its interactive question silently missing,
 * and nothing fails loudly. This is the thing that makes it fail loudly.
 *
 * WHAT "PUBLISHED" MEANS HERE
 * Not "pushed". The script fetches the checkpoint back from the live API and
 * compares it to what it sent. A push that did not reach production is a
 * failure, and is reported as one.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');

// Without this the token is unset when run from a hook, and every publish
// reports FAILED because it cannot verify itself — which is what happened the
// first time this ran for real.
try { require(path.join(REPO, 'orchestrator/lib/env')).loadDotenv(); } catch { /* not fatal */ }

const API = process.env.CONTENT_API_BASE
  || 'https://content-queen-production.up.railway.app';
const TOKEN = () => process.env.CONTENT_API_TOKEN || '';

const checkpoints = require(path.join(REPO, 'server/lib/checkpoints'));

const log = (m) => process.stdout.write(`[publish-checkpoint] ${m}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function git(args, opts = {}) {
  const r = spawnSync('git', args, { cwd: REPO, encoding: 'utf8', ...opts });
  if (r.status !== 0 && !opts.tolerateFailure) {
    throw new Error(`git ${args.join(' ')} failed:\n${r.stderr || r.stdout}`);
  }
  return (r.stdout || '').trim();
}

/** Videos whose beats.js or durations.json differ from origin/main. */
function changedVideos() {
  git(['fetch', 'origin', '--quiet'], { tolerateFailure: true });
  // Pathspec is the whole tree, not <series>/<slug>: assessment videos sit a
  // level deeper, and a fixed-depth glob silently skipped them.
  const tracked = git(['diff', '--name-only', 'origin/main', '--', 'explainer-videos']);
  // -uall: without it git collapses a wholly-untracked video folder to a single
  // directory entry, and the beats.js inside is never seen.
  const untracked = git(['status', '--porcelain', '-uall', '--', 'explainer-videos']);
  const files = [
    ...tracked.split('\n'),
    ...untracked.split('\n').map((l) => l.slice(3)),
  ].filter((f) => /\/(beats\.js|durations\.json)$/.test(f));

  // Attribute each changed file to the folder that owns it, from the real
  // folder list rather than by counting path segments.
  const root = path.join(REPO, 'explainer-videos');
  const known = checkpoints.videoDirs()
    .map((d) => path.relative(root, d).split(path.sep).join('/'))
    // Longest first, so a nested video wins over its parent directory.
    .sort((a, b) => b.length - a.length);

  const seen = new Set();
  for (const f of files) {
    const rel = f.replace(/^explainer-videos\//, '');
    const owner = known.find((k) => rel.startsWith(k + '/'));
    if (owner) seen.add(owner);
  }
  return [...seen];
}

/**
 * Refuse to publish a question that would reach a learner broken. Each of these
 * has already shipped once.
 */
function validate(relPath) {
  const payload = checkpoints.forPath(relPath);
  if (!payload) {
    return { skip: true, why: 'no QUESTION -> REVEAL pair (assessment and screencast '
      + 'videos have none), or no durations.json yet' };
  }
  if (!payload.timing.trusted) {
    return { ok: false, why: `timing could not be established (intro offset `
      + `${payload.timing.introOffsetSource}) -- the popup would fire at the wrong second.` };
  }
  const weak = payload.checkpoints.filter((c) => c.explanationSource !== 'authored');
  if (weak.length) {
    return { ok: false, why: `${weak.map((c) => c.id).join(', ')} has no authored `
      + `explanation -- the LMS would show the video's six-word caption to a learner who `
      + `just answered wrong. Add \`explain\` to the REVEAL beat's data in beats.js.` };
  }
  return { ok: true, payload };
}

async function fetchLive(slug) {
  if (!TOKEN()) throw new Error('CONTENT_API_TOKEN is not set, so the publish cannot be verified');
  const res = await fetch(`${API}/api/v1/videos/${encodeURIComponent(slug)}/checkpoints`, {
    headers: { Authorization: `Bearer ${TOKEN()}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API returned ${res.status} for ${slug}`);
  return res.json();
}

/** Live and identical to what we pushed -- not merely present. */
function matches(live, local) {
  if (!live || live.checkpoints.length !== local.checkpoints.length) return false;
  return local.checkpoints.every((c, i) => {
    const l = live.checkpoints[i];
    return l && l.atSeconds === c.atSeconds && l.explanation === c.explanation
      && l.correctIndex === c.correctIndex;
  });
}

async function waitForLive(slug, local, { minutes = 12 } = {}) {
  const deadline = Date.now() + minutes * 60_000;
  let nudged = false;
  while (Date.now() < deadline) {
    let live = null;
    try { live = await fetchLive(slug); } catch (e) { log(`  (${e.message})`); }
    if (matches(live, local)) return true;

    // Auto-deploy has been broken before. Rather than wait out the whole
    // window on a push that will never build, nudge it once at the halfway
    // mark and say so -- a silent 12-minute wait teaches nobody anything.
    if (!nudged && Date.now() > deadline - (minutes / 2) * 60_000) {
      nudged = true;
      log('  still not live -- triggering a deploy directly (is GitHub auto-deploy working?)');
      spawnSync('railway', ['up', '--detach', '--service', 'content-queen'],
        { cwd: REPO, encoding: 'utf8' });
    }
    await sleep(20_000);
  }
  return false;
}

async function publishOne(id, { checkOnly }) {
  const slug = id.split('/').pop();
  const v = validate(id);
  if (v.skip) {
    log(`skipped ${id}: ${v.why}`);
    return true;
  }
  if (!v.ok) {
    log(`REFUSED ${id}: ${v.why}`);
    return false;
  }
  const cp = v.payload.checkpoints[0];
  log(`${id}: ${v.payload.checkpoints.length} checkpoint(s), first at ${cp.atSeconds}s`);
  if (checkOnly) return true;

  const files = ['beats.js', 'durations.json']
    .map((f) => `explainer-videos/${id}/${f}`)
    .filter((f) => fs.existsSync(path.join(REPO, f)));

  git(['add', ...files]);
  const staged = git(['diff', '--cached', '--name-only', '--', ...files]);
  if (staged) {
    git(['commit', '-m',
      `Publish the ${slug} question checkpoint\n\n`
      + `Fires at ${cp.atSeconds}s in the delivered file. The LMS reads it from\n`
      + `GET /api/v1/videos/${slug}/checkpoints, which serves it out of this repo,\n`
      + `so it is not reachable by learners until this is on main.`]);
    log('  committed');
  } else {
    log('  nothing to commit (already committed)');
  }

  git(['push', 'origin', 'HEAD:main']);
  log('  pushed to main');

  const live = await waitForLive(slug, v.payload);
  if (!live) {
    log(`FAILED ${id}: not serving from ${API} after the deploy window. `
      + 'The question is NOT reachable by the LMS.');
    return false;
  }
  log(`PUBLISHED ${id} -- verified live at ${API}/api/v1/videos/${slug}/checkpoints`);
  return true;
}

(async () => {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const explicit = args.filter((a) => !a.startsWith('--'));

  const ids = explicit.length ? explicit : changedVideos();
  if (!ids.length) {
    log('no video beats.js or durations.json changed -- nothing to publish');
    return;
  }

  let failed = 0;
  for (const id of ids) {
    if (!(await publishOne(id, { checkOnly }))) failed++;
  }
  if (failed) {
    log(`${failed} of ${ids.length} video(s) NOT published`);
    process.exit(1);
  }
})().catch((e) => { log('ERROR: ' + (e.stack || e.message)); process.exit(1); });
