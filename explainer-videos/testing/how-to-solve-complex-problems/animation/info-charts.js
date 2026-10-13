'use strict';
/*
 * info-charts.js — the data-visual templates for the CHARTS-ONLY format (testing/).
 *
 * Kept in its own file, loaded after info.js, so the shared template library is untouched
 * until Aroma has judged this format. It registers onto the same window.InfoTemplates
 * registry, so a beat references these exactly like any built-in: info:{tpl:'pie', ...}.
 *
 * COLOUR DECISIONS (dataviz procedure: form first, colour LAST, colour by the job it does).
 * Validated with the dataviz validator against this canvas's cream surface #F5F1E8 before
 * any of it was written:
 *   · A 5-hue CATEGORICAL set was tried first and rejected. On cream, no 5-hue set built
 *     from the brand ramps clears the all-pairs normal-vision floor (DeltaE >= 15) — and
 *     neither does the dataviz reference palette at 5 slots; its own notes say slot 4
 *     (yellow) deliberately sits beside orange.
 *   · So the pie uses what its data's job actually asks for: MAGNITUDE -> a SEQUENTIAL
 *     single-hue ramp stepped by value, plus the brand accent on the one emphasis slice.
 *     Identity is carried by a direct label on EVERY slice, so nothing is colour-alone.
 *   · The line graph is ONE series: no legend box (the title names it), accent hue, and a
 *     value label on the first and last point only — never a number on every point.
 *
 * MOTION. Two primitives are added to lesson.html's deterministic driver and used here:
 *   [data-arc]  — a donut arc sweeps from its own start; dasharray is a pure function of
 *                 beat progress, so scrubbing is exact.
 *   [data-draw] — an SVG path draws itself on (stroke-dashoffset); the driver measures
 *                 getTotalLength() lazily on first paint, once the node is attached.
 * Both compose with the existing .seq / .io-late / [data-tick] primitives.
 */
