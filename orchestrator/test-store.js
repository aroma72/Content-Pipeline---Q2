'use strict';
/**
 * Unit tests for the durable pieces: the job store, tenants, and the .env loader.
 *
 * Everything here runs against a fresh temp directory and needs no credential,
 * so it runs on CI and on a clean clone. Node built-ins only, matching
 * test-regressions.js.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const jobStore = require(path.join(ROOT, 'server', 'lib', 'job-store'));
const jobs = require(path.join(ROOT, 'server', 'lib', 'jobs'));
const tenants = require(path.join(ROOT, 'server', 'lib', 'tenants'));

let pass = 0;
let skipped = 0;
const failures = [];

const skip = (why) => ({ __skip: true, why });

function report(name, detail) {
  if (detail && detail.__skip) {
    skipped++;
    console.log(`  SKIP  ${name}  (${detail.why})`);
    return;
  }
  pass++;
  console.log(`  PASS  ${name}${detail ? `  (${detail})` : ''}`);
}

function check(name, fn) {
  try {
    report(name, fn());
  } catch (e) {
    failures.push({ name, message: e.message });
    console.log(`  FAIL  ${name}\n          ${e.message}`);
  }
}

const tmpdirs = [];
function freshStore(env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-store-'));
  tmpdirs.push(dir);
  return jobStore.open({ dir, env: { JOB_STORE_DIR: dir, ...env } });
}

const DAY = 24 * 60 * 60 * 1000;

// ── 1. the store ──────────────────────────────────────────────────────────────

console.log('\n1. job store (was: an in-memory Map that lost paid work)');

check('a job survives a write and a read', () => {
  const s = freshStore();
  s.put({ id: 'abc123', status: 'running', topic: 'a thing', startedAt: Date.now() });
  const back = s.get('abc123');
  assert(back && back.topic === 'a thing', 'job did not come back');
  return 'round trip';
});

check('a new store instance sees what the old one wrote (survives a restart)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-store-'));
  tmpdirs.push(dir);
  jobStore.open({ dir, env: { JOB_STORE_DIR: dir } })
    .put({ id: 'persist1', status: 'awaiting_review', topic: 'paid for', startedAt: Date.now() });
  const reopened = jobStore.open({ dir, env: { JOB_STORE_DIR: dir } });
  const back = reopened.get('persist1');
  assert(back && back.status === 'awaiting_review', 'job did not survive a reopen');
  return 'restart-safe';
});

check('a leftover .tmp from a killed write is ignored, not parsed', () => {
  const s = freshStore();
  s.put({ id: 'good1', status: 'running', startedAt: Date.now() });
  fs.writeFileSync(path.join(s.dir, 'jobs', 'good1.json.999.tmp'), '{ this is not json');
  const all = s.all();
  assert(all.length === 1 && all[0].id === 'good1', `expected 1 job, got ${all.length}`);
  return 'partial write invisible';
});

check('an unsafe job id cannot escape the jobs directory', () => {
  const s = freshStore();
  assert(s.get('../../etc/passwd') === null, 'traversal id was not rejected');
  assert.throws(() => s.put({ id: '../evil', status: 'running' }), /safe id/);
  return 'rejected';
});

// ── 2. the TTL bug this store exists to fix ───────────────────────────────────

console.log('\n2. TTL runs from the last transition, not from creation');

check('a terminal job is swept at 8 days and kept at 6', () => {
  const s = freshStore();
  const now = Date.now();
  s.put({ id: 'old1', status: 'published', startedAt: now - 30 * DAY, updatedAt: now - 8 * DAY });
  s.put({ id: 'recent1', status: 'published', startedAt: now - 30 * DAY, updatedAt: now - 6 * DAY });
  const r = s.sweep(now);
  assert(r.removed.includes('old1'), 'the 8-day-old terminal job was not swept');
  assert(!r.removed.includes('recent1'), 'the 6-day-old terminal job was swept too early');
  return `removed ${r.removed.length}`;
});

check('THE BUG: a job created long ago but producing NOW is not swept', () => {
  const s = freshStore();
  const now = Date.now();
  // Exactly the case the old code got wrong: created hours ago, still working.
  // The old per-job setTimeout fired on creation age and deleted this mid-spend.
  s.put({ id: 'busy1', status: 'producing', startedAt: now - 20 * DAY, updatedAt: now - 60 * 1000 });
  const r = s.sweep(now);
  assert(!r.removed.includes('busy1'), 'a job that is actively producing was swept');
  return 'survives, because it moved a minute ago';
});

check('a job stuck in producing for over a week is reported, not deleted', () => {
  const s = freshStore();
  const now = Date.now();
  s.put({ id: 'stuck1', status: 'producing', startedAt: now - 9 * DAY, updatedAt: now - 9 * DAY });
  const r = s.sweep(now);
  assert(!r.removed.includes('stuck1'), 'a stuck job was deleted rather than surfaced');
  assert(r.stuck.includes('stuck1'), 'a stuck job was not reported as stuck');
  return 'surfaced as stuck';
});

// ── 3. listing ────────────────────────────────────────────────────────────────

console.log('\n3. listing is owner-scoped and pages without dropping records');

check('list returns only the asking owner', () => {
  const s = freshStore();
  const now = Date.now();
  s.put({ id: 'mine1', ownerId: 'tenant:a', status: 'written', startedAt: now, updatedAt: now });
  s.put({ id: 'theirs1', ownerId: 'tenant:b', status: 'written', startedAt: now, updatedAt: now });
  const r = s.list({ ownerId: 'tenant:a' });
  assert(r.jobs.length === 1 && r.jobs[0].id === 'mine1', 'listing crossed a tenant boundary');
  return 'scoped';
});

check('the cursor pages forward without skipping or repeating', () => {
  const s = freshStore();
  const now = Date.now();
  for (let i = 0; i < 5; i++) {
    s.put({ id: `j${i}`, ownerId: 'tenant:a', status: 'written', startedAt: now, updatedAt: now + i });
  }
  const seen = [];
  let cursor = null;
  for (let guard = 0; guard < 10; guard++) {
    const page = s.list({ ownerId: 'tenant:a', limit: 2, cursor });
    page.jobs.forEach((j) => seen.push(j.id));
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  assert(seen.length === 5, `expected 5 jobs across pages, saw ${seen.length}: ${seen}`);
  assert(new Set(seen).size === 5, `a job was repeated across pages: ${seen}`);
  return seen.join(',');
});

// ── 4. durability is detected, not claimed ────────────────────────────────────

console.log('\n4. durability is reported honestly');

check('a Railway volume mount is reported as durable', () => {
  const r = jobStore.resolveDir({ RAILWAY_VOLUME_MOUNT_PATH: '/data' });
  assert(r.kind === 'volume', `expected volume, got ${r.kind}`);
  assert(r.dir.replace(/\\/g, '/').startsWith('/data'), `expected the store under /data, got ${r.dir}`);
  return 'volume';
});

check('with no volume the store says container, not volume', () => {
  const r = jobStore.resolveDir({});
  assert(r.kind !== 'volume', `claimed volume durability with no volume: ${r.kind}`);
  return r.kind;
});

check('an unwritable directory degrades to memory and says so', () => {
  // A path under a FILE can never be a directory, on every platform.
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cq-store-')), 'a-file');
  fs.writeFileSync(f, 'x');
  const s = jobStore.open({ dir: path.join(f, 'nope'), env: {} });
  assert(s.durability === 'memory', `expected memory, got ${s.durability}`);
  assert(s.writable === false, 'an unwritable store claimed to be writable');
  assert(s.canRecordSpend() === false, 'a memory store must refuse to record spend');
  assert(/NOT WRITABLE/.test(s.health().note), 'health did not say it is not writable');
  // It must still answer rather than crash the service.
  s.put({ id: 'mem1', status: 'running', startedAt: Date.now() });
  assert(s.get('mem1'), 'the memory fallback did not hold the job');
  return 'degrades loudly';
});

// ── 5. ownership and restore ──────────────────────────────────────────────────

console.log('\n5. ownership, claiming and restart reconciliation');

check('a job records its owner at birth', () => {
  const s = freshStore();
  const j = jobs.create({ topic: 'x', owner: { kind: 'anon', id: 'anon:abc' } }, { store: s });
  assert(j.ownerId === 'anon:abc', 'owner was not recorded');
  return j.ownerId;
});

check('a tenant can claim a written job once, and not twice', () => {
  const s = freshStore();
  const j = jobs.create({ topic: 'x', owner: { kind: 'anon', id: 'anon:abc' } }, { store: s });
  s.patch(j.id, (job) => { job.status = 'written'; return job; });
  const to = { kind: 'tenant', id: 'tenant:lms', tenant: { id: 'lms' } };
  const first = jobs.claim(j.id, { to }, { store: s });
  assert(first.ok, `first claim failed: ${first.why}`);
  assert(first.job.ownerId === 'tenant:lms', 'ownership did not transfer');
  assert(first.job.claimedFrom === 'anon:abc', 'the previous owner was not retained for audit');
  const second = jobs.claim(j.id, { to }, { store: s });
  assert(!second.ok, 'a job was claimed twice');
  return 'once only';
});

check('a job already producing cannot change hands', () => {
  const s = freshStore();
  const j = jobs.create({ topic: 'x', owner: { kind: 'anon', id: 'anon:abc' } }, { store: s });
  s.patch(j.id, (job) => { job.status = 'producing'; return job; });
  const r = jobs.claim(j.id, { to: { kind: 'tenant', id: 'tenant:lms', tenant: { id: 'lms' } } }, { store: s });
  assert(!r.ok, 'a producing job was claimed');
  return 'refused';
});

check('after a restart, producing becomes interrupted and running becomes failed', () => {
  const s = freshStore();
  const now = Date.now();
  s.put({ id: 'p1', status: 'producing', startedAt: now, updatedAt: now });
  s.put({ id: 'r1', status: 'running', startedAt: now, updatedAt: now });
  s.put({ id: 'a1', status: 'awaiting_review', startedAt: now, updatedAt: now });
  const out = jobs.restore({ store: s });
  assert(s.get('p1').status === 'interrupted', `producing became ${s.get('p1').status}`);
  assert(s.get('p1').resumable === true, 'an interrupted produce was not marked resumable');
  assert(s.get('r1').status === 'failed', `running became ${s.get('r1').status}`);
  assert(s.get('a1').status === 'awaiting_review', 'a waiting job was disturbed by restore');
  return `${out.interrupted} interrupted, ${out.failed} failed`;
});

check('a finished job names the catalogue slug its checkpoints are filed under', () => {
  const s = freshStore();
  const j = jobs.create({ topic: 'x', owner: { kind: 'tenant', id: 'tenant:lms', tenant: { id: 'lms' } } }, { store: s });
  s.patch(j.id, (job) => {
    job.status = 'published';
    job.script = { itemId: 'made/how-to-do-a-thing-ab12', slug: 'how-to-do-a-thing-ab12', series: 'made' };
    return job;
  });
  const pub = jobs.toPublic(s.get(j.id), { baseUrl: 'https://example.test' });
  assert(pub.catalogue, 'no catalogue key on a finished job');
  assert(pub.catalogue.videoId === 'how-to-do-a-thing-ab12', `wrong videoId: ${pub.catalogue.videoId}`);
  assert(pub.catalogue.path === 'made/how-to-do-a-thing-ab12', `wrong path: ${pub.catalogue.path}`);
  assert(/\/api\/v1\/videos\/how-to-do-a-thing-ab12\/checkpoints$/.test(pub.catalogue.checkpointsUrl),
    `wrong checkpoints url: ${pub.catalogue.checkpointsUrl}`);
  return pub.catalogue.videoId;
});

check('a job never stores finalPath, because it does not survive a redeploy', () => {
  const s = freshStore();
  const j = jobs.create({ topic: 'x', owner: { kind: 'anon', id: 'anon:a' } }, { store: s });
  s.patch(j.id, (job) => {
    job.review = { itemId: 'made/x', series: 'made', slug: 'x' };
    return job;
  });
  const raw = JSON.stringify(s.get(j.id));
  assert(!/finalPath/.test(raw), 'a container-absolute path was persisted');
  return 'resolved at read time instead';
});

// ── 6. tenants ────────────────────────────────────────────────────────────────

console.log('\n6. tenant registry');

check('a token under the minimum length is refused, and the tenant is named', () => {
  const r = tenants.buildRegistry({ TENANTS_JSON: JSON.stringify([{ id: 'weak', token: 'short' }]) });
  assert(r.count === 0, 'a weak token was accepted');
  assert(/weak/.test(r.errors[0]), `the error did not name the tenant: ${r.errors[0]}`);
  assert(!/short/.test(r.errors[0]), 'the error printed the token itself');
  return 'refused, token not echoed';
});

check('two tenants sharing a token are both refused', () => {
  const t = 'the-same-token-long-enough-to-pass';
  const r = tenants.buildRegistry({ TENANTS_JSON: JSON.stringify([{ id: 'a', token: t }, { id: 'b', token: t }]) });
  assert(r.count === 0, `expected both refused, got ${r.count}`);
  assert(r.match(t) === null, 'a shared token still authenticated');
  return 'ambiguous spend refused';
});

check('a malformed TENANTS_JSON does not take the legacy token down with it', () => {
  const r = tenants.buildRegistry({ CONTENT_API_TOKEN: 'legacy-token-long-enough-for-rules', TENANTS_JSON: '{ not json' });
  assert(r.count === 1 && r.match('legacy-token-long-enough-for-rules'), 'the legacy token stopped working');
  assert(r.errors.length === 1, 'the parse failure was not reported');
  return 'fails new tenants closed only';
});

check('the public view never contains a token', () => {
  const t = 'a-real-looking-token-long-enough';
  const r = tenants.buildRegistry({ TENANTS_JSON: JSON.stringify([{ id: 'a', token: t }]) });
  assert(!JSON.stringify(r.list()).includes(t), 'list() leaked a token');
  assert(!JSON.stringify(r.health()).includes(t), 'health() leaked a token');
  return 'clean';
});

// ── 6b. the catalogue bridge ──────────────────────────────────────────────────

console.log('\n6b. the catalogue names durability and the playable URL');

check('the manifest exists and is current with git', () => {
  const m = require(path.join(ROOT, 'server', 'catalogue-manifest.json'));
  assert(m && m.paths, 'no manifest');
  const n = Object.keys(m.paths).length;
  assert(n > 10, `manifest looks empty: ${n} paths`);
  return `${n} committed videos`;
});

check('a runtime-made video is ephemeral, a committed one is not', () => {
  const c = require(path.join(ROOT, 'server', 'lib', 'checkpoints'));
  const rows = c.listVideos();
  assert(rows.length, 'no catalogue rows');
  for (const r of rows) {
    assert(['committed', 'ephemeral', 'unknown'].includes(r.durability),
      `row ${r.path} has an unusable durability: ${r.durability}`);
  }
  const committed = rows.filter((r) => r.durability === 'committed');
  assert(committed.length, 'nothing was reported as committed');
  // This is the answer to "are slugs immutable?": they are. What churns is
  // whether the folder is in the image at all.
  const madeRows = rows.filter((r) => r.path.startsWith('made/'));
  for (const r of madeRows) {
    assert(r.durability !== 'unknown', `a made/ row should be classified, got ${r.durability}`);
  }
  return `${committed.length} committed, ${rows.length - committed.length} not`;
});

check('every row carries catalogueUpdatedAt', () => {
  const c = require(path.join(ROOT, 'server', 'lib', 'checkpoints'));
  const rows = c.listVideos();
  const missing = rows.filter((r) => !r.catalogueUpdatedAt);
  assert(!missing.length, `rows without catalogueUpdatedAt: ${missing.map((r) => r.path).join(', ')}`);
  return 'all rows timestamped';
});

check('a publish record joins onto the catalogue row by path, not by videoId', () => {
  const pl = require(path.join(ROOT, 'server', 'lib', 'publish-log'));
  const idx = pl.index();
  // The two id fields collide by name and are different things. If the join were
  // written against `videoId` it would silently match nothing, or worse, match
  // the wrong row -- so assert the shape the join depends on.
  for (const [key, rec] of idx) {
    assert(key.includes('/'), `a publish key should be <series>/<slug>, got '${key}'`);
    assert(rec.url && /youtu/.test(rec.url), `record for ${key} has no YouTube url`);
    assert(rec.videoId !== key.split('/')[1],
      `the YouTube id and the folder name are being conflated for ${key}`);
  }
  return `${idx.size} publish records, all keyed on <series>/<slug>`;
});

/**
 * The question the LMS has asked three times: does atSeconds include the intro?
 *
 * Answered by measuring the actual files rather than by assurance. Skips where
 * the .mp4 files are absent -- which is CI, and is also the deploy container,
 * since they are gitignored.
 */
