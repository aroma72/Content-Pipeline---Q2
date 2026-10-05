'use strict';
/**
 * one-video -- a topic in, one house-standard video script out, then the video.
 *
 * WHY THIS WAS REWRITTEN
 * The first version made one model call and drew three cards. It was fast and
 * it was not a script: no research brief, no protagonist arc, no gate. It broke
 * the rule that matters most here -- a video made from this page must meet the
 * same bar as a video made by hand, or the page is a way of shipping worse work
 * with less effort.
 *
 * So it no longer has a writer of its own. It runs the ACTUAL pipeline stages,
 * the same modules the Slack and Notion paths run:
 *
 *     research -> script -> gate        the script, reviewed and redrafted
 *     produce  -> qa -> review -> upload    art, voice, render, publish
 *
 * The two halves are separated deliberately. Everything up to the gate is model
 * calls on the CLI credential and costs no money, so it can run on a typed
 * topic with nobody watching. Everything after it buys generated art and speech
 * -- about $1.50 a video -- which house rules say is never spent without a
 * person saying yes first. `produce()` is therefore a second, explicit call
 * with a budget, not something `write()` falls through into.
 */

const fs = require('fs');
const path = require('path');

const spine = require('../../orchestrator/lib/spine');
const queue = require('../../orchestrator/lib/queue');
const deliverables = require('../../orchestrator/lib/deliverables');
const { PATHS, videoDir } = require('../../orchestrator/lib/paths');

/** Videos made from a typed topic live together, apart from the hand-made series. */
const SERIES = 'made';

/** The queue's own slug rules, applied here so the id is known before enqueueing. */
function slugify(topic) {
  return String(topic).toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '') || 'video';
}

/**
 * Write and gate a script for one topic.
 *
 * Returns when the gate says READY -- or fails loudly when it does not, because
 * a script the gate rejected is exactly what this page existed to stop shipping.
 *
 * @param {{topic:string, notes?:string}} req
 * @param {{log?:Function, onStage?:Function}} opts
 */
async function write(req, { log = () => {}, onStage = () => {} } = {}) {
  const topic = String((req && req.topic) || '').trim();
  if (!topic) throw Object.assign(new Error('a topic is required'), { status: 400 });

  const slug = `${slugify(topic)}-${Date.now().toString(36).slice(-4)}`;
  const item = enqueue(topic, slug, req.notes);

  onStage('research');
  const st = await spine.execute(item, {
    // Through script-approval, not just the gate. That stage runs the five free
    // script checks produce would otherwise run AFTER the button is pressed --
    // and redrafts on a finding while it still costs nothing. Stopping at the
    // gate told the LMS "passed review" about a script nothing had checked, and
    // on 2026-10-05 produce spent two redraft rounds and a lenient pass on it,
    // then bought art for a draft the checks had never accepted. The stage
    // parks the run with a BlockedError (script-approval), which is the success
    // state here: the script is written, checked, fingerprinted, and waiting.
    stopAfter: 'script-approval',
    quiet: true,
    // No budget: nothing before `produce` spends, and leaving it unset means a
    // mistake that runs on past the gate blocks rather than buys.
    budgetUsd: null,
    stageOverrides: stageProgress(onStage, log),
  });

  const approval = st.stages['script-approval'];
  const parked = Boolean(approval && approval.status === 'blocked' && approval.code === 'script-approval'
    && !(approval.details && approval.details.stale));
  if (st.status !== 'done' && !parked) {
    const why = stoppedBecause(st);
    throw Object.assign(new Error(why), { status: 502, runId: st.runId });
  }

  const dir = videoDir(item.series, item.slug);
  const details = (parked && approval.details) || {};
  return {
    // The bytes the checks passed. produce() approves exactly these.
    scriptSha: details.sha || deliverables.fingerprint(path.join(dir, 'beats.js')),
    // Findings the redraft budget did not settle, carried for the reader. Empty
    // when every free check was satisfied.
    unresolvedChecks: details.unresolvedChecks || [],
    runId: st.runId,
    itemId: item.id,
    slug,
    series: SERIES,
    topic,
    title: st.artifacts.script && st.artifacts.script.title,
    brief: st.artifacts.research,
    beats: readBeats(dir),
    gate: st.artifacts.gate,
    redrafts: Number(st.redrafts) || 0,
    dir,
  };
}

/**
 * Turn an already-gated script into the finished, published video.
 *
 * This is the half that spends. `budgetUsd` is the approval: produce checks its
 * own estimate against it and blocks rather than buying when it is unset, so a
 * caller that forgets cannot accidentally authorise anything.
 *
 * @param {{itemId:string, budgetUsd:number, stopAfter?:string}} req
 */
