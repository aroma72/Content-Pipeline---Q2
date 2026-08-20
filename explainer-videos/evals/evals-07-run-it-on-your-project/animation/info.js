'use strict';
/*
 * info.js — infographic + overlay templates. Each returns a DOM node whose
 * evolving parts are marked with .seq (staggered reveal) / .io-late (late change).
 * lesson.html drives them deterministically via seekTo(); text count-ups register
 * on window.__ticks so scrubbing is exact (WAAPI can't tween text).
 *
 * Add a template: window.InfoTemplates.myTpl = (data) => node;  reference it as
 *   info:{tpl:'myTpl', data:{...}}   or   overlay:{tpl:'myTpl', data:{...}}
 */
(function () {
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

  const T = {};

  // checklist that reveals item-by-item, last item flips "on" late
  T.checks = (d) => {
    const wrap = el('div', 'card checks');
    if (d.title) { const t = el('div', 'info-title seq', d.title); wrap.appendChild(t); }
    (d.items || []).forEach((label, i) => {
      const row = el('div', 'check seq');
      row.appendChild(el('div', 'box', '✓'));
      row.appendChild(el('div', null, label));
      if (i === (d.items.length - 1)) row.classList.add('io-late'); // last one changes state late
      wrap.appendChild(row);
    });
    return wrap;
  };

  // four-part grid (name / when / steps / example) revealed one by one
  T.fourparts = (d) => {
    const wrap = el('div');
    if (d.title) wrap.appendChild(el('div', 'info-title seq', d.title));
    const grid = el('div', 'fourparts');
    (d.parts || []).forEach((p, i) => {
      const box = el('div', 'part seq');
      box.appendChild(el('span', 'num', `Part ${i + 1}`));
      box.appendChild(document.createTextNode(p));
      grid.appendChild(box);
    });
    wrap.appendChild(grid);
    return wrap;
  };

  // gauge with a count-up value + filling bar (bar grows late)
  T.gauge = (d) => {
    const wrap = el('div', 'card gauge');
    wrap.appendChild(el('div', 'lab seq', d.label || ''));
    const val = el('div', 'val seq', '0'); val.dataset.tick = String(d.value ?? 0); val.dataset.tickmax = String(d.value ?? 0);
    wrap.appendChild(val);
    const bar = el('div', 'bar'); const fill = el('div', 'fillbar io-late');
    fill.dataset.pct = String(Math.round(((d.value ?? 0) / (d.max ?? 1)) * 100));
    bar.appendChild(fill); wrap.appendChild(bar);
    if (d.good) wrap.appendChild(el('div', 'lab seq', d.good));
    return wrap;
  };

  // M07-style typography: one bold line, a single keyword popped in accent
  T.statement = (d) => {
    const wrap = el('div', 'statement');
    const line = el('div', 'stmt seq');
    const text = d.text || '', hi = d.hi || '';
    const idx = hi ? text.indexOf(hi) : -1;
    if (idx >= 0) {
      line.appendChild(document.createTextNode(text.slice(0, idx)));
      line.appendChild(el('span', 'hi', hi));
      line.appendChild(document.createTextNode(text.slice(idx + hi.length)));
    } else { line.textContent = text; }
    wrap.appendChild(line);
    if (d.sub) wrap.appendChild(el('div', 'stmt-sub seq', d.sub));
    return wrap;
  };

  // before/after: two mini-cards + arrow; the "after" (right) resolves late
  T.twocard = (d) => {
    const wrap = el('div', 'twocard');
    if (d.title) wrap.appendChild(el('div', 'info-title seq', d.title));
    const row = el('div', 'twocard-row');
    const mk = (c, cls) => {
      const card = el('div', 'mini-card seq ' + (cls || ''));
      card.appendChild(el('div', 'mini-title', c.title || ''));
      (c.items || []).forEach((it) => card.appendChild(el('div', 'mini-item', it)));
      return card;
    };
    row.appendChild(mk(d.left || {}, 'bad'));
    row.appendChild(el('div', 'arrow seq', '→'));
    const right = mk(d.right || {}, 'good');
    right.classList.add('io-late'); // the good outcome resolves late
    row.appendChild(right);
    wrap.appendChild(row);
    return wrap;
  };

  // big closing quote card
  T.quote = (d) => {
    const wrap = el('div', 'quote');
    wrap.appendChild(el('div', 'q-mark seq', '“'));
    wrap.appendChild(el('div', 'q-text seq', d.text || ''));
    if (d.by) wrap.appendChild(el('div', 'q-by seq', d.by));
    return wrap;
  };

  // ---- eval-series custom templates (mango crate → AI answers) ----------------

  // two big figures with a separator; each big number counts up. Optional note flips in late.
  //   data:{ left:{big,lab}, sep:'→', right:{big,lab}, note?, tone?:'bad'|'good' }
  T.bignum = (d) => {
    const wrap = el('div', 'bignum');
    const row = el('div', 'bignum-row');
    const mk = (c) => {
      const b = el('div', 'stat seq ' + (c.tone || ''));
      const v = el('div', 'big', '0');
      v.dataset.tick = String(parseInt(c.big, 10) || 0);
      b.appendChild(v);
      b.appendChild(el('div', 'lab', c.lab || ''));
      return b;
    };
    row.appendChild(mk(d.left || {}));
    if (d.sep) row.appendChild(el('div', 'sep seq', d.sep));
    row.appendChild(mk(d.right || {}));
    wrap.appendChild(row);
    if (d.note) wrap.appendChild(el('div', 'bignum-note io-late', d.note));
    return wrap;
  };

  // real tally sheet — the hero prop of beat 16. Draws actual tally marks (groups
  // of 5: four uprights + one diagonal), reveals row by row, small caption tag.
  //   data:{ rows:[{label,count,tone:'good'|'bad'}], caption? }
  T.tally = (d) => {
    const wrap = el('div', 'card tally');
    (d.rows || []).forEach((r) => {
      const row = el('div', 'tally-row seq');
      row.appendChild(el('div', 'tally-label ' + (r.tone || ''), r.label || ''));
      const marks = el('div', 'tally-marks');
      let n = r.count || 0;
      while (n > 0) {
        const take = Math.min(5, n); n -= take;
        const g = el('div', 'tgroup' + (take === 5 ? ' five' : ''));
        for (let i = 0; i < Math.min(4, take); i++) g.appendChild(el('span', 'bar'));
        if (take === 5) g.appendChild(el('span', 'slash'));
        marks.appendChild(g);
      }
      row.appendChild(marks);
      row.appendChild(el('div', 'tally-count ' + (r.tone || ''), String(r.count)));
      wrap.appendChild(row);
    });
    if (d.caption) { const c = el('div', 'tally-cap io-late', d.caption); wrap.appendChild(c); }
    return wrap;
  };

  // three chips along a warm→muted spectrum (beat 12: honey / fine / wince).
  //   data:{ items:[{label,tone:'good'|'mid'|'bad'}] }
  T.spectrum = (d) => {
    const wrap = el('div', 'spectrum');
    const bar = el('div', 'spec-bar seq');
    wrap.appendChild(bar);
    const row = el('div', 'spec-row');
    (d.items || []).forEach((it) => {
      const chip = el('div', 'spec-chip seq ' + (it.tone || 'mid'));
      chip.appendChild(el('div', 'dot'));
      chip.appendChild(el('div', 'spec-lab', it.label || ''));
      row.appendChild(chip);
    });
    wrap.appendChild(row);
    return wrap;
  };

  // two mock app screens side by side, visibly DIFFERENT at a glance (beat 21).
  // This is the "real screen" — crisp HTML, not baked into art.
  //   data:{ prompt?, a:{title,lines:[]}, b:{title,lines:[]} }
  T.answers = (d) => {
    const wrap = el('div', 'answers');
    if (d.prompt) wrap.appendChild(el('div', 'ans-prompt seq', d.prompt));
    const row = el('div', 'answers-row');
    const mk = (c, cls) => {
      const scr = el('div', 'screen seq ' + (cls || ''));
      const bar = el('div', 'screen-bar');
      bar.appendChild(el('span', 'dot r')); bar.appendChild(el('span', 'dot y')); bar.appendChild(el('span', 'dot g'));
      bar.appendChild(el('span', 'screen-title', c.title || ''));
      scr.appendChild(bar);
      const body = el('div', 'screen-body');
      (c.lines || []).forEach((ln) => {
        const li = el('div', 'ans-line');
        li.appendChild(el('span', 'k', ln.k || ''));
        li.appendChild(el('span', 'v', ln.v || ''));
        body.appendChild(li);
      });
      scr.appendChild(body);
      return scr;
    };
    row.appendChild(mk(d.a || {}, 'a'));
    row.appendChild(el('div', 'vs seq', '≠'));
    row.appendChild(mk(d.b || {}, 'b'));
    wrap.appendChild(row);
    return wrap;
  };

  // a single compact mock app screen — used as an `overlay` beside Ali (real screen).
  //   data:{ title, lines:[{k,v}] }
  T.screen = (d) => {
    const scr = el('div', 'screen solo seq');
    const bar = el('div', 'screen-bar');
    bar.appendChild(el('span', 'dot r')); bar.appendChild(el('span', 'dot y')); bar.appendChild(el('span', 'dot g'));
    bar.appendChild(el('span', 'screen-title', d.title || ''));
    scr.appendChild(bar);
    const body = el('div', 'screen-body');
    (d.lines || []).forEach((ln) => {
      const li = el('div', 'ans-line');
      li.appendChild(el('span', 'k', ln.k || ''));
      li.appendChild(el('span', 'v', ln.v || ''));
      body.appendChild(li);
    });
    scr.appendChild(body);
    return scr;
  };

  // a single chat/terminal window showing the exact prompt to say to your AI (beat 26).
  //   data:{ app?, text }
  T.promptcard = (d) => {
    const wrap = el('div', 'promptcard seq');
    const bar = el('div', 'screen-bar');
    bar.appendChild(el('span', 'dot r')); bar.appendChild(el('span', 'dot y')); bar.appendChild(el('span', 'dot g'));
    bar.appendChild(el('span', 'screen-title', d.app || 'Claude'));
    wrap.appendChild(bar);
    const body = el('div', 'promptcard-body');
    body.appendChild(el('div', 'you', 'You'));
    body.appendChild(el('div', 'bubble', d.text || ''));
    wrap.appendChild(body);
    return wrap;
  };

  // four piles as a horizontal bar chart — the ENGINE of video 02 (beats 15 & 17).
  // Same four rows appear twice: names-only (beat 15), then bars grow + counts count up
  // (beat 17) so it reads as ONE visual that builds. Reuses the .fillbar/io-late + data-tick
  // primitives lesson.html already drives. Biggest pile flagged .big to draw the eye.
  //   data:{ items:[{label,count,tone?:'big'}], showCounts?:bool }
  T.piles = (d) => {
    const wrap = el('div', 'card piles');
    const items = d.items || [];
    const max = Math.max(1, ...items.map((i) => i.count || 0));
    items.forEach((it) => {
      const big = it.tone === 'big' ? ' big' : '';
      const row = el('div', 'pile-row seq');
      row.appendChild(el('div', 'pile-label' + big, it.label || ''));
      const track = el('div', 'pile-track');
      const fill = el('div', 'pile-fill fillbar io-late' + big);
      fill.dataset.pct = String(d.showCounts ? Math.round(((it.count || 0) / max) * 100) : 0);
      track.appendChild(fill);
      row.appendChild(track);
      if (d.showCounts) {
        const c = el('div', 'pile-count' + big, '0');
        c.dataset.tick = String(it.count || 0);
        row.appendChild(c);
      } else {
        row.appendChild(el('div', 'pile-count muted', '—'));
      }
      wrap.appendChild(row);
    });
    return wrap;
  };

  // browser — a browser window chrome with a body slot; blank white for the "money frame"
  // (v04 beat 19) or holds a short line. Real UI, never baked into art.
  //   data:{ url?, blank?:bool, text? }
  T.browser = (d) => {
    const wrap = el('div', 'browserwin seq');
    const bar = el('div', 'screen-bar');
    bar.appendChild(el('span', 'dot r')); bar.appendChild(el('span', 'dot y')); bar.appendChild(el('span', 'dot g'));
    bar.appendChild(el('span', 'url', d.url || ''));
    wrap.appendChild(bar);
    const body = el('div', 'browser-body' + (d.blank ? ' blank' : ''));
    if (d.text) body.appendChild(el('div', 'browser-text', d.text));
    wrap.appendChild(body);
    return wrap;
  };

  // grid — N cells revealed one-by-one, each toned (good=green tick). v04 beat 23 "twelve green".
  //   data:{ n, tone?:'good'|'bad', title? }
  T.grid = (d) => {
    const wrap = el('div', 'gridwrap');
    if (d.title) wrap.appendChild(el('div', 'info-title seq', d.title));
    const g = el('div', 'cellgrid');
    const n = d.n || 12;
    for (let i = 0; i < n; i++) {
      const c = el('div', 'cell seq ' + (d.tone || 'good'));
      c.appendChild(el('span', 'tick', (d.tone === 'bad') ? '✗' : '✓'));
      g.appendChild(c);
    }
    wrap.appendChild(g);
    return wrap;
  };

  // scoresheet — two mark sheets side by side, rows reveal, disagreement rows flagged.
  // v05 hero (beats 15/16/22): same layout twice so "agree on 7 -> agree on 9" reads as one thing.
  //   data:{ a:{title,rows:[{label,mark:'✓'|'✗'}]}, b:{...}, diff?:[idx], note? }
  T.scoresheet = (d) => {
    const wrap = el('div', 'scoresheets');
    const row = el('div', 'sheets-row');
    const mk = (c) => {
      const s = el('div', 'sheet seq');
      s.appendChild(el('div', 'sheet-title', c.title || ''));
      (c.rows || []).forEach((r, i) => {
        const rr = el('div', 'sheet-row' + ((d.diff || []).includes(i) ? ' diff' : ''));
        rr.appendChild(el('span', 'sheet-lab', r.label || ('Item ' + (i + 1))));
        rr.appendChild(el('span', 'sheet-mark ' + (r.mark === '✗' ? 'bad' : 'good'), r.mark || '✓'));
        s.appendChild(rr);
      });
      return s;
    };
    row.appendChild(mk(d.a || {}));
    row.appendChild(mk(d.b || {}));
    wrap.appendChild(row);
    if (d.note) wrap.appendChild(el('div', 'sheets-note io-late', d.note));
    return wrap;
  };

  // bars — a horizontal bar GRAPH with count-up values out of a fixed scale (e.g. /10).
  // For before/after comparisons (v07 baseline 5 -> 8, v05 agreement 7 -> 9). Biggest/after
  // row can be flagged tone:'big'. Bars grow late (.io-late), values count up (data-tick).
  //   data:{ items:[{label,value,tone?:'big'|'bad'}], max?, suffix?, title? }
  T.bars = (d) => {
    const wrap = el('div', 'card bars');
    if (d.title) wrap.appendChild(el('div', 'info-title seq', d.title));
    const items = d.items || [];
    const max = d.max || Math.max(1, ...items.map((i) => i.value || 0));
    items.forEach((it) => {
      const t = it.tone === 'big' ? ' big' : (it.tone === 'bad' ? ' bad' : '');
      const row = el('div', 'bar-row seq');
      row.appendChild(el('div', 'bar-label' + t, it.label || ''));
      const track = el('div', 'bar-track');
      const fill = el('div', 'bar-fill fillbar io-late' + t);
      fill.dataset.pct = String(Math.round(((it.value || 0) / max) * 100));
      track.appendChild(fill);
      row.appendChild(track);
      const v = el('div', 'bar-value' + t, '0');
      v.dataset.tick = String(it.value || 0);
      const val = el('div', 'bar-valwrap' + t);
      val.appendChild(v);
      if (d.suffix) val.appendChild(el('span', 'bar-suffix', d.suffix));
      row.appendChild(val);
      wrap.appendChild(row);
    });
    return wrap;
  };

  window.InfoTemplates = T;
})();
