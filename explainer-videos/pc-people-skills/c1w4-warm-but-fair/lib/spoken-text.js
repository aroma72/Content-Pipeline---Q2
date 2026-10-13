'use strict';
/*
 * spoken-text.js — the rules that only make sense for text a viewer HEARS.
 *
 * Pure functions, no I/O, so they can be tested without a judge, a key or a video
 * folder. That matters: this is the guard that would have saved the lesson lost on
 * 2026-09-19, and a guard nothing can test is a guard nobody trusts.
 */

/**
 * Everything a listener can actually perceive: letters, digits and word breaks.
 * Punctuation and capitalisation are invisible to the ear and are stripped.
 */
function audible(t) {
  return String(t == null ? '' : t)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Would applying this suggestion change anything a listener could hear? */
function changesNothingAudible(text, suggestion) {
  if (!suggestion) return false;
  const a = audible(text);
  return a.length > 0 && a === audible(suggestion);
}

/**
 * Demote findings that cannot matter, on lines nobody reads.
 *
 * The judge's prompt already says never to flag punctuation on spoken text. It did
 * anyway, and the run died for it: `vo: "Then he asks, have I got that right, and he
 * stops talking."` was failed as "a question but lacks a question mark". That is
 * reported speech inside a narrated sentence, and a question mark is inaudible even
 * where it belongs.
 *
 * A prompt instruction is a request; this is the enforcement. The finding is kept and
 * still reported — it is demoted to a nit, not deleted, because a judge that has
 * started flagging inaudible punctuation is itself a thing worth seeing. It simply
 * may no longer stop a build.
 *
 * @param {Array} issues            the judge's findings
 * @param {(text:string)=>string}  kindOf  'spoken' | 'shown' for a snippet
 */
function demoteInaudible(issues, kindOf) {
  return (issues || []).map((it) => {
    if (!it || it.severity !== 'error') return it;
    if (kindOf(String(it.text || '').trim()) !== 'spoken') return it;
    if (!changesNothingAudible(it.text, it.suggestion)) return it;
    return {
      ...it,
      severity: 'nit',
      demoted: true,
      problem: `${it.problem || 'flagged'} `
        + '[demoted: punctuation or case only, and this line is spoken, never shown]',
    };
  });
}

module.exports = { audible, changesNothingAudible, demoteInaudible };
