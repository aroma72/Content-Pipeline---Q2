'use strict';
/*
 * generate-avatar.js — the ONE girl still that drives the whole video.
 * kie.ai nano-banana-2 (Gemini 3.1 Flash Image), 16:9, front-facing, no baked text.
 * Output: art/girl.png.  Cost guarded (~$0.04). Re-run with --yes to regenerate.
 */
const fs = require('fs');
const path = require('path');
const { omniKey, guardSpend, MODELS, COST, KIE_BASE } = require('./lib/config');
const script = require('./script.js');

const OUT = path.join(process.cwd(), 'art');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function omniImage(prompt, key) {
  const created = await kie('/jobs/createTask', {
    method: 'POST', key,
    body: { model: MODELS.omni, input: { prompt, aspect_ratio: '16:9', resolution: '2K', output_format: 'png' } },
  });
  const taskId = created?.data?.taskId || created?.data?.task_id;
  if (!taskId) throw new Error(`no taskId: ${JSON.stringify(created).slice(0, 200)}`);
  const deadline = 5 * 60 * 1000; let waited = 0;
  for (;;) {
    await sleep(4000); waited += 4000;
    const info = await kie(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { key });
    const st = info?.data?.state;
    if (st === 'success') {
      let rj = info.data.resultJson; if (typeof rj === 'string') { try { rj = JSON.parse(rj); } catch {} }
      const url = (rj?.resultUrls && rj.resultUrls[0]) || rj?.resultUrls;
      if (!url) throw new Error(`success but no resultUrls: ${info.data.resultJson}`);
      const img = await fetch(url); if (!img.ok) throw new Error(`download HTTP ${img.status}`);
      return Buffer.from(await img.arrayBuffer());
    }
    if (st === 'fail') throw new Error(`task failed: ${info.data.failMsg || info.data.failCode || 'unknown'}`);
    if (waited > deadline) throw new Error(`timed out (last state: ${st})`);
  }
}

(async () => {
  guardSpend({ action: `omni girl still (${MODELS.omni})`, units: 1, unitCost: COST.imagePerImage });
  const key = omniKey();
  const prompt = script.avatarPrompt + script.background;
  process.stdout.write('[art] generating girl still … ');
  const buf = await omniImage(prompt, key);
  fs.writeFileSync(path.join(OUT, 'girl.png'), buf);
  console.log(`ok (${(buf.length / 1024).toFixed(0)} KB) -> art/girl.png`);
  console.log('[art] eyeball it: clear front-facing face, mouth closed, no text. Regenerate with --yes if off.');
})().catch((e) => { console.error(`[art] FAILED: ${e.message}`); process.exit(1); });
