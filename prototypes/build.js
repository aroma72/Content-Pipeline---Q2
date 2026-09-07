// PROTOTYPE TOOL — build the quiz-popup prototype and its handoff stills.
//
//   node prototypes/build.js
//
// Two passes, because one of the prototype's own images is a screenshot of the
// prototype:
//   pass 1  inject the real video stills, render a working page
//   pass 2  drive that page with puppeteer, capture its four states, then
//           re-render with the "proposed" thumbnail filled in
//
// Inputs  : lms-quiz-popup-prototype.template.html  (the editable source)
//           explainer-videos/autonomy/autonomy-01-spectrum/{art,out,durations.json}
// Outputs : lms-quiz-popup-prototype.html           (published artifact)
//           pdf-assets/*.jpg                        (stills for the PDF)

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ffmpeg = require('ffmpeg-static');

// Puppeteer is not a root dependency; it lives inside the per-project installs.
const PUPPET_CANDIDATES = [
  '../drawing-room-video/drawing-room-remotion/node_modules/puppeteer',
  '../explainer-videos/autonomy/node_modules/puppeteer',
  '../explainer-videos/brand-intro-outro/node_modules/puppeteer',
];
let puppeteer = null;
for (const c of PUPPET_CANDIDATES) {
  try { puppeteer = require(path.resolve(__dirname, c)); break; } catch { /* next */ }
}
if (!puppeteer) throw new Error('puppeteer not found in:\n  ' + PUPPET_CANDIDATES.join('\n  '));

const HERE = __dirname;
const VID = path.resolve(HERE, '../explainer-videos/autonomy/autonomy-01-spectrum');
const ASSETS = path.join(HERE, 'pdf-assets');
const TEMPLATE = path.join(HERE, 'lms-quiz-popup-prototype.template.html');
const PAGE = path.join(HERE, 'lms-quiz-popup-prototype.html');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const kb = (p) => (fs.statSync(p).size / 1024).toFixed(0) + 'KB';
const uri = (p) => 'data:image/jpeg;base64,' + fs.readFileSync(p).toString('base64');

/** Beat 09 (the quiz card) starts at the sum of beats 01-08. Computed, not guessed. */
function beat09Start() {
  const d = JSON.parse(fs.readFileSync(path.join(VID, 'durations.json'), 'utf8'));
  return ['01', '02', '03', '04', '05', '06', '07', '08']
    .reduce((a, k) => a + (d[k] || 0), 0);
}

function jpeg(args, out) {
  // -update tells the image2 muxer this is a single file, not a numbered sequence.
  execFileSync(ffmpeg, ['-y', ...args, '-frames:v', '1', '-update', '1',
    '-vf', 'scale=1280:-2', '-q:v', '4', out], { stdio: ['ignore', 'ignore', 'ignore'] });
}

function render(uris) {
  let html = fs.readFileSync(TEMPLATE, 'utf8');
  for (const [token, value] of Object.entries(uris)) {
    html = html.split(token).join(value);
  }
  const leftover = html.match(/__[A-Z_]+__/g);
  if (leftover) throw new Error('unreplaced placeholders: ' + [...new Set(leftover)].join(', '));
  fs.writeFileSync(PAGE, html);
}

