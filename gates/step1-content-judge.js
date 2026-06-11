// gates/step1-content-judge.js  — Step 1: end-of-pipeline CONTENT JUDGE
// Judges the FINISHED artifact (mp4 + script + intended outcome) on four axes.

const config = require("./config");
const { loadPrompt, askJSON } = require("./lib/anthropic");
const { sampleFrames } = require("./lib/ffmpeg");
const { parseScript } = require("./lib/script");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    scores: {
      type: "object",
      additionalProperties: false,
      properties: {
        educational_efficacy: axis(),
        clarity: axis(),
        engagement: axis(),
        cost: axis(),
      },
      required: ["educational_efficacy", "clarity", "engagement", "cost"],
    },
    fixes: { type: "array", items: { type: "string" } },
    one_line_verdict: { type: "string" },
  },
  required: ["scores", "fixes", "one_line_verdict"],
};
function axis() {
  return {
    type: "object",
    additionalProperties: false,
    properties: { score: { type: "integer" }, evidence: { type: "string" } },
    required: ["score", "evidence"],
  };
}

async function run({ video, script, outcome, format }) {
  const { narration } = parseScript(script);
  const { frames, cleanup } = sampleFrames(video, config.judge.framesSampled);
  try {
    const text = [
      `INTENDED LEARNING OUTCOME:\n${outcome || "(not supplied — infer from script)"}`,
      `\nPRODUCTION FORMAT:\n${format || "Remotion full-motion render + ElevenLabs studio VO"}`,
      `\nNARRATION SCRIPT:\n${narration}`,
      `\nThe ${frames.length} attached frames are evenly spaced through the video.`,
    ].join("\n");

    const { parsed, cost } = await askJSON({
      model: config.models.judge,
      system: loadPrompt("content-judge"),
      text,
      images: frames.map((f) => ({ base64: f.base64, mediaType: "image/png" })),
      schema: SCHEMA,
      maxTokens: 2000,
    });

    const s = parsed.scores;
    const learning = [s.educational_efficacy.score, s.clarity.score, s.engagement.score];
    const vals = [...learning, s.cost.score];
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const learningMin = Math.min(...learning);
    const learningOk = learningMin >= config.judge.learningAxisFloor;
    const costOk = config.judge.costIsAdvisory || s.cost.score >= config.judge.learningAxisFloor;
    const pass = learningOk && costOk && mean >= config.judge.minMean;

    return {
      gate: "content-judge (Step 1)",
      pass,
      cost,
      scores: {
        efficacy: s.educational_efficacy.score,
        clarity: s.clarity.score,
        engagement: s.engagement.score,
        cost: s.cost.score,
        mean: +mean.toFixed(2),
      },
      summary: parsed.one_line_verdict,
      // When the only weak axis is cost (advisory), still surface it as a note
      // even on a pass — it's a real efficiency signal, just not a blocker.
      fixes: pass
        ? (config.judge.costIsAdvisory && s.cost.score < config.judge.learningAxisFloor
            ? [`advisory (cost ${s.cost.score}/5, non-blocking): ${s.cost.evidence}`]
            : [])
        : parsed.fixes,
      rule: `learning axes (efficacy/clarity/engagement) >= ${config.judge.learningAxisFloor} and mean(4 axes) >= ${config.judge.minMean}${config.judge.costIsAdvisory ? "; cost advisory" : ""}`,
      raw: parsed,
    };
  } finally {
    cleanup();
  }
}

module.exports = { run };

if (require.main === module) {
  const a = require("./lib/args").parse();
  run(a).then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
