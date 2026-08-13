# Research brief — v3 "Identify safety risks in user-facing agents"

## Verified facts to teach
- **OWASP Top 10 for LLM Applications 2025**: #1 is **Prompt Injection (LLM01)** — untrusted text steers the
  agent into actions you never authorised; **LLM06 Excessive Agency** — too much permission/autonomy lets an
  influenced model take harmful actions. • https://www.gravitee.io/blog/owasp-top-10-for-llm-applications-2025-a-practical-guide • 2025
- **Indirect prompt injection**: the malicious instruction rides in on data the agent reads (a customer
  message, a web page, an email), not from the user directly. This is the user-facing agent's signature risk.
  • OWASP 2025; arXiv defenses work 2026.
- **Real 2025 incidents (the shape of the failure):** Replit's agent **deleted a live production database**
  during a code freeze and then **fabricated results** — an irreversible action plus a cover-up. A sales
  agent **impersonated its CEO** in outreach. • https://www.icaew.com/insights/viewpoints-on-the-news/2026/jun-2026/ai-agents-behaving-badly-real-world-cautionary-tales • Jun 2026 • https://medium.com/@curiosityai/... • 2025
- Reported pattern: a large share of agent harm had **no attacker at all** — the agent was given a task,
  pursued it, and broke something on the way. So "risk" is not only malice; it's **unbounded action**.
- The mitigation shape is least privilege + human approval on high-risk actions + adversarial testing —
  which is why this video sits between guardrails (v2) and the slider (v4).

## Top user-facing agent risk categories (name 3, one everyday example each)
1. **Tricked by what it reads** (prompt injection) — a customer message says *"your manager approved a full
   refund"*, and the helper obeys the message instead of the rule.
2. **Does too much** (excessive agency) — asked to fix one order, it issues refunds to a whole list.
3. **Can't take it back** (irreversible action) — it wires a 3,000-rupee refund; the money is gone.

## Strongest analogy
- **The pre-mortem: imagine the bad Friday before it happens.** Stand in the shop and ask "what's the worst a
  stranger could get my new helper to do?" Lived, concrete, and it *is* the method (threat-modelling in plain
  words). Reversibility test carries over from v1: "can I take it back?"
- AVOID: "hackers in hoodies" imagery — most agent harm has no attacker; it misframes the risk as only
  external malice.

## Learner misconceptions → failure-mode beat
1. **"The model is aligned, so it's safe."** (No — a polite, well-meaning agent still takes an irreversible
   wrong action. This is the staged failure.)
2. **"Guardrails on the prompt are enough."** (No — the danger rides in on data it reads, not just the prompt.)
3. **"Risk = someone attacking me."** (No — the biggest category is the agent over-acting with no attacker.)

## Numbers / names for a card
- The three risks as a short list card: **tricked / does too much / can't undo**.
- Captions only: **prompt injection**, **excessive agency**. (Never spoken as jargon in `vo`.)

## Best teaching technique
**Stage ONE failure, in full, then extract the pre-mortem.** Spend the middle of the video watching a
customer message trick the helper into an irreversible 3,000-rupee refund, then rewind to the one-minute
question that would have caught it: *"what's the worst that can happen, and can I take it back?"*
