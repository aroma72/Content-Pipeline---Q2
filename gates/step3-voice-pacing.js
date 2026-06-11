// gates/step3-voice-pacing.js — Step 3: voice / pacing gates
//   3.1  no dead-air: FAIL on any silence > maxSilenceSeconds in the final audio
//   3.3  sentence-length band + ellipsis share on the script's narration
// (3.2 — per-sentence ElevenLabs generation with intonation gaps — is a
//  GENERATION-SIDE recommendation; this gate verifies the RESULT via 3.1, and
//  the cadence target via 3.3. Targets live in config.voice.)

const config = require("./config");
const { detectSilences } = require("./lib/ffmpeg");
const { parseScript } = require("./lib/script");

function run({ audio, script }) {
  const issues = [];
  const fixes = [];

  // 3.1 — dead air scan (only if an audio track is supplied)
  let silences = [];
  if (audio) {
    silences = detectSilences(audio, config.voice.silenceNoiseDb, config.voice.maxSilenceSeconds);
    if (silences.length) {
      issues.push(`${silences.length} silence(s) > ${config.voice.maxSilenceSeconds}s`);
      for (const s of silences.slice(0, 8)) {
        fixes.push(`Dead air ${s.duration.toFixed(1)}s at ${s.start.toFixed(1)}s–${s.end.toFixed(1)}s — tighten the cut or shorten the pause (intentional beats should stay under ${config.voice.maxSilenceSeconds}s).`);
      }
    }
  }

  // 3.3 — sentence-length band + deliberate-pause share
  let cadence = null;
  if (script) {
    const { sentences, ellipsisCount } = parseScript(script);
    const lens = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
    const avg = lens.reduce((a, b) => a + b, 0) / (lens.length || 1);
    const ellipsisShare = sentences.length ? ellipsisCount / sentences.length : 0;
    cadence = { avgWords: +avg.toFixed(1), sentences: sentences.length, ellipsisShare: +ellipsisShare.toFixed(2) };

    if (avg > config.voice.maxAvgWordsPerSentence) {
      issues.push(`avg ${avg.toFixed(1)} words/sentence (> ${config.voice.maxAvgWordsPerSentence})`);
      fixes.push(`Narration drifts long (avg ${avg.toFixed(1)} words/sentence). Split sentences toward the ${config.voice.minAvgWordsPerSentence}-${config.voice.maxAvgWordsPerSentence} band so cadence stays teachable.`);
    } else if (avg < config.voice.minAvgWordsPerSentence) {
      issues.push(`avg ${avg.toFixed(1)} words/sentence (< ${config.voice.minAvgWordsPerSentence})`);
      fixes.push(`Sentences are clipped (avg ${avg.toFixed(1)} words). Combine some so it doesn't feel staccato.`);
    }
    if (ellipsisShare < config.voice.minEllipsisShare) {
      // Soft signal, not a hard fail by itself — note it as a fix suggestion.
      fixes.push(`Few deliberate "…" beats (${(ellipsisShare * 100).toFixed(0)}% of sentences). Add pause beats at emphasis points so the delivery breathes (ElevenLabs respects them).`);
    }
  }

  // Hard-fail conditions: dead air, or average outside the band.
  const pass = (!audio || silences.length === 0) &&
    (!cadence || (cadence.avgWords >= config.voice.minAvgWordsPerSentence && cadence.avgWords <= config.voice.maxAvgWordsPerSentence));

  return {
    gate: "voice/pacing (Step 3)",
    pass,
    cost: 0,
    scores: cadence ? { avgWords: cadence.avgWords, ellipsisShare: cadence.ellipsisShare, longSilences: silences.length } : { longSilences: silences.length },
    summary: pass
      ? "No dead air; cadence within band."
      : issues.join("; "),
    fixes: pass ? [] : fixes,
    rule: `no silence > ${config.voice.maxSilenceSeconds}s; avg ${config.voice.minAvgWordsPerSentence}-${config.voice.maxAvgWordsPerSentence} words/sentence`,
    raw: { silences, cadence },
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
