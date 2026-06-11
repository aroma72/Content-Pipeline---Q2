// gates/lib/ffmpeg.js
// ffmpeg/ffprobe helpers, resolved from the bundled static binaries so the
// gates run without a system ffmpeg on PATH (matches the user's environment).

const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;

if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
  throw new Error("ffmpeg-static binary not found — run `npm install` in gates/");
}

function run(bin, args) {
  // ffmpeg writes progress to stderr; capture both, never throw on stderr text.
  return execFileSync(bin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
}

// Media duration in seconds (works for audio or video).
function durationSeconds(file) {
  const out = run(ffprobePath, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const d = parseFloat(out.trim());
  if (!isFinite(d)) throw new Error(`Could not read duration of ${file}`);
  return d;
}

// Whether the file has an audio stream, and its duration if so.
function audioInfo(file) {
  try {
    const out = run(ffprobePath, [
      "-v", "error",
      "-select_streams", "a:0",
      "-show_entries", "stream=codec_name,duration",
      "-of", "json",
      file,
    ]);
    const j = JSON.parse(out);
    const s = (j.streams || [])[0];
    return { hasAudio: !!s, codec: s?.codec_name, duration: s ? parseFloat(s.duration) : 0 };
  } catch {
    return { hasAudio: false };
  }
}

// Detect silences longer than minDb/minDur. Returns [{start,end,duration}].
function detectSilences(file, noiseDb, minDurationSec) {
  let stderr = "";
  try {
    // silencedetect prints to stderr; -f null discards the output stream.
    run(ffmpegPath, [
      "-i", file,
      "-af", `silencedetect=noise=${noiseDb}dB:d=${minDurationSec}`,
      "-f", "null",
      process.platform === "win32" ? "NUL" : "/dev/null",
    ]);
  } catch (e) {
    stderr = (e.stderr || "") + (e.stdout || "");
  }
  // execFileSync returns stdout on success; silencedetect text is on stderr,
  // which we only captured in the catch. Re-run capturing stderr explicitly.
  if (!stderr) {
    const res = require("child_process").spawnSync(ffmpegPath, [
      "-i", file,
      "-af", `silencedetect=noise=${noiseDb}dB:d=${minDurationSec}`,
      "-f", "null",
      process.platform === "win32" ? "NUL" : "/dev/null",
    ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    stderr = (res.stderr || "") + (res.stdout || "");
  }
  const silences = [];
  const re = /silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/g;
  let m;
  while ((m = re.exec(stderr)) !== null) {
    const end = parseFloat(m[1]);
    const dur = parseFloat(m[2]);
    silences.push({ start: +(end - dur).toFixed(3), end, duration: dur });
  }
  return silences;
}

// Extract `count` evenly-spaced frames as PNG; returns [{ts, base64}].
function sampleFrames(videoFile, count) {
  const dur = durationSeconds(videoFile);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gateframes-"));
  const frames = [];
  for (let i = 0; i < count; i++) {
    // Space samples away from the very edges (avoid black fade frames).
    const ts = +(((i + 0.5) / count) * dur).toFixed(3);
    const out = path.join(tmp, `f${i}.png`);
    run(ffmpegPath, ["-ss", String(ts), "-i", videoFile, "-frames:v", "1", "-q:v", "3", "-y", out]);
    if (fs.existsSync(out)) {
      frames.push({ ts, base64: fs.readFileSync(out).toString("base64") });
    }
  }
  return { frames, cleanup: () => fs.rmSync(tmp, { recursive: true, force: true }) };
}

// Sample the video at `fps` as small grayscale frames and return, for each
// consecutive pair, the FRACTION of pixels that changed meaningfully (abs gray
// diff > perPixelDelta). Fraction (not mean) is the right metric: a localized
// text reveal on a large flat background barely moves the mean, but clearly
// changes a chunk of pixels. Downscaling keeps a 1px moving element from faking
// motion (it's a negligible fraction), so the measure can't be gamed.
function motionSeries(videoFile, fps = 2, perPixelDelta = 24) {
  const W = 96, H = 54, FRAME = W * H;
  const res = require("child_process").spawnSync(
    ffmpegPath,
    ["-i", videoFile, "-vf", `fps=${fps},scale=${W}:${H},format=gray`, "-f", "rawvideo", "pipe:1"],
    { maxBuffer: 512 * 1024 * 1024 }
  );
  const buf = res.stdout;
  if (!buf || buf.length < FRAME * 2) return { diffs: [], fps };
  const n = Math.floor(buf.length / FRAME);
  const diffs = [];
  for (let i = 1; i < n; i++) {
    let changed = 0;
    const a = (i - 1) * FRAME, b = i * FRAME;
    for (let p = 0; p < FRAME; p++) if (Math.abs(buf[b + p] - buf[a + p]) > perPixelDelta) changed++;
    diffs.push(changed / FRAME); // fraction of pixels changed in this 1/fps window
  }
  return { diffs, fps };
}

module.exports = {
  ffmpegPath,
  ffprobePath,
  durationSeconds,
  audioInfo,
  detectSilences,
  sampleFrames,
  motionSeries,
};
