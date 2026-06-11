// gates/lib/script.js
// Parse a narration script into the narration text the gates reason over.
//
// Handles two shapes used in this repo:
//   - VO_SCRIPT_EXACT.txt style: "SLIDE n: ..." headers, "-------" rules,
//     "[PAUSE ...]" markers, and the spoken lines between them.
//   - SCRIPT.md style: markdown with "**VO SCRIPT:**" / "> quoted" narration
//     and "**Delivery Notes:**" / metadata that must NOT be read aloud.
//
// We extract only what the voice actor would actually say, plus a scene split
// so the sync gate can line scenes up against per-scene VO.

const fs = require("fs");

function stripMarkup(s) {
  return s
    .replace(/^\s*>\s?/, "") // blockquote
    .replace(/\*\*/g, "")
    .replace(/[*_`]/g, "")
    .trim();
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Returns { scenes: [{title, narration}], narration, sentences, ellipsisCount }
function parseScript(file) {
  const raw = fs.readFileSync(file, "utf8");
  const lines = raw.split(/\r?\n/);

  const scenes = [];
  let current = null;
  let inVoBlock = false; // SCRIPT.md "**VO SCRIPT:**" section
  let sawVoMarkers = false;

  const sceneHeader = /^\s*(#+\s*)?(SLIDE|SCENE|SECTION)\s*\d+/i;
  const voMarker = /\*\*\s*VO\s*SCRIPT\s*:?\s*\*\*/i;
  const deliveryMarker = /\*\*\s*(Delivery Notes|Visual|Animation|Word Count|Time Budget|Mentor|Audio|Notes)\b/i;
  const ruleLine = /^\s*-{3,}\s*$/;

  function startScene(title) {
    current = { title: title.trim(), narration: [] };
    scenes.push(current);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (sceneHeader.test(line)) {
      startScene(stripMarkup(line));
      inVoBlock = false;
      continue;
    }
    if (voMarker.test(line)) {
      inVoBlock = true;
      sawVoMarkers = true;
      continue;
    }
    if (deliveryMarker.test(line)) {
      inVoBlock = false; // stop reading narration until next VO/scene
      continue;
    }
    if (ruleLine.test(line)) continue;

    // Skip pause markers, but remember them as deliberate beats (counted below).
    if (/^\s*\[?\s*PAUSE\b/i.test(stripMarkup(line))) continue;

    const text = stripMarkup(line);
    if (!text) continue;
    // Skip obvious metadata lines.
    if (/^(Total|Format|Voice|Tone|Pacing|Visual|Color|Duration|TOTAL|=+|Word|Time)\b/i.test(text)) continue;
    if (/^={3,}/.test(line)) continue;

    if (!current) startScene("Scene 1");

    // In SCRIPT.md mode, only blockquoted VO lines count; in plain mode, take
    // narrative lines. Heuristic: if the doc uses VO markers, require inVoBlock
    // OR a leading ">". Otherwise take the line.
    const isQuoted = /^\s*>/.test(line);
    if (sawVoMarkers) {
      if (inVoBlock || isQuoted) current.narration.push(text);
    } else {
      current.narration.push(text);
    }
  }

  const sceneObjs = scenes
    .map((s) => ({ title: s.title, narration: s.narration.join(" ").trim() }))
    .filter((s) => s.narration.length > 0);

  const narration = sceneObjs.map((s) => s.narration).join(" ").trim();
  const sentences = splitSentences(narration);
  const ellipsisCount = (narration.match(/\.\.\.|…/g) || []).length;

  return { scenes: sceneObjs, narration, sentences, ellipsisCount };
}

module.exports = { parseScript, splitSentences };
