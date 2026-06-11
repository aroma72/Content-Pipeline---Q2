// gates/config.js
// Central, TUNABLE configuration for the quality-gate layer.
//
// HONESTY NOTE (read before trusting a verdict): the thresholds below are
// STARTING POINTS, not hand-tuned truth. The collaborator's pass-bars were
// calibrated over many review cycles against one specific curriculum. Yours
// will start looser or stricter. Treat the first few runs as calibration:
// when a gate flags something you think is fine — or misses something you'd
// reject — change the number here and note why. The gates get good by you
// correcting them, exactly like .beads/content_feedback.jsonl is meant to.

const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");

module.exports = {
  REPO_ROOT,
  FEEDBACK_LOG: path.join(REPO_ROOT, ".beads", "content_feedback.jsonl"),

  // ---- Model selection (per gate) ------------------------------------------
  // The final artifact judge and the vision-hierarchy gate use the strongest
  // vision model because correctness there is load-bearing. The text-only
  // lint runs per-line over a whole script, so it defaults to a cheaper model.
  // Dial these up/down freely.
  models: {
    judge: "claude-opus-4-8", // Step 1 final content judge (vision + text)
    lint: "claude-sonnet-4-6", // Step 2 script content-lint (text)
    vision: "claude-opus-4-8", // Step 4 visual-hierarchy frames (vision)
    pedagogy: "claude-opus-4-8", // Step 6 curriculum-calibrated rubric
  },

  // Per-1M-token pricing (USD), for the per-call cost estimate the report prints.
  pricing: {
    "claude-opus-4-8": { input: 5.0, output: 25.0, cacheRead: 0.5 },
    "claude-opus-4-7": { input: 5.0, output: 25.0, cacheRead: 0.5 },
    "claude-sonnet-4-6": { input: 3.0, output: 15.0, cacheRead: 0.3 },
    "claude-haiku-4-5": { input: 1.0, output: 5.0, cacheRead: 0.1 },
  },

  // ---- Step 1: Content Judge -----------------------------------------------
  judge: {
    // Each axis scored 1-5. PASS requires: every LEARNING axis (educational
    // efficacy, clarity, engagement) >= learningAxisFloor AND the mean over all
    // four axes >= minMean.
    learningAxisFloor: 3,
    minMean: 3.5,
    // CALIBRATION (2026-06-10): the "cost" axis is ADVISORY, not a hard blocker.
    // The prompt frames cost as a *flag* ("flag if an expensive format taught
    // what a cheaper one could"), and this pipeline's only renderer is Remotion
    // (full-motion) — there is no cheaper static-deck render path, so letting a
    // low cost score alone block an otherwise strong, well-teaching video would
    // penalize something the producer can't change. Cost still feeds the mean
    // and is always reported. Set costIsAdvisory=false to make it a hard floor.
    costIsAdvisory: true,
    framesSampled: 6, // evenly-spaced frames given to the judge as vision context
  },

  // ---- Step 2: Content Lint (script) ---------------------------------------
  lint: {
    // Rule 2 (names) and Rule 5 (model names) are deterministic scrubs.
    // Treat a name/model hit as a hard FAIL.
    // Known internal/colleague first names to scrub from narration + on-screen
    // text. EDIT THIS LIST for your team. Matched case-insensitively on word
    // boundaries.
    bannedNames: [
      "Aroma",
      "Harim",
      "Haroon",
      "Usman",
      "Taleemabad", // brand name — keep examples generic; brand is the FINAL example only, never narration filler
    ],
    // Rule 3 (define jargon on first use) calibration: words the TARGET
    // AUDIENCE is assumed to already know, so the lint should NOT demand a
    // definition for them. EDIT THIS for your audience level. Starts permissive
    // for an "intro to AI" cohort that already knows what "AI" and a "tool" are.
    assumedKnownTerms: ["AI", "tool", "tools", "software", "model", "models", "app", "data"],

    // Fast-moving model names that date a video. Narration should say
    // "a modern image model (e.g. ...)" instead of pinning a version.
    bannedModelNames: [
      "GPT-4o",
      "GPT-4",
      "GPT-5",
      "DALL-E 3",
      "DALL-E",
      "Midjourney v6",
      "Stable Diffusion XL",
      "Gemini 1.5",
      "Gemini 2",
      "Claude 3.5",
      "Sora",
      "Flux",
    ],
  },

  // ---- Step 3: Voice / pacing ----------------------------------------------
  voice: {
    maxSilenceSeconds: 3.0, // FAIL on any gap longer than this (dead air)
    silenceNoiseDb: -30, // ffmpeg silencedetect noise floor
    // Sentence-length band (Step 3.3): flag scripts that drift outside this.
    minAvgWordsPerSentence: 7,
    maxAvgWordsPerSentence: 14,
    // Share of sentences that should carry a deliberate "..." beat. Below this
    // reads as a wall of words.
    minEllipsisShare: 0.1,
    // ElevenLabs join targets (Step 3.2) — documented for the VO generator,
    // not enforced by a gate (the gate checks the *result* via silence scan).
    sentenceGapSeconds: 0.4,
    sceneEndGapSeconds: 0.9,
  },

  // ---- Step 5: Sync + flow -------------------------------------------------
  sync: {
    driftToleranceSeconds: 0.75, // |sceneDuration - sceneVOduration| must be <= this
  },

  // ---- Visual engagement (motion cadence) ----------------------------------
  // Keeps videos lively. Standard for short engaging educational/social video:
  // a meaningful visual change roughly every ~3s, and never a dead-static hold.
  // (Research: frequent change sustains attention, esp. early; avoid long static
  // holds. Sources logged with the gate.)
  engagement: {
    sampleFps: 2, // analyze 2 frames/sec (0.5s resolution)
    // A window counts as a real visible change when at least this FRACTION of
    // pixels changed (abs gray diff > 24). Calibrated empirically: truly static
    // windows read exactly 0.0000 (no encoding noise at this delta), a single
    // line of text appearing reads ~0.003, and cuts/large reveals read ~0.01-0.03.
    // Stable calibration for this cream/pastel brand palette: genuine element
    // reveals register at ~0.002-0.01; a frozen hold reads EXACTLY 0.0000 (no
    // encoding noise at delta 24). 0.0018 counts a real reveal as a change while
    // still failing any true freeze. (Grayscale under-reads pale-on-cream changes,
    // so the bar sits just above the static floor rather than higher.)
    changeThreshold: 0.0018,
    maxStaticSeconds: 4, // HARD FAIL: no static stretch longer than this, ever
    targetChangeSeconds: 3, // advisory: aim for a visible change at least this often
  },

  // ---- Step 6: Pedagogy rubric ---------------------------------------------
  // Calibrated 2026-06-10 to docs/agentic-ai-mastery-curriculum.md + the
  // Taleemabad Teaching & Learning Material Assessment Framework (8 domains,
  // 4 levels). Scale is the framework's native 1-4 (Not/Partially/Mostly/Fully
  // Met). See gates/prompts/pedagogy-rubric.txt.
  pedagogy: {
    rubricReady: true,
    minMean: 3.0, // mean LEVEL over applicable criteria (>= "Mostly Met")
    minFloor: 2, // a single "Not Met" (1) on any applicable criterion blocks
  },
};
