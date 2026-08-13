'use strict';
/**
 * The canonical description of Ali.
 *
 * WHY THIS FILE EXISTS
 * Each run was inventing Ali's appearance from scratch, so three videos produced
 * three different men with the same name: teal shirt and no beard (evals-08, the
 * published one), light blue shirt with a short beard, then a grey shirt. Within a
 * video the gate enforces consistency; across a series nothing did.
 *
 * The wording below is taken from the PUBLISHED video, not chosen afresh -- a
 * canon that contradicts the video already on YouTube would be worse than none.
 *
 * Same pattern as lib/naming.js: define the shared string once, inject it
 * everywhere, and verify rather than trust.
 */

/**
 * Injected verbatim into every art prompt featuring Ali. Deliberately covers only
 * identity -- age, skin, hair, clothing -- and never pose, expression or props,
 * which must vary beat to beat.
 */
const ALI = 'a young Pakistani man in his twenties, short black hair, warm brown skin, '
  + 'clean-shaven, wearing a simple teal collared shirt and dark trousers';

/**
 * Phrases that must appear (case-insensitively) in an art prompt describing Ali.
 * Checked rather than the whole string, so a prompt may reorder or lightly reword
 * around the canon without failing -- but it cannot change who he is.
 */
const ALI_MARKERS = ['teal', 'short black hair'];

/** Does this art prompt appear to depict Ali at all? */
function mentionsAli(art) {
  return /\bali\b/i.test(String(art || ''));
}

/**
 * @returns {string[]} canonical markers missing from an art prompt that depicts Ali.
 */
function missingAliMarkers(art) {
  const s = String(art || '').toLowerCase();
  return ALI_MARKERS.filter((m) => !s.includes(m.toLowerCase()));
}

module.exports = { ALI, ALI_MARKERS, mentionsAli, missingAliMarkers };
