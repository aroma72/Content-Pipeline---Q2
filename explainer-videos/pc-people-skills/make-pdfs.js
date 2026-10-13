#!/usr/bin/env node
'use strict';
/*
 * make-pdfs.js — render the P&C series scripts as review PDFs (Aroma reviews scripts as PDFs before
 * any voiceover spend). One PDF per video plus a combined one, into ./pdf/.
 *
 *   node make-pdfs.js c1w2-beyond-the-reaction c1w3-listen-then-ask c1w4-warm-but-fair
 *
 * Each page: title, SLOs, the models taught, the walk-throughs, then every beat (the spoken line, the
 * read's emotional cue, and what is on screen), with the checkpoint shown where the LMS pauses.
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require(path.join(__dirname, 'c1w1-your-role', 'node_modules', 'puppeteer'));

const META = {
  'c1w2-beyond-the-reaction': {
    title: 'Look Beyond the Reaction', week: 'Course 1 · Week 2',
    slos: ['1.3 Interpret a reaction as a signal of an underlying need, fear or pressure, without taking it personally or jumping to conclusions'],
    models: ['The Iceberg model of behaviour: the reaction is the tip; needs, fears and pressures sit below',
      'SCARF (David Rock, 2008): Status, Certainty, Autonomy, Relatedness, Fairness, taught as a practical lens rather than proven neuroscience',
      'In the moment: Pause → Probe → Pin → Respond'],
    walks: ['Certainty: a new joiner snaps at you over a laptop delay ("Am I set up to succeed?")',
      'Status: a senior employee goes quiet after a restructure announcement (the issue is status, not the change)'],
  },
  'c1w3-listen-then-ask': {
    title: 'Listen First, Then Ask', week: 'Course 1 · Week 3',
    slos: ['1.4 Demonstrate active listening: full attention, no interrupting, summarising and reflecting back',
      '1.5 Use open, probing and clarifying questions, and avoid leading or blaming ones'],
    models: ['RASA (Julian Treasure, TED 2011) for listening: Receive, Appreciate, Summarise, Ask',
      'OARS (Motivational Interviewing) for responding: Open questions, Affirmations, Reflections, Summaries',
      'The Question Funnel: Open → Probe → Close'],
    walks: ['Quick chat: "Can we have a quick chat?" about a travel form; the real issue (three months of late claims) surfaces after three questions',
      'Leading vs open: the same exit interview run twice, once with leading questions and once with OARS'],
  },
  'c1w4-warm-but-fair': {
    title: 'Warm but Fair', week: 'Course 1 · Week 4',
    slos: ['1.6 Respond with empathy while staying objective, separating facts, feelings and assumptions, across journey moments'],
    models: ['Empathy vs sympathy (Brené Brown, after Theresa Wiseman): "at least…" is the sympathy tell',
      'Ladder of Inference (Chris Argyris): What happened → What it means → Conclusion → Action, and how to climb back down',
      'GROW (Alexander, Fine & Whitmore): Goal, Reality, Options, Way forward'],
    walks: ['"The new hire is always late and doesn\'t care" → climbing down to the facts (Mondays, a new van route)',
      'An employee whose parent is in hospital → GROW, without promising what you don\'t control'],
  },
};

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
// a plain-English description of what is on screen, from the template + its data
function onScreen(info) {
  const d = info.data || {};
  switch (info.tpl) {
    case 'lfTitle': return `Title card: <b>${esc(d.text)}</b>, <i>${esc(d.sub)}</i>`;
    case 'lfIceberg': return `Iceberg: tip ${esc(d.tip)}${(d.below || []).length ? `; below the waterline: ${esc(d.below.join(', '))}` : ''}${d.alarm ? ' (an alarm pulses on the tip)' : ''}`;
    case 'lfModel': {
      const act = Array.isArray(d.active) ? d.active : (d.active >= 0 ? [d.active] : []);
      const parts = d.letters.map((l, i) => `${act.includes(i) ? '<b>' : ''}${esc(l)}${d.words && d.words[i] ? ' ' + esc(d.words[i]) : ''}${act.includes(i) ? '</b>' : ''}`);
      return `Model <b>${esc(d.title)}</b>: ${parts.join(' · ')}${d.note ? ` · on screen: ${esc(d.note)}` : ''}${d.credit ? ` <i>(${esc(d.credit)})</i>` : ''}`;
    }
    case 'lfFunnel': return `Question funnel: ${d.steps.map((s, i) => `${esc(s)}${d.questions && d.questions[i] ? ` "${esc(d.questions[i])}"` : ''}`).join(' → ')}`;
    case 'lfLadder': return `Ladder: ${d.rungs.map((r, i) => (d.active === i ? `<b>${esc(r)}</b>` : esc(r))).join(' → ')}${d.active === 'up' ? ' (climbs up fast)' : ''}${d.label ? ` · label: ${esc(d.label)}` : ''}`;
    case 'lfTalk': return `A person speaks: "${esc(d.bubble)}"`;
    case 'lfSplit': return `Split screen: <b>${esc(d.left.title)}</b>${d.left.bubble ? ` "${esc(d.left.bubble)}"` : ''} | <b>${esc(d.right.title)}</b>${d.right.bubble ? ` "${esc(d.right.bubble)}"` : ''} (focus: ${esc(d.focus)})`;
    case 'lfVersus': return `Split: <b>${esc(d.left)}</b> ≠ <b>${esc(d.right)}</b>`;
    case 'lfScale': return `Balance scale: ${esc(d.left)} ⚖ ${esc(d.right)}`;
    case 'lfOptions': return `Options branch out: ${esc(d.options.join(' · '))} (they choose one)`;
    case 'lfRecap': return `Recap cards: ${esc(d.items.join(' · '))}`;
    default: return esc(info.tpl);
  }
}

function page(slug) {
  const m = META[slug];
  const beats = require(path.join(__dirname, slug, 'beats.js'));
  const spoken = beats.filter((b) => b.mode !== 'checkpoint');
  const words = spoken.reduce((n, b) => n + b.vo.split(/\s+/).length, 0);
  let rows = '';
  for (const b of beats) {
    if (b.mode === 'checkpoint') {
      const q = b.quiz;
      rows += `<tr class="cp"><td colspan="3"><b>⏸ CHECKPOINT</b>: the video pauses here; the LMS asks; the learner must answer to continue. <i>(Not in the video.)</i>
        <p><b>Q:</b> ${esc(q.stem)}</p><ol type="A">${q.options.map((o, i) => `<li${i === q.answer ? ' class="ok"' : ''}>${esc(o)}${i === q.answer ? ' ✓' : ''}</li>`).join('')}</ol>
        <p><b>If right:</b> ${esc(q.correctNote)}</p><p><b>If wrong:</b> ${esc(q.explain)}</p></td></tr>`;
      continue;
    }
    rows += `<tr><td class="id">${b.id}</td><td><div class="vo">${esc(b.vo)}</div><div class="tone">read: ${esc(b.tone || '')}</div></td><td class="scr">${onScreen(b.info)}</td></tr>`;
  }
  return `<section>
    <div class="cover"><div class="wk">P&amp;C People Skills · ${esc(m.week)}</div><h1>${esc(m.title)}</h1></div>
    <div class="meta">
      <p><b>SLO</b></p><ul>${m.slos.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <p><b>Models taught</b></p><ul>${m.models.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <p><b>Situations walked through step by step</b></p><ul>${m.walks.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <p class="len">${spoken.length} spoken lines · ${words} words · about ${(words / 2.5 / 60 + spoken.length * 0.6 / 60).toFixed(1)} min + Taleemabad intro/outro · LearnFree-style visuals · voice spoken to "you"</p>
    </div>
    <table><thead><tr><th>#</th><th>Spoken line</th><th>On screen</th></tr></thead><tbody>${rows}</tbody></table>
  </section>`;
}

const CSS = `body{font-family:Georgia,serif;color:#1F1F1F;margin:0;font-size:12.5px}
section{page-break-after:always}
.cover{background:#EAB22A;padding:34px 44px}.wk{font-family:Arial;font-size:12px;letter-spacing:.5px}
h1{font-size:30px;margin:6px 0 0}
.meta{padding:14px 44px 6px;line-height:1.45}.meta p{margin:8px 0 2px}.meta ul{margin:0 0 4px 18px;padding:0}
.len{color:#555;font-style:italic}
table{border-collapse:collapse;margin:6px 44px 20px;width:calc(100% - 88px)}
th{text-align:left;font-family:Arial;font-size:11px;color:#666;border-bottom:2px solid #1F1F1F;padding:4px}
td{vertical-align:top;border-bottom:1px solid #e3ddd0;padding:6px 4px}
td.id{font-family:Arial;color:#888;width:22px}.vo{font-size:13.5px}.tone{font-family:Arial;font-size:10px;color:#2F9A92;margin-top:2px}
td.scr{width:42%;font-size:11.5px;color:#333}
tr.cp td{background:#FBF0D9;border-left:5px solid #2F9A92;line-height:1.45}tr.cp .ok{font-weight:bold;color:#22807A}`;

(async () => {
  const slugs = process.argv.slice(2);
  const out = path.join(__dirname, 'pdf');
  fs.mkdirSync(out, { recursive: true });
  const br = await puppeteer.launch({ headless: 'new' });
  const pg = await br.newPage();
  const render = async (body, file) => {
    await pg.setContent(`<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`, { waitUntil: 'load' });
    await pg.pdf({ path: path.join(out, file), format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm' } });
    console.log('wrote', path.join('pdf', file));
  };
  for (const s of slugs) await render(page(s), `${s}-script.pdf`);
  if (slugs.length > 1) await render(slugs.map(page).join(''), 'course1-weeks2-4-scripts.pdf');
  await br.close();
})();
