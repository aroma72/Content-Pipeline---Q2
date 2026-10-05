'use strict';
/**
 * text-fixes -- apply a copy editor's suggestion to a script without a redraft.
 *
 * WHY THIS EXISTS
 * eval-text.js returns, for every grammar error, the exact snippet and a
 * suggested replacement. Until now the only thing done with that was to hand
 * the whole finding to the model as a redraft brief: a full rewrite pass, a
 * fresh gate, a minute or more of model time, and a new script for a person to
 * read -- for "decided the problem" -> "addressed the problem". Two of those
 * rounds and a lenient pass preceded the 2026-10-05 spend on a script the
 * check had never accepted.
 *
 * A suggestion that changes a few words of one line is a string replacement.
 * This does exactly that, and nothing more:
 *   - only `error` findings (nits are advisory),
 *   - only when the snippet occurs in exactly ONE beat's `vo` or `cap`,
 *   - only when the suggestion is a small edit of the snippet, so a judge that
 *     answers with a rewritten sentence (or a different sentence) is refused.
 * Anything it declines is left for the redraft path, as before.
 *
 * Pure: takes beats and issues, returns new beats and a record of what it did.
 */

const DEFAULT_FIELDS = ['vo', 'cap'];

function words(s) {
  return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').split(/\s+/).filter(Boolean);
}

/**
 * Is `suggestion` a small edit of `text`? Measured as the number of words that
 * appear in one but not the other, against the longer of the two.
 */
function isSmallEdit(text, suggestion, { maxChanged = 3, maxRatio = 0.4 } = {}) {
  const a = words(text);
  const b = words(suggestion);
  if (!a.length || !b.length) return false;
  const longer = Math.max(a.length, b.length);
  if (b.length < a.length * 0.5 || b.length > a.length * 2) return false;
  const inA = new Map(); for (const w of a) inA.set(w, (inA.get(w) || 0) + 1);
  const inB = new Map(); for (const w of b) inB.set(w, (inB.get(w) || 0) + 1);
  let changed = 0;
  for (const [w, n] of inA) changed += Math.max(0, n - (inB.get(w) || 0));
  for (const [w, n] of inB) changed += Math.max(0, n - (inA.get(w) || 0));
  return changed <= Math.max(maxChanged, Math.floor(longer * maxRatio));
}

/**
 * @param {object[]} beats
 * @param {{text:string, severity:string, suggestion:string}[]} issues  eval-text's findings
 * @param {{fields?:string[]}} [opts]
 * @returns {{beats: object[], applied: object[], skipped: object[]}}
 */
function applySuggestions(beats, issues, { fields = DEFAULT_FIELDS } = {}) {
  const out = beats.map((b) => ({ ...b }));
  const applied = [];
  const skipped = [];

  for (const it of issues || []) {
    const text = String((it && it.text) || '').trim();
    const suggestion = String((it && it.suggestion) || '').trim();
    if (!it || it.severity !== 'error') { skipped.push({ text, why: 'not an error' }); continue; }
    if (!text || !suggestion || suggestion === text) { skipped.push({ text, why: 'no usable suggestion' }); continue; }
    if (!isSmallEdit(text, suggestion)) { skipped.push({ text, why: 'suggestion rewrites rather than corrects' }); continue; }

    // Exactly one home for this snippet, or we do not touch it.
    const homes = [];
    for (const b of out) {
      for (const f of fields) {
        if (typeof b[f] === 'string' && b[f].includes(text)) homes.push({ id: b.id, field: f });
      }
    }
    if (homes.length !== 1) { skipped.push({ text, why: homes.length ? 'snippet appears in more than one place' : 'snippet not found' }); continue; }

    const { id, field } = homes[0];
    const b = out.find((x) => x.id === id);
    const from = b[field];
    const to = from.replace(text, suggestion);
    b[field] = to;
    applied.push({ id, field, from, to, problem: it.problem || null });
  }

  return { beats: out, applied, skipped };
}

module.exports = { applySuggestions, isSmallEdit, DEFAULT_FIELDS };
