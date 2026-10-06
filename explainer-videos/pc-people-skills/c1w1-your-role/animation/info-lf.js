'use strict';
/*
 * info-lf.js — LearnFree-style flat motion-graphics templates (P&C people-skills series).
 *
 * Registers onto window.InfoTemplates like every other library, so a beat says
 * info:{ tpl:'lfStage', data:{...} }. Every template draws a FULL-BLEED frame (the reference
 * never floats a card on a background; the colour field IS the frame).
 *
 * There is deliberately NO quiz template here. The question is never put in the video: it
 * travels to the LMS as the checkpoint beat's data (Aroma, 2026-10-06), and qa-checkpoint.js
 * fails the build if a beat tries to draw one.
 *
 * MOTION is declared, never scripted: elements carry data attributes and lesson-lf.html's
 * driver computes their state as a pure function of beat progress p (0..1), so seekTo() is
 * exact and frame-stepping is reproducible.
 *   data-at="0.2" data-in="pop|up|left|right|slideL|slideR|grow|fade" [data-dur] [data-until]
 *   data-draw (an SVG path with pathLength="1")  data-hl="0.6" (adds .hl after that point)
 *   data-float="6" (gentle bob, px)  data-spin="40" (deg/s)  data-move="x0,y0,x1,y1" + data-mat
 *   data-tilt="-1|0|1" (balance beam)  data-pan="-1|1" (a pan hanging off that beam)
 */
