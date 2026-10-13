'use strict';
/**
 * beats-util — the one place that knows a `checkpoint` beat is not a shot.
 *
 * A checkpoint is the in-video question, but it is NEVER drawn and NEVER spoken.
 * The learner's LMS pauses the video at that point and shows the question as a
 * popup; the payload is served from the checkpoint API, which reads the same
 * beats.js this pipeline reads (see server/lib/checkpoints.js).
 *
 *   { id: '14', mode: 'checkpoint',
 *     quiz: { stem, options: [...], answer: <0-based index>, explain } }
 *
 * Because it has no voiceover it has no duration, so it occupies zero time and
 * the pause lands exactly on the boundary between the two beats it sits between.
 * Every beat is one spoken sentence followed by a short pause, which is what
 * makes that boundary a safe place to stop — never mid-sentence.
 *
 * tts-lesson, compile-lesson and verify all render `renderable(beats)`.
 * Nothing else in the pipeline needs to know checkpoints exist.
 */

const isCheckpoint = (b) => Boolean(b) && b.mode === 'checkpoint';

/** The beats that actually become video, with any props on the array preserved. */
function renderable(beats) {
  const out = beats.filter((b) => !isCheckpoint(b));
  for (const k of Object.keys(beats)) {
    if (!/^\d+$/.test(k) && k !== 'length') out[k] = beats[k];
  }
  return out;
}

/** The checkpoint beats, each with the beat it pauses after / before. */
function checkpointsIn(beats) {
  return beats.reduce((acc, b, i) => {
    if (!isCheckpoint(b)) return acc;
    const before = beats.slice(0, i).filter((x) => !isCheckpoint(x)).pop() || null;
    const after = beats.slice(i + 1).find((x) => !isCheckpoint(x)) || null;
    acc.push({ beat: b, index: i, afterBeatId: before && before.id, beforeBeatId: after && after.id });
    return acc;
  }, []);
}

module.exports = { isCheckpoint, renderable, checkpointsIn };
