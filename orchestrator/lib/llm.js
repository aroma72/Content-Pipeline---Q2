'use strict';
/**
 * Thin Anthropic wrapper for the judgement stages (research, script, gate, QA).
 *
 * Two project rules are enforced here rather than trusted to callers:
 *   1. System prompts are ALWAYS loaded from prompts/ -- never inlined (CLAUDE.md).
 *   2. Nothing spends money silently. In dryRun the call is skipped entirely.
 *
 * Model: claude-opus-5. Adaptive thinking is on by default on this model, and
 * `temperature`/`top_p`/`top_k` are rejected with a 400 -- so this file passes
 * none of them and steers purely through the prompt.
 */

const { loadPrompt } = require('./paths');

let Anthropic = null;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch {
  // Resolved lazily so the spine's deterministic stages still run without the SDK.
}

const MODEL = 'claude-opus-5';

/**
 * Put one model call's cost on the run.
 *
 * Best-effort and never fatal: a run must not die because accounting did. Priced
 * from the usage the response already carries, so it is a measurement rather
 * than an estimate -- but on a subscription-billed path it is what the tokens
 * would cost at API rates, not a second invoice.
 */
function recordModelSpend({ state, stage, usage, model, log }) {
  if (!state || !usage) return;
  try {
    const runState = require('./state');
    const prices = require('./prices');
    const usd = prices.costOf(model, usage);
    if (!usd) return;
    runState.recordSpend(state, {
      stage: stage || 'llm',
      kind: 'model',
      usd,
      detail: `${model}: ${usage.input_tokens || 0} in / ${usage.output_tokens || 0} out`,
    });
  } catch (e) {
    if (log) log(`could not record model spend: ${e.message}`);
  }
}

class LlmUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LlmUnavailableError';
  }
}

function client() {
  if (!Anthropic) {
    throw new LlmUnavailableError(
      '@anthropic-ai/sdk is not installed. Run `npm i @anthropic-ai/sdk` at the repo root.'
    );
  }
  // The SDK also resolves ANTHROPIC_AUTH_TOKEN and `ant auth login` profiles,
  // so absence of ANTHROPIC_API_KEY alone is not proof there are no credentials.
  const Ctor = Anthropic.default || Anthropic;
  return new Ctor();
}

/**
 * Ask Claude for a structured JSON object matching `schema`.
 *
 * @param {object} args
 *   promptName - file in prompts/ (without .txt) used as the system prompt
 *   input      - the user-turn content
 *   schema     - JSON Schema the reply must satisfy
 *   maxTokens  - output cap (streams above 16k to dodge HTTP timeouts)
 *   dryRun     - skip the call and return `dryRunValue`
 */
async function askJson({
  promptName,
  input,
  schema,
  maxTokens = 8000,
  dryRun = false,
  dryRunValue = null,
  // Optional. When a stage passes its run state, the tokens this call burns are
  // recorded against the run -- otherwise the usage the API already returned is
  // read and thrown away, which is how a lesson came to report art and speech as
  // though they were its whole cost.
  state = null,
  stage = null,
  log = null,
}) {
  if (dryRun) return { dryRun: true, ...(dryRunValue || {}) };

  const system = loadPrompt(promptName);
  const c = client();

  const params = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: input }],
    output_config: { format: { type: 'json_schema', schema } },
  };

  // Above ~16k output the SDK can hit its HTTP timeout on a non-streaming call.
  const message = maxTokens > 16000
    ? await (await c.messages.stream(params)).finalMessage()
    : await c.messages.create(params);

  if (message.stop_reason === 'refusal') {
    throw new Error(
      `Model declined the request (${(message.stop_details && message.stop_details.category) || 'unknown'})`
    );
  }

  recordModelSpend({ state, stage, usage: message.usage, model: MODEL, log });

  const text = (message.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Model returned non-JSON despite json_schema output: ${text.slice(0, 200)}`);
  }
}

/**
 * Ask with WEB SEARCH on, and get prose back rather than JSON.
 *
 * The only tool-using call in the codebase, and deliberately the only one. Every
 * other model call runs under `llm-cli.js`, which appends "do not fetch
 * anything" to the prompt and passes `--allowed-tools ''` -- because a model that
 * cannot call tools cannot surprise us.
 *
 * That rule is right, and it is exactly why this function exists separately
 * instead of a flag being added to askJson. Searching is the one job where the
 * alternative is worse: a model asked for real URLs with no way to look them up
 * invents them, fluently, every time. The choice is not "tools or no tools", it
 * is "search, or a list of plausible dead links".
 *
 * It is API-only. There is no CLI path and no fallback to one: falling back to a
 * model that cannot search would produce confident invented URLs under a
 * function whose name promises the opposite. Callers that get
 * LlmUnavailableError here are expected to return nothing, not to guess.
 *
 * No json_schema, because structured output and server tools do not reliably
 * compose. Structuring is a second, cheap, tool-free askJson call on the prose
 * this returns.
 */
async function askWithSearch({
  promptName,
  input,
  maxTokens = 4000,
  maxSearches = 5,
  allowedDomains = null,
  state = null,
  stage = null,
  log = null,
}) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new LlmUnavailableError(
      'Web search needs a direct API credential (ANTHROPIC_API_KEY). The CLI backend ' +
      'cannot search, and answering without searching would invent the URLs.'
    );
  }

  const system = loadPrompt(promptName);
  const c = client();

  const tool = { type: 'web_search_20250305', name: 'web_search', max_uses: maxSearches };
  if (allowedDomains && allowedDomains.length) tool.allowed_domains = allowedDomains;

  const message = await c.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: input }],
    tools: [tool],
  });

  if (message.stop_reason === 'refusal') {
    throw new Error(
      `Model declined the search (${(message.stop_details && message.stop_details.category) || 'unknown'})`
    );
  }

  recordModelSpend({ state, stage, usage: message.usage, model: MODEL, log });
  recordSearchSpend({ state, stage, usage: message.usage, log });

  const text = (message.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  // How many searches actually ran, so a caller can tell "searched and found
  // nothing" from "never searched" -- the two look identical in the prose and
  // mean opposite things about whether to trust an empty answer.
  const searches = (message.usage
    && message.usage.server_tool_use
    && message.usage.server_tool_use.web_search_requests) || 0;

  return { text, searches };
}

/**
 * Web search is billed per request on top of tokens, so a run that searched must
 * say so. Same best-effort contract as recordModelSpend: accounting never kills
 * a run.
 */
const WEB_SEARCH_USD_PER_REQUEST = 0.01; // $10 per 1,000 requests

function recordSearchSpend({ state, stage, usage, log }) {
  if (!state || !usage || !usage.server_tool_use) return;
  const n = usage.server_tool_use.web_search_requests || 0;
  if (!n) return;
  try {
    const runState = require('./state');
    runState.recordSpend(state, {
      stage: stage || 'llm',
      kind: 'model',
      usd: Number((n * WEB_SEARCH_USD_PER_REQUEST).toFixed(4)),
      detail: `web_search: ${n} request(s)`,
    });
  } catch (e) {
    if (log) log(`could not record search spend: ${e.message}`);
  }
}

module.exports = { askJson, askWithSearch, MODEL, LlmUnavailableError, WEB_SEARCH_USD_PER_REQUEST };
