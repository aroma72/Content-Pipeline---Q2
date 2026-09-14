'use strict';
/**
 * demo-sample -- the one worked example the demo always shows.
 *
 * WHY THIS IS A FILE AND NOT A LIVE LOOKUP
 * The container keeps no disk between releases, so a video made on it is gone
 * after the next deploy. Anyone opening the demo an hour later saw an empty
 * page and reasonably concluded nothing worked. A committed example cannot
 * disappear: the script and the question live here, and the finished film lives
 * on YouTube, which outlives the container by design.
 *
 * ONE TOPIC, ONE VIDEO, ONE QUESTION -- and they are the SAME run. The script
 * below is the script of the video linked below, and the checkpoint below is the
 * question that fires inside it. A demo assembled from three different runs
 * would show the shape of the flow while quietly lying about it.
 *
 * Regenerate with:  node scripts/refresh-demo-sample.js
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'demo-sample.json');

/** The topic the demo is pinned to. Typed for you, so every run is comparable. */
const TOPIC = 'how do I handle an angry parent on the phone';

let cached = null;

/**
 * The worked example, or null when it has not been generated yet.
 * Never throws: a missing sample makes the demo plainer, not broken.
 */
function sample() {
  if (cached) return cached;
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (!raw || !raw.youtube || !raw.checkpoint) return null;
    cached = raw;
    return cached;
  } catch {
    return null;
  }
}

/**
 * The checkpoint in the exact shape GET /api/v1/videos/:id/checkpoints returns,
 * so anything the LMS builds against the sample works unchanged against a real
 * video -- same fields, same guards, same preamble.
 */
function checkpointPayload(preamble, leadSeconds) {
  const s = sample();
  if (!s) return null;
  const c = s.checkpoint;
  return {
    videoId: 'sample',
    title: s.title,
    timing: {
      trusted: true,
      relativeTo: `${s.slug}_final.mp4`,
      introOffsetSeconds: s.introOffsetSeconds,
      introOffsetSource: 'brand-constant',
      lessonSeconds: s.lessonSeconds,
      note: 'A fixed worked example, from the same run as the video it belongs to. '
        + 'atSeconds is measured from the start of the delivered file, which begins '
        + 'with the brand intro.',
    },
    checkpoints: [{
      id: 'q1',
      beatId: c.beatId,
      atSeconds: c.atSeconds,
      lessonAtSeconds: c.lessonAtSeconds,
      preamble,
      stem: c.stem,
      options: c.options.slice(),
      correctIndex: c.answer,
      explanation: c.explain,
      explanationSource: 'authored',
      rendersInVideo: false,
      pause: {
        atBeatBoundary: true,
        afterBeatId: c.afterBeatId,
        beforeBeatId: c.beforeBeatId,
        boundaryLessonSeconds: Number((c.lessonAtSeconds + leadSeconds).toFixed(3)),
        leadSeconds,
        safe: true,
      },
    }],
    deliverableOnServer: false,
    sample: true,
  };
}

module.exports = { TOPIC, sample, checkpointPayload, FILE };
