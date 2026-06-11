# Prompt for Aroma — give this verbatim to your Claude Code in the Content-Pipeline---Q2 repo

> 

---

You are working inside my video pipeline repo (`Content-Pipeline---Q2`): Remotion (submodule) for
render, ElevenLabs for voiceover, manual ffmpeg assembly, and a `.beads/` + `REVIEWER_GATED_PIPELINE.md`
gating system with an append-only `content_feedback.jsonl`. Your job is **not** to replace any of this.
It is to **add a layer of quality gates on top of my existing pipeline** — the gates a collaborator
developed past this same pipeline through many rounds of real review. Build each gate to fit MY stack
(ElevenLabs, my Remotion setup, my ffmpeg).

Work in this order. After each gate, tell me where you hooked it in and show me it running once.

## Step 0 — Orient
Read my pipeline: the render flow, where VO is generated, where the final MP4 is produced, and how
`REVIEWER_GATED_PIPELINE.md` + `.beads/content_feedback.jsonl` currently gate steps. Confirm back to
me, in 3-4 lines, what stages exist today and where a post-render gate would naturally attach. Don't
build yet.

## Step 1 — The gate my pipeline is missing: an end-of-pipeline CONTENT JUDGE
My current QA checks production correctness only — resolution, fps, audio levels. That proves the file
is technically clean; it does **not** prove the video actually teaches. Build a final gate that scores
the **finished artifact** (not the steps) on four axes, each 1–5 with one line of evidence:
- **Educational efficacy** — would a true beginner in this topic actually learn the intended point?
- **Clarity** — is the core idea stated plainly, jargon defined, no ambiguity?
- **Engagement** — pacing, hook, does attention hold?
- **Cost** — was this the cheapest format that teaches it? (flag if an expensive format taught what a
  cheaper one could)

It must take the rendered MP4 + the script + the intended learning outcome, and emit a PASS/FAIL + the
four scores + specific fixes. A chain of approved steps does not prove the whole is good — this judges
the whole. Append its verdict to my `content_feedback.jsonl` so it lives in the system I already have.

## Step 2 — Content lint (runs on the SCRIPT, before render)
Build a pre-render check on the narration script that FAILS on any of these. Each is a real failure
that cost a re-render to catch:
1. **No assignments, ever.** First-contact training content DELIVERS; it never assigns. No file-homework
   ("create a `producer-mindset.md`"), no "your task", no "redo this as", no "submit". A closing
   "your turn" must be a *spoken reflection prompt*, never a deliverable. (The keep-a-human-in-the-loop /
   check-the-output message must live in the video BODY, not hidden inside a homework scene.)
2. **No internal/colleague names** in narration or on screen. Use generic roles ("a teacher"), or second
   person ("say you're designing slides"). Keep the running example consistent within one video.
3. **Define jargon on first use.** "agent", "context window", etc. — a beginner gets a plain definition
   the first time the word appears. Don't call an agent a "helper" without ever naming what it is.
4. **No bare time-phrase objects.** "solves today" / "gives you every week" is awkward — name the real
   object: "solves today's problem", "solves that same problem every week after."
5. **No hard-coded fast-moving model names** in narration — say "a modern image model (e.g. …)" so it
   doesn't date.
6. **One metaphor per concept** — e.g. the context window is "room to think" OR "memory", pick one and
   use it throughout a video.
Make it an LLM check (use my ANTHROPIC or OpenAI key — whichever I have) for 1, 3, 4, 6, and a plain
string/regex scrub for 2 and 5. Output the offending line + the rule it broke.

## Step 3 — Voice / pacing gates (run on the VO + final audio)
My TTS is ElevenLabs, which DOES support emotion/intonation — so adapt these to it, don't copy a
no-emotion workaround:
1. **No dead-air / awkward pauses.** Scan the final audio; FAIL on any silence longer than ~3 seconds
   (this spares short intentional beats). Long pauses read as "broken", not "thoughtful".
2. **Intentional intonation pauses, not robotic monotone.** Generate VO per-sentence (or per-beat) and
   join with short gaps (~0.4s between sentences, ~0.9s at scene ends) so the delivery breathes. Because
   you have ElevenLabs, also use its expressiveness controls — the original pipeline this came from used
   a TTS with NO emotion controls and had to fake it with punctuation; you don't have that limit, use it.
3. **Sentence-length band.** Keep narration sentences roughly 7–14 words on average, with a healthy share
   of `...` pauses, so cadence stays teachable rather than a wall of words. Flag scripts that drift long.

## Step 4 — Visual hierarchy gate (a vision-LLM LOOKS at the rendered frames)
Production QA never looks at *meaning* on screen. Build a gate that samples frames from the rendered MP4
and sends them to a vision model to verify:
1. **Emphasis hierarchy.** On any contrast/conclusion screen, the NEW behavior or mental-model you want
   them to ADOPT must visually dominate (bigger / accent color) the OLD one you want them to DROP. The
   single most common silent defect is this being inverted. Section title cards are exempt (a title just
   names the topic, renders uniformly).
2. **No leaked production labels** baked into frames (e.g. "[ANTI-PATTERN — <name>]"), no garbled text,
   legible, on-brand, not crowded — one illustration per scene at most; teaching labels stay as crisp
   on-screen text, never baked into a generated background image.
FAIL with the timestamp + the frame + what's wrong.

## Step 5 — Sync + flow check
A deterministic check that audio and video line up (scene duration == its VO duration, no drift), scenes
use fade transitions rather than jarring hard cuts, and the cadence matches the sentence-length band from
Step 3. FAIL on A/V drift beyond a small tolerance.

## Step 6 — Rubric, calibrated to MY curriculum (do NOT hardcode anyone else's)
The pedagogy gate must score against a rubric adapted to **my** curriculum and audience level — not a
borrowed one, which would mis-judge my content. So: take my curriculum/framework doc (ask me for it),
adapt a pedagogical rubric to it (identify what to keep, what to add for my domain, fill the gaps), and
have the content-judge in Step 1 use THAT rubric. If I don't give you a curriculum doc, ask for one
before scoring pedagogy — don't invent a rubric silently.

## Step 7 — Wire it as one gate sequence + self-test
Put the gates in this order and let me run them all with one command:
- **PRE-RENDER (on the script):** content-lint (Step 2) → flow/cadence (Step 5) → visual direction.
- **POST-RENDER (on the MP4, engine-agnostic):** silence/pause (Step 3) → visual-hierarchy frames
  (Step 4) → A/V sync (Step 5) → pedagogy rubric (Step 6) → content-judge (Step 1).
A video ships only when all pass. Append every verdict to `content_feedback.jsonl` so it joins my
existing feedback loop. Then **prove it works**: build one ~10-second test video through the full new
gate sequence and show me the gate report. Don't tell me it's done until I've seen that report.

## Two honesty notes, important
- These gates encode *rules* (the checklist above), not the original author's *taste*. The pass-bars were
  hand-tuned over many real review cycles against one specific curriculum. Yours will start looser or
  stricter — treat the first few runs as calibration: when a gate flags something you think is fine, or
  misses something you'd reject, tell me, and tune the threshold. The gates get good by you correcting
  them, exactly like `content_feedback.jsonl` is meant to.
- One known false-flag to expect: a pedagogy rubric written expecting a *committable artifact* will
  ding a concept video for "no assessable deliverable" even though a spoken reflection IS a valid
  assessment for a concept video. Encode that in your rubric (Step 6) so it doesn't flip-flop, or just
  treat that one flag as known-noise on delivery-only videos.

Start at Step 0. Report after each step. Build everything native to my ElevenLabs + Remotion + ffmpeg
pipeline.
