'use strict';
/**
 * Per-run state: the thing that makes the spine resumable and measurable.
 *
 * One run = one topic travelling through every stage. State is flushed to disk
 * after every transition, so a crash, a kill, or a machine reboot loses at most
 * the stage that was in flight -- `run.js resume <id>` picks up from the last
 * completed stage instead of re-spending money on art and TTS.
 *
 * This file is also where ILHAM plan item 0.3 (instrumentation) lives. Phase 7
 * has to prove "<=20% intervention" and ">=40% turnaround", so every run records
 * wall-clock timings per stage and an explicit, itemised intervention list.
 * A metric nobody recorded cannot be claimed later.
 */

const fs = require('fs');
const path = require('path');
const { PATHS, runStatePath, ensureDirs } = require('./paths');
const jsonl = require('./jsonl');

const STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  BLOCKED: 'blocked',     // stopped on a fail-closed stage (e.g. upload not built yet)
  FAILED: 'failed',
  DONE: 'done',
};

/**
 * Run ids are time-ordered and human-readable so a log line is traceable
 * without a lookup. Deliberately not random: sorting run files sorts by time.
 */
function makeRunId(slug) {
  const t = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
  return `${t}-${slug}`;
}

function create(item) {
  ensureDirs();
  const runId = makeRunId(item.slug);
  const state = {
    runId,
    item,                       // the queue item, verbatim
    status: STATUS.PENDING,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    currentStage: null,
    stages: {},                 // name -> { status, startedAt, finishedAt, ms, attempts, output, error }
    artifacts: {},              // stage name -> whatever it produced (paths, urls, scores)
    interventions: [],          // every point a human had to touch the run
    spend: { usd: 0, calls: [] },
  };
  save(state);
  return state;
}

function save(state) {
  ensureDirs();
  const file = runStatePath(state.runId);
  // Write-then-rename: a crash mid-write must not leave truncated JSON that
  // makes the run unresumable -- which would defeat the whole point of state.
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, file);
  return state;
}