(function () {
  const T = window.InfoTemplates || (window.InfoTemplates = {});
  const SVGNS = 'http://www.w3.org/2000/svg';

  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const svgEl = (tag, attrs, cls) => {
    const n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k]));
    if (cls) n.setAttribute('class', cls);
    return n;
  };

  // ---------------------------------------------------------------- pie -----
  // Donut chart. Slices drawn largest-first clockwise from 12 o'clock (the only defensible
  // pie order), with a surface gap between them so touching equal-value slices stay legible.
  // The hole carries the total, counting up.
  //   data:{ title?, unit?, slices:[{ label, value, tone?:'big' }], note? }
  T.pie = function (d) {
    const wrap = el('div', 'piewrap');
    if (d.title) wrap.appendChild(el('div', 'info-title seq', d.title));

    const slices = (d.slices || []).slice().sort((a, b) => (b.value || 0) - (a.value || 0));
    const total = slices.reduce((s, x) => s + (x.value || 0), 0) || 1;
    const R = 200, SW = 78, C = 2 * Math.PI * R, GAP = 6;

    // The ramp is stepped by VALUE, not by position in the sorted list. Indexing by
    // position gave three equal 6-minute slices three different browns, which reads as
    // "these are three different sizes" — the exact lie a sequential encoding exists to
    // avoid. Ranking DISTINCT values also means a 2-value chart uses only the two darkest
    // steps, so the palest step never appears unless the data actually needs it.
    const RAMP = ['ramp4', 'ramp3', 'ramp2', 'ramp1'];   // darkest step = biggest value
    const tiers = Array.from(new Set(slices.filter((s) => s.tone !== 'big')
      .map((s) => s.value || 0))).sort((a, b) => b - a);
    const stepFor = (v) => RAMP[Math.min(Math.max(0, tiers.indexOf(v)), RAMP.length - 1)];

    const svg = svgEl('svg', { viewBox: '0 0 560 560' }, 'pie-svg');
    const g = svgEl('g', { transform: 'rotate(-90 280 280)' });  // 0 at 12 o'clock
    svg.appendChild(g);

    let cum = 0;
    slices.forEach(function (s, i) {
      const len = ((s.value || 0) / total) * C;
      s.__cls = (s.tone === 'big') ? 'accent' : stepFor(s.value || 0);
      const arc = svgEl('circle', {
        cx: 280, cy: 280, r: R, fill: 'none', 'stroke-width': SW,
        'stroke-dashoffset': String(-cum),
      }, 'pie-arc ' + s.__cls);
      arc.dataset.arc = String(Math.max(0, len - GAP));
      arc.dataset.c = String(C);
      arc.dataset.i = String(i);
      arc.dataset.n = String(slices.length);
      g.appendChild(arc);
      cum += len;
    });

    const hole = el('div', 'pie-hole');
    const tot = el('div', 'pie-total', '0');
    tot.dataset.tick = String(total);
    hole.appendChild(tot);
    if (d.unit) hole.appendChild(el('div', 'pie-unit', d.unit));

    const disc = el('div', 'pie-disc');
    disc.appendChild(svg);
    disc.appendChild(hole);

    // Legend is always present for >= 2 series, and each row directly labels its own slice
    // with the real value AND its share — identity never rests on colour.
    const key = el('div', 'pie-key');
    slices.forEach(function (s) {
      const row = el('div', 'pie-key-row seq' + (s.tone === 'big' ? ' big' : ''));
      row.appendChild(el('span', 'pie-sw ' + s.__cls));
      row.appendChild(el('span', 'pie-name', s.label || ''));
      row.appendChild(el('span', 'pie-val', s.value + (d.unit ? ' ' + d.unit : '')));
      row.appendChild(el('span', 'pie-pct', Math.round(((s.value || 0) / total) * 100) + '%'));
      key.appendChild(row);
    });

    const row = el('div', 'pie-row');
    row.appendChild(disc);
    row.appendChild(key);
    wrap.appendChild(row);
    if (d.note) wrap.appendChild(el('div', 'pie-note io-late', d.note));
    return wrap;
  };

  // --------------------------------------------------------------- line -----
  // A line graph over an ordered x axis. One series: recessive grid, accent line that
  // draws itself on, markers arriving behind it, and value labels on the first and last
  // point only.
  //   data:{ title?, points:[{ x, y }], max?, suffix?, note? }
  T.line = function (d) {
    const wrap = el('div', 'linewrap');
    if (d.title) wrap.appendChild(el('div', 'info-title seq', d.title));

    const pts = d.points || [];
    const W = 1460, H = 560, PL = 160, PR = 90, PT = 50, PB = 120;
    const max = d.max || Math.max(1, ...pts.map((p) => p.y || 0));
    const iw = W - PL - PR, ih = H - PT - PB;
    const xAt = (i) => PL + (pts.length < 2 ? iw / 2 : (i / (pts.length - 1)) * iw);
    const yAt = (v) => PT + ih - ((v || 0) / max) * ih;

    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H }, 'line-svg');
    const put = (node) => { svg.appendChild(node); return node; };

    [0, max / 2, max].forEach(function (v) {
      put(svgEl('line', { x1: PL, x2: W - PR, y1: yAt(v), y2: yAt(v) }, 'line-grid'));
      const t = put(svgEl('text', { x: PL - 30, y: yAt(v) + 14, 'text-anchor': 'end' }, 'line-ytick'));
      t.textContent = String(Math.round(v * 10) / 10);
    });
    put(svgEl('line', { x1: PL, x2: PL, y1: PT, y2: PT + ih }, 'line-axis'));

    const poly = put(svgEl('polyline', {
      fill: 'none',
      points: pts.map((p, i) => xAt(i) + ',' + yAt(p.y)).join(' '),
    }, 'line-path'));
    poly.dataset.draw = '1';

    pts.forEach(function (p, i) {
      const last = i === pts.length - 1;
      put(svgEl('circle', {
        cx: xAt(i), cy: yAt(p.y), r: last ? 17 : 12,
      }, 'line-dot seq' + (last ? ' big' : '')));
      const xt = put(svgEl('text', {
        x: xAt(i), y: PT + ih + 66, 'text-anchor': 'middle',
      }, 'line-xtick seq'));
      xt.textContent = String(p.x == null ? i + 1 : p.x);
      if (i === 0 || last) {
        // Above the point normally — but a point sitting near the top of the plot puts its
        // label straight through the top gridline's tick ("9h" landed on top of "10"), so
        // a high point labels BELOW instead. Checked against the plot, not the canvas.
        const high = (yAt(p.y) - PT) < ih * 0.22;
        const vt = put(svgEl('text', {
          x: xAt(i), y: yAt(p.y) + (high ? 66 : -36), 'text-anchor': 'middle',
        }, 'line-vlab seq' + (last ? ' big' : '')));
        vt.textContent = String(p.y) + (d.suffix || '');
      }
    });

    wrap.appendChild(svg);
    if (d.note) wrap.appendChild(el('div', 'line-note io-late', d.note));
    return wrap;
  };

  // ------------------------------------------------------------- sketch -----
  // A hand-drawn boxes-and-arrows diagram: 2-5 nodes in a row with pencil-wobbled
  // outlines, and the arrows between them literally drawn on across the beat. It carries
  // STRUCTURE, not numbers, so it has no scale and no colour encoding beyond one accent
  // node. Node labels honour "\n" for a second line.
  //   data:{ title?, nodes:[{ label, tone?:'accent' }], arrows?:false, note? }
  // arrows defaults to true (a chain). Pass arrows:false when the nodes are PARALLEL rather
  // than sequential — an arrow between "how much time?" and "how sure am I?" claims one
  // leads to the other, when the point is that you ask both.
  T.sketch = function (d) {
    const wrap = el('div', 'sketchwrap');
    if (d.title) wrap.appendChild(el('div', 'info-title seq', d.title));

    const nodes = (d.nodes || []).slice(0, 5);
    const n = Math.max(1, nodes.length);
    const W = 1680, H = 420;
    const GAPW = n > 3 ? 116 : 156;
    const bw = (W - (n - 1) * GAPW) / n;
    const bh = 248, top = (H - bh) / 2;

    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H }, 'sketch-svg');
    // One pencil filter, reused by every stroke — this is what makes it read as drawn
    // rather than as a flowchart. Kept subtle: enough wobble to feel human at 1080p.
    svg.appendChild(svgEl('defs', {}));
    svg.querySelector('defs').innerHTML =
      '<filter id="pencil" x="-6%" y="-24%" width="112%" height="148%">'
      + '<feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="3" seed="7" result="n"/>'
      + '<feDisplacementMap in="SourceGraphic" in2="n" scale="6"'
      + ' xChannelSelector="R" yChannelSelector="G"/>'
      + '</filter>'
      + '<marker id="nib" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="7" markerHeight="7"'
      + ' orient="auto"><path d="M1 1 L11 6 L1 11" fill="none" stroke="#6B5344"'
      + ' stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></marker>';

    nodes.forEach(function (nd, i) {
      const x = i * (bw + GAPW);
      const g = svgEl('g', {}, 'sketch-node seq' + (nd.tone === 'accent' ? ' accent' : ''));
      g.appendChild(svgEl('rect', { x: x + 4, y: top, width: bw - 8, height: bh, rx: 24 }, 'sketch-box'));

      // Auto-fit the label to the box. At 5 nodes a box is ~243 units wide and a fixed
      // 52px "Comment" overflowed its own outline. Segoe UI semibold runs about 0.62em
      // per character, so size from the longest line and never go under 34 (qa-frames
      // enforces a 28px floor on computed type; this stays clear of it).
      const lines = String(nd.label || '').split('\n');
      const widest = Math.max(1, ...lines.map((s) => s.length));
      const fs = Math.max(34, Math.min(52, Math.floor((bw - 52) / (0.68 * widest))));
      lines.forEach(function (ln, k) {
        const t = svgEl('text', {
          x: x + bw / 2,
          y: top + bh / 2 + fs * 0.34 - (lines.length - 1) * (fs * 0.62) + k * (fs * 1.24),
          'text-anchor': 'middle',
          'font-size': fs,
        }, 'sketch-lab');
        t.textContent = ln;
        g.appendChild(t);
      });
      svg.appendChild(g);

      if (i < n - 1 && d.arrows !== false) {
        // A gently bowed stroke, NOT a straight line with the pencil filter on it. The
        // filter region is percentage-based, and a horizontal line's bounding box has zero
        // height — so the region collapsed and the arrows rendered as nothing at all.
        // Building the wobble into the geometry also reads more hand-drawn, and cannot
        // break: the bow gives the path real vertical extent and the nib orients along it.
        const x1 = x + bw + 14, x2 = x + bw + GAPW - 16, y = top + bh / 2;
        const run = x2 - x1;
        const a = svgEl('path', {
          d: 'M ' + x1 + ' ' + (y + 3)
            + ' C ' + (x1 + run * 0.33) + ' ' + (y - 7)
            + ', ' + (x1 + run * 0.66) + ' ' + (y + 6)
            + ', ' + x2 + ' ' + y,
          fill: 'none', 'marker-end': 'url(#nib)',
        }, 'sketch-arrow');
        a.dataset.draw = '1';
        svg.appendChild(a);
      }
    });

    wrap.appendChild(svg);
    if (d.note) wrap.appendChild(el('div', 'sketch-note io-late', d.note));
    return wrap;
  };
})();