(function () {
  const T = window.InfoTemplates || (window.InfoTemplates = {});

  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const place = (n, x, y, w, h) => {
    n.style.position = 'absolute';
    if (x != null) n.style.left = x + 'px';
    if (y != null) n.style.top = y + 'px';
    if (w != null) n.style.width = w + 'px';
    if (h != null) n.style.height = h + 'px';
    return n;
  };
  const anim = (n, at, how, extra) => {
    n.dataset.at = String(at);
    n.dataset.in = how || 'pop';
    Object.assign(n.dataset, extra || {});
    return n;
  };
  const frame = (bg, extraCls) => el('div', `lf bg-${bg || 'cream'} ${extraCls || ''}`);
  const svgBox = (inner, vb, w, h) => {
    const d = el('div');
    // collapse markup whitespace: stray text nodes measure as 16px "text" in qa-frames
    d.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${inner.replace(/>\s+</g, '><').trim()}</svg>`;
    return d;
  };
  const head = (text, opts) => {
    const o = opts || {};
    const h = el('div', `lf-head ${o.soft ? 'soft' : ''} ${o.small ? 'small' : ''}`);
    h.appendChild(anim(el('div', 'rule'), 0, 'grow', { dur: '0.08' }));
    const col = el('div');
    col.appendChild(el('div', 't', text));
    if (o.sub) col.appendChild(el('div', 's', o.sub));
    h.appendChild(anim(col, 0.02, 'left', { dur: '0.1' }));
    if (o.x != null) h.style.left = o.x + 'px';
    if (o.y != null) h.style.top = o.y + 'px';
    if (o.maxw) col.style.maxWidth = o.maxw + 'px';
    return h;
  };
  // a row that centres its child horizontally within [x, x+w] — keeps a label or marker
  // aligned to the object above it whatever the text length
  const centredRow = (child, x, y, w) => {
    const r = el('div'); place(r, x, y, w);
    r.style.display = 'flex'; r.style.justifyContent = 'center';
    child.style.position = 'relative';
    r.appendChild(child);
    return r;
  };
  // top-right marker, aligned to the right margin on the title's line
  const cornerTag = (text, at) => {
    const t = el('div', 'tag', text);
    t.style.right = '120px'; t.style.top = '130px';
    return anim(t, at, 'pop');
  };

  // ── flat figures: warm skin tones, non-blue clothing ──────────────────────
  const PEOPLE = {
    a: { skin: '#C68642', shade: '#8F5A2A', body: '#F2C14E' },
    b: { skin: '#E8B48F', shade: '#B9805C', body: '#8C5E3C' },
    c: { skin: '#8D5524', shade: '#5E3714', body: '#1F1F1F' },
  };
  function figureSVG(v, gesture) {
    const P = PEOPLE[v] || PEOPLE.b;
    const hair = {
      a: '<circle cx="92" cy="118" r="44"/><circle cx="150" cy="78" r="52"/><circle cx="208" cy="118" r="44"/>'
        + '<circle cx="74" cy="182" r="32"/><circle cx="226" cy="182" r="32"/><circle cx="118" cy="84" r="36"/><circle cx="182" cy="84" r="36"/>',
      b: '<path d="M78 150 Q72 62 150 56 Q230 60 224 150 Q210 98 150 104 Q98 104 78 150Z"/>',
      c: '<path d="M84 128 Q92 74 150 70 Q208 74 216 128 Q196 100 150 100 Q104 100 84 128Z"/>',
    }[v] || '';
    const arm = gesture
      ? `<path d="M222 340 Q300 390 336 352" stroke="${P.body}" stroke-width="40" fill="none" stroke-linecap="round"/>`
        + `<ellipse cx="346" cy="344" rx="24" ry="18" fill="${P.skin}"/>`
      : '';
    return `<g>
      <path d="M58 600 L70 336 Q80 272 150 268 Q220 272 230 336 L242 600Z" fill="${P.body}"/>
      ${arm}
      <rect x="132" y="222" width="36" height="56" fill="${P.skin}"/>
      <ellipse cx="150" cy="158" rx="72" ry="88" fill="${P.skin}"/>
      <ellipse cx="78" cy="166" rx="12" ry="18" fill="${P.skin}"/><ellipse cx="222" cy="166" rx="12" ry="18" fill="${P.skin}"/>
      <g fill="#1F1F1F">${hair}</g>
      <ellipse cx="124" cy="152" rx="15" ry="11" fill="#fff"/><ellipse cx="178" cy="152" rx="15" ry="11" fill="#fff"/>
      <circle cx="128" cy="153" r="6" fill="#1F1F1F"/><circle cx="182" cy="153" r="6" fill="#1F1F1F"/>
      <path d="M152 160 L144 196 L158 196" stroke="${P.shade}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M134 214 Q150 222 166 214" stroke="${P.shade}" stroke-width="5" fill="none" stroke-linecap="round"/>
    </g>`;
  }
  const figure = (v, w, gesture) => svgBox(figureSVG(v, gesture), gesture ? '0 0 380 600' : '0 0 300 600',
    w, Math.round(w * 600 / (gesture ? 380 : 300)));

  // ── flat icons (no text, no letters — teaching text stays HTML) ───────────
  const ICON = {
    resume: '<rect x="40" y="16" width="120" height="168" fill="#fff"/><rect x="40" y="16" width="6" height="168" fill="var(--teal-d)"/>'
      + '<rect x="70" y="34" width="62" height="10" fill="var(--teal-d)"/><rect x="60" y="66" width="80" height="4" fill="var(--mustard-d)"/>'
      + '<rect x="60" y="80" width="72" height="4" fill="#999"/><rect x="60" y="92" width="62" height="4" fill="#999"/>'
      + '<rect x="60" y="114" width="80" height="4" fill="var(--mustard-d)"/><rect x="60" y="128" width="70" height="4" fill="#999"/>'
      + '<rect x="60" y="140" width="56" height="4" fill="#999"/><rect x="60" y="152" width="66" height="4" fill="#999"/>',
    badge: '<path d="M78 8 L100 70 L122 8" stroke="var(--teal-d)" stroke-width="10" fill="none"/>'
      + '<rect x="46" y="62" width="108" height="130" rx="10" fill="var(--mustard)"/><rect x="84" y="56" width="32" height="16" rx="4" fill="#1F1F1F"/>'
      + '<circle cx="100" cy="112" r="24" fill="var(--paper)"/><rect x="66" y="150" width="68" height="8" fill="var(--paper)"/>'
      + '<rect x="76" y="166" width="48" height="6" fill="var(--paper)" opacity=".7"/>',
    chat: '<path d="M14 30 h112 a14 14 0 0 1 14 14 v56 a14 14 0 0 1 -14 14 h-70 l-26 24 v-24 h-16 a14 14 0 0 1 -14 -14 v-56 a14 14 0 0 1 14 -14z" fill="var(--paper)"/>'
      + '<path d="M80 92 h92 a14 14 0 0 1 14 14 v50 a14 14 0 0 1 -14 14 h-10 v22 l-24 -22 h-58 a14 14 0 0 1 -14 -14 v-50 a14 14 0 0 1 14 -14z" fill="var(--mustard)"/>'
      + '<circle cx="108" cy="131" r="7" fill="#1F1F1F"/><circle cx="130" cy="131" r="7" fill="#1F1F1F"/><circle cx="152" cy="131" r="7" fill="#1F1F1F"/>',
    door: '<rect x="40" y="18" width="96" height="170" fill="#1F1F1F"/><path d="M48 26 L112 40 L112 182 L48 180Z" fill="var(--mustard)"/>'
      + '<circle cx="100" cy="112" r="6" fill="#1F1F1F"/><path d="M140 104 H186 M168 86 L188 104 L168 122" stroke="var(--paper)" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    policy: '<rect x="56" y="30" width="110" height="150" fill="#E7DCC4"/><rect x="44" y="20" width="110" height="150" fill="#fff"/>'
      + '<rect x="62" y="44" width="74" height="8" fill="#888"/><rect x="62" y="64" width="74" height="4" fill="#aaa"/><rect x="62" y="76" width="74" height="4" fill="#aaa"/>'
      + '<rect x="62" y="88" width="60" height="4" fill="#aaa"/><rect x="62" y="108" width="74" height="4" fill="#aaa"/><rect x="62" y="120" width="68" height="4" fill="#aaa"/>'
      + '<rect x="62" y="132" width="74" height="4" fill="#aaa"/><rect x="62" y="144" width="50" height="4" fill="#aaa"/>',
    heart: '<path d="M100 178 C40 132 14 104 14 68 C14 38 38 18 64 18 C82 18 94 28 100 40 C106 28 118 18 136 18 C162 18 186 38 186 68 C186 104 160 132 100 178Z" fill="var(--mustard)"/>'
      + '<path d="M50 62 C52 48 62 40 74 40" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" opacity=".6"/>',
    person: '<circle cx="100" cy="62" r="34" fill="#C68642"/><path d="M44 186 Q46 112 100 108 Q154 112 156 186Z" fill="#8C5E3C"/>',
    building: '<rect x="46" y="30" width="108" height="156" fill="#1F1F1F"/><rect x="30" y="180" width="140" height="8" fill="#1F1F1F"/>'
      + [0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => `<rect x="${62 + c * 30}" y="${46 + r * 30}" width="18" height="18" fill="var(--mustard)"/>`).join('')).join('')
      + '<rect x="88" y="160" width="24" height="26" fill="var(--paper)"/>',
    buoy: '<circle cx="100" cy="100" r="78" fill="var(--paper)"/><circle cx="100" cy="100" r="36" fill="var(--cream)"/>'
      + '<path d="M100 22 A78 78 0 0 1 155 45 L126 74 A36 36 0 0 0 100 64Z" fill="var(--mustard)"/>'
      + '<path d="M178 100 A78 78 0 0 1 155 155 L126 126 A36 36 0 0 0 136 100Z" fill="var(--mustard)"/>'
      + '<path d="M100 178 A78 78 0 0 1 45 155 L74 126 A36 36 0 0 0 100 136Z" fill="var(--mustard)"/>'
      + '<path d="M22 100 A78 78 0 0 1 45 45 L74 74 A36 36 0 0 0 64 100Z" fill="var(--mustard)"/>'
      + '<circle cx="100" cy="100" r="78" fill="none" stroke="#1F1F1F" stroke-width="4"/>',
    sign: '<rect x="92" y="30" width="16" height="160" fill="#1F1F1F"/>'
      + '<path d="M108 40 H170 L188 58 L170 76 H108Z" fill="var(--mustard)"/><path d="M92 86 H30 L12 104 L30 122 H92Z" fill="var(--paper)"/>'
      + '<path d="M108 132 H160 L178 150 L160 168 H108Z" fill="var(--cream)"/>',
  };
  const icon = (name, size) => svgBox(ICON[name] || '', '0 0 200 200', size, size);

  // ── lfTitle: full colour field, a big title, a row of shapes ──────────────
  T.lfTitle = function (d) {
    const f = frame(d.bg, `lf-titlecard on-${d.bg}`);
    f.appendChild(head(d.text, { soft: d.italic, sub: d.sub }));
    const row = el('div', 'shapes');
    [34, 120, 80, 104, 26].forEach((s, i) => {
      const n = el('div', d.shapes === 'dots' ? 'dot' : 'sq');
      n.style.width = n.style.height = (d.shapes === 'dots' ? s * 1.1 : s) + 'px';
      anim(n, 0.15 + i * 0.07, 'pop', { float: String(3 + (i % 3) * 2) });
      row.appendChild(n);
    });
    f.appendChild(row);
    return f;
  };

  // ── lfJourney: the four stops from candidate to alumni ────────────────────
  // Vertical rhythm: icon 330–520 · 40 · stop 570–710 · 30 · label 740 · 70 · marker 870
  const STOP_ICON = ['resume', 'badge', 'chat', 'door'];
  T.lfJourney = function (d) {
    const f = frame('cream');
    const stops = d.stops || [];
    const xs = stops.map((_, i) => 300 + i * (1320 / Math.max(1, stops.length - 1)));
    const glow = Boolean(d.glow);
    f.appendChild(head(d.title || 'The Journey', { small: true }));
    const line = svgBox(`<path d="M${xs[0]} 640 H${xs[xs.length - 1]}" pathLength="1" stroke="#1F1F1F" stroke-width="8"
      stroke-dasharray="1 1" fill="none" data-draw data-at="${glow ? 0 : 0.04}" data-dur="${glow ? 0.12 : 0.5}"/>`,
    '0 0 1920 1080', 1920, 1080);
    place(line, 0, 0);
    f.appendChild(line);
    stops.forEach((s, i) => {
      const at = glow ? 0.02 + i * 0.03 : 0.08 + i * 0.13;
      const dot = svgBox('<circle class="stopc" cx="80" cy="80" r="70"/>', '0 0 160 160', 160, 160);
      place(dot, xs[i] - 80, 560);
      anim(dot, at, 'pop');
      if (glow) dot.dataset.hl = String(0.3 + i * 0.1);
      f.appendChild(dot);
      const ic = icon(STOP_ICON[i % 4], 190);
      place(ic, xs[i] - 95, 330);
      anim(ic, at + 0.04, 'up', { float: String(4 + i) });
      f.appendChild(ic);
      const lb = el('div', 'lbl hard center', s);
      place(lb, xs[i] - 200, 740, 400);
      anim(lb, at + 0.06, 'up');
      f.appendChild(lb);
    });
    if (glow) {
      const t = el('div', 'tag', d.tagText || 'One whole picture');
      anim(t, 0.72, 'pop');
      f.appendChild(centredRow(t, 0, 870, 1920));
    }
    return f;
  };

  // ── lfStage: one stop of the journey, up close ────────────────────────────
  // Left column centred on x=600 (icon, then its marker 48px below); figure centred on x=1440.
  const STAGES = ['Candidate', 'Onboarding', 'Employee', 'Alumni'];
  T.lfStage = function (d) {
    const dark = d.bg === 'teal';
    const f = frame(d.bg, dark ? 'on-dark' : '');
    f.appendChild(head(d.label, { soft: dark }));
    const ic = icon(d.icon, 400);
    place(ic, 400, 330);
    anim(ic, 0.1, 'pop', { float: '6' });
    f.appendChild(ic);
    const fig = figure(d.figure || 'b', 380);
    place(fig, 1250, 300);
    anim(fig, 0.22, 'up', { float: '4' });
    f.appendChild(fig);
    if (d.tag) {
      const t = el('div', 'tag', d.tag);
      anim(t, 0.5, 'pop');
      f.appendChild(centredRow(t, 200, 790, 800));
    }
    // where we are on the journey: four pips, the current one filled
    const idx = STAGES.indexOf(d.label);
    const pips = el('div');
    pips.style.cssText = 'position:absolute;right:120px;bottom:64px;display:flex;gap:22px';
    STAGES.forEach((_, i) => {
      const p = el('div');
      p.style.cssText = `width:26px;height:26px;border-radius:50%;border:4px solid ${dark ? 'var(--paper)' : 'var(--ink)'};`
        + (i === idx ? 'background:var(--mustard);border-color:var(--mustard)' : '');
      pips.appendChild(p);
    });
    anim(pips, 0.05, 'fade');
    f.appendChild(pips);
    return f;
  };

  // ── lfScale: care for the person, stay fair to the organisation ──────────
  T.lfScale = function (d) {
    const f = frame('cream');
    f.appendChild(head('Care and stay fair', { small: true }));
    const tilt = d.tilt || 0;
    const pan = (side, ic) => `<g data-pan="${side}">
        <path d="M${960 + side * 480} 430 L${960 + side * 480 - 110} 590 M${960 + side * 480} 430 L${960 + side * 480 + 110} 590" stroke="#1F1F1F" stroke-width="5"/>
        <path d="M${960 + side * 480 - 150} 590 H${960 + side * 480 + 150} Q${960 + side * 480} 680 ${960 + side * 480 - 150} 590Z" fill="var(--mustard)"/>
        <g transform="translate(${960 + side * 480 - 70} 446) scale(.7)">${ICON[ic]}</g>
      </g>`;
    const svg = svgBox(`
      <path d="M900 930 H1020 L990 870 H930Z" fill="#1F1F1F"/><rect x="950" y="430" width="20" height="450" fill="#1F1F1F"/>
      <g data-tilt="${tilt}"><rect x="470" y="418" width="980" height="22" rx="11" fill="#1F1F1F"/></g>
      <circle cx="960" cy="429" r="26" fill="var(--mustard-d)"/>
      ${pan(-1, 'person')}${pan(1, 'building')}`, '0 0 1920 1080', 1920, 1080);
    place(svg, 0, 0);
    anim(svg, 0, 'fade', { dur: '0.06' });
    f.appendChild(svg);
    // labels hang 32px under their pan and move with it
    const l = el('div', 'lbl hard center', d.left); place(l, 480 - 260, 712, 520); anim(l, 0.12, 'up'); l.dataset.pan = '-1';
    const r = el('div', 'lbl hard center', d.right); place(r, 1440 - 260, 712, 520); anim(r, 0.16, 'up'); r.dataset.pan = '1';
    f.appendChild(l); f.appendChild(r);
    if (d.tag) f.appendChild(cornerTag(d.tag, 0.6));
    return f;
  };

  // ── lfVersus: two ideas, split screen ─────────────────────────────────────
  T.lfVersus = function (d) {
    const f = frame('cream');
    const L = el('div', 'half l bg-cream'); anim(L, 0, 'slideL', { dur: '0.12' });
    const R = el('div', 'half r bg-teal on-dark'); anim(R, 0.06, 'slideR', { dur: '0.12' });
    L.appendChild(head(d.left, { x: 120 }));
    R.appendChild(head(d.right, { soft: true, x: 120 }));
    const a = icon('buoy', 360); place(a, 300, 460); anim(a, 0.22, 'pop', { float: '6' }); L.appendChild(a);
    const b = icon('sign', 360); place(b, 300, 460); anim(b, 0.32, 'pop', { float: '6' }); R.appendChild(b);
    f.appendChild(L); f.appendChild(R);
    const ne = svgBox('<circle cx="80" cy="80" r="76" fill="var(--paper)"/><path d="M44 66 H116 M44 96 H116 M100 36 L60 126" stroke="#1F1F1F" stroke-width="12" stroke-linecap="round"/>',
      '0 0 160 160', 160, 160);
    place(ne, 880, 560); anim(ne, 0.45, 'pop');
    f.appendChild(ne);
    return f;
  };

  // ── lfLoop: the rescue cycle — three nodes, arrows that keep coming round ─
  // Every label sits 32px off its node and is centred on the node's height.
  T.lfLoop = function (d) {
    const f = frame(d.bg || 'cream');
    f.appendChild(head(d.title, { small: true }));
    const N = [[960, 380], [1300, 800], [620, 800]];
    let svg = '';
    N.forEach((a, i) => {
      const b = N[(i + 1) % 3];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const cx = mx + (my - 640) * 0.18 * (i === 2 ? -1 : 1), cy = my + (mx - 960) * -0.18;
      svg += `<path d="M${a[0]} ${a[1]} Q${cx} ${cy} ${b[0]} ${b[1]}" pathLength="1" stroke="var(--mustard-d)" stroke-width="8"
        fill="none" stroke-dasharray="1 1" data-draw data-at="${0.16 + i * 0.16}" data-dur="0.14"/>`;
    });
    N.forEach((a, i) => {
      svg += `<circle cx="${a[0]}" cy="${a[1]}" r="52" fill="var(--teal)" data-at="${0.06 + i * 0.16}" data-in="pop"/>`;
    });
    svg += `<g data-spin="70" data-at="0.66" data-in="pop" style="transform-box:view-box;transform-origin:960px 660px">
      <path d="M1030 660 A70 70 0 1 1 990 597" stroke="var(--teal-d)" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M972 574 L1004 594 L978 622" stroke="var(--teal-d)" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    const s = svgBox(svg, '0 0 1920 1080', 1920, 1080); place(s, 0, 0); f.appendChild(s);
    const steps = d.steps || [];
    const L0 = el('div', 'lbl', steps[0]); place(L0, 1044, 350); anim(L0, 0.1, 'left');
    const L1 = el('div', 'lbl', steps[1]); place(L1, 1384, 770); anim(L1, 0.28, 'left');
    const L2 = el('div', 'lbl', steps[2]); place(L2, 0, 770, 536); L2.style.textAlign = 'right'; anim(L2, 0.44, 'right');
    [L0, L1, L2].forEach((n) => f.appendChild(n));
    f.appendChild(cornerTag('Again and again', 0.74));
    return f;
  };

  // ── lfOptions: you lay out the options, they choose ───────────────────────
  T.lfOptions = function (d) {
    const f = frame(d.bg || 'teal', 'on-dark');
    f.appendChild(head(d.title, { soft: true }));
    const fig = figure('a', 330, true); place(fig, 180, 380); anim(fig, 0.04, 'up', { float: '4' }); f.appendChild(fig);
    const opts = d.options || [];
    const ys = opts.map((_, i) => 420 + i * 200);
    let svg = '';
    opts.forEach((_, i) => {
      svg += `<path d="M640 610 C860 610 900 ${ys[i]} 1120 ${ys[i]}" pathLength="1" stroke="var(--paper)" stroke-width="6" fill="none"
        stroke-dasharray="1 1" data-draw data-at="${0.12 + i * 0.08}" data-dur="0.16"/>`;
      svg += `<circle class="optc" cx="1170" cy="${ys[i]}" r="46" data-at="${0.2 + i * 0.08}" data-in="pop" ${i === d.chosen ? 'data-hl="0.62"' : ''}/>`;
    });
    const s = svgBox(svg, '0 0 1920 1080', 1920, 1080); place(s, 0, 0); f.appendChild(s);
    opts.forEach((o, i) => {
      // label and (for the chosen option) its marker share one baseline, 48px apart
      const row = el('div', 'optrow'); place(row, 1248, ys[i] - 40);
      const lb = el('div', 'lbl', o); anim(lb, 0.24 + i * 0.08, 'left'); row.appendChild(lb);
      if (i === d.chosen) { const t = el('div', 'tag', 'Their choice'); anim(t, 0.7, 'pop'); row.appendChild(t); }
      f.appendChild(row);
    });
    return f;
  };

  // words of a bubble, revealed one by one between a and b
  const bubbleWords = (n, text, a, b) => {
    const words = String(text || '').split(' ');
    words.forEach((w, i) => {
      const s = el('span', 'w', w + (i < words.length - 1 ? ' ' : ''));
      anim(s, a + (b - a) * (i / Math.max(1, words.length)), 'fade', { dur: '0.04' });
      n.appendChild(s);
    });
    return n;
  };

  // ── lfTalk: someone tells you something ───────────────────────────────────
  T.lfTalk = function (d) {
    const f = frame(d.bg || 'teal', 'on-dark');
    const fig = figure(d.speaker || 'a', 440, true); place(fig, 260, 330); anim(fig, 0.02, 'up', { float: '4' });
    f.appendChild(fig);
    const b = el('div', 'bubble'); place(b, 420, 120); anim(b, 0.12, 'pop', { dur: '0.08' });
    bubbleWords(b, d.bubble, 0.16, 0.6);
    f.appendChild(b);
    return f;
  };

  // ── lfSplit: the same moment, two ways ────────────────────────────────────
  // Each half: title at (120,96) · bubble from y=300 · speaker below it, tail over the head.
  T.lfSplit = function (d) {
    const f = frame('cream');
    ['left', 'right'].forEach((side, k) => {
      const s = d[side] || {};
      const dark = s.bg === 'teal';
      const H = el('div', `half ${k ? 'r' : 'l'} bg-${s.bg || 'cream'} ${dark ? 'on-dark' : ''} ${s.dim ? 'dim' : ''}`);
      H.appendChild(head(s.title, { soft: dark, small: true, x: 120, maxw: 740 }));
      const focus = d.focus === side;
      if (s.icon) {
        const ic = icon(s.icon, 400); ic.classList.add('dimmable'); place(ic, 280, 400);
        anim(ic, focus ? 0.18 : 0.02, 'pop', { float: focus ? '6' : '0' });
        H.appendChild(ic);
      } else {
        const fig = figure(k ? 'b' : 'c', 300, true); fig.classList.add('dimmable'); place(fig, 120, 560);
        anim(fig, 0.02, 'up', { float: focus ? '4' : '0' });
        H.appendChild(fig);
        if (s.bubble) {
          const b = el('div', 'bubble dimmable'); place(b, 180, 300); b.style.maxWidth = '660px'; b.style.fontSize = '46px';
          anim(b, focus ? 0.12 : 0.02, 'pop', { dur: '0.08' });
          if (focus) bubbleWords(b, s.bubble, 0.16, 0.58); else b.textContent = s.bubble;
          H.appendChild(b);
        }
      }
      f.appendChild(H);
    });
    return f;
  };

  // ── lfDots: many small moments gather into one picture ────────────────────
  T.lfDots = function (d) {
    const f = frame('cream');
    const n = d.n || 24;
    const COL = ['var(--teal)', 'var(--mustard)', 'var(--ink)', 'var(--teal-l)'];
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    let svg = '';
    for (let i = 0; i < n; i++) {
      const x0 = 180 + rnd() * 1560, y0 = 300 + rnd() * 600;
      // sunflower layout: the gathered "picture" is one full disc
      const r = 270 * Math.sqrt((i + 0.5) / n), a = i * 2.39996;
      const x1 = 960 + r * Math.cos(a), y1 = 620 + r * Math.sin(a);
      const size = 22 + (i % 4) * 7;
      svg += `<g transform="translate(${x0.toFixed(0)} ${y0.toFixed(0)})" data-move="${x0.toFixed(0)},${y0.toFixed(0)},${x1.toFixed(0)},${y1.toFixed(0)}" data-mat="0.5" data-mdur="0.25">
        <circle r="${size}" fill="${COL[i % 4]}" data-at="${(0.04 + 0.4 * i / n).toFixed(3)}" data-in="pop"/></g>`;
    }
    const s = svgBox(svg, '0 0 1920 1080', 1920, 1080); place(s, 0, 0); f.appendChild(s);
    const a = head(d.label || 'Small moments', { small: true }); a.dataset.at = '0'; a.dataset.in = 'fade'; a.dataset.until = '0.5';
    const b = head('One big picture', { small: true }); b.dataset.at = '0.56'; b.dataset.in = 'fade';
    f.appendChild(a); f.appendChild(b);
    return f;
  };

  // ── lfRecap: the three things to take away ────────────────────────────────
  T.lfRecap = function (d) {
    const f = frame('mustard', 'lf-titlecard on-mustard');
    const h = head('Remember', {}); h.style.top = '150px'; h.querySelector('.t').style.fontSize = '130px';
    f.appendChild(h);
    const box = el('div', 'recap');
    (d.items || []).forEach((it, i) => {
      const c = el('div', 'card', it);
      anim(c, 0.1 + i * 0.22, 'up', { dur: '0.1' });
      box.appendChild(c);
    });
    f.appendChild(box);
    return f;
  };
})();
