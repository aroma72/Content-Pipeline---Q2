'use strict';
/**
 * lesson-preview -- render a real, short video for one planned lesson.
 *
 * THE SIMPLEST THING THAT ACTUALLY WORKS
 * The full pipeline makes a 2-minute narrated lesson: generated art, a paid
 * voiceover, animation, brand bumpers, quality gates, a YouTube upload. That is
 * ~$1.50 and half an hour, and every one of its steps has an external dependency
 * that can fail -- seven did, in one afternoon.
 *
 * This does the one part that is reliable: it draws info cards with the
 * renderer and encodes them. Roughly fifteen seconds of video, made in under a
 * minute, for nothing, with no network call to anything but the page itself.
 *
 * WHAT IT IS
 *   real   the same renderer the real lessons use (headless Chrome + ffmpeg)
 *   real   the lesson's own title, outcome and check question, on screen
 *   not    no illustrations, no narration, no music, no branding
 *
 * It is a preview of the CONTENT, not a sample of the finished film. Said out
 * loud in the UI, because a silent card video is not what a learner receives.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { run } = require('../../orchestrator/lib/shell');
const { PATHS } = require('../../orchestrator/lib/paths');

const ROOT_FFMPEG = (() => {
  try { return require('ffmpeg-static'); } catch { return null; }
})();

const WORK = path.join(PATHS.explainerVideos, 'testing', 'lesson-preview');
const PUBLIC = path.join(PATHS.repoRoot, '.previews');

const log = (m) => console.log(`[preview] ${m}`);

/** Seconds a card is held. Enough to read, short enough to watch. */
const CARD = 4.5;

/**
 * Build beats.js source for one lesson: what it teaches, then the question it
 * asks. Only `info` templates, so nothing has to be illustrated.
 */
function beatsFor(lesson) {
  const q = lesson.question || {};

  /**
   * The quiz card is sized for short options. A planned lesson's options are
   * often a full sentence each, and four of those overflow 1080 -- the stem
   * clips off the top and the last option collides with the caption. Trim to
   * what the card can hold, on a word boundary, and mark it.
   *
   * A preview may shorten; it must not look broken.
   */
  const fit = (s, max) => {
    const t = String(s == null ? '' : s).trim();
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    return cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : max) + '…';
  };

  const opts = (q.options || []).slice(0, 4).map((o) => fit(o, 58));
  const esc = (s) => JSON.stringify(String(s == null ? '' : s));

  return `'use strict';
// Generated preview -- one planned lesson, drawn as cards. Not a finished video.
module.exports = [
  {
    id: '01', mode: 'info',
    vo: ${esc(lesson.title)},
    cap: 'The lesson',
    info: { tpl: 'statement', data: {
      text: ${esc(fit(lesson.title, 70))},
      sub: ${esc(fit(lesson.slo || '', 130))},
    } },
  },
  {
    id: '02', mode: 'info',
    vo: ${esc(fit(q.stem || 'Your turn.', 95))},
    cap: 'Your turn',
    info: { tpl: 'quiz', data: {
      stem: ${esc(fit(q.stem || '', 95))},
      options: ${JSON.stringify(opts)},
      note: 'Write your answer down.',
    } },
  },
  {
    id: '03', mode: 'info',
    vo: 'Here is the answer.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'The answer',
      options: ${JSON.stringify(opts)},
      answer: ${Number(q.correctIndex) || 0},
      note: ${esc(fit(q.explanation || '', 110))},
    } },
  },
];
`;
}

function copyTemplates(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '__pycache__') continue;
    const from = path.join(src, e.name);
    const to = path.join(dest, e.name);
    if (e.isDirectory()) copyTemplates(from, to);
    else if (!fs.existsSync(to)) fs.copyFileSync(from, to);
  }
}

/**
 * A per-folder `npm i` can fetch ffmpeg-static for the wrong platform -- the
 * file exists but will not execute, and the failure surfaces later as a spawn
 * with pid 0 and no stderr. Test that it RUNS.
 */
function ensureFfmpeg(dir) {
  try {
    const bin = require(require.resolve('ffmpeg-static', { paths: [dir] }));
    const probe = require('child_process').spawnSync(bin, ['-version'], { encoding: 'utf8' });
    if (probe.status !== 0 && ROOT_FFMPEG && fs.existsSync(ROOT_FFMPEG)) {
      fs.copyFileSync(ROOT_FFMPEG, bin);
      fs.chmodSync(bin, 0o755);
      log('replaced an unrunnable ffmpeg in the preview folder');
    }
  } catch { /* compile will report anything genuinely missing */ }
}

let building = false;

/**
 * Render a preview for one lesson.
 * @returns {Promise<{id:string, file:string, seconds:number}>}
 */
async function render(lesson) {
  if (!lesson || !lesson.title) {
    throw Object.assign(new Error('a lesson with a title is required'), { status: 400 });
  }
  // One render at a time: they share a working folder, and two headless Chromes
  // on one small container is how you get two slow failures instead of one video.
  if (building) {
    throw Object.assign(
      new Error('a preview is already rendering -- try again in a moment'),
      { status: 429 }
    );
  }
  building = true;
  const t0 = Date.now();

  try {
    copyTemplates(PATHS.videoTemplates, WORK);
    fs.writeFileSync(path.join(WORK, 'beats.js'), beatsFor(lesson));

    const durations = { '01': CARD, '02': CARD, '03': CARD };
    fs.writeFileSync(path.join(WORK, 'durations.json'), JSON.stringify(durations, null, 2));
    fs.rmSync(path.join(WORK, 'frames'), { recursive: true, force: true });
    fs.rmSync(path.join(WORK, 'out'), { recursive: true, force: true });

    // Silence, not absence: mixAudio refuses to run with no clips at all.
    const audioDir = path.join(WORK, 'audio');
    fs.rmSync(audioDir, { recursive: true, force: true });
    fs.mkdirSync(audioDir, { recursive: true });
    for (const [id, secs] of Object.entries(durations)) {
      await run(ROOT_FFMPEG, ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono',
        '-t', String(secs), '-c:a', 'pcm_s16le', path.join(audioDir, `vo_${id}.wav`)],
      { timeoutMs: 60_000 });
    }

    if (!fs.existsSync(path.join(WORK, 'node_modules'))) {
      log('npm i (first preview only)');
      await run('npm', ['i'], { cwd: WORK, timeoutMs: 15 * 60 * 1000 });
    }
    ensureFfmpeg(WORK);

    log(`rendering "${lesson.title}"`);
    await run('node', ['compile-lesson.js'], { cwd: WORK, timeoutMs: 15 * 60 * 1000 });

    const made = path.join(WORK, 'out', 'lesson.mp4');
    if (!fs.existsSync(made)) throw new Error('compile finished but produced no file');

    // Copy out under a stable id so the page can fetch it back.
    fs.mkdirSync(PUBLIC, { recursive: true });
    const id = crypto.createHash('sha1').update(lesson.title + Date.now()).digest('hex').slice(0, 12);
    const file = path.join(PUBLIC, `${id}.mp4`);
    fs.copyFileSync(made, file);

    const seconds = Object.values(durations).reduce((a, b) => a + b, 0);
    log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${id}.mp4`);
    return { id, file, seconds };
  } finally {
    building = false;
  }
}

function fileFor(id) {
  if (!/^[0-9a-f]{12}$/.test(String(id))) return null;
  const f = path.join(PUBLIC, `${id}.mp4`);
  return fs.existsSync(f) ? f : null;
}

module.exports = { render, fileFor, isBuilding: () => building };
