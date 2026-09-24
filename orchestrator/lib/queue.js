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
const { BLOCKED_BY, DEFAULT_BLOCKED_BY, BLOCKED_BY_VALUES } = require('./spine-errors');
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
  // Whether this lesson should carry external reading. Off unless asked for:
  // it buys a web search per lesson, and most courses do not want one.
  wantReferences = false,
  // Who is paying, and the ledger reservation taken for this lesson. Null for a
  // lesson enqueued before tenants were recorded; the tenant guard then stays off.
  tenantId = null, spendRef = null,
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
    wantReferences: Boolean(wantReferences),
    tenantId: tenantId || null,
    spendRef: spendRef || null,
    status: ITEM_STATUS.QUEUED,
    enqueuedAt: new Date().toISOString(),
    // A failed slug may be enqueued again, and the fold never deletes a key. Reset
    // every field a person writes to release a lesson, or a fresh build would
    // inherit the old attempt's approval and skip review.
    reviewApproved: false, requeuedBy: null, rebuildApprovedBy: null, skipped: false,
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

/**
 * What this attempt cost, and what the lesson has cost in total.
 *
 * A course creates queue items, never jobs, and the tenant ledger is built from job
 * records -- so this is the ONLY place a course's spend is durably written. Without
 * it an LMS holds an authorisation it can never settle: ours held $1.50 against an
 * instructor for a lesson that really cost $0.598, and could not find that out.
 *
 * Both numbers, because they answer different questions. `spendUsd` is this run --
 * what to reconcile against this runId. `spendUsdTotal` accumulates across retries,
 * which is what the instructor was actually charged for the lesson; keeping only the
 * former would silently forget the cost of every failed attempt before it.
 *
 * NOTE for anyone reconciling: neither of these is a media/model split. They are
 * this-attempt and all-attempts. The split is `spendMediaUsd` / `spendModelUsd`,
 * added here because a consumer was reading the pair above as one -- a lesson that
 * failed once and succeeded on retry reports a larger total for that reason alone.
 *
 * Accepts a plain number as well as the breakdown, because items settled before the
 * breakdown existed passed one, and an old event replayed through the fold must not
 * start claiming its whole cost was media.
 */
function spendFields(id, spend) {
  const isBreakdown = spend && typeof spend === 'object';
  const spendUsd = isBreakdown ? Number(spend.usd) : spend;
  if (!Number.isFinite(spendUsd)) return {};

  const prior = get(id);
  const before = (prior && Number(prior.spendUsdTotal)) || 0;
  const fields = { spendUsd, spendUsdTotal: Number((before + spendUsd).toFixed(4)) };
  if (!isBreakdown) return fields;

  const media = Number(spend.media);
  const model = Number(spend.model);
  if (Number.isFinite(media)) {
    const mBefore = (prior && Number(prior.spendMediaUsdTotal)) || 0;
    fields.spendMediaUsd = media;
    fields.spendMediaUsdTotal = Number((mBefore + media).toFixed(4));
  }
  if (Number.isFinite(model)) {
    const mBefore = (prior && Number(prior.spendModelUsdTotal)) || 0;
    fields.spendModelUsd = model;
    fields.spendModelUsdTotal = Number((mBefore + model).toFixed(4));
  }
  return fields;
}

const claim   = (id, runId) => setStatus(id, ITEM_STATUS.CLAIMED, { runId });
const done    = (id, runId, artifacts, spendUsd) =>
  setStatus(id, ITEM_STATUS.DONE, { runId, artifacts, ...spendFields(id, spendUsd) });
const fail    = (id, runId, error, spendUsd) =>
  setStatus(id, ITEM_STATUS.FAILED, { runId, error: String(error), ...spendFields(id, spendUsd) });
