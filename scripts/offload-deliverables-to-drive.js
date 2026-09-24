#!/usr/bin/env node
'use strict';
/**
 * Move already-finished videos off the volume and onto Google Drive.
 *
 *   node scripts/offload-deliverables-to-drive.js                 dry run (default)
 *   node scripts/offload-deliverables-to-drive.js --yes            actually do it
 *   node scripts/offload-deliverables-to-drive.js --yes --limit 1  one lesson, to prove it works
 *   node scripts/offload-deliverables-to-drive.js --yes --id series/slug
 *   node scripts/offload-deliverables-to-drive.js --keep-working-dirs
 *
 * WHY THIS EXISTS SEPARATELY FROM THE PIPELINE HOOK
 *
 * The spine offloads each lesson as it finishes, which fixes the problem going
 * forward. It does nothing about the videos already sitting on the volume, and
 * those are the ones filling it right now. This is the one that gives the disk
 * back today.
 *
 * DRY RUN BY DEFAULT, deliberately. This deletes local video files, and a tool
 * whose default mode deletes things is a tool somebody eventually runs by
 * accident while trying to see what it would do.
 *
 * Every deletion still goes through drive-offload.js, so the ordering guarantee
 * holds here too: capture metadata, upload, verify Drive's own md5 against ours,
 * record, and only then reclaim. Nothing about --yes skips a verification step;
 * it only permits the writes.
 */

require('../orchestrator/lib/env').loadDotenv();

const deliverables = require('../orchestrator/lib/deliverables');
const driveOffload = require('../orchestrator/lib/drive-offload');
const gdrive = require('../orchestrator/lib/gdrive');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);
const mb = (b) => `${(b / 1e6).toFixed(1)}MB`;

(async () => {
  const apply = has('yes');
  const keepWorkingDirs = has('keep-working-dirs');
  const only = arg('id');
  const limit = Number(arg('limit', '0')) || 0;

  if (!gdrive.isConfigured()) {
    console.error('\nDrive is not configured.');
    console.error('  GDRIVE_REFRESH_TOKEN  -- run: node orchestrator/gdrive-auth.js');
    console.error('  GDRIVE_FOLDER_ID      -- the target Drive folder id');
    process.exitCode = 1;
    return;
  }

  const listed = deliverables.list();
  if (!listed.durable) {
    console.error('\nThe deliverable store is not a volume, so there is nothing here worth '
      + 'offloading -- these files do not survive a redeploy in the first place.');
    process.exitCode = 1;
    return;
  }

  let candidates = listed.items.filter((i) => i.videoLocal && !i.saved2drive);
  if (only) candidates = candidates.filter((i) => i.id === only);
  if (limit) candidates = candidates.slice(0, limit);

  console.log(`\nstore: ${listed.items.length} lessons, ${mb(listed.bytes)} total, `
    + `${mb(listed.videoBytes || 0)} of it video`);
  console.log(`already on Drive: ${listed.offloadedCount || 0}`);
  console.log(`to offload: ${candidates.length}${only ? ` (filtered to ${only})` : ''}`
    + `${limit ? ` (limited to ${limit})` : ''}\n`);

  if (!candidates.length) {
    console.log('nothing to do.');
    return;
  }

  if (!apply) {
    let would = 0;
    for (const c of candidates) {
      console.log(`  would offload  ${c.id.padEnd(60)} ${mb(c.videoBytes)}`);
      would += c.videoBytes;
    }
    console.log(`\n  ${mb(would)} of video would move to Drive, plus whatever the render`);
    console.log('  working directories hold (art/, frames/, audio/, clips/, layers/, out/).');
    console.log('\nThis was a DRY RUN. Re-run with --yes to actually do it.');
    console.log('Start with:  --yes --limit 1');
    return;
  }

  let freed = 0;
  let done = 0;
  let failed = 0;
  for (const c of candidates) {
    const [series, ...rest] = c.id.split('/');
    const slug = rest.join('/');
    process.stdout.write(`  ${c.id} ... `);
    const res = await driveOffload.offload({
      series, slug, keepWorkingDirs,
      log: (m) => process.stdout.write(`\n      ${m}`),
    });
    if (res.ok) {
      done += 1;
      freed += res.freedBytes || 0;
      console.log(`\n      OK -- freed ${mb(res.freedBytes || 0)}\n`);
    } else {
      failed += 1;
      // Loud, and it keeps going. One lesson that cannot be offloaded (a revoked
      // token, an md5 mismatch) must not stop the other forty from freeing space,
      // and every skip has left its own file exactly where it was.
      console.log(`\n      SKIPPED -- ${res.skipped}\n`);
    }
  }

  console.log(`\noffloaded ${done}, skipped ${failed}, freed ${mb(freed)}`);
  if (failed) console.log('every skipped lesson still has its local copy -- nothing was lost.');
})().catch((e) => {
  console.error(`\n${e.stack || e.message}\n`);
  process.exitCode = 1;
});
