'use strict';
/*
 * tts-avatar.js — Gemini TTS per script chunk -> audio/vo_<id>.wav (24k/16/mono),
 * warm female voice, one style directive, loudness-normalized, tight-trimmed.
 * Each chunk MUST stay under the infinitalk 15s audio cap — we assert it and
 * exit non-zero if any chunk is too long (so you can shorten that line).
 * Cost: pennies. Guarded — no spend without --yes / CONFIRM_SPEND=1.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { geminiKey, guardSpend, MODELS, COST } = require('./lib/config');
const script = require('./script.js');

const AUD = path.join(process.cwd(), 'audio');
fs.mkdirSync(AUD, { recursive: true });

const VOICE = process.env.TTS_VOICE || 'Aoede'; // warm, natural female
const STYLE = 'Say the following like a warm, confident, stylish young woman talking straight to ' +
  'camera — friendly and upbeat, natural conversational intonation, light emphasis on the key ' +
  'words, unhurried but energetic, never flat or robotic. Speak it naturally: ';
const TEMPERATURE = 0.85;
const MAX_SECS = 14.5; // stay safely under infinitalk's 15s cap

function pcmToWav(pcm, sampleRate = 24000, channels = 1, bits = 16) {
  const blockAlign = channels * (bits / 8), byteRate = sampleRate * blockAlign;
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20);
  h.writeUInt16LE(channels, 22); h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(byteRate, 28); h.writeUInt16LE(blockAlign, 32); h.writeUInt16LE(bits, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
function wavSeconds(file) {
  const b = fs.readFileSync(file);
  let off = 12, sr = 24000, blockAlign = 2, dataLen = 0;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4), sz = b.readUInt32LE(off + 4);
    if (id === 'fmt ') { sr = b.readUInt32LE(off + 12); blockAlign = b.readUInt16LE(off + 20) || 2; }
    else if (id === 'data') { dataLen = sz; break; }
    off += 8 + sz + (sz & 1);
  }
  return dataLen / (sr * blockAlign);
}
function ff(args) { execFileSync(ffmpeg, args, { stdio: ['ignore', 'ignore', 'inherit'] }); }

async function synth(text, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.tts}:generateContent`;
  const body = {
    contents: [{ parts: [{ text: STYLE + text }] }],
    generationConfig: {
      temperature: TEMPERATURE, responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
    },
  };
  const ATTEMPTS = 6; let lastErr;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const j = await res.json();
        const b64 = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
        if (!b64) throw new Error('TTS returned no audio: ' + JSON.stringify(j).slice(0, 200));
        return Buffer.from(b64, 'base64');
      }
      const txt = (await res.text()).slice(0, 200);
      if ((res.status === 429 || res.status >= 500) && attempt < ATTEMPTS) {
        lastErr = new Error(`HTTP ${res.status}: ${txt}`); await new Promise((r) => setTimeout(r, 1500 * attempt)); continue;
      }
      throw new Error(`TTS HTTP ${res.status}: ${txt}`);
    } catch (e) {
      lastErr = e;
      const retryable = /fetch failed|network|ECONN|ETIMEDOUT|EAI_AGAIN|socket|terminated|returned no audio/i.test(String(e.message));
      if (retryable && attempt < ATTEMPTS) { await new Promise((r) => setTimeout(r, 1500 * attempt)); continue; }
      throw e;
    }
  }
  throw lastErr;
}

(async () => {
  guardSpend({ action: `Synthesize ${script.length} TTS chunk(s)`, units: script.length, unitCost: COST.ttsPerClip });
  const key = geminiKey();
  const durations = {}; const tooLong = [];
  for (const c of script) {
    const rawPath = path.join(AUD, `raw_${c.id}.wav`);
    process.stdout.write(`[tts] ${c.id} synth … `);
    fs.writeFileSync(rawPath, pcmToWav(await synth(c.vo, key)));
    const out = path.join(AUD, `vo_${c.id}.wav`);
    // trim leading/trailing silence tight, loudness-normalize, keep 24k mono
    const trim = 'silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.04,' +
      'areverse,silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.04,areverse';
    ff(['-y', '-i', rawPath, '-filter:a', `${trim},loudnorm=I=-16:TP=-1.5:LRA=11`, '-ar', '24000', '-ac', '1', out]);
    try { fs.unlinkSync(rawPath); } catch {}
    const secs = +wavSeconds(out).toFixed(3);
    durations[c.id] = secs;
    if (secs > MAX_SECS) tooLong.push(`${c.id} (${secs}s)`);
    console.log(`ok -> ${secs}s`);
  }
  fs.writeFileSync(path.join(process.cwd(), 'durations.json'), JSON.stringify(durations, null, 2));
  const total = Object.values(durations).reduce((a, b) => a + b, 0);
  console.log(`\n[tts] ${script.length} chunks, ${total.toFixed(1)}s total.`);
  if (tooLong.length) {
    console.error(`[tts] ❌ over the ${MAX_SECS}s infinitalk cap: ${tooLong.join(', ')} — shorten those lines in script.js.`);
    process.exit(1);
  }
})().catch((e) => { console.error(`[tts] FAILED: ${e.message}`); process.exit(1); });