async function produce(req, { log = () => {}, onStage = () => {} } = {}) {
  const item = queue.get(req.itemId);
  if (!item) throw Object.assign(new Error(`no queued video '${req.itemId}'`), { status: 404 });
  if (!(Number(req.budgetUsd) > 0)) {
    throw Object.assign(
      new Error('producing a video buys art and speech; pass budgetUsd to approve it'),
      { status: 400 }
    );
  }

  const dir = videoDir(item.series, item.slug);
  const beats = readBeats(dir);
  if (!beats) {
    throw Object.assign(new Error('this video has no gated script yet -- write it first'), { status: 409 });
  }

  const st = await spine.execute(item, {
    fromStage: 'produce',
    stopAfter: req.stopAfter || 'upload',
    quiet: true,
    budgetUsd: Number(req.budgetUsd),
    // A caller who has already said "make this and publish it" supplies the
    // approval up front. Absent, the run stops at review and waits, which is
    // still the default: silence is never consent.
    reviewApproved: req.publishAs || null,
    // Pressing produce IS the script approval here -- of the script on disk right
    // now, by sha. write() already ran the free checks on it, so produce's own
    // copies of those checks do not redraft it: a finding is recorded and carried
    // to review, the same protection the course flow has. Without the sha,
    // produce redrafted (2026-10-05: two rounds, then a lenient pass, then the
    // spend) and a redraft rewound through script-approval. The sha is taken
    // from the file rather than the job record because materializeScript may
    // have rebuilt the file from the record, and the person is approving what
    // will actually be rendered.
    scriptApproved: 'produce-request',
    scriptApprovedSha: deliverables.fingerprint(path.join(dir, 'beats.js')),
    // The stages before `produce` are not re-run; their output is already on
    // disk. Seeding records them as skipped, never as done.
    seedArtifacts: {
      script: { title: item.topic, beats },
      // A produce-stage sensor can send the script back to be redrafted, and the
      // writer redrafts far worse without the brief it drew the story from.
      ...(req.brief ? { research: req.brief } : {}),
    },
    stageOverrides: stageProgress(onStage, log),
  });

  // Stopping at `review` is the pipeline working, not failing: a person watches
  // the video before it reaches YouTube. Reporting it as an error was telling the
  // caller the video did not get made, when in fact it is finished and waiting.
  const waiting = st.stages.review && st.stages.review.status === 'blocked';
  const spendUsd = (st.spend && Number(st.spend.usd)) || 0;
  const have = deliverableFor(item, dir);
  if (st.status !== 'done' && !waiting) {
    const stopped = stoppedAt(st);

    // A sensor that runs AFTER the render found something, and the finished,
    // paid-for video is on disk (or already on Drive). That is the same situation
    // as `review` -- a person has to look -- not a failed run. Reported as a
    // failure, 2026-10-05: the LMS told an instructor "nothing was bought, try
    // again" about a $1.60 video that was sitting on the volume, and the retry
    // would have bought it a second time. The finding travels as a warning.
    if (stopped && stopped.status === 'blocked' && stopped.code === 'post-render-check' && have) {
      const d = stopped.details || {};
      const warning = {
        sensor: d.sensor || null, what: d.what || null,
        findings: d.findings || stopped.error, finalRendered: Boolean(d.finalRendered),
      };
      return {
        runId: st.runId,
        itemId: item.id,
        slug: item.slug,
        spendUsd,
        qa: null,
        youtube: null,
        awaitingReview: true,
        blocked: { stage: stopped.name, code: stopped.code, message: stopped.error, details: d },
        warnings: [warning],
        // The stage threw, so it stored no output; synthesise what approve()
        // and the upload stage need to resume without re-rendering.
        artifacts: { produce: syntheticProduce(item, dir, [{ ok: false, ...warning }]), qa: null },
        finalPath: have.file,
        drive: have.drive,
        dir,
      };
    }

    const why = stoppedBecause(st);
    throw Object.assign(new Error(why), {
      status: 502,
      runId: st.runId,
      // What this run actually spent, so the caller settles its ledger at the
      // truth and not at zero. The amount was always on `st.spend`; it was simply
      // never carried out of here.
      spendUsd,
      kind: stopped && stopped.status === 'blocked' ? 'blocked' : 'failed',
      stage: stopped ? stopped.name : null,
      code: (stopped && stopped.code) || null,
      details: (stopped && stopped.details) || null,
      deliverable: have,
    });
  }

  return {
    runId: st.runId,
    itemId: item.id,
    slug: item.slug,
    spendUsd,
    qa: st.artifacts.qa,
    youtube: st.artifacts.upload,
    awaitingReview: Boolean(waiting),
    // Carried so approve() can resume without re-running anything that was paid for.
    artifacts: waiting ? { produce: st.artifacts.produce, qa: st.artifacts.qa } : null,
    warnings: warningsOf(st.artifacts.produce),
    finalPath: have ? have.file : null,
    drive: have ? have.drive : null,
    dir,
  };
}

