'use strict';
/**
 * Claude Code CLI backend for the judgement stages -- no API key required.
 *
 * WHY THIS EXISTS
 * The four thinking stages originally called the Anthropic API directly, which
 * needs ANTHROPIC_API_KEY. But nothing about generating a script requires an API
 * key: `claude -p` runs the same models under the subscription login already on
 * this machine. Shelling out to it removes a credential the project does not
 * otherwise need, and the work is covered by the existing plan instead of billed
 * per token.
 *
 * SAFETY
 * These calls generate text. They must not touch the filesystem, the network, or
 * spawn anything -- the orchestrator does all of that itself, deliberately, with
 * its own guards. So every invocation passes:
 *   --allowed-tools ""     no tools at all
 *   --max-turns 1          one shot; it cannot loop
 *   --permission-mode ...  no prompts (there is no human to answer them)
 * A model that cannot call tools cannot surprise us.
 *
 * JSON
 * The CLI has no json_schema output mode, so the schema is described in the
 * prompt and the reply is parsed and structurally checked here. Anything that
 * fails to parse throws, and the stage's own retry handles it.
 */

const fs = require('fs');
const { loadPrompt } = require('./paths');
const shell = require('./shell');

// Pinned deliberately. `claude -p` with no --model uses whatever the session
// default is, which turned out to be Haiku -- fine for a smoke test, not for
// writing a lesson or judging one.
const MODEL = 'claude-opus-5';

class LlmUnavailableError extends Error {
  constructor(message) { super(message); this.name = 'LlmUnavailableError'; }
}

/** Is the CLI usable right now? */
async function isAvailable() {
  try {
    await shell.run('claude', ['--version'], { timeoutMs: 30000 });
    return true;
  } catch { return false; }
}

/**
 * Pull the first balanced JSON object or array out of a text reply.
 *
 * Needed because a model asked for JSON may still wrap it in prose or a fenced
 * block. Brace-counting rather than a regex, so nested objects survive; strings
 * and escapes are tracked so a brace inside a string cannot end the scan early.
 */
function extractJson(text) {
  const s = String(text);

  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : s;

  /** Balanced span starting at `start`, or null if it never closes. */
  const spanFrom = (start) => {
    const open = body[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < body.length; i++) {
      const ch = body[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return body.slice(start, i + 1);
      }
    }
    return null;
  };

  // Try EVERY opening bracket, not just the first.
  //
  // Taking the first one is wrong whenever the model writes prose containing a
  // brace before the JSON ("Use {curly} braces. Here it is: {...}") -- the scan
  // then balances on the prose brace and returns garbage, or never balances and
  // reports "unbalanced" for a reply that is perfectly well formed. Keep the
  // longest span that actually parses.
  let best = null;
  let sawOpening = false;
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '{' && body[i] !== '[') continue;
    sawOpening = true;
    const span = spanFrom(i);
    if (!span) continue;
    try {
      JSON.parse(span);
      if (!best || span.length > best.length) best = span;
    } catch { /* not the JSON we want; keep looking */ }
    // Skip past this span -- anything nested inside it is not a better candidate.
    if (span) i += span.length - 1;
  }

  if (best) return best;
  if (!sawOpening) throw new Error('no JSON object or array found in reply');
  throw new Error('JSON in reply is unbalanced (truncated output?)');
}

/**
 * Tell the model not to reach for tools.
 *
 * `--allowed-tools ''` governs PERMISSION to run a tool, not whether the tool is
 * offered -- so the model still emitted a tool_use, burned the single allowed
 * turn, and the run died with error_max_turns. Measured: with this instruction the
 * same request completes in one turn with no tool call. The flags stay as
 * defence-in-depth; this is what actually prevents the attempt.
 */
const NO_TOOLS = [
  'IMPORTANT: Do not use any tools. Do not read, write, or search files, and do not',
  'run commands or fetch anything. Everything you need is in this message. If you',
  'cannot determine something from the text provided, say so inside your JSON reply',
  'rather than trying to look it up.',
].join('\n');

/** Describe the schema for the prompt, since the CLI cannot enforce one. */
function schemaInstruction(schema) {
  return [
    'Reply with a single JSON value and NOTHING else -- no prose before or after,',
    'no markdown fence, no explanation. It must validate against this JSON Schema:',
    '',
    JSON.stringify(schema, null, 2),
  ].join('\n');
}

/** Reject a reply that parsed but is the wrong shape, before a stage trusts it. */
function checkShape(value, schema) {
  if (!schema || !schema.type) return;
  const actual = Array.isArray(value) ? 'array' : typeof value;
  const want = schema.type === 'integer' ? 'number' : schema.type;
  if (want === 'object' && actual !== 'object') throw new Error(`expected an object, got ${actual}`);
  if (want === 'array' && actual !== 'array') throw new Error(`expected an array, got ${actual}`);
  if (schema.type === 'object' && Array.isArray(schema.required)) {
    const missing = schema.required.filter((k) => !(k in value));
    if (missing.length) throw new Error(`reply is missing required field(s): ${missing.join(', ')}`);
  }
}

/**
 * Same signature as lib/llm.js askJson, so stages are backend-agnostic.
 */
