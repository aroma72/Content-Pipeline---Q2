'use strict';
/**
 * The worker: one video at a time, reporting back to whoever asked.
 *
 * Why a worker and not just handling the request inline — a render runs headless
 * Chrome and ffmpeg for anywhere from several minutes to over an hour, while Slack
 * abandons a request that has not been answered in three seconds. The two cannot
 * be the same call, so the HTTP handler only acknowledges, and the real work
 * happens here and reports back asynchronously.
 *
 * Concurrency is deliberately one. Two simultaneous renders would fight over CPU
 * on a single Railway instance and make both take longer than running them in
 * sequence, and the queue is an append-only log with no cross-process locking.
 */

const path = require('path');
const { config } = require('./config');
const slack = require('./slack');
const jira = require('./jira');

const queue = require('../../orchestrator/lib/queue');
const spine = require('../../orchestrator/lib/spine');
const state = require('../../orchestrator/lib/state');

const pending = [];
let running = null;

/** Human-readable one-liner for a stage entering a new status. */
const STAGE_BLURB = {
  research: 'researching the topic',
  script: 'writing the script',
  gate: 'running the script through the gate',
  produce: 'generating art, voiceover and rendering',
  qa: 'scoring it against the QA rubric',
  upload: 'uploading',
  nazim: 'handing off to NAZIM',
};

/** Where a request came from, so results go back to the same conversation. */
async function reply(origin, text) {
  if (origin.type === 'slack') {
    await slack.postMessage({ channel: origin.channel, threadTs: origin.threadTs, text });
  } else if (origin.type === 'jira') {
    await jira.addComment(origin.issueKey, text);
  }
}

/**
 * Accept a request. Returns immediately — the caller must not await the render.
 */
function submit({ topic, series, origin, requestedBy }) {
  let item;
  try {
    item = queue.enqueue({ topic, series, source: 'manual', notes: `via ${origin.type}${requestedBy ? ` by ${requestedBy}` : ''}` });
  } catch (e) {
    // The commonest cause by far is a duplicate slug — an existing item with the
    // same series/topic. That is a message to the human, not a server error.
    return { ok: false, error: e.message };
  }

  pending.push({ item, origin });
  setImmediate(drain);
  return { ok: true, item, queuePosition: pending.length + (running ? 1 : 0) };
}

/** Poll the run state and narrate stage changes into the originating thread. */
function watch(st, origin) {
  const announced = new Set();
  return setInterval(() => {
    for (const [name, stage] of Object.entries(st.stages || {})) {
      if (stage.status === 'running' && !announced.has(name)) {
        announced.add(name);
        reply(origin, `_${STAGE_BLURB[name] || name}…_`).catch(() => {});
      }
    }
  }, 15000);
}

async function runOne(job) {
  const { item, origin } = job;

  if (config.pipeline.budgetUsd <= 0 && !config.pipeline.dryRun) {
    await reply(
      origin,
      `I can't start "${item.topic}" — no render budget is authorised. ` +
      `Set \`PIPELINE_BUDGET_USD\` in Railway to the most a single video may spend, then ask again.`
    );
    queue.fail(item.id, null, 'no budget authorised');
    return;
  }

  await reply(
    origin,
    `On it — *${item.topic}* (series \`${item.series}\`).\n` +
    `This takes a while; I'll post here as it moves, and drop the video in when it's done.`
  );

  // Create the run state here rather than letting the spine do it, so the
  // progress watcher has the same object the spine mutates as it goes.
  const st = state.create(item);
  const ticker = watch(st, origin);

  let final;
  try {
    final = await spine.execute(item, {
      resumeState: st,
      budgetUsd: config.pipeline.budgetUsd,
      stopAfter: config.pipeline.stopAfter || null,
      dryRun: config.pipeline.dryRun,
      quiet: false,
    });
  } catch (e) {
    clearInterval(ticker);
    console.error('[jobs] spine threw:', e);
    await reply(origin, `That run failed outright: ${e.message}`);
    return;
  }
  clearInterval(ticker);

  await deliver(final, origin);
}

/** Report the outcome and hand over the file. */
async function deliver(final, origin) {
  const status = final.status;
  const produced = final.artifacts && final.artifacts.produce;
  const qa = final.artifacts && final.artifacts.qa;
  const qaScore = qa && (typeof qa.combined_score === 'number' ? qa.combined_score : qa.total);

  if (status !== 'done') {
    // Name the stage that stopped it — "it failed" sends someone digging through
    // logs for information the run state already has.
    const stuck = Object.entries(final.stages || {})
      .find(([, s]) => s.status === 'failed' || s.status === 'blocked');
    const where = stuck ? stuck[0] : 'an unknown stage';
    const why = stuck && stuck[1].error ? stuck[1].error : 'no reason recorded';
    await reply(origin, `Stopped at *${where}* (${status}).\n\`\`\`${String(why).slice(0, 800)}\`\`\``);
    return;
  }

  const summary =
    `Done — *${final.item.topic}*` +
    (typeof qaScore === 'number' ? `\nQA ${qaScore.toFixed(1)}/7.0` : '') +
    (config.pipeline.dryRun ? '\n_(dry run — nothing was actually rendered)_' : '');

  const finalPath = produced && produced.finalPath;
  if (!finalPath) {
    await reply(origin, `${summary}\n(No deliverable file was reported.)`);
    return;
  }

  if (origin.type === 'slack') {
    await slack.uploadVideo({
      channel: origin.channel,
      threadTs: origin.threadTs,
      filePath: finalPath,
      title: final.item.topic,
      comment: summary,
    });
  } else if (origin.type === 'jira') {
    await jira.addComment(origin.issueKey, summary);
    await jira.attachFile(origin.issueKey, finalPath);
  }

  // Cross-post to the standing channel so finished work is visible even when the
  // request came from Jira.
  if (config.slack.defaultChannel && origin.type !== 'slack' && slack.isConfigured()) {
    await slack.uploadVideo({
      channel: config.slack.defaultChannel,
      filePath: finalPath,
      title: final.item.topic,
      comment: `${summary}\n_Requested in Jira ${origin.issueKey}._`,
    });
  }

  console.log(`[jobs] delivered ${path.basename(finalPath)}`);
}

async function drain() {
  if (running || pending.length === 0) return;
  running = pending.shift();
  try {
    await runOne(running);
  } catch (e) {
    console.error('[jobs] unhandled:', e);
  } finally {
    running = null;
    if (pending.length) setImmediate(drain);
  }
}

const status = () => ({
  running: running ? running.item.id : null,
  pending: pending.map((j) => j.item.id),
});

module.exports = { submit, status };
