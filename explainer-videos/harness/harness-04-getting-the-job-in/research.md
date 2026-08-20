---
type: research-brief
video: harness-04-getting-the-job-in
series: The Harness (V4). Continues V1–V3 — same Ali, shop + AI helper, glowing-orb brain, room = harness.
last_verified: 2026-08-13
owner: Aroma Tahir
---

# Research Brief — "Getting the job in & running it" (Harness series, V4)

Audience: beginners. ONE concept: **three parts of the room move a task from "typed" to "done":
the door (ingress), the memory (session/state + resume), and the loop (orchestration).** Does NOT
overlap evals (proof) or autonomy (how much freedom). V1 showed the room lets it act; V4 shows how a
whole MULTI-STEP job flows through the room over time.

## Verified facts to teach (each sourced)

1. **Ingress / the door.** The interface & ingress layer is the presentation boundary where a task
   arrives (terminal, API, webhook, chat). A job can arrive by a person typing OR automatically
   (webhook/schedule). — balaji bal, *Agentic Harnesses* (Medium), 2026.
   https://medium.com/@balajibal/agentic-harnesses-the-new-infrastructure-layer-for-ai-systems-3939c6fac1a6

2. **Session & state / the memory.** The session & state layer manages "task histories, checkpoints,
   resumability, and often artifact tracking" — this is what enables multi-turn workflows and lets a
   job stop and resume instead of starting over. — balaji bal (Medium), 2026.

3. **Orchestration / the loop (the "brainstem").** The control loop "governs task decomposition,
   planning, tool selection, branching, retries, escalation, and termination. It decides whether the
   next move is to ask a question, call a tool, update context, switch models, or present an answer."
   — balaji bal (Medium), 2026. (This loop, not the model, is what makes it act step by step.)

4. **Agent vs. chatbot.** The harness "makes an AI system behave less like a single-shot chatbot and
   more like a bounded, extensible, stateful actor." The loop + state are the difference between a
   chat that answers once and an agent that works a job to the end. — balaji bal (Medium), 2026.

## Chosen analogy (extends V1–V3)

- **Follow ONE job through the room.** A job enters through **the door**, the room keeps a **running
  note** of where it is (so a closed laptop doesn't reset it), and **the loop** keeps choosing the
  next step until it's finished. Keep the orb = brain and room = harness from earlier videos.

## Learner misconceptions to pre-empt → failure-mode beat

1. **"It starts over every time."** No — the running memory (state/checkpoints) lets it stop and
   resume (fact 2). (Reassure beat: Ali closes the laptop and it carries on.)
2. **"It does the job in one shot."** No — it's a loop that repeats: choose next step → act → repeat
   until done (fact 3).
3. **"It's just a chat."** A chat answers once; the loop + memory make it an agent (fact 4).
   (Failure-mode/contrast beat.)

## On-screen numbers
- None. This is a mechanism video — no stats; keep the three-part recap as a clean list.

## Best teaching technique

**Trace one task end to end.** Show a single multi-step job move through door → memory → loop, with
the emotional beat being "Ali closes the laptop and it keeps going." The recap names the three parts.
