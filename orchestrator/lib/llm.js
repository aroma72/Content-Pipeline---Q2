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

  const text = (message.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Model returned non-JSON despite json_schema output: ${text.slice(0, 200)}`);
  }
}

module.exports = { askJson, MODEL, LlmUnavailableError };
