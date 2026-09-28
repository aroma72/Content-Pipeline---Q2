'use strict';
/*
 * broll.js — one illustrated "snap" per beat, matched to what she says.
 * side = which edge it pops in on (alternates for a lively rhythm).
 * Same clean flat-illustration look + soft blush/cream palette as the video. No text.
 */
const STYLE = ' — clean minimalist 2D flat illustration, soft blush-pink and cream palette, ' +
  'soft studio lighting, simple and elegant, no text, no letters, no numbers, no watermark, no logos';

module.exports = [
  { id: '01', side: 'right',
    prompt: 'a stylish futuristic smart dress on a mannequin, glowing with delicate digital data lines and soft holographic sparkles, fashion fused with technology' + STYLE },
  { id: '02', side: 'left',
    prompt: 'a young woman standing before an augmented-reality smart mirror, a holographic outfit appearing over her reflection as a virtual try-on' + STYLE },
  { id: '03', side: 'right',
    prompt: 'a laptop and floating holographic panels showing AI-generated fashion collections and abstract trend curves, generative clothing designs, no readable text' + STYLE },
  { id: '04', side: 'left',
    prompt: 'a close-up of glowing smart fabric with tiny embedded tech threads and a gentle colour-shifting sheen, wearable technology textile' + STYLE },
  { id: '05', side: 'right',
    prompt: 'an elegant sustainable personalized outfit made of natural eco-friendly materials with subtle tech accents, soft green leaves and a recycle motif' + STYLE },
];
