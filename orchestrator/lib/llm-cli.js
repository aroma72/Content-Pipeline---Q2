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

/**
 * The CLI's refusal to bypass permissions while running as root.
 *
 * Confirmed against the shipped binary, which carries the strings
 * "cannot be used with root", "running as root", and names all three ways of
 * asking: --dangerously-skip-permissions / --permission-mode bypassPermissions /
 * a settings defaultMode of bypassPermissions.
 */
const ROOT_PERMISSION_REFUSAL_RE = new RegExp([
  'cannot be used with root', 'running as root', 'root/sudo',
  'bypassPermissions[^\\n]{0,80}root', 'root[^\\n]{0,80}bypassPermissions',
].join('|'), 'i');

/** How an unauthenticated or credential-less `claude` CLI announces itself. */
const AUTH_FAILURE_RE = new RegExp([
  'invalid api key', 'authentication_error', 'not logged ?in', 'please run .?/login',
  'unauthorized', 'oauth token', 'no credentials', 'credit balance is too low',
  'invalid_?token', 'expired token', 'login required',
].join('|'), 'i');

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
function extractJson(text, { log = null } = {}) {
  const s = String(text);

  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : s;

  /**
   * Balanced span starting at `start`, or null if it never closes.
   *
   * A STACK of both bracket kinds, not a count of the one kind the scan began
   * with. Counting only `[` meant an array holding an UNCLOSED OBJECT still
   * "balanced": the checkpoint beat -- the only beat in the schema with a nested
   * object -- closed its quiz and never closed itself, and the beats array still
   * ended in `]`, so a genuinely mis-nested reply was reported as "complete but
   * invalid". That is the opposite diagnosis, and it sent the repair chain after
   * a problem it had no repair for. A closer that does not match the innermost
   * opener is malformed too, so that is not a balanced span either.
   */
  const spanFrom = (start) => {
    const stack = [];
    let inStr = false;
    let esc = false;
    for (let i = start; i < body.length; i++) {
      const ch = body[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{' || ch === '[') { stack.push(ch); continue; }
      if (ch === '}' || ch === ']') {
        if (!stack.length) return null;
        if (ch !== (stack[stack.length - 1] === '{' ? '}' : ']')) return null;
        stack.pop();
        if (stack.length === 0) return body.slice(start, i + 1);
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
  let balancedButInvalid = null;   // a complete span that JSON.parse rejected
  let firstUnclosed = null;        // where the first container that never closes begins
  const unclosed = [];             // starts of containers that never close, in order
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '{' && body[i] !== '[') continue;
    sawOpening = true;
    const span = spanFrom(i);
    if (!span) {
      // Only something that CONTINUES like JSON is a container worth repairing;
      // a punctuation brace in prose is not, and treating it as one would hide
      // the real JSON behind it.
      if (looksLikeJsonStart(body, i)) {
        if (firstUnclosed === null) firstUnclosed = i;
        unclosed.push(i);
      }
      continue;
    }
    // A span starting INSIDE a container that never closes is a FRAGMENT of the
    // document, not the document. The quiz object inside the beat whose brace
    // went missing parses perfectly on its own, and so does the first complete
    // beat of a truncated reply -- returning either hands the next stage a
    // one-beat "script" and a clean exit code. Not a candidate, at any length.
    if (firstUnclosed === null || i < firstUnclosed) {
      try {
        JSON.parse(span);
        if (!best || span.length > best.length) best = span;
      } catch (e) {
        // Balanced but not valid. Worth remembering: this is a DIFFERENT failure
        // from a truncated reply and needs a different fix, and reporting it as
        // truncation sent three identical retries after the wrong problem.
        if (!balancedButInvalid || span.length > balancedButInvalid.span.length) {
          balancedButInvalid = { span, error: e.message };
        }
      }
    }
    // Skip past this span -- anything nested inside it is not a better candidate.
    i += span.length - 1;
  }

  if (best) return best;

  // Applied in order and cumulatively, because a reply with one of these defects
  // usually has two. Each is deterministic and changes no CONTENT -- escaping a
  // control character and inserting a bracket the parser itself located both
  // leave every value exactly as written. The alternative is losing a
  // 12,000-character draft to one wrong character.
  //
  // closeDroppedContainers goes LAST: a dropped brace and a trailing comma
  // produce the same parser message, and the comma has to be gone first or the
  // brace pass repairs into something that still will not parse.
  const REPAIRS = [escapeControlCharsInStrings, straightenStructuralQuotes,
    dropTrailingCommas, closeDroppedContainers];

  const repair = (span) => {
    let fixed = span;
    for (const fn of REPAIRS) {
      const next = fn(fixed);
      if (next === fixed) continue;
      fixed = next;
      try {
        JSON.parse(fixed);
        return { fixed, by: fn.name, delta: fixed.length - span.length };
      } catch { /* keep repairing */ }
    }
    return null;
  };

  if (balancedButInvalid) {
    const ok = repair(balancedButInvalid.span);
    if (ok) {
      if (log) log(`repaired the reply's JSON in place (${ok.by}, ${ok.delta >= 0 ? '+' : ''}${ok.delta} chars) -- no repair call needed`);
      return ok.fixed;
    }
    throw new Error(
      `JSON in reply is complete but invalid: ${balancedButInvalid.error}. ` +
      `Near: ${nearOffset(balancedButInvalid.span, balancedButInvalid.error)}`
    );
  }

  // NOTHING BALANCED -- but that is now two different things.
  //
  // Making spanFrom honest means the dropped-brace reply no longer registers as
  // balancedButInvalid, so without this the repair chain would get no candidate
  // at all and a complete 13,000-character draft would be discarded as
  // "truncated". So an unclosed container becomes a candidate too.
  //
  // This is also where a genuinely truncated reply must still fail, and it does
  // -- not by a rule about how the text ends, but because a truncated reply is a
  // PREFIX of a valid document and a prefix can only fail AT END OF INPUT.
  // closeDroppedContainers refuses to insert anything at the end, so there is no
  // path by which a cut-short script is quietly closed and shipped at half length.
  let firstError = null;
  for (const start of unclosed.slice(0, 3)) {
    const span = body.slice(start);
    if (firstError === null) {
      try { JSON.parse(span); } catch (e) { firstError = e.message; }
    }
    const ok = repair(span);
    if (ok) {
      if (log) log(`the reply's JSON never balanced; closed ${ok.delta} dropped bracket(s) where the parser pointed -- it parsed after that, no repair call needed`);
      return ok.fixed;
    }
  }

  if (!sawOpening) throw new Error('no JSON object or array found in reply');

  // Say HOW it is unbalanced. "Unbalanced" alone cannot tell a reply that stopped
  // mid-sentence from one that is all there but mis-nested, and those need
  // opposite responses.
  const ended = unclosed.length
    ? openContainersBefore(body.slice(unclosed[0]), body.length - unclosed[0])
    : null;
  throw new Error(
    'JSON in reply is unbalanced (truncated output?)'
    + (ended ? ` -- ${ended.stack.length} container(s) still open at the end of the reply`
      + `${ended.inStr ? ', and it ends inside a string' : ''}` : '')
    + (firstError ? `. The parser said: ${firstError}` : '')
  );
}

/**
 * A typographic quote where JSON needs a straight one.
 *
 * Models emit " and " inside prose constantly, which is harmless inside a string
 * -- but one landing where a key or a string DELIMITER belongs makes the whole
 * reply unparseable, and the parser reports "Expected double-quoted property
 * name" pointing at a beat boundary that looks perfectly fine to read. Only the
 * structural positions are touched: a curly quote inside a string stays exactly
 * as the model wrote it, because it is content there.
 */
function straightenStructuralQuotes(json) {
  // After { or , a key must start; after : or [ a value may. In those positions
  // only, a curly quote is a mistake rather than prose.
  return json
    .replace(/([{,]\s*)[\u201C\u201D]/g, (m, p) => p + '"')
    .replace(/[\u201C\u201D](\s*:)/g, (m, p) => '"' + p)
    .replace(/(:\s*)[\u201C\u201D]/g, (m, p) => p + '"')
    .replace(/[\u201C\u201D](\s*[,}\]])/g, (m, p) => '"' + p);
}

/**
 * A comma before a closing brace or bracket. JSON forbids it; a model writing a
 * long array of beats produces one often enough to be worth handling. Strings
 * are tracked so a comma inside prose is never touched.
 */
function dropTrailingCommas(json) {
  let out = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (esc) { out += ch; esc = false; continue; }
    if (ch === '\\') { out += ch; esc = true; continue; }
    if (ch === '"') { out += ch; inStr = !inStr; continue; }
    if (!inStr && ch === ',') {
      // Look ahead past whitespace: a } or ] means this comma is illegal.
      let j = i + 1;
      while (j < json.length && /\s/.test(json[j])) j++;
      if (json[j] === '}' || json[j] === ']') continue;   // drop it
    }
    out += ch;
  }
  return out;
}

/**
 * Escape raw newlines, tabs and other control characters that appear INSIDE
 * JSON strings. Everything outside a string is left exactly as it was.
 */
function escapeControlCharsInStrings(json) {
  let out = '';
  let inStr = false;
  let esc = false;
  for (const ch of json) {
    if (esc) { out += ch; esc = false; continue; }
    if (ch === '\\') { out += ch; esc = true; continue; }
    if (ch === '"') { out += ch; inStr = !inStr; continue; }
    if (inStr && ch < ' ') {
      out += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch === '\t' ? '\\t'
        : '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0');
      continue;
    }
    out += ch;
  }
  return out;
}

/** The character offset a V8 JSON.parse message names, or null. */
function parseErrorPosition(message) {
  const m = /position (\d+)/.exec(String(message || ''));
  return m ? Number(m[1]) : null;
}

/**
 * The containers still open just before `at`, innermost last -- or null if the
 * text before `at` is itself mis-nested. Strings and escapes are tracked, so a
 * brace inside an art prompt is content rather than structure.
 */
function openContainersBefore(text, at) {
  const stack = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < at && i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{' || ch === '[') { stack.push(ch); continue; }
    if (ch === '}' || ch === ']') {
      if (!stack.length) return null;
      if (ch !== (stack[stack.length - 1] === '{' ? '}' : ']')) return null;
      stack.pop();
    }
  }
  return { stack, inStr };
}

/**
 * Does the text after this opener continue like JSON, or like prose?
 *
 * Prose opens braces and never closes them ("Use {curly} braces", "Note {this"),
 * and treating one of those as a container to repair would hide the real JSON
 * behind it -- the exact failure the scan in extractJson exists to avoid.
 */
function looksLikeJsonStart(body, start) {
  let i = start + 1;
  while (i < body.length && /\s/.test(body[i])) i++;
  return /^["{}[\]\-0-9]|^true|^false|^null/.test(body.slice(i, i + 5));
}

/**
 * Close a bracket the model dropped in the MIDDLE of the reply.
 *
 * Not truncation, and not a guess. Production, 2026-09-15: the model wrote the
 * mandatory checkpoint beat -- the only beat in the schema with a nested object
 * -- closed its "quiz" and never closed the beat itself, then carried on for
 * another 3,700 characters and ended cleanly with `"}]}` at stop_reason=end_turn.
 * The repair chain refuses to "guess at a missing brace", and that is right for a
 * TRUNCATED reply, where the missing structure is genuinely unknown. Here it is
 * not unknown: the parser names the exact offset, and the containers open at that
 * offset say which bracket is missing. No byte of content is added, removed or
 * reordered -- only nesting.
 *
 * The parser drives it, so the guard against truncation is exact rather than a
 * heuristic. A truncated reply is a PREFIX of a valid document, and a prefix can
 * only fail AT END OF INPUT -- so an error position inside the text proves the
 * reply is not merely cut short, and an error at the end means hands off. That is
 * what stops a half-written script being closed into a half-length video.
 */
function closeDroppedContainers(json) {
  // Four. Each pass inserts exactly one character, so this bounds the damage as
  // well as the work: more than four dropped brackets in one reply is not a slip
  // to patch, it is a reply not worth trusting.
  const MAX_INSERTS = 4;
  const closerFor = (opener) => (opener === '{' ? '}' : ']');
  let text = json;

  for (let n = 0; n < MAX_INSERTS; n++) {
    let message = null;
    try { JSON.parse(text); return text; } catch (e) { message = e.message; }

    const at = parseErrorPosition(message);
    // No position, or the parser ran out of input: TRUNCATION. Never insert here.
    if (at === null || at >= text.length) return text;

    const ch = text[at];
    const state = openContainersBefore(text, at);
    if (!state || state.inStr || !state.stack.length) return text;
    const top = state.stack[state.stack.length - 1];
    const parent = state.stack.length >= 2 ? state.stack[state.stack.length - 2] : null;
    let prev = at - 1;
    while (prev >= 0 && /\s/.test(text[prev])) prev--;

    let cut = null;
    let insert = null;
    if (/Expected double-quoted property name/.test(message)
        && (ch === '{' || ch === '[')      // a fresh value where a key was due
        && top === '{'                     // ...inside an object, so the object is unclosed
        && parent === '['                  // ...whose parent is an array, where that value IS legal
        && text[prev] === ',') {           // ...at a member boundary, not a stray `{{`
      cut = prev; insert = '}';            // the brace belongs BEFORE the separating comma
    } else if (/after property value|after array element/.test(message)
        && (ch === '}' || ch === ']')      // a closer arriving one level too early
        && parent && ch === closerFor(parent)) {   // ...and it is the PARENT's closer
      cut = at; insert = closerFor(top);   // so the innermost container was never closed
    }
    if (insert === null) return text;      // anything else: not ours to touch

    text = text.slice(0, cut) + insert + text.slice(cut);
  }
  return text;
}

/** The text around the offset a JSON.parse error names, so the fault is visible. */
function nearOffset(span, message) {
  const m = /position (\d+)/.exec(message || '');
  if (!m) return span.slice(0, 120) + '…';
  const at = Number(m[1]);
  const ch = span[at];
  // The character itself, by code point. Three failures were diagnosed by eye
  // from a window of text in which every character looked ordinary -- which is
  // exactly what a curly quote or a non-breaking space looks like.
  const named = ch === undefined ? '(end of input)'
    : `'${ch}' U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
  const window = span.slice(Math.max(0, at - 70), at + 70)
    .replace(/\n/g, '\\n').replace(/\t/g, '\\t');
  return `${named} in …${window}…`;
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

/**
 * Undo the one wrapper the model reliably adds by mistake.
 *
 * Asked for an object, it intermittently replies `[ {...} ]` -- the content
 * correct, the wrapper wrong. checkShape then rejected it as "expected an
 * object, got array" and an entire paid call was thrown away. Unwrapping a
 * single-element array costs nothing and cannot hide a real shape error: a
 * genuinely wrong reply still fails the checks below.
 */
function unwrapAccidentalArray(value, schema) {
  if (!schema || schema.type !== 'object') return value;
  if (!Array.isArray(value) || value.length !== 1) return value;
  const inner = value[0];
  if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return value;
  return inner;
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
  // Set on the repair call itself, so a malformed repair cannot start another.
  noRepair = false,
  dryRun = false,
  dryRunValue = null,
  timeoutMs = 5 * 60 * 1000,   // calls take 60-90s; a 15-min ceiling made one hang cost a quarter hour
  log = null,
  // Optional, same as the SDK backend: with a run state in hand this call's cost
  // goes on the run instead of only being printed.
  state = null,
  stage = null,
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
    const argsFor = (permissionMode) => ([
      '-p',                             // no positional prompt: it is read from stdin
      '--model', MODEL,
      '--append-system-prompt', system,
      '--allowed-tools', '',            // permission guard (does not remove the tools)
      // 3, not 1: if the model does reach for a tool despite NO_TOOLS, one wasted
      // turn should not kill the run -- it gets a chance to recover and answer.
      '--max-turns', '3',
      '--permission-mode', permissionMode,
      '--output-format', 'json',
    ]);

    try {
      res = await shell.run('claude', argsFor('bypassPermissions'), { timeoutMs, input: prompt });
    } catch (e) {
      // Claude Code refuses bypassPermissions when running as root, and exits 1
      // before reaching a model. Containers commonly run as root, so the same
      // command that works on a laptop fails in deployment -- which is exactly
      // how every Slack video came to die in `research`.
      //
      // Dropping to the default mode is safe HERE specifically because
      // `--allowed-tools ''` already permits no tools: there is nothing left for
      // a permission prompt to ask about. The right fix is IS_SANDBOX=1 (set in
      // the Dockerfile); this is the belt to that pair of braces, so the same
      // deployment mistake degrades instead of failing.
      if (!ROOT_PERMISSION_REFUSAL_RE.test(e.message)) throw e;
      if (log) log('claude CLI refused bypassPermissions (running as root?) -- retrying with the default permission mode');
      res = await shell.run('claude', argsFor('default'), { timeoutMs, input: prompt });
    }
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

    // The binary is present but has no usable credential. This is NOT transient and
    // retrying burns all three attempts on it, so it must be an LlmUnavailableError
    // -- which is also what lets the router fall back to an API key.
    //
    // isAvailable() only runs `claude --version`, which succeeds on a bare install,
    // so an unauthenticated CLI looks perfectly healthy right up to the first real
    // call. In a container that is the normal state: the Dockerfile installs the
    // CLI and expects CLAUDE_CODE_OAUTH_TOKEN to authenticate it.
    if (AUTH_FAILURE_RE.test(e.message)) {
      throw new LlmUnavailableError(
        'The `claude` CLI is installed but has no usable credential, so the thinking ' +
        'stages cannot run. Set CLAUDE_CODE_OAUTH_TOKEN (generate one with ' +
        '`claude setup-token`) to use the Claude Code subscription, or set a valid ' +
        'ANTHROPIC_API_KEY to use the direct-API backend instead. ' +
        `CLI said: ${String(e.message).split('\n').slice(-2).join(' ').slice(0, 200)}`
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

  // The envelope's own figure, per call -- each askJson spawns a fresh `claude -p`
  // session, so it is this call's cost and not a running total. It was logged and
  // discarded, which is why research, script, gate and qa spend never appeared in
  // any lesson's cost. Best-effort: accounting must not fail a run.
  if (state && typeof envelope.total_cost_usd === 'number' && envelope.total_cost_usd > 0) {
    try {
      const u = envelope.usage || {};
      require('./state').recordSpend(state, {
        stage: stage || 'llm',
        kind: 'model',
        usd: Number(envelope.total_cost_usd.toFixed(4)),
        detail: `${MODEL} via claude -p: ${u.input_tokens || 0} in / ${u.output_tokens || 0} out`,
      });
    } catch (e) {
      if (log) log(`could not record model spend: ${e.message}`);
    }
  }

  // On a parse failure, say how much came back and how it ended. "Unbalanced JSON"
  // alone cannot distinguish a truncated reply from a chatty one, and those need
  // opposite fixes (shorter requested output vs. firmer formatting instruction).
  let parsed;
  let parseError = null;
  try {
    parsed = JSON.parse(extractJson(envelope.result, { log }));
  } catch (e) {
    parseError = e;
  }

  // ONE repair call before giving up on the draft.
  //
  // The deterministic repairs handle what can be fixed without guessing: control
  // characters, curly quotes in structural positions, trailing commas. They
  // cannot handle a MISSING BRACE and must not try -- inserting structure invents
  // content that was never sent. But the model that dropped the brace can put it
  // back, with the draft in front of it.
  //
  // Measured before this existed: three stage attempts, three fresh drafts, three
  // different structural slips, and a run that never reached the gate. A 12,000
  // character script is now recovered for the price of one short call rather than
  // rewritten from nothing.
  if (parseError && !noRepair) {
    try {
      if (log) log('reply was not valid JSON -- asking for it back, corrected');
      const fixed = await askJson({
        log: null,
        // The repair is a second paid call. Carrying the run state means it is
        // counted; without this it was an envelope thrown away in silence.
        state,
        stage,
        promptName: 'json_repair',
        input: [
          'The JSON below is malformed. Return it corrected and nothing else.',
          '',
          `The parser said: ${parseError.message}`,
          '',
          'Change only what is required to make it parse -- do not reword any value,',
          'do not add or remove any field, do not summarise. Return the whole',
          'corrected JSON.',
          '',
          String(envelope.result || '').slice(0, 60000),
        ].join('\n'),
        schema,
        maxTokens,
        timeoutMs,
        // No repair-of-the-repair: one call, then the original error stands.
        noRepair: true,
      });
      if (log) log('the corrected reply parsed');
      return fixed;
    } catch (repairErr) {
      if (log) log(`repair call did not help: ${String(repairErr.message).slice(0, 140)}`);
    }
  }

  if (parseError) {
    const e = parseError;
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

  parsed = unwrapAccidentalArray(parsed, schema);
  checkShape(parsed, schema);
  return parsed;
}

module.exports = { askJson, isAvailable, extractJson, checkShape, MODEL, LlmUnavailableError };
