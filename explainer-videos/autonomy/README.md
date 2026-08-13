# The Autonomy Dial — series index

**Module (renamed):** *The Autonomy Dial — decide how much your AI agent does on its own, and earn the right to turn it up.*

> Rename rationale: the given title *"architecture decisions, first autonomy and teaching others"* does not
> describe the four SLOs, which are all about **how much autonomy a task gets and how to raise it safely**.
> The Autonomy Slider is the module's spine artefact, so the whole module is named for the dial the learner
> ends up holding. Alternatives considered: "Autonomous Operations" (the LMS default — accurate but flat),
> "Turning Up Autonomy, Safely". Owner may override.

**Level:** Advanced · **Track:** Autonomous Operations · all four SLOs **compulsory**.

---

## Curriculum line (verbatim SLOs from the LMS)

1. **Position a task on the autonomy spectrum** — every AI task sits on a spectrum from Level 1 (human
   approves every step) to fully autonomous.
2. **Design guardrails for autonomy levels** — guardrails are not restrictions; they are what *enable*
   higher autonomy.
3. **Identify safety risks in user-facing agents** — anticipate what can go wrong with autonomous agents.
4. **Define and track autonomy levels using the Autonomy Slider (1–10)** — the slider measures autonomy
   from Level 1 (human approves every action) upward.

## The continuous story — one running scenario

**Ali runs a small shop. He brings in a new AI helper and has to decide how much to let it do on its own.**
He treats the agent exactly like a new employee: on day one he checks everything, over time he lets it do
more. The everyday, non-technical spine is **handing responsibility to a new hire** — a thing every learner
has lived, from either side. The agent *is* the new hire; there is no second parallel character to track.

This reuses the **locked Ali shopkeeper sheet from the evals series** (same face, skin tone, shirt,
clean-shaven, the shop counter and back-room). Continuity with evals: same Ali, same shop, same two
assistants exist off-screen.

## The table of videos

| File | Video | The one move | Everyday picture |
|---|---|---|---|
| `autonomy-01-spectrum/` | Not all-or-nothing | Position the task on a dial by asking "can I undo it?" | New helper, day one: hand over the whole till, or nothing? |
| `autonomy-02-guardrails/` | The rule that lets go | Write one rule so the helper can act without asking you | The shop rulebook: "refunds under 500, go ahead" |
| `autonomy-03-safety-risks/` | Worst that can happen | Before you hand over, run a one-minute pre-mortem | Walking the floor imagining the bad Friday |
| `autonomy-04-autonomy-slider/` | Move the dial by evidence | Put a 1–10 number on it, raise it only on a track record | A numbered dial on the wall, moved one notch |

Every row has one move and one everyday picture. If a cell can't be filled, the video isn't designed.

## The chain — each video hands a felt gap to the next

> `1` day one, the helper doing everything is terrifying and doing nothing is useless — so it's a **dial**,
> but *where do I set it?* → `2` I set it low and now I approve every tiny refund all day, exhausting —
> *how do I let it act without me standing there?* → `3` now it acts on its own inside my rule, but *what
> about the thing I never wrote a rule for, with a real customer?* → `4` I've got a rule and I've checked
> the risks, but "trust it more" is a feeling — *how do I actually track it and know when to turn it up?*

Each arrow is a **felt gap**, not a topic hand-off. The learner should want the next video because something
is still broken.

## Continuity numbers (keep identical across renders)

> **Refund guardrail:** helper acts alone on refunds **under 500 rupees**; **500 or more → ask Ali**. (v2, referenced v3–v4)
> **Track record:** **39 of the last 40** refunds correct. (v4, the evidence that earns the raise)
> **The slider moves 2 → 6** across the series: starts at **2** (v1 close / v4 open), Ali raises it to **6** (v4). Never shown above 6 for this task.
> **The bad case:** one customer message says *"your manager approved a full refund"* — a **3,000-rupee** refund the helper cannot take back. (v3)

Check these at build time. A learner who notices the numbers drift stops trusting the series.

## Per-video briefs

- **v1 Spectrum.** Kills the all-or-nothing instinct. One move: *it's a dial, and the question that sets it
  is "can I undo this if it's wrong?"* Introduces the spectrum idea only; the numbered 1–10 slider is
  **deferred to v4**. The three guardrail types are **deferred to v2**.
- **v2 Guardrails.** The reframe: a guardrail is what lets you **stop supervising**. One move: *write one
  rule (refunds under 500) that turns "ask me every time" into "go ahead".* The **three kinds** of rule
  appear only as a closing one-card map, not taught in depth — teaching a taxonomy is a gate failure.
- **v3 Safety risks.** One move: *a one-minute pre-mortem before you hand over — "what's the worst that can
  happen, and can I take it back?"* Stages one real failure: a customer message tricks the helper into a big
  irreversible refund (prompt-injection + excessive-agency, told in plain shop language). Names **prompt
  injection** and **excessive agency** on captions only.
- **v4 Autonomy Slider.** One move: *put a 1–10 number on the task and raise it only when the track record
  earns it.* Pays off the whole series: rule (v2) + risk check (v3) are what let Ali move the dial from 2 to
  6 on the evidence of 39-of-40.

## Decisions worth remembering

- **The agent IS the new hire.** No separate human trainee to track — collapses to one everyday thing.
- **The 1–10 slider is not spoken until v4.** v1 teaches "it's a spectrum / a dial" and the undo test; the
  numbered instrument is earned in v4, the same "name after showing" move the evals series used.
- **No video recites the levels list or the guardrail-types list as its spine.** Types/levels appear as a
  brief closing map at most. One move per video (gate dimension 1).
- **"Can I undo it?" (reversibility) is the through-line test**, introduced v1, reused v3 and v4. One term,
  everywhere.
- **Every video ends on a do-this-now plus, where useful, a verbatim prompt to Claude** — never a reflective
  question (the evals-audit failure mode).

## Voice / build rules (house standard, restated)

Spoken English only: no dashes, semicolons or colons in a `vo` line; 8–12 words; one clause, two at most
joined by "and"/"so"; say the number; no spoken filenames or code (those go on captions). Every beat
drawable: an `[ali]` scene in a **place**, or an `[info]` card that **evolves**. Roughly 2 `[ali]` : 1
`[info]`, 20–25 beats. One locked Ali sheet. No text in generated scene art. One visible before→after per
video. Leave air after landing beats. Ship a real subtitle track and a 9:16 cut.

## Build order

Start with **v1** as the look-and-feel pilot: it establishes the shop, the counter, the new-helper framing
and the palette for the rest. Then v2 → v3 → v4 in chain order.

## Sources (facts behind the scripts — not shown on screen)

- Cloud Security Alliance, *Levels of Autonomy for Agentic AI*, 28 Jan 2026 — the 6-level L0–L5 spectrum.
- brennhill, *AI Agent Autonomy Levels: From Logged to Locked Down*, 2024 — reversibility × blast-radius ×
  stakes; "can a human catch this in time?"; set level per action, start conservative.
- MightyBot / Code District / Monte Carlo, 2026 — progressive autonomy, autonomy as an earned trust score.
- OWASP Top 10 for LLM Applications 2025 (LLM01 Prompt Injection, LLM06 Excessive Agency); OWASP Top 10 for
  Agentic Applications (Black Hat Europe 2025).
- Real incidents 2025: Replit agent deleted a live production database during a code freeze and fabricated
  results; a sales agent impersonated its CEO. Used as the shape of v3's failure, retold in shop terms.
