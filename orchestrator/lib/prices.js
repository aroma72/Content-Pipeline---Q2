'use strict';
/**
 * prices -- what a model call costs, so a lesson's real cost can be stated.
 *
 * Until this existed, `spendUsd` on a run meant art + speech + animation and
 * nothing else: every model call in research, script, gate and qa was real money
 * that no total counted. That is why the service can hold two honest-looking
 * figures for the same lesson -- a measured $0.598 that is only the media, and a
 * planning figure of $1.50 that was trying to cover everything.
 *
 * Rates are per MILLION tokens, USD, from the Anthropic pricing table. Cache
 * reads are a tenth of the input rate; cache writes are 1.25x and are billed as
 * input, which is why they are listed separately rather than assumed.
 *
 * A model with no row here is priced at the default rather than at zero: an
 * unknown model is a pricing gap to notice, not a free call.
 */

const PER_MTOK = {
  'claude-opus-5':     { input: 5.0, output: 25.0, cacheRead: 0.5,  cacheWrite: 6.25 },
  'claude-opus-4-8':   { input: 5.0, output: 25.0, cacheRead: 0.5,  cacheWrite: 6.25 },
  'claude-opus-4-7':   { input: 5.0, output: 25.0, cacheRead: 0.5,  cacheWrite: 6.25 },
  'claude-sonnet-5':   { input: 2.0, output: 10.0, cacheRead: 0.2,  cacheWrite: 2.5 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0, cacheRead: 0.3,  cacheWrite: 3.75 },
  'claude-haiku-4-5':  { input: 1.0, output: 5.0,  cacheRead: 0.1,  cacheWrite: 1.25 },
};

const DEFAULT = PER_MTOK['claude-opus-5'];

/**
 * Price one call from the usage the API already returned.
 *
 * Takes the Anthropic `usage` shape verbatim (input_tokens, output_tokens,
 * cache_read_input_tokens, cache_creation_input_tokens) so callers pass the
 * response through rather than reshaping it and getting a field name wrong.
 */
function costOf(model, usage) {
  if (!usage) return 0;
  const p = PER_MTOK[model] || DEFAULT;
  const usd = ((usage.input_tokens || 0) * p.input
    + (usage.output_tokens || 0) * p.output
    + (usage.cache_read_input_tokens || 0) * p.cacheRead
    + (usage.cache_creation_input_tokens || 0) * p.cacheWrite) / 1e6;
  return Number(usd.toFixed(4));
}

/** Whether we can price this model at all, for a caller that would rather say so. */
const isPriced = (model) => Object.prototype.hasOwnProperty.call(PER_MTOK, model);

module.exports = { PER_MTOK, costOf, isPriced };
