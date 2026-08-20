'use strict';
/*
 * generate-lesson-art-omni.js — art for every ali/scene beat via kie.ai "omni"
 * (Nano Banana 2 = Gemini 3.1 Flash Image), with CHARACTER-CONSISTENT seeding.
 *
 * Why this variant: the plain omni/Imagen generators are text-to-image only, so
 * "Ali" drifts into a different man every beat (the exact defect the build-note
 * warns about). Here we:
 *   1. Generate ONE locked Ali reference sheet (art/_ref.png) from beats.refPrompt.
 *   2. Upload it to kie's file host and seed it into EVERY other beat via the
 *      reference-image input, plus an identity-lock instruction — so the same face,
 *      skin tone, hair and teal shirt appear throughout, in the same flat style.
 *
 * Robustness: reference seeding is best-effort. If a request that carries the
 * reference fails (e.g. a field-name mismatch in the model schema), we retry the
 * SAME prompt WITHOUT the reference so we never lose a beat's image. The field name
 * defaults to `image_input` (per docs.kie.ai) and can be overridden with REF_FIELD.
 *
 * Model:  MODELS.omni (env OMNI_MODEL, default nano-banana-2).
 * Key:    GEMINI_OMNI_API_KEY / KIE_API_KEY (kie.ai).
 * Cost:   guarded — no spend without --yes / CONFIRM_SPEND=1.  ~$0.04/image.
 * Env:    NO_REF=1 to disable seeding · REF_FIELD=image_urls to switch the field ·
 *         ART_IDS=03,07 to (re)generate only some beats.
 * Output: art/<id>.png (+ art/_ref.png).  16:9, 2K, png. Clean-hero suffix on ali beats.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { omniKey, guardSpend, MODELS, COST, KIE_BASE } = require('./lib/config');

const beats = require('./beats.js');
const OUT = path.join(process.cwd(), 'art');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const UPLOAD_HOST = 'https://kieai.redpandaai.co'; // kie's file host (api.kie.ai 404s for uploads)
const REF_FIELD = process.env.REF_FIELD || 'image_input'; // per docs.kie.ai nano-banana-2
const USE_REF = process.env.NO_REF !== '1';

const CLEAN_HERO_SUFFIX =
  ' — flat editorial illustration, single subject centered and standing, plain flat cream ' +
  'background (#F5F1E8) filling the whole frame, any props float detached and never touch the ' +
  'subject, NO desk, NO furniture, NO scenery, NO ground line, NO cast shadow, NO dark or navy ' +
  'fill anywhere, no border, no text.';
const IDENTITY_LOCK =
  ' Use the SAME person as the reference image: identical face, warm medium-brown skin tone, ' +
  'short neat black hair, clean-shaven, and the same teal collared shirt; keep the exact same ' +
  'flat 2D vector art style and warm cream palette as the reference.';

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

// createTask -> poll recordInfo -> download first result URL. `refs` = array of ref image URLs.
async function omniImage(prompt, key, model, refs) {
  const input = { prompt, aspect_ratio: '16:9', resolution: '2K', output_format: 'png' };
  if (refs && refs.length) input[REF_FIELD] = refs;
  const created = await kie('/jobs/createTask', { method: 'POST', key, body: { model, input } });
  const taskId = created?.data?.taskId || created?.data?.task_id;
  if (!taskId) throw new Error(`no taskId in createTask response: ${JSON.stringify(created).slice(0, 200)}`);

  const deadline = 5 * 60 * 1000; let waited = 0;
  for (;;) {
    await sleep(4000); waited += 4000;
    const info = await kie(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { key });
    const st = info?.data?.state;
    if (st === 'success') {
      let rj = info.data.resultJson;
      if (typeof rj === 'string') { try { rj = JSON.parse(rj); } catch {} }
      const url = (rj?.resultUrls && rj.resultUrls[0]) || rj?.resultUrls;
      if (!url) throw new Error(`success but no resultUrls: ${info.data.resultJson}`);
      const img = await fetch(url);
      if (!img.ok) throw new Error(`download HTTP ${img.status}`);
      return Buffer.from(await img.arrayBuffer());
    }
    if (st === 'fail') throw new Error(`task failed: ${info.data.failMsg || info.data.failCode || 'unknown'}`);
    if (waited > deadline) throw new Error(`timed out after ${Math.round(waited / 1000)}s (last state: ${st})`);
  }
}

// upload a local PNG (downscaled JPEG) to kie's file host, return a public URL.
async function uploadImage(localPath, key, name) {
  const tmp = path.join(os.tmpdir(), `ev01_${name}.jpg`);
  execFileSync(ffmpeg, ['-y', '-i', localPath, '-vf', 'scale=1024:-2', '-q:v', '4', tmp], { stdio: 'ignore' });
  const dataUrl = 'data:image/jpeg;base64,' + fs.readFileSync(tmp).toString('base64');
  const j = await kie('/api/file-base64-upload', {
    method: 'POST', key, base: UPLOAD_HOST,
    body: { base64Data: dataUrl, uploadPath: 'images/ev01', fileName: `${name}.jpg` },
  });
  const url = j?.data?.downloadUrl;
  if (!url) throw new Error(`upload: no downloadUrl (${JSON.stringify(j).slice(0, 160)})`);
  return url;
}

// generate one image with best-effort reference seeding; falls back to no-ref on error.
async function genBeat(finalPrompt, key, refUrl) {
  if (refUrl) {
    try {
      return { buf: await omniImage(finalPrompt + IDENTITY_LOCK, key, MODELS.omni, [refUrl]), seeded: true };
    } catch (e) {
      process.stdout.write(`(ref failed: ${e.message.slice(0, 60)}; retrying no-ref) `);
    }
  }
  return { buf: await omniImage(finalPrompt, key, MODELS.omni, []), seeded: false };
}

(async () => {
  if (!todo.length) { console.log('[omni] no ali/scene beats with `art`.'); return; }
  // +1 unit for the reference sheet when we need to build it.
  const refPath = path.join(OUT, '_ref.png');
  const needRef = USE_REF && !fs.existsSync(refPath);
  guardSpend({
    action: `omni (${MODELS.omni}) ${todo.length} image(s)${needRef ? ' + 1 Ali reference' : ''}`,
    units: todo.length + (needRef ? 1 : 0), unitCost: COST.imagePerImage,
  });
  const key = omniKey();
  console.log(`[omni] model=${MODELS.omni}  ref=${USE_REF ? `on (${REF_FIELD})` : 'off'}`);

  // 1) lock the Ali reference sheet (text-to-image, no seed) then upload it.
  let refUrl = null;
  if (USE_REF) {
    if (needRef) {
      process.stdout.write('[omni] _ref (Ali reference sheet) … ');
      try {
        const buf = await omniImage(beats.refPrompt, key, MODELS.omni, []);
        fs.writeFileSync(refPath, buf);
        console.log(`ok -> art/_ref.png`);
      } catch (e) { console.log(`FAILED: ${e.message}`); process.exitCode = 1; }
    }
    if (fs.existsSync(refPath)) {
      try { refUrl = await uploadImage(refPath, key, '_ref'); console.log('[omni] reference uploaded; seeding all beats.'); }
      catch (e) { console.log(`[omni] reference upload failed (${e.message.slice(0, 80)}); continuing text-only.`); }
    }
  }

  // 2) every beat, seeded from the reference.
  for (const b of todo) {
    const finalPrompt = (b.mode === 'ali') ? (b.art + CLEAN_HERO_SUFFIX) : b.art;
    process.stdout.write(`[omni] ${b.id} (${b.mode}) … `);
    try {
      const { buf, seeded } = await genBeat(finalPrompt, key, refUrl);
      fs.writeFileSync(path.join(OUT, `${b.id}.png`), buf);
      console.log(`ok (${(buf.length / 1024).toFixed(0)} KB${seeded ? ', seeded' : ''}) -> art/${b.id}.png`);
    } catch (e) { console.log(`FAILED: ${e.message}`); process.exitCode = 1; }
  }
  console.log('\n[omni] done. Eyeball each PNG; regenerate one with  ART_IDS=07 node generate-lesson-art-omni.js --yes');
})();
