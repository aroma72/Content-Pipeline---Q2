'use strict';
/**
 * jobs -- the job lifecycle, so no route ever touches a file.
 *
 * Routes used to hold the Map, mutate the record inline and own the TTL. That
 * put five copies of "what a job looks like" in five handlers, and meant the
 * only place a status change could be observed was wherever it happened to be
 * written. `transition()` exists to be the single choke point: it is where the
 * record is persisted and, later, where a webhook fires. One place, so a state
 * change cannot be made without both.
 *
 * WHAT IS PERSISTED, AND WHAT IS NOT
 * `review.finalPath` is deliberately NOT stored. It is an absolute path inside
 * one container -- after a redeploy it is still a valid-looking string and points
 * at nothing, so a stored copy would make `/video` serve a confident 500 instead
 * of an honest 404. The series and slug are stored instead and the path is
 * resolved at read time, which also means the answer stays right when the volume
 * mount point changes underneath it.
 *
 * The beats are not stored either: they already live durably in
 * explainer-videos/<series>/<slug>/beats.js, and a copy would be a second truth
 * free to drift from the first.
 */

const crypto = require('crypto');
const path = require('path');

const jobStore = require('./job-store');

/** A status nothing will move again. Mirrors job-store's TERMINAL. */
const TERMINAL = jobStore.TERMINAL;

/**
 * Statuses whose work lived in an in-process promise.
 *
 * Found on disk after a restart, they are lies: the promise died with the old
 * process and nothing will ever transition them again.
 */
const IN_FLIGHT = new Set(['running', 'producing', 'publishing']);

function newId() {
  return crypto.randomBytes(6).toString('hex');
}

function store(opts = {}) {
  return opts.store || jobStore.shared();
}

/**
 * Create a job in `running`, owned by whoever asked for it.
 *
 * The owner is recorded at birth and never inferred later. A job with no owner
 * is a job whose `jobId` is once again a bearer credential, which is the whole
 * thing this is here to stop.
 */
function create({ topic, notes, owner, callbackUrl }, opts = {}) {
  const s = store(opts);
  const now = Date.now();
  const job = {
    id: newId(),
    status: 'running',
    stage: 'research',
    topic: String(topic || '').slice(0, 300),
    notes: notes ? String(notes).slice(0, 2000) : null,
    startedAt: now,
    updatedAt: now,
    ownerKind: owner ? owner.kind : 'anon',
    ownerId: owner ? owner.id : null,
    tenantId: owner && owner.tenant ? owner.tenant.id : null,
    claimedFrom: null,
    callbackUrl: callbackUrl || null,
    script: null,
    produce: null,
    review: null,
    error: null,
  };
  return s.put(job);
}

function get(id, opts = {}) {
  return store(opts).get(id);
}

/**
 * The single place a job changes state.
 *
 * Everything that moves a job goes through here so that persistence and
 * notification cannot be done separately -- and therefore cannot be forgotten
 * one at a time.
 */
function transition(id, { status, stage, patch }, opts = {}) {
  const s = store(opts);
  const before = s.get(id);
  if (!before) return null;
  const after = s.patch(id, (j) => {
    if (status) j.status = status;
    if (stage) j.stage = stage;
    if (patch) Object.assign(j, patch);
    return j;
  });
  if (after && before.status !== after.status && opts.onTransition) {
    try { opts.onTransition(after, before); } catch { /* notification must not break the job */ }
  }
  return after;
}

/** Owner identity as a single comparable string. */
function ownerKey(owner) {
  if (!owner) return null;
  return owner.kind === 'tenant' ? `tenant:${owner.id}` : `anon:${owner.id}`;
}

function ownedBy(job, owner) {
  if (!job || !owner) return false;
  return job.ownerId === owner.id;
}

/**
 * Hand an anonymous job to the tenant that is about to pay for it.
 *
 * Without this the demo page ships broken: the page creates a job anonymously
 * (free, and deliberately so) and then presses Produce with a tenant token, at
 * which point the creator and the producer are different owners and every job
 * the page ever made would 404 at the button.
 *
 * Once only, and only before any money is involved -- a job already producing or
 * published has an audit trail that must not change hands underneath it.
 */
