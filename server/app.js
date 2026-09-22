'use strict';
/**
 * app -- the Express application, built but not started.
 *
 * Separated from index.js so it can be imported without a side effect. While the
 * routes and `app.listen` lived in one module, nothing could import this server
 * to test it: requiring the file bound a port and started the tick loop, which
 * begins real, paid work. So the surface that spends money and publishes video
 * had no HTTP tests at all.
 *
 * `createApp` therefore starts nothing. It builds the app and returns it; the
 * caller decides whether to listen. `tick.startLoop()` deliberately stays in
 * index.js for the same reason -- a test that imported this must never be able
 * to start a render.
 *
 * `opts` are injection seams, all optional and all defaulting to the real
 * module. They exist so a test can substitute the pipeline and exercise auth,
 * ownership, throttling and the job store without reaching the spine.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const { config, readiness } = require('./lib/config');
const slack = require('./lib/slack');
const tick = require('./lib/tick');
const { parseRequest } = require('./lib/parse');

function createApp(opts = {}) {
  // The pipeline. Injected in tests so no route can reach the spine or spend.
  const oneVideo = opts.oneVideo || require('./lib/one-video');
  const jobStore = opts.store || require('./lib/job-store').shared();
  const jobsLib = opts.jobs || require('./lib/jobs');
  const owner = require('./lib/owner');
  const tenants = require('./lib/tenants');
  const throttle = opts.throttle || require('./lib/throttle');
  const ledger = opts.ledger || require('./lib/ledger');
  const idempotency = require('./lib/idempotency');
  const webhook = opts.webhook || require('./lib/webhook');
  const { bearerOf } = require('./lib/api');

  const app = express();

  // Railway terminates TLS at its edge and forwards over http, so without this
  // req.protocol reads "http" and the self-describing API index hands the LMS
  // developer http:// example URLs for an https-only service.
  //
  // `1`, not `true`. With `true` Express believes the LEFT-MOST X-Forwarded-For
  // entry, which is supplied entirely by the caller -- so every per-IP limit
  // became advisory the moment someone set the header. `1` trusts exactly the one
  // hop Railway's proxy adds. req.protocol, the reason this line exists, is
  // unaffected.
  app.set('trust proxy', 1);

  // Keep the raw body: Slack's signature is computed over the exact bytes sent, so
  // verifying against a re-serialised object never matches.
  //
  // 2mb is what /slack/events needs. It is far more than any other route accepts,
  // and it used to apply to all of them -- so an unauthenticated caller could make
  // the server parse two megabytes before any auth check ran. The small limit is
  // the default now and the large one is scoped to the route that earns it.
  const slackJson = express.json({
    limit: '2mb',
    verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
  });
  app.use((req, res, next) => {
    if (req.path === '/slack/events') return slackJson(req, res, next);
    return express.json({ limit: '32kb' })(req, res, next);
  });

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      contractVersion: require('./lib/api').CONTRACT_VERSION,
      surfaces: readiness(),
      tick: tick.status(),
      // Say what the store actually is. A service that claimed durability it did
      // not have would send the next person debugging the wrong end entirely.
      jobStore: jobStore.health(),
      // Where course state lives, so "did my course survive the redeploy?" is a
      // GET rather than an argument.
      courses: (() => {
        try {
          const q = require('../orchestrator/lib/queue');
          const cw = require('./lib/course-worker');
          return {
            durability: q.durability(),
            queueFile: q.queueFile(),
            durableSince: q.durableSince(),
            awaitingApproval: cw.awaitingApproval().length,
            // Counts only, no ids -- this route has no credential. needsResume is
            // the fact an operator needs after a deploy: work is waiting and the
            // worker is idle, because boot starts nothing on purpose.
            worker: (() => {
              const s = cw.status();
              return {
                running: s.running,
                building: Boolean(s.current),
                eligible: s.eligible,
                needsResume: s.needsResume,
                heldCourses: s.held.length,
              };
            })(),
          };
        } catch (e) { return { error: e.message }; }
      })(),
      tenants: tenants.registry().health(),
      webhooks: webhook.health(),
    });
  });

  /**
   * Can this container render, right now, without spending anything to find out?
   *
   * Separate from /health because it launches a browser and shells out three
   * times -- a second or two, too slow for a liveness probe that runs constantly,
   * and far too useful to bury inside one. This is the question to ask straight
   * after a deploy, and the answer it gives is the same one produce asks itself
   * before it buys anything.
   */
  app.get('/health/render', async (_req, res) => {
    try {
      const preflight = require('../orchestrator/lib/preflight');
      const r = await preflight.check();
      res.status(r.ok ? 200 : 503).json({
        ok: r.ok,
        checks: r.results,
        note: r.ok
          ? 'This container can render. A run that fails now is about the video, not the machine.'
          : 'A render would fail AFTER buying art and speech. Fix these first.',
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.get('/', (_req, res) => res.type('text').send('Drawing Room agent. Mention me in Slack, or file a ticket in Notion.'));

  // ─── Checkpoint API + demo (Taleemabad University integration) ────────────────

  // The read API the LMS calls for a video's in-video questions. Mounted before
  // the Slack routes because it shares nothing with them: no signature check, no
  // worker, no spend. See server/lib/api.js for the auth and CORS rules.
  const apiRouter = require('./lib/api').build();
  app.use('/api/v1', apiRouter);

  /**
   * The interactive demo the LMS developer is asked to reproduce. Served from this
   * repo so the specification and the running example can never drift apart, and
   * so the developer needs no Claude account to see it.
   *
   * Self-contained on purpose: it does NOT call the API above, because doing so
   * from a browser would mean shipping the API token to the client.
   */
  const DEMO_FILE = path.join(__dirname, '..', 'prototypes', 'lms-quiz-popup-prototype.html');
  app.get('/demo/quiz', (_req, res) => {
    if (!fs.existsSync(DEMO_FILE)) {
      return res.status(404).type('text').send('Demo not built. Run: node prototypes/build.js');
    }
    // The page embeds its images as data URIs, so it needs no other assets.
    res.set('Cache-Control', 'public, max-age=300');
    res.type('html').send(fs.readFileSync(DEMO_FILE, 'utf8'));
  });
  app.get('/demo', (_req, res) => res.redirect(302, '/demo/quiz'));

  /** The course-builder prototype. Needs no credential — see the demo planner below. */
  const COURSE_FILE = path.join(__dirname, '..', 'prototypes', 'course-builder.html');
  app.get('/demo/course-builder', (_req, res) => {
    if (!fs.existsSync(COURSE_FILE)) {
      return res.status(404).type('text').send('Course builder prototype not deployed.');
    }
    res.set('Cache-Control', 'public, max-age=300');
    res.type('html').send(fs.readFileSync(COURSE_FILE, 'utf8'));
  });

  /**
   * Planning for the demo page, with no token required.
   *
   * The token was removed so anyone handed the link can try it. That makes this
   * an unauthenticated endpoint that spends real money on every call -- roughly
   * $0.64 a plan -- so it is rate limited instead. Without a limit, one crawler
   * or one shared link is an open tap on the model budget.
   *
   * Limits are per running container and reset on redeploy. That is fine for a
   * prototype and deliberately not presented as security: the protection here is
   * that the URL is unlisted and the cost per caller is capped, not that callers
   * are identified. The real API at /api/v1/courses/plan still requires a token.
   */
  const DEMO_LIMIT = { perIpPerHour: 5, globalPerHour: 40 };
  const demoHits = [];           // timestamps, newest last
  const demoByIp = new Map();    // ip -> timestamps

  function demoRateCheck(ip) {
    const now = Date.now();
    const hourAgo = now - 3600_000;
    while (demoHits.length && demoHits[0] < hourAgo) demoHits.shift();
    const mine = (demoByIp.get(ip) || []).filter((t) => t >= hourAgo);

    if (demoHits.length >= DEMO_LIMIT.globalPerHour) {
      return { ok: false, why: 'This demo has planned as many courses as it is allowed to '
        + 'this hour. Try again shortly, or use the API with a token.' };
    }
    if (mine.length >= DEMO_LIMIT.perIpPerHour) {
      return { ok: false, why: `The demo allows ${DEMO_LIMIT.perIpPerHour} plans an hour. `
        + 'Try again later, or use the API with a token for unlimited planning.' };
    }
    mine.push(now);
    demoByIp.set(ip, mine);
    demoHits.push(now);
    // Keep the per-IP map from growing without bound on a long-lived container.
    if (demoByIp.size > 500) {
      for (const [k, v] of demoByIp) if (!v.some((t) => t >= hourAgo)) demoByIp.delete(k);
    }
    return { ok: true };
  }

  /**
   * Make ONE video from a topic. The smallest useful thing this system does, and
   * the only path that runs end to end today with nobody in the middle.
   *
   * One model call writes the lesson and its question; the renderer draws it.
   * About ninety seconds, and nothing is bought -- cards need no art or audio.
   * A course is nine of these plus a queue and an approval step, which is why it
   * is a separate page and not the default.
   *
   * No key: the service supplies its own credential. Rate limited instead,
   * because the writing step is a real model call.
   */
  // ── who is calling, on every /demo route ────────────────────────────────
  //
  // A jobId used to be the only thing standing between a stranger and the two
  // buttons that spend money and publish video. Every job is now bound to an
  // owner at birth: a tenant when a credential is present, otherwise a signed,
  // HttpOnly cookie. See server/lib/owner.js for why a cookie and not a token.
  app.use('/demo', owner.attachOwner({ registry: () => tenants.registry(), bearerOf }));

  /**
   * Make ONE video from a topic. The smallest useful thing this system does, and
   * the only path that runs end to end today with nobody in the middle.
   *
   * One model call writes the lesson and its question; the renderer draws it.
   * About ninety seconds, and nothing is bought -- cards need no art or audio.
   *
   * STILL OPEN TO ANYONE, ON PURPOSE. Research, draft and gate are model calls on
   * the service's own credential and buy nothing, so requiring a token here would
   * cost the demo its point and protect nothing. The money is two calls further
   * on, and that is where the credential is required.
   */
  const MAKE_LIMIT = {
    perOwnerPerHour: Number(process.env.ANON_MAKE_PER_HOUR) || 6,
    perIpPerHour: Number(process.env.ANON_MAKE_PER_IP_PER_HOUR) || 30,
    globalPerHour: Number(process.env.MAKE_GLOBAL_PER_HOUR) || 40,
  };

  app.post('/demo/make-video', async (req, res) => {
    // A tenant gets its own bucket; an anonymous caller is keyed on the signed
    // cookie, which is the closest thing to an identity they have.
    const isTenant = req.owner.kind === 'tenant';
    const limit = isTenant
      ? Math.max(MAKE_LIMIT.perOwnerPerHour, throttle.limitsFor(req.owner.tenant).producePerHour)
      : MAKE_LIMIT.perOwnerPerHour;

    const perOwner = throttle.consume({
      bucket: `make:${req.owner.id}:h`, limit, windowMs: throttle.HOUR,
    });
    throttle.setHeaders(res, perOwner);
    if (!perOwner.ok) {
      return res.status(429).json({
        error: 'rate_limited',
        message: `This makes ${limit} scripts an hour per caller. Try again in `
          + `${perOwner.retryAfterSec} seconds.`,
        retryAfterSeconds: perOwner.retryAfterSec,
      });
    }

    // A backstop only, and deliberately loose. With a proxy in front, the client
    // supplies X-Forwarded-For, so this bounds abuse rather than identifying
    // anybody -- the cookie bucket above is the real limit.
    if (!isTenant) {
      const perIp = throttle.consume({
        bucket: `make:ip:${req.ip || 'unknown'}:h`,
        limit: MAKE_LIMIT.perIpPerHour, windowMs: throttle.HOUR,
      });
      if (!perIp.ok) {
        return res.status(429).json({
          error: 'rate_limited',
          message: 'Too many scripts from this address in the last hour.',
          retryAfterSeconds: perIp.retryAfterSec,
        });
      }
      const global = throttle.consume({
        bucket: 'make:global:h', limit: MAKE_LIMIT.globalPerHour, windowMs: throttle.HOUR,
      });
      if (!global.ok) {
        return res.status(429).json({
          error: 'rate_limited',
          message: 'This service is writing as many scripts as it allows itself this hour.',
          retryAfterSeconds: global.retryAfterSec,
        });
      }
    }

    const topic = String((req.body && req.body.topic) || '').trim();
    if (!topic) {
      // Checked here rather than left to fail inside the job. It used to burn one
      // of the caller's six attempts and surface minutes later as status:'failed',
      // which is a confusing way to say "you sent an empty field".
      return res.status(400).json({ error: 'bad_request', message: 'A topic is required.' });
    }

    // A callback is a request this server makes on a stranger's instruction, so
    // only an identified caller may register one -- see server/lib/webhook.js.
    let callbackUrl = null;
    const wanted = req.body && req.body.callbackUrl;
    if (wanted) {
      if (!isTenant) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'A callbackUrl needs a credential; anonymous callers may not register one.',
        });
      }
      const ok = webhook.validateCallbackUrl(wanted);
      if (!ok.ok) return res.status(400).json({ error: 'bad_callback', message: ok.why });
      callbackUrl = ok.url.toString();
    }

    const job = startWrite({ topic, notes: req.body && req.body.notes }, req.owner, callbackUrl);
    res.status(202).json({
      jobId: job.id,
      status: job.status,
      owner: req.owner.kind,
      note: req.owner.kind === 'anon'
        ? 'This job is bound to this browser session. Producing it needs an API token.'
        : undefined,
    });
  });

  /** Fire a callback, if this job asked for one. Never blocks the transition. */
  function notify(job) {
    if (!job || !job.callbackUrl) return;
    const tenant = job.tenantId ? tenants.registry().byId(job.tenantId) : null;
    webhook.send({
      url: job.callbackUrl,
      secret: (tenant && tenant.webhookSecret) || null,
      store: jobStore,
      jobId: job.id,
      event: {
        type: 'job.status_changed',
        jobId: job.id,
        status: job.status,
        stage: job.stage,
        at: new Date().toISOString(),
      },
    });
  }

  const jobOpts = { store: jobStore, oneVideo, onTransition: notify };

  function startWrite(body, jobOwner, callbackUrl) {
    const job = jobsLib.create({ topic: body.topic, notes: body.notes, owner: jobOwner, callbackUrl }, jobOpts);
    const id = job.id;

    oneVideo.write(body, {
      log: (m) => console.log(`[make-video ${id}]`, m),
      onStage: (st) => { jobsLib.transition(id, { stage: st }, jobOpts); },
    }).then((r) => {
      // Stored as a projection. The beats already live durably in
      // explainer-videos/<series>/<slug>/beats.js; a second copy here would be a
      // second truth, free to drift from the first.
      const checkpoint = (r.beats || []).find((b) => b.mode === 'checkpoint');
      jobsLib.transition(id, {
        status: 'written',
        stage: 'gate',
        patch: {
          script: {
            itemId: r.itemId, slug: r.slug, series: r.series, title: r.title,
            slo: r.brief && r.brief.slo,
            interpretation: r.brief && r.brief.interpretation,
            scenario: r.brief && r.brief.ali_scenario,
            gate: r.gate && r.gate.verdict,
            redrafts: r.redrafts,
            // Enough to REVIEW a beat, not just read it aloud.
            //
            // This carried {id, mode, vo} only, so nothing anywhere served a
            // beat's caption, art prompt or overlay -- and the one surface meant
            // for reading a script before paying for it showed only the words
            // that get spoken. Diagnosing a wordless beat meant reading the
            // renderer's source to work out what it would have drawn.
            //
            // Still a projection, not a second truth: beats.js on disk remains
            // authoritative, and this is the subset a person needs to answer
            // "is this beat going to render something worth watching?"
            beats: (r.beats || []).map((b) => ({
              id: b.id,
              mode: b.mode,
              vo: b.vo || null,
              cap: b.cap || null,
              art: b.art || null,
              overlay: b.overlay ? { tpl: b.overlay.tpl || null } : null,
              info: b.info ? { tpl: b.info.tpl || null } : null,
            })),
            // The question the LMS will pop. Never drawn, never spoken.
            checkpoint: checkpoint ? checkpoint.quiz : null,
            checkpointAfterBeat: checkpoint
              ? ((r.beats.slice(0, r.beats.indexOf(checkpoint)).filter((b) => b.mode !== 'checkpoint').pop() || {}).id)
              : null,
          },
        },
      }, jobOpts);
      console.log(`[make-video ${id}] READY: ${r.title} (${r.beats.length} beats, `
        + `${r.redrafts} redraft(s))`);
    }).catch((e) => {
      jobsLib.transition(id, { status: 'failed', patch: { error: e.message } }, jobOpts);
      console.error(`[make-video ${id}] failed: ${e.message}`);
      // The stack, always. A SyntaxError names no file and no line in its message,
      // so without this a module that fails to PARSE in the container is
      // indistinguishable from one that throws while running.
      if (e.stack) console.error(e.stack.split('\n').slice(0, 8).join('\n'));
    });

    return job;
  }

  /**
   * Load the job this request is about, or answer for it.
   *
   * A caller who does not own the job gets 404 with a body identical to a job
   * that never existed. 403 would confirm the id is real, which turns a
   * twelve-character id space into an enumeration oracle -- and confirming the id
   * is most of what someone holding a stray jobId wanted.
   */
  function ownedJob(req, res) {
    const job = jobsLib.get(req.params.jobId, jobOpts);
    if (!job || !jobsLib.ownedBy(job, req.owner)) { owner.notFound(res); return null; }
    return job;
  }

  const baseUrlOf = (req) => `${req.protocol}://${req.get('host')}`;

  app.get('/demo/make-video/:jobId', (req, res) => {
    const job = ownedJob(req, res);
    if (!job) return undefined;
    return res.json(jobsLib.toPublic(job, { baseUrl: baseUrlOf(req) }));
  });

  /**
   * Hand an anonymous job to the tenant about to pay for it.
   *
   * The demo page creates a job with no credential (free) and then presses
   * Produce with one. Without this step the creator and the producer are
   * different owners and every job the page makes would 404 at the button.
   */
  app.post('/demo/make-video/:jobId/claim', owner.requireTenant('produce'), (req, res) => {
    const job = jobsLib.get(req.params.jobId, jobOpts);
    if (!job) return owner.notFound(res);

    // Already ours. Idempotent, so a client that cannot remember whether it
    // claimed does not have to care.
    if (jobsLib.ownedBy(job, req.owner)) {
      return res.json({ jobId: job.id, owner: job.ownerId, claimedFrom: job.claimedFrom, alreadyOurs: true });
    }

    // Otherwise the tenant must prove it holds the browser session that created
    // the job. The tenant token alone is deliberately not enough -- if it were,
    // any credential could adopt any stranger's job by guessing its id.
    const sessionId = owner.cookieOwnerId(req);
    if (!sessionId || job.ownerId !== sessionId) return owner.notFound(res);

    const r = jobsLib.claim(req.params.jobId, { to: req.owner }, jobOpts);
    if (!r.ok) return res.status(409).json({ error: 'cannot_claim', message: r.why });
    return res.json({ jobId: r.job.id, owner: r.job.ownerId, claimedFrom: r.job.claimedFrom });
  });

  /**
   * Turn a gated script into the finished video.
   *
   * SEPARATE FROM WRITING ON PURPOSE. Everything up to the gate buys nothing.
   * This buys generated art and speech -- about $1.50 -- and house rules say that
   * is never spent without a person saying yes. Pressing the button on a script
   * you have just read IS that yes, and the credential is who said it.
   */
  app.post('/demo/make-video/:jobId/produce', owner.requireTenant('produce'), (req, res) => {
    const job = ownedJob(req, res);
    if (!job) return undefined;
    const tenant = req.owner.tenant;

    // Idempotency is checked FIRST, before the state guard.
    //
    // A retry arrives after the original has moved the job on, so judging it
    // against the new state answers a question the caller did not ask -- they
    // are not starting a run, they are asking what happened to the one they
    // already started. The stored response is that answer.
    const key = idempotency.keyOf(req);
    let claimed = null;
    if (key) {
      const bodyHash = idempotency.fingerprint(job.id, req.body);
      const begun = idempotency.begin(jobStore, { tenantId: tenant.id, jobId: job.id, key, bodyHash });
      if (begun.state === 'conflict') {
        return res.status(409).json({
          error: 'idempotency_key_reuse',
          message: 'That Idempotency-Key was used for a different request.',
        });
      }
      if (begun.state === 'replay' || begun.state === 'in_flight') {
        res.set('Idempotency-Replayed', 'true');
        const stored = begun.record.response;
        return res.status((stored && stored.status) || 202)
          .json((stored && stored.body) || { jobId: job.id, status: job.status, idempotent: true });
      }
      claimed = begun;
    }

    /** Give the key back, so a genuine later retry is not answered from a run that never began. */
    const unclaim = () => { if (claimed) idempotency.abandon(jobStore, { tenantId: tenant.id, scopedKey: claimed.scopedKey }); };

    if (!job.script || (job.status !== 'written' && job.status !== 'interrupted')) {
      // None of these is an error, and none of them may spend again. A client
      // that retried a timed-out request wants to know where its run got to, not
      // a 409 it has to special-case -- and a second paid run is the one outcome
      // that must never happen here.
      if (['producing', 'publishing', 'awaiting_review', 'published'].includes(job.status)) {
        unclaim();
        return res.status(202).json({
          jobId: job.id,
          status: job.status,
          idempotent: true,
          startedAt: job.produce && job.produce.startedAt,
          spendUsd: job.produce && job.produce.spendUsd,
          note: job.status === 'producing' || job.status === 'publishing'
            ? 'Already in flight; this is the existing run, not a second one.'
            : 'This has already been produced. Nothing was bought again.',
        });
      }
      unclaim();
      return res.status(409).json({
        error: 'not_ready',
        message: job.script
          ? `This job is ${job.status}, so there is nothing to produce.`
          : 'This video has no gated script yet.',
      });
    }

    // A spend we cannot record is a spend we will not make.
    if (!jobStore.canRecordSpend()) {
      unclaim();
      return res.status(503).json({
        error: 'ledger_unavailable',
        message: 'This server cannot durably record what it spends, so it refuses to spend. '
          + 'See jobStore.durability on /health.',
      });
    }

    const budgetUsd = Math.min(
      config.pipeline.maxApprovableUsd,
      Number.isFinite(tenant.maxRunUsd) && tenant.maxRunUsd !== null ? tenant.maxRunUsd : Infinity
    );
    if (!(budgetUsd > 0)) {
      unclaim();
      return res.status(503).json({
        error: 'no_budget',
        message: 'Producing a video buys art and speech, and this service has no approved '
          + 'spend limit set (PIPELINE_MAX_APPROVABLE_USD).',
      });
    }

    // Rate limits, before anything is written down.
    const limits = throttle.limitsFor(tenant);
    for (const [bucket, limit, windowMs, label] of [
      [`produce:${tenant.id}:h`, limits.producePerHour, throttle.HOUR, 'an hour'],
      [`produce:${tenant.id}:d`, limits.producePerDay, throttle.DAY, 'a day'],
    ]) {
      const r = throttle.check({ bucket, limit, windowMs });
      throttle.setHeaders(res, r);
      if (!r.ok) {
        unclaim();
        return res.status(429).json({
          error: 'rate_limited',
          message: `${tenant.id} may produce ${limit} videos ${label}.`,
          retryAfterSeconds: r.retryAfterSec,
        });
      }
    }

    const reservation = ledger.reserve(jobStore, {
      tenantId: tenant.id, jobId: job.id, usd: budgetUsd, key, tenant,
    });
    if (!reservation.ok) {
      unclaim();
      // 402, not 429: this tells the caller retrying will never help, which a
      // rate limit explicitly does not.
      const status = reservation.reason === 'ledger_unavailable' ? 503 : 402;
      return res.status(status).json({ error: reservation.reason, message: reservation.why, ...reservation });
    }

    for (const bucket of [`produce:${tenant.id}:h`, `produce:${tenant.id}:d`]) {
      throttle.consume({ bucket, limit: Infinity, windowMs: throttle.DAY });
    }

    jobsLib.transition(job.id, {
      status: 'producing',
      patch: {
        spendRef: reservation.ref,
        produce: { status: 'running', stage: 'produce', startedAt: Date.now() },
      },
    }, jobOpts);

    oneVideo.produce(
      {
        itemId: job.script.itemId, budgetUsd, brief: job.script.brief,
        // Only when the request says so. Default is still to stop and wait.
        publishAs: (req.body && req.body.publish) ? approverOf(req) : null,
      },
      {
        log: (m) => console.log(`[produce ${job.id}]`, m),
        onStage: (st) => {
          jobsLib.transition(job.id, { patch: { produce: { ...(jobsLib.get(job.id, jobOpts) || {}).produce, stage: st } } }, jobOpts);
        },
      }
    ).then((r) => {
      const cur = jobsLib.get(job.id, jobOpts);
      const elapsed = Math.round((Date.now() - ((cur && cur.produce && cur.produce.startedAt) || Date.now())) / 1000);
      ledger.settle(jobStore, {
        tenantId: tenant.id, ref: reservation.ref, jobId: job.id,
        runId: r.runId, usd: r.spendUsd, outcome: r.awaitingReview ? 'awaiting_review' : 'done',
      });
      if (r.awaitingReview) {
        // The pipeline working as designed: a person watches it before it goes out.
        jobsLib.transition(job.id, {
          status: 'awaiting_review',
          patch: {
            spendRef: null,
            // The absolute path is NOT stored -- see server/lib/jobs.js.
            review: { itemId: r.itemId, series: r.series || 'made', slug: r.slug, artifacts: r.artifacts, qa: r.qa },
            produce: { status: 'awaiting_review', stage: 'review', spendUsd: r.spendUsd, qa: r.qa, elapsedSeconds: elapsed },
          },
        }, jobOpts);
        console.log(`[produce ${job.id}] finished, waiting for a human to approve it`);
      } else {
        jobsLib.transition(job.id, {
          status: 'published',
          patch: {
            spendRef: null,
            produce: { status: 'done', stage: 'upload', spendUsd: r.spendUsd, youtube: r.youtube, elapsedSeconds: elapsed },
          },
        }, jobOpts);
        console.log(`[produce ${job.id}] published:`, JSON.stringify(r.youtube));
      }
      if (claimed) {
        idempotency.complete(jobStore, { tenantId: tenant.id, scopedKey: claimed.scopedKey },
          { status: 202, body: { jobId: job.id, status: 'producing', budgetUsd } });
      }
    }).catch((e) => {
      // A run that failed after buying art HAS spent money. Settling at whatever
      // the spine recorded -- rather than releasing the reservation -- is what
      // stops a tenant burning budget for free by failing runs deliberately.
      ledger.settle(jobStore, {
        tenantId: tenant.id, ref: reservation.ref, jobId: job.id,
        runId: e.runId, usd: Number(e.spendUsd) || 0, outcome: 'failed',
      });
      jobsLib.transition(job.id, {
        status: 'written',   // the script is still good; only the render failed
        patch: { spendRef: null, produce: { status: 'failed', error: e.message } },
      }, jobOpts);
      console.error(`[produce ${job.id}] failed: ${e.message}`);
      if (e.stack) console.error(e.stack.split('\n').slice(0, 8).join('\n'));
      unclaim();
    });

    return res.status(202).json({ jobId: job.id, status: 'producing', budgetUsd, spendRef: reservation.ref });
  });

  /**
   * Who approved this, in a form that survives being read later.
   *
   * `by` was free text defaulting to 'Aroma', so a video approved by another
   * organisation's instructor was recorded in our audit trail under Aroma's name.
   * The tenant is the part that is verified -- it comes from the credential --
   * and the display name is what the caller says about itself.
   */
  function approverOf(req) {
    const tenant = req.owner.tenant;
    const claimedName = String((req.body && req.body.by) || '').slice(0, 120).trim();
    if (!tenant) return claimedName || 'Aroma';
    return claimedName
      ? `${claimedName} (${tenant.name}, tenant:${tenant.id})`
      : `${tenant.name} (tenant:${tenant.id})`;
  }

  /**
   * The script as a file you can keep.
   *
   * Reached by a top-level navigation from the page, which cannot carry an
   * Authorization header -- so this is one of the two routes the ownership cookie
   * exists for.
   */
  app.get('/demo/make-video/:jobId/script.md', (req, res) => {
    const job = ownedJob(req, res);
    if (!job) return undefined;
    if (!job.script) return res.status(404).type('text').send('No script for this job (or it expired).');

    const sc = job.script;
    const cp = sc.checkpoint || null;
    const L = [];

    L.push(`# ${sc.title}`, '');
    if (sc.interpretation) L.push(`> ${sc.interpretation}`, '');
    L.push(`**Topic asked:** ${job.topic}`);
    if (sc.slo) L.push(`**Outcome:** ${sc.slo}`);
    if (sc.scenario) L.push(`**Scenario:** ${sc.scenario}`);
    L.push(`**Review:** ${sc.gate || '?'}`
      + (sc.redrafts ? ` after ${sc.redrafts} redraft${sc.redrafts > 1 ? 's' : ''}` : ' on the first pass')
      + ` · ${sc.beats.length} beats`);
    L.push('', '---', '', '## The script', '');
    L.push('One beat is one spoken sentence, and the picture shown while it is spoken.', '');

    for (const b of sc.beats) {
      if (b.mode === 'checkpoint') {
        L.push('', `**— the video pauses here (beat ${b.id}) —**`, '');
        continue;
      }
      L.push(`**${b.id}** *(${b.mode})*  ${b.vo}`);

      // What the beat actually puts ON SCREEN, which is the half of a script that
      // decides whether a frame is worth watching -- and the half this file used
      // to omit entirely. An `ali` or `scene` beat draws its art and nothing else
      // unless it carries a caption or a working overlay, so "no words" here is a
      // real defect a reader can catch before a single dollar is spent.
      const onScreen = [];
      if (b.cap) onScreen.push(`caption: "${b.cap}"`);
      if (b.overlay && b.overlay.tpl) onScreen.push(`overlay: ${b.overlay.tpl}`);
      if (b.info && b.info.tpl) onScreen.push(`info: ${b.info.tpl}`);
      if (onScreen.length) {
        L.push(`    ${onScreen.join(' · ')}`);
      } else if (b.mode === 'ali' || b.mode === 'scene') {
        L.push('    ⚠ NO WORDS ON SCREEN — this beat draws art and nothing else.');
      }
      if (b.art) L.push(`    art: ${String(b.art).slice(0, 200)}`);
      L.push('');
    }

    if (cp) {
      L.push('---', '', '## The checkpoint', '');
      L.push('Never drawn, never spoken. The video pauses and the LMS shows this as a popup.', '');
      L.push(`**${cp.stem}**`, '');
      cp.options.forEach((o, i) => {
        L.push(`${i === cp.answer ? '- **[correct]**' : '-'} ${o}`);
      });
      L.push('', `**Why the others are wrong:** ${cp.explain}`, '');
    }

    L.push('---', '', `_Made by Content Queen for Taleemabad University · ${new Date().toISOString().slice(0, 10)}_`, '');

    const name = (sc.slug || 'script').replace(/[^a-z0-9-]/gi, '-').slice(0, 60);
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${name}.md"`);
    return res.send(L.join('\n'));
  });

  /**
   * Stream the finished video so it can be watched before it is published.
   *
   * The path is resolved now rather than remembered: a stored absolute path is
   * still a valid-looking string after a redeploy and points at nothing, so this
   * would serve a confident 500 where an honest 404 is the truth.
   */
  app.get('/demo/make-video/:jobId/video', (req, res) => {
    const job = ownedJob(req, res);
    if (!job) return undefined;
    const file = jobsLib.resolveFinalPath(job, { oneVideo });
    if (!file || !fs.existsSync(file)) {
      return res.status(404).type('text')
        .send('No finished video for this job on this container. If it was published, the YouTube link is the durable copy.');
    }
    return streamFile(req, res, file);
  });

  /**
   * Drop our copy of a job's video, once theirs is stored.
   *
   * Asked for by the LMS on 2026-09-22: a course lesson has GET and DELETE on its
   * file, a job had only GET, so on the one surface where they can already archive
   * today we kept our copy forever. The asymmetry was an oversight, not a policy.
   *
   * Same discipline as the course route: NEVER inferred from a successful GET. A
   * download that failed halfway would otherwise destroy the last remaining copy,
   * which is the failure this whole area exists to prevent. Deleting something
   * already gone is success -- the caller wants "your copy is gone", and it is.
   *
   * Only the durable copy is removed. The render directory dies with the next
   * redeploy on its own, and reaching into it here would mean a delete that
   * behaves differently depending on how recently we deployed.
   */
  app.delete('/demo/make-video/:jobId/video', owner.requireTenant('produce'), (req, res) => {
    const job = ownedJob(req, res);
    if (!job) return undefined;
    const from = (job.review && job.review.series && job.review.slug)
      ? job.review
      : (job.script && job.script.series && job.script.slug ? job.script : null);
    if (!from) {
      return res.status(404).json({ error: 'no_deliverable', message: 'This job has no video.' });
    }
    const r = require('../orchestrator/lib/deliverables').forget(from.series, from.slug);
    return res.json({
      deleted: `${from.series}/${from.slug}`,
      alreadyGone: !r.ok,
      note: r.ok
        ? 'Our durable copy is gone. Yours is now the only one unless the video was published.'
        : 'Nothing was held on the volume for this job, so there was nothing to delete.',
    });
  });

  /** Range-capable MP4 streaming, in one place rather than three copies. */
  function streamFile(req, res, file) {
    const size = fs.statSync(file).size;
    const range = req.headers.range;
    res.set('Content-Type', 'video/mp4');
    res.set('Accept-Ranges', 'bytes');
    if (!range) {
      res.set('Content-Length', size);
      return fs.createReadStream(file).pipe(res);
    }
    const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
    const start = Number(m[1] || 0);
    const end = m[2] ? Number(m[2]) : size - 1;
    if (!(start >= 0) || start >= size || end < start) {
      return res.status(416).set('Content-Range', `bytes */${size}`).end();
    }
    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': end - start + 1,
    });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }

  /** Publish a video a person has just watched. Nothing paid for is made again. */
  app.post('/demo/make-video/:jobId/approve', owner.requireTenant('approve'), (req, res) => {
    const job = ownedJob(req, res);
    if (!job) return undefined;
    if (job.status !== 'awaiting_review' || !job.review) {
      return res.status(409).json({ error: 'not_ready', message: 'There is no finished video waiting here.' });
    }
    const tenant = req.owner.tenant;

    const limits = throttle.limitsFor(tenant);
    const gate = throttle.consume({
      bucket: `approve:${tenant.id}:h`, limit: limits.approvePerHour, windowMs: throttle.HOUR,
    });
    throttle.setHeaders(res, gate);
    if (!gate.ok) {
      return res.status(429).json({
        error: 'rate_limited',
        message: `${tenant.id} may publish ${limits.approvePerHour} videos an hour.`,
        retryAfterSeconds: gate.retryAfterSec,
      });
    }

    const by = approverOf(req);
    jobsLib.transition(job.id, {
      status: 'publishing',
      patch: { produce: { ...job.produce, status: 'running', stage: 'upload' }, approvedBy: by },
    }, jobOpts);

    oneVideo.approve(
      { itemId: job.review.itemId, by, artifacts: job.review.artifacts },
      {
        log: (m) => console.log(`[approve ${job.id}]`, m),
        onStage: (st) => {
          jobsLib.transition(job.id, { patch: { produce: { ...(jobsLib.get(job.id, jobOpts) || {}).produce, stage: st } } }, jobOpts);
        },
      }
    ).then((r) => {
      const cur = jobsLib.get(job.id, jobOpts) || {};
      ledger.settle(jobStore, {
        tenantId: tenant.id, ref: `approve-${job.id}`, jobId: job.id,
        runId: r.runId, usd: 0, outcome: 'approve',
      });
      jobsLib.transition(job.id, {
        status: 'published',
        patch: { produce: { ...cur.produce, status: 'done', stage: 'upload', youtube: r.youtube } },
      }, jobOpts);
      console.log(`[approve ${job.id}] published:`, JSON.stringify(r.youtube));
    }).catch((e) => {
      const cur = jobsLib.get(job.id, jobOpts) || {};
      jobsLib.transition(job.id, {
        status: 'awaiting_review',
        patch: { produce: { ...cur.produce, status: 'awaiting_review', stage: 'review', error: e.message } },
      }, jobOpts);
      console.error(`[approve ${job.id}] failed:`, e.message);
    });

    return res.status(202).json({ jobId: job.id, status: 'publishing', by });
  });

  /**
   * Every job this caller owns, oldest transition first.
   *
   * Without this a lost jobId meant a lost job even while it was still live, and
   * polling was the only way to learn anything had changed.
   */
  app.get('/demo/jobs', owner.requireTenant(), (req, res) => {
    const page = jobsLib.listFor(req.owner, {
      since: req.query.since, cursor: req.query.cursor,
      limit: req.query.limit, status: req.query.status,
    }, jobOpts);
    res.json({
      count: page.jobs.length,
      jobs: page.jobs.map((j) => jobsLib.toPublic(j, { includeScript: false, baseUrl: baseUrlOf(req) })),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    });
  });

  /** What this tenant has spent this month, so a 402 is never a surprise. */
  app.get('/demo/spend', owner.requireTenant(), (req, res) => {
    res.json(ledger.summary(jobStore, req.owner.tenant));
  });


  /**
   * The videos this container actually holds, newest first.
   *
   * The page had no memory: jobId lived in a page variable, so a reload lost it,
   * and the in-memory job record expired after two hours anyway. A finished video
   * then had no route at all -- the page showed an empty form while the file sat on
   * disk. This reads the disk, so what exists is always reachable.
   */
  /**
   * The pinned demo topic and its finished example.
   *
   * One topic, one video, one question, all from the same run. The page shows
   * this before anything has been made, so the flow can be understood without
   * waiting half an hour -- and it survives a redeploy, which a video on the
   * container does not.
   */
  app.get('/demo/sample', (_req, res) => {
    const demo = require('./lib/demo-sample');
    const s = demo.sample();
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      topic: demo.TOPIC,
      example: s && {
        title: s.title,
        interpretation: s.interpretation,
        slo: s.slo,
        gate: s.gate,
        redrafts: s.redrafts,
        qaScore: s.qa && s.qa.combined_score,
        spendUsd: s.spendUsd,
        youtube: s.youtube,
        beats: s.beats,
        checkpoint: s.checkpoint,
      },
    });
  });

  /**
   * Every finished render sitting on this container.
   *
   * Behind a credential now. While this service made only its own content the
   * exposure was ours to weigh; the moment another organisation creates videos
   * here it becomes a cross-tenant listing, where one customer's unapproved
   * drafts are downloadable by anyone who finds the URL.
   */
  app.get('/demo/videos', owner.requireTenant(), (_req, res) => {
    const list = oneVideo.finished();
    res.json({
      count: list.length,
      videos: list,
      note: list.length
        ? 'These live on the container and do not survive a redeploy. A published '
          + 'YouTube link is the durable copy.'
        : 'Nothing made on this container yet.',
    });
  });

  app.get('/demo/videos/:slug/file', owner.requireTenant(), (req, res) => {
    const file = oneVideo.fileForSlug(req.params.slug);
    if (!file) return res.status(404).type('text').send('No finished video by that name.');
    return streamFile(req, res, file);
  });

  const MAKE_FILE = path.join(__dirname, '..', 'prototypes', 'make-a-video.html');
  app.get('/demo/make-a-video', (_req, res) => {
    if (!fs.existsSync(MAKE_FILE)) {
      return res.status(404).type('text').send('Not deployed.');
    }
    res.set('Cache-Control', 'public, max-age=300');
    res.type('html').send(fs.readFileSync(MAKE_FILE, 'utf8'));
  });

  /**
   * Render a real preview video for one planned lesson.
   *
   * The simplest thing that actually works end to end: the lesson's own words,
   * drawn by the real renderer, in under a minute, for nothing. No art, no
   * voiceover, no branding -- those are the parts that break, and none of them is
   * needed to show that a plan becomes a video.
   */
  app.post('/demo/course-builder/preview', async (req, res) => {
    const preview = require('./lib/lesson-preview');
    try {
      const r = await preview.render((req.body || {}).lesson);
      res.json({
        id: r.id,
        seconds: r.seconds,
        url: `${req.protocol}://${req.get('host')}/demo/preview/${r.id}.mp4`,
        note: 'Cards only -- no illustration, narration or branding. A preview of the '
          + 'content, not a sample of the finished lesson.',
      });
    } catch (e) {
      console.error('[preview]', e.message);
      res.status(e.status || 500).json({ error: 'preview_failed', message: e.message });
    }
  });

  /**
   * Start a build from the demo page, using the server's own credential.
   *
   * The page used to ask the operator to paste CONTENT_API_TOKEN. It is already
   * configured on this service, so asking for it again was friction with no
   * security value -- anyone holding the link can reach this route regardless.
   *
   * But building SPENDS REAL MONEY (~$1.50 a lesson), so removing the key removes
   * the only thing that made a stray click expensive. Two guards replace it:
   * the page still makes a human press Build twice with the cost on screen, and
   * this route allows one build an hour. The authenticated API at
   * /api/v1/courses/build stays unlimited for machine callers.
   */
  const demoBuilds = [];
  app.post('/demo/course-builder/build', (req, res) => {
    const hourAgo = Date.now() - 3600_000;
    while (demoBuilds.length && demoBuilds[0] < hourAgo) demoBuilds.shift();
    if (demoBuilds.length >= 1) {
      return res.status(429).json({
        error: 'rate_limited',
        message: 'The demo starts one build an hour, because each one spends real money. '
          + 'Use the API with a token to build without that limit.',
      });
    }

    // Reuse the authenticated route itself rather than a second copy of its
    // logic: supply the credential the service already holds, rewrite the path to
    // the one the API router expects, and hand the request straight to it.
    req.headers.authorization = `Bearer ${process.env.CONTENT_API_TOKEN || ''}`;
    req.url = '/courses/build';
    demoBuilds.push(Date.now());
    apiRouter(req, res, () => res.status(404).end());
  });

  /** Build progress for the demo page, again using the server's own credential. */
  app.get('/demo/course-builder/status/:courseId', (req, res) => {
    req.headers.authorization = `Bearer ${process.env.CONTENT_API_TOKEN || ''}`;
    req.url = '/courses/' + encodeURIComponent(req.params.courseId);
    apiRouter(req, res, () => res.status(404).end());
  });

  app.get('/demo/preview/:id.mp4', (req, res) => {
    const file = require('./lib/lesson-preview').fileFor(req.params.id);
    if (!file) return res.status(404).type('text').send('No such preview.');
    res.type('video/mp4');
    res.set('Cache-Control', 'public, max-age=3600');
    require('fs').createReadStream(file).pipe(res);
  });

  app.post('/demo/course-builder/plan', async (req, res) => {
    const ip = req.ip || 'unknown';
    const gate = demoRateCheck(ip);
    if (!gate.ok) return res.status(429).json({ error: 'rate_limited', message: gate.why });

    try {
      const plan = await require('./lib/course-planner')
        .plan(req.body || {}, { log: (m) => console.log('[demo-course]', m) });
      res.json(plan);
    } catch (e) {
      console.error('[demo-course]', e.message);
      res.status(e.status || 500).json({ error: 'plan_failed', message: e.message });
    }
  });

  /**
   * Run a tick by hand. Useful for testing without waiting for the timer, and for
   * driving the loop from an external scheduler instead of the in-process one.
   * Secret-gated: a tick starts real, paid work.
   */
  app.post('/tick', async (req, res) => {
    const supplied = req.query.token || req.get('x-tick-token') || '';
    if (!config.tick.secret || supplied !== config.tick.secret) {
      return res.status(401).json({ error: 'bad or missing token' });
    }
    // A tick can run for the length of a render, far longer than any sane HTTP
    // timeout, so acknowledge immediately and let it continue in the background.
    res.status(202).json({ started: true });
    tick.runTick({ trigger: 'manual' }).catch((e) => console.error('[tick]', e.message));
  });

  // ─── Slack ────────────────────────────────────────────────────────────────────

  // Slack resends an event if it does not get a 200 within three seconds, and a
  // slow render means that will happen. Without this, one mention starts the same
  // video three times and pays for the art three times.
  const seenEvents = new Set();
  function alreadyHandled(id) {
    if (!id) return false;
    if (seenEvents.has(id)) return true;
    seenEvents.add(id);
    // Bound the set so a long-lived container does not leak memory.
    if (seenEvents.size > 1000) seenEvents.delete(seenEvents.values().next().value);
    return false;
  }

  app.post('/slack/events', (req, res) => {
    const body = req.body || {};

    // Slack proves it owns the endpoint before it will send any events. This
    // handshake is unsigned, so it is answered before the signature check.
    if (body.type === 'url_verification') return res.type('text').send(body.challenge);

    const check = slack.verifySlackRequest(req);
    if (!check.ok) {
      console.warn('[slack] rejected request:', check.reason);
      return res.status(401).send('bad signature');
    }

    // Acknowledge now; everything below runs after the response is on the wire.
    res.status(200).send();

    const event = body.event;
    if (!event) return;
    if (alreadyHandled(body.event_id)) return;

    // Never react to our own messages — the bot posts progress into the same
    // thread, and replying to that would loop.
    if (event.bot_id || event.subtype === 'bot_message') return;

    const isRequest = event.type === 'app_mention'
      || (event.type === 'message' && event.channel_type === 'im');

    // A plain in-thread reply -- answering the bot's question, approving a budget,
    // approving a review -- is not a request and creates no ticket, so it falls
    // through the filter below. followUpThreads() reads those replies, but only
    // when a tick runs. At TICK_INTERVAL_MS=120000 that lag was invisible; at 30
    // minutes it is not, so nudge the loop instead of waiting for the timer.
    // runTick's own `ticking` guard collapses a burst of replies into one tick.
    if (!isRequest && event.type === 'message' && event.thread_ts) {
      tick.runTick({ trigger: 'slack-reply' }).catch(() => {});
      return;
    }

    if (!isRequest) return;

    handleSlack(event).catch((e) => console.error('[slack] handler:', e));
  });

  async function handleSlack(event) {
    const origin = {
      type: 'slack',
      channel: event.channel,
      // Reply in-thread so a busy channel stays readable.
      threadTs: event.thread_ts || event.ts,
    };

    const parsed = parseRequest(event.text);

    if (!parsed.ok) {
      if (parsed.reason === 'not_a_request' || parsed.reason === 'empty') {
        await slack.postMessage({
          ...origin,
          text:
            'Ask me for a video and I\'ll make one — e.g. ' +
            '`make a video about what a rubric actually does, series: evals`.',
        });
        return;
      }
      await slack.postMessage({ ...origin, text: parsed.question });
      return;
    }

    // The webhook path does not dispatch directly. It creates the ticket the tick
    // would have created, then lets the tick pick it up — so a video started by a
    // push and one started by polling follow the identical path, and there is only
    // one place where work can begin.
    const notion = require('./lib/notion');
    try {
      const ticket = await notion.createTicket({
        title: parsed.topic,
        series: parsed.series,
        source: 'slack',
        dedupeKey: `slack-${event.channel}-${event.ts}`,
        notes: `[slack:${event.channel}/${origin.threadTs}]`,
      });
      if (!ticket.alreadyExisted) {
        await slack.postMessage({ ...origin, text: `Queued *${parsed.topic}*.\n${ticket.url}` });
        tick.runTick({ trigger: 'slack-event' }).catch(() => {});
      }
    } catch (e) {
      await slack.postMessage({ ...origin, text: `Couldn't queue that: ${e.message}` });
    }
  }

  return app;
}

module.exports = { createApp };
