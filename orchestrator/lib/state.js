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
  if (error) s.error = String(error && error.message ? error.message : error);
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

function recordSpend(state, { stage, usd, detail }) {
  state.spend.usd = Number((state.spend.usd + usd).toFixed(4));
  state.spend.calls.push({ at: new Date().toISOString(), stage, usd, detail: detail || null });
  return save(state);
}

function finish(state, status) {
  state.status = status;
  state.finishedAt = new Date().toISOString();
  state.currentStage = null;
  save(state);
  appendRunLog(state);
  return state;
}

/** Flatten a finished run into one line in .beads/runs.jsonl -- the metrics source. */
function appendRunLog(state) {
  const totalMs = state.finishedAt
    ? new Date(state.finishedAt) - new Date(state.startedAt)
    : null;
  const stageMs = {};
  for (const [name, s] of Object.entries(state.stages)) stageMs[name] = s.ms;

  jsonl.append(PATHS.runsLog, {
    type: 'run',
    runId: state.runId,
    slug: state.item.slug,
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
    artifacts: state.artifacts,
  });
}

module.exports = {
  STATUS, create, save, load, list,
  startStage, finishStage, recordIntervention, recordSpend, finish,
};
