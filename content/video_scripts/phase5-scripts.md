# Phase 5 — "Sharpening the Blade" · Explainer Video Scripts

Advanced thinking patterns, data mastery, and quality reflection. Every script follows the house scripting standard: single protagonist **Ali** (an engineer at an ed-tech company learning to orchestrate AI coding agents), one concept per video, pyramid lead, one spoken sentence per beat, ≥2 emotional checkpoints, no title cards / no file-homework, closing spoken reflection. Hand each to `reviewing-explainer-scripts` before art/TTS.

---

## Coverage map — session teaching points → script

| Session teaching point | Covered in |
|---|---|
| Consumer vs producer mindset | SC-1, SLO 5.4 |
| Autonomy — agent owns tasks, diagnoses/fixes its own errors | SC-1 |
| Autonomous systems fail repeatedly (expected, not failure) | SC-1, SLO 5.1b |
| Skills as reusable building blocks (avoid re-explaining) | SLO 5.5, SC-1, SC-3 |
| Self-improvement — feed corrections back into skills/harness | SLO 5.5, SC-1 |
| Why evals — "how does the model know what it built is correct?" | SLO 5.1b |
| Plan first (documented plan in a file, actually read it) | SC-2 |
| Implement, then verify | SC-2 |
| Match plan vs. implementation as verification | SC-2 |
| Automate browser testing via Chrome DevTools MCP | SC-3 |
| Layered eval types (unit tests · hooks · browser E2E · output scoring) | SC-3, SLO 5.1b, SLO 5.7 |
| Hooks intercept risky actions (e.g. DB delete → ask permission) | SC-3 |
| Evaluating AI-generated outputs (scoring / classifying) | SLO 5.7, SLO 5.1b |
| Test cases in BDD format (specific Given/When/Then) | SC-4, SLO 5.1b |
| Organize test cases under docs/features/…, review before running | SC-4 |
| Generate test cases from the codebase if no plan exists | SC-4 |
| Turn the workflow into a reusable skill (e2e-chrome-testing) | SLO 5.5, SC-3 |
| Slash commands to trigger skills reliably (/plan) | SC-2, SLO 5.5 |
| Generalizes to mobile / Figma; backend validates functions directly | SC-3 |
| Limits of "give the agent tools and let it self-verify" | SC-3 (close) |

---

# Section A — Session-Core Workflow Scripts

These four cover the session's central narrative (consumer→producer, the plan→verify workflow, browser self-testing, and BDD test cases) that the granular SLOs don't fully hit.

### SC-1 — From consumer to producer (autonomy)  [compulsory]
**Concept (1 line):** Shift from a consumer (tell the AI what to do, fix things yourself) to a producer (build a system that runs itself), because autonomy means the agent owns the task — even diagnosing and fixing its own errors.
**Ali's scenario (1 line):** Ali copy-pastes every error back to his agent by hand, then builds a system where the agent catches and fixes its own errors.
**Beats:**
1. ali · "Stop telling the agent what to do; build a system that runs itself." · cap: Consumer to producer · art: Ali stepping back from the keyboard as a system hums on its own
2. scene · "Ali used his agent like a vending machine: ask, receive, repeat." · cap: The consumer habit · art: Ali pressing buttons on an "AI vending machine"
3. ali · "Every time it errored, he copied the message back by hand." · cap: Copy-paste the error · art: Ali pasting a red error into the chat · overlay: error text moving into a prompt
4. scene · "That hands-on habit feels responsible, and nearly everyone starts there." · cap: We all start here · art: warm scene, Ali busy but smiling
5. info · "A consumer directs the tool; a producer builds the system." · cap: Two mindsets · info: two-column compare — Consumer "tell it, fix it yourself" vs Producer "build it, it runs itself"
6. ali · "Ali was the bottleneck every single time it stumbled." · cap: You are the bottleneck · art: Ali as a narrow gate that every task waits behind
7. info · "The producer's goal is autonomy: less human dependency." · cap: Autonomy · info: definition card — "Autonomy = the agent owns the task"
8. ali · "So Ali let the agent read its own errors and try a fix." · cap: It fixes itself · art: the agent catching its own red error and patching it · overlay: "error → self-fix"
9. scene · "Handing over control feels risky, and that unease is normal." · cap: The unease is normal · art: Ali watching, hands off, slightly tense
10. info · "Autonomy is a dial you turn slowly, not a switch you flip." · cap: Turn the dial slowly · info: a dial sliding from "manual" toward "autonomous"
11. info · "Expect it to fail as it does more; that is the process." · cap: Failing is expected · info: a rising "autonomy" line with small dips labeled "normal"
12. ali · "He gave it tools to diagnose, retry, and verify on its own." · cap: Give it the tools · art: the agent with a toolkit working independently
13. ali · "Now Ali reviews outcomes instead of babysitting every step." · cap: Review, don't babysit · art: Ali relaxed, checking results on a dashboard
14. info · "Producer mindset trades doing the work for owning the system." · cap: Own the system · info: before/after — "does tasks" vs "runs a system"
15. ali · "Same engineer, far more shipped, far less copy-pasting." · cap: More shipped, less grind · art: Ali calm as many features flow out of a pipeline
16. ali · "Where are you still the bottleneck your system could remove?" · cap: Your turn · art: Ali turning gently to face the viewer

### SC-2 — Plan first, then verify  [compulsory]
**Concept (1 line):** Always write a documented plan in a file before building and actually read it, then implement, verify, and match the build against the plan.
**Ali's scenario (1 line):** Ali dives straight into building, gets the wrong thing, then writes a plan file first, reads it, builds, and checks the result against it.
**Beats:**
1. ali · "Write the plan in a file before you build anything." · cap: Plan first · art: Ali opening a fresh plan.md before touching code
2. scene · "Ali used to just tell his agent 'build it' and hope." · cap: Straight to building · art: Ali and the agent rushing into a tangle of code
3. ali · "The agent built fast, but it built the wrong thing." · cap: Fast, but wrong · art: a finished feature that clearly misses the mark
4. scene · "Skipping the plan feels faster, and we have all done it." · cap: We all skip it · art: warm scene, Ali looking a little sheepish
5. info · "A plan is a written file you make before implementation." · cap: What is a plan? · info: definition card — "Plan = documented intent, in a file"
6. ali · "So Ali had the agent write the plan first, then he read it." · cap: Read the plan · art: Ali actually reading the plan, pen in hand · overlay: plan.md open on screen
7. ali · "Reading it, he caught a wrong assumption before any code existed." · cap: Catch it early · art: Ali circling a flawed line in the plan
8. info · "The order is simple: plan, implement, then verify." · cap: Plan, build, verify · info: a 3-step flow that builds one step at a time
9. scene · "Slowing down to plan feels backwards, yet it saves hours." · cap: Slow is fast · art: warm scene, Ali calm beside an hourglass
10. ali · "He triggered the plan with a slash command, so it never got skipped." · cap: Trigger it reliably · art: Ali typing "/plan" and a plan template appearing · overlay: "/plan"
11. ali · "After building, Ali compared the result against the plan." · cap: Match plan vs build · art: Ali holding the plan beside the built feature, checking
12. info · "Plan-versus-implementation is itself a form of verification." · cap: Compare = verify · info: two panels — "planned" vs "built" with checkmarks
13. ali · "Two items were missing, so he sent the agent back for them." · cap: Fill the gaps · art: Ali marking two unmet items; the agent resumes
14. ali · "Only when build matched plan did Ali call it done." · cap: Done means matched · art: plan and build aligning under a green check
15. info · "A plan you skip is a plan you cannot verify against." · cap: No plan, no check · info: contrast — a vague idea vs a clear, checkable plan
16. ali · "Before your next build, what would your plan file say?" · cap: Your turn · art: Ali turning to face the viewer

