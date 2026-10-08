'use strict';
/**
 * HTTP tests for the server.
 *
 * WHY THIS FILE EXISTS
 * Until now nothing in this repo made an HTTP request to its own server. The
 * surface that spends money and publishes video to YouTube -- /demo/make-video
 * and everything under it -- had no test of any kind. Auth, ownership, rate
 * limits and the job store are all things you cannot check by reading; they are
 * behaviours of a running request.
 *
 * No framework, matching test-regressions.js: this must run on a machine where
 * `npm i` is one of the things that is broken. Node built-ins only.
 *
 * Nothing here reaches the pipeline. createApp() takes the pipeline as an
 * injected dependency and every test passes a fake, so no test can start a
 * render, call a model, or spend a cent.
 */

const http = require('http');
const assert = require('assert');
const path = require('path');

const { createApp } = require(path.join(__dirname, '..', 'server', 'app'));

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

async function check(name, fn) {
  try {
    report(name, await fn());
  } catch (e) {
    failures.push({ name, message: e.message });
    console.log(`  FAIL  ${name}\n          ${e.message}`);
  }
}

// ── harness ───────────────────────────────────────────────────────────────────

/**
 * Boot an app on an ephemeral port, run a body against it, then put the
 * environment back exactly as it was.
 *
 * listen(0) rather than a fixed port so tests never collide with a dev server
 * someone left running, and never with each other.
 */
let lastPort = null;
const port0 = () => lastPort;

async function withServer(envPatch, opts, fn) {
  const saved = {};
  for (const k of Object.keys(envPatch || {})) {
    saved[k] = process.env[k];
    if (envPatch[k] === undefined) delete process.env[k];
    else process.env[k] = envPatch[k];
  }
  const app = createApp(opts || {});
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  lastPort = port;
  try {
    return await fn(port);
  } finally {
    await new Promise((r) => server.close(r));
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

/** One request. Returns status, headers and a parsed body when it is JSON. */
function req(port, { method = 'GET', path: p = '/', headers = {}, body, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null
      : (typeof body === 'string' ? body : JSON.stringify(body));
    const h = { ...headers };
    if (payload !== null && !h['content-type']) h['content-type'] = 'application/json';
    if (payload !== null) h['content-length'] = Buffer.byteLength(payload);
    if (cookie) h.cookie = cookie;

    const r = http.request({ host: '127.0.0.1', port, method, path: p, headers: h }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch { /* not json, fine */ }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          setCookie: res.headers['set-cookie'] || [],
          text,
          json,
        });
      });
    });
    r.on('error', reject);
    if (payload !== null) r.write(payload);
    r.end();
  });
}

/** Pull one cookie's value out of a Set-Cookie list, for the next request. */
function cookieFrom(setCookie, name) {
  for (const line of setCookie || []) {
    const m = new RegExp(`^${name}=([^;]+)`).exec(line);
    if (m) return `${name}=${m[1]}`;
  }
  return null;
}

// ── a pipeline that spends nothing ────────────────────────────────────────────

/**
 * Stands in for server/lib/one-video.
 *
 * Deliberately synchronous-ish and inert. Tests that care about a particular
 * outcome override one method; the rest exist so a route cannot accidentally
 * reach the real module and start a render.
 */
function fakePipeline(over = {}) {
  return {
    SERIES: 'made',
    write: async (body) => ({
      runId: 'run-test', itemId: `made/${'t-' + (body.topic || 'x').slice(0, 8)}`,
      slug: 't-' + String(body.topic || 'x').slice(0, 8), series: 'made',
      topic: body.topic, title: 'A Test Lesson',
      brief: { slo: 'an outcome', interpretation: 'an interpretation', ali_scenario: 'Ali does a thing' },
      beats: [
        { id: 'b1', mode: 'ali', vo: 'One sentence.' },
        { id: 'b2', mode: 'checkpoint', quiz: { stem: 'Q?', options: ['a', 'b'], answer: 1, explain: 'because' } },
        { id: 'b3', mode: 'scene', vo: 'Another sentence.' },
      ],
      gate: { verdict: 'READY' }, redrafts: 0, dir: '/tmp/nowhere',
    }),
    produce: async () => ({
      runId: 'run-test', itemId: 'made/t-x', slug: 't-x', spendUsd: 1.5,
      qa: { combined_score: 6.1 }, youtube: null, awaitingReview: true,
      artifacts: { produce: {}, qa: {} }, finalPath: null, dir: '/tmp/nowhere',
    }),
    approve: async () => ({ runId: 'run-test', youtube: { url: 'https://youtu.be/zzz', videoId: 'zzz' }, slug: 't-x' }),
    finished: () => [],
    fileForSlug: () => null,
    finishedFile: () => null,
    slugify: (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    ...over,
  };
}

const LMS_TOKEN = 'lms-token-long-enough-for-the-rules';
const LEGACY_TOKEN = 'legacy-token-long-enough-for-rules';
const TENANTS = JSON.stringify([
  { id: 'taleemabad-u', name: 'Taleemabad University LMS', token: LMS_TOKEN, monthlyUsd: 120 },
]);

/** The environment a normal test wants: two credentials, nothing else on. */
const BASE_ENV = {
  CONTENT_API_TOKEN: LEGACY_TOKEN,
  TENANTS_JSON: TENANTS,
  TICK_INTERVAL_MS: '0',
};

// ── 1. tenant auth ────────────────────────────────────────────────────────────

async function authChecks() {
  console.log('\n1. tenant auth on /api/v1 (was: one token meaning "you are us")');

  await check('the legacy CONTENT_API_TOKEN still authorises', () => withServer(BASE_ENV, {}, async (port) => {
    const r = await req(port, { path: '/api/v1/videos', headers: { authorization: `Bearer ${LEGACY_TOKEN}` } });
    assert(r.status === 200, `expected 200, got ${r.status}`);
    return 'backward compatible';
  }));

  await check('a TENANTS_JSON token authorises', () => withServer(BASE_ENV, {}, async (port) => {
    const r = await req(port, { path: '/api/v1/videos', headers: { authorization: `Bearer ${LMS_TOKEN}` } });
    assert(r.status === 200, `expected 200, got ${r.status}`);
    return 'taleemabad-u accepted';
  }));

  await check('a wrong token is 401, and says nothing about how many tenants exist',
    () => withServer(BASE_ENV, {}, async (port) => {
      const r = await req(port, { path: '/api/v1/videos', headers: { authorization: 'Bearer wrong-but-long-enough-to-try' } });
      assert(r.status === 401, `expected 401, got ${r.status}`);
      const body = JSON.stringify(r.json);
      assert(!/taleemabad|default|count|\d+ tenants/i.test(body), `401 body leaks the roster: ${body}`);
      return '401, no roster';
    }));

  await check('no credential configured at all is 503, not 401',
    () => withServer({ ...BASE_ENV, CONTENT_API_TOKEN: undefined, TENANTS_JSON: undefined }, {}, async (port) => {
      const r = await req(port, { path: '/api/v1/videos' });
      assert(r.status === 503, `expected 503, got ${r.status}`);
      assert(r.json.error === 'api_not_configured', `wrong error: ${r.json.error}`);
      return 'misconfigured != unauthorised';
    }));

  await check('the public index needs no token and leaks no token',
    () => withServer(BASE_ENV, {}, async (port) => {
      const r = await req(port, { path: '/api/v1' });
      assert(r.status === 200, `expected 200, got ${r.status}`);
      assert(r.json.configured === true, 'index should report a configured service');
      assert(!r.text.includes(LMS_TOKEN) && !r.text.includes(LEGACY_TOKEN), 'index leaked a token');
      assert(/^\d+\.\d+$/.test(String(r.json.contractVersion)), `index has no contractVersion: ${r.json.contractVersion}`);
      const h = await req(port, { path: '/health' });
      assert(h.json.contractVersion === r.json.contractVersion, '/health and the index disagree on contractVersion');
      return `public, clean, contract ${r.json.contractVersion}`;
    }));

  await check('/health answers without a credential', () => withServer(BASE_ENV, {}, async (port) => {
    const r = await req(port, { path: '/health' });
    assert(r.status === 200, `expected 200, got ${r.status}`);
    // `ok` is computed now (server/lib/health.js), and this test box has no model
    // credential and no budget, so it is honestly false here. The contract is:
    // a boolean, and when false, the reasons -- never a hardcoded true.
    assert(typeof r.json.ok === 'boolean', `ok should be a boolean, got ${JSON.stringify(r.json.ok)}`);
    if (!r.json.ok) assert(Array.isArray(r.json.notOkBecause) && r.json.notOkBecause.length, 'ok:false with no reasons');
    assert(r.json.contractVersion, 'no contractVersion');
    return r.json.ok ? 'ok' : `ok:false (${r.json.notOkBecause.length} reason(s) given)`;
  }));
}

// ── 2. the money holes the LMS reported ──────────────────────────────────────

const fs = require('fs');
const os = require('os');

const storeDirs = [];
function storeEnv() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-http-'));
  storeDirs.push(dir);
  return dir;
}

/** A server with its own private job store, so tests cannot see each other. */
/** A private render directory per test, so nothing a test writes lands in the repo tree. */
function vidsEnv() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-vids-'));
  storeDirs.push(dir);
  return dir;
}

function freshEnv(extra = {}) {
  return {
    ...BASE_ENV,
    JOB_STORE_DIR: storeEnv(),
    // jobs.materializeScript rebuilds beats.js under videoDir() before produce.
    // Without this, a stub-written job in a test lands a real directory in
    // explainer-videos/made/ -- which the catalogue then lists.
    EXPLAINER_VIDEOS_DIR: vidsEnv(),
    OWNER_COOKIE_SECRET: 'a-test-cookie-secret-long-enough-to-sign',
    PIPELINE_MAX_APPROVABLE_USD: '5',
    ...extra,
  };
}

function freshStore(env) {
  return require(path.join(__dirname, '..', 'server', 'lib', 'job-store'))
    .open({ dir: env.JOB_STORE_DIR, env });
}

/** Create a job anonymously and return { jobId, cookie }. */
async function makeJob(port, topic = 'a topic to teach') {
  const r = await req(port, { method: 'POST', path: '/demo/make-video', body: { topic } });
  assert(r.status === 202, `create failed: ${r.status} ${r.text}`);
  return { jobId: r.json.jobId, cookie: cookieFrom(r.setCookie, 'cq_owner'), body: r.json };
}

/** Wait until the fake pipeline's promise has settled the job to `written`. */
async function settle() {
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setImmediate(r));
  }
}

