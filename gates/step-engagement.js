// gates/step-engagement.js — visual-engagement / motion-cadence gate (post-render).
// Enforces: never static longer than maxStaticSeconds (hard), and flags when the
// video goes longer than targetChangeSeconds without a visible change (advisory).
// Deterministic — samples the rendered MP4 as tiny grayscale frames and measures
// frame-to-frame change, so a 1px moving element can't fake "motion".

const config = require("./config");
const { motionSeries, durationSeconds } = require("./lib/ffmpeg");

function run({ video }) {
  const { sampleFps, changeThreshold, maxStaticSeconds, targetChangeSeconds } = config.engagement;
  const { diffs } = motionSeries(video, sampleFps);
  const dur = (() => { try { return durationSeconds(video); } catch { return null; } })();

  if (!diffs.length) {
    return {
      gate: "visual-engagement (motion)",
      pass: false,
      cost: 0,
      summary: "Could not sample frames to measure motion.",
      fixes: ["Ensure the video is a readable MP4 with a video stream."],
      rule: `no static stretch > ${maxStaticSeconds}s; visible change ~every ${targetChangeSeconds}s`,
    };
  }

  // Each diff covers a 1/fps window. A window is "static" when diff < threshold.
  const winSec = 1 / sampleFps;
  let longest = 0, longestStartIdx = 0;
  let cur = 0, curStartIdx = 0;
  const changeTimes = [];
  for (let i = 0; i < diffs.length; i++) {
    if (diffs[i] < changeThreshold) {
      if (cur === 0) curStartIdx = i;
      cur++;
      if (cur > longest) { longest = cur; longestStartIdx = curStartIdx; }
    } else {
      cur = 0;
      changeTimes.push((i + 1) * winSec); // approx time of this visible change
    }
  }
  // Longest static stretch in seconds (run of sub-threshold windows).
  const longestStaticSec = +(longest * winSec).toFixed(2);
  const longestStaticStart = +(longestStartIdx * winSec).toFixed(1);

  // Largest gap between visible changes (covers head/tail too).
  let maxGap = 0, gapStart = 0;
  let prev = 0;
  const marks = [0, ...changeTimes, (diffs.length + 1) * winSec];
  for (let i = 1; i < marks.length; i++) {
    const g = marks[i] - marks[i - 1];
    if (g > maxGap) { maxGap = g; gapStart = marks[i - 1]; }
  }
  maxGap = +maxGap.toFixed(2);

  const pass = longestStaticSec <= maxStaticSeconds;
  const fixes = [];
  if (!pass) {
    fixes.push(`Static for ${longestStaticSec}s starting ~${longestStaticStart}s — add a visible change (reveal, motion, or cut) so nothing holds longer than ${maxStaticSeconds}s.`);
  }
  if (maxGap > targetChangeSeconds) {
    fixes.push(`advisory: longest gap with no visible change is ${maxGap}s (~${gapStart.toFixed(1)}s); aim for a change at least every ${targetChangeSeconds}s.`);
  }

  return {
    gate: "visual-engagement (motion)",
    pass,
    cost: 0,
    scores: {
      longestStaticSec,
      maxGapSec: maxGap,
      changes: changeTimes.length,
      videoSec: dur ? +dur.toFixed(1) : null,
    },
    summary: pass
      ? `Lively enough — longest static ${longestStaticSec}s (≤ ${maxStaticSeconds}s), ${changeTimes.length} visible changes.`
      : `Static stretch ${longestStaticSec}s at ~${longestStaticStart}s exceeds the ${maxStaticSeconds}s ceiling.`,
    fixes,
    rule: `no static stretch > ${maxStaticSeconds}s (hard); visible change ~every ${targetChangeSeconds}s (advisory)`,
    raw: { longestStaticSec, longestStaticStart, maxGap, gapStart, changes: changeTimes.length },
  };
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
