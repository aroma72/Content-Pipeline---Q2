# Evals Series — Videos 2 & 3 (for review)

Follow-ups to Video 1 ("What Are Evals?"). Same house standard: single protagonist **Ali** (an engineer learning to work with AI coding agents), one spoken sentence per beat, jargon defined plainly, beginner-friendly but going deeper, ≥2 emotional checkpoints, no title cards / no file-homework, spoken reflection close.

---

### VIDEO 2 — Eval Types, and End-to-End Testing in Depth
**Covers:** the family of eval types (beyond E2E & LLM-judge) · what E2E is · how to set it up · which scenarios to cover
**Through-line:** Ali just built a login feature; he surveys the eval types, then sets up end-to-end testing properly and covers the scenarios that matter.
**Beats:**
1. ali · "Evals come in several types — today we go deep on end-to-end testing." · cap: Types + deep on E2E · art: Ali gesturing to a row of small labelled eval cards
2. scene · "Ali just built a login feature and wants to be sure it really works." · cap: A feature to check · art: Ali at a desk, a login screen on his laptop, bright office
3. info · "First, a quick map of the common eval types." · cap: The eval family · info: checks list revealing ["Code tests", "End-to-end tests", "Human review", "LLM as a judge", "Regression tests"]
4. ali · "Each type answers a different question about quality." · cap: Different questions · art: Ali beside the cards, each card showing a small question mark
5. info · "Code tests check tiny pieces; regression tests catch what a change broke." · cap: Two quick ones · info: twocard — left "Code tests → tiny pieces", right "Regression → did a change break it?"
6. ali · "Today Ali zooms into end-to-end testing, the big-picture check." · cap: Zoom into E2E · art: Ali holding a magnifying glass over the "End-to-end" card
7. info · "End-to-end means testing the whole journey, like a real user." · cap: What E2E is · info: statement — text "Test the whole journey, like a real user.", hi "whole journey"
8. ali · "For login, that runs from typing a password to landing inside." · cap: The full flow · art: Ali tracing a path from a password box to a dashboard
9. info · "Setting it up takes four simple steps." · cap: Set up E2E in 4 steps · info: fourparts — ["Pick a key user flow", "Write the exact steps", "Automate it with a tool", "Check the real result"]
10. ali · "Step one: pick the flow that would hurt most if it broke." · cap: 1 — Pick a key flow · art: Ali choosing "login" from several flow cards
11. ali · "Step two: write the exact steps a real user would take." · cap: 2 — Write the steps · art: Ali listing steps on a card with blank lines
12. ali · "Step three: let a tool run those steps automatically in the app." · cap: 3 — Automate it · art: a small robot clicking through the app on screen
13. ali · "Step four: check the real result, not just that it ran." · cap: 4 — Check the result · art: Ali confirming the user actually landed inside, green check
14. scene · "If this feels like a lot, relax — you start with just one flow." · cap: Start with one flow · art: warm scene, Ali calm, a single flow highlighted
15. info · "Then cover the scenarios that really matter." · cap: Scenarios to consider · info: checks list ["Happy path", "Wrong password", "Empty fields", "Different user roles", "Slow or no network", "Phone and desktop"]
16. ali · "The happy path is when everything goes right." · cap: The happy path · art: a smooth green flow from start to finish
17. ali · "But real users mistype, lose signal, and use phones." · cap: Real users are messy · art: Ali showing a mistyped password, a phone, and a weak-signal icon
18. ali · "So Ali also tests wrong passwords and clear error messages." · cap: Test the failures too · art: Ali checking that a friendly error message appears
19. ali · "He checks different roles, like an admin versus a normal user." · cap: Different roles · art: two user badges, one "admin" and one "user"
20. info · "Run E2E before you ship, and again after every change." · cap: When to run it · info: statement — text "Run it before shipping, and after every change.", hi "every change"
21. ali · "Now Ali ships knowing the whole journey truly works." · cap: Ship with confidence · art: Ali relaxed, a green check over the full flow
22. ali · "Which flow in your app would hurt most if it silently broke?" · cap: Your turn · art: Ali turning to face the viewer

---

### VIDEO 3 — LLM-as-a-Judge, In Depth
**Covers:** what an LLM judge is · how to use it well (criteria, score + reason, reliability, bias) · technical uses like reviewing your code, classifying, and comparing
**Through-line:** Ali starts with fuzzy outputs like summaries, learns to run an LLM judge properly, then points it at harder technical work — including reading his own code.
**Beats:**
1. ali · "An LLM-as-a-judge is a model that scores work against your rules." · cap: What it is · art: Ali handing an output to a friendly judge-robot holding a scorecard
2. scene · "Some outputs have no simple right answer, like a summary." · cap: Fuzzy outputs · art: Ali reading a paragraph summary on screen
3. ali · "You cannot unit-test whether a summary is clear and fair." · cap: Hard to test normally · art: a broken ruler held against a block of text
4. info · "So a second model reads it and scores it against criteria." · cap: How it works · info: statement — text "A second model scores the output against criteria.", hi "criteria"
5. ali · "The secret is giving the judge clear, written criteria." · cap: Clear criteria first · art: Ali writing a rubric card with blank rows
6. info · "Ali scores each summary on accuracy, clarity, and completeness." · cap: A simple rubric · info: checks list ["Accuracy", "Clarity", "Completeness"]
7. ali · "He gives the judge the input, the output, and the rubric." · cap: Feed it everything · art: three cards (input, output, rubric) flowing into the judge-robot
8. ali · "And he asks for a score plus the reason behind it." · cap: Score + reason · art: the judge returns a "4 out of 5" with a short note
9. scene · "The reason matters as much as the number — it tells you why." · cap: Reasons build trust · art: Ali reading the judge's explanation, nodding
10. info · "A few habits make the judge far more reliable." · cap: Make it reliable · info: checks list ["Use a strong model", "Give it an example answer", "Ask for structured output", "Check it against human scores"]
11. ali · "Watch for bias: judges can favour longer or first answers." · cap: Watch for bias · art: the judge leaning toward a bigger answer, Ali cautioning
12. ali · "And never let a model be the only judge of its own work." · cap: Don't self-judge blindly · art: a model marking its own paper while Ali raises a gentle hand
13. scene · "If bias worries you, that caution is exactly right." · cap: Being careful is good · art: warm scene, Ali reassured
14. scene · "Now for the powerful part: judging technical work." · cap: Going technical · art: Ali turning toward a code editor on screen
15. ali · "Ali points the judge at his code, not just his text." · cap: Judge your code · art: the judge-robot reading a panel of code
16. info · "It can review code for spec, safety, readability, and bugs." · cap: What it checks in code · info: fourparts — ["Matches the spec?", "Is it safe?", "Is it readable?", "Any obvious bugs?"]
17. ali · "He asks, does this function actually do what the spec says?" · cap: Match the spec · art: the judge comparing a code block to a spec card
18. ali · "He also uses it to sort messages, like a task versus a chat." · cap: Classify too · art: the judge dropping messages into two bins, "task" and "chat"
19. ali · "For big jobs, it compares two versions and picks the better one." · cap: Compare two answers · art: the judge weighing version A against version B on a balance
20. scene · "Start small: one rubric, a few outputs, checked against your own judgement." · cap: Start small · art: warm scene, Ali with a single rubric card
21. ali · "Used well, a judge scales your good taste across thousands of outputs." · cap: Scale your judgement · art: Ali calm as a stream of outputs each get a score
22. ali · "What fuzzy output in your work could a judge start scoring today?" · cap: Your turn · art: Ali turning to face the viewer
