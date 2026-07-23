# Evals for Beginners — Video Scripts

Three short, beginner-friendly explainer videos on evaluation ("evals"): what they are, the two key types (end-to-end testing and LLM-as-a-judge), and how to connect Chrome MCP to run the E2E testing. Same house standard: single protagonist **Ali** (an engineer learning to work with AI coding agents), one spoken sentence per beat, everything defined in plain words, gentle mentor tone, spoken reflection close.

---

### VIDEO 1 — What Are Evals? (and why you need them)
**Covers:** What an eval is · why evaluation matters · "how does the model know it's correct?"
**Through-line:** Ali's agent builds a feature that "looks done," but he has no way to know if it's actually right — until he learns what an eval is.
**Beats:**
1. ali · "An eval is simply a way to check if your AI's work is actually correct." · cap: What is an eval? · art: Ali holding a small checklist beside a screen
2. scene · "Ali asked his AI agent to build a small feature." · cap: The agent builds · art: a friendly agent typing, a feature appearing on screen
3. ali · "It looked finished, but Ali couldn't tell if it truly worked." · cap: Looks done… but is it? · art: Ali unsure, a big question mark over the screen
4. scene · "If you've ever just trusted that it works, you are not alone." · cap: We've all done this · art: warm scene, Ali shrugging with a small smile
5. info · "The word 'eval' is just short for evaluation — a quality check." · cap: Eval = evaluation · info: definition card — "eval = a check of quality"
6. ali · "Here is the trap: an AI can pass its own test without being right." · cap: The hidden trap · art: the agent giving itself a thumbs-up beside a hidden bug
7. info · "You cannot improve what you do not measure." · cap: Measure to improve · info: a fuzzy blob turning sharp once a ruler is laid on it
8. ali · "So an eval gives the AI a clear target to be checked against." · cap: A clear target · art: a bullseye target labeled with simple criteria
9. scene · "Think of it like a teacher's answer key for the agent's homework." · cap: Like an answer key · art: an answer key held beside the agent's worksheet
10. info · "Every eval has two parts: what 'good' looks like, and a score." · cap: Criteria + score · info: card — "EVAL = criteria + score"
11. ali · "Without it Ali was only hoping; with it, he actually knows." · cap: Hoping vs. knowing · art: Ali confident as a green check appears
12. scene · "Evals matter even more as the AI does more on its own." · cap: More independence, more checking · art: the agent working solo with a safety net below it
13. ali · "So Ali now starts every task by asking, how will I check this?" · cap: Ask this first · art: Ali writing "How will I check this?" on a sticky note
14. info · "Next, we meet the two eval types every beginner should know." · cap: Two key types coming up · info: two preview cards sliding in
15. ali · "Which of your AI's results are you trusting without checking?" · cap: Your turn · art: Ali turning warmly to face the viewer

---