function claim(id, { to }, opts = {}) {
  const s = store(opts);
  const job = s.get(id);
  if (!job) return { ok: false, why: 'no such job' };
  if (job.claimedFrom) return { ok: false, why: 'this job has already been claimed' };
  if (job.status !== 'written') {
    return { ok: false, why: `a job can only be claimed while its script is written, not while it is ${job.status}` };
  }
  if (!to || to.kind !== 'tenant') return { ok: false, why: 'only a tenant can claim a job' };
  const next = s.patch(id, (j) => {
    j.claimedFrom = j.ownerId;
    j.ownerKind = 'tenant';
    j.ownerId = to.id;
    j.tenantId = to.tenant ? to.tenant.id : null;
    return j;
  });
  return { ok: true, job: next };
}

/**
 * The finished file for this job, resolved now rather than remembered.
 * Returns null once the container that rendered it is gone, which is the truth.
 */
/**
 * Where this job's finished video actually is.
 *
 * Two fallbacks, both earned by a real failure.
 *
 * SERIES/SLUG came only from `job.review`, which is written when produce RETURNS.
 * A run that finishes the video and then blocks at the review gate never returns
 * -- it throws -- so the one state in which a person most needs to watch the file
 * was the one state in which nothing could find it. `job.script` carries the same
 * two fields and is written earlier.
 *
 * THE FILE came only from the render directory, which .dockerignore excludes, so
 * it is gone after the next redeploy. The durable copy on the volume is the one
 * that survives, and it is the copy the LMS is told to fetch.
 */
function resolveFinalPath(job, opts = {}) {
  const from = (job && job.review && job.review.series && job.review.slug)
    ? job.review
    : (job && job.script && job.script.series && job.script.slug ? job.script : null);
  if (!from) return null;

  try {
    const oneVideo = opts.oneVideo || require('./one-video');
    const { videoDir } = require('../../orchestrator/lib/paths');
    const onDisk = oneVideo.finishedFile(videoDir(from.series, from.slug), from.slug);
    if (onDisk) return onDisk;
  } catch { /* fall through to the durable copy */ }

  try {
    const found = require('../../orchestrator/lib/deliverables').find(from.series, from.slug);
    return found ? found.file : null;
  } catch { return null; }
}
/** Re-read the beats from disk when something actually needs them. */
function hydrateScript(job) {
  if (!job || !job.script || !job.script.series || !job.script.slug) return null;
  try {
    const fs = require('fs');
    const { videoDir } = require('../../orchestrator/lib/paths');
    const file = path.join(videoDir(job.script.series, job.script.slug), 'beats.js');
    if (!fs.existsSync(file)) return null;
    delete require.cache[require.resolve(file)];
    const mod = require(file);
    return Array.isArray(mod) ? mod : null;
  } catch { return null; }
}

/**
 * Put the script back on disk for produce to read, from wherever it survived.
 *
 * produce reads videoDir/beats.js, and videoDir is on the container filesystem.
 * On 2026-09-25 two redeploys replaced the container while a job sat `written`;
 * produce failed in 9 ms with "no gated script yet", the job went back to
 * `written`, and the LMS drew the same page it had before the click. The bytes
 * were gone but the job record still described every beat -- nothing rebuilt
 * the file from it. Three sources, in order of fidelity:
 *
 *   disk        the file is where produce expects it (nothing to do)
 *   volume      the copy persist() made when the job became `written`
 *   job-record  `script.beatsFull`, the complete beats kept since this fix
 *
 * The old `script.beats` projection is NOT a source: it keeps an info card's
 * template name and drops its data, so a file rebuilt from it renders blank
 * cards. A job with nothing better than that has genuinely lost its script,
 * and the honest answer is to say so rather than render six empty frames.
 *
 * Returns { ok:true, source, file } or { ok:false, why }. Never throws.
 */
