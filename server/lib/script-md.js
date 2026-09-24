'use strict';
/**
 * Render a script as markdown a person can read and decide on.
 *
 * WHY IT IS ITS OWN MODULE
 * This began inline in the one route that served it, for the Make a Video demo.
 * The course builder now has a script gate of its own, and an instructor deciding
 * whether to spend $1.50 on a lesson must see exactly what the demo reader sees --
 * the same beats, the same warnings, the same checkpoint. Two copies would drift,
 * and the half that drifted would be the half nobody was reading when it mattered.
 *
 * WHAT IT SHOWS, AND WHY EACH
 * The spoken line and the picture shown while it is spoken, per beat. What the
 * beat puts ON SCREEN is the half of a script that decides whether a frame is
 * worth watching, and the first version of this file omitted it entirely -- so a
 * beat that drew art and said nothing looked fine on the page and empty in the
 * video. A beat with no words on screen is called out, because that is a real
 * defect a reader can catch before a single dollar is spent.
 */

/**
 * @param {object} script  { title, slo, scenario, interpretation, gate, redrafts,
 *                           beats[], checkpoint, sha }
 * @param {object} meta    { topic, footer }
 * @returns {string} markdown
 */
function render(script, meta = {}) {
  const sc = script || {};
  const beats = sc.beats || [];
  const cp = sc.checkpoint || null;
  const L = [];

  L.push(`# ${sc.title || meta.topic || 'Script'}`, '');
  if (sc.interpretation) L.push(`> ${sc.interpretation}`, '');
  if (meta.topic) L.push(`**Topic asked:** ${meta.topic}`);
  if (sc.slo) L.push(`**Outcome:** ${sc.slo}`);
  if (sc.scenario) L.push(`**Scenario:** ${sc.scenario}`);
  L.push(`**Review:** ${sc.gate || '?'}`
    + (sc.redrafts ? ` after ${sc.redrafts} redraft${sc.redrafts > 1 ? 's' : ''}` : ' on the first pass')
    + ` · ${beats.length} beats`);
  // The fingerprint is part of what a reader is shown, because it is what they
  // hand back when they approve: an approval that does not name a script would
  // authorise whatever script happened to exist later.
  if (sc.sha) L.push(`**Script id:** \`${sc.sha}\` — quote this when you approve.`);
  L.push('', '---', '', '## The script', '');
  L.push('One beat is one spoken sentence, and the picture shown while it is spoken.', '');

  for (const b of beats) {
    if (b.mode === 'checkpoint') {
      L.push('', `**— the video pauses here (beat ${b.id}) —**`, '');
      continue;
    }
    L.push(`**${b.id}** *(${b.mode})*  ${b.vo}`);

    const onScreen = [];
    if (b.cap) onScreen.push(`caption: "${b.cap}"`);
    if (b.overlay && b.overlay.tpl) onScreen.push(`overlay: ${b.overlay.tpl}`);
    if (b.info && b.info.tpl) onScreen.push(`info: ${b.info.tpl}`);
    if (onScreen.length) {
      L.push(`    ${onScreen.join(' · ')}`);
    } else if (b.mode === 'ali' || b.mode === 'scene') {
      L.push('    ⚠ NO WORDS ON SCREEN — this beat draws art and nothing else.');
    }
    if (b.art) L.push(`    art: ${String(b.art).slice(0, 200)}`);
    L.push('');
  }

  if (cp) {
    L.push('---', '', '## The checkpoint', '');
    L.push('Never drawn, never spoken. The video pauses and the LMS shows this as a popup.', '');
    L.push(`**${cp.stem}**`, '');
    (cp.options || []).forEach((o, i) => {
      L.push(`${i === cp.answer ? '- **[correct]**' : '-'} ${o}`);
    });
    L.push('', `**Why the others are wrong:** ${cp.explain}`, '');
  }

  L.push('---', '',
    `_${meta.footer || 'Made by Content Queen for Taleemabad University'} · ${new Date().toISOString().slice(0, 10)}_`, '');

  return L.join('\n');
}

/** A safe download filename for a script. */
function filename(slug) {
  return `${String(slug || 'script').replace(/[^a-z0-9-]/gi, '-').slice(0, 60)}.md`;
}

/**
 * Pull the reader-facing shape out of a raw beats.js array.
 *
 * beats.js is the single source of truth for a lesson, so a script view is a
 * projection of it rather than a second record that can disagree with it. The
 * checkpoint is lifted out of the beat that carries it because a reader judges it
 * separately from the narration -- it is the one thing in the video that a learner
 * cannot skip.
 */
function fromBeats(beats, extra = {}) {
  const list = Array.isArray(beats) ? beats : [];
  const cpBeat = list.find((b) => b && b.mode === 'checkpoint');
  return {
    title: extra.title || null,
    slo: extra.slo || null,
    scenario: extra.scenario || null,
    interpretation: extra.interpretation || null,
    gate: extra.gate || null,
    redrafts: extra.redrafts || 0,
    sha: extra.sha || null,
    beatCount: list.length,
    beats: list.map((b) => ({
      id: b.id,
      mode: b.mode,
      vo: b.vo || null,
      cap: b.cap || null,
      art: b.art || null,
      overlay: b.overlay && b.overlay.tpl ? { tpl: b.overlay.tpl } : null,
      info: b.info && b.info.tpl ? { tpl: b.info.tpl } : null,
    })),
    checkpoint: (cpBeat && cpBeat.quiz) || null,
    checkpointAfterBeat: cpBeat ? cpBeat.id : null,
  };
}

module.exports = { render, filename, fromBeats };
