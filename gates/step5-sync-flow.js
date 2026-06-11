// gates/step5-sync-flow.js — Step 5: sync + flow (deterministic, no LLM)
//   - A/V drift: |video duration - VO duration| must be within tolerance.
//     Video longer than audio  => trailing blank slides (a known failure here).
//     Video shorter than audio => VO is cut off.
//   - Frame-count sanity vs the pipeline's rule (frames = VO_seconds * 30).
// (Scene-level drift would need per-scene VO; this pipeline muxes a single VO,
//  so the robust deterministic check is whole-artifact drift. The cadence half
//  of "flow" is covered by Step 3's sentence-length band.)

const config = require("./config");
const { durationSeconds, audioInfo } = require("./lib/ffmpeg");

function run({ video, audio, fps = 30 }) {
  const videoDur = durationSeconds(video);
  const ai = audioInfo(video);

  // Prefer the muxed-in audio track; fall back to a separate audio file.
  let voDur = ai.hasAudio ? ai.duration : null;
  let voSource = ai.hasAudio ? "muxed audio stream" : null;
  if ((voDur === null || !isFinite(voDur)) && audio) {
    voDur = durationSeconds(audio);
    voSource = "separate VO file";
  }

  const fixes = [];
  const issues = [];

  if (voDur === null || !isFinite(voDur)) {
    issues.push("no audio track found in the video and no --audio supplied");
    fixes.push("Mux the VO into the MP4 (the -map flags) before this gate, or pass --audio.");
    return result(false);
  }

  const drift = +(videoDur - voDur).toFixed(2);
  const absDrift = Math.abs(drift);
  if (absDrift > config.sync.driftToleranceSeconds) {
    if (drift > 0) {
      issues.push(`video is ${drift.toFixed(2)}s LONGER than VO`);
      fixes.push(`Trailing ${drift.toFixed(2)}s of video has no narration — likely blank slides past the audio. Trim durationInFrames to VO_seconds×${fps}, or extend the VO.`);
    } else {
      issues.push(`VO is ${absDrift.toFixed(2)}s LONGER than video`);
      fixes.push(`VO is cut off by ${absDrift.toFixed(2)}s — extend the render or trim the audio tail.`);
    }
  }

  // Frame-count sanity against the pipeline rule (max +30 frames buffer = 1s).
  const expectedFrames = Math.round(voDur * fps);
  const actualFrames = Math.round(videoDur * fps);
  const frameDelta = actualFrames - expectedFrames;
  if (frameDelta > 30) {
    fixes.push(`durationInFrames ${actualFrames} exceeds VO_seconds×${fps} (${expectedFrames}) by ${frameDelta} frames — over the +30 buffer in VIDEO_PRODUCTION_RULES.`);
  }

  const pass = issues.length === 0;
  function result(p) {
    return {
      gate: "sync/flow (Step 5)",
      pass: p,
      cost: 0,
      scores: { videoSec: +videoDur.toFixed(2), voSec: +voDur?.toFixed?.(2), driftSec: isFinite(drift) ? drift : null, frameDelta: isFinite(frameDelta) ? frameDelta : null },
      summary: p
        ? `A/V aligned within ${config.sync.driftToleranceSeconds}s (video ${videoDur.toFixed(1)}s vs VO ${(+voDur).toFixed(1)}s, source: ${voSource}).`
        : issues.join("; "),
      fixes: p ? [] : fixes,
      rule: `|video - VO| <= ${config.sync.driftToleranceSeconds}s; frames within +30 of VO_seconds×${fps}`,
      raw: { videoDur, voDur, voSource, drift, expectedFrames, actualFrames, frameDelta },
    };
  }
  return result(pass);
}

module.exports = { run };

if (require.main === module) {
  const a = require("./lib/args").parse();
  try {
    console.log(JSON.stringify(run(a), null, 2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