function load(runId) {
  const file = runStatePath(runId);
  if (!fs.existsSync(file)) throw new Error(`No such run: ${runId} (looked in ${file})`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function list() {
  ensureDirs();
  return fs.readdirSync(PATHS.runsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(runStatePath(f.replace(/\.json$/, '')), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function startStage(state, name) {
  const prev = state.stages[name] || { attempts: 0 };
  state.stages[name] = {
    status: STATUS.RUNNING,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    ms: null,
    attempts: (prev.attempts || 0) + 1,
    error: null,
  };
  state.currentStage = name;
  state.status = STATUS.RUNNING;
  return save(state);
}

function finishStage(state, name, { status, output, error }) {
  const s = state.stages[name] || {};
  const startedAt = s.startedAt ? new Date(s.startedAt) : new Date();
  s.status = status;
  s.finishedAt = new Date().toISOString();
  s.ms = new Date(s.finishedAt) - startedAt;
  if (error) {
    s.error = String(error && error.message ? error.message : error);
    // Keep the structured payload too. Flattening a blocker to its message means
    // whoever has to ACT on it -- post the video, quote the score, name the failing
    // sensor -- has to parse English out of a string, or silently does without.
    if (error.blocker) s.blocker = error.blocker;
    if (error.details) s.details = error.details;
  }
  state.stages[name] = s;
  if (output !== undefined) state.artifacts[name] = output;
  return save(state);
}

/**
 * Record a human touch. This is the numerator of the <=20% intervention metric,
 * so it must be recorded even when the human action was trivial -- undercounting
 * here silently inflates the headline autonomy number.
 */
function recordIntervention(state, { stage, kind, detail }) {
  state.interventions.push({
    at: new Date().toISOString(), stage, kind, detail: detail || null,
  });
  return save(state);
}

/**
 * Record money spent during this run.
 *
 * `kind` separates what was bought. 'media' is art, speech and animation -- the
 * things the budget gate was sized for. 'model' is token spend, which used to be
 * real and uncounted, so a lesson's stated cost was only ever part of its cost.
 *
 * They are kept apart rather than merged into one total because the gate in
 * produce.js compares against the budget: folding model spend into the number it
 * checks would eat headroom meant for art and silently downgrade a video to
 * stills over a few Opus calls.
 */
function recordSpend(state, { stage, usd, detail, kind = 'media' }) {
  state.spend.usd = Number((state.spend.usd + usd).toFixed(4));
  state.spend.calls.push({ at: new Date().toISOString(), stage, usd, kind, detail: detail || null });
  return save(state);
}

/** Spend of one kind. Calls recorded before `kind` existed were all media. */
function spendOfKind(state, kind) {
  const total = (state.spend.calls || [])
    .filter((c) => (c.kind || 'media') === kind)
    .reduce((a, c) => a + (c.usd || 0), 0);
  return Number(total.toFixed(4));
}

/** What the budget gate measures: paid artefacts, not tokens. */
const mediaSpend = (state) => spendOfKind(state, 'media');

function finish(state, status) {
  state.status = status;
  state.finishedAt = new Date().toISOString();
  state.currentStage = null;
  save(state);
  appendRunLog(state);
  return state;
}

/**
 * Where a finished run gets written.
 *
 * `.beads/` is on the container filesystem, so a redeploy takes every run record
 * with it -- including the cost of a course that is still running, since a course
 * is measured in hours or days across many pauses. The `runId` on a lesson then
 * outlives the only thing it is a handle for, and the course can no longer be
 * reconciled against any figure.
 *
 * So the same line also goes to the durable job store when there is one, the way
 * publish-log.js already reads publish_review.jsonl from both places. The store
 * is best-effort and in its own try/catch: a run must not fail because a volume
 * is missing.
 */
function runLogTargets() {
  const out = [PATHS.runsLog];
  try {
    const store = require('../../server/lib/job-store').shared();
    if (store && store.dir && store.dir !== PATHS.beads) {
      out.push(path.join(store.dir, 'runs.jsonl'));
    }
  } catch { /* no store on this machine -- .beads is all there is */ }
  return out;
}

/** Flatten a finished run into one line per run log -- the metrics source. */
function appendRunLog(state) {
  const totalMs = state.finishedAt
    ? new Date(state.finishedAt) - new Date(state.startedAt)
    : null;
  const stageMs = {};
  for (const [name, s] of Object.entries(state.stages)) stageMs[name] = s.ms;

  const record = {
    type: 'run',
    runId: state.runId,
    slug: state.item.slug,
    // Without the series a row cannot be joined back to the lesson it describes:
    // `slug` alone is ambiguous, while `<series>/<slug>` is the queue item's id
    // and the catalogue's path. Keeping a cost record that cannot be matched to
    // a lesson was most of the reason to keep it durably at all.
    series: state.item.series || null,
    topic: state.item.topic,
    source: state.item.source || 'manual',
    status: state.status,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    totalMs,
    totalMinutes: totalMs === null ? null : Number((totalMs / 60000).toFixed(2)),
    stageMs,
    stageAttempts: Object.fromEntries(
      Object.entries(state.stages).map(([n, s]) => [n, s.attempts || 0])
    ),
    interventionCount: state.interventions.length,
    interventions: state.interventions,
    spendUsd: state.spend.usd,
    // Split out, because one number could not answer "what does a lesson cost":
    // the media figure is what the budget gates on, the model figure is the token
    // spend that no total used to include.
    spendMediaUsd: spendOfKind(state, 'media'),
    spendModelUsd: spendOfKind(state, 'model'),
    artifacts: state.artifacts,
  };

  for (const target of runLogTargets()) {
    try {
      jsonl.append(target, record);
    } catch (e) {
      console.error(`[state] could not write the run log to ${target}: ${e.message}`);
    }
  }
}

module.exports = {
  STATUS, create, save, load, list,
  startStage, finishStage, recordIntervention, recordSpend, mediaSpend, spendOfKind, finish,
};
