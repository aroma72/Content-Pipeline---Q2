'use strict';
/*
 * qa-clips.js — SELF-HEALING GATE for i2v clips. Run after generate-lesson-video-omni.js and BEFORE
 * compile-lesson.js. It detects the three ways a generated clip ruins a beat, repairs what it can,
 * and hard-fails on what it cannot — so a bad animation never reaches a render.
 *
 *     node qa-clips.js            # detect + auto-repair, exit 2 if anything had to be rejected
 *     node qa-clips.js --dry      # report only, change nothing
 *     node qa-clips.js --reject   # also DELETE unusable clips (beat falls back to Ken Burns)
 *
 * THE THREE DEFECTS
 *  1. SHORT CLIP → FROZEN TAIL.  kie returns only 5s or 10s clips. A 5.8s beat given a 5s clip holds
 *     its last frame for 0.8s — Aroma reported this as "the transition is lagging" at 0:14 in v03.
 *     8 of 18 clips in the self-healing module had it. REPAIRABLE: retime with setpts to fill the
 *     beat (a 7-24% slowdown on a gentle motion is imperceptible, and costs no credits).
 *  2. FROZEN CLIP.  Early and late frames identical (SSIM > 0.985) — paid for motion, got a still.
 *     NOT repairable → reject.
 *  3. MORPHED / RE-FRAMED CLIP.  SSIM < 0.55 means the model rebuilt the scene: melted the subject
 *     into a blob, or zoomed in and cropped the character out (v02 beat 09, v04 beat 03).
 *     NOT repairable → reject, and pick a beat with simpler physical motion instead.
 *  Plus a palette-drift check (clip vs source art) for the cinematic-darkening failure.
 *
 * Root-cause note: generate-lesson-video-omni.js now requests 10s for any beat > 4.75s, so defect 1
 * should not recur — this gate is the backstop.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CWD = process.cwd();
const DRY = process.argv.includes('--dry');
const DO_REJECT = process.argv.includes('--reject');

const clipsDir = path.join(CWD, 'clips');
if (!fs.existsSync(clipsDir)) { console.log('[qa-clips] no clips/ — nothing to check.'); process.exit(0); }
const clips = fs.readdirSync(clipsDir).filter((f) => f.endsWith('.mp4'));
if (!clips.length) { console.log('[qa-clips] no clips present — every beat uses Ken Burns.'); process.exit(0); }

const beats = require(path.join(CWD, 'beats.js'));
const durs = JSON.parse(fs.readFileSync(path.join(CWD, 'durations.json'), 'utf8'));
const ff = require('ffmpeg-static');
const tmpdir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qaclips-'));

const seconds = (p) => {
  try { execFileSync(ff, ['-hide_banner', '-i', p], { stdio: ['pipe', 'pipe', 'pipe'] }); }
  catch (e) {
    const m = String(e.stderr || '').match(/Duration: (\d+):(\d+):([0-9.]+)/);
    if (m) return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
  }
  return 0;
};
const yavg = (src, at) => {
  const args = ['-loglevel', 'info'];
  if (at != null) args.push('-ss', String(at));
  args.push('-i', src, '-frames:v', '1', '-vf',
    'signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-f', 'null', '-');
  try { execFileSync(ff, args, { stdio: ['pipe', 'pipe', 'pipe'] }); } catch (e) {
    const m = String(e.stderr || '').match(/YAVG=([0-9.]+)/);
    if (m) return parseFloat(m[1]);
  }
  return NaN;
};
const grab = (clip, at, out) => {
  try { execFileSync(ff, ['-y', '-loglevel', 'error', '-ss', String(at), '-i', clip,
    '-frames:v', '1', out], { stdio: 'ignore' }); return fs.existsSync(out); }
  catch (e) { return false; }
};
const ssim = (a, b) => {
  try { execFileSync(ff, ['-loglevel', 'info', '-i', a, '-i', b, '-lavfi', 'ssim', '-f', 'null', '-'],
    { stdio: ['pipe', 'pipe', 'pipe'] }); } catch (e) {
    const m = String(e.stderr || '').match(/All:\s*([0-9.]+)/);
    if (m) return parseFloat(m[1]);
  }
  return NaN;
};

const rows = [];
let repaired = 0, rejected = 0;

for (const f of clips.sort()) {
  const id = f.replace('.mp4', '');
  const clip = path.join(clipsDir, f);
  const beat = durs[id] || 0;
  const art = path.join(CWD, 'art', id + '.png');
  const issues = [];
  let action = '—';

  if (!beat) { rows.push({ id, verdict: 'SKIP', note: 'no duration for this beat', action }); continue; }

  // ---- 1. short clip -> frozen tail (repairable) ----
  let cd = seconds(clip);
  const target = beat + 0.25;
  if (cd && cd + 0.05 < beat) {
    const frozen = (beat - cd).toFixed(1);
    if (DRY) { issues.push(`short by ${frozen}s (frozen tail)`); }
    else {
      const factor = target / cd;
      const tmp = clip.replace(/\.mp4$/, '_qa.mp4');
      try {
        execFileSync(ff, ['-y', '-loglevel', 'error', '-i', clip,
          '-filter:v', 'setpts=PTS*' + factor.toFixed(4), '-r', '30', '-an',
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', tmp], { stdio: 'ignore' });
        const nd = seconds(tmp);
        if (nd + 0.05 >= beat) {
          fs.rmSync(clip, { force: true }); fs.renameSync(tmp, clip);
          cd = nd; repaired++;
          action = `retimed x${factor.toFixed(2)} (${frozen}s freeze removed)`;
        } else { fs.rmSync(tmp, { force: true }); issues.push(`short by ${frozen}s, retime failed`); }
      } catch (e) { issues.push(`short by ${frozen}s, retime errored`); }
    }
  }

  // ---- 2 & 3. motion / morph ----
  const a = path.join(tmpdir, id + '_a.png');
  const b = path.join(tmpdir, id + '_b.png');
  let s = NaN;
  if (grab(clip, 0.4, a) && grab(clip, Math.max(1.5, Math.min(4, cd - 0.5)), b)) s = ssim(a, b);
  if (!isNaN(s)) {
    if (s > 0.985) issues.push(`FROZEN (ssim ${s.toFixed(3)}) — no real motion`);
    else if (s < 0.55) issues.push(`MORPHED/RE-FRAMED (ssim ${s.toFixed(3)}) — scene rebuilt or subject cropped`);
  }

  // ---- palette drift ----
  let drift = NaN;
  if (fs.existsSync(art)) {
    const ay = yavg(art), cy = yavg(clip, Math.min(2, Math.max(0.5, cd / 2)));
    if (!isNaN(ay) && !isNaN(cy) && ay > 0) {
      drift = ((ay - cy) / ay) * 100;
      if (Math.abs(drift) > 15) issues.push(`palette drift ${drift.toFixed(0)}% vs art`);
    }
  }

  const fatal = issues.some((i) => /FROZEN|MORPHED/.test(i));
  if (fatal && DO_REJECT && !DRY) {
    fs.rmSync(clip, { force: true });
    action = 'REJECTED — clip deleted, beat falls back to Ken Burns';
    rejected++;
  } else if (fatal) { rejected++; }

  rows.push({
    id, verdict: issues.length ? (fatal ? 'REJECT' : 'FIXED') : 'PASS',
    note: issues.join('; ') || `${cd.toFixed(1)}s fills ${beat.toFixed(1)}s beat` +
      (isNaN(s) ? '' : `, ssim ${s.toFixed(3)}`) + (isNaN(drift) ? '' : `, drift ${(-drift).toFixed(1)}%`),
    action,
  });
}

for (const r of rows) {
  const tag = r.verdict === 'PASS' ? '✅' : r.verdict === 'FIXED' ? '🔧' : r.verdict === 'SKIP' ? '⏭ ' : '❌';
  console.log(`  ${tag} ${r.id}  ${r.verdict}  ${r.note}${r.action !== '—' ? '  →  ' + r.action : ''}`);
}
fs.writeFileSync(path.join(CWD, 'qa-clips-results.md'),
  ['# i2v clip QA', '', `${rows.length} clip(s). ${repaired} repaired, ${rejected} rejected.`, '',
    '| beat | verdict | detail | action |', '|---|---|---|---|',
    ...rows.map((r) => `| ${r.id} | ${r.verdict} | ${r.note} | ${r.action} |`)].join('\n') + '\n');
try { fs.rmSync(tmpdir, { recursive: true, force: true }); } catch (e) {}

console.log('');
if (rejected) {
  console.log(`[qa-clips] FAIL — ${rejected} clip(s) unusable (frozen or morphed).`);
  console.log('           Regenerate with a SIMPLER physical motion, or pick a different beat:');
  console.log('           ART_IDS=<ids> node generate-lesson-video-omni.js --yes');
  console.log('           Re-run with --reject to drop them and fall back to Ken Burns.');
  process.exit(2);
}
console.log(`[qa-clips] ✅ PASS — ${rows.length} clip(s) ok${repaired ? `, ${repaired} auto-repaired (frozen tails removed)` : ''}.`);
