'use strict';
/*
 * generate-lipsync.js — drive the girl still with each VO chunk via kie.ai
 * infinitalk/from-audio (audio-driven talking avatar, real lip-sync).
 * Flow: upload girl.png once -> per chunk upload vo_<id>.wav -> createTask ->
 * poll -> download clips/<id>.mp4 (video WITH the driving audio baked in).
 * Cost: guarded — 720p infinitalk ≈ $0.06/s. No spend without --yes / CONFIRM_SPEND=1.
 * Env: RESOLUTION=480p|720p (default 720p) · CHUNK_IDS=01,03 to (re)do only some.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { omniKey, guardSpend, MODELS, COST, KIE_BASE, UPLOAD_HOST } = require('./lib/config');
const script = require('./script.js');

const OUT = path.join(process.cwd(), 'clips');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RESOLUTION = process.env.RESOLUTION || '720p';

const durations = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'durations.json'), 'utf8'));
const onlyIds = (process.env.CHUNK_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const todo = onlyIds.length ? script.filter((c) => onlyIds.includes(c.id)) : script;

const MOTION_PROMPT =
  'An elegant clean-girl-aesthetic fashion model with a sleek slicked-back low bun sitting at a ' +
  'stylish table, talking straight to the camera in a warm friendly way, natural lip movements ' +
  'synced to her speech, gentle head tilts, soft blinking, subtle graceful smiles and small hand ' +
  'gestures. Keep the exact same clean minimalist 2D illustration style, same character, static ' +
  'locked camera. No text.';

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

async function uploadFile(localPath, key, name, ext, ffArgs) {
  const tmp = path.join(os.tmpdir(), `fta_${name}.${ext}`);
  execFileSync(ffmpeg, ['-y', '-i', localPath, ...ffArgs, tmp], { stdio: 'ignore' });
  const mime = ext === 'jpg' ? 'image/jpeg' : 'audio/mpeg';
  const dataUrl = `data:${mime};base64,` + fs.readFileSync(tmp).toString('base64');
  const j = await kie('/api/file-base64-upload', {
    method: 'POST', key, base: UPLOAD_HOST,
    body: { base64Data: dataUrl, uploadPath: 'images/fta', fileName: `${name}.${ext}` },
  });
  const url = j?.data?.downloadUrl;
  if (!url) throw new Error(`upload: no downloadUrl (${JSON.stringify(j).slice(0, 160)})`);
  return url;
}

async function lipsync(imageUrl, audioUrl, key) {
  const created = await kie('/jobs/createTask', {
    method: 'POST', key,
    body: { model: MODELS.lipsync, input: { image_url: imageUrl, audio_url: audioUrl, prompt: MOTION_PROMPT, resolution: RESOLUTION } },
  });
  const taskId = created?.data?.taskId || created?.data?.task_id;
  if (!taskId) throw new Error(`no taskId (${JSON.stringify(created).slice(0, 160)})`);
  const deadline = (Number(process.env.LIPSYNC_DEADLINE_MIN) || 15) * 60 * 1000; let waited = 0;
  let pollErrs = 0; // tolerate transient network blips during polling — don't abandon a live task
  for (;;) {
    await sleep(6000); waited += 6000;
    let info;
    try { info = await kie(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { key }); }
    catch (e) {
      if (++pollErrs <= 20) { process.stdout.write(`(poll retry ${pollErrs}: ${e.message.slice(0, 40)}) `); continue; }
      throw new Error(`too many poll errors: ${e.message}`);
    }
    pollErrs = 0;
    const st = info?.data?.state;
    if (st === 'success') {
      let rj = info.data.resultJson; if (typeof rj === 'string') { try { rj = JSON.parse(rj); } catch {} }
      const url = rj?.resultUrls?.[0] || rj?.resultUrls;
      if (!url) throw new Error(`success but no resultUrls: ${info.data.resultJson}`);
      for (let dl = 1; dl <= 4; dl++) { // downloading can also blip
        try { const v = await fetch(url); if (!v.ok) throw new Error(`download HTTP ${v.status}`); return Buffer.from(await v.arrayBuffer()); }
        catch (e) { if (dl === 4) throw e; await sleep(3000); }
      }
    }
    if (st === 'fail') throw new Error(`task failed: ${info.data.failMsg || info.data.failCode || 'unknown'}`);
    if (waited > deadline) throw new Error(`timed out (last state: ${st})`);
  }
}

(async () => {
  if (!fs.existsSync(path.join(process.cwd(), 'art', 'girl.png'))) throw new Error('art/girl.png missing — run generate-avatar.js first.');
  const secs = todo.reduce((a, c) => a + (durations[c.id] || 12), 0);
  guardSpend({ action: `infinitalk lip-sync ${todo.length} chunk(s) @ ${RESOLUTION}`, units: Math.ceil(secs), unitCost: COST.lipsyncPerSec });
  const key = omniKey();

  process.stdout.write('[lipsync] uploading girl still … ');
  const imageUrl = await uploadFile(path.join(process.cwd(), 'art', 'girl.png'), key, 'girl', 'jpg', ['-vf', 'scale=1280:-2', '-q:v', '4']);
  console.log('ok');

  for (const c of todo) {
    process.stdout.write(`[lipsync] ${c.id} uploading audio … `);
    try {
      const audioUrl = await uploadFile(path.join(process.cwd(), 'audio', `vo_${c.id}.wav`), key, `vo_${c.id}`, 'mp3', ['-codec:a', 'libmp3lame', '-b:a', '128k']);
      process.stdout.write('lip-syncing … ');
      const buf = await lipsync(imageUrl, audioUrl, key);
      fs.writeFileSync(path.join(OUT, `${c.id}.mp4`), buf);
      console.log(`ok (${(buf.length / 1024 / 1024).toFixed(1)} MB) -> clips/${c.id}.mp4`);
    } catch (e) { console.log(`FAILED: ${e.message}`); process.exitCode = 1; }
  }
  console.log('\n[lipsync] done. Eyeball each clip; re-run one with  CHUNK_IDS=03 node generate-lipsync.js --yes');
})().catch((e) => { console.error(`[lipsync] FAILED: ${e.message}`); process.exit(1); });
