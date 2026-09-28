# Autonomous Systems Session - Part 3: Building & Testing Autonomous Systems
**Duration**: 3m 55s (235 seconds / 7050 frames @ 30fps)  
**Theme**: Hands-on implementation with Chrome MCP, BDD testing, and skills

---

## VO Script (235 seconds)

### Scene 1: The Challenge (0-18s)
"Building autonomous systems is exciting, but it has a problem.
The system will fail. Repeatedly.
It will try to do something. It will break. You'll have to step in and fix it.

The question is: How do we close the gap between failures and fixes?
How do we accelerate learning?

The answer: We automate testing and evaluation."

### Scene 2: Three Tools (18-70s) [52s]
"**Tool One: Chrome MCP**
This lets your AI agents test your application in the browser.
Just like you would — clicking buttons, filling forms, verifying results.
But the agent does it automatically.

Your agent can now verify: Does it look right? Does it work right?

**Tool Two: BDD Test Cases**
BDD stands for Behavior-Driven Development.
Instead of technical test code, you write human-readable scenarios:

'Given the user is logged in
When they click the invite button
Then an email is sent
And the user appears in the list'

The agent reads these and verifies them.

**Tool Three: Skills**
A skill is a reusable instruction set.
Instead of telling your agent the same thing each time, you create a skill.
You build the logic once. The agent uses it forever.

This is the foundation of producer thinking."

### Scene 3: The Workflow (70-140s) [70s]
"Here's how they work together:

**Step One: Create a Plan**
You define what you want to build.
- What are the features?
- What should each feature do?
- What are the success criteria?

**Step Two: Generate BDD Test Cases**
From the plan, you generate test cases in Behavior-Driven format.
These become your truth. If it passes these, it's done.

**Step Three: Implement**
Your agent builds the feature.
It writes the code, creates the database schema, sets up the endpoints.

**Step Four: Test in Browser**
Using Chrome MCP, your agent opens the browser.
It runs through every test case manually, just like a human QA would.
It takes screenshots. It checks for errors.

**Step Five: Safe Execution with Hooks**
Before the agent does anything risky, hooks verify:
- 'Is this safe?'
- 'Do I have permission?'
- 'Will this break something?'

If anything fails, it stops and asks for help.

**Step Six: Evaluate with LLM as Judge**
An evaluation agent reviews the work:
- Does it match the plan?
- Is the code quality good?
- Are there edge cases missed?

This is continuous improvement."

### Scene 4: Why This Works (140-180s) [40s]
"Without this system:
- You test manually every time
- Bugs slip to production
- The same mistakes happen repeatedly
- You're the bottleneck

With this system:
- Testing is automated
- Bugs are caught in the development phase
- Patterns are learned and prevented
- You focus on strategy, not repetition

The agent becomes better with each cycle.
It learns from mistakes.
It stops making the same errors."

### Scene 5: Real Example (180-225s) [45s]
"Let's say you're building a payment feature.

Without autonomy:
- Write code → Test manually → Fix bugs → Test again → Deploy → Something breaks in production

With producer mindset:
- Write spec → Generate tests → Agent implements → Agent tests in browser → Hooks prevent risky actions → LLM judges quality → Auto-deploy when criteria met

The human time? Same or less.
The quality? Much higher.
The learning? Continuous.

This is what scales."

### Scene 6: Your Next Step (225-235s) [10s]
"The question isn't whether to automate testing and evaluation.
It's: What will you automate first?

Start small. One feature. One set of BDD test cases.
Watch what happens.

Then scale it."

---

## Visual Plan

### Scene 1: Problem Visualization (0-18s)
**Visual**: Cycle showing repeated failures
- Agent acts → Error appears (red flash) → Pause for human
- Cycle repeats 3x with increasing speed
- Text overlay: "Repeated failure cycle"
- Question appears: "How do we accelerate learning?"
- Solution hint appears: "Automate evaluation"

### Scene 2: Three Tools (18-70s)
**Visual**: Three cards revealing in sequence
- Background: Light background with soft grid pattern
- Each tool card is 25 seconds of focus

