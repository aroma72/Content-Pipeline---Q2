# Research brief — v1 "Position a task on the autonomy spectrum"

## Verified facts to teach
- Autonomy is a **spectrum, not a switch**. The Cloud Security Alliance defines **six levels**, L0 (human
  performs all actions, AI only advises) → L5 (self-directed). Human involvement decreases as you move up.
  • https://cloudsecurityalliance.org/blog/2026/01/28/levels-of-autonomy • 28 Jan 2026
- The level should be set **per action, not per agent**, and you should **start conservative** and raise it
  only on earned, logged trust. • https://dev.to/brennhill/ai-agent-autonomy-levels-from-logged-to-locked-down-45am • 2024
- The single question that positions a task: grade it on **reversibility × blast radius × stakes**; the core
  test is **"can a human realistically catch this mistake in time?"** If not, don't just gate it — prevent
  or escalate. Same source.
- Cheap-to-reverse actions can "run hot" (high autonomy); irreversible ones stay gated no matter how good
  the model looks on benchmarks. Same source.
- Singapore IMDA (Jan 2026) and CSA both frame governance as increasing with the level — evidence the
  spectrum framing is now the field standard, not one vendor's idea.

## Strongest analogy
- **A new hire on day one.** You don't hand a new employee the keys to everything, and you don't make them
  ask permission to breathe either. You pick, per task, how much they do alone. Universally lived, maps 1:1.
- Secondary (for a caption/info card only): **SAE driving levels L0–L5** — the canonical graduated-autonomy
  scale, "feet off / hands off / eyes off". Good as a one-card nod; do NOT make it the spine (many learners
  don't drive, and it drags in cars).
- AVOID: "autopilot" as the whole metaphor — it implies a binary on/off, which is the exact misconception.

## Learner misconceptions to pre-empt → failure-mode beat
1. **All-or-nothing**: "either I let the AI run free or I do it myself." (The core one. This is the before-state.)
2. **Higher is better**: more autonomy = more advanced = the goal. (No — the right level is task-specific.)
3. **Set once**: pick a level at deploy time and forget it. (No — per action, and it moves.)

## Numbers / names worth an on-screen card
- The **spectrum L1 → fully autonomous** (label the two ends and one middle).
- The one-question test on a card: **"Can I undo it?"** feeding **low vs. high** autonomy.

## Best teaching technique
**Contrast pair + the one decisive question.** Show the two wrong instincts (everything / nothing) as a
visible before, then collapse the decision to a single everyday question — *"if it's wrong, can I take it
back?"* — that a beginner can apply to their own task immediately.