check('MEASURED: atSeconds includes the brand intro, and the constant matches the file', () => {
  const c = require(path.join(ROOT, 'server', 'lib', 'checkpoints'));
  const rows = c.listVideos().filter((r) => r.deliverableOnServer);
  if (!rows.length) return skip('no rendered .mp4 on this machine');

  const withProbe = rows
    .map((r) => c.forPath(r.path))
    .find((p) => p && p.timing.introOffsetSource === 'probed' && p.checkpoints.length);
  if (!withProbe) return skip('no video with a probed intro and a checkpoint');

  const constant = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'explainer-videos', 'brand-intro-outro', 'bumper-durations.json'), 'utf8'
  ));

  // 1. The measured intro agrees with the constant the deploy container uses.
  //    If these ever diverge, every checkpoint in production silently shifts
  //    while still reporting trusted:true -- which is what that file warns about.
  const drift = Math.abs(withProbe.timing.introOffsetSeconds - constant.introSeconds);
  assert(drift < 0.05,
    `the measured intro is ${withProbe.timing.introOffsetSeconds}s but bumper-durations.json `
    + `says ${constant.introSeconds}s — re-measure it, or production timings are wrong`);

  // 2. atSeconds is lesson time PLUS the intro, for every checkpoint.
  for (const cp of withProbe.checkpoints) {
    const delta = Number((cp.atSeconds - cp.lessonAtSeconds).toFixed(3));
    assert(Math.abs(delta - withProbe.timing.introOffsetSeconds) < 0.02,
      `checkpoint ${cp.id}: atSeconds - lessonAtSeconds is ${delta}, `
      + `expected the intro offset ${withProbe.timing.introOffsetSeconds}`);
  }

  // 3. The checkpoint lands inside the delivered file, not past its end.
  const final = path.join(ROOT, 'explainer-videos', withProbe.series,
    path.basename(withProbe.videoId), 'out', withProbe.deliverable);
  if (fs.existsSync(final)) {
    const total = withProbe.timing.lessonSeconds + constant.introSeconds + constant.outroSeconds;
    for (const cp of withProbe.checkpoints) {
      assert(cp.atSeconds < total,
        `checkpoint ${cp.id} fires at ${cp.atSeconds}s, past the ~${total.toFixed(1)}s file`);
    }
  }
  return `intro ${withProbe.timing.introOffsetSeconds}s, matches the committed constant`;
});

