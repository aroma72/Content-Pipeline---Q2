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

  window.InfoTemplates = T;
})();
