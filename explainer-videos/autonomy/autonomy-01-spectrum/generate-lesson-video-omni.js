'use strict';
/*
 * generate-lesson-video-omni.js — VIDEO A test.
 * Turns each illustrated beat's still (art/<id>.png, from Nano Banana) into a real
 * MOVING clip via kie.ai image-to-video (wan/2-6-image-to-video). The character
 * actually gestures/walks — not a still panned by the camera.
 *
 * Flow per beat:  base64-upload art -> get URL -> createTask i2v -> poll -> download mp4
 * Output: clips/<id>.mp4
 * Cost:   guarded — wan 2.6 ~$0.05/s. no spend without --yes / CONFIRM_SPEND=1.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { omniKey, guardSpend, KIE_BASE } = require('./lib/config');

const UPLOAD_HOST = 'https://kieai.redpandaai.co'; // kie's file host (api.kie.ai 404s for uploads)

const beats = require('./beats.js');
const durations = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'durations.json'), 'utf8'));
const OUT = path.join(process.cwd(), 'clips');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const I2V_MODEL = process.env.I2V_MODEL || 'wan/2-6-image-to-video';

// per-beat motion direction (falls back to a calm idle). Keeps the flat-illustration look.
// Tuned for THIS video (mango stall → AI price list). Keep motions small and in-character
// so the flat 2D art doesn't morph (i2v drifts if asked for big movement).
const MOTION = {
  '02': 'the shopkeeper warmly greets a small friendly robot assistant across the shop counter, a welcoming nod and open-handed gesture, the robot blinks softly, gentle ambient motion',
  '03': 'the young man leans in and looks over the fresh crate of mangoes with interest, he blinks and shifts his weight, gentle ambient motion',
  '04': 'the small robot assistant slides a paper slip across the counter toward the smug customer holding an empty basket, small subtle gestures, gentle ambient motion, no big movement',
  '05': 'the young man cheerfully pushes the crate forward and gestures welcomingly, confident and upbeat, gentle motion',
  '07': 'the three customers hold out sour mangoes with unhappy expressions, the shopkeeper looks concerned and gestures apologetically, small subtle empathetic motion, no big movement',
  '08': 'the young man looks puzzled, tilts his head and lightly scratches it while looking at the mango in his hand, gentle thinking motion',
  '09': 'a soft shimmer of light passes over the mangoes in the crate, a very gentle settling camera, calm ambient motion',
  '10': 'the young man holds up two different mangoes and looks between them curiously, a slight weighing motion of his hands',
  '11': 'the young man slowly turns a single mango in his hand, thoughtful and quiet, soft light, gentle reflective motion',
  '13': 'the young man rolls up his sleeves and nods with determination as a new crate arrives, purposeful and ready, gentle motion',
  '14': 'the young man reaches into the crate and sets mangoes in a row on the counter, methodical calm hand motion',
  '15': 'the young man tastes a slice of mango then makes a small mark on a paper with a pencil, focused, gentle alternating motion',
  '17': 'the young man stands calmly beside the crate with a satisfied smile, a slow confident breath, gentle motion',
  '19': 'the young man gestures openly toward the floating screen which pulses softly, he blinks and shifts his weight, hopeful',
  '20': 'the young man reads the sheet in his hands, his eyes scan it and he gives a small nod, calm breathing',
  '22': 'the young man holds a mango and gives a small gentle shrug with an open hand, reflective, natural motion',
  '23': 'the young man holds a single mango up between finger and thumb and studies it, a slight turn of the wrist, thoughtful',
  '24': 'the young man faces forward with a warm smile and an open, inviting hand gesture, encouraging, natural motion',
  '25': 'the young man raises one hand and counts on his fingers with a friendly clear expression, gentle counting motion',
  '27': 'the young man gives a confident warm smile and a small thumbs up, a reassuring nod',
};
const DEFAULT_MOTION = 'natural subtle character animation, the person breathes, blinks and shifts weight gently, flat 2D vector animation, camera locked, no style change';
const STYLE_LOCK = ' Keep the exact same flat 2D vector illustration art style, same colors, same character design; smooth 2D animation; static locked camera; no text.';

const artBeats = beats.filter((b) => (b.mode === 'ali' || b.mode === 'scene') && b.art);
const onlyIds = (process.env.ART_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const todo = onlyIds.length ? artBeats.filter((b) => onlyIds.includes(b.id)) : artBeats;

async function kie(pathname, { method = 'GET', key, body, base = KIE_BASE } = {}) {
  const res = await fetch(`${base}${pathname}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let j; try { j = JSON.parse(txt); } catch { j = null; }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
  if (j && j.code && j.code !== 200) throw new Error(`kie code ${j.code}: ${j.msg || txt.slice(0, 200)}`);
  return j;
}

async function uploadArt(id, key) {
  // downscale to a small JPEG seed (i2v still outputs 1080p) — keeps the upload payload small/reliable
  const tmp = path.join(os.tmpdir(), `cm_seed_${id}.jpg`);
  execFileSync(ffmpeg, ['-y', '-i', path.join(process.cwd(), 'art', `${id}.png`), '-vf', 'scale=1280:-2', '-q:v', '4', tmp], { stdio: 'ignore' });
  const dataUrl = 'data:image/jpeg;base64,' + fs.readFileSync(tmp).toString('base64');
  const j = await kie('/api/file-base64-upload', {
    method: 'POST', key, base: UPLOAD_HOST,
    body: { base64Data: dataUrl, uploadPath: 'images/cm-omni', fileName: `art_${id}.jpg` },
  });
  const url = j?.data?.downloadUrl;
  if (!url) throw new Error(`upload: no downloadUrl (${JSON.stringify(j).slice(0, 160)})`);
  return url;
}

async function i2v(imageUrl, prompt, durSecs, key) {
  const duration = durSecs > 11 ? '15' : (durSecs > 6 ? '10' : '5');
  const created = await kie('/jobs/createTask', {
    method: 'POST', key,
    body: { model: I2V_MODEL, input: { prompt, image_urls: [imageUrl], duration, resolution: '1080p', nsfw_checker: false } },
  });
  const taskId = created?.data?.taskId;
  if (!taskId) throw new Error(`no taskId (${JSON.stringify(created).slice(0, 160)})`);

  const deadline = 12 * 60 * 1000; let waited = 0;
  for (;;) {
    await sleep(6000); waited += 6000;
    const info = await kie(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { key });
    const st = info?.data?.state;
    if (st === 'success') {
      let rj = info.data.resultJson; if (typeof rj === 'string') { try { rj = JSON.parse(rj); } catch {} }
      const url = rj?.resultUrls?.[0];
      if (!url) throw new Error(`success but no resultUrls: ${info.data.resultJson}`);
      const v = await fetch(url); if (!v.ok) throw new Error(`download HTTP ${v.status}`);
      return { buf: Buffer.from(await v.arrayBuffer()), duration };
    }
    if (st === 'fail') throw new Error(`task failed: ${info.data.failMsg || info.data.failCode || 'unknown'}`);
    if (waited > deadline) throw new Error(`timed out (last state: ${st})`);
  }
}

(async () => {
  if (!todo.length) { console.log('[i2v] no art beats.'); return; }
  const secs = todo.reduce((a, b) => a + Math.min(15, Math.max(5, Math.ceil(durations[b.id] || 5))), 0);
  guardSpend({ action: `Image-to-video ${todo.length} clip(s) via ${I2V_MODEL}`, units: secs, unitCost: 0.05 });
  const key = omniKey();
  console.log(`[i2v] model = ${I2V_MODEL}`);
  for (const b of todo) {
    process.stdout.write(`[i2v] ${b.id} (${b.mode}) uploading … `);
    try {
      const url = await uploadArt(b.id, key);
      const prompt = ((MOTION[b.id] || DEFAULT_MOTION) + STYLE_LOCK);
      process.stdout.write('generating … ');
      const { buf, duration } = await i2v(url, prompt, Math.ceil(durations[b.id] || 5), key);
      fs.writeFileSync(path.join(OUT, `${b.id}.mp4`), buf);
      console.log(`ok (${duration}s, ${(buf.length / 1024 / 1024).toFixed(1)} MB) -> clips/${b.id}.mp4`);
    } catch (e) { console.log(`FAILED: ${e.message}`); process.exitCode = 1; }
  }
  console.log('\n[i2v] done. Eyeball each clip; re-run one with ART_IDS=07 node generate-lesson-video-omni.js --yes');
})();
