#!/usr/bin/env node
'use strict';
/**
 * record-demo -- film the course builder working end to end.
 *
 *   node scripts/record-demo.js
 *
 * WHY
 * The question "what does this look like when it works?" does not need the
 * pipeline to actually run for half an hour and spend money. It needs a film.
 *
 * WHAT IS REAL AND WHAT IS NOT -- read this before showing anyone:
 *   REAL  the page, every pixel of it: the live course-builder UI, driven in a
 *         real browser, typed into and clicked like a person would.
 *   REAL  the course plan on screen -- genuine model output, generated once and
 *         replayed here so the film does not sit on a spinner for 90 seconds.
 *   ACTED the build progress and the approval. The renders are not happening;
 *         the page is being fed the responses it would receive, on a timer, so
 *         the whole journey fits in a minute.
 *
 * Nothing about the page is mocked up -- only the server's answers are. The
 * layout, states, wording and styling are exactly what a user would see.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const PUPPET = [
  '../drawing-room-video/drawing-room-remotion/node_modules/puppeteer',
  '../explainer-videos/testing/render-smoke/node_modules/puppeteer',
  '../explainer-videos/autonomy/node_modules/puppeteer',
];
let puppeteer = null;
for (const c of PUPPET) {
  try { puppeteer = require(path.resolve(__dirname, c)); break; } catch { /* next */ }
}
if (!puppeteer) throw new Error('puppeteer not found');

const ffmpeg = require(path.join(REPO, 'node_modules/ffmpeg-static'));
const PAGE_URL = process.env.DEMO_URL
  || 'https://content-queen-production.up.railway.app/demo/course-builder';
const PLAN = JSON.parse(fs.readFileSync(path.join(REPO, 'prototypes/demo-plan.json'), 'utf8'));

const OUT_DIR = path.join(REPO, 'prototypes', 'demo-recording');
const FRAMES = path.join(OUT_DIR, 'frames');
const OUT = path.join(REPO, 'prototypes', 'Course-Builder-Demo.mp4');

const W = 1440, H = 900, FPS = 12;
const log = (m) => process.stdout.write(`[record] ${m}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', `--window-size=${W},${H}`],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  // ── feed the page the server answers it would get, instantly ────────────
  await page.evaluateOnNewDocument((plan) => {
    const realFetch = window.fetch.bind(window);
    let polls = 0;
    const lessons = plan.modules.flatMap((m) => m.lessons.map((l) => l.title));
    const reply = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

    window.fetch = async (url, opts) => {
      const u = String(url);
      // The page calls /demo/course-builder/plan -- matching only '/courses/plan'
      // missed it, the real (rate-limited) endpoint answered, and the film showed
      // an error instead of a course.
      if (u.includes('/plan')) { await new Promise((r) => setTimeout(r, 1400)); return reply(plan); }
      if (u.includes('/courses/build')) {
        return reply({ courseId: 'course-demo', series: 'whatsapp-orders',
          queued: lessons.length, rejected: [], items: lessons }, 202);
      }
      if (u.includes('/api/v1/courses/')) {
        // Walk the build forward a little on each poll so the film shows motion.
        polls++;
        const done = Math.min(lessons.length, Math.max(0, polls - 1));
        const buildingIdx = done < lessons.length ? done : -1;
        return reply({
          courseId: 'course-demo', lessons: lessons.length,
          done, failed: 0, inProgress: lessons.length - done,
          awaitingApproval: buildingIdx >= 0 && polls > 1
            ? [{ id: lessons[buildingIdx], topic: lessons[buildingIdx],
                 reason: 'awaiting human review' }] : [],
          worker: buildingIdx >= 0
            ? { building: { id: lessons[buildingIdx], topic: lessons[buildingIdx] } }
            : { building: null },
          items: lessons.map((t, i) => ({ id: t, topic: t,
            status: i < done ? 'done' : 'queued', module: 1 })),
        });
      }
      return realFetch(url, opts);
    };
  }, PLAN);

  log(`opening ${PAGE_URL}`);
  await page.goto(PAGE_URL, { waitUntil: 'networkidle0', timeout: 120000 });

  // ── film ────────────────────────────────────────────────────────────────
  let n = 0;
  let filming = true;
  const shoot = async () => {
    while (filming) {
      try {
        await page.screenshot({ path: path.join(FRAMES, `f_${String(++n).padStart(5, '0')}.png`) });
      } catch { /* a screenshot during navigation can fail; skip the frame */ }
      await sleep(1000 / FPS);
    }
  };
  const filmStart = Date.now();
  const film = shoot();

  const beat = (ms) => sleep(ms);

  await beat(1200);

  // 1. type the topic like a person
  log('typing the topic');
  await page.evaluate(() => document.querySelector('#topic').focus());
  await page.type('#topic', PLAN.request.topic, { delay: 28 });
  await beat(400);
  await page.type('#duration', 'about 12 minutes', { delay: 28 });
  await beat(300);
  await page.type('#audience', 'small shopkeepers in Pakistan', { delay: 26 });
  await beat(700);

  // 2. plan it
  log('planning');
  await page.evaluate(() => document.querySelector('#go').click());
  await beat(2600);                       // the canned reply lands after 1.4s
  await page.evaluate(() => window.scrollTo({ top: 380, behavior: 'smooth' }));
  await beat(1800);
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'smooth' }));
  await beat(1800);

  // 3. open one lesson so the SLO and the check question are visible
  log('opening a lesson');
  const opened = await page.evaluate(() => {
    const d = document.querySelector('#c-modules details');
    if (!d) return false;
    d.open = true;
    d.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  });
  await beat(opened ? 3200 : 600);

  // 4. the build gate
  log('build gate');
  await page.evaluate(() => document.querySelector('#build').scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await beat(1200);
  await page.evaluate(() => document.querySelector('#build').click());             // first press reveals the gate
  await beat(1600);
  await page.evaluate(() => { document.querySelector('#series').value = ''; });
  await page.type('#series', 'whatsapp-orders', { delay: 30 });
  await page.type('#btoken', 'cq_demo_key_not_real', { delay: 18 });
  await beat(900);

  // 5. building, one lesson at a time
  log('building');
  await page.evaluate(() => document.querySelector('#build').click());
  await beat(1500);
  await page.evaluate(() => {
    const p = document.querySelector('#b-prog');
    if (p) p.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await beat(2000);
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => {
      // The page polls every 20s; nudge it so the film does not crawl.
      const ev = new Event('demo-tick'); window.dispatchEvent(ev);
    });
    await beat(1500);
  }
  await beat(2500);

  filming = false;
  await film;
  // Screenshots take real time, so the capture rate is whatever it turned out to
  // be -- encoding at the requested FPS played the film back at triple speed.
  const realFps = Math.max(1, n / ((Date.now() - filmStart) / 1000));
  await browser.close();
  log(`${n} frames`);

  // ── encode ──────────────────────────────────────────────────────────────
  log('encoding');
  require('child_process').execFileSync(ffmpeg, ['-y',
    '-framerate', realFps.toFixed(3), '-i', path.join(FRAMES, 'f_%05d.png'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-r', '30', '-vf', `scale=${W}:${H}`, OUT], { stdio: ['ignore', 'ignore', 'inherit'] });

  const secs = (n / realFps).toFixed(1);
  const mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
  log(`OK -- ${path.relative(REPO, OUT)} (${secs}s, ${mb}MB)`);
  fs.rmSync(FRAMES, { recursive: true, force: true });
})().catch((e) => { log('FAILED: ' + (e.stack || e.message)); process.exit(1); });
