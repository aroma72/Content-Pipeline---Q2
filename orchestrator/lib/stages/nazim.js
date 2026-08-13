'use strict';
/**
 * nazim -- hand the published video to NAZIM so it reaches learners, and report
 * the ILHAM recommendation as actioned.
 *
 * NOT BUILT YET (ILHAM plan 2.2 + 4.2), and it cannot be guessed at: the
 * endpoint, its auth, and which field takes the YouTube link are exactly what
 * plan item 1.2 is waiting on. Writing a plausible-looking client against an
 * unknown contract would fail at the worst possible moment -- after a video has
 * already been produced and uploaded.
 *
 * Note: .env.example still points LMS_BASE_URL at api.taleemabad.com. Plan item
 * 2.2 explicitly calls those scaffolds wrong and deletes them; do not build on
 * that base URL.
 */

const { BlockedError } = require('../spine-errors');

module.exports = {
  name: 'nazim',
  maxAttempts: 1,

  async run({ item, log }) {
    log('NAZIM bridge is not implemented yet');
    throw new BlockedError(
      `No NAZIM content-write API spec: endpoint, auth, and the field that takes ` +
      `the YouTube link are all unknown.` +
      (item.recommendationId
        ? ` Recommendation ${item.recommendationId} cannot be marked actioned either.`
        : ''),
      { blocker: 'NAZIM content-write API spec', planItem: '1.2' }
    );
  },
};
