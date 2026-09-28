'use strict';
/*
 * script.js — the one-minute voiceover, split into chunks that each stay UNDER
 * the infinitalk 15s-per-call audio cap. Same girl still drives every chunk;
 * the chunks are lip-synced separately then concatenated into one continuous shot.
 * ~28-32 words/chunk ≈ 10-12s each at a warm conversational pace.
 */
module.exports = [
  { id: '01', vo: "Hey! Let's talk about why fashion tech is the future. Fashion isn't just fabric anymore — it's data, it's design, and it's reinventing how we create and wear clothes." },
  { id: '02', vo: "Imagine trying on a whole wardrobe without leaving your room. Augmented-reality mirrors and virtual fitting rooms already let you see the perfect fit before you ever buy." },
  { id: '03', vo: "AI is designing collections in minutes, predicting trends before they hit the runway, and helping brands make only what people actually want — so we waste far less." },
  { id: '04', vo: "And it's getting personal. Smart fabrics can track your health, adjust to the weather, and even change colour — turning your outfit into wearable technology." },
  { id: '05', vo: "The future of fashion is smart, sustainable, and made just for you. So stay curious — because the runway of tomorrow is being coded today." },
];

// One consistent look for the girl, reused by the art prompt AND the lip-sync motion prompt.
module.exports.avatarPrompt =
  'A glamorous Barbie-like supermodel young woman with long flowing blonde hair, flawless makeup, ' +
  'big expressive eyes and a warm confident smile, wearing a chic stylish designer outfit, ' +
  'sitting elegantly at a sleek modern table with her hands resting gently on it, ' +
  'facing the camera straight on, head and shoulders and upper body in frame (medium shot), ' +
  'clear fully-visible face and lips, mouth closed in a pleasant neutral expression, ' +
  'polished glossy 2D cartoon illustration style, vibrant fashion-magazine colours, soft studio lighting';

module.exports.background =
  ' Behind her, a softly blurred chic fashion studio: a clothing rack, a dress form, and faint ' +
  'glowing holographic fashion-tech panels — all out of focus so she stays the clear subject. ' +
  'No text, no letters, no numbers, no words, no watermark, no logos, no UI, no captions.';
