// gates/run-gates.js — one command to run the gate sequence.
//
//   PRE-RENDER (on the script):
//     node run-gates.js pre  --script <SCRIPT.md|VO_SCRIPT_EXACT.txt> [--project id]
//       -> content-lint (Step 2) -> flow/cadence (Step 3, script half)
//
//   POST-RENDER (on the MP4, engine-agnostic):
//     node run-gates.js post --video <mp4> --script <script> [--audio <mp3>]
//                            --outcome "<intended learning outcome>" [--project id] [--format "..."]
//       -> silence/pause (Step 3) -> visual-hierarchy (Step 4)
//          -> A/V sync (Step 5) -> pedagogy (Step 6) -> content-judge (Step 1)
//
//   node run-gates.js all ...   -> pre then post
//
// A video ships only when every non-skipped gate passes. Every verdict is
// appended to .beads/content_feedback.jsonl.

const { parse } = require("./lib/args");
const { render } = require("./lib/report");
const { appendVerdict } = require("./lib/feedback");

const lint = require("./step2-content-lint");
const voice = require("./step3-voice-pacing");
const visual = require("./step4-visual-hierarchy");
const engagement = require("./step-engagement");
const sync = require("./step5-sync-flow");
const pedagogy = require("./step6-pedagogy");
const judge = require("./step1-content-judge");

function persist(project, results) {
  for (const r of results) {
    if (r.skipped) continue;
    appendVerdict({
      project,
      gate: r.gate,
      outputRef: r.outputRef || "",
      pass: r.pass,
      summary: r.summary,
      rule: r.rule,
      scores: r.scores,
      fixes: r.fixes,
    });
  }
}

async function runPre(a) {
  if (!a.script) throw new Error("pre needs --script");
  const results = [];
  results.push(await lint.run({ script: a.script }));
  results.push(voice.run({ script: a.script })); // script-side cadence only (no audio yet)
  return results;
}

async function runPost(a) {
  if (!a.video) throw new Error("post needs --video");
  const results = [];
  // Order: silence/pause -> visual-hierarchy -> visual-engagement -> A/V sync -> pedagogy -> judge.
  results.push(voice.run({ audio: a.audio || a.video, script: a.script }));
  results.push(await visual.run({ video: a.video, script: a.script, frames: a.frames }));
  results.push(engagement.run({ video: a.video }));
  results.push(sync.run({ video: a.video, audio: a.audio }));
  results.push(await pedagogy.run({ script: a.script, outcome: a.outcome, videoType: a.videoType }));
  if (a.script) {
    results.push(await judge.run({ video: a.video, script: a.script, outcome: a.outcome, format: a.format }));
  }
  return results;
}

async function main() {
  const a = parse();
  const phase = (a._ || "all").toLowerCase();
  const project = a.project || "unknown";

  let results = [];
  if (phase === "pre") {
    results = await runPre(a);
    output("PRE-RENDER (script)", project, results);
  } else if (phase === "post") {
    results = await runPost(a);
    output("POST-RENDER (artifact)", project, results);
  } else if (phase === "all") {
    const pre = await runPre(a);
    output("PRE-RENDER (script)", project, pre);
    const post = await runPost(a);
    output("POST-RENDER (artifact)", project, post);
    results = [...pre, ...post];
  } else {
    throw new Error(`unknown phase "${phase}" (use pre | post | all)`);
  }

  const blocked = results.some((r) => !r.skipped && !r.pass);
  // Set exitCode and let the loop drain naturally — calling process.exit()
  // while the SDK's keep-alive socket is still closing trips a libuv assert
  // on Windows.
  process.exitCode = blocked ? 1 : 0;
}

function output(phase, project, results) {
  persist(project, results);
  console.log(render(phase, results));
}

main().catch((e) => {
  console.error("gate run error:", e.message);
  process.exitCode = 2;
});