async function askJson({
  promptName,
  input,
  schema,
  maxTokens = 8000,   // accepted for interface parity; the CLI has no output cap flag
  dryRun = false,
  dryRunValue = null,
  timeoutMs = 5 * 60 * 1000,   // calls take 60-90s; a 15-min ceiling made one hang cost a quarter hour
  log = null,
}) {
  if (dryRun) return { dryRun: true, ...(dryRunValue || {}) };

  const system = loadPrompt(promptName);
  const prompt = [input, '', NO_TOOLS, '', schemaInstruction(schema)].join('\n');

  let res;
  try {
    // The PROMPT GOES ON STDIN, never in argv.
    //
    // Windows caps a whole command line at ~32767 characters. A redraft carrying
    // the brief plus several rounds of critique reached that ceiling and failed
    // with `spawn ENAMETOOLONG` -- deterministically, so all three retries burned
    // on it. stdin has no such limit, so prompt size stops being a failure mode.
    res = await shell.run('claude', [
      '-p',                             // no positional prompt: it is read from stdin
      '--model', MODEL,
      '--append-system-prompt', system,
      '--allowed-tools', '',            // permission guard (does not remove the tools)
      // 3, not 1: if the model does reach for a tool despite NO_TOOLS, one wasted
      // turn should not kill the run -- it gets a chance to recover and answer.
      '--max-turns', '3',
      '--permission-mode', 'bypassPermissions',
      '--output-format', 'json',
    ], { timeoutMs, input: prompt });
  } catch (e) {
    // Only claim "not installed" if it genuinely is not there. A transient spawn
    // failure (process pressure, antivirus, a momentary lock) also surfaces as
    // ENOENT on Windows, and reporting that as "install Claude Code" sent a real
    // debugging session down the wrong path for several minutes. Check, don't guess.
    // ENAMETOOLONG / E2BIG are deterministic, not transient: the arguments are too
    // long and will be exactly as long next time. Retrying wasted all three
    // attempts on it. Since the prompt now goes via stdin, hitting this means
    // something ELSE in argv grew -- say so, rather than implying a flaky launch.
    if (/ENAMETOOLONG|E2BIG/i.test(e.message)) {
      throw new LlmUnavailableError(
        `The command line is too long for the OS (${String(e.message).match(/ENAMETOOLONG|E2BIG/i)[0]}). ` +
        `The prompt is already passed on stdin, so an argument other than the prompt ` +
        `has grown past the limit -- most likely the system prompt ` +
        `(${system.length} chars from prompts/${promptName}.txt). Shorten it or move it to stdin too. ` +
        `Retrying will not help: this failure is deterministic.`
      );
    }

    if (/spawn|ENOENT/i.test(e.message)) {
      const exe = shell.resolveCommand('claude');
      const present = exe !== 'claude' && fs.existsSync(exe);
      if (!present) {
        throw new LlmUnavailableError(
          'The `claude` CLI could not be found. Install Claude Code, or set ' +
          'ANTHROPIC_API_KEY to use the direct-API backend instead.'
        );
      }
      // It exists, so this was transient -- a plain Error, which the stage retries.
      throw new Error(
        `Transient failure launching the claude CLI (it does exist at ${exe}): ` +
        `${String(e.message).split('\n')[0]}`
      );
    }
    throw e;
  }

  let envelope;
  try {
    envelope = JSON.parse(res.stdout);
  } catch {
    throw new Error(`claude -p did not return JSON: ${String(res.stdout).slice(0, 200)}`);
  }

  if (envelope.is_error) {
    throw new Error(`claude -p reported an error: ${String(envelope.result).slice(0, 300)}`);
  }
  if (envelope.subtype && envelope.subtype !== 'success') {
    // e.g. hitting the turn limit -- a truncated reply must not be parsed as good.
    throw new Error(`claude -p ended as '${envelope.subtype}' rather than success`);
  }

  if (log && typeof envelope.total_cost_usd === 'number') {
    log(`claude -p: ${MODEL}, ~$${envelope.total_cost_usd.toFixed(4)} against your plan`);
  }

  // On a parse failure, say how much came back and how it ended. "Unbalanced JSON"
  // alone cannot distinguish a truncated reply from a chatty one, and those need
  // opposite fixes (shorter requested output vs. firmer formatting instruction).
  let parsed;
  try {
    parsed = JSON.parse(extractJson(envelope.result));
  } catch (e) {
    const raw = String(envelope.result || '');
    const head = raw.slice(0, 160).replace(/\s+/g, ' ');
    const tail = raw.slice(-160).replace(/\s+/g, ' ');
    // Dump the whole reply: "unbalanced JSON" on a reply that ENDS in }]} means the
    // parser is at fault, not the model, and the tail alone cannot tell them apart.
    let dumped = '';
    try {
      const p = require('path').join(require('os').tmpdir(), `llm-reply-${Date.now()}.txt`);
      fs.writeFileSync(p, raw);
      dumped = ` Full reply saved to ${p}.`;
    } catch { /* diagnostics must never mask the original error */ }
    throw new Error(
      `${e.message} -- reply was ${raw.length} chars, ` +
      `stop_reason=${envelope.stop_reason || '?'}, turns=${envelope.num_turns || '?'}.` +
      `${dumped} Starts: ${head} ... Ends: ${tail}`
    );
  }
  checkShape(parsed, schema);
  return parsed;
}

module.exports = { askJson, isAvailable, extractJson, checkShape, MODEL, LlmUnavailableError };