### SC-3 — Let the agent test itself in the browser  [compulsory]
**Concept (1 line):** Connect Chrome DevTools to the coding agent (via MCP) so it opens the running app, catches errors, fixes them, and re-verifies — automating manual browser testing, with safety hooks for risky actions.
**Ali's scenario (1 line):** Ali manually clicks through his app after every change, then wires up Chrome DevTools MCP so the agent tests itself.
**Beats:**
1. ali · "Give your agent a browser so it can test the app itself." · cap: Let it self-test · art: the agent driving a browser while Ali watches
2. scene · "After every change, Ali clicked through the app by hand." · cap: Manual clicking · art: Ali tiredly clicking buttons across screens
3. ali · "It was slow, and he still missed bugs users later hit." · cap: Slow and leaky · art: a bug slipping past Ali onto a user's screen
4. scene · "Manual testing drains everyone; you are not alone in dreading it." · cap: We all dread it · art: warm scene, Ali sighing at a long checklist
5. info · "MCP is a bridge that lets the agent use real tools, like Chrome." · cap: What is MCP? · info: definition card — "MCP = agent-to-tools bridge"
6. ali · "Ali connected Chrome DevTools to his coding agent." · cap: Connect the browser · art: a cable linking the agent to a Chrome window · overlay: "Chrome DevTools MCP"
7. ali · "Now the agent opens the local app and actually looks at it." · cap: It opens the app · art: the agent viewing the running app in a browser
8. ali · "It reads console errors the way Ali used to, but instantly." · cap: It reads the errors · art: the agent scanning a red console line
9. info · "The loop: open, check, catch an error, fix, re-verify." · cap: The self-test loop · info: a 5-step cycle diagram that animates around
10. scene · "Trusting the agent to verify feels strange at first, and that is fine." · cap: Strange but safe · art: warm scene, Ali hands off, calm
11. info · "This is one layer: functional, end-to-end browser testing." · cap: One eval layer · info: a layer stack — unit tests · hooks · browser E2E · output scoring
12. ali · "A safety hook still pauses it before anything truly risky." · cap: Hooks guard risk · art: the agent stopped at a "delete database?" gate, asking Ali · overlay: "permission needed"
13. ali · "The agent caught a broken login and fixed it before Ali saw it." · cap: Caught before you did · art: the agent patching a login bug under a green check
14. scene · "The same trick works for mobile apps and design tools too." · cap: Works beyond web · art: the agent checking a phone screen and a design canvas
15. info · "No front end? Let it verify the functions in code directly." · cap: Backend? Test functions · info: note card — "no UI → check functions directly"
16. ali · "Ali saved this whole workflow as a reusable testing skill." · cap: Save it as a skill · art: Ali dropping the loop into a "Skills" drawer · overlay: "e2e-chrome-testing"
17. ali · "How far could a self-testing agent go before it needs you?" · cap: Your turn · art: Ali turning to the viewer, thoughtful

### SC-4 — Define test cases in BDD format  [compulsory]
**Concept (1 line):** A plan is too vague to test against, so write each feature as concrete Given/When/Then behavior cases, organized in a folder and reviewed before running.
**Ali's scenario (1 line):** Ali's plan says "users can invite teammates" and the agent can't verify it, so he rewrites it as precise BDD cases.
**Beats:**
1. ali · "Turn each feature into a precise Given, When, Then test case." · cap: Write BDD cases · art: Ali writing a three-line test card
2. scene · "Ali's plan said 'users can invite teammates' and little more." · cap: A vague plan · art: Ali frowning at a one-line plan item
3. ali · "The agent could not verify something so fuzzy." · cap: Too vague to test · art: the agent shrugging at a blurry requirement
4. scene · "Vague requirements trip up everyone, and that is normal." · cap: We all write vague first · art: warm scene, Ali nodding
5. info · "BDD writes behavior as Given, When, Then." · cap: What is BDD? · info: define BDD — a 3-row Given/When/Then template
6. info · "Given an admin, when they invite an email, then an invite is sent." · cap: A real BDD case · info: a filled Given/When/Then card using the invite example
7. info · "And then the invited user appears in the members list." · cap: Verifiable outcomes · info: the card gains a checkable second "then" line
8. scene · "This precision feels tedious, yet it makes testing possible." · cap: Precision pays off · art: warm scene, Ali steady and focused
9. info · "Keep the cases in a folder, like docs slash features." · cap: Organize the files · info: a folder tree — docs/features/invite.md
10. ali · "Ali writes cases one feature at a time, not all at once." · cap: One feature at a time · art: Ali finishing one tidy file before starting the next
11. ali · "He reviews and edits each case before letting it run." · cap: Review before running · art: Ali editing a case with a pen
12. info · "No plan? The agent can read the code to draft the cases." · cap: No plan, read the code · info: note card — "codebase → test cases"
13. ali · "He runs them, compares results, and refines the gaps." · cap: Run, compare, refine · art: Ali comparing two run results and marking a gap
14. info · "Precise cases give the agent something exact to verify against." · cap: Exact criteria · info: contrast — a vague plan vs a sharp BDD case
15. ali · "Now Ali's features arrive with clear, checkable behavior." · cap: Checkable behavior · art: Ali confident beside a feature with a passing case
16. ali · "Which feature could you rewrite as Given, When, Then today?" · cap: Your turn · art: Ali turning to face the viewer

---

# Section B — Mental Models

### SLO 1.9 — Identify and resist "tab tax"  [advanced]
**Concept (1 line):** Do one problem at a time; context-switching charges a hidden cost ("tab tax") that quietly degrades both quality and speed.
**Ali's scenario (1 line):** Ali directs an agent to fix a bug while juggling fourteen tabs, finishes nothing by noon, then closes down to a single task and the work finally flows.
**Beats:**
1. info · "One problem at a time protects your speed and your quality." · cap: One task at a time · info: focus-card — one bright task node beside many faint blurred ones
2. scene · "Ali is an engineer who directs AI agents to fix code." · cap: Meet Ali · art: Ali at a tidy desk in a calm ed-tech office
3. scene · "This morning, fourteen browser tabs glow across his screen." · cap: Fourteen tabs · art: Ali dwarfed by a wide wall of glowing tabs
4. ali · "He starts one bug fix, then jumps to read email." · cap: A quick jump · art: Ali's chair swiveling toward a new tab · overlay: the bug-fix tab dimming behind him
5. scene · "If that sounds like your day, you are far from alone." · cap: You're not alone · art: warm scene, several engineers with crowded screens
6. info · "Every switch quietly charges a fee called the tab tax." · cap: The tab tax · info: coin-drop — a coin falls each time an arrow hops between tabs
7. info · "Refocusing after a jump can cost many minutes each time." · cap: The refocus cost · info: bar chart — a tiny "jump" bar beside a tall "recovery" bar
8. ali · "By noon, Ali has touched ten tasks and finished none." · cap: Ten started, zero done · art: Ali amid half-open work, drained · overlay: ten progress bars stuck near zero
9. scene · "He feels busy, yet the real work sits untouched." · cap: Busy, not done · art: Ali staring at an unmoved bug ticket
10. scene · "Here is the calmer part, and you can start it today." · cap: A calmer way · art: soft light shift, the desk relaxing around Ali
11. ali · "Ali closes every tab except the one bug he chose." · cap: Close the rest · art: tabs vanishing until one remains · overlay: single bug-fix tab centered
12. ali · "He gives the agent one clear task and watches it work." · cap: One clear task · art: Ali calmly reviewing the agent's single diff · overlay: one prompt, one diff
13. info · "One finished task now beats ten half-started ones." · cap: Finish beats start · info: comparison — one full progress bar vs ten stuck bars
14. ali · "The fix lands, tests pass, and his mind feels quiet." · cap: Done and calm · art: green check on screen, Ali exhaling
15. info · "Batch the small stuff; give deep work a clean lane." · cap: One lane for depth · info: two-lane diagram — a "quick tasks" lane and a protected "deep work" lane
16. ali · "How many tabs are open right now, and which one truly matters?" · cap: Your turn · art: Ali turning gently toward the viewer