async function moneyChecks() {
  console.log('\n2. /produce and /approve are the calls that spend and publish');

  await check('creating a script still needs no token, and binds a session',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const r = await req(port, { method: 'POST', path: '/demo/make-video', body: { topic: 'how to mark a register' } });
      assert(r.status === 202, `expected 202, got ${r.status}: ${r.text}`);
      assert(cookieFrom(r.setCookie, 'cq_owner'), 'no ownership cookie was set');
      assert(r.json.owner === 'anon', `expected an anon owner, got ${r.json.owner}`);
      return 'free, and owned';
    }); });

  await check('an empty topic is a 400, not a burned attempt that fails minutes later',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const r = await req(port, { method: 'POST', path: '/demo/make-video', body: { topic: '   ' } });
      assert(r.status === 400, `expected 400, got ${r.status}`);
      return '400 up front';
    }); });

  await check('THE HOLE: producing with no token is 401, not 202',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const { jobId, cookie } = await makeJob(port);
      await settle();
      const r = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, cookie });
      assert(r.status === 401, `expected 401, got ${r.status}: ${r.text}`);
      return 'the budget is behind a credential';
    }); });

  await check('THE HOLE: approving with no token is 401, not 202',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const { jobId, cookie } = await makeJob(port);
      await settle();
      const r = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/approve`, cookie });
      assert(r.status === 401, `expected 401, got ${r.status}`);
      return 'the channel is behind a credential';
    }); });

  await check('a leaked jobId alone cannot read the job',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const { jobId, cookie } = await makeJob(port);
      const mine = await req(port, { path: `/demo/make-video/${jobId}`, cookie });
      assert(mine.status === 200, `the owner could not read their own job: ${mine.status}`);
      const stranger = await req(port, { path: `/demo/make-video/${jobId}` });
      assert(stranger.status === 404, `a stranger got ${stranger.status}, expected 404`);
      return 'owner 200, stranger 404';
    }); });

  await check('a non-owner gets 404 identical to a job that never existed (no enumeration oracle)',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const { jobId } = await makeJob(port);
      const real = await req(port, { path: `/demo/make-video/${jobId}` });
      const fake = await req(port, { path: '/demo/make-video/deadbeefdead' });
      assert(real.status === fake.status, `statuses differ: ${real.status} vs ${fake.status}`);
      assert(real.text === fake.text, `bodies differ:\n  ${real.text}\n  ${fake.text}`);
      return 'indistinguishable';
    }); });

  await check('a tenant cannot produce another owner job until it claims it',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const { jobId, cookie } = await makeJob(port);
      await settle();
      const auth = { authorization: `Bearer ${LMS_TOKEN}` };
      const before = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: auth });
      assert(before.status === 404, `expected 404 before claiming, got ${before.status}`);
      const claim = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/claim`, headers: auth, cookie });
      assert(claim.status === 200, `claim failed: ${claim.status} ${claim.text}`);
      const after = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: auth });
      assert(after.status === 202, `expected 202 after claiming, got ${after.status}: ${after.text}`);
      return 'claim transfers, then produce works';
    }); });

  await check('the same Idempotency-Key twice starts one run, not two',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const { jobId, cookie } = await makeJob(port);
      await settle();
      const auth = { authorization: `Bearer ${LMS_TOKEN}` };
      await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/claim`, headers: auth, cookie });
      const h = { ...auth, 'idempotency-key': 'retry-abc-123' };
      const first = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: h, body: {} });
      const second = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: h, body: {} });
      assert(first.status === 202, `first produce: ${first.status} ${first.text}`);
      assert(second.status === 202, `second produce: ${second.status} ${second.text}`);
      assert(second.headers['idempotency-replayed'] === 'true', 'the retry was not marked as a replay');
      return 'replayed, not re-bought';
    }); });

  await check('a repeat produce with no key returns the run in flight, not a 409',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const { jobId, cookie } = await makeJob(port);
      await settle();
      const auth = { authorization: `Bearer ${LMS_TOKEN}` };
      await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/claim`, headers: auth, cookie });
      await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: auth, body: {} });
      const again = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: auth, body: {} });
      assert(again.status === 202, `expected 202, got ${again.status}: ${again.text}`);
      assert(again.json.idempotent === true, 'the response did not say it was the existing run');
      return '202 with the existing run';
    }); });

  await check('a tenant whose month cannot cover this video gets 402, and is told what remains',
    () => {
      const env = freshEnv({
        TENANTS_JSON: JSON.stringify([{ id: 'tiny', name: 'Tiny', token: LMS_TOKEN, monthlyUsd: 0.001 }]),
      });
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
        const { jobId, cookie } = await makeJob(port);
        await settle();
        const auth = { authorization: `Bearer ${LMS_TOKEN}` };
        await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/claim`, headers: auth, cookie });
        const r = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: auth, body: {} });
        assert(r.status === 402, `expected 402, got ${r.status}: ${r.text}`);
        assert(r.json.error === 'tenant_budget_exhausted', `wrong error: ${r.json.error}`);
        assert(typeof r.json.remainingUsd === 'number', 'the refusal did not say what remains');
        return `402, $${r.json.remainingUsd} left`;
      });
    });

  // Production, 2026-09-28: a tenant with no per-run wall reserved the whole $50
  // service ceiling against a $50 month, so $7.93 of earlier spend made a $1.52
  // video a 402. The reservation is now cut to what the month has left.
  await check('a month that can afford the video produces it, with the budget cut to what remains',
    () => {
      const env = freshEnv({
        TENANTS_JSON: JSON.stringify([{ id: 'tiny', name: 'Tiny', token: LMS_TOKEN, monthlyUsd: 1 }]),
      });
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
        const { jobId, cookie } = await makeJob(port);
        await settle();
        const auth = { authorization: `Bearer ${LMS_TOKEN}` };
        await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/claim`, headers: auth, cookie });
        const r = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: auth, body: {} });
        assert(r.status === 202, `a $1 month was refused a video it can afford: ${r.status} ${r.text}`);
        assert(r.json.budgetUsd > 0 && r.json.budgetUsd <= 1, `budget not cut to the month: $${r.json.budgetUsd}`);
        const { capToMonth } = require('../server/lib/ledger');
        assert(capToMonth({ monthlyUsd: 50, spentUsd: 7.93, ceilingUsd: 50, needUsd: 1.52 }).usd === 42.07,
          'the production case ($42.07 left, $1.52 video) is not capped to the month');
        assert(capToMonth({ monthlyUsd: 50, spentUsd: 49.5, ceilingUsd: 50, needUsd: 1.52 }).refused,
          'a video the month cannot cover was not refused');
        assert(capToMonth({ monthlyUsd: undefined, spentUsd: 99, ceilingUsd: 4 }).usd === 4,
          'an unmetered tenant lost its per-run ceiling');
        return `202 at $${r.json.budgetUsd}; $42.07 of $50 reserved in the production case`;
      });
    });

  await check('a 429 carries Retry-After so a client can back off',
    () => {
      const env = freshEnv({ ANON_MAKE_PER_HOUR: '1' });
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
        const first = await req(port, { method: 'POST', path: '/demo/make-video', body: { topic: 'one' } });
        const cookie = cookieFrom(first.setCookie, 'cq_owner');
        const second = await req(port, { method: 'POST', path: '/demo/make-video', body: { topic: 'two' }, cookie });
        assert(second.status === 429, `expected 429, got ${second.status}`);
        assert(second.headers['retry-after'], 'no Retry-After header');
        assert(second.headers['x-ratelimit-limit'] === '1', `wrong limit header: ${second.headers['x-ratelimit-limit']}`);
        return `Retry-After ${second.headers['retry-after']}s`;
      });
    });

  await check('a store that cannot record spend refuses to spend',
    () => {
      const env = freshEnv();
      const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cq-ro-')), 'a-file');
      fs.writeFileSync(f, 'x');
      const broken = require(path.join(__dirname, '..', 'server', 'lib', 'job-store'))
        .open({ dir: path.join(f, 'nope'), env: {} });
      return withServer(env, { oneVideo: fakePipeline(), store: broken }, async (port) => {
        const { jobId, cookie } = await makeJob(port);
        await settle();
        const auth = { authorization: `Bearer ${LMS_TOKEN}` };
        await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/claim`, headers: auth, cookie });
        const r = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: auth, body: {} });
        assert(r.status === 503, `expected 503, got ${r.status}: ${r.text}`);
        assert(r.json.error === 'ledger_unavailable', `wrong error: ${r.json.error}`);
        return 'a limit it cannot record is not a limit';
      });
    });
}

// ── 4. a lesson's bytes, before anyone publishes them ────────────────────────

/**
 * The route the LMS actually integrates against, exercised as a request.
 *
 * Everything covering /file before this was a regex over api.js source. So the
 * handler had never once been called with a real queue item, and the case that
 * matters most -- a lesson whose beats reached the volume but whose mp4 did not --
 * had no coverage at all. It shipped, the LMS hit it, read the 404 as a status
 * gate, and asked us to relax a gate that does not exist. A source-text assertion
 * cannot catch a wrong sentence.
 */
async function lessonFileChecks() {
  console.log('\n4. a blocked lesson can be understood, and a finished one fetched');

  const COURSE = 'course-test1';
  const LESSON = 'fixtures/a-lesson-that-blocked';

  // The queue memoises its store, and job-store is a singleton, so both have to be
  // dropped from the registry before an app is built against a different dir.
  // `offloaded: 'unflagged'` builds the state the backfill script left on
  // production: drive.json on the volume, no saved2drive flag on the queue item.
  // `blockedBy` overrides the fixture's post-render-check block.
  const withCourse = async (fn, { withMp4 = false, scriptGate = false, offloaded = false, blockedBy = null } = {}) => {
    const env = freshEnv({ JOB_STORE_DURABLE: '1' });
    for (const m of ['../../server/lib/job-store', '../lib/queue', '../lib/deliverables']) {
      try { delete require.cache[require.resolve(path.join(__dirname, m))]; } catch { /* fine */ }
    }
    delete require.cache[require.resolve(path.join(__dirname, '..', 'server', 'lib', 'job-store'))];
    delete require.cache[require.resolve(path.join(__dirname, 'lib', 'queue'))];
    delete require.cache[require.resolve(path.join(__dirname, 'lib', 'deliverables'))];
    // course-worker binds `queue` at module load, so a copy left in the cache holds
    // the PREVIOUS fixture's store and answers "No lesson '<id>'" for a lesson that
    // is plainly there. Anything that captures the store at load time has to be
    // dropped alongside it.
    try {
      delete require.cache[require.resolve(path.join(__dirname, '..', 'server', 'lib', 'course-worker'))];
    } catch { /* not loaded yet */ }

    const saved = {};
    for (const k of Object.keys(env)) { saved[k] = process.env[k]; process.env[k] = env[k]; }
    try {
      const queue = require(path.join(__dirname, 'lib', 'queue'));
      const deliverables = require(path.join(__dirname, 'lib', 'deliverables'));
      queue.enqueue({
        topic: 'A lesson that blocked',
        series: 'fixtures',
        slug: 'a-lesson-that-blocked',
        source: 'course-builder',
        notes: `[${COURSE}] a brief`,
      });
      queue.block(LESSON, 'run-fixture-1',
        scriptGate ? 'awaiting script approval' : (blockedBy === 'review' ? 'awaiting human review' : 'the frame gate found problems'),
        scriptGate ? 'script-approval' : (blockedBy || 'post-render-check'));

      // What produce.js copies BEFORE the frame gate: beats and timings, no video.
      // With scriptGate, what stages/script-approval.js copies EARLIER still: the
      // same beats plus the run context, and no video that will ever exist unless
      // somebody reads it.
      const vid = fs.mkdtempSync(path.join(os.tmpdir(), 'vidfix-'));
      const beatsSrc = scriptGate
        ? 'module.exports=[{id:"01",mode:"ali",vo:"Ali opens the shop.",cap:"Monday"},'
          + '{id:"02",mode:"checkpoint",quiz:{stem:"Why?",options:["a","b","c","d"],answer:1,explain:"because"}}];'
        : 'module.exports=[{id:"01"}];';
      fs.writeFileSync(path.join(vid, 'beats.js'), beatsSrc);
      fs.writeFileSync(path.join(vid, 'durations.json'), '{"01":2.5}');
      if (scriptGate) {
        fs.writeFileSync(path.join(vid, 'run-context.json'), JSON.stringify({
          topic: 'A lesson that blocked', research: { brief: 'b' }, gate: { verdict: 'READY' },
        }));
      }
      if (withMp4) fs.writeFileSync(path.join(vid, 'x_final.mp4'), Buffer.alloc(4096, 7));
      deliverables.persist({
        series: 'fixtures',
        slug: 'a-lesson-that-blocked',
        videoDir: vid,
        ...(withMp4 ? { finalPath: path.join(vid, 'x_final.mp4') } : {}),
      });
      if (scriptGate) {
        // The fingerprint the stage records on the durable item -- the value an
        // approval has to name.
        const held = deliverables.findScript('fixtures', 'a-lesson-that-blocked');
        queue.setStatus(LESSON, 'blocked', { scriptSha: deliverables.fingerprint(held.beats) });
      }

      // The state after a Drive offload: the records are on the volume, the beats
      // and timings are still there, and the mp4 is deliberately gone. Built by
      // hand rather than by running the offload, because this suite must not touch
      // the network and the offload's own ordering is covered in test-regressions.
      if (offloaded) {
        const dest = deliverables.dirFor('fixtures', 'a-lesson-that-blocked');
        for (const f of fs.readdirSync(dest)) {
          if (/\.mp4$/i.test(f)) fs.unlinkSync(path.join(dest, f));
        }
        fs.writeFileSync(path.join(dest, 'drive.json'), JSON.stringify({
          saved2drive: true, driveFileId: 'drive-file-1',
          driveUrl: 'https://drive.google.com/file/d/drive-file-1/view',
          driveName: 'fixtures__x_final.mp4', bytes: 4096,
          md5: 'aaaa', sha256: 'bbbb', verified: true, savedAt: '2026-09-24T00:00:00.000Z',
        }));
        fs.writeFileSync(path.join(dest, 'video-meta.json'), JSON.stringify({
          bytes: 4096, md5: 'aaaa', sha256: 'bbbb', durationSeconds: 119.73,
          width: 1920, height: 1080, fps: 30, videoCodec: 'h264',
          pixelFormat: 'yuv420p', audioCodec: 'aac', complete: true,
        }));
        if (offloaded !== 'unflagged') {
          queue.markSavedToDrive(LESSON, {
            driveFileId: 'drive-file-1',
            driveUrl: 'https://drive.google.com/file/d/drive-file-1/view',
            bytes: 4096, verified: true, savedAt: '2026-09-24T00:00:00.000Z',
          });
        }
      }

      // NOTHING IN THIS SUITE MAY START A BUILD. approve, revise and the script
      // gate all call course-worker.kick(), which drains the queue through the REAL
      // spine -- and on 2026-09-24 a script-gate test did exactly that and made two
      // real model calls ($0.73) before it was killed. The routes are what is under
      // test; the worker behind them is covered in test-regressions with a stubbed
      // spine. So the kick is a no-op here, and it is stubbed on the same fresh
      // module instance the routes will resolve, not on a stale one.
      // Stubbed at the SPINE, not at kick(): course-worker's verbs call their own
      // module-local kick(), so replacing the export would not stop them, and
      // approveScript/revise both kick. Neutering execute() is the one place that
      // cannot be routed around.
      const spine = require(path.join(__dirname, 'lib', 'spine'));
      const realExecute = spine.execute;
      spine.execute = async (item) => {
        const q = require(path.join(__dirname, 'lib', 'queue'));
        q.block(item.id, 'run-stub', 'awaiting script approval', 'script-approval');
        return { status: 'blocked' };
      };
      try {
        return await withServer(env, {}, fn);
      } finally {
        spine.execute = realExecute;
        // course-worker.seedFromScript copies the held script back into the render
        // directory -- correct in production, repo dirt here. A suite that leaves
        // untracked files under explainer-videos/ is one `git add .` away from
        // committing a fixture as a real lesson.
        try {
          fs.rmSync(path.join(__dirname, '..', 'explainer-videos', 'fixtures'),
            { recursive: true, force: true });
        } catch { /* nothing to clean */ }
      }
    } finally {
      for (const k of Object.keys(saved)) {
        if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
      }
    }
  };

  const auth = { authorization: `Bearer ${LMS_TOKEN}` };

  // The Drive media endpoint, stood in for. The routes require gdrive lazily and
  // withCourse never evicts it from the cache, so this is the object they see.
  // No test here may reach the network.
  const gdrive = require(path.join(__dirname, 'lib', 'gdrive'));
  const realOpenFileStream = gdrive.openFileStream;
  const DRIVE_BYTES = Buffer.alloc(4096, 7);
  const driveServes = async ({ range }) => {
    const { Readable } = require('stream');
    if (!range) {
      return { status: 200, headers: { 'content-length': '4096', 'content-type': 'video/mp4', 'accept-ranges': 'bytes' }, body: Readable.from([DRIVE_BYTES]) };
    }
    const [, a, b] = /bytes=(\d*)-(\d*)/.exec(range);
    const s = a ? Number(a) : 0;
    const e = b ? Number(b) : 4095;
    if (s > 4095 || s > e) return { status: 416, headers: { 'content-range': 'bytes */4096' }, body: null };
    return { status: 206, headers: { 'content-length': String(e - s + 1), 'content-range': `bytes ${s}-${e}/4096` }, body: Readable.from([DRIVE_BYTES.subarray(s, e + 1)]) };
  };
  const driveFails = (status) => async () => { throw Object.assign(new Error(`Drive media GET failed (HTTP ${status})`), { status }); };

  await check('a lesson blocked before its render says so, instead of "not yet"', () =>
    withCourse(async (port) => {
      const r = await req(port, { path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/file`, headers: auth });
      assert(r.status === 404, `expected 404, got ${r.status}`);
      assert(r.json.error === 'no_deliverable', `wrong error: ${r.text}`);
      // The sentence that cost the LMS a day.
      assert(!/no finished video yet/i.test(r.json.message),
        'it still says "no finished video yet" for a lesson that stopped before its render');
      assert(r.json.renderExists === false, 'renderExists should be false, not absent or true');
      assert(Array.isArray(r.json.partsAvailable) && r.json.partsAvailable.includes('beats.js'),
        'it does not say the beats are there to look at');
      return 'says there is no video and points at what there is';
    }));

  await check('the beats of a blocked lesson can be read without paying for a rebuild', () =>
    withCourse(async (port) => {
      const r = await req(port, { path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/beats`, headers: auth });
      assert(r.status === 200, `expected 200, got ${r.status} ${r.text}`);
      assert(/module\.exports/.test(r.json.beats), 'beats.js did not come back as source');
      assert(r.json.durations && r.json.durations['01'] === 2.5, 'durations did not come back parsed');
      assert(r.json.blockedBy === 'post-render-check', 'the block is not named on the beats view');
      return 'beats as source, durations parsed, and why it stopped';
    }));

  await check('a lesson whose render reached the volume is served', () =>
    withCourse(async (port) => {
      const r = await req(port, { path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/file`, headers: auth });
      assert(r.status === 200, `expected 200, got ${r.status} ${r.text}`);
      assert(/^video\/mp4/.test(r.headers['content-type'] || ''), `wrong type: ${r.headers['content-type']}`);
      assert(Number(r.headers['content-length']) === 4096, `wrong length: ${r.headers['content-length']}`);
      return 'blocked, but the bytes are there and it serves them';
    }, { withMp4: true }));

  // The single-video flow had no Drive branch at all: after a verified offload the
  // render dir and the volume copy are gone by design, and GET .../video answered
  // 404 for a video that exists. Same answer as the course route, now.
  await check('an offloaded single video answers with its Drive link, not a 404', async () => {
    const env = freshEnv({ JOB_STORE_DURABLE: '1' });
    for (const m of [
      path.join(__dirname, '..', 'server', 'lib', 'job-store'),
      path.join(__dirname, 'lib', 'deliverables'),
      path.join(__dirname, '..', 'server', 'lib', 'jobs'),
    ]) { try { delete require.cache[require.resolve(m)]; } catch { /* not loaded */ } }
    const saved = {};
    for (const k of Object.keys(env)) { saved[k] = process.env[k]; process.env[k] = env[k]; }
    try {
      const store = freshStore(env);
      const jobsLib = require(path.join(__dirname, '..', 'server', 'lib', 'jobs'));
      const deliverables = require(path.join(__dirname, 'lib', 'deliverables'));
      // owner.js resolves a tenant token to id `tenant:<tenantId>`.
      const job = jobsLib.create({ topic: 'a video that went to Drive', owner: { kind: 'tenant', id: 'tenant:taleemabad-u' } }, { store });
      jobsLib.transition(job.id, { status: 'awaiting_review', patch: { review: { series: 'made', slug: 'went-to-drive' } } }, { store });
      const dest = deliverables.dirFor('made', 'went-to-drive');
      fs.mkdirSync(dest, { recursive: true });
      fs.writeFileSync(path.join(dest, 'drive.json'), JSON.stringify({
        saved2drive: true, driveFileId: 'drive-mv-1',
        driveUrl: 'https://drive.google.com/file/d/drive-mv-1/view',
        bytes: 2048, md5: 'cccc', verified: true, savedAt: '2026-09-28T00:00:00.000Z',
      }));
      return await withServer(env, { oneVideo: fakePipeline(), store, jobs: jobsLib }, async (port) => {
        const auth = { authorization: `Bearer ${LMS_TOKEN}` };
        // The record, for a caller that asks for it.
        gdrive.openFileStream = driveServes;
        const r = await req(port, { path: `/demo/make-video/${job.id}/video`, headers: { ...auth, accept: 'application/json' } });
        assert(r.status === 200, `expected 200 with the Drive link, got ${r.status} ${r.text}`);
        assert(r.json && r.json.saved2drive === true, `saved2drive not set: ${r.text}`);
        assert(r.json.driveFileId === 'drive-mv-1' && /drive\.google\.com/.test(r.json.driveUrl || ''), `no Drive link: ${r.text}`);
        assert(r.json.verified === true, 'the md5 proof is not reported');
        // The bytes, by default -- the LMS archives these and plays them.
        const v = await req(port, { path: `/demo/make-video/${job.id}/video`, headers: auth });
        assert(v.status === 200 && /^video\/mp4/.test(v.headers['content-type'] || ''), `expected the mp4, got ${v.status} ${v.headers['content-type']}`);
        assert(v.headers['x-served-from'] === 'drive' && v.text.length === 4096, `served ${v.text.length} bytes from ${v.headers['x-served-from']}`);
        // And an honest 503 when Drive cannot be reached, never a 404.
        gdrive.openFileStream = driveFails(500);
        const d = await req(port, { path: `/demo/make-video/${job.id}/video`, headers: auth });
        assert(d.status === 503 && d.json.error === 'drive_unavailable' && d.json.driveFileId === 'drive-mv-1', `expected 503 drive_unavailable, got ${d.status} ${d.text}`);
        // The job record says the video exists, wherever it is.
        const g = await req(port, { path: `/demo/make-video/${job.id}`, headers: auth });
        assert(g.json.deliverableAvailable === true && g.json.videoLocal === false, `deliverableAvailable/videoLocal ${g.json.deliverableAvailable}/${g.json.videoLocal}`);
        return 'JSON on request, bytes by default, 503 when Drive is down';
      });
    } finally {
      gdrive.openFileStream = realOpenFileStream;
      for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
    }
  });

  // OFFLOADED IS NOT MISSING.
  //
  // The whole storage fix rests on deleting our copy once TU's Drive has one. If
  // that read as a 404, every offloaded lesson would look to the LMS exactly like
  // a video that was lost -- which is the failure this service has already had
  // once, and the reason they asked for the fetch route in the first place.
  // AND OFFLOADED IS NOT "GO AND GET IT YOURSELF".
  //
  // 2026-10-05: a course lesson reached review, was offloaded within minutes, and
  // this route answered the LMS with the Drive record instead of the bytes. The
  // LMS archives our bytes to play them before approval; a JSON body read as a
  // broken mp4, and the course view's `deliverableAvailable: false` read as
  // "never made". The Drive file is on a private Shared Drive, so the link in the
  // record was no use to the instructor either. The bytes come back through us.
  await check('an offloaded video is streamed back from Drive, not described', () =>
    withCourse(async (port) => {
      gdrive.openFileStream = driveServes;
      try {
        const p = `/api/v1/courses/${COURSE}/lessons/${LESSON}/file`;
        const r = await req(port, { path: p, headers: auth });
        assert(r.status === 200, `expected 200, got ${r.status} ${r.text.slice(0, 200)}`);
        assert(/^video\/mp4/.test(r.headers['content-type'] || ''), `wrong type: ${r.headers['content-type']}`);
        assert(Number(r.headers['content-length']) === 4096 && r.text.length === 4096, `wrong length: ${r.headers['content-length']} / ${r.text.length}`);
        assert(r.headers['x-served-from'] === 'drive', `x-served-from ${r.headers['x-served-from']}`);
        assert(r.headers['accept-ranges'] === 'bytes', 'Range support not advertised');

        const part = await req(port, { path: p, headers: { ...auth, range: 'bytes=0-3' } });
        assert(part.status === 206, `Range: expected 206, got ${part.status}`);
        assert(part.headers['content-range'] === 'bytes 0-3/4096' && part.text.length === 4, `content-range ${part.headers['content-range']}, ${part.text.length} bytes`);

        const bad = await req(port, { path: p, headers: { ...auth, range: 'bytes=9000-9001' } });
        assert(bad.status === 416 && bad.headers['content-range'] === 'bytes */4096', `unsatisfiable range: ${bad.status} ${bad.headers['content-range']}`);
        return 'bytes, Range 206, 416 passed through';
      } finally { gdrive.openFileStream = realOpenFileStream; }
    }, { withMp4: true, offloaded: true }));

  await check('the Drive record is still there for a caller that asks for JSON', () =>
    withCourse(async (port) => {
      gdrive.openFileStream = driveFails(500); // must not be called at all
      try {
        const p = `/api/v1/courses/${COURSE}/lessons/${LESSON}/file`;
        for (const variant of [{ path: p, headers: { ...auth, accept: 'application/json' } }, { path: `${p}?format=json`, headers: auth }]) {
          const r = await req(port, variant);
          assert(r.status === 200, `expected 200, got ${r.status} ${r.text.slice(0, 200)}`);
          assert(r.json.saved2drive === true, `saved2drive not set: ${r.text}`);
          assert(r.json.driveFileId === 'drive-file-1', `wrong file id: ${r.text}`);
          assert(/^https:\/\/drive\.google\.com\//.test(r.json.driveUrl || ''), `no drive url: ${r.text}`);
          assert(r.json.verified === true, 'the byte-for-byte check is not reported');
          // The attributes have to outlive the bytes, or "what was this video?"
          // becomes unanswerable the moment we reclaim the disk.
          assert(r.json.video && r.json.video.width === 1920 && r.json.video.durationSeconds === 119.73,
            `the measured attributes did not survive the offload: ${r.text}`);
          assert(r.json.blockedBy === 'post-render-check' && !r.json.error, `status fields: ${r.text}`);
        }
        return 'Accept: application/json and ?format=json both answer the record';
      } finally { gdrive.openFileStream = realOpenFileStream; }
    }, { withMp4: true, offloaded: true }));

  await check('when Drive cannot be reached the answer is 503 with the record, never 404', () =>
    withCourse(async (port) => {
      gdrive.openFileStream = driveFails(403);
      try {
        const r = await req(port, { path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/file`, headers: auth });
        assert(r.status === 503, `expected 503, got ${r.status} ${r.text.slice(0, 200)}`);
        assert(r.json.error === 'drive_unavailable' && r.json.driveStatus === 403, `body: ${r.text.slice(0, 200)}`);
        assert(r.json.driveFileId === 'drive-file-1' && r.json.saved2drive === true, 'the record must ride along so a person can still find the file');
        assert(/could not be fetched/.test(r.json.message), `message does not explain: ${r.json.message}`);
        return '503 drive_unavailable with driveStatus and the record';
      } finally { gdrive.openFileStream = realOpenFileStream; }
    }, { withMp4: true, offloaded: true }));

  await check('a HEAD on an offloaded video is answered from the record without touching Drive', () =>
    withCourse(async (port) => {
      gdrive.openFileStream = driveFails(500);
      try {
        const r = await req(port, { method: 'HEAD', path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/file`, headers: auth });
        assert(r.status === 200, `expected 200, got ${r.status}`);
        assert(/^video\/mp4/.test(r.headers['content-type'] || '') && Number(r.headers['content-length']) === 4096, `headers: ${JSON.stringify(r.headers)}`);
        return 'HEAD 200 from the record';
      } finally { gdrive.openFileStream = realOpenFileStream; }
    }, { withMp4: true, offloaded: true }));

  await check('a review-blocked lesson with nothing held is not told it never rendered', () =>
    withCourse(async (port) => {
      const r = await req(port, { path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/file`, headers: auth });
      assert(r.status === 404 && r.json.error === 'no_deliverable', `expected 404 no_deliverable, got ${r.status} ${r.text.slice(0, 200)}`);
      assert(r.json.renderExists === true, 'a lesson parked at review has a finished render by definition');
      assert(!/never was one|stopped before a video was rendered/i.test(r.json.message), `wrong explanation: ${r.json.message}`);
      return 'renderExists true, asks us to look rather than blaming the render';
    }, { blockedBy: 'review' }));

  await check('the questions still work after the video is offloaded', () =>
    withCourse(async (port) => {
      // The reason beats.js and durations.json are never reclaimed: checkpoints and
      // the catalogue row are recomputed from them per request. If the offload ever
      // takes them, videos play and cannot be answered.
      const r = await req(port, { path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/beats`, headers: auth });
      assert(r.status === 200, `expected 200, got ${r.status} ${r.text}`);
      assert(/module\.exports/.test(r.json.beats), 'beats.js did not survive the offload');
      assert(r.json.durations && r.json.durations['01'] === 2.5, 'durations did not survive the offload');
      return 'beats and timings outlive the bytes';
    }, { withMp4: true, offloaded: true }));

  await check('the course view carries the Drive link so nothing has to be fetched to find it', () =>
    withCourse(async (port) => {
      const r = await req(port, { path: `/api/v1/courses/${COURSE}`, headers: auth });
      assert(r.status === 200, `expected 200, got ${r.status} ${r.text}`);
      const item = (r.json.items || []).find((i) => i.id === LESSON);
      assert(item, `the fixture lesson is not in the course: ${r.text}`);
      assert(item.saved2drive === true, `saved2drive missing from the course view: ${JSON.stringify(item)}`);
      assert(item.driveUrl && item.driveFileId === 'drive-file-1', 'the Drive link is not on the course view');
      // The contract says deliverableAvailable means "GET /file will serve bytes
      // right now". Since the route streams the Drive copy, that is TRUE after an
      // offload. It used to be false, and the LMS read false as "never made".
      assert(item.deliverableAvailable === true,
        'deliverableAvailable must be true: /file serves the bytes from Drive');
      assert(item.videoLocal === false, 'videoLocal must say the bytes are not on the volume');
      return 'deliverableAvailable true, videoLocal false, Drive link beside them';
    }, { withMp4: true, offloaded: true }));

  await check('the course view reads the Drive record off the volume when the queue flag is missing', () =>
    withCourse(async (port) => {
      // Production 2026-10-05: lessons offloaded by the backfill script, or already
      // on Drive when their run ended, had drive.json but no saved2drive on the item.
      const r = await req(port, { path: `/api/v1/courses/${COURSE}`, headers: auth });
      const item = (r.json.items || []).find((i) => i.id === LESSON);
      assert(item && item.saved2drive === true && item.driveFileId === 'drive-file-1' && /drive\.google\.com/.test(item.driveUrl || ''),
        `Drive facts missing without the flag: ${JSON.stringify(item)}`);
      assert(item.deliverableAvailable === true && item.videoLocal === false, 'availability wrong without the flag');
      return 'drive.json alone is enough';
    }, { withMp4: true, offloaded: 'unflagged' }));

  await check('the capacity view separates metadata from video bytes', () =>
    withCourse(async (port) => {
      const r = await req(port, { path: '/api/v1/deliverables', headers: auth });
      assert(r.status === 200, `expected 200, got ${r.status} ${r.text}`);
      assert(r.json.offloadedCount === 1, `offloadedCount wrong: ${r.text}`);
      assert(r.json.videoBytes === 0, `videoBytes should be 0 once reclaimed: ${r.text}`);
      assert(r.json.localVideoCount === 0, `localVideoCount wrong: ${r.text}`);
      assert(r.json.bytes > 0, 'the metadata we deliberately kept is not counted');
      return 'offloaded counted, video bytes reclaimed, metadata still held';
    }, { withMp4: true, offloaded: true }));

  await check('the course view says whether the bytes are fetchable, so nothing is inferred', () =>
    withCourse(async (port) => {
      const r = await req(port, { path: `/api/v1/courses/${COURSE}`, headers: auth });
      assert(r.status === 200, `expected 200, got ${r.status} ${r.text}`);
      const item = (r.json.items || []).find((i) => i.id === LESSON);
      assert(item, `the fixture lesson is not in the course: ${r.text}`);
      // The point of the field: blockedBy is 'post-render-check' in BOTH fixtures,
      // and the answer differs. A rule mapping blockedBy to "fetchable" is wrong.
      assert(item.blockedBy === 'post-render-check', `wrong blockedBy: ${item.blockedBy}`);
      assert(item.deliverableAvailable === false,
        'deliverableAvailable should be false when only beats are on the volume');
      assert(item.videoLocal === false, 'videoLocal should be false when only beats are on the volume');
      return 'false for a beats-only lesson whose blockedBy says post-render-check';
    }));

  await check('deliverableAvailable is true once the mp4 is there', () =>
    withCourse(async (port) => {
      const r = await req(port, { path: `/api/v1/courses/${COURSE}`, headers: auth });
      const item = (r.json.items || []).find((i) => i.id === LESSON);
      assert(item && item.deliverableAvailable === true,
        'the mp4 is on the volume but the course view says it is not fetchable');
      assert(item.videoLocal === true, 'videoLocal should be true with the mp4 on the volume');
      const f = await req(port, { path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/file`, headers: auth });
      assert(f.headers['x-served-from'] === 'volume', `local bytes must say so: ${f.headers['x-served-from']}`);
      return 'true for the same blockedBy, once the bytes exist';
    }, { withMp4: true }));

  // ── the script gate (contract 1.2) ──────────────────────────────────────────

  await check('the script of a waiting lesson can be read, and it names itself', () =>
    withCourse(async (port) => {
      const r = await req(port, { path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/script`, headers: auth });
      assert(r.status === 200, `expected 200, got ${r.status} ${r.text}`);
      assert(r.json.awaitingApproval === true, 'the script view does not say it is waiting');
      assert(r.json.sha && r.json.sha.length === 16, `no usable sha: ${r.json.sha}`);
      // The spoken line AND what is on screen: the half of a script that decides
      // whether a frame is worth watching.
      const b1 = r.json.beats.find((b) => b.id === '01');
      assert(b1 && b1.vo === 'Ali opens the shop.' && b1.cap === 'Monday',
        `the beat did not survive the projection: ${JSON.stringify(b1)}`);
      // The checkpoint is lifted out, because a reader judges it separately -- it
      // is the one thing in the video a learner cannot skip.
      assert(r.json.checkpoint && r.json.checkpoint.answer === 1, 'the checkpoint is not shown');
      assert(r.json.checkpointAfterBeat === '02', 'the pause point is not named');
      return 'beats, on-screen words, the checkpoint, and a sha to quote';
    }, { scriptGate: true }));

  await check('the script also comes back as markdown a person can read', () =>
    withCourse(async (port) => {
      const r = await req(port, { path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/script.md`, headers: auth });
      assert(r.status === 200, `expected 200, got ${r.status}`);
      assert(/^text\/markdown/.test(r.headers['content-type'] || ''), `wrong type: ${r.headers['content-type']}`);
      assert(/Ali opens the shop\./.test(r.text), 'the spoken line is missing');
      assert(/caption: "Monday"/.test(r.text), 'what is on screen is missing');
      assert(/Script id:/.test(r.text), 'the reader is not told which script they are approving');
      return 'the same script, rendered for a human';
    }, { scriptGate: true }));

  await check('a lesson with no script yet says so, rather than 404ing blankly', () =>
    withCourse(async (port) => {
      // The ordinary fixture blocked at post-render-check and has beats, so use a
      // lesson that never wrote one at all.
      const r = await req(port, { path: `/api/v1/courses/${COURSE}/lessons/fixtures/nope/script`, headers: auth });
      assert(r.status === 404, `expected 404, got ${r.status}`);
      assert(r.json.error === 'no_such_lesson', `wrong error: ${r.text}`);
      return 'an unknown lesson is an unknown lesson, not an empty script';
    }, { scriptGate: true }));

  await check('an approval must quote the script it approves', () =>
    withCourse(async (port) => {
      const read = await req(port, { path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/script`, headers: auth });
      const sha = read.json.sha;

      const none = await req(port, { method: 'POST', headers: auth,
        path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/script/approve`, body: { by: 'aroma' } });
      assert(none.status === 409 && none.json.error === 'cannot_approve_script',
        `an approval with no sha was accepted: ${none.status} ${none.text}`);

      const wrong = await req(port, { method: 'POST', headers: auth,
        path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/script/approve`,
        body: { by: 'aroma', sha: 'deadbeefdeadbeef' } });
      assert(wrong.status === 409, `an approval naming another script was accepted: ${wrong.text}`);

      const ok = await req(port, { method: 'POST', headers: auth,
        path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/script/approve`,
        body: { by: 'aroma', sha } });
      assert(ok.status === 202 && ok.json.sha === sha, `the right sha was refused: ${ok.status} ${ok.text}`);
      return 'no sha and a wrong sha refused, the right one accepted';
    }, { scriptGate: true }));

  await check('a revision needs notes, and says what it costs', () =>
    withCourse(async (port) => {
      const empty = await req(port, { method: 'POST', headers: auth,
        path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/script/revise`, body: { by: 'aroma' } });
      assert(empty.status === 409 && empty.json.error === 'cannot_revise_script',
        `an empty revision was accepted: ${empty.status} ${empty.text}`);

      const r = await req(port, { method: 'POST', headers: auth,
        path: `/api/v1/courses/${COURSE}/lessons/${LESSON}/script/revise`,
        body: { by: 'aroma', why: 'too abstract -- put Ali in the shop' } });
      assert(r.status === 202 && r.json.round === 1, `revision refused: ${r.status} ${r.text}`);
      assert(/no media has been bought/.test(r.json.note), 'the reply does not say it is free of media');
      return 'empty refused, notes accepted, the cost stated';
    }, { scriptGate: true }));

  await check('the course view says a script is ready to read without a fetch', () =>
    withCourse(async (port) => {
      const r = await req(port, { path: `/api/v1/courses/${COURSE}`, headers: auth });
      const item = (r.json.items || []).find((i) => i.id === LESSON);
      assert(item.blockedBy === 'script-approval', `wrong blockedBy: ${item.blockedBy}`);
      assert(item.scriptAvailable === true, 'the course view does not say the script is readable');
      assert(item.scriptSha, 'the course view does not carry the sha');
      // And the older field still tells the truth: there is no video, and there
      // will not be one until somebody reads this.
      assert(item.deliverableAvailable === false,
        'a lesson waiting on its script claims a fetchable video');
      return 'scriptAvailable true, deliverableAvailable false, both facts';
    }, { scriptGate: true }));

  await check('a plan that lost a lesson objective is refused before anything is reserved', () =>
    { const env = freshEnv();
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async () => {
        const queue = require(path.join(__dirname, 'lib', 'queue'));
        require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
        queue.resetPathCache();
        // The plan is meant to be EDITED by an instructor before it is built. An
        // edit that drops an SLO must fail loudly here rather than quietly build a
        // video about nothing in particular.
        const broken = { title: 'T', modules: [{ title: 'M', lessons: [
          { title: 'Lesson one', brief: 'b1' },
        ] }] };
        const r = await req(port0(), { method: 'POST', path: '/api/v1/courses/build',
          headers: { authorization: `Bearer ${LMS_TOKEN}` },
          body: { plan: broken, confirmLessons: 1, series: 'testing' } });
        assert(r.status === 400 && r.json.error === 'invalid_plan', `expected invalid_plan, got ${r.status} ${r.text}`);
        assert(r.json.errors.some((e) => /slo/.test(e.path)), `the missing SLO is not named: ${r.text}`);
        assert(queue.currentItems().filter((i) => i.source === 'course-builder').length === 0,
          'a refused plan still queued lessons');
        return 'refused, the field named, nothing queued';
      }); });

  await check('the file routes are listed on the index we told them to pin to', () =>
    withServer(BASE_ENV, {}, async (port) => {
      const r = await req(port, { path: '/api/v1', headers: auth });
      const paths = (r.json.endpoints || []).map((e) => `${e.method} ${e.path}`);
      for (const want of [
        'GET /api/v1/courses/:courseId/lessons/:lessonId/file',
        'DELETE /api/v1/courses/:courseId/lessons/:lessonId/file',
        'GET /api/v1/courses/:courseId/lessons/:lessonId/beats',
      ]) {
        assert(paths.includes(want), `the index does not list ${want} -- they cannot detect it`);
      }
      return `${paths.length} endpoints, including the file routes`;
    }));
}

