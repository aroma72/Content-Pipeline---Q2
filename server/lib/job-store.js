'use strict';
/**
 * job-store -- where a job record lives, and how long it survives.
 *
 * WHAT WAS WRONG
 * Jobs lived in a module-scope Map with a per-job two-hour setTimeout started at
 * CREATION. A produce run is about twenty-five minutes and the review step waits
 * for a person, indefinitely and by design. Those two facts were in tension: the
 * waiting is the design, and the waiting is what destroyed the job. A produce
 * begun 110 minutes in lost its record at 120 while the run carried on spending.
 * The money was gone and the only handle on what it bought went with it.
 *
 * WHY A FILE PER JOB, NOT THE JSONL IDIOM USED BY queue.js
 * That idiom is right for events and wrong for this. A job is mutated on every
 * stage transition; an append-only log of a mutable object has to be folded on
 * every read and never compacts. A file per job gives an O(1) update, an atomic
 * replace, and a TTL sweep that is one unlink.
 *
 * DURABILITY IS DETECTED, NEVER CLAIMED
 * This container has no volume today. The store therefore reports what it
 * actually has -- volume, container, ephemeral or memory -- and /health shows it.
 * The resolution order ends at RAILWAY_VOLUME_MOUNT_PATH, which Railway injects
 * automatically the moment a volume is attached, so durability switches on with
 * no code change and no config edit. A store that claimed durability it did not
 * have would be the same lie this repo already refuses in api.js, where answer
 * recording returns 501 rather than accept data it would drop.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const DAY_MS = 24 * 60 * 60 * 1000;

/** Terminal states: nothing will move these again, so the short TTL applies. */
const TERMINAL = new Set(['published', 'failed', 'rejected']);

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Where the store lives, in descending order of survival.
 *
 * `RAILWAY_VOLUME_MOUNT_PATH` is the important one: it exists only when a volume
 * is attached, so this is what makes the upgrade a dashboard action rather than
 * a deploy.
 */
function resolveDir(env = process.env) {
  if (env.JOB_STORE_DIR) return { dir: env.JOB_STORE_DIR, kind: env.JOB_STORE_DURABLE === '1' ? 'volume' : 'container' };
  if (env.RAILWAY_VOLUME_MOUNT_PATH) return { dir: path.join(env.RAILWAY_VOLUME_MOUNT_PATH, 'cq-jobs'), kind: 'volume' };
  // Repo-local. Survives a crash and Railway's ON_FAILURE restart, not a deploy.
  try {
    const { PATHS } = require('../../orchestrator/lib/paths');
    if (PATHS && PATHS.repoRoot) return { dir: path.join(PATHS.repoRoot, '.jobstore'), kind: 'container' };
  } catch { /* fall through */ }
  return { dir: path.join(os.tmpdir(), 'cq-jobstore'), kind: 'ephemeral' };
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
  return d;
}

/**
 * Write a whole file or leave the old one untouched.
 *
 * Mirrors the write-then-rename in orchestrator/lib/state.js, and adds the fsync
 * that one lacks. A lost run state there costs a re-run; a lost job record here
 * costs the ownership binding of a job somebody has already paid for, and Railway
 * can stop a container between the write and the page cache reaching the disk.
 */