### SLO 1.10 — Apply "friction maxxing" to engineer focus  [intermediate]
**Concept (1 line):** Friction maxxing = deliberately ADD inconvenience to low-value distractions while REMOVING barriers to deep work, using environmental design instead of finite willpower.
**Ali's scenario (1 line):** Ali keeps losing agent sessions to tabs and his phone, so instead of trying harder he re-engineers his surroundings.
**Beats:**
1. info · "Design your environment so focus is the easy path." · cap: Design, don't fight · info: two-path diagram — a downhill road to "deep work", uphill to "distraction"
2. scene · "Ali still loses hours to tempting tabs and his phone." · cap: The pull returns · art: Ali reaching for his phone mid agent-session
3. ali · "He tries harder to resist, but his willpower keeps running out." · cap: Willpower runs low · art: Ali white-knuckling focus while an energy meter drains
4. info · "Willpower fades through the day for every one of us." · cap: It's not a flaw · info: line graph — an energy bar sloping down morning to evening
5. info · "So Ali tries friction maxxing: engineering barriers around his attention." · cap: Friction maxxing · info: definition card — "add friction to distractions, remove it from deep work"
6. info · "The idea: make good paths downhill and bad paths uphill." · cap: Downhill vs uphill · info: hill diagram — easy slope to work, steep slope to distraction
7. ali · "First, Ali deletes the apps that keep pulling him away." · cap: Delete the bait · art: app icons dragged to the trash · overlay: social apps removed
8. ali · "Next, a website blocker guards every agent session." · cap: Block by default · art: a shield settling over the browser during a session · overlay: blocklist active
9. info · "A 2022 study found a phone in another room cut screen time thirty percent." · cap: Phone away = -30% · info: stat callout — phone moved to the next room, a 30% down arrow
10. ali · "So Ali leaves his phone in the next room, face down." · cap: Phone, next room · art: Ali walking the phone out, a door between him and it
11. info · "He works in focused sprints using a Pomodoro timer." · cap: Work in sprints · info: timer — a 25-minute block then a short break
12. ali · "His laptop's downtime mode silences every ping during deep work." · cap: Silence the pings · art: an OS "downtime" toggle switching on · overlay: Do Not Disturb on
13. scene · "He even builds one clean corner meant only for agent work." · cap: A dedicated space · art: minimal desk, no clutter, single screen, calm light
14. scene · "None of this needs more discipline, only a kinder setup." · cap: Setup over grit · art: Ali relaxed while the environment does the work
15. info · "This borrows from BJ Fogg: behavior follows how easy things are." · cap: Rooted in behavior design · info: note card — "make the wanted behavior the easiest one"
16. info · "Willpower is finite, but a good environment keeps your commitments automatically." · cap: Environment keeps promises · info: contrast bars — a draining willpower bar vs a steady environment bar
17. ali · "Now the deep-work path is the easiest one Ali can take." · cap: Easy to focus · art: Ali gliding down the gentle slope toward his agent work
18. ali · "Which single barrier could you add today to protect your focus?" · cap: Your turn · art: Ali turning to the viewer

### SLO 1.11 — Maintain dedicated time blocks for agent work  [advanced]
**Concept (1 line):** Protect deep-work time by block-scheduling your calendar for agent work, so small daily wins compound instead of being nibbled away.
**Ali's scenario (1 line):** Ali's clean environment still can't help because his calendar is shredded into scraps, so he books protected ninety-minute blocks and defends them.
**Beats:**
1. info · "Block time on your calendar so agent work actually happens." · cap: Block the time · info: calendar with one bold, protected block highlighted
2. scene · "Ali's environment is clean, yet his calendar is pure chaos." · cap: A new leak · art: Ali frowning at a calendar packed with tiny meetings
3. ali · "Meetings and pings nibble his day into useless scraps." · cap: Nibbled away · art: a calendar day eaten into fragments · overlay: 15-minute gaps scattered
4. scene · "Agent work needs long runs, but only crumbs remain." · cap: No room to think · art: Ali eyeing the tiny gaps, unable to start
5. scene · "A fragmented calendar happens to almost everyone who does deep work." · cap: You're not alone · art: several calendars side by side, all fragmented
6. info · "Time blocking means reserving whole chunks for one kind of work." · cap: Time blocking · info: calendar showing a solid 90-minute "agent work" block
7. info · "Treat that block like an appointment you never cancel on yourself." · cap: Keep the appointment · info: the block styled as a locked calendar invite
8. ali · "Ali books two ninety-minute agent blocks before anything else." · cap: Book it first · art: Ali dragging two bold blocks onto the week · overlay: two 90-minute blocks
9. ali · "He marks them busy so no meeting can sneak in." · cap: Marked busy · art: the blocks shaded, meeting requests bouncing off · overlay: a "busy" shield
10. scene · "Protecting time is not selfish; it is how good work ships." · cap: Not selfish · art: Ali calm as colleagues respect the block
11. ali · "Inside a block, Ali runs one agent task start to finish." · cap: One clean run · art: Ali fully absorbed while the agent works end to end
12. info · "Uninterrupted blocks let small daily wins stack up over time." · cap: Wins that stack · info: bars stacking taller across a week
13. info · "That stacking is compounding: today's progress lifts tomorrow's." · cap: Compounding · info: a rising curve where each day builds on the last
14. ali · "Week by week, Ali's blocked hours turn into shipped features." · cap: Blocks become results · art: calendar blocks transforming into completed features · overlay: a shipped checklist growing
15. ali · "The same hours, once scattered, now compound into real momentum." · cap: Momentum · art: Ali confident, steady upward motion behind him
16. ali · "Where on this week's calendar could you fence off your first block?" · cap: Your turn · art: Ali turning to the viewer beside an open calendar

