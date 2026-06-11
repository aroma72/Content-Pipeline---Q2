// gates/step6-pedagogy.js — Step 6: curriculum-calibrated pedagogy rubric.
// SKIPPED (reported PENDING, never silently passed) until the rubric in
// prompts/pedagogy-rubric.txt is adapted to the real curriculum AND
// config.pedagogy.rubricReady is flipped to true.

const config = require("./config");
const { loadPrompt, askJSON } = require("./lib/anthropic");
const { parseScript } = require("./lib/script");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    criteria: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          domain: { type: "string" },
          name: { type: "string" },
          applicable: { type: "boolean" },
          level: { type: "integer" }, // 1-4 (Not/Partially/Mostly/Fully Met); ignored when applicable=false
          evidence: { type: "string" },
        },
        required: ["domain", "name", "applicable", "level", "evidence"],
      },
    },
    fixes: { type: "array", items: { type: "string" } },
    video_type_assumed: { type: "string" },
    mean: { type: "number" },
    pass: { type: "boolean" },
  },
  required: ["criteria", "fixes", "video_type_assumed", "mean", "pass"],
};

async function run({ script, outcome, videoType }) {
  if (!config.pedagogy.rubricReady) {
    return {
      gate: "pedagogy-rubric (Step 6)",
      skipped: true,
      pass: null,
      cost: 0,
      summary: "PENDING — rubric not yet calibrated to the curriculum. Provide the curriculum + a known-good module template, adapt prompts/pedagogy-rubric.txt, then set config.pedagogy.rubricReady = true.",
      fixes: [],
      rule: "scores against a rubric ADAPTED to this curriculum (not a borrowed one)",
    };
  }

  const { narration } = parseScript(script);
  const text = [
    `VIDEO TYPE: ${videoType || "concept / delivery-only"}`,
    `INTENDED OUTCOME: ${outcome || "(infer from script)"}`,
    "",
    "Reminder: on a delivery-only / concept video, a SPOKEN REFLECTION PROMPT is a",
    "valid assessment — do NOT penalize it for lacking a committable artifact.",
    "",
    `NARRATION:\n${narration}`,
  ].join("\n");

  const { parsed, cost } = await askJSON({
    model: config.models.pedagogy,
    system: loadPrompt("pedagogy-rubric"),
    text,
    schema: SCHEMA,
    maxTokens: 2500,
  });

  // Score only applicable criteria (1-4 scale). Pass requires mean >= minMean
  // AND no applicable criterion below minFloor (a single "Not Met" blocks).
  const applicable = parsed.criteria.filter((c) => c.applicable && Number.isFinite(c.level));
  const levels = applicable.map((c) => c.level);
  const mean = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
  const minLevel = levels.length ? Math.min(...levels) : 0;
  const floorFails = applicable.filter((c) => c.level < config.pedagogy.minFloor);
  const pass = mean >= config.pedagogy.minMean && minLevel >= config.pedagogy.minFloor;

  const fixes = pass
    ? []
    : [
        ...floorFails.map((c) => `[${c.domain} ${c.name} = ${c.level}/4] ${c.evidence}`),
        ...parsed.fixes,
      ];

  return {
    gate: "pedagogy-rubric (Step 6)",
    pass,
    cost,
    scores: {
      mean: +mean.toFixed(2),
      min: minLevel,
      scored: applicable.length,
      type: parsed.video_type_assumed,
    },
    summary: `${applicable.length} applicable criteria, mean ${mean.toFixed(2)}/4 (bar ${config.pedagogy.minMean}), lowest ${minLevel}/4 (floor ${config.pedagogy.minFloor}). Assumed type: ${parsed.video_type_assumed}.`,
    fixes,
    rule: `curriculum-calibrated 8-domain rubric: mean level >= ${config.pedagogy.minMean}/4 and every applicable criterion >= ${config.pedagogy.minFloor}/4`,
    raw: parsed,
  };
}

module.exports = { run };

if (require.main === module) {
  const a = require("./lib/args").parse();
  run(a).then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
