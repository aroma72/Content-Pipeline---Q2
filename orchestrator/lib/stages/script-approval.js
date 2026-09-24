'use strict';
/**
 * script-approval -- a person reads the script BEFORE anything is bought.
 *
 * The same shape and the same rule as stages/review.js: silence is not consent,
 * the approval is granted by the caller (`opts.scriptApproved`) rather than read
 * from here, and this stage knows nothing about how a person was asked. What
 * differs is WHERE it sits. `review` protects the channel from a bad video; this
 * protects the ledger from a bad script. It runs after `gate` has machine-checked
 * the beats and before `references`, which is the first stage that costs anything
 * -- so a lesson stopped here has spent cents of model calls and no media at all.
 *
 * Why it exists (2026-09-24): the LMS's only human decision was on a finished,
 * already-paid-for video. An instructor who disliked the angle of a lesson found
 * out at ~$1.50 and half an hour rather than at ~2 minutes and a few cents.
 *
 * IT ALSO BINDS THE APPROVAL TO A SCRIPT. An approval is not a standing licence to
 * render whatever beats.js happens to be on disk later: the sha of the exact file
 * the person was shown is recorded when the run blocks and re-checked here on
 * resume. Without that check a redraft between approval and resume would silently
 * inherit the authorisation -- which is the one failure that would make this whole
 * gate theatre.
 */

const fs = require('fs');
const path = require('path');
const { BlockedError } = require('../spine-errors');
const { videoDir } = require('../paths');
const state = require('../state');
const deliverables = require('../deliverables');

/** Marker the front door matches on to know a run is waiting for a person to read it. */
const AWAITING_SCRIPT = 'awaiting script approval';

/**
 * Everything a route needs to show the script, written beside beats.js so
 * persist() can lift it onto the volume.
 *
 * `research` is the load-bearing field: stages/script.js feeds the brief straight
 * into every rewrite prompt, and it otherwise lives only in run state, which is
 * deliberately not on the volume (paths.js:36-39). A redeploy during the approval
 * pause would lose it, and one-video.js:127 warns the writer redrafts far worse
 * without it.
 */
function writeRunContext(dir, { st, item, artifacts, sha, beatCount }) {
  try {
    fs.writeFileSync(path.join(dir, 'run-context.json'), JSON.stringify({
      runId: st.runId,
      itemId: item.id,
      series: item.series,
      slug: item.slug,
      topic: item.topic,
      sha,
      beatCount,
      at: new Date().toISOString(),
      research: artifacts.research || null,
      gate: artifacts.gate || null,
      redraftFeedback: artifacts.redraftFeedback || null,
    }, null, 2));
  } catch { /* never fatal: a context file is a convenience, not the script */ }
}

module.exports = {
  name: 'script-approval',
  maxAttempts: 1,

  async run({ item, state: st, artifacts, opts, log }) {
    const script = artifacts.script || {};
    const dir = videoDir(item.series, item.slug);
    const beatsPath = script.beatsPath || path.join(dir, 'beats.js');
    const beatCount = (script.beats || []).length;

    // A dry run must still exercise the ordering, but blocking every dry run would
    // make the chain untestable -- so it passes through and says it did.
    if (opts.dryRun) {
      log('dry run -- script approval skipped (a real run stops here until approved)');
      return { approved: true, by: '(dry run)', sha: null };
    }

    const sha = deliverables.fingerprint(beatsPath);

    // Durable BEFORE the block, not after. The only reason a person can read this
    // script while the run is parked -- possibly across a redeploy -- is that these
    // kilobytes are on the volume. Same beats-only call produce.js already makes,
    // one step further left.
    writeRunContext(dir, { st, item, artifacts, sha, beatCount });
    deliverables.persist({ series: item.series, slug: item.slug, videoDir: dir, log });

    if (opts.scriptApproved) {
      const by = typeof opts.scriptApproved === 'string' ? opts.scriptApproved : 'human';

      // The approval names a script. If this is not that script, the approval does
      // not apply to it: block again rather than spend on something nobody read.
      if (opts.scriptApprovedSha && sha && opts.scriptApprovedSha !== sha) {
        throw new BlockedError(
          `${AWAITING_SCRIPT}: the script changed after it was approved. `
          + `${by} approved ${opts.scriptApprovedSha}; the script on disk is ${sha}. `
          + 'Nothing has been bought. Read the current script and approve it again.',
          {
            blocker: AWAITING_SCRIPT,
            // A LITERAL, not BLOCKED_BY.SCRIPT_APPROVAL: test-regressions.js scans
            // this source with a regex for `code: '<value>'` to prove every
            // published blocker is reachable, and a regex cannot resolve a
            // constant. review.js writes its own code the same way.
            code: 'script-approval',
            details: {
              sha, approvedSha: opts.scriptApprovedSha, stale: true, beatCount,
              title: script.title || item.topic,
            },
            // Clear the stale approval so it cannot be replayed against the new script.
            queueFields: {
              scriptSha: sha,
              scriptApproved: false,
              scriptApprovedSha: null,
              scriptStaleAt: new Date().toISOString(),
            },
          }
        );
      }

      log.always(`script approved by ${by} (${sha}) -- spending may begin`);
      state.recordIntervention(st, {
        stage: 'script-approval',
        kind: 'human_approved',
        detail: `${by} approved the script for "${item.topic}" (${sha}) before any money was spent.`,
      });
      return { approved: true, by, sha, beatsPath };
    }

    // Everything the reader needs to decide, carried on the error so the front door
    // can serve it without reaching back into run state.
    throw new BlockedError(
      `${AWAITING_SCRIPT}: the script is written and gated, and nothing has been bought yet.`,
      {
        blocker: AWAITING_SCRIPT,
        code: 'script-approval',
        details: {
          sha,
          title: script.title || item.topic,
          beatCount,
          beatsPath,
          // Where a route can read it while this run is parked -- or long over.
          durableDir: deliverables.dirFor(item.series, item.slug),
          redraftRounds: Number(st.redrafts) || 0,
        },
        queueFields: {
          scriptSha: sha,
          scriptBeatCount: beatCount,
          awaitingScriptSince: new Date().toISOString(),
        },
      }
    );
  },

  AWAITING_SCRIPT,
};
