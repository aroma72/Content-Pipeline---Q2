'use strict';
/**
 * Chooses which backend answers the thinking stages.
 *
 *   cli  -- `claude -p`, using the Claude Code subscription login (DEFAULT)
 *   api  -- direct Anthropic API, needs ANTHROPIC_API_KEY
 *
 * The CLI is the default because it needs no extra credential and its usage is
 * covered by the plan already being paid for. The API path stays because it is
 * the right choice on a server with no Claude Code installed.
 *
 * Override with LLM_BACKEND=cli|api.
 */

const cli = require('./llm-cli');
const api = require('./llm');

const BACKENDS = { cli, api };

function chosenName() {
  const want = (process.env.LLM_BACKEND || '').toLowerCase();
  if (want === 'cli' || want === 'api') return want;
  return 'cli';
}

/**
 * Resolve a working backend, falling back once with a reason rather than dying.
 * Returns { name, backend, note }.
 */
async function resolve() {
  const first = chosenName();

  if (first === 'cli') {
    if (await cli.isAvailable()) return { name: 'cli', backend: cli, note: null };
    if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) {
      return { name: 'api', backend: api, note: 'claude CLI not runnable; fell back to the API key' };
    }
    throw new cli.LlmUnavailableError(
      'No way to reach a model. Either install Claude Code (so `claude -p` works) ' +
      'or set ANTHROPIC_API_KEY in .env.'
    );
  }

  // api explicitly requested
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) {
    return { name: 'api', backend: api, note: null };
  }
  if (await cli.isAvailable()) {
    return { name: 'cli', backend: cli, note: 'LLM_BACKEND=api but no key set; used the CLI instead' };
  }
  throw new cli.LlmUnavailableError('LLM_BACKEND=api but no ANTHROPIC_API_KEY, and no usable claude CLI.');
}

/**
 * Drop-in askJson that routes to whichever backend is usable.
 * Same signature as both backends, so stages never learn which one ran.
 */
async function askJson(args) {
  if (args.dryRun) return { dryRun: true, ...(args.dryRunValue || {}) };

  const { name, backend, note } = await resolve();
  if (args.log) {
    args.log(`llm backend: ${name}${note ? ` (${note})` : ''}`);
  }
  return backend.askJson(args);
}

module.exports = { askJson, resolve, chosenName, LlmUnavailableError: cli.LlmUnavailableError };