// ── 3. the bridge, listing and callbacks ─────────────────────────────────────

async function bridgeChecks() {
  console.log('\n3. the job names its catalogue key, and jobs can be listed');

  await check('/demo/jobs is tenant-scoped and needs a token',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const anon = await req(port, { path: '/demo/jobs' });
      assert(anon.status === 401, `expected 401 without a token, got ${anon.status}`);
      const auth = { authorization: `Bearer ${LMS_TOKEN}` };
      const mine = await req(port, { path: '/demo/jobs', headers: auth });
      assert(mine.status === 200, `expected 200, got ${mine.status}`);
      assert(Array.isArray(mine.json.jobs), 'no jobs array');
      return `${mine.json.count} jobs`;
    }); });

  await check('a written job already names the slug its checkpoints will be under',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const { jobId, cookie } = await makeJob(port, 'how to mark a register');
      await settle();
      const r = await req(port, { path: `/demo/make-video/${jobId}`, cookie });
      assert(r.status === 200, `expected 200, got ${r.status}`);
      assert(r.json.catalogue, 'no catalogue key on the job');
      assert(r.json.catalogue.videoId, 'no videoId');
      assert(/\/api\/v1\/videos\/.+\/checkpoints$/.test(r.json.catalogue.checkpointsUrl),
        `wrong checkpoints url: ${r.json.catalogue.checkpointsUrl}`);
      return r.json.catalogue.videoId;
    }); });

  await check('a callbackUrl to a metadata address is refused',
    () => {
      const env = freshEnv({ WEBHOOK_ALLOWED_HOSTS: 'hooks.example.edu' });
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
        const auth = { authorization: `Bearer ${LMS_TOKEN}` };
        const bad = await req(port, {
          method: 'POST', path: '/demo/make-video', headers: auth,
          body: { topic: 'x', callbackUrl: 'http://169.254.169.254/latest/meta-data/' },
        });
        assert(bad.status === 400, `expected 400, got ${bad.status}: ${bad.text}`);
        const good = await req(port, {
          method: 'POST', path: '/demo/make-video', headers: auth,
          body: { topic: 'x', callbackUrl: 'https://hooks.example.edu/cq' },
        });
        assert(good.status === 202, `an allowlisted host was refused: ${good.status} ${good.text}`);
        return 'metadata refused, allowlisted accepted';
      });
    });

  await check('an anonymous caller may not register a callbackUrl',
    () => {
      const env = freshEnv({ WEBHOOK_ALLOWED_HOSTS: 'hooks.example.edu' });
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
        const r = await req(port, {
          method: 'POST', path: '/demo/make-video',
          body: { topic: 'x', callbackUrl: 'https://hooks.example.edu/cq' },
        });
        assert(r.status === 401, `expected 401, got ${r.status}`);
        return 'outbound requests need a named caller';
      });
    });

  await check('the catalogue tells the LMS whether a row is safe to link to',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const r = await req(port, { path: '/api/v1/videos', headers: { authorization: `Bearer ${LMS_TOKEN}` } });
      assert(r.status === 200, `expected 200, got ${r.status}`);
      if (!r.json.count) return skip('no videos with checkpoints on this machine');
      for (const row of r.json.videos) {
        assert(['committed', 'ephemeral', 'unknown'].includes(row.durability),
          `row ${row.path} has no usable durability`);
        assert('youtube' in row, `row ${row.path} carries no youtube field`);
        assert(row.catalogueUpdatedAt, `row ${row.path} has no catalogueUpdatedAt`);
      }
      return `${r.json.count} rows, all classified`;
    }); });

  // The LMS found a checkpoint reporting pausesVideo:false alongside requiresAnswer:true
  // and allowSkip:false. Those cannot both be honoured -- if the player never stops,
  // there is no moment at which an answer can be required -- so every consumer had to
  // guess which field won. A question the video draws for itself gates nothing.
  await check('a question that never pauses never claims to require an answer',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const auth = { authorization: `Bearer ${LMS_TOKEN}` };
      const list = await req(port, { path: '/api/v1/videos', headers: auth });
      assert(list.status === 200, `expected 200, got ${list.status}`);
      if (!list.json.count) return skip('no videos with checkpoints on this machine');
      let onScreen = 0; let popup = 0;
      for (const row of list.json.videos) {
        const r = await req(port, { path: `/api/v1/videos/${row.videoId}/checkpoints`, headers: auth });
        assert(r.status === 200, `${row.videoId}: expected 200, got ${r.status}`);
        for (const c of r.json.checkpoints) {
          if (c.pausesVideo === false) {
            onScreen++;
            assert(c.requiresAnswer === false && c.blocking === false && c.allowSkip === true,
              `${row.videoId}/${c.id} does not pause but still demands an answer`);
            assert(typeof c.onScreenUntilSeconds === 'number',
              `${row.videoId}/${c.id} does not pause and does not say how long it is legible`);
          } else {
            popup++;
            assert(c.requiresAnswer === true && c.blocking === true && c.allowSkip === false,
              `${row.videoId}/${c.id} pauses but does not gate -- the learner can skip past it`);
          }
        }
      }
      return `${popup} gating, ${onScreen} drawn on screen, none contradictory`;
    }); });

  // The old body told every caller the queue was not durable and pointed at a
  // "technical handoff" they had never been sent -- so an unknown courseId and a
  // course genuinely lost to a redeploy read identically.
  await check('an unknown course reports durability instead of assuming the worst',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const r = await req(port, { path: '/api/v1/courses/course-nope', headers: { authorization: `Bearer ${LMS_TOKEN}` } });
      assert(r.status === 404, `expected 404, got ${r.status}`);
      assert(!/not durable across/.test(JSON.stringify(r.json)),
        'still claims the queue is not durable, and still cites a handoff nobody was sent');
      assert(['volume', 'container', 'ephemeral', 'memory'].includes(r.json.durability),
        `no usable durability on the 404: ${r.json.durability}`);
      const h = await req(port, { path: '/health' });
      assert(h.json.courses && h.json.courses.durability === r.json.durability,
        'the 404 and /health disagree about where course state lives');
      return `404 with durability: ${r.json.durability}`;
    }); });

  // The projection kept only id/topic/status/module, so queue.fail() wrote the
  // reason durably and this endpoint threw it away one step later: a lesson that
  // failed said only "failed", and nobody could tell an instructor anything or
  // judge whether re-running was sensible. The LMS asked for this by name.
  // An LMS authorises `lessons x estimate` before calling us and had nothing to
  // settle against: /demo/spend is built from JOB records and a course creates queue
  // items, so it structurally cannot see a course and reports 0. Theirs held $1.50
  // for a lesson that really cost $0.598.
  await check('a course can be reconciled against what it actually spent',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const queue = require(path.join(__dirname, 'lib', 'queue'));
      require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
      queue.resetPathCache();
      const tag = '[course-spend]';
      for (const slug of ['cheap', 'retried']) {
        queue.enqueue({ topic: slug, series: 'testing', slug, source: 'course-builder', notes: `${tag} brief` });
      }
      queue.done('testing/cheap', 'run-1', {}, 0.598);
      // Failed once, then rebuilt. The instructor paid for both attempts.
      queue.fail('testing/retried', 'run-2', 'died in produce', 0.25);
      queue.done('testing/retried', 'run-3', {}, 0.40);

      const r = await req(port, { path: '/api/v1/courses/course-spend', headers: { authorization: `Bearer ${LMS_TOKEN}` } });
      assert(r.status === 200, `expected 200, got ${r.status} ${r.text}`);
      const byId = Object.fromEntries(r.json.items.map((i) => [i.id, i]));

      assert(byId['testing/cheap'].spendUsd === 0.598,
        `this run's cost is wrong: ${byId['testing/cheap'].spendUsd}`);
      // The retried lesson cost both attempts, not just the one that worked --
      // keeping only the last would silently forget every failed attempt's spend.
      assert(byId['testing/retried'].spendUsd === 0.40,
        `last attempt should be 0.40, got ${byId['testing/retried'].spendUsd}`);
      assert(byId['testing/retried'].spendUsdTotal === 0.65,
        `lesson total should be 0.65 across both attempts, got ${byId['testing/retried'].spendUsdTotal}`);
      assert(r.json.spentUsd === 1.248, `course total should be 1.248, got ${r.json.spentUsd}`);
      return 'per-run, per-lesson and per-course all settle';
    }); });

  await check('a course says WHY a lesson failed or is waiting, not just that it did',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const queue = require(path.join(__dirname, 'lib', 'queue'));
      require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
      queue.resetPathCache();
      const tag = '[course-test1]';
      for (const slug of ['broke', 'waiting', 'retried']) {
        queue.enqueue({ topic: slug, series: 'testing', slug, source: 'course-builder', notes: `${tag} brief` });
      }
      // Derived, not typed: this used to hardcode "4.9" in both the fixture and the
      // assertion below, so it proved only that a string survives the fold -- it
      // would have kept passing with the bar set to anything at all.
      const { THRESHOLD } = require('./lib/stages/qa');
      queue.fail('testing/broke', 'run-a', `QA scored 3.8, below the ${THRESHOLD} threshold`);
      queue.block('testing/waiting', 'run-b', 'awaiting human review');
      // Failed once, then rebuilt and finished. currentItems() is a shallow fold
      // that never deletes a key, so the first attempt's `error` is still on the
      // item -- reporting it would describe a lesson by a failure it moved past.
      queue.fail('testing/retried', 'run-c', 'a transient render crash');
      queue.done('testing/retried', 'run-d', {});

      const r = await req(port, { path: '/api/v1/courses/course-test1', headers: { authorization: `Bearer ${LMS_TOKEN}` } });
      assert(r.status === 200, `expected 200, got ${r.status} ${r.text}`);
      const byId = Object.fromEntries(r.json.items.map((i) => [i.id, i]));

      assert(byId['testing/broke'].error && byId['testing/broke'].error.includes(`below the ${THRESHOLD} threshold`),
        'a failed lesson still reports no error, so the LMS cannot say why');
      assert(/awaiting human review/.test(byId['testing/waiting'].reason || ''),
        'a blocked lesson reports no reason');
      assert(!byId['testing/retried'].error,
        'a rebuilt lesson still carries the error from an attempt it has moved past');

      // runId is the only handle tying a lesson to what it cost.
      assert(byId['testing/broke'].runId === 'run-a', 'no runId, so a lesson cannot be reconciled against spend');

      // A lesson waiting on a person is not work in flight.
      assert(r.json.blocked === 1, `expected blocked: 1, got ${r.json.blocked}`);
      assert(r.json.inProgress === 0, `a blocked lesson is counted as in progress (${r.json.inProgress})`);
      assert(r.json.awaitingApproval.length === 1, 'awaitingApproval does not carry the waiting lesson');
      return 'error, reason and runId all survive the projection';
    }); });

  // A finished lesson knew it had succeeded and could not say what it had made,
  // so an LMS holding an empty content block for it had nothing to put in there
  // and a person copied video links by eye. The join key is not reconstructed
  // from series + slug: the queue item's id IS the catalogue path.
  await check('a finished lesson says which video it is',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const queue = require(path.join(__dirname, 'lib', 'queue'));
      require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
      queue.resetPathCache();
      const tag = '[course-test-path]';
      for (const slug of ['published', 'stopped-early', 'still-going']) {
        queue.enqueue({ topic: slug, series: 'testing', slug, source: 'course-builder', notes: `${tag} brief` });
      }
      // Courses stop after `upload` (config.js:80), so a finished course lesson
      // carries the upload artifact and already knows its own URL.
      queue.done('testing/published', 'run-p', {
        produce: { dir: '/somewhere/testing/published' },
        upload: { url: 'https://youtu.be/abc123XYZ_1', videoId: 'abc123XYZ_1', privacyStatus: 'unlisted' },
      });
      // A run configured to stop before upload still resolves through `path`.
      queue.done('testing/stopped-early', 'run-q', { produce: { dir: '/somewhere' } });

      const r = await req(port, { path: '/api/v1/courses/course-test-path', headers: { authorization: `Bearer ${LMS_TOKEN}` } });
      assert(r.status === 200, `expected 200, got ${r.status} ${r.text}`);
      const byId = Object.fromEntries(r.json.items.map((i) => [i.id, i]));

      assert(byId['testing/published'].path === 'testing/published',
        `a done lesson does not carry its catalogue path: ${JSON.stringify(byId['testing/published'])}`);
      assert(byId['testing/published'].youtubeVideoId === 'abc123XYZ_1',
        'a done lesson does not carry the video id the upload stage already recorded');
      assert(byId['testing/published'].youtube === 'https://youtu.be/abc123XYZ_1',
        'a done lesson does not carry its YouTube URL');

      assert(byId['testing/stopped-early'].path === 'testing/stopped-early',
        'a lesson that stopped before upload lost its path too');
      assert(!('youtube' in byId['testing/stopped-early']),
        'a lesson that never uploaded claims a YouTube URL');

      // Gated on done for the same reason error and reason are: the fold never
      // deletes a key, and an unfinished lesson has not produced anything yet.
      assert(!('path' in byId['testing/still-going']),
        'an unfinished lesson already claims to be a video');
      return 'path, youtube and youtubeVideoId, on done lessons only';
    }); });

  // `blocked` meant two things -- "a person should watch this" and "a post-render
  // judge flagged the finished video" -- with only free prose to tell them apart,
  // and a caller with one Approve button invited someone to publish past a real
  // finding without registering that anything had been flagged.
  await check('a blocked lesson says which kind of blocked it is',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const queue = require(path.join(__dirname, 'lib', 'queue'));
      require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
      queue.resetPathCache();
      const tag = '[course-test-blocked]';
      for (const slug of ['waiting', 'flagged', 'legacy']) {
        queue.enqueue({ topic: slug, series: 'testing', slug, source: 'course-builder', notes: `${tag} brief` });
      }
      queue.block('testing/waiting', 'run-a', 'awaiting human review', 'review');
      queue.block('testing/flagged', 'run-b', 'eval-text.js needs a human decision', 'post-render-check');
      // Blocked before this field existed: it must read as the ordinary case
      // rather than as nothing, or every pre-existing lesson changes meaning.
      queue.setStatus('testing/legacy', queue.ITEM_STATUS.BLOCKED, { runId: 'run-c', reason: 'old' });

      const r = await req(port, { path: '/api/v1/courses/course-test-blocked', headers: { authorization: `Bearer ${LMS_TOKEN}` } });
      const byId = Object.fromEntries(r.json.items.map((i) => [i.id, i]));
      assert(byId['testing/waiting'].blockedBy === 'review',
        `waiting-for-review is not marked as such: ${byId['testing/waiting'].blockedBy}`);
      assert(byId['testing/flagged'].blockedBy === 'post-render-check',
        `a flagged render reads as ${byId['testing/flagged'].blockedBy}, so a UI cannot warn about it`);
      assert(byId['testing/legacy'].blockedBy === 'review',
        'a lesson blocked before the field existed lost its meaning');

      const waiting = r.json.awaitingApproval.find((l) => l.id === 'testing/flagged');
      assert(waiting && waiting.blockedBy === 'post-render-check',
        'awaitingApproval still offers a flagged video as plain "ready for you"');
      return 'review vs post-render-check, defaulting to review';
    }); });

  // One lesson failing does not make the other nine wrong, and rebuilding the
  // course is not the workaround it looks like: enqueue() rejects the duplicate
  // slugs, so it would buy fresh videos for the ones that already worked.
  await check('one failed lesson can be retried, and nothing else can',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const queue = require(path.join(__dirname, 'lib', 'queue'));
      require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
      queue.resetPathCache();
      const tag = '[course-test-requeue]';
      for (const slug of ['broke', 'waiting', 'elsewhere']) {
        queue.enqueue({ topic: slug, series: 'testing', slug, source: 'course-builder',
          notes: slug === 'elsewhere' ? '[course-other] brief' : `${tag} brief` });
      }
      queue.fail('testing/broke', 'run-a', 'a transient render crash');
      queue.block('testing/waiting', 'run-b', 'awaiting human review', 'review');
      queue.fail('testing/elsewhere', 'run-c', 'also broke');

      const post = (lesson, course = 'course-test-requeue') => req(port, {
        method: 'POST',
        path: `/api/v1/courses/${course}/lessons/${lesson}/requeue`,
        headers: { authorization: `Bearer ${LMS_TOKEN}` },
        body: { by: 'test' },
      });

      // Only the REFUSALS are exercised here, deliberately. A successful requeue
      // kicks the worker, and the worker runs the real spine -- a test that took
      // the happy path spent minutes of real model calls inside `npm test`. The
      // clearing a requeue does is checked in test-regressions.js against
      // queue.requeue() directly, where nothing can start building.

      // A retry buys another render. A lesson merely waiting for a person must
      // not be re-runnable through this door.
      const no = await post('testing/waiting');
      assert(no.status === 409, `a lesson waiting for review was retried anyway: ${no.status}`);
      assert(/not failed/.test(JSON.stringify(no.json)), 'the refusal does not say why');
      assert(queue.get('testing/waiting').status === 'blocked', 'a lesson waiting for a person was moved');

      // The lessonId alone used to be enough to act on any lesson through any course.
      const wrongCourse = await post('testing/elsewhere');
      assert(wrongCourse.status === 409,
        `a lesson from another course was retried through this one: ${wrongCourse.status}`);
      assert(queue.get('testing/elsewhere').status === 'failed', 'a lesson from another course was moved');

      // Same door, same rule, for the two that were already there.
      const rejectElsewhere = await req(port, {
        method: 'POST',
        path: '/api/v1/courses/course-test-requeue/lessons/testing/elsewhere/reject',
        headers: { authorization: `Bearer ${LMS_TOKEN}` },
        body: { why: 'not mine to reject' },
      });
      assert(rejectElsewhere.status === 409,
        `another course's lesson could be rejected through this one: ${rejectElsewhere.status}`);
      return 'refuses a waiting lesson, and refuses another course entirely';
    }); });

  // Boot never starts the worker (a crash loop must not spend), so after every
  // redeploy the queue sits until something kicks it. Until now the only kicks were
  // build, approve and requeue -- two of which cost money. This is the free one.
  await check('the worker can be resumed after a boot, and only with a credential',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const queue = require(path.join(__dirname, 'lib', 'queue'));
      require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
      queue.resetPathCache();
      const anon = await req(port, { method: 'POST', path: '/api/v1/courses/worker/resume', body: { by: 'nobody' } });
      assert(anon.status === 401, `resume without a token: ${anon.status}`);
      // An empty queue: the route answers, and there is nothing it could start.
      const r = await req(port, { method: 'POST', path: '/api/v1/courses/worker/resume',
        headers: { authorization: `Bearer ${LMS_TOKEN}` }, body: { by: 'test' } });
      assert(r.status === 202, `resume on an empty queue: ${r.status} ${r.text}`);
      assert(r.json.eligible === 0, `eligible should be 0 on an empty queue, got ${r.json.eligible}`);
      assert(Array.isArray(r.json.held), 'resume does not list the held courses');
      return '401 anonymous, 202 with nothing to start';
    }); });

  await check('skip drops a failed lesson for free and refuses anything else',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const queue = require(path.join(__dirname, 'lib', 'queue'));
      require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
      queue.resetPathCache();
      const tag = '[course-test-skip]';
      queue.enqueue({ topic: 'waiting', series: 'testing', slug: 'sk-waiting', source: 'course-builder', notes: `${tag} brief` });
      queue.block('testing/sk-waiting', 'run-b', 'awaiting human review', 'review');
      const post = (lesson) => req(port, { method: 'POST',
        path: `/api/v1/courses/course-test-skip/lessons/${lesson}/skip`,
        headers: { authorization: `Bearer ${LMS_TOKEN}` }, body: { by: 'test' } });
      // Only refusals here: a successful skip kicks the worker and the real spine.
      const no = await post('testing/sk-waiting');
      assert(no.status === 409 && no.json.error === 'cannot_skip', `a waiting lesson was skipped: ${no.status} ${no.text}`);
      assert(queue.get('testing/sk-waiting').status === 'blocked', 'the waiting lesson was moved');
      const none = await post('testing/does-not-exist');
      assert(none.status === 409, `an unknown lesson: ${none.status}`);
      return 'refuses a waiting lesson and an unknown one';
    }); });

  // worker.building was null for idle and for parked alike, and `running` was
  // computed then dropped at the API boundary. The LMS read "nothing is happening"
  // in exactly the case where nothing WOULD happen without a person.
  await check('the course view says whether the worker needs a resume and what holds this course',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const queue = require(path.join(__dirname, 'lib', 'queue'));
      require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
      queue.resetPathCache();
      const mk = (course, slug) => queue.enqueue({ topic: slug, series: 'testing', slug, source: 'course-builder', notes: `[${course}] brief` });
      mk('course-held', 'h-x'); mk('course-held', 'h-y'); mk('course-free', 'f-z');
      queue.fail('testing/h-x', null, 'script never validated');
      queue.setStatus('testing/h-x', 'failed', { runId: null });
      const auth = { authorization: `Bearer ${LMS_TOKEN}` };

      const held = await req(port, { path: '/api/v1/courses/course-held', headers: auth });
      assert(held.status === 200, `held course view: ${held.status}`);
      const w = held.json.worker;
      assert(w && w.held && w.held.by === 'testing/h-x' && w.held.status === 'failed',
        `the held course does not name what holds it: ${JSON.stringify(w)}`);
      assert(w.running === false, 'running is not forwarded');
      assert(w.needsResume === true, 'a free course is queued and idle, yet needsResume is false');
      assert(w.eligibleAcrossAllCourses === 1, `eligible should be 1 (f-z), got ${w.eligibleAcrossAllCourses}`);
      assert(w.buildingCourseId === null, 'buildingCourseId should be null when idle');
      const hx = held.json.items.find((i) => i.id === 'testing/h-x');
      assert(hx.spendUsdTotal === 0 && hx.spendUsd === 0,
        `a failed lesson with no run must report an explicit 0, got ${JSON.stringify({ t: hx.spendUsdTotal, u: hx.spendUsd })}`);
      const hy = held.json.items.find((i) => i.id === 'testing/h-y');
      assert(hy.queuePosition === null, `a queued lesson behind a hold has no position, got ${hy.queuePosition}`);

      const free = await req(port, { path: '/api/v1/courses/course-free', headers: auth });
      assert(free.json.worker.held === null, 'the free course reports a hold that is not its own');
      const fz = free.json.items.find((i) => i.id === 'testing/f-z');
      assert(fz.queuePosition === 1, `f-z is first in line, got ${fz.queuePosition}`);

      const h = await req(port, { path: '/health' });
      const cw = h.json.courses && h.json.courses.worker;
      assert(cw && cw.needsResume === true && cw.eligible === 1 && cw.heldCourses === 1 && cw.running === false,
        `/health.courses.worker is wrong: ${JSON.stringify(cw)}`);
      assert(!h.text.includes('testing/h-x'), '/health leaked a lesson id');
      return 'held, needsResume, queuePosition, explicit $0, health counts';
    }); });

  // A course never touched the tenant ledger: no reservation, no settlement, no
  // ceiling. GET /demo/spend reported 0 after a course and the LMS read that as
  // "nothing spent". Now a build reserves per lesson, or is refused up front.
  const PLAN2 = { title: 'T', modules: [{ title: 'M', lessons: [
    { title: 'Lesson one', brief: 'b1', slo: 's1' }, { title: 'Lesson two', brief: 'b2', slo: 's2' },
  ] }] };
  const buildBody = { plan: PLAN2, confirmLessons: 2, series: 'testing' };
  const withQuietWorker = async (fn) => {
    // A successful build kicks the worker and the worker runs the real spine.
    // Nothing here may start one, so the kick is a no-op for the duration.
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    const realKick = cw.kick;
    cw.kick = () => {};
    try { return await fn(); } finally { cw.kick = realKick; }
  };

  await check('a course build past the tenant ceiling is refused, and queues nothing',
    () => { const env = freshEnv({ TENANTS_JSON: JSON.stringify([{ id: 'tiny', name: 'Tiny', token: LMS_TOKEN, monthlyUsd: 1 }]) });
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, () => withQuietWorker(async () => {
        const queue = require(path.join(__dirname, 'lib', 'queue'));
        require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
        queue.resetPathCache();
        const auth = { authorization: `Bearer ${LMS_TOKEN}` };
        const r = await req(port0(), { method: 'POST', path: '/api/v1/courses/build', headers: auth, body: buildBody });
        assert(r.status === 402 && r.json.error === 'tenant_budget_exhausted', `expected 402, got ${r.status} ${r.text}`);
        assert(queue.currentItems().filter((i) => i.source === 'course-builder').length === 0, 'a refused build still queued lessons');
        const sp = await req(port0(), { path: '/demo/spend', headers: auth });
        assert(sp.json.reservedUsd === 0, `a refused build left a reservation: ${sp.text}`);
        return '402, nothing queued, nothing reserved';
      })); });

  await check('a course build reserves per lesson, and /demo/spend can see a course',
    () => { const env = freshEnv();
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, () => withQuietWorker(async () => {
        const queue = require(path.join(__dirname, 'lib', 'queue'));
        require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
        queue.resetPathCache();
        const auth = { authorization: `Bearer ${LMS_TOKEN}` };
        const r = await req(port0(), { method: 'POST', path: '/api/v1/courses/build', headers: auth, body: buildBody });
        assert(r.status === 202 && r.json.queued === 2, `build: ${r.status} ${r.text}`);
        const view = await req(port0(), { path: `/api/v1/courses/${r.json.courseId}`, headers: auth });
        for (const i of view.json.items) {
          assert(i.tenantId === 'taleemabad-u', `item does not carry its tenant: ${JSON.stringify(i)}`);
        }
        const sp = await req(port0(), { path: '/demo/spend', headers: auth });
        assert(sp.json.reservedUsd === 5, `two lessons should reserve $5.00, got ${sp.json.reservedUsd}`);
        assert(sp.json.courses && sp.json.courses.lessons === 2 && sp.json.courses.reservedUsd === 5,
          `/demo/spend does not break out courses: ${JSON.stringify(sp.json.courses)}`);

        // Rejecting a lesson nobody has built yet releases the money, for it and
        // for the sibling stopped with it.
        const first = r.json.items[0];
        const rej = await req(port0(), { method: 'POST', path: `/api/v1/courses/${r.json.courseId}/lessons/${first}/reject`, headers: auth, body: { why: 'changed plan' } });
        assert(rej.status === 202 && rej.json.stopped.length === 1, `reject: ${rej.status} ${rej.text}`);
        const after = await req(port0(), { path: '/demo/spend', headers: auth });
        assert(after.json.reservedUsd === 0 && after.json.spentUsd === 0,
          `rejecting unbuilt lessons left money on the ledger: ${after.text}`);
        return 'reserved 2 x $2.50, released on reject';
      })); });

  await check('a stopped course reads held: null, and /health counts only courses with work behind a hold',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const queue = require(path.join(__dirname, 'lib', 'queue'));
      require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
      queue.resetPathCache();
      const mk = (course, slug) => queue.enqueue({ topic: slug, series: 'testing', slug, source: 'course-builder', notes: `[${course}] brief` });
      mk('course-stopped', 's-x'); mk('course-waiting', 'w-x'); mk('course-waiting', 'w-y');
      queue.fail('testing/s-x', 'run-1', 'rejected by a human');
      queue.fail('testing/w-x', 'run-2', 'broke');
      const auth = { authorization: `Bearer ${LMS_TOKEN}` };
      const stopped = await req(port, { path: '/api/v1/courses/course-stopped', headers: auth });
      assert(stopped.json.worker.held === null, `a course with nothing queued reports a hold: ${JSON.stringify(stopped.json.worker.held)}`);
      const waiting = await req(port, { path: '/api/v1/courses/course-waiting', headers: auth });
      assert(waiting.json.worker.held && waiting.json.worker.held.by === 'testing/w-x', 'a course with a queued sibling lost its hold');
      const h = await req(port, { path: '/health' });
      assert(h.json.courses.worker.heldCourses === 1, `heldCourses should be 1, got ${h.json.courses.worker.heldCourses}`);
      return 'stopped: null, waiting: held, heldCourses 1';
    }); });

  await check('resume and skip are on the index the LMS pins to',
    () => withServer(BASE_ENV, {}, async (port) => {
      const r = await req(port, { path: '/api/v1' });
      const paths = (r.json.endpoints || []).map((e) => `${e.method} ${e.path}`);
      for (const want of [
        'POST /api/v1/courses/worker/resume',
        'POST /api/v1/courses/:courseId/lessons/:lessonId/skip',
      ]) assert(paths.includes(want), `the index does not list ${want}`);
      return 'both listed';
    }));

  await check('GET /api/v1/health answers without a credential and leaks nothing',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const r = await req(port, { path: '/api/v1/health' });
      assert(r.status === 200, `expected 200, got ${r.status}`);
      assert(r.json.ok === true, 'health is not ok');
      assert(r.json.configured === true, 'health does not report a configured service');
      assert(!r.text.includes(LMS_TOKEN) && !r.text.includes(LEGACY_TOKEN), 'health leaked a token');
      assert(!/videos|checkpoints|correctIndex/i.test(r.text), 'health leaked lesson data');
      return 'public, clean';
    }); });

  await check('/health reports the job store durability honestly',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const r = await req(port, { path: '/health' });
      assert(r.json.jobStore, 'no jobStore block on /health');
      assert(r.json.jobStore.durability !== 'volume', 'claimed volume durability with no volume');
      assert(r.json.tenants.count >= 1, 'no tenants reported');
      assert(!r.text.includes(LMS_TOKEN), '/health leaked a token');
      return `durability: ${r.json.jobStore.durability}`;
    }); });

  await check('the finished-videos listing is no longer open to anyone with the URL',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const anon = await req(port, { path: '/demo/videos' });
      assert(anon.status === 401, `expected 401, got ${anon.status}`);
      const auth = await req(port, { path: '/demo/videos', headers: { authorization: `Bearer ${LMS_TOKEN}` } });
      assert(auth.status === 200, `expected 200 with a token, got ${auth.status}`);
      return 'credential required';
    }); });
}

