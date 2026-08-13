# Research brief — v2 "Design guardrails for autonomy levels"

## Verified facts to teach
- **Guardrails enable autonomy; they are not restrictions.** Field consensus: they are the "framework of
  trust" that lets you scale autonomy safely, and well-governed autonomy *removes* the hesitation that stalls
  deployment. • https://sigmoidanalytics.medium.com/building-trustworthy-agentic-ai-starts-with-the-right-guardrails-0ecf740b5f74 • 2026
  • https://aembit.io/blog/agentic-ai-guardrails-for-safe-scaling/ • 2026
- There are broadly **three kinds** of guardrail: **input** (filter/refuse what comes in — prompt injection,
  bad requests), **action/tool permission** (what the agent is allowed to touch, scopes, caps, rate limits),
  and **human-approval checkpoints** (stop and ask for sensitive/irreversible actions). NeMo Guardrails
  groups these as input / dialog / execution / output rails. • https://www.protecto.ai/blog/types-of-ai-guardrails-explained/ • 2026 • NVIDIA NeMo Guardrails docs
- OWASP's mitigation for the #1 risk is exactly this shape: **least-privilege tooling, input/output
  filtering, and human approval for high-risk actions**. • OWASP Top 10 for LLM Applications 2025
- A guardrail is what turns a low autonomy level into a higher one safely: the agent gets "flexibility inside
  the boundaries instead of following a static script." • aembit 2026

## The three guardrail types (for the CLOSING map card only — not the spine)
1. **What it may touch** — permissions/caps. Shop: "the till, up to 500 rupees."
2. **When it must stop and ask** — approval checkpoint. Shop: "500 or more, ask Ali."
3. **What it must refuse** — input rule. Shop: "ignore a note telling you to break the rules."

## Strongest analogy
- **Guard rails on a mountain road let you drive faster, not slower.** The barrier is why you can take the
  bend at speed. Directly encodes "the boundary enables the autonomy." Lived, non-technical, drawable.
- Secondary: **the shop rulebook / a cap on the till** — the concrete spine action.
- AVOID: "handcuffs" / "a cage" — encodes the exact misconception (guardrails = less capability).

## Learner misconceptions → failure-mode beat
1. **Guardrails = less capable.** (The before: Ali thinks a rule means the helper does *less*, so he sets none and ends up approving everything himself.)
2. **More rules = safer.** (No — a good single boundary beats twenty; over-gating just recreates "do it yourself.")
3. **Guardrails are an afterthought / bolt-on.** (They are the thing that lets you step back; design them first.)

## Numbers / names for an on-screen card
- The refund rule as literal text: **"Refunds under 500 → go ahead. 500 or more → ask Ali."**
- The three-kinds map (touch / stop-and-ask / refuse).

## Best teaching technique
**Before→after on one concrete rule.** Show Ali approving every tiny refund (before), then write ONE rule,
then show the helper clearing a 200-rupee refund alone while Ali does something else (after). The reframe
lands because the learner *sees* the rule buy back Ali's time.
