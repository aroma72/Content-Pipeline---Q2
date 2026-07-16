'use strict';
/*
 * generate-lesson-art-omni.js — same as generate-lesson-art.js but visuals come
 * from kie.ai "omni" (Nano Banana 2 = Gemini 3.1 Flash Image) instead of Imagen.
 * Everything else in the pipeline (segment, TTS, render, stitch) is unchanged.
 *
 * Model: MODELS.omni (env OMNI_MODEL, default nano-banana-2).
 * Key:   KIE_API_KEY (32-char kie.ai hex key).
 * Flow:  createTask -> poll recordInfo -> download resultUrls[0] -> art/<id>.png
 * Cost:  guarded — no spend without --yes / CONFIRM_SPEND=1.
 * Output: art/<id>.png  (same clean-hero rules; suffix only on ali/cutout beats)
 */
const fs = require('fs');
const path = require('path');
const { omniKey, guardSpend, MODELS, COST, KIE_BASE } = require('./lib/config');

const beats = require('./beats.js');
const OUT = path.join(process.cwd(), 'art');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CLEAN_HERO_SUFFIX =
  ' — flat editorial illustration, single subject centered and standing, plain flat cream ' +
  'background (#F5F1E8) filling the whole frame, any props float detached and never touch the ' +
  'subject, NO desk, NO furniture, NO scenery, NO ground line, NO cast shadow, NO dark or navy ' +
  'fill anywhere, no border, no text.';

const artBeats = beats.filter((b) => (b.mode === 'ali' || b.mode === 'scene') && b.art);
const onlyIds = (process.env.ART_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const todo = onlyIds.length ? artBeats.filter((b) => onlyIds.includes(b.id)) : artBeats;

async function kie(pathname, { method = 'GET', key, body } = {}) {
  const res = await fetch(`${KIE_BASE}${pathname}`, {
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

// createTask -> poll until success -> return the first result URL
async function omniImage(prompt, key, model) {
  const created = await kie('/jobs/createTask', {
    method: 'POST', key,
    body: { model, input: { prompt, aspect_ratio: '16:9', resolution: '2K', output_format: 'png' } },
  });
  const taskId = created?.data?.taskId || created?.data?.task_id;
  if (!taskId) throw new Error(`no taskId in createTask response: ${JSON.stringify(created).slice(0, 200)}`);

  const deadline = 5 * 60 * 1000; // 5 min per image
  let waited = 0;
  for (;;) {
    await sleep(4000); waited += 4000;
    const info = await kie(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { key });
    const st = info?.data?.state;
    if (st === 'success') {
      let rj = info.data.resultJson;
      if (typeof rj === 'string') { try { rj = JSON.parse(rj); } catch {} }
      const url = rj?.resultUrls?.[0] || rj?.resultUrls;
      if (!url) throw new Error(`success but no resultUrls: ${info.data.resultJson}`);
      const img = await fetch(url);
      if (!img.ok) throw new Error(`download HTTP ${img.status}`);
      return Buffer.from(await img.arrayBuffer());
    }
    if (st === 'fail') throw new Error(`task failed: ${info.data.failMsg || info.data.failCode || 'unknown'}`);
    if (waited > deadline) throw new Error(`timed out after ${Math.round(waited / 1000)}s (last state: ${st})`);
  }
}

(async () => {
  if (!todo.length) { console.log('[omni] no ali/scene beats with `art`.'); return; }
  guardSpend({ action: `Generate ${todo.length} image(s) via kie omni (${MODELS.omni})`, units: todo.length, unitCost: COST.imagePerImage });
  const key = omniKey();
  console.log(`[omni] model = ${MODELS.omni}  (kie.ai)`);
  for (const b of todo) {
    const finalPrompt = (b.mode === 'ali') ? (b.art + CLEAN_HERO_SUFFIX) : b.art;
    process.stdout.write(`[omni] ${b.id} (${b.mode}) … `);
    try {
      const png = await omniImage(finalPrompt, key, MODELS.omni);
      fs.writeFileSync(path.join(OUT, `${b.id}.png`), png);
      console.log(`ok (${(png.length / 1024).toFixed(0)} KB) -> art/${b.id}.png`);
    } catch (e) { console.log(`FAILED: ${e.message}`); process.exitCode = 1; }
  }
  console.log('\n[omni] done. Eyeball each PNG; regenerate any that will not cut clean (ART_IDS=03 node generate-lesson-art-omni.js --yes).');
})();
