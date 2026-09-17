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

  const app = express();

  // Railway terminates TLS at its edge and forwards over http, so without this
  // req.protocol reads "http" and the self-describing API index hands the LMS
  // developer http:// example URLs for an https-only service.
  app.set('trust proxy', true);

  // Keep the raw body: Slack's signature is computed over the exact bytes sent, so
  // verifying against a re-serialised object never matches.
  app.use(express.json({
    limit: '2mb',
    verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
  }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, surfaces: readiness(), tick: tick.status() });
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
  const MAKE_LIMIT = { perIpPerHour: 6, globalPerHour: 40 };
  const makeHits = [];
  const makeByIp = new Map();

  app.post('/demo/make-video', async (req, res) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const hourAgo = now - 3600_000;
    while (makeHits.length && makeHits[0] < hourAgo) makeHits.shift();
    const mine = (makeByIp.get(ip) || []).filter((t) => t >= hourAgo);

    if (makeHits.length >= MAKE_LIMIT.globalPerHour || mine.length >= MAKE_LIMIT.perIpPerHour) {
      return res.status(429).json({
        error: 'rate_limited',
        message: `This demo makes ${MAKE_LIMIT.perIpPerHour} videos an hour. Try again shortly.`,
      });
    }
    mine.push(now);
    makeByIp.set(ip, mine);
    makeHits.push(now);
    if (makeByIp.size > 500) {
      for (const [k, v] of makeByIp) if (!v.some((t) => t >= hourAgo)) makeByIp.delete(k);
    }

    // Writing a house-standard script is research + a draft + a gate, and a gate
    // that says NEEDS WORK sends it back to be redrafted. That is minutes, not
    // seconds, so it runs as a job the page polls rather than a held-open request
    // that an edge proxy would cut before the script was finished.
    const job = startWrite(req.body || {});
    res.status(202).json({ jobId: job.id, status: job.status });
  });

  /**
   * Jobs for the Make a Video page.
   *
   * In memory, and that is deliberate rather than a shortcut: the container has no
   * volume, so a job record written to disk would not outlive a redeploy either.
   * What DOES survive is the script itself, in explainer-videos/<series>/<slug>/,
   * and the YouTube link once it is published.
   */
  const jobs = new Map();

  function startWrite(body) {
    const id = require('crypto').randomBytes(6).toString('hex');
    const job = {
      id, status: 'running', stage: 'research', topic: String(body.topic || '').slice(0, 300),
      startedAt: Date.now(), script: null, error: null, produce: null,
    };
    jobs.set(id, job);

    oneVideo.write(body, {
      log: (m) => console.log(`[make-video ${id}]`, m),
      onStage: (st) => { job.stage = st; },
    }).then((r) => {
      job.status = 'written';
      job.stage = 'gate';
      job.script = r;
      console.log(`[make-video ${id}] READY: ${r.title} (${r.beats.length} beats, ` +
        `${r.redrafts} redraft(s))`);
    }).catch((e) => {
      job.status = 'failed';
      job.error = e.message;
      console.error(`[make-video ${id}] failed: ${e.message}`);
      // The stack, always. A SyntaxError names no file and no line in its message,
      // so without this a module that fails to PARSE in the container is
      // indistinguishable from one that throws while running -- which is exactly
      // the hour "Invalid or unexpected token" cost with nothing else to go on.
      if (e.stack) console.error(e.stack.split('\n').slice(0, 8).join('\n'));
    });

    // A finished job is worth keeping only as long as someone might poll for it.
    setTimeout(() => jobs.delete(id), 2 * 60 * 60 * 1000).unref();
    return job;
  }

  app.get('/demo/make-video/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'not_found', message: 'No such job (or it expired).' });

    const out = {
      jobId: job.id, status: job.status, stage: job.stage, topic: job.topic,
      elapsedSeconds: Math.round((Date.now() - job.startedAt) / 1000),
      error: job.error,
    };
    if (job.script) {
      const sc = job.script;
      const checkpoint = sc.beats.find((b) => b.mode === 'checkpoint');
      out.script = {
        itemId: sc.itemId, slug: sc.slug, title: sc.title,
        slo: sc.brief && sc.brief.slo,
        interpretation: sc.brief && sc.brief.interpretation,
        scenario: sc.brief && sc.brief.ali_scenario,
        gate: sc.gate && sc.gate.verdict,
        redrafts: sc.redrafts,
        beats: sc.beats.map((b) => ({ id: b.id, mode: b.mode, vo: b.vo || null })),
        // The question the LMS will pop. Never drawn, never spoken.
        checkpoint: checkpoint ? checkpoint.quiz : null,
        checkpointAfterBeat: checkpoint
          ? (sc.beats.slice(0, sc.beats.indexOf(checkpoint)).filter((b) => b.mode !== 'checkpoint').pop() || {}).id
          : null,
      };
    }
    if (job.produce) out.produce = job.produce;
    res.json(out);
  });

  /**
   * Turn a gated script into the finished, published video.
   *
   * SEPARATE FROM WRITING ON PURPOSE. Everything up to the gate is model calls on
   * the service credential and buys nothing. This buys generated art and speech --
   * about $1.50 a video -- and house rules say that is never spent without a person
   * saying yes. Pressing the button on a script you have just read IS that yes.
   */
  app.post('/demo/make-video/:jobId/produce', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'not_found', message: 'No such job (or it expired).' });
    if (job.status !== 'written' || !job.script) {
      return res.status(409).json({ error: 'not_ready', message: 'This video has no gated script yet.' });
    }
    if (job.produce && job.produce.status === 'running') {
      return res.status(409).json({ error: 'already_running', message: 'It is already being produced.' });
    }

    const budgetUsd = Number(process.env.PIPELINE_MAX_APPROVABLE_USD || 0);
    if (!(budgetUsd > 0)) {
      return res.status(503).json({
        error: 'no_budget',
        message: 'Producing a video buys art and speech, and this service has no approved '
          + 'spend limit set (PIPELINE_MAX_APPROVABLE_USD).',
      });
    }

    job.produce = { status: 'running', stage: 'produce', startedAt: Date.now() };
    job.status = 'producing';

    oneVideo.produce(
      {
        itemId: job.script.itemId, budgetUsd, brief: job.script.brief,
        // Only when the request says so. Default is still to stop and wait.
        publishAs: (req.body && req.body.publish) ? ((req.body && req.body.by) || 'Aroma') : null,
      },
      {
        log: (m) => console.log(`[produce ${job.id}]`, m),
        onStage: (st) => { job.produce.stage = st; },
      }
    ).then((r) => {
      const elapsed = Math.round((Date.now() - job.produce.startedAt) / 1000);
      if (r.awaitingReview) {
        // The pipeline working as designed: a person watches it before it goes out.
        job.status = 'awaiting_review';
        job.review = { itemId: r.itemId, artifacts: r.artifacts, qa: r.qa, finalPath: r.finalPath };
        job.produce = {
          status: 'awaiting_review', stage: 'review',
          spendUsd: r.spendUsd, qa: r.qa, elapsedSeconds: elapsed,
        };
        console.log(`[produce ${job.id}] finished, waiting for a human to approve it`);
        return;
      }
      job.status = 'published';
      job.produce = {
        status: 'done', stage: 'upload',
        spendUsd: r.spendUsd,
        youtube: r.youtube,
        elapsedSeconds: elapsed,
      };
      console.log(`[produce ${job.id}] published:`, JSON.stringify(r.youtube));
    }).catch((e) => {
      job.status = 'written';   // the script is still good; only the render failed
      job.produce = { status: 'failed', error: e.message };
      console.error(`[produce ${job.id}] failed: ${e.message}`);
      // The stack, always. A SyntaxError names no file and no line in its message,
      // so without this a module that fails to PARSE in the container is
      // indistinguishable from one that throws while running -- which is exactly
      // the hour "Invalid or unexpected token" cost with nothing else to go on.
      if (e.stack) console.error(e.stack.split('\n').slice(0, 8).join('\n'));
    });

    res.status(202).json({ jobId: job.id, status: 'producing', budgetUsd });
  });

  /**
   * Stream the finished video so it can be watched before it is published.
   *
   * Without this the approval gate is unusable: the stage waits for a person to
   * say the video is good, and the person had no way to see it. Range requests are
   * honoured so the browser can scrub.
   */
  /**
   * The script as a file you can keep.
   *
   * A job record lives in memory and expires after two hours, and the container
   * keeps no disk between releases -- so a script you liked was, until now,
   * readable only for as long as the tab stayed open. Markdown because it is the
   * format a person can read, edit, paste into a document and hand to someone
   * else without a tool in between.
   */
  app.get('/demo/make-video/:jobId/script.md', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job || !job.script) {
      return res.status(404).type('text').send('No script for this job (or it expired).');
    }
    const sc = job.script;
    // Normalise here rather than at each use, so the shape is stated once.
    const brief = sc.brief || {};
    const verdict = (sc.gate && sc.gate.verdict) || sc.gate || null;
    const cpBeat = (sc.beats || []).find((b) => b.mode === 'checkpoint');
    const cp = (cpBeat && cpBeat.quiz) || sc.checkpoint || null;
    const L = [];

    L.push(`# ${sc.title}`, "");
    const interpretation = sc.interpretation || brief.interpretation;
    if (interpretation) L.push(`> ${interpretation}`, "");
    L.push(`**Topic asked:** ${job.topic}`);
    const slo = sc.slo || brief.slo;
    const scenario = sc.scenario || brief.ali_scenario || brief.scenario;
    if (slo) L.push(`**Outcome:** ${slo}`);
    if (scenario) L.push(`**Scenario:** ${scenario}`);
    L.push(`**Review:** ${verdict || "?"}`
      + (sc.redrafts ? ` after ${sc.redrafts} redraft${sc.redrafts > 1 ? "s" : ""}` : " on the first pass")
      + ` · ${sc.beats.length} beats`);
    L.push("", "---", "", "## The script", "");
    L.push("One beat is one spoken sentence, and the picture shown while it is spoken.", "");

    for (const b of sc.beats) {
      if (b.mode === 'checkpoint') {
        L.push("", `**— the video pauses here (beat ${b.id}) —**`, "");
        continue;
      }
      L.push(`**${b.id}** *(${b.mode})*  ${b.vo}`, "");
    }

    if (cp) {
      L.push("---", "", "## The checkpoint", "");
      L.push("Never drawn, never spoken. The video pauses and the LMS shows this as a popup.", "");
      L.push(`**${cp.stem}**`, "");
      cp.options.forEach((o, i) => {
        L.push(`${i === cp.answer ? "- **[correct]**" : "-"} ${o}`);
      });
      L.push("", `**Why the others are wrong:** ${cp.explain}`, "");
    }

    L.push("---", "", `_Made by Content Queen for Taleemabad University · ${new Date().toISOString().slice(0, 10)}_`, "");

    const name = (sc.slug || 'script').replace(/[^a-z0-9-]/gi, '-').slice(0, 60);
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${name}.md"`);
    res.send(L.join('\n'));
  });

  app.get('/demo/make-video/:jobId/video', (req, res) => {
    const job = jobs.get(req.params.jobId);
    const file = job && job.review && job.review.finalPath;
    if (!file || !fs.existsSync(file)) {
      return res.status(404).type('text').send('No finished video for this job.');
    }
    const size = fs.statSync(file).size;
    const range = req.headers.range;
    res.set('Content-Type', 'video/mp4');
    if (!range) {
      res.set('Content-Length', size);
      return fs.createReadStream(file).pipe(res);
    }
    const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
    const start = Number(m[1] || 0);
    const end = m[2] ? Number(m[2]) : size - 1;
    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
    });
    fs.createReadStream(file, { start, end }).pipe(res);
  });

  /** Publish a video a person has just watched. Nothing paid for is made again. */
  app.post('/demo/make-video/:jobId/approve', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'not_found', message: 'No such job (or it expired).' });
    if (job.status !== 'awaiting_review' || !job.review) {
      return res.status(409).json({ error: 'not_ready', message: 'There is no finished video waiting here.' });
    }

    job.status = 'publishing';
    job.produce = { ...job.produce, status: 'running', stage: 'upload' };

    oneVideo.approve(
      { itemId: job.review.itemId, by: (req.body && req.body.by) || 'Aroma', artifacts: job.review.artifacts },
      { log: (m) => console.log(`[approve ${job.id}]`, m), onStage: (st) => { job.produce.stage = st; } }
    ).then((r) => {
      job.status = 'published';
      job.produce = { ...job.produce, status: 'done', stage: 'upload', youtube: r.youtube };
      console.log(`[approve ${job.id}] published:`, JSON.stringify(r.youtube));
    }).catch((e) => {
      job.status = 'awaiting_review';
      job.produce = { ...job.produce, status: 'awaiting_review', stage: 'review', error: e.message };
      console.error(`[approve ${job.id}] failed:`, e.message);
    });

    res.status(202).json({ jobId: job.id, status: 'publishing' });
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

  app.get('/demo/videos', (_req, res) => {
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

  app.get('/demo/videos/:slug/file', (req, res) => {
    const file = oneVideo.fileForSlug(req.params.slug);
    if (!file) return res.status(404).type('text').send('No finished video by that name.');
    const size = fs.statSync(file).size;
    const range = req.headers.range;
    res.set('Content-Type', 'video/mp4');
    if (!range) {
      res.set({ 'Content-Length': size, 'Accept-Ranges': 'bytes' });
      return fs.createReadStream(file).pipe(res);
    }
    const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
    const start = Number(m[1] || 0);
    const end = m[2] ? Number(m[2]) : size - 1;
    res.status(206).set({ 'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(res);
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
    if (event.type !== 'app_mention' && !(event.type === 'message' && event.channel_type === 'im')) return;

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