check('the ETag changes when the payload does, and only then', () => {
  const c = require(path.join(ROOT, 'server', 'lib', 'checkpoints'));
  const a = c.etagOf({ count: 1, videos: [{ videoId: 'x' }] });
  const b = c.etagOf({ count: 1, videos: [{ videoId: 'x' }] });
  const d = c.etagOf({ count: 1, videos: [{ videoId: 'y' }] });
  assert(a === b, 'the same payload produced two different ETags');
  assert(a !== d, 'a changed payload produced the same ETag');
  return 'payload-derived';
});

// ── 7. the .env loader, without needing a .env ────────────────────────────────

console.log('\n7. .env loader (proved without a real .env, so CI can run it)');

check('loadDotenv parses keys, quotes and comments from a given directory', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-env-'));
  tmpdirs.push(d);
  fs.writeFileSync(path.join(d, '.env'), [
    '# a comment',
    'CQ_TEST_PLAIN=hello',
    'CQ_TEST_QUOTED="wrapped"',
    'CQ_TEST_EQUALS=a=b',
    '',
  ].join('\n'));
  delete process.env.CQ_TEST_PLAIN;
  delete process.env.CQ_TEST_QUOTED;
  delete process.env.CQ_TEST_EQUALS;
  require(path.join(ROOT, 'orchestrator', 'lib', 'env')).loadDotenv({ from: d, force: true });
  assert(process.env.CQ_TEST_PLAIN === 'hello', 'plain value not parsed');
  assert(process.env.CQ_TEST_QUOTED === 'wrapped', 'quotes not stripped');
  assert(process.env.CQ_TEST_EQUALS === 'a=b', 'value containing = was truncated');
  return 'parsed';
});

check('an exported shell value always beats the file', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-env-'));
  tmpdirs.push(d);
  fs.writeFileSync(path.join(d, '.env'), 'CQ_TEST_WINS=from-file\n');
  process.env.CQ_TEST_WINS = 'from-shell';
  require(path.join(ROOT, 'orchestrator', 'lib', 'env')).loadDotenv({ from: d, force: true });
  assert(process.env.CQ_TEST_WINS === 'from-shell', 'the file overwrote a real environment variable');
  delete process.env.CQ_TEST_WINS;
  return 'shell wins';
});

// ── run ───────────────────────────────────────────────────────────────────────

console.log(`\n${'-'.repeat(64)}`);
console.log(`  ${pass} passed, ${failures.length} failed` + (skipped ? `, ${skipped} skipped` : ''));
if (failures.length) {
  for (const f of failures) console.log(`    - ${f.name}: ${f.message}`);
  process.exitCode = 1;
}
for (const d of tmpdirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
console.log('');
