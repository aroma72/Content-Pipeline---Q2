'use strict';
/**
 * idempotency -- so a retry cannot buy the same video twice.
 *
 * A produce call takes about twenty-five minutes and answers 202 immediately,
 * but the request that starts it can still time out at an edge proxy. Retrying a
 * timed-out request is correct client behaviour; without this it bought a second
 * video, and afterwards neither side could tell that was what had happened.
 *
 * The record is written BEFORE the work is dispatched. Writing it after leaves
 * the window the whole mechanism exists to close.
 */

const crypto = require('crypto');

const MAX_KEY_LENGTH = 200;

/** The caller's key, if it is one we will accept. */
function keyOf(req) {
  const raw = String(req.get('idempotency-key') || '').trim();
  if (!raw) return null;
  if (raw.length > MAX_KEY_LENGTH) return null;
  if (!/^[A-Za-z0-9_.:-]+$/.test(raw)) return null;
  return raw;
}

function hash(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 32);
}

/**
 * What makes two produce requests "the same request".
 *
 * Only the fields that change what is bought or where it goes. Headers and
 * timing are deliberately excluded -- a retry is byte-identical in the ways that
 * matter and different in the ways that do not.
 */
function fingerprint(jobId, body) {
  const b = body || {};
  return hash(JSON.stringify({
    jobId,
    publish: Boolean(b.publish),
    by: b.by || null,
  }));
}

/**
 * Claim the key, or say what the caller should be given instead.
 * @returns {{state:'fresh'|'in_flight'|'replay'|'conflict', record?:object, scopedKey:string}}
 */
function begin(store, { tenantId, jobId, key, bodyHash }) {
  const scopedKey = hash(`${tenantId}|${jobId}|${key}`);
  const existing = store.getIdem(tenantId, scopedKey);

  if (!existing) {
    store.putIdem(tenantId, scopedKey, {
      key, jobId, tenantId, bodyHash,
      state: 'in_flight', at: new Date().toISOString(), response: null,
    });
    return { state: 'fresh', scopedKey };
  }
  if (existing.bodyHash !== bodyHash) {
    // The same key meaning two different things is a client bug, and answering
    // either one silently would hide it.
    return { state: 'conflict', record: existing, scopedKey };
  }
  if (existing.state === 'in_flight') return { state: 'in_flight', record: existing, scopedKey };
  if (existing.state === 'abandoned') {
    // `abandon()` means the first attempt never dispatched any work, so there is
    // nothing to replay -- and answering from it anyway is what happened on
    // 2026-09-25: a produce that failed in 9 ms left the key abandoned, the LMS
    // sends one stable key per video, and every later click was answered with
    // the dead attempt's 202. The button stayed inert for that video for good.
    // A retry after an abandon is a fresh claim.
    store.putIdem(tenantId, scopedKey, {
      key, jobId, tenantId, bodyHash,
      state: 'in_flight', at: new Date().toISOString(), response: null,
      reclaimedFrom: existing.at || null,
    });
    return { state: 'fresh', scopedKey, reclaimed: true };
  }
  return { state: 'replay', record: existing, scopedKey };
}

function complete(store, { tenantId, scopedKey }, { status, body }) {
  const existing = store.getIdem(tenantId, scopedKey);
  if (!existing) return false;
  store.putIdem(tenantId, scopedKey, {
    ...existing,
    state: 'done',
    completedAt: new Date().toISOString(),
    response: { status, body },
  });
  return true;
}

/** Drop the claim so a genuine retry can start the work that never began. */
function abandon(store, { tenantId, scopedKey }) {
  const existing = store.getIdem(tenantId, scopedKey);
  if (!existing) return false;
  store.putIdem(tenantId, scopedKey, { ...existing, state: 'abandoned', at: new Date().toISOString() });
  return true;
}

module.exports = { keyOf, fingerprint, begin, complete, abandon, hash, MAX_KEY_LENGTH };