### SLO 1.12 — Map vs. Territory: read what the agent did  [advanced]
**Concept (1 line):** When a prompt fails, study what the agent actually produced instead of just rewording your request — the map is not the territory.
**Ali's scenario (1 line):** Ali asks his agent to add caching to the courses API; it stays slow, and he keeps rewording instead of reading what the agent really built.
**Beats:**
1. ali · "When a prompt fails, look at what the agent actually built." · cap: Read reality first · art: Ali at his desk pointing calmly at a code screen
2. scene · "Ali asked his agent to add caching to the courses API." · cap: The request · art: Ali typing, a glowing API diagram beside him
3. scene · "The agent returned code, but the endpoint stayed just as slow." · cap: Still slow · art: a spinning loader, Ali frowning slightly
4. ali · "His first instinct was to reword the prompt and rerun it." · cap: The reword reflex · art: Ali retyping into a chat bubble, arrows looping
5. info · "This is editing your map, not exploring the real territory." · cap: Map vs. territory · info: split-panel — a neat drawn map on the left, messy real land on the right
6. scene · "Everyone reaches for the reword button first; it feels productive." · cap: You're not alone · art: warm scene, Ali with a small shrug and half-smile
7. ali · "So Ali slowed down and actually read the agent's output." · cap: Read the output · art: Ali leaning in, eyes on the code
8. ali · "The agent had cached the wrong function entirely." · cap: Wrong function cached · art: red highlight on a mislabeled function · overlay: "cached: getUserPrefs()" vs intended "getCourses()"
9. scene · "His words were fine; his picture of the code was off." · cap: The real gap · art: Ali's expression shifting to realization
10. info · "The map is your idea; the territory is the running code." · cap: Two different things · info: labeled diagram — "MAP = your mental model" over "TERRITORY = actual output"
11. ali · "He revised his mental model, then wrote a precise prompt." · cap: Revise, then rewrite · art: Ali updating a sticky-note model on the wall · overlay: sticky note edited to "cache getCourses response"
12. scene · "This time the agent cached the exact endpoint he meant." · cap: It worked · art: green check, a fast response bar
13. scene · "Slow down here, because reading beats rewording almost every time." · cap: Reading wins · art: warm, Ali nodding gently
14. info · "Three moves: read the output, understand its interpretation, revise your model." · cap: The loop · info: a 3-step list that builds up one line at a time
15. ali · "Now Ali treats every failure as a clue about reality." · cap: Failures are clues · art: Ali holding a magnifying glass over code
16. ali · "When did you last reword a prompt instead of reading the result?" · cap: Your turn · art: Ali turning to face the viewer

### SLO 1.13 — Hollow vs. solid AI vocabulary  [advanced]
**Concept (1 line):** Audit whether the AI terms you use daily point to things you genuinely understand, using the Explain-It-Like-I'm-5 test — hollow words crumble under one real question.
**Ali's scenario (1 line):** Ali confidently says "embedding" in standup, then a new teammate asks what it means and he freezes.
**Beats:**
1. ali · "Test whether your AI words point to things you truly understand." · cap: Solid vs. hollow · art: Ali holding two word-cards, weighing them
2. scene · "In standup, Ali said the agent needed better embeddings." · cap: The standup · art: Ali at a whiteboard, team listening
3. scene · "A new teammate asked what an embedding actually is." · cap: The question · art: a junior engineer raising a hand
4. ali · "Ali opened his mouth and nothing solid came out." · cap: The freeze · art: Ali blank-faced, a small sweat drop
5. scene · "That silence happens to almost everyone; it's completely normal." · cap: It's normal · art: warm scene, the whole team nodding with him
6. info · "Hollow words sound right but crumble under one real question." · cap: The crumble test · info: a word that looks solid, then cracks into pieces
7. ali · "He had repeated 'embedding' for months without a real referent." · cap: No referent · art: the word floating, unanchored · overlay: "embedding" with a dangling, unconnected string
8. info · "Solid understanding traces a word back to something concrete." · cap: Trace it down · info: a word connected by a line to a real object
9. ali · "So Ali tried the Explain-It-Like-I'm-5 test." · cap: The ELI5 test · art: Ali talking to a small child figure
10. ali · "An embedding turns meaning into numbers a computer can compare." · cap: Meaning into numbers · art: a word transforming into coordinates on a grid · overlay: "cat → [0.2, 0.9, 0.1 …]"
11. scene · "Saying it plainly showed him which parts he actually knew." · cap: Plain talk reveals gaps · art: Ali with a half-lit lightbulb
12. info · "Audit five terms: context window, fine-tuning, hallucination, RAG, embedding." · cap: Five to check · info: a checklist of five AI terms, empty boxes
13. scene · "If some crumble, good; that's exactly where to learn next." · cap: Gaps are progress · art: warm, Ali circling one term with a smile
14. ali · "Ali now explains each term to an imaginary five-year-old." · cap: Practice plainly · art: Ali rehearsing aloud, gesturing
15. ali · "Words he can put plainly are words he genuinely owns." · cap: Plain equals owned · art: Ali confident, a word firmly anchored down
16. ali · "Which AI word could you not yet explain to a child?" · cap: Your turn · art: Ali facing the viewer

### SLO 1.14 — Fresh problem-solving vs. rote prompt recycling  [advanced]
**Concept (1 line):** Catch yourself mechanically recycling prompt templates and applying frameworks without thinking — that's cargo culting — and instead reason about each problem from first principles.
**Ali's scenario (1 line):** Ali has a "magic" prompt template he pastes into every task, until a migration task where it silently produces wrong results.
**Beats:**
1. ali · "Solve each problem fresh instead of recycling the same prompt." · cap: Think, don't recycle · art: Ali choosing between a saved template and a blank page
2. scene · "Ali kept a magic prompt template that once worked beautifully." · cap: The magic template · art: a glowing saved snippet in a frame
3. ali · "He pasted it into every new task out of pure habit." · cap: Paste and pray · art: Ali copy-pasting the same block repeatedly · overlay: identical prompt pasted across three task tabs
4. scene · "For a new migration task, the output looked fine but wasn't." · cap: Quietly wrong · art: a green check with a hidden bug underneath
5. info · "This is cargo culting: doing the ritual, missing the mechanism." · cap: Cargo culting · info: define-the-term panel — a ritual icon beside a real gears icon
6. scene · "We all collect prompts that once felt like little spells." · cap: We all do it · art: warm scene, Ali holding a small spellbook, smiling
7. ali · "The template assumed a context this task did not have." · cap: Wrong assumptions · art: a puzzle piece that doesn't fit the slot · overlay: template "assumes: fresh DB" vs task "existing data"
8. ali · "Ali had followed the tutorial steps without asking why." · cap: Steps without the why · art: Ali on autopilot, moving robotically
9. info · "Fresh thinking starts from the problem, not the template." · cap: Start from the problem · info: an arrow from "the problem" to a tailored prompt
10. ali · "So he asked what this specific task truly required." · cap: What does THIS need · art: Ali pausing, thinking from first principles
11. ali · "He rebuilt the prompt from the migration's real constraints." · cap: Build from constraints · art: Ali assembling a prompt from parts · overlay: constraint chips "existing rows", "rollback safe", "idempotent"
12. scene · "The new prompt caught the edge case the template had missed." · cap: It caught the bug · art: a bug trapped in a net, Ali relieved
13. scene · "Reusing prompts isn't wrong; reusing them blindly is the trap." · cap: Blind reuse is the trap · art: warm scene, a template with an eye opening on it
14. info · "Ask each time: does this template's assumption fit this problem?" · cap: The checkpoint · info: a yes/no decision node with two branches
15. ali · "Now Ali treats templates as starting points, never as autopilot." · cap: Starting point, not autopilot · art: Ali steering, both hands on the wheel
16. ali · "Where are you running a prompt ritual without knowing why?" · cap: Your turn · art: Ali facing the viewer