// ── run ───────────────────────────────────────────────────────────────────────

// ── 2b. a written script survives the container; a failed produce is visible ──
//
// Earned on 2026-09-25. Job 43a782dd45dd was `written`; two redeploys replaced
// the container; the click on "Make the video" failed in 9 ms with "no gated
// script yet", the job was put back to `written`, the LMS drew the identical
// page, and the Idempotency-Key was left `abandoned` so every later click was
// answered from a run that never began. Four defects, one symptom.

async function resilienceChecks() {
  console.log('\n2b. a written script survives a redeploy, and a failed produce says so');

  const { videoDir } = require(path.join(__dirname, 'lib', 'paths'));

  /** A write stub whose beats need real data to render (an info card) and carry a checkpoint. */
  const FULL_BEATS = [
    { id: '01', mode: 'scene', vo: 'Ali opens his order book.', art: 'A tailor at a bench, no text', cap: 'The order book' },
    { id: '02', mode: 'info', vo: 'Twelve orders came in.', info: { tpl: 'bignum', data: { big: 12, lab: 'orders' } } },
    { id: '03', mode: 'checkpoint', quiz: { stem: 'What did Ali count?', options: ['Orders', 'Coins', 'Days'], answer: 0, explain: 'He counted the orders in the book, which is the thing the week is measured in.' } },
    { id: '04', mode: 'scene', vo: 'So he writes the numbers down.', art: 'A notebook on a bench, no text', cap: 'Writing it down' },
  ];
  function writerReturning(slug, extra = {}) {
    return async (body) => ({
      runId: 'run-test', itemId: `made/${slug}`, slug, series: 'made', topic: body.topic,
      title: 'A Test Lesson', brief: { slo: 'x', interpretation: 'y', ali_scenario: 'z' },
      beats: FULL_BEATS, gate: { verdict: 'READY' }, redrafts: 0,
      dir: videoDir('made', slug), ...extra,
    });
  }

  await check('a produce that never started can be retried with the same Idempotency-Key',
    () => {
      const env = freshEnv();
      let produceCalls = 0;
      const pipeline = fakePipeline({
        write: writerReturning('t-retry'),
        produce: async () => { produceCalls++; throw new Error('boom: the render never began'); },
      });
      return withServer(env, { oneVideo: pipeline, store: freshStore(env) }, async (port) => {
        const { jobId, cookie } = await makeJob(port);
        await settle();
        const auth = { authorization: `Bearer ${LMS_TOKEN}` };
        await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/claim`, headers: auth, cookie });
        const h = { ...auth, 'idempotency-key': 'lms-produce-stable-per-video' };
        const first = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: h, body: {} });
        assert(first.status === 202, `first produce: ${first.status} ${first.text}`);
        await settle();
        const second = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: h, body: {} });
        assert(second.status === 202, `second produce: ${second.status} ${second.text}`);
        assert(second.headers['idempotency-replayed'] !== 'true',
          'the retry was answered from the abandoned first attempt -- the button is dead forever');
        await settle();
        assert(produceCalls === 2, `produce ran ${produceCalls} time(s); the retry did no work`);
        return 'abandoned key re-claimed, work re-dispatched';
      });
    });

  await check('a failed produce is reported on the job as lastError, not hidden in produce.error',
    () => {
      const env = freshEnv();
      const pipeline = fakePipeline({
        write: writerReturning('t-lasterr'),
        produce: async () => { throw new Error('this video has no gated script yet -- write it first'); },
      });
      return withServer(env, { oneVideo: pipeline, store: freshStore(env) }, async (port) => {
        const { jobId, cookie } = await makeJob(port);
        await settle();
        const auth = { authorization: `Bearer ${LMS_TOKEN}` };
        await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/claim`, headers: auth, cookie });
        await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: auth, body: {} });
        await settle();
        const r = await req(port, { path: `/demo/make-video/${jobId}`, headers: auth, cookie });
        assert(r.json.status === 'written', `expected written (the script is still good), got ${r.json.status}`);
        assert(r.json.error === null || r.json.error === undefined, `error must stay null for a non-terminal job, got ${JSON.stringify(r.json.error)}`);
        assert(r.json.lastError && /no gated script/.test(r.json.lastError.message),
          `lastError not surfaced top-level: ${JSON.stringify(r.json.lastError)}`);
        assert(r.json.lastError.stage === 'produce', `lastError.stage should name produce, got ${r.json.lastError.stage}`);
        return 'lastError carries the reason the LMS could not see';
      });
    });

  /**
   * The 2026-10-05 production case. The run bought art and speech, rendered and
   * saved the video, and was then BLOCKED by a post-render sensor. The route put
   * the job back to `written`, settled the ledger at $0, and the LMS told the
   * instructor "nothing was bought, try again" -- about a finished $1.60 video.
   */
  async function producedThenStopped({ slug, error, withVideo }) {
    const vids = vidsEnv();
    const env = freshEnv({ EXPLAINER_VIDEOS_DIR: vids });
    const store = freshStore(env);
    let calls = 0;
    // The real file lookup: the stub's `() => null` would hide the very video
    // this test writes, and the route must find it the way production does.
    const { finishedFile } = require(path.join(__dirname, '..', 'server', 'lib', 'one-video'));
    const pipeline = fakePipeline({
      write: writerReturning(slug),
      finishedFile,
      produce: async () => {
        calls++;
        if (withVideo) {
          const out = path.join(videoDir('made', slug), 'out');
          fs.mkdirSync(out, { recursive: true });
          fs.writeFileSync(path.join(out, `${slug}_final.mp4`), 'not really an mp4');
        }
        throw Object.assign(new Error(error.message), error);
      },
    });
    const ledger = require(path.join(__dirname, '..', 'server', 'lib', 'ledger'));
    return withServer(env, { oneVideo: pipeline, store }, async (port) => {
      const { jobId, cookie } = await makeJob(port);
      await settle();
      const auth = { authorization: `Bearer ${LMS_TOKEN}` };
      await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/claim`, headers: auth, cookie });
      const h = { ...auth, 'idempotency-key': `k-${slug}` };
      const first = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: h, body: {} });
      assert(first.status === 202, `produce: ${first.status} ${first.text}`);
      await settle();
      const job = (await req(port, { path: `/demo/make-video/${jobId}`, headers: auth, cookie })).json;
      const rows = store.readLedger('taleemabad-u', ledger.monthKey());
      const settled = rows.find((r) => r.type === 'settle' && r.jobId === jobId);
      const again = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: h, body: {} });
      await settle();
      return { job, settled, again, calls: () => calls };
    });
  }

  await check('a post-render block with a finished video is awaiting_review, not "did not start"',
    async () => {
      const { job, settled, again, calls } = await producedThenStopped({
        slug: 't-blocked', withVideo: true,
        error: {
          message: 'produce blocked: grammar and clarity needs a human decision (eval-text.js, exit 1)',
          runId: 'run-x', spendUsd: 1.6, kind: 'blocked', code: 'post-render-check',
          details: { sensor: 'eval-text.js', what: 'grammar and clarity', findings: 'ERROR "decided the problem"' },
        },
      });
      assert(job.status === 'awaiting_review', `status ${job.status}: the LMS will say nothing was bought`);
      assert(job.deliverableAvailable === true, 'deliverableAvailable must say the video exists');
      assert(job.produce && job.produce.spendUsd === 1.6, `produce.spendUsd ${JSON.stringify(job.produce)}`);
      assert(job.produce.warnings && job.produce.warnings[0].sensor === 'eval-text.js',
        `the finding did not reach the reviewer: ${JSON.stringify(job.produce.warnings)}`);
      assert(job.lastError && job.lastError.kind === 'blocked' && job.lastError.spentUsd === 1.6,
        `lastError must carry kind and spend: ${JSON.stringify(job.lastError)}`);
      assert(settled && settled.usd === 1.6, `ledger settled at ${settled && settled.usd}, not 1.6`);
      assert(settled.outcome === 'awaiting_review', `ledger outcome ${settled.outcome}`);
      assert(again.status === 202 && again.json.idempotent === true, `a second press must not spend: ${again.status} ${again.text}`);
      assert(calls() === 1, `produce ran ${calls()} times`);
      return 'awaiting_review, $1.60 settled, warning carried, second press is a no-op';
    });

  await check('a run that died after making the video is interrupted (resumable), not written',
    async () => {
      const { job, settled } = await producedThenStopped({
        slug: 't-died', withVideo: true,
        error: { message: 'produce failed: verify.js exit 1', runId: 'run-y', spendUsd: 1.2, kind: 'failed' },
      });
      assert(job.status === 'interrupted', `status ${job.status}`);
      assert(job.deliverableAvailable === true, 'the video exists and the record must say so');
      assert(job.lastError.spentUsd === 1.2 && job.lastError.kind === 'failed', JSON.stringify(job.lastError));
      assert(settled && settled.usd === 1.2 && settled.outcome === 'interrupted', JSON.stringify(settled));
      return 'interrupted, spend settled';
    });

  await check('a run that made nothing goes back to written, with the spend it did make',
    async () => {
      const { job, settled, again, calls } = await producedThenStopped({
        slug: 't-nothing', withVideo: false,
        error: { message: 'produce failed: art generation exit 1', runId: 'run-z', spendUsd: 0.08, kind: 'failed' },
      });
      assert(job.status === 'written', `status ${job.status}`);
      assert(job.deliverableAvailable === false, 'no video: deliverableAvailable must be false');
      assert(job.lastError.spentUsd === 0.08, `partial spend lost: ${JSON.stringify(job.lastError)}`);
      assert(settled && settled.usd === 0.08 && settled.outcome === 'failed', JSON.stringify(settled));
      assert(again.status === 202 && calls() === 2, 'with nothing made, pressing again must run again');
      return 'written, $0.08 settled, retry allowed';
    });

  await check('the checked script sha travels from write() to the job record and into produce()',
    () => {
      const env = freshEnv();
      let produced = null;
      const pipeline = fakePipeline({
        write: writerReturning('t-sha', { scriptSha: 'ffff0000ffff0000', unresolvedChecks: [{ sensor: 'qa-cutouts.js', what: 'props' }] }),
        produce: async (r) => { produced = r; return fakePipeline().produce(); },
      });
      return withServer(env, { oneVideo: pipeline, store: freshStore(env) }, async (port) => {
        const { jobId, cookie } = await makeJob(port);
        await settle();
        const auth = { authorization: `Bearer ${LMS_TOKEN}` };
        await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/claim`, headers: auth, cookie });
        const g = await req(port, { path: `/demo/make-video/${jobId}`, headers: auth, cookie });
        assert(g.json.script && g.json.script.scriptSha === 'ffff0000ffff0000', `script.scriptSha missing: ${JSON.stringify(g.json).slice(0, 400)}`);
        assert(Array.isArray(g.json.script.unresolvedChecks) && g.json.script.unresolvedChecks.length === 1,
          'unresolvedChecks not on the job record');
        await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: auth, body: {} });
        await settle();
        assert(produced && produced.scriptSha === 'ffff0000ffff0000', `produce() received ${JSON.stringify(produced && produced.scriptSha)}`);
        return 'sha on the record, sha into produce';
      });
    });

  await check('a written script survives the render directory vanishing: rebuilt from the job record',
    () => {
      const vids = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-vids-'));
      storeDirs.push(vids);
      const env = freshEnv({ EXPLAINER_VIDEOS_DIR: vids });
      let produced = null;
      const pipeline = fakePipeline({
        write: writerReturning('t-record'),
        produce: async (r) => { produced = r; return fakePipeline().produce(); },
      });
      return withServer(env, { oneVideo: pipeline, store: freshStore(env) }, async (port) => {
        const { jobId, cookie } = await makeJob(port);
        await settle();
        const file = path.join(videoDir('made', 't-record'), 'beats.js');
        assert(!fs.existsSync(file), 'precondition: the stub writer must not have written beats.js');
        const auth = { authorization: `Bearer ${LMS_TOKEN}` };
        await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/claim`, headers: auth, cookie });
        const r = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: auth, body: {} });
        assert(r.status === 202, `produce refused: ${r.status} ${r.text}`);
        await settle();
        assert(fs.existsSync(file), 'beats.js was not rebuilt before produce');
        delete require.cache[require.resolve(file)];
        const beats = require(file);
        const info = beats.find((b) => b.mode === 'info');
        assert(info && info.info && info.info.data && info.info.data.big === 12,
          `the rebuilt info beat lost its data: ${JSON.stringify(info)}`);
        const cp = beats.find((b) => b.mode === 'checkpoint');
        assert(cp && cp.quiz && cp.quiz.options.length === 3, 'the rebuilt checkpoint lost its quiz');
        assert(produced, 'produce was never dispatched');
        return 'rebuilt from the record, info data and checkpoint intact';
      });
    });

  await check('a written script survives the render directory vanishing: restored from the volume copy',
    () => {
      const vids = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-vids-'));
      storeDirs.push(vids);
      const env = freshEnv({ EXPLAINER_VIDEOS_DIR: vids, JOB_STORE_DURABLE: '1' });
      const jobStoreMod = require(path.join(__dirname, '..', 'server', 'lib', 'job-store'));
      jobStoreMod.reset();
      const ORIGINAL = '// hand-written bytes that must come back identical\nmodule.exports = '
        + JSON.stringify(FULL_BEATS) + ';\n';
      const pipeline = fakePipeline({
        write: async (body) => {
          const dir = videoDir('made', 't-volume');
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, 'beats.js'), ORIGINAL);
          return writerReturning('t-volume')(body);
        },
      });
      return withServer(env, { oneVideo: pipeline, store: freshStore(env) }, async (port) => {
        const { jobId, cookie } = await makeJob(port);
        await settle();
        const deliverables = require(path.join(__dirname, 'lib', 'deliverables'));
        const held = deliverables.findScript('made', 't-volume');
        assert(held && held.beats, 'the script was not persisted to the volume when it became written');
        const file = path.join(videoDir('made', 't-volume'), 'beats.js');
        fs.rmSync(file);
        const auth = { authorization: `Bearer ${LMS_TOKEN}` };
        await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/claim`, headers: auth, cookie });
        const r = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: auth, body: {} });
        assert(r.status === 202, `produce refused: ${r.status} ${r.text}`);
        await settle();
        assert(fs.existsSync(file), 'beats.js was not restored from the volume');
        assert(fs.readFileSync(file, 'utf8') === ORIGINAL, 'the restored bytes differ from what was approved');
        return 'byte-identical restore from the volume';
      });
    });

  await check('a script lost before it was ever saved is failed honestly, not put back to written',
    () => {
      const vids = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-vids-'));
      storeDirs.push(vids);
      const env = freshEnv({ EXPLAINER_VIDEOS_DIR: vids });
      let produceCalls = 0;
      const store = freshStore(env);
      const pipeline = fakePipeline({
        write: writerReturning('t-lost'),
        produce: async () => { produceCalls++; return fakePipeline().produce(); },
      });
      return withServer(env, { oneVideo: pipeline, store }, async (port) => {
        const { jobId, cookie } = await makeJob(port);
        await settle();
        // Age the record to the pre-fix projection: no complete copy, info cards
        // reduced to their template name. Exactly what 43a782dd45dd holds.
        store.patch(jobId, (j) => {
          delete j.script.beatsFull;
          j.script.beats = j.script.beats.map((b) => ({ ...b, info: b.info ? { tpl: b.info.tpl } : null }));
          return j;
        });
        const auth = { authorization: `Bearer ${LMS_TOKEN}` };
        await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/claim`, headers: auth, cookie });
        const r = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: auth, body: {} });
        assert(r.status === 409, `expected 409, got ${r.status}: ${r.text}`);
        assert(r.json.error === 'script_lost', `wrong error code: ${r.json.error}`);
        await settle();
        assert(produceCalls === 0, 'produce was dispatched for a script that does not exist');
        const g = await req(port, { path: `/demo/make-video/${jobId}`, headers: auth, cookie });
        assert(g.json.status === 'failed', `expected failed so the LMS shows it in red, got ${g.json.status}`);
        assert(/written again/.test(g.json.error || ''), `the reason does not tell the person what to do: ${g.json.error}`);
        return '409 script_lost, job failed with the reason';
      });
    });
}

// ── 2c. /health tells the truth a deploy needs ───────────────────────────────

async function demoSpendChecks() {
  console.log('\n2d. the demo course-builder cannot spend the service\'s own money');

  await check('POST /demo/course-builder/build without a tenant token is 401, and injects nothing',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const r = await req(port, { method: 'POST', path: '/demo/course-builder/build', body: { plan: {} } });
      assert(r.status === 401, `expected 401, got ${r.status}: ${r.text.slice(0, 120)}`);
      return '401';
    }); });

  await check('with a tenant token the proxy reaches the API router, and never answers a bodyless 404',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      // The sibling the 401 case never had. `req.url` is rewritten to
      // /courses/build and handed to the API router; if those two drift apart
      // the fallback fires, and it used to send an EMPTY 404 -- so the demo
      // page's res.json() threw a SyntaxError and showed that instead of the
      // refusal. An empty plan is refused by the real route, which is the proof
      // it was reached: nothing is queued and nothing is bought.
      const r = await req(port, {
        method: 'POST',
        path: '/demo/course-builder/build',
        headers: { authorization: `Bearer ${LMS_TOKEN}` },
        body: { plan: {} },
      });
      assert(r.status !== 401 && r.status !== 403, `the tenant token was refused: ${r.status}`);
      assert(r.json, `the answer had no JSON body -- a page calling res.json() would throw: ${r.text.slice(0, 120)}`);
      assert(r.json.error !== 'route_missing',
        'the proxy could not reach POST /api/v1/courses/build -- the rewrite and the router have drifted');
      assert(r.status >= 400, `an empty plan must be refused, got ${r.status}`);
      return `reached the router, refused with ${r.status} ${r.json.error}`;
    }); });
}

// -- 2e. the admin reset: the only way to empty this service -------------------

/**
 * These exist because the reset is irreversible and runs against production.
 * Each guard gets its own case, and the two that protect money -- the ledger
 * month file and an open reservation -- are asserted against the ledger itself
 * rather than the route's own receipt, which could happily agree with a bug.
 *
 * Counts are PROBED, never hardcoded. The route refuses unless `confirm` echoes
 * the live state exactly, and a test that guessed the numbers would break for
 * the wrong reason the first time a fixture changed. Probing also exercises the
 * refusal on every single case, which is the behaviour the operator script
 * depends on.
 */
async function adminResetChecks() {
  console.log('\n2e. POST /api/v1/admin/reset empties the service, once, on purpose');

  const admin = { authorization: `Bearer ${LEGACY_TOKEN}` };
  const lms = { authorization: `Bearer ${LMS_TOKEN}` };
  const jobsLib = require(path.join(__dirname, '..', 'server', 'lib', 'jobs'));
  const ledger = require(path.join(__dirname, '..', 'server', 'lib', 'ledger'));

  const post = (port, body, headers = admin) => req(port, {
    method: 'POST', path: '/api/v1/admin/reset', headers, body,
  });

  /** Ask the route what it can see, by handing it a count it can never match. */
  async function liveCounts(port) {
    const r = await post(port, {
      because: 'probe', confirm: { jobs: -1, deliverables: -1, queueItems: -1 },
    });
    assert(r.status === 409 && r.json.error === 'confirm_mismatch',
      `probe expected 409 confirm_mismatch, got ${r.status} ${r.text.slice(0, 160)}`);
    return r.json.actual;
  }

  await check('the LMS tenant is refused with 403 -- the scope is the gate, not the token',
    () => {
      const env = freshEnv();
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
        const r = await post(port, { because: 'x', confirm: {}, dryRun: false }, lms);
        assert(r.status === 403, `expected 403, got ${r.status}: ${r.text.slice(0, 160)}`);
        assert(r.json.error === 'forbidden', `expected forbidden, got ${r.json.error}`);
        return '403 forbidden';
      });
    });

  await check('no credential at all is 401, never a silent success',
    () => {
      const env = freshEnv();
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
        const r = await req(port, {
          method: 'POST', path: '/api/v1/admin/reset', body: { because: 'x', confirm: {}, dryRun: false },
        });
        assert(r.status === 401, `expected 401, got ${r.status}`);
        return '401';
      });
    });

  await check('a job still being written blocks the reset -- it deletes records, it cannot cancel work',
    () => {
      const env = freshEnv();
      const pipeline = fakePipeline({ write: () => new Promise(() => {}) });
      return withServer(env, { oneVideo: pipeline, store: freshStore(env) }, async (port) => {
        await req(port, { method: 'POST', path: '/demo/make-video', body: { topic: 'a topic' } });
        // Deliberately correct counts, so the only thing that can refuse is the guard under test.
        const r = await post(port, {
          because: 'clearing test runs',
          confirm: { jobs: 1, deliverables: 0, queueItems: 0 },
          dryRun: false,
        });
        assert(r.status === 409, `expected 409, got ${r.status}: ${r.text.slice(0, 160)}`);
        assert(r.json.error === 'work_in_flight', `expected work_in_flight, got ${r.json.error}`);
        assert(r.json.inFlight.writing === 1, `expected writing=1, got ${JSON.stringify(r.json.inFlight)}`);
        return '409 work_in_flight, checked before the counts';
      });
    });

  await check('counts that do not match the live state are refused, and the real ones are returned',
    () => {
      const env = freshEnv();
      const store = freshStore(env);
      return withServer(env, { oneVideo: fakePipeline(), store }, async (port) => {
        const a = jobsLib.create({ topic: 'one', owner: null }, { store });
        const b = jobsLib.create({ topic: 'two', owner: null }, { store });
        // Out of `running`, or the in-flight guard answers first and this tests nothing.
        jobsLib.transition(a.id, { status: 'written' }, { store });
        jobsLib.transition(b.id, { status: 'written' }, { store });

        const live = await liveCounts(port);
        assert(live.jobs === 2, `expected the route to see 2 jobs, got ${live.jobs}`);

        const r = await post(port, {
          because: 'clearing test runs',
          confirm: { ...live, jobs: live.jobs + 1 },
          dryRun: false,
        });
        assert(r.status === 409, `expected 409, got ${r.status}: ${r.text.slice(0, 160)}`);
        assert(r.json.error === 'confirm_mismatch', `expected confirm_mismatch, got ${r.json.error}`);
        assert(r.json.mismatched.join() === 'jobs', `expected only jobs mismatched, got ${JSON.stringify(r.json.mismatched)}`);
        assert(jobsLib.listAll({ store }).length === 2, 'a refused reset must not have removed anything');
        return '409 confirm_mismatch, nothing removed';
      });
    });

  await check('an empty `because` is refused -- the archive would have no explanation',
    () => {
      const env = freshEnv();
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
        const live = await liveCounts(port);
        const r = await post(port, { confirm: live, because: '   ', dryRun: false });
        assert(r.status === 400, `expected 400, got ${r.status}: ${r.text.slice(0, 160)}`);
        assert(r.json.error === 'because_required', `expected because_required, got ${r.json.error}`);
        return '400 because_required';
      });
    });

  await check('a dry run is the default, and it changes nothing',
    () => {
      const env = freshEnv();
      const store = freshStore(env);
      return withServer(env, { oneVideo: fakePipeline(), store }, async (port) => {
        const job = jobsLib.create({ topic: 'keep me', owner: null }, { store });
        jobsLib.transition(job.id, { status: 'written' }, { store });
        const live = await liveCounts(port);
        const r = await post(port, { confirm: live, because: 'clearing test runs' });
        assert(r.status === 200, `expected 200, got ${r.status}: ${r.text.slice(0, 200)}`);
        assert(r.json.dryRun === true, 'omitting dryRun must NOT carry out the reset');
        assert(r.json.wouldRemove.jobs === live.jobs, `wouldRemove disagrees with the probe: ${JSON.stringify(r.json.wouldRemove)}`);
        assert(jobsLib.get(job.id, { store }), 'the dry run deleted a job');
        return 'dryRun defaults true, job survived';
      });
    });

  await check('a real reset removes the job records and says which ones',
    () => {
      const env = freshEnv({ JOB_STORE_DURABLE: '1' });
      const store = freshStore(env);
      return withServer(env, { oneVideo: fakePipeline(), store }, async (port) => {
        const a = jobsLib.create({ topic: 'test run one', owner: null }, { store });
        const b = jobsLib.create({ topic: 'test run two', owner: null }, { store });
        jobsLib.transition(a.id, { status: 'written' }, { store });
        jobsLib.transition(b.id, { status: 'failed' }, { store });

        const live = await liveCounts(port);
        assert(live.jobs === 2, `expected 2 jobs, got ${live.jobs}`);
        const r = await post(port, { confirm: live, because: 'clearing test runs', dryRun: false });
        assert(r.status === 200, `expected 200, got ${r.status}: ${r.text.slice(0, 200)}`);
        assert(r.json.jobsRemoved.length === 2, `expected 2 removed, got ${JSON.stringify(r.json.jobsRemoved)}`);
        assert(jobsLib.listAll({ store }).length === 0, 'the store is not empty after a reset');
        assert(!jobsLib.get(a.id, { store }), 'a written job survived the reset');
        return '2 jobs removed, store empty';
      });
    });

  await check('an OPEN reservation is released, a SETTLED one is left exactly alone',
    () => {
      const env = freshEnv({ JOB_STORE_DURABLE: '1' });
      const store = freshStore(env);
      return withServer(env, { oneVideo: fakePipeline(), store }, async (port) => {
        // One job holding $4 that never settled, one that really did cost $2.
        const open = jobsLib.create({ topic: 'never started', owner: null }, { store });
        const spent = jobsLib.create({ topic: 'really ran', owner: null }, { store });
        const heldRef = ledger.reserve(store, { tenantId: 'default', jobId: open.id, usd: 4 });
        const spentRef = ledger.reserve(store, { tenantId: 'default', jobId: spent.id, usd: 4 });
        ledger.settle(store, { tenantId: 'default', ref: spentRef.ref, jobId: spent.id, usd: 2, outcome: 'done' });
        jobsLib.transition(open.id, { status: 'written', patch: { tenantId: 'default', spendRef: heldRef.ref } }, { store });
        jobsLib.transition(spent.id, { status: 'published', patch: { tenantId: 'default', spendRef: spentRef.ref } }, { store });

        const before = ledger.spentUsd(store, 'default');
        assert(before.reserved === 4, `setup: expected $4 held, got ${before.reserved}`);
        assert(before.settled === 2, `setup: expected $2 settled, got ${before.settled}`);
        const rows = store.readLedger('default', ledger.monthKey()).length;

        const live = await liveCounts(port);
        const r = await post(port, { confirm: live, because: 'clearing test runs', dryRun: false });
        assert(r.status === 200, `expected 200, got ${r.status}: ${r.text.slice(0, 200)}`);
        assert(r.json.released.length === 1, `expected exactly 1 release, got ${JSON.stringify(r.json.released)}`);
        assert(r.json.released[0].ref === heldRef.ref, 'the wrong reservation was released');

        const after = ledger.spentUsd(store, 'default');
        assert(after.reserved === 0, `the hold was not released: ${after.reserved}`);
        assert(after.settled === 2, `REAL SPEND WAS ERASED: expected $2 still settled, got ${after.settled}`);
        assert(store.readLedger('default', ledger.monthKey()).length === rows + 1,
          'the ledger month file must only ever gain one release row -- it was rewritten');
        return 'held $4 released, settled $2 untouched';
      });
    });

  await check('the queue log is archived beside itself, not deleted',
    () => {
      const env = freshEnv({ JOB_STORE_DURABLE: '1' });
      const store = freshStore(env);
      const queue = require(path.join(__dirname, 'lib', 'queue'));
      return withServer(env, { oneVideo: fakePipeline(), store }, async (port) => {
        queue.resetPathCache();
        const before = queue.currentItems().length;
        queue.enqueue({ topic: 'a test lesson', series: 'cb-e2e', source: 'course-builder' });
        assert(queue.currentItems().length === before + 1, 'setup: the queue item was not written');

        const live = await liveCounts(port);
        const r = await post(port, { confirm: live, because: 'clearing test runs', dryRun: false });
        assert(r.status === 200, `expected 200, got ${r.status}: ${r.text.slice(0, 200)}`);
        assert(r.json.queueArchived, 'no archive path in the receipt');
        assert(fs.existsSync(r.json.queueArchived), `the archive is not on disk: ${r.json.queueArchived}`);
        assert(fs.existsSync(`${r.json.queueArchived}.why.txt`), 'the archive has no explanation beside it');
        assert(queue.currentItems().length === 0, 'the queue still folds to items after a reset');
        queue.resetPathCache();
        return 'queue archived, fold empty';
      });
    });
}

// ---------------------------------------------------------------------------
// Video styles (orchestrator/lib/styles.js): chosen at the very start of course creation,
// listed with a preview the LMS can play, stored on every lesson, and refused when unknown.
async function styleChecks() {
  console.log('\n-- video styles --');
  const auth = { authorization: `Bearer ${LMS_TOKEN}` };
  const withQuietWorker = async (fn) => {
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    const realKick = cw.kick;
    cw.kick = () => {};
    try { return await fn(); } finally { cw.kick = realKick; }
  };
  // A motion-graphics lesson is built from its models and walk-throughs, so a plan in
  // that style must carry them.
  const lesson = (n, extra = {}) => ({ title: `Lesson ${n}`, brief: `b${n}`, slo: `s${n}`, sloIds: [`1.${n}`],
    models: [{ name: 'SCARF', author: 'David Rock', summary: 'Status, Certainty, Autonomy, Relatedness, Fairness' }],
    walkthroughs: [{ title: 'Certainty', situation: 'A new joiner snaps over a laptop delay.' },
      { title: 'Status', situation: 'A senior employee goes quiet after a restructure.' }], ...extra });
  const MOTION_PLAN = { title: 'P&C', style: 'motion-graphics', slos: [{ id: '1.1', text: 'Interpret a reaction' }],
    modules: [{ title: 'Week 1', lessons: [lesson(1), lesson(2)] }] };

  await check('GET /api/v1/styles lists both styles, public, each with a playable preview',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const r = await req(port, { path: '/api/v1/styles' });
      assert(r.status === 200, `styles: ${r.status} ${r.text}`);
      const ids = r.json.styles.map((s) => s.id);
      assert(ids.join() === 'character-arc,motion-graphics', `wrong styles: ${ids}`);
      assert(r.json.default === 'character-arc', `default should be character-arc, got ${r.json.default}`);
      for (const s of r.json.styles) {
        assert(s.label && s.summary && /\/api\/v1\/styles\/[a-z-]+\/preview\.mp4$/.test(s.previewUrl), `incomplete style: ${JSON.stringify(s)}`);
        assert(s.previewSeconds >= 10 && s.previewSeconds <= 15, `preview is not 10-15s: ${s.previewSeconds}`);
        // What the script sounds like, so an instructor can judge it before choosing.
        const w = s.writingStyle || {};
        assert(w.narrator && w.voice && Array.isArray(w.rules) && w.rules.length >= 2
          && Array.isArray(w.sample) && w.sample.length >= 3 && w.sample.every((x) => x.line),
          `${s.id}: no usable writingStyle: ${JSON.stringify(w).slice(0, 200)}`);
      }
      const idx = await req(port, { path: '/api/v1' });
      assert(Array.isArray(idx.json.styles) && idx.json.styles.length === 2, 'the index does not serve the styles');
      assert(idx.json.endpoints.some((e) => e.path === '/api/v1/styles'), 'the index does not list GET /api/v1/styles');
      return 'two styles, default character-arc, served on the index too';
    }); });

  await check('each style preview is a real mp4 that answers a Range request (a <video> tag needs it)',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      for (const id of ['character-arc', 'motion-graphics']) {
        const full = await req(port, { path: `/api/v1/styles/${id}/preview.mp4` });
        assert(full.status === 200 && /video\/mp4/.test(full.headers['content-type'] || ''), `${id}: ${full.status} ${full.headers['content-type']}`);
        const part = await req(port, { path: `/api/v1/styles/${id}/preview.mp4`, headers: { range: 'bytes=0-99' } });
        assert(part.status === 206, `${id}: Range should be 206, got ${part.status}`);
      }
      const none = await req(port, { path: '/api/v1/styles/watercolour/preview.mp4' });
      assert(none.status === 404, `an unknown style should 404, got ${none.status}`);
      return '200 + 206 for both, 404 for an unknown one';
    }); });

  await check('a course built in motion-graphics stores the style on every lesson, with its models in the notes',
    () => { const env = freshEnv();
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, () => withQuietWorker(async () => {
        const queue = require(path.join(__dirname, 'lib', 'queue'));
        require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
        queue.resetPathCache();
        const r = await req(port0(), { method: 'POST', path: '/api/v1/courses/build', headers: auth,
          body: { plan: MOTION_PLAN, confirmLessons: 2, series: 'testing-motion' } });
        assert(r.status === 202 && r.json.style === 'motion-graphics', `build: ${r.status} ${r.text}`);
        const items = queue.currentItems().filter((i) => i.series === 'testing-motion');
        assert(items.length === 2 && items.every((i) => i.style === 'motion-graphics'), `items: ${JSON.stringify(items.map((i) => i.style))}`);
        assert(items.every((i) => /SCARF \(David Rock\)/.test(i.notes) && /Walk through/.test(i.notes)),
          'the models and walk-throughs did not reach the lesson notes the script is written from');
        const view = await req(port0(), { path: `/api/v1/courses/${r.json.courseId}`, headers: auth });
        assert(view.json.style === 'motion-graphics' && view.json.items.every((i) => i.style === 'motion-graphics'),
          `the course view does not show the style: ${view.text.slice(0, 300)}`);
        return 'style on the course, every lesson, and the models in the notes';
      })); });

  await check('a course with no style is built in character-arc, as every course was before styles',
    () => { const env = freshEnv();
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, () => withQuietWorker(async () => {
        const queue = require(path.join(__dirname, 'lib', 'queue'));
        require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
        queue.resetPathCache();
        const plan = { title: 'T', modules: [{ title: 'M', lessons: [{ title: 'Only one', brief: 'b', slo: 's' }] }] };
        const r = await req(port0(), { method: 'POST', path: '/api/v1/courses/build', headers: auth,
          body: { plan, confirmLessons: 1, series: 'testing-default' } });
        assert(r.status === 202 && r.json.style === 'character-arc', `build: ${r.status} ${r.text}`);
        const item = queue.currentItems().find((i) => i.series === 'testing-default');
        assert(item && item.style === 'character-arc', `stored style: ${item && item.style}`);
        return 'defaults to character-arc';
      })); });

  await check('an unknown style, or a motion plan missing its walk-throughs, is refused before anything is reserved',
    () => { const env = freshEnv();
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, () => withQuietWorker(async () => {
        const queue = require(path.join(__dirname, 'lib', 'queue'));
        require(path.join(__dirname, '..', 'server', 'lib', 'job-store')).reset();
        queue.resetPathCache();
        const bad = await req(port0(), { method: 'POST', path: '/api/v1/courses/build', headers: auth,
          body: { plan: MOTION_PLAN, style: 'watercolour', confirmLessons: 2, series: 'testing-bad' } });
        assert(bad.status === 400 && bad.json.error === 'invalid_style', `unknown style: ${bad.status} ${bad.text}`);
        const thin = JSON.parse(JSON.stringify(MOTION_PLAN));
        thin.modules[0].lessons[1].walkthroughs = [thin.modules[0].lessons[1].walkthroughs[0]];
        const t = await req(port0(), { method: 'POST', path: '/api/v1/courses/build', headers: auth,
          body: { plan: thin, confirmLessons: 2, series: 'testing-thin' } });
        assert(t.status === 400 && t.json.error === 'invalid_plan'
          && t.json.errors.some((e) => /walkthroughs/.test(e.path)), `thin plan: ${t.status} ${t.text}`);
        assert(!queue.currentItems().some((i) => /^testing-(bad|thin)$/.test(i.series)), 'a refused build queued lessons');
        const sp = await req(port0(), { path: '/demo/spend', headers: auth });
        assert(sp.json.reservedUsd === 0, `a refused build reserved money: ${sp.text}`);
        return 'invalid_style and invalid_plan, nothing queued or reserved';
      })); });

  await check('Make a Video refuses an unknown style up front',
    () => { const env = freshEnv(); return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
      const r = await req(port, { method: 'POST', path: '/demo/make-video', body: { topic: 'Listening', style: 'oil-painting' } });
      assert(r.status === 400 && r.json.error === 'invalid_style', `expected 400 invalid_style, got ${r.status} ${r.text}`);
      const ok = await req(port, { method: 'POST', path: '/demo/make-video', body: { topic: 'Listening', style: 'motion-graphics' } });
      assert(ok.status === 202, `a valid style should be accepted, got ${ok.status} ${ok.text}`);
      return '400 for unknown, 202 for motion-graphics';
    }); });
}

async function healthChecks() {
  console.log('\n2c. /health reports in-flight one-video jobs, and ok is computed');

  const health = require(path.join(__dirname, '..', 'server', 'lib', 'health'));
  const shutdown = require(path.join(__dirname, '..', 'server', 'lib', 'shutdown'));
  const jobsLib = require(path.join(__dirname, '..', 'server', 'lib', 'jobs'));

  await check('/health counts a job being written, so predeploy-check can see it',
    () => {
      const env = freshEnv();
      // A write that never finishes: the job sits in `running` for the whole test.
      const pipeline = fakePipeline({ write: () => new Promise(() => {}) });
      return withServer(env, { oneVideo: pipeline, store: freshStore(env) }, async (port) => {
        await req(port, { method: 'POST', path: '/demo/make-video', body: { topic: 'a topic' } });
        const h = await req(port, { path: '/health' });
        assert(h.json.jobs && h.json.jobs.inFlight, `no jobs.inFlight on /health: ${h.text.slice(0, 200)}`);
        assert(h.json.jobs.inFlight.writing === 1, `expected writing=1, got ${JSON.stringify(h.json.jobs.inFlight)}`);
        assert(h.json.jobs.inFlight.any === true, 'any should be true while a job is being written');
        return 'writing=1';
      });
    });

  await check('/health reports real storage numbers -- the storage block is not an error object',
    () => {
      const env = freshEnv({ JOB_STORE_DURABLE: '1' });
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
        // The whole storage block sits inside ONE try/catch, so any throw inside
        // it -- a renamed export, a module half-landed across two commits --
        // replaces every volume-usage figure with {error}. /health still answers
        // 200 ok:true, so nothing fails and nobody is told. That is exactly what
        // happened on 2026-09-28: a gd.identity() call shipped without the
        // module defining it, and production lost the numbers disk growth is
        // watched by until somebody read /health by hand.
        const h = await req(port, { path: '/health' });
        const st = h.json.storage;
        assert(st, 'no storage block on /health');
        assert(!st.error, `the storage block threw and was swallowed: ${st.error}`);
        assert(st.deliverables, 'no storage.deliverables -- the volume-usage numbers are gone');
        assert(typeof st.deliverables.bytes === 'number', 'storage.deliverables.bytes is not a number');
        assert(st.driveOffload, 'no storage.driveOffload');
        assert(typeof st.driveOffload.configured === 'boolean', 'driveOffload.configured is not a boolean');
        assert(st.memory && typeof st.memory.rssBytes === 'number', 'no storage.memory.rssBytes');
        return 'deliverables, driveOffload and memory all present';
      });
    });

  await check('/health.ok is computed: a memory job store is 503, a healthy one is 200',
    () => {
      const good = health.verdict({
        store: { health: () => ({ durability: 'volume', writable: true }) },
        readiness: { model: true, gemini: true, budgetAuthorised: true },
      });
      assert(good.ok === true && good.status === 200, `healthy store judged ${JSON.stringify(good)}`);
      const mem = health.verdict({
        store: { health: () => ({ durability: 'memory', writable: true }) },
        readiness: { model: true, gemini: true, budgetAuthorised: true },
      });
      assert(mem.ok === false && mem.status === 503, `memory store judged ${JSON.stringify(mem)}`);
      assert(/memory/.test(mem.reasons.join(' ')), 'the reason does not say the store is in memory');
      const degraded = health.verdict({
        store: { health: () => ({ durability: 'volume', writable: true }) },
        readiness: { model: false, modelNote: 'no credential', gemini: true, budgetAuthorised: false },
      });
      assert(degraded.ok === false && degraded.status === 200, `degraded should be 200 ok:false, got ${JSON.stringify(degraded)}`);
      assert(degraded.reasons.length === 2, `expected 2 reasons, got ${JSON.stringify(degraded.reasons)}`);
      return '200 / 503 / degraded-200';
    });

  await check('the live /health route answers ok:false with reasons rather than a hardcoded true',
    () => {
      const env = freshEnv({ PIPELINE_BUDGET_USD: '0' });
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
        const h = await req(port, { path: '/health' });
        assert(h.json.ok === false, `ok should be false with PIPELINE_BUDGET_USD=0, got ${h.json.ok}`);
        assert(Array.isArray(h.json.notOkBecause) && /PIPELINE_BUDGET_USD/.test(h.json.notOkBecause.join(' ')),
          `notOkBecause missing or vague: ${JSON.stringify(h.json.notOkBecause)}`);
        assert(h.status === 200, `a degraded-but-serving container must stay 200, got ${h.status}`);
        return 'ok:false, 200, reason named';
      });
    });

  await check('SIGTERM handling marks in-flight jobs now, not at the next boot',
    () => {
      const env = freshEnv();
      const store = freshStore(env);
      const writing = jobsLib.create({ topic: 'w', owner: null }, { store });
      const producing = jobsLib.create({ topic: 'p', owner: null }, { store });
      jobsLib.transition(producing.id, { status: 'producing' }, { store });
      const done = jobsLib.create({ topic: 'd', owner: null }, { store });
      jobsLib.transition(done.id, { status: 'written' }, { store });
      const m = shutdown.markInterrupted({ jobs: jobsLib, store, reason: 'SIGTERM' });
      assert(m.failed === 1 && m.interrupted === 1, `marked ${JSON.stringify(m)}`);
      const w = jobsLib.get(writing.id, { store });
      const p = jobsLib.get(producing.id, { store });
      const d = jobsLib.get(done.id, { store });
      assert(w.status === 'failed' && /restart/.test(w.error), `writing job: ${w.status} / ${w.error}`);
      assert(p.status === 'interrupted' && p.resumable === true, `producing job: ${p.status}`);
      assert(d.status === 'written' && !d.error, 'a written job must be left alone');
      return 'writing->failed, producing->interrupted, written untouched';
    });
}

(async () => {
  console.log(`\n${'='.repeat(64)}`);
  console.log('  SERVER HTTP TESTS');
  console.log('='.repeat(64));

  await authChecks();
  await moneyChecks();
  await resilienceChecks();
  await healthChecks();
  await demoSpendChecks();
  await adminResetChecks();
  await bridgeChecks();
  await lessonFileChecks();
  await styleChecks();
  for (const d of storeDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }

  console.log(`\n${'-'.repeat(64)}`);
  console.log(`  ${pass} passed, ${failures.length} failed` + (skipped ? `, ${skipped} skipped` : ''));
  if (failures.length) {
    for (const f of failures) console.log(`    - ${f.name}: ${f.message}`);
    process.exitCode = 1;
  }
  console.log('');
})();

module.exports = { withServer, req, cookieFrom, fakePipeline };