function writeAtomic(file, obj) {
  const tmp = `${file}.${process.pid}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(fd, JSON.stringify(obj, null, 2));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
}

function safeId(id) {
  return /^[A-Za-z0-9_-]{1,128}$/.test(String(id || '')) ? String(id) : null;
}

function open(opts = {}) {
  const env = opts.env || process.env;
  const chosen = opts.dir ? { dir: opts.dir, kind: opts.durability || 'container' } : resolveDir(env);

  let dir = chosen.dir;
  let durability = chosen.kind;
  let writable = false;
  let error = null;

  try {
    ensureDir(path.join(dir, 'jobs'));
    ensureDir(path.join(dir, 'ledger'));
    ensureDir(path.join(dir, 'idem'));
    // The course queue lives here too, so one place owns the layout and one
    // write-probe covers it.
    ensureDir(path.join(dir, 'queue'));
    // Prove it, rather than assume it: a directory can exist and be read-only.
    const probe = path.join(dir, '.write-probe');
    fs.writeFileSync(probe, String(Date.now()));
    fs.unlinkSync(probe);
    writable = true;
  } catch (e) {
    error = e.message;
    durability = 'memory';
    writable = false;
  }

  // The fallback of last resort. Keeps the service answering rather than
  // crash-looping, and says loudly what has been given up.
  const memory = new Map();

  let lastSweepAt = null;

  const jobFile = (id) => path.join(dir, 'jobs', `${id}.json`);

  const readFile = (id) => {
    try {
      return JSON.parse(fs.readFileSync(jobFile(id), 'utf8'));
    } catch { return null; }
  };

  const store = {
    dir, durability, writable, error,

    /** Is the store durable enough to record a spend against? */
    canRecordSpend() { return writable; },

    put(job) {
      const id = safeId(job && job.id);
      if (!id) throw new Error('a job needs a safe id');
      const next = { ...job, updatedAt: job.updatedAt || Date.now() };
      if (!writable) { memory.set(id, next); return next; }
      writeAtomic(jobFile(id), next);
      return next;
    },

    get(id) {
      const safe = safeId(id);
      if (!safe) return null;
      if (!writable) return memory.get(safe) || null;
      return readFile(safe);
    },

    /**
     * Read-modify-write one job. Returns the new record, or null if it is gone.
     * Single-writer by design -- numReplicas is 1 and a Railway volume cannot be
     * shared, so this needs no lock, and that assumption is written down here
     * rather than left to be rediscovered.
     */
    patch(id, fn) {
      const cur = store.get(id);
      if (!cur) return null;
      const next = fn({ ...cur });
      if (!next) return cur;
      next.updatedAt = Date.now();
      return store.put(next);
    },

    delete(id) {
      const safe = safeId(id);
      if (!safe) return false;
      if (!writable) return memory.delete(safe);
      try { fs.unlinkSync(jobFile(safe)); return true; } catch { return false; }
    },

    /** Every job, newest write last. Used by list() and sweep(). */
    all() {
      if (!writable) return [...memory.values()];
      let names = [];
      try { names = fs.readdirSync(path.join(dir, 'jobs')); } catch { return []; }
      const out = [];
      for (const n of names) {
        if (!n.endsWith('.json')) continue;          // skips a killed write's .tmp
        const j = readFile(n.slice(0, -5));
        if (j && j.id) out.push(j);
      }
      return out;
    },

    /**
     * A page of one owner's jobs.
     *
     * Ordered ASCENDING by (updatedAt, id). Ascending on purpose: a descending
     * list combined with `since` silently drops any job that transitions while
     * the caller is paging, which is the classic missed-record bug in exactly
     * this kind of poller. The cursor is a tuple comparison, never an offset.
     */
    list({ ownerId, tenantId, since, status, limit = 50, cursor } = {}) {
      const cap = Math.max(1, Math.min(200, num(limit, 50)));
      let rows = store.all();
      if (ownerId) rows = rows.filter((j) => j.ownerId === ownerId);
      if (tenantId) rows = rows.filter((j) => j.tenantId === tenantId);
      if (status) rows = rows.filter((j) => j.status === status);
      if (since) {
        const t = typeof since === 'number' ? since : Date.parse(since);
        if (Number.isFinite(t)) rows = rows.filter((j) => (j.updatedAt || 0) >= t);
      }
      rows.sort((a, b) => (a.updatedAt - b.updatedAt) || String(a.id).localeCompare(String(b.id)));

      if (cursor) {
        let c = null;
        try { c = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8')); } catch { c = null; }
        if (c && Number.isFinite(c.u)) {
          rows = rows.filter((j) => j.updatedAt > c.u
            || (j.updatedAt === c.u && String(j.id) > String(c.i)));
        }
      }

      const page = rows.slice(0, cap);
      const hasMore = rows.length > cap;
      const last = page[page.length - 1];
      return {
        jobs: page,
        hasMore,
        nextCursor: hasMore && last
          ? Buffer.from(JSON.stringify({ u: last.updatedAt, i: last.id })).toString('base64url')
          : null,
      };
    },

    /**
     * Remove what nobody will ask for again.
     *
     * The TTL runs from the LAST TRANSITION, not from creation -- that single
     * change is what stops a job evaporating mid-produce. A non-terminal job is
     * never swept on the short clock: one sitting in `producing` for a week is a
     * bug worth seeing, not something to delete quietly.
     */
    sweep(nowMs = Date.now()) {
      const ttl = num(env.JOB_STORE_TTL_DAYS, 7) * DAY_MS;
      const stuckTtl = num(env.JOB_STORE_STUCK_TTL_DAYS, 30) * DAY_MS;
      const removed = [];
      const stuck = [];
      for (const j of store.all()) {
        const age = nowMs - (j.updatedAt || j.startedAt || nowMs);
        const terminal = TERMINAL.has(j.status);
        if (terminal && age > ttl) { store.delete(j.id); removed.push(j.id); continue; }
        if (!terminal && age > stuckTtl) { store.delete(j.id); removed.push(j.id); continue; }
        if (!terminal && age > ttl) stuck.push(j.id);
      }
      lastSweepAt = nowMs;
      return { removed, stuck };
    },

    // ── ledger and idempotency share the store's durability ──────────────────

    ledgerFile(tenantId, month) {
      return path.join(dir, 'ledger', String(tenantId).replace(/[^A-Za-z0-9._-]/g, '_'), `${month}.jsonl`);
    },

    appendLedger(tenantId, entry) {
      if (!writable) return false;
      const f = store.ledgerFile(tenantId, entry.month);
      ensureDir(path.dirname(f));
      fs.appendFileSync(f, `${JSON.stringify(entry)}\n`);
      return true;
    },

    readLedger(tenantId, month) {
      if (!writable) return [];
      try {
        return fs.readFileSync(store.ledgerFile(tenantId, month), 'utf8')
          .split('\n').filter(Boolean)
          .map((l) => { try { return JSON.parse(l); } catch { return null; } })
          .filter(Boolean);
      } catch { return []; }
    },

    idemFile(tenantId, hashedKey) {
      return path.join(dir, 'idem', String(tenantId).replace(/[^A-Za-z0-9._-]/g, '_'), `${hashedKey}.json`);
    },

    getIdem(tenantId, hashedKey) {
      if (!writable) return null;
      try { return JSON.parse(fs.readFileSync(store.idemFile(tenantId, hashedKey), 'utf8')); } catch { return null; }
    },

    putIdem(tenantId, hashedKey, record) {
      if (!writable) return false;
      const f = store.idemFile(tenantId, hashedKey);
      ensureDir(path.dirname(f));
      writeAtomic(f, record);
      return true;
    },

    /** Drop idempotency records past their retention. Called by the same sweep. */
    sweepIdem(nowMs = Date.now()) {
      if (!writable) return 0;
      const ttl = num(env.IDEMPOTENCY_TTL_HOURS, 24) * 60 * 60 * 1000;
      let n = 0;
      const root = path.join(dir, 'idem');
      let tenantDirs = [];
      try { tenantDirs = fs.readdirSync(root); } catch { return 0; }
      for (const t of tenantDirs) {
        let files = [];
        try { files = fs.readdirSync(path.join(root, t)); } catch { continue; }
        for (const f of files) {
          const full = path.join(root, t, f);
          try {
            if (nowMs - fs.statSync(full).mtimeMs > ttl) { fs.unlinkSync(full); n++; }
          } catch { /* already gone */ }
        }
      }
      return n;
    },

    health() {
      const rows = store.all();
      const oldest = rows.reduce((m, j) => (m === null || j.updatedAt < m ? j.updatedAt : m), null);
      return {
        dir, durability, writable,
        jobs: rows.length,
        oldestAt: oldest ? new Date(oldest).toISOString() : null,
        lastSweepAt: lastSweepAt ? new Date(lastSweepAt).toISOString() : null,
        error,
        note: durability === 'volume'
          ? 'Jobs survive a redeploy.'
          : (durability === 'memory'
            ? 'NOT WRITABLE — jobs live in memory and die with the process; producing is refused.'
            : 'Jobs survive a restart but NOT a redeploy. Attach a Railway volume to fix.'),
      };
    },
  };

  return store;
}

/** One store per process, because one container writes it. */
let singleton = null;
function shared(opts) {
  if (!singleton) singleton = open(opts);
  return singleton;
}
function reset() { singleton = null; }

module.exports = { open, shared, reset, resolveDir, writeAtomic, TERMINAL };
