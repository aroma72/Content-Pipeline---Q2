// gates/lib/anthropic.js
// Thin wrapper over @anthropic-ai/sdk for the gates: a JSON-returning call
// (optionally with vision frames) and a per-call cost estimate.

const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");
const config = require("../config");

function loadEnvKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  // Fall back to the repo .env (KEY=value lines) so the gate runs without
  // requiring the var to be exported in the shell.
  const envPath = path.join(config.REPO_ROOT, ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*ANTHROPIC_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("ANTHROPIC_API_KEY not found (env or .env)");
}

const client = new Anthropic({ apiKey: loadEnvKey() });

function loadPrompt(name) {
  return fs.readFileSync(path.join(__dirname, "..", "prompts", `${name}.txt`), "utf8");
}

function estimateCost(model, usage) {
  const p = config.pricing[model] || config.pricing["claude-opus-4-8"];
  const inTok = usage.input_tokens || 0;
  const outTok = usage.output_tokens || 0;
  const cacheTok = usage.cache_read_input_tokens || 0;
  return (
    (inTok * p.input + outTok * p.output + cacheTok * p.cacheRead) / 1_000_000
  );
}

// imageBlocks: array of {mediaType, base64} -> Anthropic image content blocks
function toImageBlocks(images = []) {
  return images.map((img) => ({
    type: "image",
    source: { type: "base64", media_type: img.mediaType || "image/png", data: img.base64 },
  }));
}

// Calls the model and parses a single JSON object from the text response.
// schema (optional) constrains output via output_config.format.
async function askJSON({ model, system, text, images = [], schema, maxTokens = 4000 }) {
  const content = [...toImageBlocks(images), { type: "text", text }];
  const req = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content }],
  };
  if (system) req.system = system;
  if (schema) req.output_config = { format: { type: "json_schema", schema } };

  const resp = await client.messages.create(req);
  const raw = resp.content.find((b) => b.type === "text")?.text || "";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Tolerate prose around the JSON when no schema was enforced.
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(`Model did not return JSON. Got: ${raw.slice(0, 300)}`);
    parsed = JSON.parse(m[0]);
  }
  return { parsed, cost: estimateCost(model, resp.usage), usage: resp.usage };
}

module.exports = { client, loadPrompt, askJSON, estimateCost };
