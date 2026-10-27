'use strict';
/*
 * splice-plan.js — which seconds of a lesson to render again, and which to keep.
 *
 * A lesson is one continuous timeline with a HARD CUT at every beat boundary
 * (animation/lesson.html toggles layer opacity, no crossfade), so a beat boundary
 * is a frame boundary and a scene can be replaced without touching its
 * neighbours. This plans that replacement, purely, from the OLD timing (the
 * bare render that was reviewed) and the NEW timing (after the flagged beats
 * were re-voiced or re-drawn):
 *
 *   keep  — a run of unflagged beats, cut from the old bare mp4 by OLD start/end
 *           seconds (its length is unchanged by construction, see below)
 *   new   — a run of flagged beats, rendered fresh at NEW start/end seconds
 *           (frames in the new timeline, since the page is driven by absolute ms)
 *
 * Refuses, rather than guesses, when the plan cannot be exact: a reordered or
 * re-counted script, a beat with no old measurement, nothing flagged — and an
 * UNFLAGGED beat whose duration moved, which means the voice pin failed upstream
 * and a splice would drift. The caller then falls back to a full render.
 *
 * @returns {{ok:true, segments, ranges, totalSec}|{ok:false, why:string}}
 */
function splicePlan({ oldOrder, oldDurations, newOrder, newDurations, flaggedIds, fps = 30 }) {
  if (!Array.isArray(oldOrder) || !Array.isArray(newOrder) || !oldDurations || !newDurations) {
    return { ok: false, why: 'missing timing' };
  }
  if (oldOrder.length !== newOrder.length || oldOrder.some((id, i) => id !== newOrder[i])) {
    return { ok: false, why: 'the beat order or count changed; the whole lesson must be rendered' };
  }
  const flagged = new Set((flaggedIds || []).map(String));
  if (!flagged.size) return { ok: false, why: 'nothing flagged' };

  const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
  for (const id of newOrder) {
    const o = num(oldDurations[id]);
    const n = num(newDurations[id]);
    if (o === null) return { ok: false, why: `beat ${id} has no old duration` };
    if (n === null) return { ok: false, why: `beat ${id} has no new duration` };
    if (!flagged.has(String(id)) && Math.abs(o - n) > 0.0005) {
      return { ok: false, why: `unflagged beat ${id} changed length (${o}s -> ${n}s); the voice pin did not hold` };
    }
  }

  const frame = (sec) => Math.round(sec * fps);
  const segments = [];
  let oldT = 0;
  let newT = 0;
  for (const id of newOrder) {
    const kind = flagged.has(String(id)) ? 'new' : 'keep';
    const o = oldDurations[id];
    const n = newDurations[id];
    const last = segments[segments.length - 1];
    if (last && last.kind === kind) {
      last.ids.push(id);
      last.oldEndSec = Number((oldT + o).toFixed(3));
      last.newEndSec = Number((newT + n).toFixed(3));
    } else {
      segments.push({
        kind, ids: [id],
        oldStartSec: Number(oldT.toFixed(3)), oldEndSec: Number((oldT + o).toFixed(3)),
        newStartSec: Number(newT.toFixed(3)), newEndSec: Number((newT + n).toFixed(3)),
      });
    }
    oldT += o;
    newT += n;
  }
  for (const s of segments) {
    s.startFrame = frame(s.newStartSec);
    s.endFrame = frame(s.newEndSec);
  }
  const ranges = segments.filter((s) => s.kind === 'new')
    .map((s) => ({ startFrame: s.startFrame, endFrame: s.endFrame, ids: [...s.ids] }));
  return { ok: true, segments, ranges, totalSec: Number(newT.toFixed(3)), fps };
}

module.exports = { splicePlan };
