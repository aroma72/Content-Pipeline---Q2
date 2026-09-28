'use strict';
/*
 * generate-broll.js — one square "snap" illustration per beat via kie nano-banana-2.
 * Output: broll/<id>.png (1:1). Cost guarded (~$0.04 each). Env ART_IDS=01,03 to redo some.
 */
const fs = require('fs');
const path = require('path');
const { omniKey, guardSpend, MODELS, COST, KIE_BASE } = require('./lib/config');
const broll = require('./broll.js');

const OUT = path.join(process.cwd(), 'broll');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const onlyIds = (process.env.ART_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const todo = onlyIds.length ? broll.filter((b) => onlyIds.includes(b.id)) : broll;

async function kie(pathname, { method = 'GET', key, body } = {}) {
  const ATTEMPTS = 6;
  let lastErr;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${KIE_BASE}${pathname}`, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const txt = await res.text();
      let j; try { j = JSON.parse(txt); } catch { j = null; }
      if (!res.ok) {
        if ((res.status === 429 || res.status >= 500) && attempt < ATTEMPTS) {
          lastErr = new Error(`HTTP ${res.status}`); await sleep(1500 * attempt); continue;
        }
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
      }
      if (j && j.code && j.code !== 200) throw new Error(`kie code ${j.code}: ${j.msg || txt.slice(0, 200)}`);
      return j;
    } catch (e) {
      lastErr = e;
      // retry transient network errors (fetch failed / ECONN / timeout / socket)
      if (/fetch failed|network|ECONN|ETIMEDOUT|EAI_AGAIN|socket|terminated/i.test(String(e.message)) && attempt < ATTEMPTS) {
        await sleep(1500 * attempt); continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function omniImage(prompt, key) {
  const created = await kie('/jobs/createTask', {
    method: 'POST', key,
    body: { model: MODELS.omni, input: { prompt, aspect_ratio: '1:1', resolution: '2K', output_format: 'png' } },
  });
  const taskId = created?.data?.taskId || created?.data?.task_id;
  if (!taskId) throw new Error(`no taskId: ${JSON.stringify(created).slice(0, 160)}`);
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
  guardSpend({ action: `omni b-roll ${todo.length} snap(s) (${MODELS.omni})`, units: todo.length, unitCost: COST.imagePerImage });
  const key = omniKey();
  for (const b of todo) {
    process.stdout.write(`[broll] ${b.id} … `);
    try {
      const buf = await omniImage(b.prompt, key);
      fs.writeFileSync(path.join(OUT, `${b.id}.png`), buf);
      console.log(`ok (${(buf.length / 1024).toFixed(0)} KB) -> broll/${b.id}.png`);
    } catch (e) { console.log(`FAILED: ${e.message}`); process.exitCode = 1; }
  }
})().catch((e) => { console.error(`[broll] FAILED: ${e.message}`); process.exit(1); });