### SLO 5.2 — Debug with the scout mindset  [optional]
**Concept (1 line):** When an agent's output is wrong, the "soldier" defends the prompt while the "scout" investigates with curiosity — truth-seeking beats position-defending.
**Ali's scenario (1 line):** Ali's coding agent breaks the build; he first blames the agent, then switches to investigating what it actually understood.
**Beats:**
1. scene · "When an agent fails, investigate like a scout, not a soldier." · cap: Scout, not soldier · art: Ali standing between a soldier figure and a scout figure
2. ali · "Ali's coding agent shipped a function that broke the tests." · cap: Tests failing · art: Ali staring at a wall of red failing tests
3. ali · "His gut said the agent was the problem." · cap: "The agent's broken" · art: Ali pointing an accusing finger at the screen
4. scene · "That defensive reflex is human, and every engineer feels it." · cap: The reflex is normal · art: Ali sighing, a warm mentor hand on his shoulder
5. scene · "A soldier defends the prompt; a scout hunts for the truth." · cap: Two mindsets · art: a soldier with a shield beside a scout with a spyglass and map
6. info · "Two mindsets ask two very different questions." · cap: Two questions · info: two-column compare — Soldier "It should work" / Scout "What happened?"
7. ali · "So Ali paused and asked what the agent actually understood." · cap: What did it understand? · art: Ali leaning in, curious, reading the agent's reasoning
8. ali · "He reread his prompt as if he were the agent." · cap: Read it as the agent · art: Ali wearing agent-goggles, prompt text floating · overlay: the prompt as the agent sees it
9. ali · "One line said 'update the record' without saying which one." · cap: Ambiguous instruction · art: highlighted vague line "update the record"
10. info · "The scout traces a failure back to its source." · cap: Trace it back · info: flow diagram — prompt → agent reading → wrong action → broken test, looping back
11. scene · "Finding your own gap here is a win, not a shame." · cap: A gap found is a win · art: Ali with a small smile, a soft lightbulb
12. ali · "The soldier would have rerun the prompt and failed again." · cap: Rerunning won't fix it · art: Ali trapped in a loop arrow, same error repeating
13. ali · "Ali named the exact record and ran it again." · cap: Precise instruction · art: prompt now reads "update the student record by ID"
14. ali · "The agent got it right, and the tests turned green." · cap: Tests passing · art: green checkmarks cascading, Ali relieved
15. info · "Curiosity found the bug that defensiveness would hide." · cap: Curiosity wins · info: takeaway card — "Truth-seeking beats position-defending"
16. scene · "Next agent failure, ask: what did it truly understand?" · cap: Your turn · art: Ali holding a spyglass out toward the viewer

### SLO 5.1a — Connect agent work to real stakes  [advanced]
**Concept (1 line):** Move from dry, abstract engagement to visceral, concrete stakes — when you feel who the work is for, you catch errors the disengaged mind skips.
**Ali's scenario (1 line):** Ali treats a retention-data analysis as dry numbers, drifts, then reframes it as 50,000 children's learning and catches a hidden error.
**Beats:**
1. scene · "Feel the real stakes, and your agent's work gets sharper." · cap: Feel the stakes · art: Ali at his desk, a warm classroom glowing behind him
2. ali · "Ali asked his agent to analyze student retention data." · cap: Analyze retention · art: Ali facing a dashboard of numbers
3. ali · "To him it was rows, columns, and dry percentages." · cap: Only numbers · art: a gray spreadsheet, Ali's eyes glazing over
4. info · "Abstract framing: 'AI can analyze retention data.'" · cap: Flat and abstract · info: a card showing a flat, gray abstract statement
5. scene · "Drifting on abstract data is normal, and not a failing." · cap: It's normal to drift · art: Ali gently yawning, soft non-judgmental palette
6. scene · "A number on a screen is not a face in a classroom." · cap: Number vs face · art: split — a gray "12%" beside a child's face in class
7. ali · "Then Ali remembered whose learning these numbers were." · cap: Whose learning? · art: Ali looking up, a classroom forming in his mind
8. info · "This analysis shapes materials for 50,000 children in Balochistan." · cap: Real stakes · info: a map of Balochistan filling with small child icons
9. ali · "Suddenly the dry percentages had faces and futures." · cap: Numbers gained faces · art: spreadsheet cells morphing into tiny portraits
10. scene · "Caring more here helps you; it never slows you down." · cap: Care sharpens you · art: Ali energized, warm light spreading across his desk
11. ali · "Reengaged, Ali spotted a filter that dropped rural students." · cap: A hidden filter · art: Ali catching a highlighted line excluding a whole region
12. ali · "The disengaged version of him would have missed it." · cap: The drift would miss it · art: a ghosted Ali scrolling straight past the error
13. info · "Stakes you feel pull your attention to what matters." · cap: Care → focus · info: attention diagram — care → focus → caught errors
14. ali · "He fixed the filter, and every child was counted." · cap: Everyone counted · art: the full map, all icons included, Ali satisfied
15. info · "Thinking that grips your care beats thinking that floats." · cap: Gripped beats floating · info: takeaway card — gripped vs floating notation
16. scene · "Before your next task, ask: who is this really for?" · cap: Your turn · art: Ali gesturing from the classroom toward the viewer

### SLO 5.4 — Shift from specialist to AI orchestrator  [compulsory]
**Concept (1 line):** The biggest barrier to AI adoption is identity, not skill — reframing "I am a coder" into "I am a system architect who orchestrates AI" unlocks a more interesting role.
**Ali's scenario (1 line):** Ali, who gets his dopamine from clean code, feels deskilled managing agents, then reframes himself as a conductor of a team of agents.
**Beats:**
1. scene · "The hardest part of using AI agents is identity, not tech." · cap: It's identity, not tech · art: Ali facing a mirror whose reflection is shifting
2. ali · "Ali loved the quiet joy of writing clean code." · cap: The joy of clean code · art: Ali smiling at an elegant block of code
3. ali · "Now his agent writes the code, and he reviews it." · cap: The agent codes now · art: an agent typing while Ali watches, slightly uneasy
4. ali · "He felt oddly deskilled, like his craft was slipping away." · cap: Feeling deskilled · art: Ali's tools fading from his hands
5. scene · "That loss you feel is real, and nearly everyone feels it." · cap: The loss is real · art: a mentor beside Ali, empathetic
6. info · "The barrier to AI adoption is mostly emotional, not technical." · cap: Mostly emotional · info: bar chart — barrier: 20% technical / 80% identity
7. scene · "A soloist plays one instrument; a conductor leads a whole orchestra." · cap: Soloist to conductor · art: split — a lone violinist beside a conductor before an orchestra
8. ali · "Ali stopped asking, 'Am I still a coder?'" · cap: The wrong question · art: Ali crossing out the "coder" label on his badge
9. ali · "He started asking, 'What system am I building?'" · cap: The better question · art: Ali sketching an architecture diagram
10. ali · "His new role: an architect orchestrating a team of agents." · cap: System architect · art: Ali at the center with several agents around him
11. scene · "This role is more interesting than before, not less." · cap: More interesting, not less · art: Ali energized before a bigger canvas
12. info · "The coder wrote lines; the orchestrator designs the whole flow." · cap: A level up · info: compare — before "writing functions" / after "designing systems + directing agents"
13. ali · "Clinging to only coding would shrink Ali's impact." · cap: Clinging shrinks you · art: Ali cramped in a tiny box, agents sitting idle
14. ali · "Conducting well, he now ships what a team once shipped." · cap: A team's output · art: Ali directing agents producing many features at once
15. info · "Your craft moves up a level; it does not disappear." · cap: Craft moves up · info: ladder diagram — rung 1 "write code" → rung 2 "orchestrate systems"
16. ali · "Ali still feels the craft, now at the scale of systems." · cap: Craft, at system scale · art: Ali content, conducting a smooth pipeline
17. scene · "Ask yourself: what system do you want to conduct next?" · cap: Your turn · art: Ali offering the baton toward the viewer

