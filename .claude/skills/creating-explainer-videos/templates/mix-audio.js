'use strict';
/*
 * mix-audio.js — assemble the full lesson audio track.
 *
 * Each beat's VO clip is delayed to its beat start (cumulative durations), all
 * clips are amix'd into a single narration track, then (if a music bed exists)
 * the bed is looped to length, quieted, and sidechain-ducked under the narration.
 * Output: 48 kHz stereo AAC-ready WAV.
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const music = require('./music');

/**
 * @param {object} o
 * @param {Array}  o.beats       beats array (for ids + order)
 * @param {object} o.durations   {id: seconds}
 * @param {string} o.audioDir    folder with vo_<id>.wav
 * @param {string} o.outPath     destination WAV
 * @returns {number} total seconds
 */
function mixAudio({ beats, durations, audioDir, outPath }) {
  const inputs = [];
  const filters = [];
  const labels = [];
  let t = 0;

  beats.forEach((b) => {
    const clip = path.join(audioDir, `vo_${b.id}.wav`);
    const dur = durations[b.id] || 0;
    if (fs.existsSync(clip)) {
      const idx = inputs.length;
      inputs.push('-i', clip);
      const ms = Math.round(t * 1000);
      const lbl = `v${idx}`;
      filters.push(`[${idx}:a]aresample=48000,adelay=${ms}|${ms},apad[${lbl}]`);
      labels.push(`[${lbl}]`);
    }
    t += dur;
  });

  const total = t;
  if (!labels.length) throw new Error('mix-audio: no VO clips found');

  // narration = amix of all delayed clips, trimmed to total
  filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0[narrmix]`);
  filters.push(`[narrmix]atrim=0:${total.toFixed(3)},asetpts=N/SR/TB[narr]`);

  const mp = music.musicPath();
  let outLabel = '[narr]';
  if (mp) {
    const midx = inputs.length;
    inputs.push('-i', mp);
    filters.push(
      `[${midx}:a]aresample=48000,aloop=loop=-1:size=2e9,atrim=0:${total.toFixed(3)},` +
      `volume=${music.musicGainDb}dB[bed]`
    );
    filters.push(
      `[bed][narr]sidechaincompress=threshold=${music.duckThreshold}:ratio=${music.duckRatio}:` +
      `attack=20:release=400[duck]`
    );
    filters.push(`[narr][duck]amix=inputs=2:normalize=0,alimiter=limit=0.95[mix]`);
    outLabel = '[mix]';
  }

  const args = ['-y', ...inputs, '-filter_complex', filters.join(';'),
    '-map', outLabel, '-ac', '2', '-ar', '48000', outPath];
  execFileSync(ffmpeg, args, { stdio: ['ignore', 'ignore', 'inherit'] });
  return total;
}

module.exports = { mixAudio };
