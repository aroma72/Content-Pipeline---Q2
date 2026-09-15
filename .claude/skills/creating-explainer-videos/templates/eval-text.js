'use strict';
/*
 * eval-text.js — grammar / clarity eval on all human-readable text in a video (spoken
 * narration + on-screen cards/infographics/chat). An LLM judge (gemini-2.5-flash) flags
 * ONLY genuine grammar errors or phrasings a viewer would misread — it ignores
 * intentional fragments, headings, UI labels and code. Guards defects like a dropped
 * "that" in "…proof one change helped". Exits non-zero if any issue is found, so text is
 * fixed before a video is called done.
 *   node eval-text.js        (writes eval-text-results.md; prints issues)
 */
const fs = require('fs');
const { geminiKey } = require('./lib/config');
const beats = require('./beats.js');
const JUDGE = process.env.JUDGE_MODEL || 'gemini-2.5-flash';
const key = geminiKey();

// collect human-language strings; skip code (editor lines, tree, terminal), art prompts, ids.
const SKIP_KEYS = new Set(['art', 'editor', 'tree', 'terminal', 'id', 'mode', 'tpl', 'lang', 'indent', 'tone', 'hi', 'role', 'tag', 'active', 'name']);
// Text the viewer HEARS and text the viewer READS are judged by different rules,
// so which one a snippet is has to survive collection. It did not: the key was
// passed to walk() and then dropped, leaving the judge a flat list in which
// narration and a drawn card look identical. It duly applied page typography to
// speech -- demanding quotation marks nobody can hear, and digits in place of
// the spelled-out numbers the speech engine needs -- and failed a finished video
// for it.
const strings = new Map();   // text -> 'spoken' | 'shown'
function walk(v, key, spoken) {
  if (v == null) return;
  if (typeof v === 'string') {
    const t = v.trim();
    // keep natural-language-ish text; drop pure code/symbols/very short tokens/numbers
    if (t.length >= 4 && /[a-z]/i.test(t) && !/^[\w./-]+\(.*\)$/.test(t) && !/[{};]$/.test(t)) {
      // A line that is both spoken and drawn is judged as drawn: the stricter of
      // the two, because it really is on screen where typography is visible.
      if (!(spoken && strings.get(t) === 'shown')) strings.set(t, spoken ? 'spoken' : 'shown');
    }
    return;
  }
  if (Array.isArray(v)) { v.forEach((x) => walk(x, key, spoken)); return; }
  if (typeof v === 'object') { for (const k of Object.keys(v)) if (!SKIP_KEYS.has(k)) walk(v[k], k, spoken); }
}
for (const b of beats) {
  walk(b.vo, 'vo', true);            // heard, never seen
  walk(b.cap, 'cap', false);
  walk(b.card, 'card', false);
  walk(b.info, 'info', false);
  if (b.screen && b.screen.chat) walk(b.screen.chat, 'chat', false);
  if (b.overlay) walk(b.overlay, 'overlay', false);
}
const items = [...strings.keys()];
const labelled = [...strings].map(([text, kind]) => ({ kind, text }));

const PROMPT =
  'You are a copy editor for a short educational video. Below is a JSON array of snippets, each ' +
  'tagged "spoken" or "shown".\n\n' +
  'THIS DISTINCTION DECIDES WHAT IS AN ERROR:\n' +
  '  "spoken" = narration read aloud by a speech engine. The viewer HEARS it and never sees it. ' +
  'Judge it by ear only. Punctuation is inaudible, so NEVER flag quotation marks around direct ' +
  'speech or around a word being discussed, and never flag capitalisation. Numbers are spelled ' +
  'out ON PURPOSE so the speech engine says them correctly: "fourteen out of twenty" and "four ' +
  'fifteen" are CORRECT and must never be flagged, not even as a nit. Regional usage such as ' +
  '"ring her" for "call her" is correct.\n' +
  '  "shown" = text drawn on screen. The viewer READS it, so typography counts normally.\n\n' +
  'Classify each problem you find by severity:\n' +
  '  "error" = a GENUINE grammatical mistake a professional editor would mark WRONG (subject–verb ' +
  'disagreement, a missing/dropped word that breaks the sentence, wrong tense, a real typo). ' +
  'Example error: "proof one change helped" (dropped "that").\n' +
  '  "nit"   = merely improvable style/clarity/word-choice that is still grammatically correct.\n' +
  'DO NOT flag at all: intentional sentence fragments, headings/labels, imperative instructions, ' +
  'idioms and deliberate voice (e.g. "the flow your users can\'t lose"), code, product names, or ' +
  'punctuation taste. Be conservative: when unsure, do not flag. Return STRICT JSON only: ' +
  '{"issues":[{"text":"<snippet>","severity":"error"|"nit","problem":"<one sentence>","suggestion":"<fix>"}]}. ' +
  'Empty array if all fine. The "text" you return must be the snippet text, without its tag.' +
  '\n\nSNIPPETS:\n' + JSON.stringify(labelled, null, 0);

(async () => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${JUDGE}:generateContent`;
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }),
  });
  if (!res.ok) { console.error('[eval-text] judge HTTP', res.status, (await res.text()).slice(0, 160)); process.exitCode=1;return; }
  const j = await res.json();
  const txt = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  let issues = [];
  try { issues = (JSON.parse(txt).issues) || []; } catch { console.error('[eval-text] unparseable judge output:', txt.slice(0, 200)); process.exitCode=1;return; }

  const errors = issues.filter((i) => i.severity === 'error');
  const nits = issues.filter((i) => i.severity !== 'error');
  const md = ['# eval-text-results — grammar / clarity', '', `Judge: ${JUDGE}. Reviewed ${items.length} snippets. ${errors.length} error(s), ${nits.length} nit(s).`, ''];
  const row = (it) => `| ${it.severity || 'nit'} | ${(it.text || '').replace(/\|/g, '/')} | ${(it.problem || '').replace(/\|/g, '/')} | ${(it.suggestion || '').replace(/\|/g, '/')} |`;
  if (issues.length) { md.push('| severity | text | problem | suggestion |', '|--|--|--|--|', ...issues.map(row)); }
  else md.push('**No issues — all text reads cleanly.**');
  fs.writeFileSync('eval-text-results.md', md.join('\n'));
  for (const it of errors) console.log(`  ❌ ERROR "${it.text}"\n     ${it.problem}\n     → ${it.suggestion}`);
  for (const it of nits) console.log(`  · nit  "${it.text}" — ${it.suggestion}`);
  if (errors.length) { console.log(`\n[eval-text] ${errors.length} grammar ERROR(s) — FAIL, fix before shipping (${nits.length} nits advisory).`); process.exitCode = 1; return; }
  console.log(`\n[eval-text] ${items.length} snippets — no grammar errors${nits.length ? `, ${nits.length} style nit(s) noted` : ''}. PASS`);
})().catch((e) => { console.error('[eval-text] error:', e.message); process.exitCode = 1; });
