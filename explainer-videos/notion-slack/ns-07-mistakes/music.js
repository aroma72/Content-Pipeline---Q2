'use strict';
/*
 * music.js — background-music config for this lesson.
 *
 * Drop a royalty-free bed at  audio/music.mp3  (or set MUSIC_FILE env) and it is
 * mixed in, ducked under the voiceover. If no file is present, the lesson simply
 * renders with voiceover only (still valid). We never synthesize music.
 */
const fs = require('fs');
const path = require('path');

function musicPath() {
  const explicit = process.env.MUSIC_FILE;
  if (explicit && fs.existsSync(explicit)) return explicit;
  for (const c of ['audio/music.mp3', 'audio/music.wav', 'music.mp3']) {
    const p = path.join(process.cwd(), c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

module.exports = {
  musicPath,
  musicGainDb: -22,   // quiet bed
  duckThreshold: 0.05, // sidechain trigger
  duckRatio: 8,        // how hard VO ducks the bed
};