### VIDEO 2 — Two Key Types of Evals: E2E Testing & LLM-as-a-Judge
**Covers:** end-to-end (E2E) testing · LLM-as-a-judge · when to use each
**Through-line:** Ali has two very different things to check — a login flow and an AI-written summary — and learns to pick the right eval type for each.
**Beats:**
1. ali · "Two eval types cover most needs: end-to-end testing and LLM-as-a-judge." · cap: The two key types · art: Ali holding two labeled cards
2. scene · "Today Ali has two very different things to check." · cap: Two things to check · art: Ali with two task cards on his desk
3. ali · "One is a login flow; the other is an AI-written summary." · cap: A flow and a summary · art: a login screen beside a paragraph of text
4. info · "Some work has a clear right or wrong; some work is fuzzy." · cap: Clear vs. fuzzy · info: split card — a checkmark side vs. a shades-of-grey side
5. ali · "For the login, Ali uses end-to-end testing." · cap: Type 1 — E2E testing · art: Ali pointing at the login flow
6. info · "End-to-end means testing the whole journey, like a real user would." · cap: E2E = the whole journey · info: a path — open → type → click → result
7. ali · "It opens the app, logs in, and checks the user really gets in." · cap: Does it actually work? · art: each step completing with a green check
8. scene · "If any step breaks, the test catches it before your users do." · cap: Catch it before users · art: a bug caught safely in a net
9. info · "E2E answers one simple question: does the whole thing work?" · cap: The E2E question · info: card — "E2E: did it actually work?"
10. ali · "For the fuzzy summary, Ali uses an LLM-as-a-judge." · cap: Type 2 — LLM as a judge · art: Ali handing the summary to a friendly judge-robot
11. info · "LLM-as-a-judge means a second AI scores the output against rules." · cap: An AI that grades · info: a judge-robot holding a scorecard
12. ali · "It rates the summary for accuracy and clarity, one to five." · cap: Scored on criteria · art: a scorecard — "Accuracy 4/5 · Clarity 5/5"
13. scene · "A person could grade it too, but the AI does it fast and at scale." · cap: Fast, and at scale · art: many summaries being scored quickly
14. info · "Use E2E for 'did it work'; use a judge for 'was it good'." · cap: Which one to use · info: two-column — E2E "did it work" / Judge "was it good"
15. scene · "As a beginner, you can start with just these two — that is plenty." · cap: Start with these two · art: warm scene, Ali reassured
16. ali · "Both types matter, and together they cover most of your work." · cap: Both are important · art: the two cards glowing side by side
17. ali · "Which of your tasks is 'did it work', and which is 'was it good'?" · cap: Your turn · art: Ali turning to face the viewer

---

### VIDEO 3 — Connect Chrome MCP to Run E2E Testing
**Covers:** what MCP is · connecting Chrome DevTools to your agent · letting the agent run E2E tests itself
**Through-line:** Ali used to click through his app by hand; he connects Chrome through MCP so his agent does the end-to-end testing for him.
**Beats:**
1. ali · "Connect Chrome to your AI, and it can test your app by itself." · cap: The goal · art: an agent driving a browser while Ali watches
2. scene · "Ali used to click through every screen by hand after each change." · cap: The old way · art: Ali tiredly clicking button after button
3. ali · "It was slow, and he still missed the occasional bug." · cap: Slow and leaky · art: a bug slipping quietly past Ali
4. scene · "If manual testing drains you, this next part is a relief." · cap: A relief is coming · art: warm scene, Ali looking hopeful
5. info · "MCP is just a bridge that lets your AI use outside tools." · cap: MCP = a bridge to tools · info: a bridge from an agent to a toolbox
6. info · "Chrome DevTools is the browser's own built-in inspection toolkit." · cap: Chrome DevTools, defined · info: a browser with an inspector panel open
7. ali · "Ali connects Chrome DevTools to his agent through MCP." · cap: Connect the two · art: a cable linking the agent and a Chrome window · overlay: "Chrome DevTools MCP"
8. info · "Step one: install the Chrome DevTools MCP connector." · cap: Step 1 — install · info: numbered step card "1. install connector"
9. info · "Step two: add it to your coding tool's MCP settings." · cap: Step 2 — add to settings · info: a settings toggle switching on
10. info · "Step three: start your app so there is a page to test." · cap: Step 3 — run your app · info: a local app running at localhost
11. ali · "Now Ali just asks the agent to test the app end to end." · cap: Ask it to test · art: Ali typing a request; the agent opens Chrome
12. ali · "The agent opens the page, clicks through it, and reads any errors." · cap: It clicks like a user · art: the agent clicking; a console showing one red line
13. ali · "It finds a broken button, fixes it, then checks again." · cap: Find → fix → re-check · art: a broken button turning green
14. scene · "You just watch and approve, instead of clicking it all yourself." · cap: You review, not click · art: Ali relaxed, reviewing the results
15. info · "Save this setup as a reusable skill so you never repeat it." · cap: Save it as a skill · info: a skill card labeled "e2e-chrome-testing"
16. scene · "The same idea works for phone apps and other tools too." · cap: Works beyond the web · art: a phone screen being checked by the agent
17. ali · "As a beginner, start with one page and one flow — that is enough." · cap: Start small · art: warm scene, one simple flow highlighted
18. ali · "Which screen would you let your agent test first?" · cap: Your turn · art: Ali turning to face the viewer