### SLO 5.3 — Map nature's patterns onto software (biomimetics)  [optional]
**Concept (1 line):** Nature has optimized systems for 3.8 billion years, so many algorithms are direct translations of biology — the transferable habit is to ask "how has nature already solved this?"
**Ali's scenario (1 line):** Ali is stuck balancing load across busy servers, then borrows ant-trail and honeybee patterns from nature to route traffic evenly.
**Beats:**
1. scene · "When stuck, ask how nature already solved your problem." · cap: Ask nature first · art: Ali at his desk, a leaf and a circuit blending together
2. ali · "Ali needed to route tasks across many busy servers." · cap: Routing across servers · art: Ali facing a tangle of server nodes
3. ali · "Every design he tried overloaded one machine or another." · cap: Servers overloading · art: one node glowing red while others sit idle
4. scene · "Feeling stuck on a hard systems problem is completely normal." · cap: Being stuck is normal · art: Ali with head in hands, a gentle mentor nearby
5. scene · "Nature is a research lab that has run for 3.8 billion years." · cap: Nature's old lab · art: an Earth timeline with life forms drawn as scientists
6. info · "Biomimetics means copying nature's solutions into engineering." · cap: Biomimetics · info: definition card — "Biomimetics = bio (life) + mimesis (imitate)"
7. ali · "So Ali asked, how do ants find the shortest path?" · cap: How do ants do it? · art: Ali watching an ant trail cross his notebook
8. info · "Ants leave trails, and the best routes attract the most followers." · cap: Ant trails · info: ant-colony diagram — pheromone trails strengthening the shortest path
9. ali · "He gave his servers a digital scent for fast responses." · cap: A digital scent · art: server nodes marked with glowing trail markers
10. info · "Honeybees balance foragers by dancing about the richest flowers." · cap: Bee waggle dance · info: waggle-dance diagram — bees redirecting toward the best sources
11. ali · "Ali borrowed that idea to shift load toward free machines." · cap: Balancing like bees · art: tasks flowing from busy nodes to free ones
12. scene · "You need not invent from scratch; nature shares its patents." · cap: Nature shares its work · art: Ali relieved, an open book of nature's designs
13. ali · "Fighting the problem alone kept Ali circling the same walls." · cap: Going it alone stalls · art: a ghosted Ali looping with no progress
14. ali · "His routing balanced smoothly, inspired by ants and bees." · cap: Balanced traffic · art: an even glow across all servers, Ali pleased
15. info · "Immune systems, slime molds, and swarms hold more answers." · cap: More patterns · info: gallery card — immune defense, slime-mold networks, flocking swarms
16. scene · "Next hard problem, ask: how has nature solved this already?" · cap: Your turn · art: Ali gazing out a window full of nature

---

# Section C — Data Mastery

### SLO 5.1b — Why we need evals (types, BDD, LLM-as-a-Judge)  [compulsory]
**Concept (1 line):** Evals are the measuring stick for whether an agent's output is actually good.
**Ali's scenario (1 line):** Ali's coding agent ships a feature that looks fine, but he has no real way to know if it's good.
**Beats:**
1. scene · "Evals are the measuring stick for whether your agent's work is good." · cap: Evals = the measuring stick · art: Ali holding a tape measure up to a glowing code panel
2. ali · "Ali's coding agent shipped a feature, and it looked fine at first." · cap: Looks fine at first · art: Ali nodding at a screen of green checkmarks
3. scene · "If you have ever trusted a quick glance here, you are in good company." · cap: We have all been there · art: warm scene, Ali hand on chin
4. ali · "But a glance told Ali nothing about whether it was actually right." · cap: A glance proves nothing · art: a magnifying glass revealing a hidden bug
5. ali · "He learned a simple truth: you cannot improve what you cannot measure." · cap: Measure, then improve · art: a broken ruler swapped for a clean one
6. info · "An eval defines what a good output looks like, then scores the agent against it." · cap: What is an eval? · info: definition card — "EVAL = criteria + score"
7. info · "There are three kinds of evals Ali leans on most." · cap: Three kinds of evals · info: a list template reveals 3 empty rows
8. info · "Code-based checks test exact, measurable things automatically." · cap: 1. Code-based checks · info: row 1 fills — "Exact / automatic"
9. info · "Human review catches the judgment calls a script would miss." · cap: 2. Human review · info: row 2 fills — "Nuance / judgment"
10. info · "And an LLM-as-a-Judge uses a model to score outputs at scale." · cap: 3. LLM as a Judge · info: row 3 fills — "Model scores model"
11. info · "Ali writes each expectation as Given, When, Then — a style called BDD." · cap: BDD: Given / When / Then · info: define BDD, a 3-row template appears
12. ali · "Given a bug report, when the agent fixes it, then the tests pass." · cap: A behavior spec in action · art: Ali reading a three-line spec card · overlay: "Given / When / Then"
13. ali · "For fuzzy work, Ali asks another model to judge the output." · cap: LLM as a Judge · art: Ali handing an essay to a robot holding a scorecard
14. info · "The judge model scores each answer against clear, written criteria." · cap: Score against criteria · info: rubric card — Accuracy 4/5, Clarity 5/5
15. scene · "This part feels strange at first, and that is completely okay." · cap: Strange but powerful · art: warm scene, Ali smiling, reassured
16. ali · "Now Ali sees quality as a number he can watch improve." · cap: Quality you can watch · art: Ali watching a score line rise on a chart
17. ali · "Ask yourself: how would you prove your agent's last output was good?" · cap: Your turn · art: Ali turning to face the viewer

