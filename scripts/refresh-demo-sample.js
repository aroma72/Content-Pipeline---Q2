'use strict';
/**
 * Capture a finished demo run as the committed worked example.
 *
 *   node scripts/refresh-demo-sample.js <jobId> [--base <url>]
 *
 * Reads a job that has been written, produced and published, and writes
 * server/lib/demo-sample.json -- the script, the checkpoint and the YouTube link
 * from ONE run, so the example cannot drift into three different videos stitched
 * together. Refuses a job that has not been published: a sample whose video does
 * not exist is the failure this file was added to prevent.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT = path.join(__dirname, '..', 'server', 'lib', 'demo-sample.json');
const BASE_DEFAULT = 'https://content-queen-production.up.railway.app';

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, (r) => {
      let b = '';
      r.on('data', (d) => { b += d; });
      r.on('end', () => {
        try { res(JSON.parse(b)); } catch (e) { rej(new Error(`${url} did not return JSON: ${b.slice(0, 200)}`)); }
      });
    }).on('error', rej);
  });
}

(async () => {
  const jobId = process.argv[2];
  if (!jobId) throw new Error('usage: node scripts/refresh-demo-sample.js <jobId> [--base <url>]');
  const bi = process.argv.indexOf('--base');
  const base = bi > 0 ? process.argv[bi + 1] : BASE_DEFAULT;

  const job = await get(`${base}/demo/make-video/${jobId}`);
  if (job.error) throw new Error(`${jobId}: ${job.message || job.error}`);

  const sc = job.script;
  if (!sc) throw new Error(`${jobId} has no script yet (status ${job.status})`);
  const yt = job.produce && job.produce.youtube;
  if (!yt || !yt.videoId) {
    throw new Error(`${jobId} is not published (status ${job.status}) -- the sample needs a video that exists`);
  }
  const cp = sc.checkpoint;
  if (!cp) throw new Error(`${jobId} has no checkpoint beat`);

  // Where the checkpoint sits, measured the way the API measures it.
  const beats = sc.beats || [];
  const idx = beats.findIndex((b) => b.mode === 'checkpoint');
  const before = beats.slice(0, idx).filter((b) => b.mode !== 'checkpoint').pop() || {};
  const after = beats.slice(idx + 1).find((b) => b.mode !== 'checkpoint') || {};

  // Per-beat length is measured during TTS and is not exposed on the job, so the
  // house average stands in. Stated here rather than implied: it is an estimate.
  const SPOKEN = 6.2;
  const INTRO = 2.6;
  const spokenBefore = beats.slice(0, idx).filter((b) => b.mode !== 'checkpoint').length;
  const lessonAt = Number((spokenBefore * SPOKEN).toFixed(3));

  const sample = {
    generatedAt: new Date().toISOString(),
    jobId,
    topic: job.topic,
    slug: sc.slug,
    title: sc.title,
    interpretation: sc.interpretation || null,
    slo: sc.slo || null,
    scenario: sc.scenario || null,
    gate: sc.gate || null,
    redrafts: sc.redrafts || 0,
    qa: (job.produce && job.produce.qa) || null,
    spendUsd: (job.produce && job.produce.spendUsd) || null,
    youtube: { videoId: yt.videoId, url: yt.url, privacyStatus: yt.privacyStatus },
    introOffsetSeconds: INTRO,
    lessonSeconds: Number((beats.filter((b) => b.mode !== 'checkpoint').length * SPOKEN).toFixed(3)),
    beats: beats.map((b) => ({ id: b.id, mode: b.mode, vo: b.vo || null })),
    checkpoint: {
      beatId: beats[idx].id,
      stem: cp.stem,
      options: cp.options,
      answer: cp.answer,
      explain: cp.explain,
      afterBeatId: before.id || null,
      beforeBeatId: after.id || null,
      lessonAtSeconds: lessonAt,
      atSeconds: Number((lessonAt + INTRO).toFixed(3)),
      timingNote: 'Beat lengths are measured during TTS and not exposed on the job, '
        + 'so this example uses the house average of 6.2s a beat. A real video\'s '
        + 'checkpoint API returns measured times.',
    },
  };

  fs.writeFileSync(OUT, JSON.stringify(sample, null, 2) + '\n');
  console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
  console.log(`  ${sample.title}`);
  console.log(`  ${sample.beats.length} beats · gate ${sample.gate} · ${sample.youtube.url}`);
  console.log(`  checkpoint at ${sample.checkpoint.atSeconds}s (beat ${sample.checkpoint.beatId})`);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
