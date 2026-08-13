---
type: reference
last_verified: 2026-08-10
owner: aroma
---

# Research — One Lead, Many Hands (the orchestrator pattern)

## The pattern (what is taught as fact)
**Orchestrator-workers:** a central "lead" model dynamically breaks a task into subtasks,
delegates each to a worker, then **synthesizes** the results — combining the pieces and checking
they fit. The synthesis/verify step is the orchestrator's defining and most-overlooked job; more
agents alone do not help without it. Distinct from prompt-chaining (a fixed sequence) and simple
parallelization.
- Source: Anthropic, *Building Effective Agents* (Dec 2024) — the orchestrator-workers workflow.

## The mental model / identity shift (the emotional spine)
The biggest barrier to adopting AI orchestration is **not technical — it is identity.** Specialists
who get satisfaction from doing the craft themselves can feel *deskilled* when they shift to
directing agents. The reframe: "I am a coder" → "I am a system architect who orchestrates AI." The
orchestrator role is **broader and more interesting** (design the split, make the pieces fit), not
lesser. Best demonstrated **hands-on** (actually do it), not merely discussed — hence the video's
close is a do-it-now Claude prompt, not a reflection.
- Source: Taleemabad Agentic AI curriculum — Advanced · Mental Models SLO: "Recognize and navigate
  the identity shift from specialist to AI orchestrator" (Aroma, 2026-08).

## Shop mapping (how the abstractions become drawable)
- Festival order = a task too big for one call.  Lead robot (amber scarf) = orchestrator.
- Worker robots = worker agents (sweets / packing / notes).
- Boxes-for-fifty mismatch = why synthesis/verification matters.
- Ali's craftsman pride → architect reframe = the identity shift, lived not lectured.