### SLO 5.1c — Critically evaluate an agent's database decisions  [advanced]
**Concept (1 line):** Don't trust blindly — the agent proposes database changes, but you review and question them before they touch real data.
**Ali's scenario (1 line):** Ali's agent wants to reorganize and migrate the live learner-records database.
**Beats:**
1. scene · "Never let your agent change a real database before you review its plan." · cap: Review before it runs · art: Ali standing between an eager robot and a locked database vault
2. ali · "Ali's agent offered to reorganize the entire learner-records database." · cap: A bold proposal · art: the robot presenting a blueprint of tables to Ali
3. scene · "When the plan sounds confident, saying yes feels easy." · cap: Confidence is tempting · art: a big glowing "Approve" button, Ali's finger hovering
4. ali · "But confident and correct are not the same thing." · cap: Confident is not correct · art: two speech bubbles, one polished, one with a hidden crack
5. ali · "So Ali treats the agent like a junior teammate handing him a pull request." · cap: Propose, review, approve · art: Ali reviewing a document from the robot · overlay: "Propose → Review → Approve"
6. info · "He checks three things before anything runs." · cap: Three checkpoints · info: a list template, 3 empty rows
7. info · "First, the schema: does the table design actually fit the data?" · cap: 1. Schema · info: row 1 — "Right shape?"
8. info · "Second, the queries: will they run fast, or crawl?" · cap: 2. Queries · info: row 2 — "Fast or slow?"
9. info · "Third, migrations: can this change be undone if it breaks?" · cap: 3. Migrations · info: row 3 — "Reversible?"
10. ali · "Reading closely, Ali sees the agent dropping a column instead of renaming it." · cap: A costly mistake, caught · art: Ali circling a red line; a column icon crumbling
11. scene · "Catching this can feel slow, and that patience is worth it." · cap: Slow now saves hours · art: warm scene, Ali calm beside an hourglass
12. ali · "He asks the agent to explain its reasoning before approving." · cap: Ask it to explain · art: Ali with a question mark, the robot showing its notes
13. ali · "Then he tests the migration on a copy, never on live data." · cap: Test on a copy first · art: two databases — a glowing "copy" and a shielded "live" one
14. ali · "The real learner data stays safe, and Ali stays in control." · cap: Safe data, real control · art: Ali locking the vault with a confident smile
15. ali · "Ask yourself: what would you check before letting an agent edit real data?" · cap: Your turn · art: Ali turning to the viewer

### SLO 5.1d — Relational vs. flat data  [advanced]
**Concept (1 line):** Move beyond "one big sheet" (flat) to a relational model — tables linked by keys — because a spreadsheet breaks down as data and relationships grow.
**Ali's scenario (1 line):** Ali tracks course enrollments in one giant spreadsheet that keeps breaking.
**Beats:**
1. scene · "Relational data splits one giant sheet into smaller tables linked by keys." · cap: Split, then link · art: one bloated spreadsheet splitting into three neat linked cards
2. ali · "Ali tracked every course enrollment in a single, enormous spreadsheet." · cap: One sheet to rule them all · art: Ali dwarfed by a spreadsheet stretching off-screen
3. scene · "Starting with one big sheet feels natural, and most of us do." · cap: We all start here · art: warm scene, Ali cheerfully typing into a grid
4. ali · "But every student's name was retyped on every single row." · cap: The same data, over and over · art: a name highlighted, repeated down many rows
5. info · "That is flat data: one wide sheet, with everything repeated." · cap: Flat data, defined · info: definition card — "Flat = one sheet, repeated data"
6. ali · "When one student changed her name, Ali had to fix fifty rows." · cap: One change, fifty edits · art: Ali sweating, red marks down a sheet
7. scene · "And a single missed typo quietly broke all his totals." · cap: One typo, broken totals · art: a chart tilting, a small red error glinting
8. info · "Relational data means separate tables linked by a shared key." · cap: Relational, defined · info: definition card — "Relational = linked tables"
9. info · "Ali splits it into Students, Courses, and Enrollments." · cap: Three focused tables · info: three linked table cards appear
10. info · "A key is a shared ID that links one table to another." · cap: Keys do the linking · info: an arrow from student_id in one table to another
11. ali · "Now each student's name lives in exactly one place." · cap: One name, one home · art: Ali relaxed, a single glowing student card
12. scene · "This shift takes a moment to click, and that is completely normal." · cap: Give it a moment · art: warm scene, a lightbulb softly warming over Ali
13. info · "As data grows, Ali adds a table, not another hundred columns." · cap: Scales by tables · info: comparison — a flat sheet stretching vs tidy tables added
14. ali · "He changes a name once, and every course updates instantly." · cap: Change once, update everywhere · art: Ali edits one card; ripples update the linked tables
15. ali · "Ask yourself: where in your data are you repeating the same thing?" · cap: Your turn · art: Ali turning to the viewer

### SLO 5.1e — Iterate on analysis (3+ cycles)  [advanced]
**Concept (1 line):** Good data analysis is refined through iteration — the first pass is a draft, and each cycle sharpens the query, cleans the visualization, and deepens the insight.
**Ali's scenario (1 line):** Ali investigates why students drop off in week three; his first chart misleads, so he iterates three times.
**Beats:**
1. scene · "Good data analysis is refined in cycles, never nailed in one shot." · cap: Analysis is iterative · art: Ali at an easel with three progressively cleaner charts
2. ali · "Ali wanted to know why students quit the course in week three." · cap: The question · art: Ali frowning at a drop-off in a line chart
3. scene · "The first answer is rarely the best one, and that is expected." · cap: First pass is not best pass · art: warm scene, a crumpled sketch beside a fresh page
4. ali · "His first query lumped every student into one blurry average." · cap: Cycle 1: the rough draft · art: a fuzzy, featureless bar looming over Ali
5. info · "Cycle one is a draft that raises more questions than it answers." · cap: A draft, not an answer · info: cycle tracker — step 1 of 3 highlighted, "Draft"
6. ali · "So he sharpened the query to split students by experience level." · cap: Cycle 2: sharpen the query · art: Ali splitting one bar into several distinct ones
7. scene · "Refining can feel like backtracking, but it is real progress." · cap: Refining is progress · art: warm scene, Ali climbing steps made of chart bars
8. info · "With a cleaner query, a clearer pattern starts to appear." · cap: A pattern emerges · info: cycle tracker — step 2 of 3, "Sharpen"
9. ali · "The chart was now correct, but cluttered and hard to read." · cap: Correct, but messy · art: Ali squinting at an overcrowded chart
10. ali · "So he cleaned the visualization down to one clear line." · cap: Cycle 3: clean it up · art: a tangled chart smoothing into a single crisp line
11. info · "Cycle three is a simple chart anyone can read at a glance." · cap: Clear at a glance · info: cycle tracker — step 3 of 3, "Clarify"
12. ali · "Only now did the real insight surface: beginners left, experts stayed." · cap: The real insight · art: Ali's eyes widening at two clearly separated lines
13. info · "Three cycles carried him from draft, to sharpen, to clarify." · cap: Draft, sharpen, clarify · info: the full 3-step tracker filled and glowing
14. ali · "Ali trusts this answer because he earned it through iteration." · cap: Earned, not guessed · art: Ali presenting the clean chart, confident
15. ali · "Ask yourself: what would your analysis reveal on a second or third pass?" · cap: Your turn · art: Ali turning to the viewer

