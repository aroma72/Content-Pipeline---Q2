# Research brief — v4 "Define and track autonomy with the Autonomy Slider (1–10)"

## Verified facts to teach
- **Autonomy is an earned trust score, raised by evidence** — not a deploy-day setting. Progressive autonomy:
  agents graduate through levels on **measured performance** (accuracy above threshold, low/stable override
  rate). • https://www.mightybot.ai/blog/what-is-progressive-autonomy • 2026 • https://montecarlo.ai/blog-agentic-autonomy-is-a-trust-score/ • 2026
- The staged path is consistent across sources: **shadow → supervised → spot-check → autonomous-with-
  monitoring** (a.k.a. Audit → Assist → Automate). • MightyBot 2026 • Code District 2026 (four-stage trust ladder)
- Set the level **per action, start conservative, ratchet up on earned trust and down on risk signals.**
  • https://dev.to/brennhill/ai-agent-autonomy-levels-from-logged-to-locked-down-45am • 2024
- Maps onto the CSA 6-level scale (L1 human approves each action → higher = monitoring only). The course's
  **1–10 slider** is our own finer-grained instrument over the same idea. • CSA 28 Jan 2026

## The 1–10 ladder — anchor levels (describe endpoints + a middle, don't recite all ten)
- **1** — helper proposes, Ali approves **every single action** before it happens.
- **~5/6** — helper acts alone **inside the rule** (refunds under 500) and shows Ali afterward; Ali handles
  the exceptions.
- **10** — helper runs the task end-to-end; Ali only watches the dashboard for anomalies.
- Teach by moving ONE task from **2 → 6**, not by reading all ten rungs.

## Strongest analogy
- **A numbered dial on the wall you move one notch at a time**, only after a good week. Concrete, drawable,
  and it makes "trust it more" measurable. The track record (39 of 40 refunds correct) is what turns the dial.
- AVOID: a "volume knob you crank to max" — implies higher is the goal; the point is right-sized and evidence-led.

## Learner misconceptions → failure-mode beat
1. **"Trust it more" is a feeling.** (The before: Ali *feels* the helper is doing well but has no number, so
   he either won't let go or lets go too fast. The slider gives him the number.)
2. **Higher is the goal.** (No — you move to the level the evidence supports, and 6 may be the ceiling for
   this task.)
3. **Set it and forget it.** (No — it moves both ways; a bad signal moves it back down.)

## Numbers / names for a card
- The dial **1 → 10**, with Ali's task marked, moving **2 → 6**.
- The evidence card: **39 of the last 40 refunds correct** → move up one notch.
- Caption only: progressive autonomy / trust score.

## Best teaching technique
**A single moving dial + a decision rule.** Put the 1–10 dial on screen, mark the task at 2, then show the
week's number (39/40) push it to 6 — and one bad signal nudge it back. The learner leaves with a literal
instrument and the rule for moving it: *raise it only when the last week of evidence earns the next notch.*
