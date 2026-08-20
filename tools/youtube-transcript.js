'use strict';
/*
 * youtube-transcript.js — "watch" a YouTube link by pulling its title, description,
 * chapters and full caption transcript (no API key). Lets the pipeline reference a
 * video's actual content/format.
 *
 * Usage:  node tools/youtube-transcript.js <url-or-id> [--lang en] [--json]
 * Output: human-readable title + description + timestamped transcript (default),
 *         or a JSON blob with --json.
 *
 * How: fetch the watch page, pull ytInitialPlayerResponse, read
 * captions.playerCaptionsTracklistRenderer.captionTracks[].baseUrl, fetch that track
 * as json3, flatten to text. Picks the requested lang, else English, else the first
 * track (prefers human captions over ASR when both exist).
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function videoId(u) {
  if (!u) return null;
  const m = String(u).match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(u) ? u : null;
}

async function get(url, asText = true) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', 'Cookie': 'CONSENT=YES+1',
      'Referer': 'https://www.youtube.com/', 'Origin': 'https://www.youtube.com',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.slice(0, 80)}`);
  return asText ? res.text() : res.json();
}

// brace-match a JSON object starting at the first "{" at/after `from`.
function extractJson(str, marker) {
  const at = str.indexOf(marker);
  if (at === -1) return null;
  let i = str.indexOf('{', at);
  if (i === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let j = i; j < str.length; j++) {
    const c = str[j];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; }
    else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { try { return JSON.parse(str.slice(i, j + 1)); } catch { return null; } } }
  }
  return null;
}

function pickTrack(tracks, lang) {
  if (!tracks || !tracks.length) return null;
  const byLang = (l) => tracks.filter((t) => (t.languageCode || '').startsWith(l));
  const human = (arr) => arr.find((t) => t.kind !== 'asr') || arr[0];
  if (lang) { const m = byLang(lang); if (m.length) return human(m); }
  const en = byLang('en'); if (en.length) return human(en);
  return human(tracks);
}

const fmt = (s) => { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, '0')}`; };

async function transcript(url, { lang, json } = {}) {
  const id = videoId(url);
  if (!id) throw new Error(`could not parse a video id from: ${url}`);
  const page = await get(`https://www.youtube.com/watch?v=${id}&hl=en&bpctr=9999999999&has_verified=1`);
  const pr = extractJson(page, 'ytInitialPlayerResponse');
  if (!pr) throw new Error('could not find ytInitialPlayerResponse (page may be a consent/bot wall)');

  const vd = pr.videoDetails || {};
  const meta = {
    id, title: vd.title || '', author: vd.author || '',
    lengthSeconds: +(vd.lengthSeconds || 0),
    description: vd.shortDescription || '',
  };

  const tracks = pr.captions &&
    pr.captions.playerCaptionsTracklistRenderer &&
    pr.captions.playerCaptionsTracklistRenderer.captionTracks;
  const track = pickTrack(tracks, lang);
  let lines = [];
  const decode = (s) => s
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#([0-9]+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ').trim();
  if (track) {
    const base = track.baseUrl;
    // try json3 first, then plain XML (timedtext), then srv1 — whichever returns content.
    for (const suffix of ['&fmt=json3', '', '&fmt=srv1']) {
      try {
        const body = await get(base + suffix, true);
        if (!body || !body.trim()) continue;
        if (suffix.includes('json3')) {
          const data = JSON.parse(body);
          for (const ev of (data.events || [])) {
            if (!ev.segs) continue;
            const text = decode(ev.segs.map((s) => s.utf8 || '').join(''));
            if (text) lines.push({ t: (ev.tStartMs || 0) / 1000, text });
          }
        } else {
          const re = /<text[^>]*\bstart="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
          let m;
          while ((m = re.exec(body))) { const text = decode(m[2]); if (text) lines.push({ t: +m[1], text }); }
        }
        if (lines.length) break;
        lines = [];
      } catch { lines = []; }
    }
  }
  meta.hasCaptions = !!lines.length;
  meta.captionLang = track ? track.languageCode + (track.kind === 'asr' ? ' (auto)' : '') : null;
  meta.lines = lines;
  return meta;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const url = args.find((a) => !a.startsWith('--'));
  const lang = (args[args.indexOf('--lang') + 1] && args.includes('--lang')) ? args[args.indexOf('--lang') + 1] : null;
  const json = args.includes('--json');
  transcript(url, { lang, json }).then((m) => {
    if (json) { console.log(JSON.stringify(m, null, 2)); return; }
    console.log(`TITLE: ${m.title}`);
    console.log(`CHANNEL: ${m.author}   LENGTH: ${fmt(m.lengthSeconds)}   CAPTIONS: ${m.captionLang || 'none'}`);
    console.log(`\nDESCRIPTION:\n${m.description || '(none)'}`);
    console.log(`\nTRANSCRIPT (${m.lines.length} lines):`);
    for (const l of m.lines) console.log(`[${fmt(l.t)}] ${l.text}`);
  }).catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
}

module.exports = { transcript, videoId };