**Card 1 - Chrome MCP** (18-43s):
- Icon: Browser window with cursor
- Title: "CHROME MCP"
- Animation: Agent clicks button → Page changes → Verification happens
- Feature boxes: "Real Browser", "Auto-Testing", "Verification"
- Color: Soft blue (#7d9db8)

**Card 2 - BDD Test Cases** (43-56s):
- Icon: Checklist with checkmarks
- Title: "BDD TEST CASES"
- Animation: Text scenario appears line-by-line
- Shows format:
  - "Given user is logged in"
  - "When they click button"
  - "Then email sends"
- Color: Soft orange (#d99670)

**Card 3 - Skills** (56-70s):
- Icon: Wrench/toolkit
- Title: "SKILLS"
- Animation: Skill icon links to multiple agents
- Feature boxes: "Reusable", "Persistent", "Learning"
- Color: Soft green (#8b9d7d)

### Scene 3: The Workflow (70-140s)
**Visual**: Six-step flowchart with animated progression
- Horizontal flow left-to-right
- Each step is a box with number and title:

**Step 1** (70-80s): "Plan"
- Icon: Document/blueprint
- Agent reads plan document
- Duration appears below

**Step 2** (80-90s): "Generate Tests"
- Icon: Test case symbol
- Plan → BDD tests flow arrow
- Test cases populate

**Step 3** (90-105s): "Implement"
- Icon: Code brackets
- Agent typing animation
- Code appears in editor

**Step 4** (105-120s): "Test in Browser"
- Icon: Chrome browser
- Browser opens, agent clicks, screenshots taken
- Green checkmarks appear for passed tests

**Step 5** (120-132s): "Safety Hooks"
- Icon: Shield
- Guard rails appear around action
- Red stop sign if risk detected

**Step 6** (132-140s): "Evaluate"
- Icon: Judge/scale
- Quality metrics appear
- Output is reviewed

- Arrows connect all steps
- Color gradient from blue → orange → green left to right
- Parallel actions show with offset animations

### Scene 4: Comparison (140-180s)
**Visual**: Before/After timeline
- **Without Autonomy** (left side, red tint):
  - "Write Code" → "Test Manually" → "Fix" → "Test Again" → "Deploy" → "🚨 Production Breaks"
  - Path is jagged, repeating, inefficient
  
- **With Producer Mindset** (right side, green tint):
  - "Spec" → "Tests" → "Agent Builds" → "Agent Tests" → "Hooks Verify" → "Judge Approves" → "✅ Deploy"
  - Path is smooth, continuous, scalable
  
- Comparison metrics appear:
  - Time: Same/less ↓
  - Quality: Much higher ↑
  - Learning: Continuous ↑
  - Bottleneck: Removed ↑

### Scene 5: Real Example (180-225s)
**Visual**: Payment feature build visualization
- **Without** (left): Messy, iterative cycle with red X's
- **With** (right): Clean pipeline with green checkmarks
- Code appears, tests run, verification passes
- Final output shows "✅ Deployed" with quality score

- Animated annotations show:
  - "Human time: same or less"
  - "Quality: much higher"  
  - "Scales automatically"

### Scene 6: Call to Action (225-235s)
**Visual**: Bold centered question
- Large typography on warm background
- "What will you automate first?"
- Subtext: "Start small. One feature. Watch what happens."
- Final frame: Next course badge or next steps

---

## Animation Strategy

### Overall Pacing
- **Scene 1**: Fast-paced frustration (shows problem urgency)
- **Scene 2**: Measured (3-4 seconds per tool explanation)
- **Scene 3**: Steady flow left-to-right (shows sequential workflow)
- **Scene 4**: Contrasting speeds (slow for without, fast for with)
- **Scene 5**: Real-time feeling (as if watching agent work)
- **Scene 6**: Focused, inspirational

### Key Effects
- **Chrome MCP**: Browser window pops open, cursor moves, results verify ✓
- **BDD Test Cases**: Text reveals line-by-line, checkmarks appear on verification
- **Skills**: Icon multiplies/links to show reusability
- **Workflow**: Each step glows when active, then fades to background
- **Hooks**: Shield appears as gate, blocks risky action, shows approval flow

### Color Progression
- Part 1: Red (consumer problem) → Green (producer solution)
- Part 2: Blue (learning) → Orange (evaluation levels)
- Part 3: Gradient flow of all colors showing integration

---

## Interactive Elements (for engagement)
✅ Agent "typing" code visually  
✅ Browser actually opening with visible clicks  
✅ Test cases populating in real-time  
✅ Checkmarks and X marks for pass/fail  
✅ Production break showing urgency  
✅ Metrics changing dynamically  

---

## Ending Hook
"In the next lesson, we'll build your first autonomous system from scratch.
You'll see this in action.
You'll understand why producer thinking changes everything."

---

## Educational Principles Applied
✅ Builds on Parts 1 & 2 (Consumer/Producer + Autonomy framework)  
✅ Shows **practical tools** not just theory  
✅ **Sequential** workflow (not overwhelming all at once)  
✅ **Visual feedback** for each step (shows what success looks like)  
✅ **Comparison** (without vs with) to justify the investment  
✅ **Real example** (payment feature) makes it concrete  
✅ **Call to action** (What will YOU automate?) empowers the viewer
