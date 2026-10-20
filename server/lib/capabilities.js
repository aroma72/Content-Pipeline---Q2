'use strict';
/**
 * capabilities -- what THIS deployment of the single-video API can do.
 *
 * Contract 1.4. Served on every job, on /health and on GET /api/v1 so the LMS
 * can show a button only where it works, instead of guessing from a 404. Each
 * flag is read at call time (a change lands with the next container, so flip
 * it with `--skip-deploys` and run scripts/deploy.ps1 -- H55 in lessons.md), and a
 * request that uses an ability its flag has off is refused with 400
 * `capability_disabled` -- never silently ignored, so the LMS can never believe
 * a document was used when it was not.
 */

const { config } = require('./config');
const context = require('../../orchestrator/lib/context');
const options = require('../../orchestrator/lib/options');

const MAX_REVISIONS = 5;

function capabilities() {
  const mv = config.makeVideo;
  return {
    contractVersion: require('./api').CONTRACT_VERSION,
    context: Boolean(mv.contextEnabled),
    contextMaxChars: context.MAX_CHARS,
    contextMaxSources: context.MAX_SOURCES,
    contextKinds: context.KINDS,
    scriptEdit: Boolean(mv.scriptEditEnabled),
    scriptRevise: Boolean(mv.scriptReviseEnabled),
    maxRevisions: MAX_REVISIONS,
    produceScriptSha: true,
    estSeconds: true,
    estimateUsd: true,
    options: options.publicOptions(),
  };
}

module.exports = { capabilities, MAX_REVISIONS };
