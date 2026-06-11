// gates/step2-content-lint.js — Step 2: content lint on the SCRIPT (pre-render)
// LLM check for rules 1,3,4,6 + deterministic scrub for rules 2 (names) and
// 5 (hard-coded model names).

const config = require("./config");
const { loadPrompt, askJSON } = require("./lib/anthropic");
const { parseScript } = require("./lib/script");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    violations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          rule: { type: "integer" },
          line: { type: "string" },
          problem: { type: "string" },
          fix: { type: "string" },
        },
        required: ["rule", "line", "problem", "fix"],
      },
    },
    rules_clean: { type: "array", items: { type: "integer" } },
    pass: { type: "boolean" },
  },
  required: ["violations", "rules_clean", "pass"],
};

function scrubDeterministic(narration) {
  const hits = [];
  const lines = narration.split(/(?<=[.!?])\s+/);
  const check = (list, rule, label) => {
    for (const term of list) {
      const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      for (const line of lines) {
        if (re.test(line)) {
          hits.push({ rule, line: line.trim(), problem: `${label}: "${term}"`, fix: rule === 2 ? "Use a generic role or second person instead of a specific name." : "Say 'a modern image/text model (e.g. …)' instead of pinning a version that will date." });
        }
      }
    }
  };
  check(config.lint.bannedNames, 2, "internal/colleague or brand name in narration");
  check(config.lint.bannedModelNames, 5, "hard-coded fast-moving model name");
  return hits;
}

async function run({ script }) {
  const { narration } = parseScript(script);

  const deterministic = scrubDeterministic(narration);

  const known = config.lint.assumedKnownTerms || [];
  const knownNote = known.length
    ? `\n\nRULE 3 CALIBRATION — the target audience already knows these terms; do NOT flag them as undefined jargon: ${known.join(", ")}.`
    : "";

  const { parsed, cost } = await askJSON({
    model: config.models.lint,
    system: loadPrompt("content-lint") + knownNote,
    text: `NARRATION:\n${narration}`,
    schema: SCHEMA,
    maxTokens: 3000,
  });

  // Defensively drop "no violation found" meta-notes the model sometimes emits
  // inside the violations array.
  const llmViolations = (parsed.violations || []).filter((v) => {
    const blob = `${v.problem || ""} ${v.fix || ""}`.toLowerCase();
    return !/no (rule \d+ )?violation/.test(blob) && !/no fix needed/.test(blob);
  });
  const violations = [...deterministic, ...llmViolations];
  const pass = violations.length === 0;

  return {
    gate: "content-lint (Step 2)",
    pass,
    cost,
    summary: pass
      ? "No banned names/model names; rules 1,3,4,6 clean."
      : `${violations.length} violation(s): rules ${[...new Set(violations.map((v) => v.rule))].sort().join(", ")}`,
    fixes: violations.map((v) => `[rule ${v.rule}] ${v.problem} → ${v.fix}  (line: "${truncate(v.line)}")`),
    rule: "no assignments, no internal names, jargon defined on first use, no bare time-phrase objects, no hard-coded model names, one metaphor per concept",
    raw: { deterministic, llm: parsed },
  };
}

function truncate(s, n = 80) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

module.exports = { run };

if (require.main === module) {
  const a = require("./lib/args").parse();
  run(a).then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
