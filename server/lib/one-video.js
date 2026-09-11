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
    stopAfter: 'gate',
    quiet: true,
    // No budget: nothing before `produce` spends, and leaving it unset means a
    // mistake that runs on past the gate blocks rather than buys.
    budgetUsd: null,
    stageOverrides: stageProgress(onStage, log),
  });

  if (st.status !== 'done') {
    const why = stoppedBecause(st);
    throw Object.assign(new Error(why), { status: 502, runId: st.runId });
  }

  const dir = videoDir(item.series, item.slug);
  return {
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
    // The stages before `produce` are not re-run; their output is already on
    // disk. Seeding records them as skipped, never as done.
    seedArtifacts: { script: { title: item.topic, beats } },
    stageOverrides: stageProgress(onStage, log),
  });

  if (st.status !== 'done') {
    const why = stoppedBecause(st);
    throw Object.assign(new Error(why), { status: 502, runId: st.runId });
  }

  return {
    runId: st.runId,
    itemId: item.id,
    slug: item.slug,
    spendUsd: st.spend && st.spend.usd,
    qa: st.artifacts.qa,
    youtube: st.artifacts.upload,
    dir,
  };
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
  for (const [name, stage] of Object.entries(st.stages || {})) {
    if (stage.status === 'blocked' || stage.status === 'failed') {
      return `${name} ${stage.status}: ${stage.error || 'no reason recorded'}`;
    }
  }
  return `the run ended ${st.status} without finishing`;
}

function readBeats(dir) {
  const file = path.join(dir, 'beats.js');
  if (!fs.existsSync(file)) return null;
  delete require.cache[require.resolve(file)];
  const mod = require(file);
  return Array.isArray(mod) ? mod : null;
}

module.exports = { write, produce, SERIES, slugify };
