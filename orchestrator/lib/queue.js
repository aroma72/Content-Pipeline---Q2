'use strict';
/**
 * The topic queue -- what the spine pops work from.
 *
 * Append-only JSONL of events, not a mutable list. Current queue state is a
 * left-fold over the events. That costs a full read per operation (fine at this
 * volume) and buys two things that matter: history survives, and two writers
 * can never silently clobber each other's edits the way a rewritten JSON array
 * would.
 *
 * ILHAM plan 4.3 says this queue merges manual topics with ILHAM's content
 * recommendations. Every item therefore carries `source` ('manual' | 'ilham')
 * and an optional `recommendationId`, so 4.2 can report the right ticket back
 * as actioned once 1.3 lands the real schema. The shape is here now so 4.1/4.2
 * become a new `source`, not a queue rewrite.
 */

const { PATHS } = require('./paths');
const jsonl = require('./jsonl');

const ITEM_STATUS = {
  QUEUED: 'queued',
  CLAIMED: 'claimed',
  DONE: 'done',
  FAILED: 'failed',
  BLOCKED: 'blocked',
};

function slugify(topic) {
  return String(topic)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled';
}

/**
 * Fold the event log into current state, keyed by item id.
 * Later events for an id overwrite earlier fields.
 */
function currentItems() {
  const byId = new Map();
  for (const ev of jsonl.readValid(PATHS.queue)) {
    if (!ev.id) continue;
    const prev = byId.get(ev.id) || {};
    byId.set(ev.id, { ...prev, ...ev });
  }
  return [...byId.values()];
}

function enqueue({
  topic, series, slug, source = 'manual', recommendationId = null, priority = 5, notes = null,
  // Title convention: "<module number> | <module topic> | <subtopic>". Carried on
  // the item so the title can be composed identically for the bumper, the YouTube
  // title and the review log. Omitted values fall back to the series->module map
  // in lib/naming.js; an unmapped series produces a warning, never a guess.
  module: moduleNumber = null, moduleTopic = null,
}) {
  if (!topic) throw new Error('enqueue requires a topic');
  if (!series) throw new Error('enqueue requires a series (the explainer-videos subfolder)');
  const finalSlug = slug || slugify(topic);
  const id = `${series}/${finalSlug}`;

  const existing = currentItems().find((i) => i.id === id);
  if (existing && existing.status !== ITEM_STATUS.FAILED) {
    throw new Error(
      `Item '${id}' already in the queue with status '${existing.status}'. ` +
      `Use a different slug, or 'requeue' it if it failed.`
    );
  }

  const item = {
    id, topic, series, slug: finalSlug, source, recommendationId, priority, notes,
    module: moduleNumber === null ? null : Number(moduleNumber),
    moduleTopic,
    status: ITEM_STATUS.QUEUED,
    enqueuedAt: new Date().toISOString(),
  };
  jsonl.append(PATHS.queue, item);
  return item;
}

/** Highest priority first (1 = most urgent), then oldest first. */
function nextQueued() {
  const queued = currentItems().filter((i) => i.status === ITEM_STATUS.QUEUED);
  queued.sort((a, b) =>
    (a.priority - b.priority) || String(a.enqueuedAt).localeCompare(String(b.enqueuedAt))
  );
  return queued[0] || null;
}

function get(id) {
  return currentItems().find((i) => i.id === id) || null;
}

function setStatus(id, status, extra = {}) {
  const item = get(id);
  if (!item) throw new Error(`No queue item '${id}'`);
  const ev = { id, status, updatedAt: new Date().toISOString(), ...extra };
  jsonl.append(PATHS.queue, ev);
  return { ...item, ...ev };
}

const claim   = (id, runId) => setStatus(id, ITEM_STATUS.CLAIMED, { runId });
const done    = (id, runId, artifacts) => setStatus(id, ITEM_STATUS.DONE, { runId, artifacts });
const fail    = (id, runId, error) => setStatus(id, ITEM_STATUS.FAILED, { runId, error: String(error) });
const block   = (id, runId, reason) => setStatus(id, ITEM_STATUS.BLOCKED, { runId, reason });
const requeue = (id) => setStatus(id, ITEM_STATUS.QUEUED, { requeuedAt: new Date().toISOString() });

module.exports = {
  ITEM_STATUS, slugify, currentItems, enqueue, nextQueued, get,
  claim, done, fail, block, requeue,
};
