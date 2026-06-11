// gates/lib/feedback.js
// Append a gate verdict to .beads/content_feedback.jsonl so every gate lives
// in the same append-only feedback loop the pipeline already uses. The line
// keeps the REVIEWER_GATED schema keys (timestamp/project/step/output_ref/
// feedback/interpreted_rule/scope/status) and adds gate-specific fields.

const fs = require("fs");
const config = require("../config");

function appendVerdict({ project, gate, outputRef, pass, summary, rule, scores, fixes }) {
  const line = {
    timestamp: new Date().toISOString(),
    project: project || "unknown",
    step: `gate:${gate}`,
    output_ref: outputRef || "",
    feedback: summary || "",
    interpreted_rule: rule || "",
    scope: "this-video",
    status: pass ? "pass" : "fail",
    // gate extensions
    type: "gate_verdict",
    gate,
    pass: !!pass,
    scores: scores || null,
    fixes: fixes || [],
  };
  fs.appendFileSync(config.FEEDBACK_LOG, JSON.stringify(line) + "\n", "utf8");
  return line;
}

module.exports = { appendVerdict };