function materializeScript(job, { log = () => {} } = {}) {
  const s = job && job.script;
  if (!s || !s.series || !s.slug) return { ok: false, why: 'this job has no script' };
  const fs = require('fs');
  const { videoDir } = require('../../orchestrator/lib/paths');
  const dir = videoDir(s.series, s.slug);
  const file = path.join(dir, 'beats.js');

  if (fs.existsSync(file)) return { ok: true, source: 'disk', file };

  try {
    const held = require('../../orchestrator/lib/deliverables').findScript(s.series, s.slug);
    if (held && held.beats) {
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(held.beats, file);
      if (held.durations) fs.copyFileSync(held.durations, path.join(dir, 'durations.json'));
      log('beats.js restored from the volume copy');
      return { ok: true, source: 'volume', file };
    }
  } catch (e) {
    log(`could not restore beats.js from the volume (${e.message}); trying the job record`);
  }

  if (Array.isArray(s.beatsFull) && s.beatsFull.length) {
    try {
      const { renderBeatsFile } = require('../../orchestrator/lib/beats-file');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, renderBeatsFile({ title: s.title || job.topic, beats: s.beatsFull }), 'utf8');
      log(`beats.js rebuilt from the job record (${s.beatsFull.length} beats)`);
      return { ok: true, source: 'job-record', file };
    } catch (e) {
      log(`could not rebuild beats.js from the job record: ${e.message}`);
    }
  }

  return {
    ok: false,
    why: 'the script was lost when the service restarted before it had been saved; '
      + 'nothing was bought. It has to be written again -- create the video once more.',
  };
}

/**
 * The shape the API returns. Identical to what the routes built inline before,
 * plus the catalogue key -- see below.
 */
function toPublic(job, { includeScript = true, baseUrl = '' } = {}) {
  if (!job) return null;
  const out = {
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    topic: job.topic,
    elapsedSeconds: Math.round((Date.now() - job.startedAt) / 1000),
    updatedAt: new Date(job.updatedAt || job.startedAt).toISOString(),
    error: job.error,
  };
  // The last thing that went wrong on a job that is NOT terminal. `error` is
  // what the LMS reads as "this is over"; a produce that failed to start puts the
  // job back to `written` (the script is fine), and until this field existed
  // that page could not say why the button had done nothing.
  if (job.lastError) out.lastError = job.lastError;
  if (includeScript && job.script) out.script = job.script;
  if (job.produce) out.produce = job.produce;

  /**
   * The catalogue key, so the two APIs stop being islands.
   *
   * A finished job knew its YouTube URL but not the slug its checkpoints are
   * filed under; a catalogue entry knew its checkpoints but not the playable
   * URL. A person bridged them by eye. Both halves are already in this record --
   * `itemId` IS `<series>/<slug>` -- so this is a projection, not a lookup.
   */
  if (job.script && job.script.itemId) {
    const [series, slug] = String(job.script.itemId).split('/');
    out.catalogue = {
      videoId: slug || null,
      path: job.script.itemId,
      series: series || null,
      checkpointsUrl: `${baseUrl}/api/v1/videos/${encodeURIComponent(slug || '')}/checkpoints`,
    };
  }
  return out;
}

/** One owner's jobs, oldest transition first. */
function listFor(owner, query = {}, opts = {}) {
  return store(opts).list({ ownerId: owner ? owner.id : null, ...query });
}

/**
 * Reconcile what the last process left behind.
 *
 * A job found `running` or `publishing` had its promise die with that process;
 * nothing will ever move it, so calling it failed is the truth.
 *
 * `producing` gets its own status rather than `failed`. That run may have spent
 * a dollar fifty and finished the render before the container stopped -- the
 * artifacts are on disk and the spine's own run state may allow a resume.
 * Reporting a finished-but-unpublished video as a failure is the expensive lie.
 */
function restore(opts = {}) {
  const s = store(opts);
  const out = { loaded: 0, interrupted: 0, failed: 0 };
  for (const j of s.all()) {
    out.loaded++;
    if (!IN_FLIGHT.has(j.status)) continue;
    if (j.status === 'producing') {
      s.patch(j.id, (job) => {
        job.status = 'interrupted';
        job.resumable = true;
        job.error = 'the server restarted while this was being produced; '
          + 'the render may have finished and the spend may have happened';
        return job;
      });
      out.interrupted++;
    } else {
      s.patch(j.id, (job) => {
        job.status = 'failed';
        job.error = `interrupted by a server restart while ${j.status}`;
        return job;
      });
      out.failed++;
    }
  }
  return out;
}

module.exports = {
  create, get, transition, claim, toPublic, listFor, restore,
  resolveFinalPath, hydrateScript, materializeScript, ownerKey, ownedBy,
  TERMINAL, IN_FLIGHT, newId,
};
