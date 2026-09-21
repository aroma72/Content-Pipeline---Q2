'use strict';
/**
 * Prove the machine can finish the job BEFORE the job costs anything.
 *
 * WHY THIS EXISTS
 *
 * Twice in two days a run bought art and voice -- about $0.60 each time -- and
 * then stopped on something that was already false before it started. The first
 * was a missing Chrome: the renderer worked because it resolves the browser by
 * hand, the frame gate did not, and the failure arrived AFTER the spend dressed
 * as a quality finding a person was asked to rule on. Nobody can rule on a
 * missing binary.
 *
 * Every one of those facts was knowable in under two seconds for nothing. So ask
 * first. A run that cannot finish should cost zero, and it should say plainly that
 * the deploy is broken rather than that the video is.
 *
 * WHAT THIS IS NOT
 *
 * Not a quality check. It never looks at a script, a beat or a frame. It answers
 * one question -- can this container do the work it is about to be paid to do --
 * and everything it reports is a property of the machine, not of the lesson.
 *
 * Each check is cheap, bounded and independent: one browser launch, three
 * subprocesses, two env reads, one stat. The whole suite is well under ten
 * seconds, which is the point -- a guard nobody minds running is a guard that
 * actually runs.
 */

const fs = require('fs');
const { execFileSync } = require('child_process');

/** Short, because every one of these is a local operation that should be instant. */
const TIMEOUT_MS = 20000;

const ok = (name, detail) => ({ name, ok: true, detail: detail || null });
const bad = (name, why, fix) => ({ name, ok: false, why, fix: fix || null });

function which(bin) {
  try {
    execFileSync(bin, ['-version'], { timeout: TIMEOUT_MS, stdio: 'pipe' });
    return true;
  } catch { return false; }
}

/**
 * The check that would have saved both runs.
 *
 * Launches the SAME browser the gates launch, the same way, and closes it. Not a
 * `which chromium`: the failure was never a missing file, it was Puppeteer
 * resolving a binary nobody had installed because it reads
 * PUPPETEER_EXECUTABLE_PATH and the image set CHROME_PATH. Only an actual launch
 * proves the resolution works.
 */
async function browserLaunches() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    // Not fatal here. The gates run inside a video folder that installs its own
    // copy; the orchestrator does not depend on one. Say so rather than claim a
    // pass or a failure we did not measure.
    return { name: 'browser', ok: null, why: 'puppeteer is not resolvable from the orchestrator' };
  }
  const exe = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || null;
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      ...(exe ? { executablePath: exe } : {}),
    });
    const v = await browser.version();
    return ok('browser', `${v}${exe ? ` at ${exe}` : ' (puppeteer default)'}`);
  } catch (e) {
    return bad('browser', e.message.split('\n')[0],
      'Set PUPPETEER_EXECUTABLE_PATH to the installed Chromium. Puppeteer does not read CHROME_PATH.');
  } finally {
    if (browser) { try { await browser.close(); } catch { /* closing is best-effort */ } }
  }
}

function ffmpegPresent() {
  const bin = process.env.FFMPEG_BIN || 'ffmpeg';
  if (!which(bin)) {
    return bad('ffmpeg', `${bin} did not run`,
      'Install ffmpeg in the image, or point FFMPEG_BIN at it.');
  }
  return ok('ffmpeg', bin);
}

/**
 * produce.js spawns `python`, and Debian ships only `python3` -- the image adds a
 * symlink for exactly this reason. Importing PIL and numpy too, because the
 * cutout step needs both and a bare interpreter proves nothing about them.
 */
function pythonPresent() {
  try {
    const out = execFileSync('python', ['-c', 'import PIL, numpy; print(PIL.__version__)'],
      { timeout: TIMEOUT_MS, stdio: 'pipe' }).toString().trim();
    return ok('python', `python + PIL ${out} + numpy`);
  } catch (e) {
    return bad('python', e.message.split('\n')[0],
      'The image needs python3, python3-pil and python3-numpy, and `python` symlinked to python3.');
  }
}

/** The key the paid steps use. Absent, art and speech fail after the run has started. */
function mediaCredential() {
  const k = process.env.GEMINI_API_KEY || process.env.GOOGLE_STUDIO_API_KEY;
  if (!k) {
    return bad('media credential', 'no GEMINI_API_KEY / GOOGLE_STUDIO_API_KEY',
      'Art and speech cannot be bought without it.');
  }
  return ok('media credential', 'present');
}

/**
 * Whether anything made here can outlive the deploy.
 *
 * A warning, not a failure: a container store is a real configuration and a run
 * on it still produces a video. But it produces one that the next redeploy
 * deletes, which is how a paid lesson was lost, so it must be said out loud.
 */
function durableStore() {
  try {
    const store = require('../../server/lib/job-store').shared();
    if (store.durability === 'volume' && store.writable !== false) {
      return ok('durable store', `volume at ${store.dir}`);
    }
    return {
      name: 'durable store', ok: null,
      why: `store is '${store.durability}'${store.writable === false ? ' and not writable' : ''}`
        + ' -- anything rendered here dies with the next redeploy',
    };
  } catch (e) {
    return { name: 'durable store', ok: null, why: e.message };
  }
}

/**
 * A render writes every frame as a PNG before encoding -- gigabytes for a
 * two-minute video. Running out halfway wastes the whole spend, and the error it
 * produces (a truncated frame, a failed encode) looks like anything but a full disk.
 */
function diskSpace(dir) {
  const GB = 1024 ** 3;
  const NEED = 3 * GB;
  try {
    const s = fs.statfsSync(dir || process.cwd());
    const free = s.bavail * s.bsize;
    if (free < NEED) {
      return bad('disk', `${(free / GB).toFixed(1)}GB free, want ${NEED / GB}GB`,
        'A frame dump is gigabytes. Clear old renders or grow the volume.');
    }
    return ok('disk', `${(free / GB).toFixed(1)}GB free`);
  } catch (e) {
    // statfs is not everywhere. Unknown, never a false pass.
    return { name: 'disk', ok: null, why: `could not measure: ${e.message}` };
  }
}

/**
 * Run every check and report all of them.
 *
 * Deliberately not fail-fast: the point is to learn everything that is wrong in
 * one go, the same reason the gate harness runs every gate against every fixture.
 * Finding one fault per paid run is what made this necessary.
 */
async function check({ videoDir } = {}) {
  const results = [
    await browserLaunches(),
    ffmpegPresent(),
    pythonPresent(),
    mediaCredential(),
    durableStore(),
    diskSpace(videoDir),
  ];
  const failed = results.filter((r) => r.ok === false);
  const unknown = results.filter((r) => r.ok === null);
  return { ok: failed.length === 0, results, failed, unknown };
}

/** One line per check, for a run log. */
function format(report) {
  return report.results.map((r) => {
    const mark = r.ok === true ? 'OK  ' : r.ok === false ? 'FAIL' : '??  ';
    const tail = r.ok === true ? (r.detail || '') : (r.why || '');
    return `  ${mark} ${r.name}${tail ? ` -- ${tail}` : ''}${r.fix ? `\n       fix: ${r.fix}` : ''}`;
  }).join('\n');
}

module.exports = { check, format };
