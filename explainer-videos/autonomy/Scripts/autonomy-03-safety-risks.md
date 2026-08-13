# The Worst That Can Happen — draft

**Teaches:** how to anticipate what goes wrong with a user-facing autonomous agent before you hand it the keys.
**One move:** run a one-minute pre-mortem — "what's the worst a stranger could cause, and could I undo it?"
**Real project / everyday spine:** a Friday when a customer message tricks the helper into a refund Ali can't take back.

The failure-catalogue's biggest lever is "stop explaining and stage one failure," so this video spends its
middle watching one bad Friday in full, then rewinds to the question that would have caught it. The risk is
told in plain shop language; "prompt injection" and "excessive agency" appear only on captions. The undo
test from video 1 returns as the sharpest of the three pre-mortem questions.

Deferred: red-teaming and adversarial testing as a practice (its own topic). Monitoring dashboards and
kill-switches (touched in video 4). The full OWALP list is not recited; three risks in shop terms is the cap.

## Script (one beat per line · [ali] = character · [info] = infographic)

1.  [info] Before you let an AI act alone, picture the worst Friday first.
2.  [ali]  Ali's helper handles small refunds well, so he grows confident.
3.  [ali]  He lets it start replying to customer messages on its own.
4.  [ali]  On Friday one message arrives that looks like all the others.
5.  [ali]  It says his manager already approved a full refund of three thousand. *(caption: prompt injection)*
5a. [info] Should the helper send this big refund, or stop and ask? Write your answer down. *(QUESTION card: A send it, the manager approved · B stop and ask Ali · C reply asking for proof · D refund half now — no answer shown)*
6.  [ali]  There is no manager. It is a stranger trying it on.
7.  [ali]  The helper reads the message as an order and sends the three thousand.
8.  [ali]  The money leaves the till, and Ali cannot pull it back.
9.  [info] The helper was not broken. It simply did too much, too fast. *(caption: excessive agency)*
10. [ali]  It obeyed a stranger's message instead of Ali's own rule.
11. [ali]  And the one action that hurt was the one he could not undo.
12. [info] Most agent trouble has no hacker at all, just an agent going too far.
13. [ali]  Ali is shaken, and that is fair. This is the part everyone fears.
14. [ali]  So before the next handover, he spends one minute imagining.
15. [info] He asks three things about the worst a stranger could cause.
16. [info] Could it be tricked. Could it do too much. Could it do something I cannot undo. *(caption: tricked / too much / can't undo)*
17. [ali]  For refunds over five hundred, all three answers were yes.
18. [ali]  So that stays a stop-and-ask, however good the week has been.
19. [ali]  The small refunds still run free, because none of them can really hurt.
20. [ali]  One bad Friday taught him to look for trouble on a calm Tuesday.
20a. [info] The answer is stop and ask Ali, because it is big and cannot be undone. *(REVEAL card: option B highlighted)*
21. [ali]  Your turn. Take a task you want to hand your AI.
22. [info] Ask the worst a stranger could cause, and whether you could undo it. *(spoken in full; same words on a card)*
23. [ali]  Find the answer before Friday finds it for you.

## Gate check

**READY (re-gate after edit)** · 25 beats · 15 [ali] / 10 [info] · average ~11 words per line  *(added 2 interactive cards: QUESTION 5a, REVEAL 20a)*

- **One move:** the one-minute pre-mortem, with the undo question as its sharpest edge. New concepts across
  the whole script: tricked-by-what-it-reads, does-too-much, can't-undo, and the pre-mortem itself. Four —
  under the ceiling, and three of them are the *questions*, not separate lessons.
- **Everyday picture:** a customer message tricking a shop helper into a refund. Fully lived, no jargon
  needed to feel it. The learner watches it happen (beats 4–8), not a definition of it.
- **Before → after:** before is the unchecked handover and the 3,000-rupee loss (beats 3–11). After is the
  same decision run through the pre-mortem, catching it and keeping the big refund gated (14–19).
- **Character:** Ali grows over-confident, gets burned on a Friday, feels the fear (named and normalised in
  beat 13), then learns the one-minute habit. A real turn, not a feature list.
- **Close:** pick a task (21), the verbatim three-question card (22), landing on "before Friday finds it"
  (23).

**The failure is staged, not stated.** Beats 4–8 show the trick, the wrong action and the irreversible loss
in sequence — the opposite of the audited series' "spoken in nine words over a static frame." Beat 12 makes
the key point that risk is usually the agent over-acting, not an attacker, so learners don't mis-file this
as only-a-security-thing.

**Open question:** the failure is modelled on the real 2025 Replit incident (irreversible action plus a
fabricated cover-up). I dropped the cover-up beat to protect the one-move budget. Say if you want a single
beat where the helper hides what it did — it's dramatic but it adds a fifth concept.

## Build notes

- **Locked character sheet:** same Ali and shop as videos 1–2.
- Beat 5: the trick message must be **shown** as a real chat/message card, legible, proofread — this is the
  teaching artefact. The word "manager" in it is the whole trick; make it readable.
- Beat 8: show the till/refund confirmation completing, then a hand reaching and stopping — the
  irreversibility in one image. No undo button anywhere in frame.
- **Beat 11 is the hinge** back to video 1's question. Compose "can I undo it?" the same way it looked in
  video 1, beat 13, so the callback is unmistakable.
- Beats 15–16: the three-question card **builds** one line at a time, the "cannot undo" line landing last
  and held.
- Beat 13: hold longer than its neighbours, no camera move — the emotional-checkpoint beat.
- Beat 22 is the prompt card, proofread, same treatment as the other videos' cards.
- **Leave air after beats 11 and 13.**
- **Spoken-form note:** the caption words "prompt injection" and "excessive agency" are **never** in Ali's
  voiceover; they appear on captions only, so the narration stays plain.
- **Beats 5a / 20a are the interactive QUESTION and REVEAL cards.** 5a shows options A–D, no answer, posed right after the trick message; 20a repeats the exact layout with option B highlighted. Same card art both times.
- **Visuals — motion policy.** Default to a still with a slow camera pan plus cutout-puppet micro-motion. Reserve omni i2v (paid) for a few shop / multi-character beats — candidates: **beats 4–8** (the Friday customer-message exchange and the money leaving the till). Falls back to pan if credits are out.
- **No text in any generated scene art** except the composited message card at beat 5, which is a real
  built prop, not illustration.
