'use strict';
/**
 * checkpoints -- derive the in-video question payload the LMS consumes.
 *
 * The source of truth is the video's own `beats.js`, not a hand-maintained list.
 * Every lesson already contains a QUESTION card and a REVEAL card (the mandatory
 * QUESTION -> REVEAL pair, SCRIPTING_STANDARDS 3b), so the data the LMS needs is
 * already written -- it just has to be read out and timed.
 *
 * The timing is the part that is easy to get wrong, and it is why this module
 * exists instead of a static JSON file:
 *
 *   beats.js         one QUESTION beat (quiz card, no `answer`)
 *                    one REVEAL beat   (same options, with `answer`)
 *   durations.json   the measured length of every beat, keyed by beat id
 *   out/_bumpers/    intro.mp4 is CONCATENATED BEFORE the lesson
 *
 * The deliverable the learner watches is `<slug>_final.mp4`, which is
 * intro + lesson + outro. So a checkpoint time measured from the lesson is
 * WRONG for the file being played -- it fires early by the length of the intro
 * (2.6s on the current brand bumper). `atSeconds` is therefore always relative
 * to the delivered file, and the lesson-relative figure is reported alongside it
 * so the two can never be silently confused.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const { PATHS } = require('../../orchestrator/lib/paths');
const publishLog = require('./publish-log');

/** The house preamble. The beats' own note says "Write your answer down." --
 *  correct for a video nobody can answer, wrong for a popup that takes input. */
const PREAMBLE = "Let's answer a quick question, to check the concept landed.";

/**
 * How far BEFORE the beat boundary the player should stop, in seconds.
 *
 * Every beat is one spoken sentence plus a trailing pause of ~0.7s, so the
 * boundary itself is already silent. But pausing exactly on it lands one frame
 * into the NEXT beat -- the learner gets the question over a visual that belongs
 * to the answer they have not reached yet. Backing off a quarter of a second
 * keeps the previous beat's frame on screen while staying comfortably inside the
 * silence, so the audio is never cut mid-word.
 */
const PAUSE_LEAD_SECONDS = 0.25;

// Probing a bumper costs an ffmpeg spawn, so memoise per file+mtime.
const introCache = new Map();

function ffmpegBin() {
  try { return require('ffmpeg-static'); } catch { /* fall through */ }
  try { return require('@ffmpeg-installer/ffmpeg').path; } catch { return null; }
}