/**
 * The finished video, wherever it is: the render directory, the volume copy, or
 * Drive after an offload. Any one of the three means "this video exists and was
 * paid for". `file` is null when only the Drive copy is left.
 */
function deliverableFor(item, dir) {
  const local = finishedFile(dir, item.slug);
  const held = local ? null : deliverables.find(item.series, item.slug);
  const drive = deliverables.driveCopy(item.series, item.slug);
  const file = local || (held && held.file) || null;
  if (!file && !drive) return null;
  return { file, drive: drive || null };
}

/**
 * What the produce stage would have reported had it returned. The upload stage
 * resolves `finalPath` through the render dir, the volume and Drive in turn, so
 * the path only has to be the one produce would have written -- the bytes may
 * already have moved on.
 */
function syntheticProduce(item, dir, sensorResults) {
  return {
    dir,
    finalPath: path.join(dir, 'out', `${item.slug}_final.mp4`),
    title: item.topic,
    sensorResults: sensorResults || [],
    synthesised: true,
  };
}

/** Sensor findings the run accepted with a warning, in the shape the job record shows. */
function warningsOf(produced) {
  const results = (produced && produced.sensorResults) || [];
  return results
    .filter((r) => r && r.ok === false)
    .map((r) => ({ sensor: r.sensor || null, what: r.what || null, findings: r.detail || null, accepted: Boolean(r.accepted) }));
}

/**
 * Publish a video a person has just watched and approved.
 *
 * Resumes at `review` with the approval the stage waits for, so nothing that was
 * paid for is made again -- the art, the speech and the render are already on disk.
 *
 * @param {{itemId:string, by:string, artifacts?:object}} req
 */
async function approve(req, { log = () => {}, onStage = () => {} } = {}) {
  const item = queue.get(req.itemId);
  if (!item) throw Object.assign(new Error(`no queued video '${req.itemId}'`), { status: 404 });

  const dir = videoDir(item.series, item.slug);
  // After a verified Drive offload the render dir and the volume copy are gone by
  // design, and the upload stage fetches the video back from Drive -- so any one of
  // the three counts. Refusing on the local file alone made every offloaded video
  // impossible to approve.
  if (!deliverableFor(item, dir)) {
    throw Object.assign(new Error('there is no finished video here to approve'), { status: 409 });
  }

  // A video that reached review through a post-render block carries no produce
  // artefact (the stage threw). Upload refuses without `produce.finalPath`, so
  // give it the path produce would have reported.
  const seed = { ...(req.artifacts || {}) };
  if (!seed.produce || !seed.produce.finalPath) seed.produce = syntheticProduce(item, dir, []);

  const st = await spine.execute(item, {
    fromStage: 'review',
    stopAfter: 'upload',
    quiet: true,
    reviewApproved: req.by || 'Aroma',
    seedArtifacts: seed,
    stageOverrides: stageProgress(onStage, log),
  });

  if (st.status !== 'done') {
    throw Object.assign(new Error(stoppedBecause(st)), { status: 502, runId: st.runId });
  }
  return { runId: st.runId, youtube: st.artifacts.upload, slug: item.slug };
}

/** The delivered file, if the render actually produced one. */
function finishedFile(dir, slug) {
  const out = path.join(dir, 'out');
  try {
    const f = fs.readdirSync(out).find((n) => n.endsWith('_final.mp4'))
      || fs.readdirSync(out).find((n) => n === 'lesson.mp4');
    return f ? path.join(out, f) : null;
  } catch { return null; }
}

/** Put the topic on the queue the spine pops from, or reuse it if it is there. */
function enqueue(topic, slug, notes) {
  const id = `${SERIES}/${slug}`;
  const existing = queue.get(id);
  if (existing) return existing;
  return queue.enqueue({
    topic, series: SERIES, slug, source: 'make-a-video',
    notes: notes ? String(notes).slice(0, 2000) : null,
  });
}

