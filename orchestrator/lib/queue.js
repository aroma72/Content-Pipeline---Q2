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

const path = require('path');
const fs = require('fs');
const { PATHS } = require('./paths');
const jsonl = require('./jsonl');

// ── where the queue lives ────────────────────────────────────────────────────
// In the job store, not in the repo, so it lands on the Railway volume and a
// course outlives the redeploy that interrupts it. Resolved lazily and memoised:
// job-store requires lib/paths back, so resolving at module-evaluation time
// would hand it a half-built PATHS and silently drop durability to a temp dir.
let cached = null;

function store() {
  try {
    return require('../../server/lib/job-store').shared();
  } catch {
    // The orchestrator CLI can run without server/ present.
    return null;
  }
}

function resolve() {
  if (cached) return cached;
  const s = store();
  const dir = s && s.writable ? path.join(s.dir, 'queue') : PATHS.orchestrator;
  const durability = s ? (s.writable ? s.durability : 'memory') : 'container';
  const file = path.join(dir, 'queue.jsonl');

  // Seed once from the old in-repo location -- but NEVER onto a volume. A legacy
  // file only reaches a volume-backed deploy by having been baked into the image,
  // where it is a build-time snapshot of somebody's laptop. Copying that forward
  // would resurrect dead lessons, and a 'queued' one would be built and paid for.
  // Migration must not be able to spend money.
  try {
    if (durability !== 'volume' && !fs.existsSync(file) && fs.existsSync(PATHS.legacyQueue)) {
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(PATHS.legacyQueue, file);
      jsonl.append(file, { __migratedFrom: PATHS.legacyQueue, __at: new Date().toISOString() });
    }
  } catch { /* a queue that cannot be seeded is an empty queue, not a crash */ }

  cached = { file, dir, durability };
  return cached;
}

/** The resolved queue file. */
function queueFile() { return resolve().file; }

/** How well this queue survives: volume | container | ephemeral | memory. */
function durability() { return resolve().durability; }

/** When this queue file came into existence, or null if it does not exist yet. */
function durableSince() {
  try { return fs.statSync(queueFile()).birthtime.toISOString(); } catch { return null; }
}

/** Test isolation -- mirrors jobStore.reset(). */
function resetPathCache() { cached = null; }

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
  for (const ev of jsonl.readValid(queueFile())) {
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
  jsonl.appendDurable(queueFile(), item);
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
  jsonl.appendDurable(queueFile(), ev);
  return { ...item, ...ev };
}

const claim   = (id, runId) => setStatus(id, ITEM_STATUS.CLAIMED, { runId });
const done    = (id, runId, artifacts) => setStatus(id, ITEM_STATUS.DONE, { runId, artifacts });
const fail    = (id, runId, error) => setStatus(id, ITEM_STATUS.FAILED, { runId, error: String(error) });
// `blockedBy` is the machine-readable half of a block; `reason` is the prose.
// A caller with one Approve button has to tell "waiting for a person" apart from
// "a judge flagged the finished video", and the only other signal was a sentence
// a model wrote. Closed set, defaulted here so an older caller that blocks
// without one still records the ordinary case rather than nothing.
const block   = (id, runId, reason, blockedBy) =>
  setStatus(id, ITEM_STATUS.BLOCKED, { runId, reason, blockedBy: blockedBy || 'review' });

// Send a lesson back to the queue for another attempt.
//
// The clearing is the point, and it is here rather than in the caller because
// currentItems() is a shallow fold that never deletes a key: a lesson that was
// approved, rendered, and then failed still carries `reviewApproved`, so a bare
// status flip would resume it straight PAST human review and publish a video
// nobody watched. Same for `interrupted`, which would send it down the rebuild
// branch of approve(), and for `error`/`reason`/`blockedBy`, which would
// describe the new attempt by the old one's ending.
const requeue = (id, extra) => setStatus(id, ITEM_STATUS.QUEUED, {
  requeuedAt: new Date().toISOString(),
  reviewApproved: false,
  interrupted: false,
  error: null,
  reason: null,
  blockedBy: null,
  ...(extra || {}),
});

module.exports = {
  ITEM_STATUS, slugify, currentItems, enqueue, nextQueued, get,
  // setStatus is the primitive the named helpers wrap. It is exported because
  // approving a lesson has to carry fields none of them do (reviewApproved,
  // approvedAt) -- course-worker called it for months while it was private, so
  // every approve and reject threw.
  setStatus, claim, done, fail, block, requeue,
  queueFile, durability, durableSince, resetPathCache,
};