/** Duration in seconds of a media file, or null if it cannot be read. */
function probeSeconds(file) {
  const bin = ffmpegBin();
  if (!bin || !fs.existsSync(file)) return null;
  try {
    // ffmpeg writes the header to stderr and exits non-zero with no output file,
    // which is expected -- read stderr rather than treating it as a failure.
    execFileSync(bin, ['-i', file], { stdio: ['ignore', 'ignore', 'pipe'] });
    return null;
  } catch (e) {
    const err = String((e.stderr && e.stderr.toString()) || '');
    const m = err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (!m) return null;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
}

/**
 * How much the delivered file is shifted relative to the lesson render.
 *
 * Three sources, in descending trust:
 *   probed          the video's own intro.mp4 was measured just now (local dev)
 *   brand-constant  the committed measurement in brand-intro-outro (the deploy
 *                   container has no .mp4 files -- they are gitignored)
 *   assumed         neither was available; the caller must not treat it as timed
 *
 * Returns { seconds, source }.
 */
function introOffset(dir) {
  const intro = path.join(dir, 'out', '_bumpers', 'intro.mp4');
  const key = intro + ':' + (fs.existsSync(intro) ? fs.statSync(intro).mtimeMs : 'none');
  if (introCache.has(key)) return introCache.get(key);

  let result = null;

  // A video built without brand bumpers is delivered as the bare lesson, so the
  // offset is genuinely zero -- shifting it by the brand constant would fire
  // every checkpoint 2.6s late. Distinguishable from "the container has no mp4
  // files": here the deliverable IS present and _bumpers is simply absent.
  const bumperDir = path.join(dir, 'out', '_bumpers');
  const built = (() => {
    try { return fs.readdirSync(path.join(dir, 'out')).some((f) => f.endsWith('_final.mp4')); }
    catch { return false; }
  })();
  if (built && !fs.existsSync(bumperDir)) {
    const bare = { seconds: 0, source: 'no-bumpers' };
    introCache.set(key, bare);
    return bare;
  }

  const probed = probeSeconds(intro);
  if (probed !== null) {
    result = { seconds: Number(probed.toFixed(3)), source: 'probed' };
  } else {
    const constFile = path.join(PATHS.brandBumpers, 'bumper-durations.json');
    try {
      const j = JSON.parse(fs.readFileSync(constFile, 'utf8'));
      if (typeof j.introSeconds === 'number') {
        result = { seconds: j.introSeconds, source: 'brand-constant' };
      }
    } catch { /* fall through */ }
  }
  if (!result) result = { seconds: 2.6, source: 'assumed' };

  introCache.set(key, result);
  return result;
}

function isQuiz(beat) {
  return beat && beat.info && beat.info.tpl === 'quiz' && beat.info.data;
}

/**
 * The current format (2026-09-15): the question IS on screen, and the popup
 * mirrors it. The card is a normal rendered beat carrying a `quiz` block:
 *
 *   { id: '14', mode: 'card', holdAfter: 6, vo: '…', card: {…},
 *     quiz: { stem, options: [...], answer: <0-based index>, explain } }
 *   { id: '15', mode: 'card', revealsQuiz: true, vo: '…', card: {…} }
 *
 * The popup opens the instant the card appears and closes the instant it leaves
 * — `startSeconds` to `endSeconds` — and the video NEVER pauses. The window is
 * the card's own measured length (voiceover + `holdAfter`), so the two cannot
 * drift: both come from the same number in durations.json.
 */
function quizOf(beat) {
  return beat && beat.quiz && Array.isArray(beat.quiz.options) ? beat.quiz : null;
}

/**
 * The current format: the question is never drawn and never spoken. The player
 * stops just before this beat, the LMS asks the question, shows feedback on the
 * answer, and then resumes from the same instant.
 *
 *   { id: '14', mode: 'checkpoint',
 *     quiz: { stem, options: [...], answer: <0-based>, explain, correctNote } }
 */
function isCheckpointBeat(beat) {
  return Boolean(beat) && beat.mode === 'checkpoint' && Boolean(beat.quiz);
}

/**
 * Load beats.js, re-parsing only when the file has actually changed.
 *
 * The cache-bust was there so an edited script is picked up without a restart,
 * and that still holds -- but it meant EVERY beats.js in the tree was re-read and
 * re-executed on every catalogue request, and findByVideoId did it twice. An
 * mtime check keeps the same behaviour for one statSync instead of a re-parse.
 */
const beatsCache = new Map();

function loadBeats(dir) {
  const file = path.join(dir, 'beats.js');
  let st = null;
  try { st = fs.statSync(file); } catch { return null; }

  const hit = beatsCache.get(file);
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit.beats;

  delete require.cache[require.resolve(file)];
  const mod = require(file);
  const beats = Array.isArray(mod) ? mod : null;
  beatsCache.set(file, { mtimeMs: st.mtimeMs, size: st.size, beats });
  return beats;
}

/**
 * When this video's inputs last changed.
 *
 * The LMS asked for a catalogueUpdatedAt so they can tell "nothing changed" from
 * "I have not looked". Derived from the files the payload is actually built out
 * of, so it cannot claim freshness the content does not have.
 */
function sourceMtime(dir) {
  let newest = 0;
  for (const name of ['beats.js', 'durations.json']) {
    try { newest = Math.max(newest, fs.statSync(path.join(dir, name)).mtimeMs); } catch { /* absent */ }
  }
  return newest;
}

/**
 * Which videos are committed to git, and therefore survive a redeploy.
 *
 * Read from a manifest built before the image, because .dockerignore excludes
 * .git and there is no way to ask this question at runtime. See
 * scripts/build-catalogue-manifest.js.
 */
let manifest;
function committedPaths() {
  if (manifest === undefined) {
    try {
      manifest = require('../catalogue-manifest.json');
    } catch { manifest = null; }
  }
  return manifest;
}

/**
 * Is a row safe for an LMS to link a lesson block to?
 *
 * 'committed'  in git, so it is in the image and survives a redeploy
 * 'ephemeral'  made at runtime; it will disappear on the next redeploy
 * 'unknown'    no manifest shipped, so we genuinely do not know
 *
 * `unknown` rather than a guess on purpose. A row the LMS declines to link
 * because we were unsure costs a lookup; a row wrongly called durable is a dead
 * question inside a university course, discovered by a learner.
 */
function durabilityOf(relPath) {
  const m = committedPaths();
  if (!m || !m.paths) return 'unknown';
  return Object.prototype.hasOwnProperty.call(m.paths, relPath) ? 'committed' : 'ephemeral';
}

function loadDurations(dir) {
  const file = path.join(dir, 'durations.json');
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/**
 * Build the checkpoint payload for one video.
 * @returns {object|null} null when the folder is not a built video.
 */
function forPath(relPath) {
  const series = relPath.split('/')[0];
  const slug = relPath.split('/').pop();
  const dir = path.join(PATHS.explainerVideos, ...relPath.split('/'));
  const beats = loadBeats(dir);
  if (!beats) return null;

  const durations = loadDurations(dir);
  const offset = introOffset(dir);

  // Elapsed lesson time at the START of each beat, by index.
  const startAt = [];
  let running = 0;
  let timed = Boolean(durations);
  beats.forEach((b, i) => {
    startAt[i] = running;
    // A checkpoint beat is never voiced, so it has no duration BY DESIGN and must
    // not be read as a missing measurement — treating it as one made every new
    // video report timing.trusted:false, and the LMS is told never to fire those.
    if (isCheckpointBeat(b)) return;
    const d = durations && durations[b.id];
    if (typeof d === 'number') running += d;
    else timed = false; // a missing beat length makes every later time a guess
  });

  const checkpoints = [];
  const sec = (n) => Number(n.toFixed(3));

  /**
   * One entry. `lessonAt` is the lesson-relative instant the player stops;
   * everything exposed is shifted into the delivered file by the intro offset.
   */
  const emit = ({ beat, lessonAt, revealBeat, quiz, explanation,
    explanationSource, rendersInVideo, pause }) => {
    const revealIdx = revealBeat ? beats.indexOf(revealBeat) : -1;
    const wrong = explanation;
    // Getting it right deserves more than a tick: the same reasoning, confirmed.
    // Authored `correctNote` wins; otherwise the explanation does the work.
    const right = (quiz.correctNote && String(quiz.correctNote).trim())
      || (wrong ? `That's right. ${wrong}` : null);

    checkpoints.push({
      id: `q${checkpoints.length + 1}`,
      beatId: beat.id,
      revealBeatId: revealBeat ? revealBeat.id : null,

      // ── where the player stops ───────────────────────────────────────────
      atSeconds: sec(lessonAt + offset.seconds),
      lessonAtSeconds: sec(lessonAt),

      // ── how the player must behave ───────────────────────────────────────
      // Pause here, show the question, take the answer, show the feedback,
      // then resume from this same instant. Nothing about the question is in
      // the video, so the popup is the only place the learner ever sees it.
      pausesVideo: true,
      resumeAfterFeedback: true,
      // The learner must CHOOSE an option before playback continues. Not a dismissible
      // overlay, no "skip", no clicking outside to close, no seeking past it — the
      // question is the gate, which is the only reason a checkpoint changes behaviour
      // rather than decorating it.
      requiresAnswer: true,
      blocking: true,
      allowSkip: false,
      resumeAtSeconds: sec(lessonAt + offset.seconds),
      rendersInVideo,
      pause,

      // ── what to show ─────────────────────────────────────────────────────
      preamble: PREAMBLE,
      stem: quiz.stem,
      options: quiz.options.slice(),
      correctIndex: quiz.answer,
      feedback: {
        // Shown when they pick correctIndex — confirm, and say why.
        correct: right,
        // Shown when they pick anything else — why the right one is right, and
        // why the tempting wrong one is wrong.
        incorrect: wrong,
      },
      // The original field name, same text as feedback.incorrect. Kept so the
      // first integration does not break.
      explanation: wrong,
      explanationSource,
      // Older videos still draw the question and answer on screen; there the
      // popup duplicates what is playing.
      revealAtSeconds: revealIdx >= 0 ? sec(startAt[revealIdx] + offset.seconds) : null,
    });
  };

  // A question the video draws for itself cannot gate anything: the learner has
  // already read it, and the answer card arrives whether they choose or not. So
  // the whole behaviour contract has to relax together. Setting only
  // `pausesVideo` left `requiresAnswer: true, allowSkip: false` standing beside
  // it, and a consumer could only resolve that by guessing which field won --
  // which is exactly what the LMS had to do. Kept in one place so the flags
  // cannot drift apart again.
  const drawnOnScreen = (until) => {
    const last = checkpoints[checkpoints.length - 1];
    last.pausesVideo = false;
    last.resumeAfterFeedback = false;
    last.requiresAnswer = false;
    last.blocking = false;
    last.allowSkip = true;
    last.onScreenUntilSeconds = until;
  };

  // ── current format: the checkpoint beat. Nothing rendered; the player stops ──
  beats.forEach((c, i) => {
    if (!isCheckpointBeat(c)) return;
    const q = c.quiz;
    const spoken = (b) => b && !isCheckpointBeat(b);
    const after = beats.slice(0, i).filter(spoken).pop() || null;
    const before = beats.slice(i + 1).find(spoken) || null;

    // The beat occupies no time, so its start IS the boundary between the two
    // beats either side. We stop a fraction before it, inside the trailing
    // silence, so the previous frame is still up and no word is clipped.
    const boundary = startAt[i];
    emit({
      beat: c,
      lessonAt: Math.max(0, boundary - PAUSE_LEAD_SECONDS),
      revealBeat: null,
      quiz: q,
      explanation: q.explain || null,
      explanationSource: q.explain ? 'authored' : 'missing',
      rendersInVideo: false,
      pause: {
        atBeatBoundary: true,
        afterBeatId: after && after.id,
        beforeBeatId: before && before.id,
        boundaryLessonSeconds: sec(boundary),
        leadSeconds: PAUSE_LEAD_SECONDS,
        // First or last in the list means no whole sentence on one side of the
        // stop. The LMS must not fire an unsafe pause.
        safe: Boolean(after && before),
      },
    });
  });

  // ── older videos: the question is drawn on screen as a card pair ───────────
  beats.forEach((b, i) => {
    const quiz = quizOf(b);
    if (!quiz || isCheckpointBeat(b)) return;
    const d = (durations && durations[b.id]) || 0;
    emit({
      beat: b,
      lessonAt: startAt[i],
      revealBeat: beats.slice(i + 1).find((x) => x.revealsQuiz) || null,
      quiz,
      explanation: quiz.explain || null,
      explanationSource: quiz.explain ? 'authored' : 'missing',
      rendersInVideo: true,
      pause: { atBeatBoundary: true, afterBeatId: (beats[i - 1] || {}).id || null,
        beforeBeatId: b.id, boundaryLessonSeconds: sec(startAt[i]), leadSeconds: 0,
        safe: i > 0 },
    });
    // The card holds the question on screen by itself, so pausing is optional
    // here; the window it is legible for is reported for a player that prefers
    // to overlay rather than stop.
    drawnOnScreen(sec(startAt[i] + d + offset.seconds));
  });

  // ── the `info` quiz-card pair: same rule, the window is the card's own time ──
  beats.forEach((q, i) => {
    if (!isQuiz(q) || typeof q.info.data.answer === 'number') return; // reveals handled below
    // A current-format beat draws the quiz card AND carries `quiz` for the popup.
    // It was already emitted above; matching it here too would serve the same
    // question twice, and the LMS would open two popups over one card.
    if (quizOf(q)) return;

    // The REVEAL is a later quiz beat carrying the answer index. Its `note` is
    // the one-line explanation the script already wrote.
    const reveal = beats.slice(i + 1).find(
      (b) => isQuiz(b) && typeof b.info.data.answer === 'number'
    );
    if (!reveal) return; // a question with no reveal is a script bug, not a checkpoint

    const d = (durations && durations[q.id]) || 0;
    emit({
      beat: q,
      lessonAt: startAt[i],
      pause: { atBeatBoundary: true, afterBeatId: (beats[i - 1] || {}).id || null,
        beforeBeatId: q.id, boundaryLessonSeconds: sec(startAt[i]), leadSeconds: 0,
        safe: i > 0 },
      revealBeat: reveal,
      quiz: {
        // The drawn card trims a long stem or option to fit 1080 lines. The popup
        // has no such limit, so prefer the untrimmed text when the script kept it.
        stem: q.info.data.stemFull || q.info.data.stem,
        options: q.info.data.optionsFull || q.info.data.options,
        answer: reveal.info.data.answer,
      },
      // `note` is the video's on-screen caption -- six words, written to be read
      // aloud ("Easy to undo, so it runs free."). Serving it as the popup's
      // explanation told a learner who had just answered wrong essentially
      // nothing, and nothing at all about why THEIR choice was wrong. An
      // authored `explain` on the REVEAL beat is preferred; the caption remains
      // the fallback so no video is left with an empty popup.
      explanation: reveal.info.data.explain || reveal.info.data.note || null,
      // Named so coverage is visible rather than guessed at: 'video-note' means
      // this question still needs a proper explanation written for it.
      explanationSource: reveal.info.data.explain ? 'authored' : 'video-note',
      rendersInVideo: true,
    });
    // These videos draw the question and the answer themselves, so stopping is
    // optional — the card already holds it on screen. Reported so the LMS can
    // tell them apart from a video that shows nothing and must be paused.
    drawnOnScreen(sec(startAt[i] + d + offset.seconds));
  });

  if (!checkpoints.length) return null;

  const finalName = `${slug}_final.mp4`;
  const finalPath = path.join(dir, 'out', finalName);

  return {
    videoId: slug,
    series,
    deliverable: finalName,
    // Trustworthy when every beat length was measured AND the intro length came
    // from a real measurement (probed, or the committed brand constant).
    // The LMS must refuse to fire a checkpoint whose timing is not trusted.
    timing: {
      trusted: Boolean(timed && offset.source !== 'assumed'),
      relativeTo: finalName,
      introOffsetSeconds: offset.seconds,
      introOffsetSource: offset.source,
      lessonSeconds: Number(running.toFixed(3)),
      note: offset.seconds > 0
        ? 'atSeconds is measured from the start of the delivered file, which '
          + 'begins with the brand intro. lessonAtSeconds excludes it.'
        : 'This video is delivered without brand bumpers, so atSeconds and '
          + 'lessonAtSeconds are the same.',
    },
    // Whether the file sits on THIS server. False in the deploy container, where
    // .mp4 files are gitignored -- it does not mean the video was never made.
    deliverableOnServer: fs.existsSync(finalPath),
    // The playable copy, when there is one. Without this a catalogue entry gave
    // checkpoints with no URL while a finished job gave a URL with no
    // checkpoints, and a person bridged the two by eye.
    //
    // NOTE the nesting: `youtube.videoId` is a YouTube id, this payload's
    // `videoId` is a folder name. They are different things that unluckily share
    // a name, and flattening one onto the other would break every checkpoint
    // lookup for a published video.
    youtube: publishLog.forPath(relPath) || null,
    youtubeVideoId: (publishLog.forPath(relPath) || {}).videoId || null,
    durability: durabilityOf(relPath),
    catalogueUpdatedAt: sourceMtime(dir) ? new Date(sourceMtime(dir)).toISOString() : null,
    checkpoints,
  };
}

/**
 * Every directory under explainer-videos/ that holds a beats.js.
 *
 * Walked rather than assumed two levels deep: assessment videos live at
 * <series>/assessment/<slug>, and a two-level scan silently omitted three of
 * them -- their questions could never have reached the LMS, with nothing
 * reporting a problem.
 */
function videoDirs(dir = PATHS.explainerVideos, depth = 0) {
  if (depth > 3 || !fs.existsSync(dir)) return [];
  const found = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    // Per-video working state and dependencies never contain another video.
    if (['node_modules', 'out', 'art', 'frames', 'clips', 'audio', 'layers',
      'animation', 'lib', '__pycache__', '.chrome-profile'].includes(e.name)) continue;
    const sub = path.join(dir, e.name);
    if (fs.existsSync(path.join(sub, 'beats.js'))) found.push(sub);
    found.push(...videoDirs(sub, depth + 1));
  }
  return found;
}

/** Every video folder that yields at least one checkpoint. */
function listVideos() {
  const root = PATHS.explainerVideos;
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const dir of videoDirs()) {
    const rel = path.relative(root, dir).split(path.sep).join('/');
    let payload = null;
    try { payload = forPath(rel); } catch { payload = null; }
    if (!payload) continue;
    out.push({
      videoId: payload.videoId,
      series: payload.series,
      // The folder path, because videoId is only the last segment and an
      // assessment video can sit at <series>/assessment/<slug>.
      path: rel,
      checkpoints: payload.checkpoints.length,
      deliverableOnServer: payload.deliverableOnServer,
      explanationsAuthored:
        payload.checkpoints.filter((c) => c.explanationSource === 'authored').length,
      timingTrusted: payload.timing.trusted,
      // 'popup' — nothing is on screen, the player pauses and asks.
      // 'on-screen' — built before the popup; the cards still play in the video.
      questionStyle: payload.checkpoints.every((c) => !c.rendersInVideo) ? 'popup' : 'on-screen',
      // The playable copy, so this row and a finished job are no longer islands.
      youtube: payload.youtube,
      youtubeVideoId: payload.youtubeVideoId,
      // Whether an LMS can safely bind a lesson block to this row. A row that is
      // not committed to git exists only on this container and goes away with the
      // next redeploy -- which is what made a slug look as though it had been
      // renamed when nothing about it had changed.
      durability: payload.durability,
      catalogueUpdatedAt: payload.catalogueUpdatedAt,
    });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Find a video by id alone, so the LMS never has to know our folder layout.
 *
 * Walks the tree once. It used to call listVideos() -- building every payload in
 * the catalogue -- and then build the one it wanted again, so a single checkpoint
 * lookup did the whole catalogue's work twice.
 */
function findByVideoId(videoId) {
  const root = PATHS.explainerVideos;
  if (!fs.existsSync(root)) return null;
  for (const dir of videoDirs()) {
    if (path.basename(dir) !== videoId) continue;
    const rel = path.relative(root, dir).split(path.sep).join('/');
    try {
      const payload = forPath(rel);
      if (payload) return payload;
    } catch { /* try the next match */ }
  }
  return null;
}

function etagOf(payload) {
  return '"' + crypto.createHash('sha1')
    .update(JSON.stringify(payload)).digest('hex').slice(0, 20) + '"';
}

/** Back-compat wrapper for the common two-level <series>/<slug> layout. */
function forVideo(series, slug) {
  return forPath(`${series}/${slug}`);
}

/**
 * The fixed worked example, in the shape this API returns.
 *
 * It is the question from the SAME run as the video the demo links to, not a
 * separately invented one -- a demo assembled from three different runs shows
 * the shape of the flow while quietly lying about it. See lib/demo-sample.js.
 */
function sampleCheckpoints() {
  return require('./demo-sample').checkpointPayload(PREAMBLE, PAUSE_LEAD_SECONDS);
}
module.exports = { forPath, forVideo, sampleCheckpoints, listVideos, findByVideoId, videoDirs, etagOf, PREAMBLE };
