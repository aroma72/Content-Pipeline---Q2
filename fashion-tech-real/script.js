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
  'A candid, authentic photograph of a real young woman with a natural clean-girl aesthetic: sleek ' +
  'slicked-back low bun with a few loose flyaway hairs, minimal natural makeup, real untouched skin ' +
  'with visible pores, subtle texture and tiny natural imperfections (not airbrushed, not retouched), ' +
  'soft nude lips, small gold hoop earrings, a warm relaxed genuine expression, wearing a soft ' +
  'blush-pink ribbed knit top, sitting at a modern table with her hands resting on it, looking ' +
  'directly into the camera, head and shoulders and upper body in frame, clear fully-visible face ' +
  'and lips, mouth closed in a relaxed neutral expression, hyper-realistic candid photograph shot ' +
  'on a full-frame camera with a 50mm f1.8 lens, soft natural window light, shallow depth of field, ' +
  'realistic natural colour, subtle film grain, looks like a real person on a video call, ' +
  'absolutely photorealistic, no illustration, no CGI, no 3D render';

module.exports.background =
  ' Behind her, a softly blurred chic fashion studio: a clothing rack, a dress form, and faint ' +
  'glowing holographic fashion-tech panels — all out of focus so she stays the clear subject. ' +
  'No text, no letters, no numbers, no words, no watermark, no logos, no UI, no captions.';
