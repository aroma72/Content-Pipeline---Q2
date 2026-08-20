'use strict';
/*
 * tts-lesson.js — per-beat Gemini TTS -> audio/vo_<id>.wav + durations.json.
 *
 * LAW 2 (one voice, one take) — all five pinned:
 *   (1) ONE fixed voice for every call
 *   (2) ONE identical style directive prefixed to every line
 *   (3) fixed low-ish temperature (~0.7)
 *   (4) Pass-2 tempo-to-median normalization (ffmpeg atempo, clamped ±10%)
 *   (5) loudness-normalize every clip to EBU R128 (loudnorm=I=-16:TP=-1.5:LRA=11)
 *
 * Also: writes an audio/vo_<id>.txt sidecar per clip; prunes clips for deleted
 * beats; retries transient 500s ~3x; falls back to a silence clip so a build
 * never hard-crashes. Durations are measured from the REAL final WAV (RIFF walk).
 *
 * Cost: pennies/clip. Guarded — no spend without --yes / CONFIRM_SPEND=1.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { geminiKey, guardSpend, MODELS, COST } = require('./lib/config');

const beats = require('./beats.js');
const AUD = path.join(process.cwd(), 'audio');
fs.mkdirSync(AUD, { recursive: true });

// (1) one voice  (2) one style directive — identical on EVERY call.
const VOICE = process.env.TTS_VOICE || 'Aoede'; // warm, natural, human
const STYLE = 'Say the following like a warm, friendly human mentor talking to a ' +
  'colleague — natural conversational intonation, gentle rhythm, light emphasis on the ' +
  'key words, unhurried but never flat or robotic. Speak it naturally: ';
const TEMPERATURE = 0.85; // (3) a touch more variation = more human

// ---- WAV helpers ------------------------------------------------------------
function pcmToWav(pcm, sampleRate = 24000, channels = 1, bits = 16) {
  const blockAlign = channels * (bits / 8);
  const byteRate = sampleRate * blockAlign;
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20);
  h.writeUInt16LE(channels, 22); h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(byteRate, 28); h.writeUInt16LE(blockAlign, 32); h.writeUInt16LE(bits, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
// Measure duration from a real WAV by walking RIFF chunks (never trust a fixed offset).
function wavSeconds(file) {
  const b = fs.readFileSync(file);
  let off = 12, sr = 24000, blockAlign = 2, dataLen = 0;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4);
    const sz = b.readUInt32LE(off + 4);
    if (id === 'fmt ') { sr = b.readUInt32LE(off + 12); blockAlign = b.readUInt16LE(off + 20) || 2; }
    else if (id === 'data') { dataLen = sz; break; }
    off += 8 + sz + (sz & 1);
  }
  return dataLen / (sr * blockAlign);
}
function ff(args) { execFileSync(ffmpeg, args, { stdio: ['ignore', 'ignore', 'inherit'] }); }

// ---- Gemini TTS -------------------------------------------------------------
async function synth(text, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.tts}:generateContent`;
  const body = {
    contents: [{ parts: [{ text: STYLE + text }] }],
    generationConfig: {
      temperature: TEMPERATURE,
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
    },
  };
  const ATTEMPTS = 6;
  let lastErr;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const j = await res.json();
        const b64 = j?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
        if (!b64) throw new Error('TTS returned no audio: ' + JSON.stringify(j).slice(0, 200));
        return Buffer.from(b64, 'base64'); // raw PCM 24k/16/mono
      }
      const txt = (await res.text()).slice(0, 200);
      // retry rate-limits + server errors; fail fast on other 4xx (e.g. 400 bad request)
      if ((res.status === 429 || res.status >= 500) && attempt < ATTEMPTS) {
        lastErr = new Error(`HTTP ${res.status}: ${txt}`); await new Promise(r => setTimeout(r, 1500 * attempt)); continue;
      }
      throw new Error(`TTS HTTP ${res.status}: ${txt}`);
    } catch (e) {
      lastErr = e;
      // CRITICAL: also retry THROWN errors — a network blip ("fetch failed") is a TypeError,
      // not an HTTP status, and used to fall straight through to a silent clip (the v7 bug).
      const retryable = /fetch failed|network|ECONN|ETIMEDOUT|EAI_AGAIN|socket|terminated|returned no audio/i.test(String(e.message));
      if (retryable && attempt < ATTEMPTS) { await new Promise(r => setTimeout(r, 1500 * attempt)); continue; }
      throw e;
    }
  }
  throw lastErr;
}
function silenceWav(seconds) {
  const n = Math.max(1, Math.round(24000 * seconds));
  return pcmToWav(Buffer.alloc(n * 2), 24000, 1, 16);
}

(async () => {
  guardSpend({ action: `Synthesize ${beats.length} TTS clip(s)`, units: beats.length, unitCost: COST.ttsPerClip });
  const key = geminiKey();

  // prune clips for beats that no longer exist
  const ids = new Set(beats.map(b => b.id));
  for (const f of fs.readdirSync(AUD)) {
    const m = f.match(/^vo_(.+)\.(wav|txt)$/);
    if (m && !ids.has(m[1])) { fs.unlinkSync(path.join(AUD, f)); console.log(`[tts] pruned stale ${f}`); }
  }

  // ---- Pass 1: synth raw clips (skip if sidecar text unchanged) ----
  const raw = [];
  const fellBack = []; // beats that could not be synthesized after all retries (SILENT)
  for (const b of beats) {
    const rawPath = path.join(AUD, `raw_${b.id}.wav`);
    const sidecar = path.join(AUD, `vo_${b.id}.txt`);
    const unchanged = fs.existsSync(rawPath) && fs.existsSync(sidecar) && fs.readFileSync(sidecar, 'utf8') === b.vo;
    if (!unchanged) {
      process.stdout.write(`[tts] ${b.id} synth … `);
      try { fs.writeFileSync(rawPath, pcmToWav(await synth(b.vo, key))); console.log('ok'); }
      catch (e) {
        const est = Math.max(1.2, b.vo.split(/\s+/).length * 0.42);
        fs.writeFileSync(rawPath, silenceWav(est));
        fellBack.push(b.id);
        console.log(`FALLBACK silence ${est.toFixed(1)}s (${e.message})`);
      }
      fs.writeFileSync(sidecar, b.vo);
    }
    raw.push({ b, rawPath, secs: wavSeconds(rawPath) });
  }
  // A silent fallback = a beat with NO speech. Never let this pass as a clean build:
  // surface it loudly and exit non-zero so the run is re-tried (this was the v7 defect).
  if (fellBack.length) {
    console.error(`\n[tts] ❌ ${fellBack.length} beat(s) fell back to SILENCE after retries: ${fellBack.join(', ')}`);
    console.error(`[tts] These beats have NO voiceover. Re-run 'node tts-lesson.js --yes' (network was flaky), then re-compile.`);
    process.exitCode = 1;
  }

  // ---- Pass 2a: tempo-to-median (chars/sec), clamp ±10% ----
  const rates = raw.map(r => r.secs / Math.max(8, r.b.vo.length)); // sec per char
  const median = [...rates].sort((a, b) => a - b)[Math.floor(rates.length / 2)];

  const durations = {};
  for (let i = 0; i < raw.length; i++) {
    const { b, rawPath } = raw[i];
    let factor = rates[i] / median;            // >1 => slower than median => speed up
    factor = Math.min(1.1, Math.max(0.9, factor));
    // human breathing pause after each sentence; a touch longer when the visual/mode changes
    const nb = raw[i + 1] && raw[i + 1].b;
    const pause = (!nb || nb.mode !== b.mode) ? 0.7 : 0.4;
    const out = path.join(AUD, `vo_${b.id}.wav`);
    // trim clip's own silence tight -> (4) atempo -> (5) loudnorm -> add a deliberate breathing pause
    const trim = 'silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.04,' +
      'areverse,silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.04,areverse';
    ff(['-y', '-i', rawPath,
      '-filter:a', `${trim},atempo=${factor.toFixed(4)},loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=${pause}`,
      '-ar', '24000', '-ac', '1', out]);
    durations[b.id] = +wavSeconds(out).toFixed(3);
    console.log(`[tts] ${b.id} tempo×${factor.toFixed(3)} +${pause}s pause -> ${durations[b.id]}s`);
  }
  // cleanup raw
  for (const { rawPath } of raw) { try { fs.unlinkSync(rawPath); } catch {} }

  fs.writeFileSync(path.join(process.cwd(), 'durations.json'), JSON.stringify(durations, null, 2));
  const total = Object.values(durations).reduce((a, b) => a + b, 0);
  console.log(`\n[tts] wrote durations.json — ${beats.length} beats, ${total.toFixed(1)}s total.`);
})();
