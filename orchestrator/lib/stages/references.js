'use strict';
/**
 * references -- two or three real things a learner could go and read next.
 *
 * Asked for by the Cohort 2 LMS on 2026-09-21, with one condition attached that
 * shapes this whole stage: "a model asked for URLs will invent them. If you build
 * this, the references need to be fetched and confirmed to resolve before they
 * are returned, or every consumer inherits a list of plausible dead links." They
 * said they would rather have two verified references than five unverified ones,
 * and would rather be told "not worth it" than shipped the unverified version.
 *
 * So this runs in three steps, and the third is the one that matters:
 *
 *   1. SEARCH  -- a real web search, API backend only (llm.askWithSearch)
 *   2. SHAPE   -- a cheap tool-free call that structures the prose it found
 *   3. VERIFY  -- every URL fetched; anything that does not resolve is dropped
 *
 * WHY THIS IS A STAGE AND NOT FOUR FIELDS ON research.js, which is where the LMS
 * suggested putting it: research runs before the script, so it knows the topic we
 * started from and not the subtopic the video actually landed on. Placed after
 * `gate`, this sees a script that has already been judged READY. It is also free
 * to fail here, which a field on research would not be.
 *
 * FAIL-SOFT, ABSOLUTELY. Nothing this stage can do may stop a lesson being built.
 * No credential, no search results, nothing survived verification, the network is
 * down, the model refused -- all of them return `{ references: [] }` and let the
 * run carry on to produce. An absent reference list costs a learner nothing; a
 * lesson that failed to build over one costs $1.50 and an instructor's afternoon.
 *
 * OFF BY DEFAULT. It runs only when the queue item carries `wantReferences`,
 * which /courses/build sets from the caller's `references: true`.
 */

// Required as modules, not destructured. A stage that binds `askWithSearch` at
// import time cannot be stubbed, and the tests that matter here are the ones that
// prove this stage does NOT call it -- which a test can only prove by watching the
// call it would have made.
const router = require('../llm-router');
const llm = require('../llm');
const { validateReferences } = require('../validate-references');
const { verifyAll } = require('../verify-url');

/** What the LMS renders. Their shape, unchanged. */
const SCHEMA = {
  type: 'object',
  properties: {
    references: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: "the resource's own title, as printed on the page" },
          url: { type: 'string', description: 'copied exactly from the source text, never rebuilt' },
          why: { type: 'string', description: 'one sentence on why it is worth this learner reading' },
          kind: { type: 'string', enum: ['docs', 'talk', 'paper', 'article'] },
        },
        required: ['title', 'url', 'why', 'kind'],
        additionalProperties: false,
      },
    },
  },
  required: ['references'],
  additionalProperties: false,
};

/**
 * How many survive. Three because the LMS renders them beside the video and a
 * longer list stops being a recommendation and starts being a search result.
 */
const KEEP = 3;

/** Nothing found is a normal, successful outcome. This is what it looks like. */
const NONE = (why) => ({ references: [], found: 0, verified: 0, skipped: why || null });

module.exports = {
  name: 'references',

  // One attempt. A retry would search again and buy the same answer: if the
  // search failed, the lesson is better off without references than paying twice
  // to find out it still has none.
  maxAttempts: 1,

  async run({ item, state: st, artifacts, opts, log }) {
    if (!item.wantReferences) return NONE('not requested');

    if (process.env.CONTENT_REFERENCES_ENABLED === '0') {
      log('disabled by CONTENT_REFERENCES_ENABLED=0');
      return NONE('disabled');
    }

    if (opts.dryRun) {
      log('dry run: no search, no fetches');
      return NONE('dry run');
    }

    const brief = artifacts.research || {};
    const script = artifacts.script || {};

    // The SUBTOPIC the script settled on, not the topic we were handed. This is
    // the whole reason the stage sits here rather than inside research.
    const subject = script.title || item.topic;

    try {
      // ── 1 · search ──────────────────────────────────────────────────────────
      let found;
      try {
        found = await llm.askWithSearch({
          promptName: 'video_references_search',
          input: [
            `Video subject: ${subject}`,
            brief.slo ? `What the learner can do after it: ${brief.slo}` : null,
            brief.audience ? `Audience: ${brief.audience}` : null,
            brief.interpretation ? `What the video actually covers: ${brief.interpretation}` : null,
            Array.isArray(brief.key_points) && brief.key_points.length
              ? `Points it makes:\n- ${brief.key_points.join('\n- ')}`
              : null,
          ].filter(Boolean).join('\n\n'),
          maxTokens: 4000,
          maxSearches: 5,
          state: st,
          stage: 'references',
          log,
        });
      } catch (e) {
        // LlmUnavailableError lands here when there is no API credential. That is
        // the ordinary case on a CLI-only box and is not worth a warning.
        log(`no search: ${e.message}`);
        return NONE('search unavailable');
      }

      if (!found.searches) {
        // It answered without searching. Whatever it produced came out of its
        // own head, which is the failure mode this stage exists to prevent.
        log('the model answered without searching -- discarding');
        return NONE('did not search');
      }
      if (!found.text || !found.text.trim()) return NONE('search found nothing');

      // ── 2 · shape ───────────────────────────────────────────────────────────
      const shaped = await router.askJson({
        log,
        state: st,
        stage: 'references',
        promptName: 'video_references_structure',
        input: found.text,
        schema: SCHEMA,
        maxTokens: 3000,
      });

      const { references: wellFormed, dropped } = validateReferences(shaped && shaped.references);
      for (const d of dropped) log(`dropped before fetching: ${d.why}`);
      if (!wellFormed.length) return NONE('nothing well-formed');

      // ── 3 · verify ──────────────────────────────────────────────────────────
      // The condition the LMS attached. Everything above this line is a claim.
      const checks = await verifyAll(wellFormed.map((r) => r.url));
      const verified = [];
      for (let i = 0; i < wellFormed.length; i += 1) {
        const c = checks[i];
        if (!c.ok) {
          log(`dead: ${wellFormed[i].url} (${c.why})`);
          continue;
        }
        // Keep the URL we actually resolved, so the learner follows the same hops
        // we did rather than a redirect that may stop redirecting.
        verified.push({ ...wellFormed[i], url: c.finalUrl || wellFormed[i].url });
      }

      const kept = verified.slice(0, KEEP);
      log(`${kept.length} verified of ${wellFormed.length} proposed (${found.searches} search(es))`);

      return {
        references: kept,
        found: wellFormed.length,
        verified: verified.length,
        searches: found.searches,
      };
    } catch (e) {
      // Anything at all. See the header: this stage never fails a lesson.
      log(`references skipped: ${e.message}`);
      return NONE('error');
    }
  },
};