(async () => {
  fs.mkdirSync(ASSETS, { recursive: true });

  // ── the real video stills ───────────────────────────────────────────────
  const start = beat09Start();
  console.log('beat 09 (the baked-in quiz) starts at ' + start.toFixed(2) + 's');

  const scene = path.join(ASSETS, 'scene.jpg');
  const baked = path.join(ASSETS, 'baked-quiz.jpg');
  jpeg(['-i', path.join(VID, 'art/10.png')], scene);
  jpeg(['-ss', String(start + 5), '-i', path.join(VID, 'out/lesson.mp4')], baked);
  console.log('scene', kb(scene), '· baked', kb(baked));

  // ── pass 1: a working page, "proposed" thumbnail standing in ────────────
  const sceneUri = uri(scene);
  render({ __SCENE_URI__: sceneUri, __BAKED_URI__: uri(baked), __SHOT_QUESTION__: sceneUri });

  // ── pass 2: capture the four states off the live page ───────────────────
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const shots = {};
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 2 });
    await page.goto('file://' + PAGE, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);

    const screen = await page.$('#screen');
    const shot = async (name) => {
      const png = path.join(ASSETS, name + '.png');
      await screen.screenshot({ path: png });
      shots[name] = png;
      console.log('captured', name, kb(png));
    };

    // A — playing, no popup: restart, run a moment, pause for a clean frame.
    await page.click('#restart');
    await wait(2200);
    await page.click('#play');
    await wait(250);
    await shot('a-playing');

    // B — the checkpoint fires itself. Jump to 0:35 and let it arrive at 0:39.
    await page.click('#jump');
    await wait(5600);
    await shot('b-question');

    // C — correct answer: option A.
    await page.click('.q-opt[data-i="0"]');
    await wait(700);
    await shot('c-correct');

    // D — wrong answer: option C, which reveals A in green alongside it.
    await page.click('#reset');
    await wait(300);
    await page.click('.q-opt[data-i="2"]');
    await wait(700);
    await shot('d-wrong');

    // Two failures shipped silently once and must never ship again:
    //  - a stray "*/" inside a CSS comment swallowed the :root token block, so
    //    every var(--…) resolved to nothing and the card lost its background;
    //  - the fully-answered card grew taller than the 16:9 frame and bled out.
    // This is the widest state, so check it here.
    const health = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const card = document.querySelector('.qcard').getBoundingClientRect();
      const screenR = document.querySelector('#screen').getBoundingClientRect();
      const el = document.querySelector('.qcard');
      const btn = document.querySelector('#qnext').getBoundingClientRect();
      return {
        tokens: ['--cream', '--card', '--ink', '--doc-bg', '--serif']
          .filter((t) => !cs.getPropertyValue(t).trim()),
        cardH: Math.round(card.height),
        screenH: Math.round(screenR.height),
        cardBg: getComputedStyle(el).backgroundColor,
        clipped: el.scrollHeight - el.clientHeight,
        btnBelow: Math.round(btn.bottom - card.bottom),
      };
    });
    if (health.tokens.length) {
      throw new Error('CSS custom properties did not parse: ' + health.tokens.join(', ') +
        '\n  (check for a stray */ inside a CSS comment)');
    }
    if (health.cardBg === 'rgba(0, 0, 0, 0)') {
      throw new Error('the question card has no background — token lookup failed');
    }
    if (health.cardH > health.screenH) {
      throw new Error(`answered card is ${health.cardH}px inside a ${health.screenH}px frame — it will bleed out of the video`);
    }
    // The card fitting is not enough: its content must fit too, or the reader
    // has to scroll inside a video overlay to reach the Continue button.
    if (health.clipped > 0 || health.btnBelow > 0) {
      throw new Error(`the answered card's content overflows by ${health.clipped}px ` +
        `(Continue button ${health.btnBelow}px past the card edge) — shrink the scale or the copy`);
    }
    console.log(`health ok · card ${health.cardH}px in ${health.screenH}px frame · ` +
      `content fits · bg ${health.cardBg}`);
  } finally {
    await browser.close();
  }

  // Downscale the captures for the PDF, and make state B the "proposed" thumbnail.
  for (const [name, png] of Object.entries(shots)) {
    jpeg(['-i', png], path.join(ASSETS, name + '.jpg'));
    fs.unlinkSync(png);
  }
  const qShot = path.join(ASSETS, 'b-question.jpg');
  console.log('proposed thumbnail', kb(qShot));

  // ── final render, every placeholder real ────────────────────────────────
  render({ __SCENE_URI__: sceneUri, __BAKED_URI__: uri(baked), __SHOT_QUESTION__: uri(qShot) });
  console.log('\nbuilt', path.basename(PAGE), kb(PAGE));
})().catch((e) => { console.error(e); process.exit(1); });
