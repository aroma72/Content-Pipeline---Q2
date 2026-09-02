// Any i2v clip shorter than its beat leaves the video frozen on the last frame for the remainder
// (kie only returns 5s or 10s clips, so a 5.8s beat gets a 5s clip and stalls for 0.8s — that is the
// "lagging transition"). Retime those clips with setpts so each fills its beat plus a 0.25s margin.
// A 10-16% slowdown on a gentle motion is imperceptible, and this costs no credits.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
let fixed = 0, already = 0;

for (const d of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, d);
  if (!fs.existsSync(path.join(dir, 'beats.js'))) continue;
  if (!fs.existsSync(path.join(dir, 'clips'))) continue;
  let ff;
  try { ff = require(path.join(dir, 'node_modules', 'ffmpeg-static')); } catch (e) { continue; }
  const durs = JSON.parse(fs.readFileSync(path.join(dir, 'durations.json'), 'utf8'));

  const dur = (p) => {
    try { execFileSync(ff, ['-hide_banner', '-i', p], { stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (e) {
      const m = String(e.stderr || '').match(/Duration: (\d+):(\d+):([0-9.]+)/);
      if (m) return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
    }
    return 0;
  };

  for (const f of fs.readdirSync(path.join(dir, 'clips'))) {
    if (!f.endsWith('.mp4')) continue;
    const id = f.replace('.mp4', '');
    const beat = durs[id] || 0;
    const clip = path.join(dir, 'clips', f);
    const cd = dur(clip);
    if (!beat || !cd) continue;

    const target = beat + 0.25;
    if (cd >= target) { already++; continue; }

    const factor = target / cd;
    const tmp = clip.replace(/\.mp4$/, '_retimed.mp4');
    try {
      execFileSync(ff, ['-y', '-loglevel', 'error', '-i', clip,
        '-filter:v', 'setpts=PTS*' + factor.toFixed(4), '-r', '30', '-an',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', tmp], { stdio: 'ignore' });
    } catch (e) {
      console.log('  ' + d.replace('self-healing-', '') + ' ' + id + ': ffmpeg failed');
      continue;
    }
    const nd = dur(tmp);
    if (nd + 0.05 >= beat) {
      fs.rmSync(clip, { force: true });
      fs.renameSync(tmp, clip);
      fixed++;
      console.log('  ' + d.replace('self-healing-', '') + ' ' + id + ': ' + cd.toFixed(1) + 's -> ' +
        nd.toFixed(1) + 's  (beat ' + beat.toFixed(1) + 's)  slowed x' + factor.toFixed(2));
    } else {
      fs.rmSync(tmp, { force: true });
      console.log('  ' + d.replace('self-healing-', '') + ' ' + id + ': retime produced ' + nd.toFixed(1) + 's — left alone');
    }
  }
}
console.log('\nretimed ' + fixed + ' clip(s); ' + already + ' already long enough');
