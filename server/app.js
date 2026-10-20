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
  // Contract 1.4: POST /demo/make-video carries the instructor's documents as text
  // -- up to 120k characters (orchestrator/lib/context.js), which in UTF-8 Urdu
  // and JSON escaping is several hundred kilobytes. That one route, and only that
  // one, takes a megabyte; everything else keeps the small limit.
  const makeVideoJson = express.json({ limit: '1mb' });
  app.use((req, res, next) => {
    if (req.path === '/slack/events') return slackJson(req, res, next);
    if (req.path === '/demo/make-video' && req.method === 'POST') return makeVideoJson(req, res, next);
    return express.json({ limit: '32kb' })(req, res, next);
  });

  app.get('/health', (_req, res) => {
    const health = require('./lib/health');
    const v = health.verdict({ store: jobStore, readiness });
    res.status(v.status).json({
      // Computed, not asserted. `true` was hardcoded here until 2026-09-25, so
      // the deploy probe could not fail and a memory-backed store looked fine.
      ok: v.ok,
      ...(v.reasons.length ? { notOkBecause: v.reasons } : {}),
      contractVersion: require('./lib/api').CONTRACT_VERSION,
      // Contract 1.4: what the single-video flow can do on this deployment.
      makeVideo: require('./lib/capabilities').capabilities(),
      // Stamped by scripts/deploy.sh into the uploaded tree. "Triggered a deploy"
      // is not proof of a deploy; this commit hash answering here is.
      build: health.build(),
      // One-video jobs a restart would interrupt. predeploy-check.js reads this
      // alongside courses.worker -- it used to read only the latter, which is
      // how two redeploys landed on a job being written through /demo/make-video.
      jobs: { inFlight: health.inFlight(jobStore) },
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
      // WHAT IS ACTUALLY USING SPACE AND MEMORY.
      //
      // Added because the two were being confused. Railway's dashboard graphs RAM
      // and does not graph volume usage at all, so "the service is using too much
      // memory" was reached from the only number on screen -- while the unbounded,
      // service-restarting problem was the 50GB volume, which nothing displayed.
      //
      // Both are reported here so the next person can tell them apart in one GET:
      // `rss` is the container's memory, `deliverables.videoBytes` is the half of
      // the disk that grows per lesson and that offloading reclaims.
      //
      // Counts and bytes only, no ids -- this route has no credential.
      storage: (() => {
        try {
          const listed = require('../orchestrator/lib/deliverables').list();
          const mem = process.memoryUsage();
          return {
            deliverables: {
              durable: listed.durable,
              lessons: listed.items.length,
              bytes: listed.bytes,
              // The number to watch. Metadata is KB per lesson; a video is tens of MB.
              videoBytes: listed.videoBytes || 0,
              videosHeldLocally: listed.items.filter((i) => i.videoLocal).length,
              offloadedToDrive: listed.offloadedCount || 0,
            },
            driveOffload: (() => {
              const gd = require('../orchestrator/lib/gdrive');
              // Never the token, the key or the folder id -- only whether they are
              // present.
              //
              // `authKind` says WHICH credential answered -- 'service-account', 'oauth-user'
              // or 'none' -- never the key or the account. Wrapped: this whole storage
              // block shares one try/catch, and a throw here once cost /health its volume
              // numbers while it still answered 200 ok:true.
              let authKind = 'unknown';
              try { authKind = gd.identity().kind; } catch { /* reported as unknown */ }
              return {
                configured: gd.isConfigured(),
                authorised: gd.isAuthorised(),
                folderSet: Boolean(gd.folderId()),
                authKind,
              };
            })(),
            memory: { rssBytes: mem.rss, heapUsedBytes: mem.heapUsed, externalBytes: mem.external },
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
  const apiRouter = require('./lib/api').build({ store: jobStore });
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

    // The video style (GET /api/v1/styles). Refused here when unknown, before a job exists.
    const styleChoice = require('../orchestrator/lib/styles').parseStyle(req.body && req.body.style);
    if (!styleChoice.ok) {
      return res.status(400).json({ error: 'invalid_style', message: styleChoice.message });
    }

    // Contract 1.4: the instructor's choices (style, length, voiceover, purpose)
    // and documents. Each refused before a job exists; each absent = today's video.
    const parsedOptions = require('../orchestrator/lib/options').parseOptions(req.body || {});
    if (!parsedOptions.ok) {
      return res.status(400).json({ error: 'bad_options', code: 'bad_options', field: parsedOptions.field, message: parsedOptions.message });
    }
    let context = null;
    if (req.body && req.body.context !== undefined && req.body.context !== null) {
      if (!config.makeVideo.contextEnabled) {
        return res.status(400).json({
          error: 'capability_disabled', code: 'capability_disabled', capability: 'context',
          message: 'Context documents are not switched on here (MAKE_VIDEO_CONTEXT). Nothing was created -- '
            + 'a job made now would not use them, so this is refused rather than quietly ignored.',
        });
      }
      const parsed = require('../orchestrator/lib/context').parseContext(req.body.context);
      if (!parsed.ok) {
        const { ok, status, ...body } = parsed;
        return res.status(status).json({ error: body.code, ...body });
      }
      context = parsed.context;
    }

    // `options.style` and the top-level `style` are the same choice; parseOptions
    // read both, so the job carries what was actually asked for.
    const job = startWrite({
      topic, notes: req.body && req.body.notes, style: parsedOptions.options.style,
      options: parsedOptions.options, context,
    }, req.owner, callbackUrl);
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
    const job = jobsLib.create({ topic: body.topic, notes: body.notes, style: body.style,
      options: body.options || null, context: body.context || null,
      owner: jobOwner, callbackUrl }, jobOpts);
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
            // The checked bytes, and what the free checks could not settle.
            scriptSha: r.scriptSha || null,
            unresolvedChecks: r.unresolvedChecks || [],
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
            // The COMPLETE beats, so the script can be rebuilt when the container
            // that wrote it is gone. The projection above keeps an info card's
            // template name and drops its data; a file rebuilt from it renders
            // blank cards, which is why job 43a782dd45dd could not be recovered
            // after the 2026-09-25 redeploys. This is a copy, not a second
            // truth: beats.js on disk (and its volume copy below) stay
            // authoritative, and jobs.materializeScript prefers them.
            beatsFull: r.beats || [],
            // The question the LMS will pop. Never drawn, never spoken.
            checkpoint: checkpoint ? checkpoint.quiz : null,
            checkpointAfterBeat: checkpoint
              ? ((r.beats.slice(0, r.beats.indexOf(checkpoint)).filter((b) => b.mode !== 'checkpoint').pop() || {}).id)
              : null,
          },
        },
      }, jobOpts);
      console.log(`[make-video ${id}] READY: ${r.title} (${r.beats.length} beats, `
        + `${r.redrafts} redraft(s), sha ${r.scriptSha || '?'}`
        + `${(r.unresolvedChecks || []).length ? `, ${r.unresolvedChecks.length} unresolved check(s)` : ''})`);
      // Onto the volume the moment it is written. The render directory is
      // container-local and .dockerignore'd; a redeploy between `written` and
      // "Make the video" used to take the only copy with it. Never fatal.
      try {
        require('../orchestrator/lib/deliverables').persist({
          series: r.series, slug: r.slug, videoDir: r.dir,
          log: (m) => console.log(`[make-video ${id}]`, m),
        });
      } catch (e) {
        console.warn(`[make-video ${id}] script NOT persisted to the volume: ${e.message}`);
      }
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
  /** The run budget for one produce: see the call site. A number, or `{ refused }`. */
  function monthlyCap({ tenant, ceilingUsd, job }) {
    const monthlyUsd = Number.isFinite(tenant.monthlyUsd) ? tenant.monthlyUsd : null;
    if (monthlyUsd === null) return ceilingUsd;
    let needUsd = 0;
    try {
      const { _internals } = require('../orchestrator/lib/stages/produce');
      const { videoDir } = require('../orchestrator/lib/paths');
      const silent = Boolean(job.options && job.options.voiceover === false);
      needUsd = _internals.estimateSpend(job.script.beats, videoDir(job.script.series, job.script.slug), { silent }).totalUsd;
    } catch { /* no estimate: the ceiling cut to the month still bounds the run */ }
    // A stubbed ledger (tests) may not keep balances; the real reserve() still guards the month.
    if (typeof ledger.spentUsd !== 'function') return ceilingUsd;
    const r = require('./lib/ledger').capToMonth({
      monthlyUsd, spentUsd: ledger.spentUsd(jobStore, tenant.id).total, ceilingUsd, needUsd, tenantId: tenant.id,
    });
    return r.refused ? r : r.usd;
  }

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

  /** The on-disk script for a written job, or null with the route already answered. */
  function scriptOnDisk(job, res) {
    const restored = jobsLib.materializeScript(job, { log: (m) => console.log(`[script ${job.id}]`, m) });
    if (!restored.ok) {
      res.status(409).json({ error: 'script_lost', code: 'script_lost', message: restored.why });
      return null;
    }
    const deliverables = require('../orchestrator/lib/deliverables');
    const sha = deliverables.fingerprint(restored.file);
    let beats = null;
    try {
      delete require.cache[require.resolve(restored.file)];
      beats = require(restored.file);
    } catch (e) {
      res.status(409).json({ error: 'script_lost', code: 'script_lost', message: `the script on disk cannot be read: ${e.message}` });
      return null;
    }
    return { file: restored.file, sha, beats };
  }

  /** 409 sha_mismatch when the caller's sha is not the script on disk. Returns true when refused. */
  function shaMismatch(req, res, currentSha, { required = true } = {}) {
    const sent = req.body && req.body.sha !== undefined ? req.body.sha : (req.body && req.body.scriptSha);
    if (sent === undefined || sent === null || sent === '') {
      if (!required) return false;
      res.status(400).json({ error: 'bad_request', code: 'sha_required', message: 'Send the `sha` of the script you are editing (scriptSha on the job).', currentSha });
      return true;
    }
    if (String(sent) !== String(currentSha)) {
      res.status(409).json({
        error: 'sha_mismatch', code: 'sha_mismatch', currentSha,
        message: `The script has changed since you read it (you sent ${sent}; it is ${currentSha}). Read it again and resend.`,
      });
      return true;
    }
    return false;
  }

  /** The projection the job record carries beside the complete beats. */
  function beatsProjection(beats) {
    return (beats || []).map((b) => ({
      id: b.id, mode: b.mode, vo: b.vo || null, cap: b.cap || null, art: b.art || null,
      overlay: b.overlay ? { tpl: b.overlay.tpl || null } : null,
      info: b.info ? { tpl: b.info.tpl || null } : null,
    }));
  }

  /** The script patch written after an edit or a revise changed beats.js. */
  function scriptPatch(job, beats, sha) {
    const checkpoint = (beats || []).find((b) => b.mode === 'checkpoint');
    return {
      ...job.script,
      scriptSha: sha,
      beats: beatsProjection(beats),
      beatsFull: beats,
      checkpoint: checkpoint ? checkpoint.quiz : null,
      checkpointAfterBeat: checkpoint
        ? ((beats.slice(0, beats.indexOf(checkpoint)).filter((b) => b.mode !== 'checkpoint').pop() || {}).id)
        : null,
    };
  }

  /** The fields of the job the stages read a purpose, length and voice from. */
  function itemFields(job) {
    const o = job.options || {};
    return { style: job.style, purpose: o.purpose || null, lengthMinutes: o.lengthMinutes || null, voiceover: o.voiceover !== false };
  }

  const EDITABLE = ['vo', 'cap', 'overlay', 'info', 'quiz', 'holdAfter'];

  /**
   * Direct frame edits at $0 (contract 1.4).
   *
   * The instructor read the script and changed a line. Applied in code with the
   * writer's own applyEdits, checked with every rule that needs no model, written
   * as beats.js, fingerprinted, and answered in the same request. Nothing here
   * reaches a model or spends a cent. Synchronous between the sha check and the
   * write, so two edits cannot interleave.
   */
  app.post('/demo/make-video/:jobId/script/edit', (req, res) => {
    const job = ownedJob(req, res);
    if (!job) return undefined;
    if (!config.makeVideo.scriptEditEnabled) {
      return res.status(400).json({
        error: 'capability_disabled', code: 'capability_disabled', capability: 'scriptEdit',
        message: 'Script edits are not switched on here (MAKE_VIDEO_SCRIPT_EDIT).',
      });
    }
    if (!job.script || job.status !== 'written') {
      return res.status(409).json({
        error: 'not_editable', code: 'not_editable',
        message: job.script ? `This job is ${job.status}; only a written script waiting for produce can be edited.` : 'This job has no script yet.',
      });
    }
    const edits = req.body && req.body.edits;
    if (!Array.isArray(edits) || !edits.length) {
      return res.status(400).json({ error: 'bad_request', code: 'no_edits', message: 'Send `edits`: [{ id, vo?, cap?, overlay?, info?, quiz?, holdAfter? }].' });
    }
    const disk = scriptOnDisk(job, res);
    if (!disk) return undefined;
    if (shaMismatch(req, res, disk.sha)) return undefined;

    // Only the fields an instructor edits by hand. Mode, art and ids are the
    // writer's; a mode change is a different beat, which is what revise is for.
    const patch = { edits: [] };
    for (const e of edits) {
      const id = e && String(e.id || '');
      const beat = disk.beats.find((b) => String(b.id) === id);
      if (!beat) return res.status(422).json({ error: 'bad_edit', code: 'unknown_beat', beatId: id, message: `No beat ${id || '(no id)'} in this script.` });
      const bad = Object.keys(e).filter((k) => k !== 'id' && !EDITABLE.includes(k));
      if (bad.length) return res.status(422).json({ error: 'bad_edit', code: 'bad_edit', beatId: id, message: `Beat ${id}: ${bad.join(', ')} cannot be edited here (editable: ${EDITABLE.join(', ')}).` });
      if (beat.mode === 'checkpoint' && e.vo) return res.status(422).json({ error: 'bad_edit', code: 'bad_edit', beatId: id, message: `Beat ${id} is the checkpoint; it is never spoken, so it has no vo.` });
      if (beat.mode !== 'checkpoint' && e.quiz) return res.status(422).json({ error: 'bad_edit', code: 'bad_edit', beatId: id, message: `Beat ${id} is not the checkpoint; only the checkpoint beat carries a quiz.` });
      const entry = { id };
      for (const k of EDITABLE) {
        if (e[k] === undefined) continue;
        if (k === 'info') {
          // `info.data` is merged into the card; its template is the writer's.
          if (!beat.info) return res.status(422).json({ error: 'bad_edit', code: 'bad_edit', beatId: id, message: `Beat ${id} is not an info card.` });
          entry.info = { tpl: beat.info.tpl, data: { ...(beat.info.data || {}), ...((e.info && e.info.data) || {}) } };
        } else if (k === 'quiz') {
          entry.quiz = { ...(beat.quiz || {}), ...(e.quiz || {}) };
        } else entry[k] = e[k];
      }
      patch.edits.push(entry);
    }

    const { _internals } = require('../orchestrator/lib/stages/script');
    const checks = require('../orchestrator/lib/script-checks');
    const { videoDir } = require('../orchestrator/lib/paths');
    const item = itemFields(job);
    const dir = videoDir(job.script.series, job.script.slug);
    let next;
    try { next = _internals.applyEdits(disk.beats, patch).beats; } catch (e) {
      return res.status(422).json({ error: 'bad_edit', code: 'bad_edit', message: e.message });
    }
    // Judged on what the edit CHANGED. A finding that was already there is not
    // the instructor's, and must not make an accepted script uneditable.
    const before = checks.deterministicChecks(disk.beats, { item, videoDir: dir }).errors;
    const after = checks.deterministicChecks(next, { item, videoDir: dir }).errors;
    const fresh = checks.newFindings(before, after);
    if (fresh.length) {
      return res.status(422).json({
        error: 'check_failed', code: 'check_failed',
        check: fresh[0].check, beatId: fresh[0].beatId, message: fresh[0].message,
        findings: fresh,
      });
    }

    const { renderBeatsFile } = require('../orchestrator/lib/beats-file');
    fs.writeFileSync(disk.file, renderBeatsFile({ title: job.script.title || job.topic, beats: next }), 'utf8');
    const sha = require('../orchestrator/lib/deliverables').fingerprint(disk.file);
    const by = approverOf(req);
    const updated = jobsLib.transition(job.id, {
      patch: {
        script: {
          ...scriptPatch(job, next, sha),
          edits: [...((job.script && job.script.edits) || []), {
            at: new Date().toISOString(), by, ids: patch.edits.map((e) => e.id), fromSha: disk.sha, toSha: sha,
          }],
        },
        lastError: null,
      },
    }, jobOpts);
    try {
      require('../orchestrator/lib/deliverables').persist({
        series: job.script.series, slug: job.script.slug, videoDir: dir, log: (m) => console.log(`[script ${job.id}]`, m),
      });
    } catch (e) { console.warn(`[script ${job.id}] edited script NOT persisted to the volume: ${e.message}`); }
    console.log(`[script ${job.id}] edited beat(s) ${patch.edits.map((e) => e.id).join(', ')} by ${by}: ${disk.sha} -> ${sha}`);
    return res.json({ jobId: job.id, status: updated.status, scriptSha: sha, script: jobsLib.toPublic(updated).script });
  });

  /**
   * Instruction-based redo (contract 1.4): the whole script, or named beats only.
   *
   * One or two model calls, no media. The job goes written -> revising -> written
   * with a new scriptSha; the cap is five human revisions, as for courses.
   */
  app.post('/demo/make-video/:jobId/script/revise', (req, res) => {
    const job = ownedJob(req, res);
    if (!job) return undefined;
    if (!config.makeVideo.scriptReviseEnabled) {
      return res.status(400).json({
        error: 'capability_disabled', code: 'capability_disabled', capability: 'scriptRevise',
        message: 'Script revisions are not switched on here (MAKE_VIDEO_SCRIPT_REVISE).',
      });
    }
    if (!job.script || job.status !== 'written') {
      return res.status(409).json({
        error: 'not_ready', code: 'not_ready',
        message: job.script ? `This job is ${job.status}; only a written script waiting for produce can be revised.` : 'This job has no script yet.',
      });
    }
    const body = req.body || {};
    const beats = Array.isArray(body.beats) ? body.beats : [];
    const why = String(body.why || '').trim();
    if (!why && !beats.some((b) => b && b.id && String(b.why || '').trim())) {
      return res.status(400).json({
        error: 'bad_request', code: 'no_notes',
        message: 'A revision needs notes: `why` for the whole script, or `beats: [{ id, why }]` for particular beats.',
      });
    }
    const { MAX_REVISIONS } = require('./lib/capabilities');
    const round = (Number(job.script.humanRevisions) || 0) + 1;
    if (round > MAX_REVISIONS) {
      return res.status(409).json({
        error: 'revision_cap', code: 'revision_cap', maxRevisions: MAX_REVISIONS,
        message: `This script has already been revised ${MAX_REVISIONS} times. Edit it directly, produce it, or create the video again.`,
      });
    }
    const limit = throttle.consume({ bucket: `revise:${req.owner.id}:h`, limit: MAKE_LIMIT.perOwnerPerHour, windowMs: throttle.HOUR });
    throttle.setHeaders(res, limit);
    if (!limit.ok) {
      return res.status(429).json({ error: 'rate_limited', code: 'rate_limited', message: `This allows ${MAKE_LIMIT.perOwnerPerHour} revisions an hour per caller.`, retryAfterSeconds: limit.retryAfterSec });
    }
    const disk = scriptOnDisk(job, res);
    if (!disk) return undefined;
    if (shaMismatch(req, res, disk.sha)) return undefined;
    for (const b of beats) {
      if (!b || !disk.beats.some((x) => String(x.id) === String(b.id))) {
        return res.status(422).json({ error: 'unknown_beat', code: 'unknown_beat', beatId: b && b.id, message: `No beat ${b && b.id} in this script.` });
      }
    }

    const by = approverOf(req);
    const ids = beats.map((b) => String(b.id));
    const history = (job.script.revisions || []).map((r) => ({ round: r.round, critique: r.critique }));
    const critique = [...(why ? [why] : []), ...beats.map((b) => `Beat ${b.id}: ${String(b.why || '').trim()}`)];
    jobsLib.transition(job.id, {
      status: 'revising', stage: 'script',
      patch: { lastError: null, script: { ...job.script, humanRevisions: round, lastRevise: { at: new Date().toISOString(), by, round, ids, status: 'running' } } },
    }, jobOpts);
    console.log(`[revise ${job.id}] round ${round} by ${by}${ids.length ? ` on beat(s) ${ids.join(', ')}` : ' (whole script)'}`);

    oneVideo.revise(
      { itemId: job.script.itemId, why, beats, by, round, history },
      {
        log: (m) => console.log(`[revise ${job.id}]`, m),
        onStage: (st) => { jobsLib.transition(job.id, { stage: st }, jobOpts); },
      }
    ).then((r) => {
      const cur = jobsLib.get(job.id, jobOpts) || job;
      const record = { at: new Date().toISOString(), by, round, ids, critique, fromSha: disk.sha, toSha: r.scriptSha, spentUsd: r.spentUsd, runId: r.runId };
      jobsLib.transition(job.id, {
        status: 'written', stage: 'gate',
        patch: {
          script: {
            ...scriptPatch(cur, r.beats || [], r.scriptSha),
            title: r.title || cur.script.title,
            unresolvedChecks: r.unresolvedChecks || [],
            redrafts: (Number(cur.script.redrafts) || 0) + (Number(r.redrafts) || 0),
            revisions: [...(cur.script.revisions || []), record],
            lastRevise: { ...record, status: 'done' },
          },
        },
      }, jobOpts);
      console.log(`[revise ${job.id}] done: ${disk.sha} -> ${r.scriptSha} ($${(r.spentUsd || 0).toFixed(2)} in model calls)`);
      try {
        require('../orchestrator/lib/deliverables').persist({ series: job.script.series, slug: job.script.slug, videoDir: r.dir, log: (m) => console.log(`[revise ${job.id}]`, m) });
      } catch (e) { console.warn(`[revise ${job.id}] revised script NOT persisted to the volume: ${e.message}`); }
    }).catch((e) => {
      const cur = jobsLib.get(job.id, jobOpts) || job;
      const spentUsd = Number(e.spentUsd) || 0;
      const lastError = { at: new Date().toISOString(), stage: 'revise', code: e.code || null, message: e.message, runId: e.runId || null, spentUsd, round };
      // The script on disk may be the previous one or a half-written draft; what
      // the job reports stays the sha the instructor last read, and the next edit
      // or revise reads the disk again.
      jobsLib.transition(job.id, {
        status: 'written', stage: 'gate',
        patch: { lastError, script: { ...cur.script, lastRevise: { at: lastError.at, by, round, ids, status: 'failed', spentUsd, error: e.message } } },
      }, jobOpts);
      console.error(`[revise ${job.id}] failed: ${e.message}`);
      if (e.stack) console.error(e.stack.split('\n').slice(0, 8).join('\n'));
    });

    return res.status(202).json({ jobId: job.id, status: 'revising', round, revisionsLeft: MAX_REVISIONS - round, scope: ids.length ? ids : 'whole' });
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

    // Put the script where produce will look for it, from whichever copy
    // survived the last redeploy. Before any rate-limit slot or reservation is
    // taken: a script that is genuinely gone must not cost the caller either.
    const restored = jobsLib.materializeScript(job, { log: (m) => console.log(`[produce ${job.id}]`, m) });
    if (!restored.ok) {
      unclaim();
      // `failed`, not `written`: the LMS draws `written` as "ready, press the
      // button", which is the loop this route was stuck in. A lost script is
      // terminal for this job; the person creates the video again.
      jobsLib.transition(job.id, {
        status: 'failed',
        patch: {
          error: restored.why,
          lastError: { at: new Date().toISOString(), stage: 'produce', message: restored.why },
        },
      }, jobOpts);
      console.error(`[produce ${job.id}] refused for ${tenant.id}: ${restored.why}`);
      return res.status(409).json({ error: 'script_lost', message: restored.why });
    }
    console.log(`[produce ${job.id}] beats.js from ${restored.source}`);

    // Contract 1.4: the approval travels with the request. If the caller names
    // the script it approved and that is not the script on disk, refuse -- the
    // one failure that would make the script gate theatre. Without the field,
    // behaviour is unchanged.
    if (req.body && req.body.scriptSha !== undefined && req.body.scriptSha !== null && req.body.scriptSha !== '') {
      const onDisk = require('../orchestrator/lib/deliverables').fingerprint(restored.file);
      if (String(req.body.scriptSha) !== String(onDisk)) {
        unclaim();
        return res.status(409).json({
          error: 'sha_mismatch', code: 'sha_mismatch', currentSha: onDisk,
          message: `You approved script ${req.body.scriptSha}; the script here is ${onDisk}. Nothing was bought. Read the current script and approve it again.`,
        });
      }
    }

    const ceilingUsd = Math.min(
      config.pipeline.maxApprovableUsd,
      Number.isFinite(tenant.maxRunUsd) && tenant.maxRunUsd !== null ? tenant.maxRunUsd : Infinity
    );
    // Never reserve more than the month has left. A tenant with no per-run wall
    // reserved the whole service ceiling ($50) against its monthly budget, so the
    // first dollar spent in a month made every later video a 402 -- production,
    // 2026-09-28: $42 left, a $1.52 video, refused. Cap the reservation (and so the
    // run's budget) at what remains, and refuse only when this video's own
    // estimate does not fit.
    const budgetUsd = monthlyCap({ tenant, ceilingUsd, job });
    if (budgetUsd && budgetUsd.refused) {
      unclaim();
      return res.status(402).json(budgetUsd.refused);
    }
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
        itemId: job.script.itemId, budgetUsd, brief: job.script.brief, scriptSha: job.script.scriptSha,
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
            produce: {
              status: 'awaiting_review', stage: 'review', spendUsd: r.spendUsd, qa: r.qa, elapsedSeconds: elapsed,
              // Findings a gate accepted rather than acted on, so the reviewer
              // sees what the run saw. Empty when every gate was satisfied.
              warnings: r.warnings || [],
              ...(r.blocked ? { blocked: r.blocked } : {}),
            },
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
      const spentUsd = Number(e.spendUsd) || 0;
      const kind = e.kind === 'blocked' ? 'blocked' : 'failed';
      // Does a finished video exist, whatever the run said about itself? The
      // wrapper reports what it found; the job record is the fallback for a
      // run that died before it could say.
      const cur = jobsLib.get(job.id, jobOpts) || job;
      const had = Boolean(e.deliverable
        || jobsLib.resolveFinalPath(cur, { oneVideo })
        || jobsLib.resolveDriveCopy(cur));

      // Three honest outcomes, where there used to be one:
      //   - a video exists and a gate wants a person to look  -> awaiting_review
      //   - a video exists but the run died after making it    -> interrupted (resumable, $0 re-run)
      //   - nothing was made                                   -> written (the script is still good)
      // The old code put every case back to `written` and the LMS read that as
      // "nothing happened, press again" -- about a paid, finished video.
      const status = had ? (kind === 'blocked' ? 'awaiting_review' : 'interrupted') : 'written';

      // A run that failed after buying art HAS spent money. Settling at whatever
      // the spine recorded -- rather than releasing the reservation -- is what
      // stops a tenant burning budget for free by failing runs deliberately.
      ledger.settle(jobStore, {
        tenantId: tenant.id, ref: reservation.ref, jobId: job.id,
        runId: e.runId, usd: spentUsd, outcome: status === 'written' ? 'failed' : status,
      });

      const lastError = {
        at: new Date().toISOString(), stage: 'produce', kind, code: e.code || null,
        message: e.message, runId: e.runId || null, spentUsd, deliverableAvailable: had,
      };
      const patch = { spendRef: null, lastError };
      if (status === 'awaiting_review') {
        patch.review = { itemId: cur.script.itemId, series: cur.script.series || 'made', slug: cur.script.slug, artifacts: null, qa: null };
        patch.produce = {
          status: 'awaiting_review', stage: 'review', spendUsd: spentUsd, qa: null,
          warnings: [{ sensor: (e.details && e.details.sensor) || null, what: (e.details && e.details.what) || null, findings: (e.details && e.details.findings) || e.message }],
          blocked: { stage: e.stage || 'produce', code: e.code || null, message: e.message },
        };
      } else if (status === 'interrupted') {
        patch.resumable = true;
        patch.produce = { status: 'failed', error: e.message, spendUsd: spentUsd };
      } else {
        patch.produce = { status: 'failed', error: e.message, spendUsd: spentUsd };
      }
      // A produce-time redraft changed the script after it was approved by sha.
      // Nothing was bought; the person approves the new text by pressing again.
      if (e.code === 'script-approval' && e.details && e.details.sha && cur.script) {
        patch.script = { ...cur.script, scriptSha: e.details.sha };
      }
      // Top-level and non-terminal, so the LMS can show it under `written`.
      // `produce.error` alone was invisible: the page read `error`, which
      // stayed null, and drew the button as if nothing had happened.
      jobsLib.transition(job.id, { status, patch }, jobOpts);
      console.error(`[produce ${job.id}] ${kind} for ${tenant.id} (spent $${spentUsd.toFixed(2)}, video ${had ? 'exists' : 'absent'} -> ${status}): ${e.message}`);
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

    // Rendered by lib/script-md.js, which the course script gate serves too: an
    // instructor deciding whether to spend on a lesson must read exactly what the
    // demo reader reads, and two copies of this would drift apart unnoticed.
    const scriptMd = require('./lib/script-md');
    const body = scriptMd.render(job.script, { topic: job.topic });
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${scriptMd.filename(job.script.slug)}"`);
    return res.send(body);
  });

  /**
   * Stream the finished video so it can be watched before it is published.
   *
   * The path is resolved now rather than remembered: a stored absolute path is
   * still a valid-looking string after a redeploy and points at nothing, so this
   * would serve a confident 500 where an honest 404 is the truth.
   */
  app.get('/demo/make-video/:jobId/video', async (req, res) => {
    const job = ownedJob(req, res);
    if (!job) return undefined;
    const file = jobsLib.resolveFinalPath(job, { oneVideo });
    if (!file || !fs.existsSync(file)) {
      // Offloaded: the video is on Drive and nowhere here. Stream it back through
      // us like the course /file route does -- the bytes, with Range -- or the
      // record for a caller that asks for JSON. Never a 404 for a video that exists.
      const copy = jobsLib.resolveDriveCopy ? jobsLib.resolveDriveCopy(job) : null;
      if (copy) {
        try {
          return await require('./lib/drive-stream').serveDriveCopy(req, res, {
            copy, extra: { status: job.status },
            filename: `${(job.script && job.script.slug) || job.id}_final.mp4`,
            log: (m) => console.log(`[video ${job.id}] ${m}`),
          });
        } catch (e) {
          console.error(`[video ${job.id}] ${e.message}`);
          if (!res.headersSent) res.status(500).json({ error: 'internal', message: e.message });
          return undefined;
        }
      }
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
    res.set('X-Served-From', 'volume');
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

  app.get('/demo/videos/:slug/file', owner.requireTenant(), async (req, res) => {
    const file = oneVideo.fileForSlug(req.params.slug);
    if (!file) {
      const copy = oneVideo.driveCopyForSlug ? oneVideo.driveCopyForSlug(req.params.slug) : null;
      if (copy) {
        try {
          return await require('./lib/drive-stream').serveDriveCopy(req, res, {
            copy, filename: `${req.params.slug}_final.mp4`,
            log: (m) => console.log(`[videos/${req.params.slug}] ${m}`),
          });
        } catch (e) {
          console.error(`[videos/${req.params.slug}] ${e.message}`);
          if (!res.headersSent) res.status(500).json({ error: 'internal', message: e.message });
          return undefined;
        }
      }
      return res.status(404).type('text').send('No finished video by that name.');
    }
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
  // A tenant credential is required since 2026-09-25. This route used to inject the
  // service's own CONTENT_API_TOKEN for anyone holding the link -- the `default`
  // tenant, which is unmetered unless DEFAULT_TENANT_MONTHLY_USD is set -- guarded
  // only by an in-process one-build-an-hour counter that every redeploy reset.
  // A build is N x $2.50 of real money. The demo page now needs a token to build.
  app.post('/demo/course-builder/build', owner.requireTenant('produce'), (req, res) => {
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
    // The caller's own credential rides through; nothing is injected any more.
    req.url = '/courses/build';
    demoBuilds.push(Date.now());
    // A BODY on the 404, because this one is not the browser's fault. It fires
    // only when the rewritten path misses the API router, i.e. this proxy and
    // that router have drifted apart. Answering with an empty body made the
    // page's `res.json()` throw a parse error, so a person saw a SyntaxError
    // where the server had actually said "no such route".
    apiRouter(req, res, () => res.status(404).json({
      error: 'route_missing',
      message: 'The demo build proxy could not reach POST /api/v1/courses/build. '
        + 'That is a server-side mismatch, not a problem with your request. Nothing was bought.',
    }));
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

  // Express's own 413 is an HTML page. The LMS asked for a JSON body with a code
  // it can match on, and the same for a body that is not JSON at all.
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') {
      return res.status(413).json({
        error: 'payload_too_large', code: 'payload_too_large', limit: err.limit, length: err.length,
        message: `The request body is ${err.length} bytes; this route accepts ${err.limit}. Nothing was created.`,
      });
    }
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'bad_json', code: 'bad_json', message: 'The request body is not valid JSON.' });
    }
    console.error(`[app] ${req.method} ${req.path}: ${err && err.stack ? err.stack.split('\n').slice(0, 4).join('\n') : err}`);
    return res.status(err && err.status ? err.status : 500).json({ error: 'internal', message: err && err.message ? err.message : 'internal error' });
  });

  return app;
}

module.exports = { createApp };
