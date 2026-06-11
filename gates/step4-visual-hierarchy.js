// gates/step4-visual-hierarchy.js — Step 4: visual-hierarchy gate (vision LLM)
// Samples frames from the rendered MP4 and checks emphasis hierarchy + leaked
// production labels / garbled text.

const config = require("./config");
const { loadPrompt, askJSON } = require("./lib/anthropic");
const { sampleFrames } = require("./lib/ffmpeg");
const { parseScript } = require("./lib/script");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    frames: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          ts: { type: "number" },
          hierarchy: { type: "string", enum: ["ok", "inverted", "n/a", "title-card"] },
          labels: { type: "string", enum: ["ok", "leaked", "garbled", "crowded"] },
          overlap: { type: "string", enum: ["ok", "overlap"] },
          issue: { type: "string" },
        },
        required: ["ts", "hierarchy", "labels", "overlap", "issue"],
      },
    },
    fixes: { type: "array", items: { type: "string" } },
    pass: { type: "boolean" },
  },
  required: ["frames", "fixes", "pass"],
};

async function run({ video, script, frames: frameCount }) {
  const n = parseInt(frameCount, 10) || config.judge.framesSampled;
  const narration = script ? parseScript(script).narration : "(no script supplied)";
  const { frames, cleanup } = sampleFrames(video, n);
  try {
    // Label each frame with its timestamp so the model can reference it.
    const text = [
      "NARRATION CONTEXT (for judging old-vs-new contrast intent):",
      narration.slice(0, 4000),
      "",
      "Frames are attached in order with these timestamps (seconds): " +
        frames.map((f) => f.ts).join(", "),
    ].join("\n");

    const { parsed, cost } = await askJSON({
      model: config.models.vision,
      system: loadPrompt("visual-hierarchy"),
      text,
      images: frames.map((f) => ({ base64: f.base64, mediaType: "image/png" })),
      schema: SCHEMA,
      maxTokens: 2500,
    });

    const bad = parsed.frames.filter((f) => f.hierarchy === "inverted" || f.labels !== "ok" || f.overlap === "overlap");
    const pass = bad.length === 0;

    return {
      gate: "visual-hierarchy (Step 4)",
      pass,
      cost,
      scores: {
        frames: parsed.frames.length,
        inverted: parsed.frames.filter((f) => f.hierarchy === "inverted").length,
        labelIssues: parsed.frames.filter((f) => f.labels !== "ok").length,
        textOverlap: parsed.frames.filter((f) => f.overlap === "overlap").length,
      },
      summary: pass
        ? `${parsed.frames.length} frames checked — hierarchy, labels, and text-overlap clean.`
        : `${bad.length} frame(s) with issues: ` +
          bad.map((f) => `${f.ts}s ${f.hierarchy === "inverted" ? "inverted-emphasis" : f.overlap === "overlap" ? "text-overlap" : f.labels}`).join(", "),
      fixes: pass ? [] : (parsed.fixes.length ? parsed.fixes : bad.map((f) => `${f.ts}s: ${f.issue}`)),
      rule: "new/adopt behavior must visually dominate old/drop; no leaked labels/garbled text; no unintended text-over-text overlap",
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