### SLO 5.5 — Create a reusable data-analysis skill  [optional]
**Concept (1 line):** Once an analysis pattern works, package it as a reusable "skill" — a saved, trigger-able procedure with steps and example output — so a one-off becomes a repeatable capability.
**Ali's scenario (1 line):** Ali keeps rebuilding the same enrollment analysis by hand every month, so he packages it as a skill.
**Beats:**
1. scene · "Package a working pattern once, and your agent can reuse it forever." · cap: Save once, reuse always · art: Ali dropping a glowing procedure into a labeled "Skills" drawer
2. ali · "Every month, Ali rebuilt the same enrollment report from scratch." · cap: The monthly grind · art: Ali wearily typing the same report, calendar pages flipping
3. scene · "Rebuilding familiar work by hand is a trap many of us fall into." · cap: A common trap · art: warm scene, Ali on a treadmill of repeating charts
4. ali · "He retyped the same steps and fixed the same small mistakes each time." · cap: Same work, again · art: Ali erasing and re-fixing an identical error
5. ali · "Then Ali realized the pattern itself could be saved." · cap: A better idea · art: a lightbulb over Ali, the report turning into a reusable card
6. info · "A skill is a saved procedure your agent can trigger on demand." · cap: What is a skill? · info: definition card — "Skill = saved, trigger-able procedure"
7. info · "A good skill has three parts." · cap: Three parts · info: a list template, 3 empty rows
8. info · "A trigger: the phrase or moment that calls the skill up." · cap: 1. Trigger · info: row 1 — "When to run"
9. info · "Steps: the exact sequence that does the work." · cap: 2. Steps · info: row 2 — "How to run"
10. info · "An example output: a sample of what 'done' looks like." · cap: 3. Example output · info: row 3 — "What good looks like"
11. ali · "Ali writes his enrollment analysis down as one reusable skill." · cap: Packaged once · art: Ali sealing his steps into a neat labeled card · overlay: "Enrollment Analysis skill"
12. scene · "It takes effort the first time, and it pays back quickly." · cap: Effort now, payback fast · art: warm scene, a small seed growing into a tree
13. ali · "Next month, a single trigger runs the whole analysis for him." · cap: One trigger, done · art: Ali clicking once; the full report assembling itself
14. ali · "A one-off task quietly became a repeatable capability." · cap: One-off to repeatable · art: Ali relaxed, a shelf of labeled skills behind him
15. ali · "Ask yourself: which task do you rebuild often enough to package once?" · cap: Your turn · art: Ali turning to the viewer

---

# Section D — Autonomous Operations

### SLO 5.6 — Parallel work with git worktrees  [optional]
**Concept (1 line):** A git worktree checks out several branches of one repo into separate folders at once, so multiple agents work the same codebase in parallel without stepping on each other.
**Ali's scenario (1 line):** Ali runs one agent on a bug fix and another on a big refactor; they keep clobbering the same files until he gives each its own worktree.
**Beats:**
1. ali · "Git worktrees let Ali run two agents on one repo at once." · cap: The answer first · art: Ali at a desk, two glowing agent panels working side by side · overlay: "worktrees" tag over both
2. scene · "Ali starts two agents, and they clobber each other's files." · cap: The friction · art: two agent hands grabbing the same file, a spark of conflict
3. ali · "If parallel agents keep colliding, that frustration is completely normal." · cap: You're not alone · art: Ali exhaling, shoulders easing
4. info · "A worktree is a second working copy of the same repo." · cap: Define it · info: definition card — one repo icon splitting into two labeled folder copies
5. ali · "Think of worktrees as separate desks in one shared workshop." · cap: The metaphor · art: Ali in a workshop with two tidy desks under one roof · overlay: "desk A / desk B"
6. info · "Each desk holds a different branch, isolated but sharing one history." · cap: Isolated, shared roots · info: two-desk diagram — separate branches feeding one common history
7. ali · "Ali makes a worktree for the bug fix in its own folder." · cap: The fix, step one · art: Ali spinning up folder A · overlay: git worktree add ../fix hotfix
8. ali · "He makes a second worktree for the big refactor." · cap: The fix, step two · art: Ali spinning up folder B beside the first · overlay: git worktree add ../refactor cleanup
9. info · "The add command creates the folder and the branch together." · cap: One command, two things · info: command-breakdown — arrow from command to "folder + branch"
10. ali · "Now each agent edits its own folder without touching the other." · cap: No more collisions · art: two agents working calmly in separate desks
11. ali · "Setup feels fiddly at first, and that is okay." · cap: Be patient here · art: Ali nodding, a reassuring gesture
12. scene · "One day Ali deletes a folder by hand and git gets confused." · cap: The failure mode · art: an empty desk with a red "?" where a worktree used to be
13. info · "Run git worktree prune to clear the stale entry." · cap: The recovery · info: warning-then-fix — a red stale entry cleared by git worktree prune
14. ali · "Both agents finish, and Ali merges two clean branches." · cap: The payoff · art: Ali merging two branches into the trunk · overlay: "fix + refactor → main"
15. info · "Two tasks done in parallel, with zero merge collisions." · cap: The result · info: before/after tally — "1 task, conflicts" vs "2 tasks, 0 conflicts"
16. ali · "Where in your work could two agents run side by side?" · cap: Your turn · art: Ali turning to face the viewer

### SLO 5.7 — Score agent output with rubrics  [compulsory]
**Concept (1 line):** Build a rubric of clear criteria — completeness, accuracy, efficiency, safety, style — and score agent outputs against it, starting manually and progressing to automated evals.
**Ali's scenario (1 line):** Ali's agent ships code that "looks right" but sometimes breaks; he replaces his gut feeling with a five-criterion rubric, then automates the scoring.
**Beats:**
1. ali · "Ali rates every agent output against a clear rubric." · cap: The answer first · art: Ali holding a scorecard beside a code panel · overlay: five checkboxes on the card
2. scene · "Ali's agent ships code that looks right but sometimes breaks." · cap: The friction · art: polished-looking code with a hidden crack running through it
3. ali · "Trusting a gut feeling here is normal, and also risky." · cap: You're not alone · art: Ali with a thought bubble "looks fine?"
4. info · "Andrew Ng calls evaluation the biggest predictor of agent success." · cap: Why it matters · info: quote card — a pull-quote on evaluation
5. info · "A rubric is a scorecard of criteria you grade output against." · cap: Define it · info: definition card — a blank scorecard filling with criteria rows
6. ali · "It bridges Ali from 'that looks right' to real measurement." · cap: The metaphor · art: Ali crossing a bridge from a foggy "gut" bank to a marked "measurement" bank · overlay: "feeling → number"
7. info · "Ali's rubric has five criteria to check every time." · cap: The structure · info: a 5-item list building one row at a time
8. info · "Completeness, accuracy, efficiency, safety, and style, each scored one to five." · cap: The criteria · info: five criteria rows, each with a 1–5 scale
9. ali · "Ali starts by scoring ten outputs by hand." · cap: Start manual · art: Ali marking scores on ten cards · overlay: tally "10 outputs scored"
10. ali · "Suddenly the weak spots in his agent stand out clearly." · cap: Patterns appear · art: two low-scoring cards glowing red among the stack
11. ali · "Manual scoring feels slow, and that patience pays off." · cap: Be patient here · art: Ali steady and focused
12. info · "Once the rubric is stable, Ali automates the scoring." · cap: Progress to automated · info: manual-to-auto arrow — a hand icon transitioning to a gear/eval icon
13. scene · "An automated score passes, but the code quietly ignored safety." · cap: The failure mode · art: a green "PASS" badge with a small red safety flag hidden behind it
14. info · "Ali weights safety highest so it can never be skipped." · cap: The fix · info: weighted-rubric card — the safety row enlarged with a heavier weight
15. ali · "Now Ali measures every agent the same fair way." · cap: The payoff · art: Ali comparing several agents on one consistent scoreboard · overlay: "same rubric, every agent"
16. info · "Gut feeling became a repeatable number he can trust." · cap: The result · info: before/after — a fuzzy "?" transforming into a steady score
17. ali · "Which five criteria would define good work for your agent?" · cap: Your turn · art: Ali turning to the viewer beside a blank five-row scorecard
