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
      return 'public, clean';
    }));

  await check('/health answers without a credential', () => withServer(BASE_ENV, {}, async (port) => {
    const r = await req(port, { path: '/health' });
    assert(r.status === 200, `expected 200, got ${r.status}`);
    assert(r.json.ok === true, 'health should be ok');
    return 'ok';
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
function freshEnv(extra = {}) {
  return {
    ...BASE_ENV,
    JOB_STORE_DIR: storeEnv(),
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

  await check('a tenant at its monthly ceiling gets 402, and is told what remains',
    () => {
      const env = freshEnv({
        TENANTS_JSON: JSON.stringify([{ id: 'tiny', name: 'Tiny', token: LMS_TOKEN, monthlyUsd: 1 }]),
      });
      return withServer(env, { oneVideo: fakePipeline(), store: freshStore(env) }, async (port) => {
        const { jobId, cookie } = await makeJob(port);
        await settle();
        const auth = { authorization: `Bearer ${LMS_TOKEN}` };
        await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/claim`, headers: auth, cookie });
        // The per-run budget is $5 and the monthly ceiling is $1, so the very
        // first reservation cannot fit.
        const r = await req(port, { method: 'POST', path: `/demo/make-video/${jobId}/produce`, headers: auth, body: {} });
        assert(r.status === 402, `expected 402, got ${r.status}: ${r.text}`);
        assert(r.json.error === 'tenant_budget_exhausted', `wrong error: ${r.json.error}`);
        assert(typeof r.json.remainingUsd === 'number', 'the refusal did not say what remains');
        return `402, $${r.json.remainingUsd} left`;
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
  const withCourse = async (fn, { withMp4 = false } = {}) => {
    const env = freshEnv({ JOB_STORE_DURABLE: '1' });
    for (const m of ['../../server/lib/job-store', '../lib/queue', '../lib/deliverables']) {
      try { delete require.cache[require.resolve(path.join(__dirname, m))]; } catch { /* fine */ }
    }
    delete require.cache[require.resolve(path.join(__dirname, '..', 'server', 'lib', 'job-store'))];
    delete require.cache[require.resolve(path.join(__dirname, 'lib', 'queue'))];
    delete require.cache[require.resolve(path.join(__dirname, 'lib', 'deliverables'))];

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
      queue.block(LESSON, 'run-fixture-1', 'the frame gate found problems', 'post-render-check');

      // What produce.js copies BEFORE the frame gate: beats and timings, no video.
      const vid = fs.mkdtempSync(path.join(os.tmpdir(), 'vidfix-'));
      fs.writeFileSync(path.join(vid, 'beats.js'), 'module.exports=[{id:"01"}];');
      fs.writeFileSync(path.join(vid, 'durations.json'), '{"01":2.5}');
      if (withMp4) fs.writeFileSync(path.join(vid, 'x_final.mp4'), Buffer.alloc(4096, 7));
      deliverables.persist({
        series: 'fixtures',
        slug: 'a-lesson-that-blocked',
        videoDir: vid,
        ...(withMp4 ? { finalPath: path.join(vid, 'x_final.mp4') } : {}),
      });

      return await withServer(env, {}, fn);
    } finally {
      for (const k of Object.keys(saved)) {
        if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
      }
    }
  };

  const auth = { authorization: `Bearer ${LMS_TOKEN}` };

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
      return 'false for a beats-only lesson whose blockedBy says post-render-check';
    }));

  await check('deliverableAvailable is true once the mp4 is there', () =>
    withCourse(async (port) => {
      const r = await req(port, { path: `/api/v1/courses/${COURSE}`, headers: auth });
      const item = (r.json.items || []).find((i) => i.id === LESSON);
      assert(item && item.deliverableAvailable === true,
        'the mp4 is on the volume but the course view says it is not fetchable');
      return 'true for the same blockedBy, once the bytes exist';
    }, { withMp4: true }));

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

(async () => {
  console.log(`\n${'='.repeat(64)}`);
  console.log('  SERVER HTTP TESTS');
  console.log('='.repeat(64));

  await authChecks();
  await moneyChecks();
  await bridgeChecks();
  await lessonFileChecks();
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
