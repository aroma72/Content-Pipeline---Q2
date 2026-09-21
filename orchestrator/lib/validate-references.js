'use strict';
/**
 * Is each reference the right shape before we spend a network round-trip on it?
 *
 * Written because the router's own validation does not go this deep. On the CLI
 * backend `checkShape` only confirms the top-level type and that required keys
 * are PRESENT -- nested array items are never inspected -- and on the API backend
 * the schema is enforced by the model rather than by us. Either way a beat-shaped
 * mistake inside `references[]` arrives unchallenged, which is exactly how
 * `validate-beats.js` came to exist for the same reason one stage earlier.
 *
 * Shape only. Whether the URL RESOLVES is verify-url.js's job, and it is the
 * expensive half, so anything malformed is dropped here first.
 */

const KINDS = new Set(['docs', 'talk', 'paper', 'article']);

/** Long enough to be a sentence, short enough not to be the article. */
const MAX_TITLE = 200;
const MAX_WHY = 300;

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Check one. Returns {ok, value, why} -- `value` is the cleaned item, so callers
 * write the normalised copy rather than the model's, whitespace and all.
 */
function validateReference(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, why: 'not an object' };
  }

  const title = str(raw.title);
  const url = str(raw.url);
  const why = str(raw.why);
  const kind = str(raw.kind).toLowerCase();

  if (!title) return { ok: false, why: 'no title' };
  if (title.length > MAX_TITLE) return { ok: false, why: 'title is not a title' };
  if (!url) return { ok: false, why: 'no url' };
  if (!why) return { ok: false, why: 'no reason to read it' };
  if (why.length > MAX_WHY) return { ok: false, why: 'the reason is an essay' };

  // An unknown kind is corrected rather than rejected: the field steers how the
  // LMS renders the row, and getting 'blog' instead of 'article' is not worth
  // throwing away a verified source over.
  const finalKind = KINDS.has(kind) ? kind : 'article';

  return { ok: true, value: { title, url, why, kind: finalKind } };
}

/**
 * Check a list, keeping the good ones and saying why each other was dropped.
 *
 * Also de-duplicates by URL. A model asked for several sources on one topic
 * returns the same canonical page twice often enough to matter, and two rows
 * pointing at the same page reads as padding.
 */
function validateReferences(raw) {
  if (!Array.isArray(raw)) return { references: [], dropped: [{ why: 'not an array' }] };

  const references = [];
  const dropped = [];
  const seen = new Set();

  for (const item of raw) {
    const r = validateReference(item);
    if (!r.ok) {
      dropped.push({ why: r.why, item });
      continue;
    }
    const key = r.value.url.replace(/\/+$/, '').toLowerCase();
    if (seen.has(key)) {
      dropped.push({ why: 'duplicate url', item });
      continue;
    }
    seen.add(key);
    references.push(r.value);
  }

  return { references, dropped };
}

module.exports = { validateReference, validateReferences, KINDS, MAX_TITLE, MAX_WHY };