/**
 * Report each stage as it starts, without reimplementing the spine's loop.
 * Wrapping every stage's `run` is the only hook that does not require the spine
 * to know about this caller.
 */
function stageProgress(onStage, log) {
  const real = spine.loadStages();
  const overrides = {};
  for (const [name, stage] of Object.entries(real)) {
    overrides[name] = {
      ...stage,
      async run(ctx) {
        onStage(name);
        log(`stage ${name}`);
        return stage.run(ctx);
      },
    };
  }
  return overrides;
}

/**
 * Why a run ended without finishing.
 *
 * A run can end `blocked` as well as `failed`, and blocked carries the reason
 * that matters most here -- the spend gate. Looking only for 'failed' reported
 * "the run did not finish" and threw away "this video costs ~$1.77 and the
 * budget is $0.01", which is the whole of the useful message.
 */
function stoppedBecause(st) {
  const s = stoppedAt(st);
  if (s) return `${s.name} ${s.status}: ${s.error || 'no reason recorded'}`;
  return `the run ended ${st.status} without finishing`;
}

/** The stage that ended the run, with its structured payload, or null. */
function stoppedAt(st) {
  for (const [name, stage] of Object.entries(st.stages || {})) {
    if (stage.status === 'blocked' || stage.status === 'failed') {
      return {
        name, status: stage.status, error: stage.error || null,
        code: stage.code || null, details: stage.details || null,
      };
    }
  }
  return null;
}

function readBeats(dir) {
  const file = path.join(dir, 'beats.js');
  if (!fs.existsSync(file)) return null;
  delete require.cache[require.resolve(file)];
  const mod = require(file);
  return Array.isArray(mod) ? mod : null;
}

/**
 * Every finished video on this container, newest first.
 *
 * Read off the disk rather than out of a job record. A job record is held in
 * memory and expires after two hours, and when one did, the only route to a
 * finished video expired with it -- the page showed a blank form while the
 * video sat on the server, unreachable. The files are the truth.
 */
function finished() {
  const root = path.join(PATHS.explainerVideos, SERIES);
  let dirs = [];
  try { dirs = fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()); }
  // No render dir -- e.g. a fresh container after a redeploy. Offloaded videos still
  // exist, so fall through and list them rather than returning an empty list.
  catch { dirs = []; }

  return dirs.map((e) => {
    const dir = path.join(root, e.name);
    const file = finishedFile(dir, e.name);
    if (!file) return null;
    const st = fs.statSync(file);
    let title = e.name;
    try {
      const beats = fs.readFileSync(path.join(dir, 'beats.js'), 'utf8');
      const m = beats.match(/^\/\/ Title: (.+)$/m);
      if (m) title = m[1].trim();
    } catch { /* the slug will do */ }
    return {
      slug: e.name,
      itemId: `${SERIES}/${e.name}`,
      title,
      bytes: st.size,
      madeAt: st.mtime.toISOString(),
    };
  }).filter(Boolean).concat(offloadedFinished(dirs.map((e) => e.name)))
    .sort((a, b) => b.madeAt.localeCompare(a.madeAt));
}

/**
 * Videos of this series that now live only on Drive. Without these the list
 * shrank every time a video was offloaded, which read as the video being lost.
 */
function offloadedFinished(localSlugs) {
  const have = new Set(localSlugs);
  let items = [];
  try { items = deliverables.list().items || []; } catch { return []; }
  return items
    .filter((i) => i.saved2drive && !i.videoLocal && i.id.startsWith(`${SERIES}/`))
    .map((i) => {
      const slug = i.id.slice(SERIES.length + 1);
      if (have.has(slug)) return null;
      const copy = deliverables.driveCopy(SERIES, slug) || {};
      return {
        slug, itemId: i.id, title: slug, bytes: copy.bytes || 0,
        madeAt: copy.savedAt || new Date(0).toISOString(),
        saved2drive: true, driveUrl: copy.driveUrl || i.driveUrl || null,
      };
    })
    .filter(Boolean);
}

/** The finished file for one slug, or null. */
function fileForSlug(slug) {
  if (!/^[a-z0-9-]{1,80}$/.test(String(slug))) return null;
  return finishedFile(path.join(PATHS.explainerVideos, SERIES, slug), slug);
}

/** The Drive copy for one slug, once it has been offloaded, or null. */
function driveCopyForSlug(slug) {
  if (!/^[a-z0-9-]{1,80}$/.test(String(slug))) return null;
  return deliverables.driveCopy(SERIES, slug);
}

module.exports = { write, produce, approve, finished, fileForSlug, driveCopyForSlug, finishedFile, SERIES, slugify };
