// gates/lib/report.js
// Plain-text gate report. One card per gate, a final SHIP / BLOCKED line.

function bar(ch = "─", n = 60) {
  return ch.repeat(n);
}

function fmtScores(scores) {
  if (!scores) return "";
  return Object.entries(scores)
    .map(([k, v]) => `${k}=${typeof v === "object" ? v.score : v}`)
    .join("  ");
}

function card(result) {
  const icon = result.skipped ? "⏭️ " : result.pass ? "✅" : "❌";
  const status = result.skipped ? "PENDING" : result.pass ? "PASS" : "FAIL";
  const lines = [];
  lines.push(bar());
  lines.push(`${icon}  ${result.gate}  —  ${status}`);
  if (result.scores) lines.push(`   scores: ${fmtScores(result.scores)}`);
  if (result.summary) lines.push(`   ${result.summary}`);
  for (const f of result.fixes || []) lines.push(`   • fix: ${f}`);
  if (typeof result.cost === "number") lines.push(`   (model spend: $${result.cost.toFixed(4)})`);
  return lines.join("\n");
}

function render(phase, results) {
  const out = [];
  out.push("");
  out.push(bar("═"));
  out.push(`  GATE REPORT — ${phase}`);
  out.push(bar("═"));
  for (const r of results) out.push(card(r));
  out.push(bar());

  const blocking = results.filter((r) => !r.skipped && !r.pass);
  const pending = results.filter((r) => r.skipped);
  const totalCost = results.reduce((s, r) => s + (r.cost || 0), 0);

  if (blocking.length === 0) {
    out.push(`  RESULT: ✅ SHIP — ${results.length - pending.length} gate(s) passed`);
  } else {
    out.push(`  RESULT: ❌ BLOCKED — ${blocking.length} gate(s) failed: ${blocking.map((r) => r.gate).join(", ")}`);
  }
  if (pending.length) out.push(`  (pending: ${pending.map((r) => r.gate).join(", ")})`);
  out.push(`  total model spend this run: $${totalCost.toFixed(4)}`);
  out.push(bar("═"));
  return out.join("\n");
}

module.exports = { render, card };