// `blockedBy` is the machine-readable half of a block; `reason` is the prose.
// A caller with one Approve button has to tell "waiting for a person" apart from
// "a judge flagged the finished video", and the only other signal was a sentence
// a model wrote. The closed set is BLOCKED_BY in spine-errors.js; defaulted here
// so an older caller that blocks without one still records the ordinary case
// rather than nothing.
const block   = (id, runId, reason, blockedBy, spendUsd) =>
  setStatus(id, ITEM_STATUS.BLOCKED, {
    runId, reason, blockedBy: blockedBy || DEFAULT_BLOCKED_BY, ...spendFields(id, spendUsd),
  });

/**
 * Record that a lesson's video now lives on Google Drive.
 *
 * Keeps the item's CURRENT status on purpose. This is not a lifecycle
 * transition -- a lesson blocked at review is still blocked after its bytes are
 * copied somewhere safe -- and writing a status here would let a storage
 * operation quietly release a human gate.
 *
 * The flag has to live on the queue item, not only in drive.json on the volume,
 * because the queue item is what `GET /api/v1/courses/:courseId` projects and
 * therefore the only per-lesson record the LMS actually polls.
 *
 * Note what is NOT needed: an entry in requeue()'s clear-list. The bytes are
 * still on Drive after a requeue, so the flag stays true; clearing it would
 * make a rebuilt lesson claim its existing Drive copy had vanished.
 */
const markSavedToDrive = (id, drive = {}) => {
  const item = get(id);
  if (!item) throw new Error(`No queue item '${id}'`);
  return setStatus(id, item.status, {
    saved2drive: true,
    driveFileId: drive.driveFileId || null,
    driveUrl: drive.driveUrl || null,
    driveSavedAt: drive.savedAt || new Date().toISOString(),
    driveBytes: Number.isFinite(drive.bytes) ? drive.bytes : null,
    driveVerified: Boolean(drive.verified),
  });
};

// Send a lesson back to the queue for another attempt.
//
// The clearing is the point, and it is here rather than in the caller because
// currentItems() is a shallow fold that never deletes a key: a lesson that was
// approved, rendered, and then failed still carries `reviewApproved`, so a bare
// status flip would resume it straight PAST human review and publish a video
// nobody watched. Same for `interrupted`, which would send it down the rebuild
// branch of approve(), and for `error`/`reason`/`blockedBy`, which would
// describe the new attempt by the old one's ending.
// The same applies to the SCRIPT gate: a requeued lesson carrying scriptApproved
// would resume straight past the read, and one carrying scriptApprovedSha would
// carry an authorisation for a script this attempt has not written yet.
// humanRevisions is deliberately NOT cleared -- the revision budget is per lesson,
// not per attempt, or a requeue would be a way to buy five more rounds.
const requeue = (id, extra) => setStatus(id, ITEM_STATUS.QUEUED, {
  requeuedAt: new Date().toISOString(),
  reviewApproved: false,
  interrupted: false,
  scriptApproved: false,
  scriptApprovedSha: null,
  scriptNotes: null,
  error: null,
  reason: null,
  blockedBy: null,
  ...(extra || {}),
});

module.exports = {
  ITEM_STATUS,
  // Re-exported from spine-errors.js, which is where the throwers live. The
  // server side reads the queue and not the spine, so without this the only way
  // to name a block was a string literal -- which is how the set drifted.
  BLOCKED_BY, DEFAULT_BLOCKED_BY, BLOCKED_BY_VALUES,
  slugify, currentItems, enqueue, nextQueued, get,
  // setStatus is the primitive the named helpers wrap. It is exported because
  // approving a lesson has to carry fields none of them do (reviewApproved,
  // approvedAt) -- course-worker called it for months while it was private, so
  // every approve and reject threw.
  setStatus, claim, done, fail, block, requeue, markSavedToDrive,
  // Exported so the split it produces can be tested without settling a real
  // lesson: the media/model breakdown is a published contract now.
  spendFields,
  queueFile, durability, durableSince, resetPathCache,
};
