'use strict';
/*
 * generate-lesson-video-wan-t2v.js — FULLY WAN-GENERATED (realistic) visuals.
 * Each narrative beat becomes a cinematic Wan 2.6 TEXT-TO-VIDEO clip (no seed image).
 * Info/text beats (06,07b,08,11,12) are skipped — they keep our animated cards so the
 * teaching text stays legible. VO/captions/bumpers/music are added downstream unchanged.
 *
 * Output: clips/<id>.mp4  (overwrites; the flat-illustration i2v clips are backed up in clips_i2v/)
 * Cost:   guarded — wan 2.6 ~$0.05/s. no spend without --yes / CONFIRM_SPEND=1.
 */
const fs = require('fs');
const path = require('path');
const { omniKey, guardSpend, KIE_BASE } = require('./lib/config');

const durations = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'durations.json'), 'utf8'));
const OUT = path.join(process.cwd(), 'clips');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ALI = 'a young South Asian man in his late 20s named Ali, short neat black hair, light stubble, wearing a teal collared shirt and dark trousers';
const LOOK = ' Calm natural human eyes with a relaxed steady gaze and soft natural blinking at a normal rhythm, well-formed symmetrical eyes, no darting or twitching eyes. Warm cinematic lighting, shallow depth of field, natural realistic motion, high detail. Absolutely no on-screen text, no captions, no letters, no logos.';

// realistic text-to-video prompt per narrative beat
const PROMPTS = {
  '01': 'A modern ed-tech startup office; a small diverse team of colleagues gathered around a computer monitor, discussing a project together, warm morning light through large windows, candid natural motion.',
  '02': `${ALI}, standing confidently in a bright modern ed-tech office and smiling warmly toward the camera as colleagues work softly in the background; gentle slow camera push-in.`,
  '03': `${ALI} in a modern office, gesturing toward a large monitor that shows a new software application, looking hopeful while explaining it; natural hand gestures.`,
  '04': `${ALI} sitting at his office desk, clicking send on an email on his laptop, then leaning back to wait expectantly, glancing at the screen; quiet office.`,
  '05': `${ALI} at his desk looking slightly deflated and concerned, glancing around a quiet office where colleagues are not using the new tool; subdued reflective mood.`,
  '07': 'A young man with a small backpack walking steadily along a winding path that dips down into a lush green valley and rises toward a warm golden sunrise on the far side; wide cinematic landscape, gentle breeze, hopeful mood, natural walking motion.',
  '09': `${ALI} sitting across a small table, listening warmly and empathetically to a colleague who is speaking, nodding gently; both people fully in frame, natural conversation, bright office.`,
  '10': `${ALI} standing beside two colleagues at a desk, warmly guiding them as they learn new software on a computer together, everyone engaged and supportive; natural collaborative motion.`,
};

const onlyIds = (process.env.ART_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const ids = Object.keys(PROMPTS).filter((id) => !onlyIds.length || onlyIds.includes(id));

async function kie(pathname, { method = 'GET', key, body } = {}) {
  const res = await fetch(`${KIE_BASE}${pathname}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let j; try { j = JSON.parse(txt); } catch { j = null; }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
  if (j && j.code && j.code !== 200) throw new Error(`kie code ${j.code}: ${j.msg || txt.slice(0, 200)}`);
  return j;
}

async function t2v(prompt, durSecs, key) {
  const duration = durSecs > 11 ? '15' : (durSecs > 5.0 ? '10' : '5');
  const created = await kie('/jobs/createTask', {
    method: 'POST', key,
    body: { model: 'wan/2-6-text-to-video', input: { prompt, duration, resolution: '1080p', nsfw_checker: false } },
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
  const secs = ids.reduce((a, id) => a + ((durations[id] || 5) > 5 ? 10 : 5), 0);
  guardSpend({ action: `Wan text-to-video ${ids.length} realistic clip(s)`, units: secs, unitCost: 0.05 });
  const key = omniKey();
  console.log(`[wan-t2v] model wan/2-6-text-to-video · ${ids.length} clips`);
  for (const id of ids) {
    process.stdout.write(`[wan-t2v] ${id} generating … `);
    try {
      const { buf, duration } = await t2v(PROMPTS[id] + LOOK, Math.ceil(durations[id] || 5), key);
      fs.writeFileSync(path.join(OUT, `${id}.mp4`), buf);
      console.log(`ok (${duration}s, ${(buf.length / 1024 / 1024).toFixed(1)} MB) -> clips/${id}.mp4`);
    } catch (e) { console.log(`FAILED: ${e.message}`); process.exitCode = 1; }
  }
  console.log('\n[wan-t2v] done. Info/text beats keep our cards. Re-roll one: ART_IDS=05 node generate-lesson-video-wan-t2v.js --yes');
})();
