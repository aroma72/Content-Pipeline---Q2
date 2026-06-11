---
type: reference
last_verified: 2026-06-10
owner: Aroma Tahir
source: https://docs.google.com/spreadsheets/d/1NADKuCnI4ReD3bSA1X0oLj2f1cUquLWomnvl1dSDyew/edit
---

# Agentic AI Mastery — Course Curriculum (Master Reference)

This is the canonical curriculum for the **Agentic AI Mastery** course. All video/content
creation MUST align to the SLOs below — check the relevant phase/module before producing any asset.

**Source of truth:** the Google Sheet linked in frontmatter (`Copy of Master Copy AI Agent Mastery
Curriculum - Self Paced`). This file is a verbatim snapshot taken 2026-06-10. If the sheet changes,
re-pull and update this file. Four tabs: Overview, SLOs by Phases, Self paced, Readings / Links.

> Note: the SLOs tab in the source has duplicate/renumbered IDs, repeated rows across phases, and
> typos. Captured as-is here; do not "fix" silently — confirm with Aroma before renumbering.

---

## 1. Difficulty Levels

| Level | Icon | Description | Bloom's Level |
|-------|------|-------------|---------------|
| Novice | 🟢 | Understanding and recall | Remember, Understand |
| Intermediate | 🟡 | Application in guided scenarios | Apply, Analyze |
| Advanced | 🟠 | Independent problem-solving | Analyze, Evaluate |
| Expert | 🔴 | Creating novel solutions, teaching | Create, Co-curate |

## 2. Competency Domains

| # | Domain | Focus Area |
|---|--------|-----------|
| 1 | Mental Models | Goldfish problem, agent loop, producer mindset, habit formation, thinking quality (Carlsmith), identity shift, friction maxxing, environmental design, biomimetic patterns |
| 2 | Agent Fundamentals | Environment setup, first agent, basic interaction, prompting techniques |
| 3 | Memory Engineering | CLAUDE.md, memory files, skills, progressive disclosure, context poisoning, start-stop hooks |
| 4 | External Integration | Databases, APIs, knowledge graphs, RAG |
| 5 | Autonomous Operations | Agent teams, guardrails, production deployment, autonomy slider, review queue, coaching loops, evals, responsible AI |

---

## 3. SLOs by Phases

Columns: **ID · Learning Outcome · Level · Domain · Type (compulsory/optional)**. Full
Description / Teaching Method / Assessment for each SLO live in the source sheet (tab "SLOs by Phases").

### PHASE 1 — FIRST CONTACT
*Understanding why agents think differently and setting up your workspace*

| ID | Learning Outcome | Level | Domain | Type |
|----|------------------|-------|--------|------|
| 1.1 | Environment Setup with Claude Code, Cursor and GitHub | Novice | Setup | compulsory |
| 1.2 | Overview of the mindsets: 5 domains | Novice | Mental Models | compulsory |
| 1.3 | Explain consumer vs producer mindset | Intermediate | Mental Models | compulsory |
| 1.4 | Recognize fire-fighting vs system-building behavior | Intermediate | Mental Models | compulsory |
| 1.10 | Apply friction maxxing to engineer your environment for sustained agent focus | Intermediate | Mental Models | Optional |
| 1.5 | Explain context window limitation and why it matters | Novice | Mental Models | compulsory |
| 1.6 | Articulate the goldfish analogy and implications | Novice | Mental Models | compulsory |
| 1.7 | Describe the agent loop (task→memory→output→feedback) | Novice | Mental Models | compulsory |
| 1.8 | Differentiate chat interfaces vs agent systems | Novice | Mental Models | compulsory |
| 1.9 | Create project folder with basic structure | Novice | Agent Fundamentals | compulsory |
| 1.10 | Verify Claude Code connection and functionality | Novice | Agent Fundamentals | compulsory |
| 1.11 | Set up voice typing for prompt dictation | Novice | Agent Fundamentals | Optional |
| 1.12 | Identify common file formats (Markdown, JSON, HTML, CSS, YAML) and explain their purpose | Novice | Agent Fundamentals | compulsory |

### PHASE 2 — THE MINDSET SHIFT
*From chatting to building — effective prompting and your first memory files*

| ID | Learning Outcome | Level | Domain | Type |
|----|------------------|-------|--------|------|
| 1.5 | Explain consumer vs producer mindset | Intermediate | Mental Models | — |
| 1.6 | Recognize fire-fighting vs system-building behavior | Intermediate | Mental Models | — |
| 1.7 | Describe the agent loop (task→memory→output→feedback) | Novice | Mental Models | compulsory |
| 1.8 | Differentiate chat interfaces vs agent systems | Novice | Mental Models | compulsory |
| 2.1 | Apply 90/10 rule (90% planning, 10% execution) | Intermediate | Mental Models | compulsory |
| 2.2 | Demonstrate patience through 3+ iterations | Intermediate | Mental Models | compulsory |
| 2.3 | Identify and resist tab tax (one problem at a time) | Advanced | Mental Models | Optional |
| 2.4 | Write detailed paragraph-length prompts | Intermediate | Agent Fundamentals | compulsory |
| 2.5 | Recognize rote prompt recycling vs. fresh problem-solving | Advanced | Mental Models | Optional |
| 2.6 | Provide effective feedback to refine outputs | Intermediate | Agent Fundamentals | compulsory |
| 2.7 | Recognize context window filling (speedometer) | Intermediate | Agent Fundamentals | compulsory |
| 2.8 | Apply structured prompting techniques (zero-shot, few-shot, chain-of-thought) | Intermediate | Agent Fundamentals | compulsory |
| 2.9 | Create initial CLAUDE.md (<50 lines) | Novice | Memory Engineering | compulsory |
| 2.10 | Explain 'drawing room' concept for CLAUDE.md | Novice | Memory Engineering | compulsory |
| 2.11 | Maintain dedicated time blocks for agent work | Advanced | Mental Models | compulsory |

### PHASE 3 — MEMORY ARCHITECTURE
*Teaching your agent to remember — organizational patterns and persistence*

| ID | Learning Outcome | Level | Domain | Type |
|----|------------------|-------|--------|------|
| 3.1 | What is memory architecture? Map the full memory continuum from context window to knowledge graph | Intermediate | Memory Engineering | compulsory |
| 3.2 | Distinguish mental model from agent reality (Map vs. Territory) | Advanced | Mental Models | Optional |
| 3.3 | Test your AI vocabulary for hollow vs. solid understanding | Advanced | Mental Models | Optional |
| 3.4 | Update CLAUDE.md after significant learnings | Intermediate | Memory Engineering | compulsory |
| 3.5 | Create and maintain memory.md for learnings | Novice | Memory Engineering | compulsory |
| 3.6 | Organize skills/, docs/, context/ folders | Intermediate | Memory Engineering | compulsory |
| 3.7 | Apply 'close the loop' pattern consistently | Intermediate | Memory Engineering | compulsory |
| 3.8 | Set up and use Beads for issue tracking | Intermediate | Memory Engineering | compulsory |
| 3.9 | Update CLAUDE.md after significant learnings | Intermediate | Memory Engineering | compulsory |
| 3.10 | Create well-structured skill file; difference b/w skill file and agents | Intermediate | Memory Engineering | compulsory |
| 3.11 | Perform weekly maintenance | Intermediate | Memory Engineering | Optional |
| 3.12 | Start fresh sessions strategically | Advanced | Agent Fundamentals | compulsory |
| 3.13 | Implement lazy loading for large memory (progressive disclosure) | Advanced | Memory Engineering | compulsory |

### PHASE 4 — CONNECTING TO THE REAL WORLD
*Databases, DevOps, and MCP — your agent meets external systems*

| ID | Learning Outcome | Level | Domain | Type |
|----|------------------|-------|--------|------|
| 4.1 | Law vs rules: is a hook a rule or a law? What are hooks, loops, and how do we schedule loops | — | — | compulsory |
| 4.2 | Implement start-stop hooks for session discipline | Advanced | Memory Engineering | compulsory |
| 4.3 | Explain why agents need deployment (laptop vs. cloud) | Novice | External Integration | compulsory |
| 4.4 | Distinguish between frontend and backend in agent systems | Intermediate | External Integration | compulsory |
| 4.5 | Connect agent work to real stakes (visceral engagement) | Advanced | Mental Models | compulsory |
| 4.6 | What is a database, UUID, foreign keys | — | — | compulsory |
| 4.7 | Critically evaluate agent's DB decisions | Advanced | External Integration | Optional |
| 4.8 | ERD framework | — | — | compulsory |
| 4.9 | Define key database terms (JOIN, DROP, etc) | Novice | External Integration | Optional |
| 4.10 | Explain environment variables and why credentials must never be hardcoded | Intermediate | External Integration | compulsory |
| 4.11 | Apply schema-first instruction | Intermediate | External Integration | Optional |
| 4.10 | Configure READ-ONLY access for production | Intermediate | External Integration | Optional |
| 4.11 | Obtain and securely store database credentials | Novice | External Integration | compulsory |
| 4.12 | Explain what MCP is and why it matters | Novice | External Integration | compulsory |
| 4.13 | Set up MCP connection to database | Intermediate | External Integration | compulsory |
| 4.14 | Generate data analysis with visualizations | Intermediate | External Integration | Optional |
| 4.15 | Describe what a cron job does and why scheduled automation matters | Novice | External Integration | compulsory |
| 4.16 | Explain what an API is and why agents need them to communicate | Intermediate | External Integration | compulsory |
| 4.17 | Difference between MCP and API | — | — | compulsory |
| 4.21 | Explain environment variables and why credentials must never be hardcoded | Intermediate | External Integration | — |

### PHASE 5 — SHARPENING THE BLADE
*Advanced thinking patterns, data mastery, and quality reflection*

| ID | Learning Outcome | Level | Domain | Type |
|----|------------------|-------|--------|------|
| 1.9 | Identify and resist tab tax (one problem at a time) | Advanced | Mental Models | — |
| 1.10 | Apply friction maxxing to engineer your environment for sustained agent focus | Intermediate | Mental Models | — |
| 1.11 | Maintain dedicated time blocks for agent work | Advanced | Mental Models | — |
| 1.12 | Distinguish mental model from agent reality (Map vs. Territory) | Advanced | Mental Models | — |
| 1.13 | Test your AI vocabulary for hollow vs. solid understanding | Advanced | Mental Models | — |
| 1.14 | Recognize rote prompt recycling vs. fresh problem-solving | Advanced | Mental Models | — |
| 5.1 | Evals - Types of evals - BDD framework, LLM as a Judge, why do we need these | — | — | compulsory |
| 5.2 | Apply scout mindset when debugging agent failures | Advanced | Mental Models | Optional |
| 5.1 | Connect agent work to real stakes (visceral engagement) | Advanced | Mental Models | — |
| 5.3 | Identify biomimetic patterns that map nature's solutions to software engineering | Advanced | Mental Models | Optional |
| 5.4 | Recognize and navigate the identity shift from specialist to AI orchestrator | Advanced | Mental Models | compulsory |
| 5.1 | Critically evaluate agent's DB decisions | Advanced | External Integration | — |
| 5.1 | Understand relational vs flat data | Advanced | External Integration | — |
| 5.1 | Iterate on analysis (3+ cycles) | Advanced | External Integration | — |
| 5.5 | Create reusable data analysis skill | Advanced | External Integration | Optional |
| 5.6 | Use worktree for getting multiple tasks done in the same repo | Advanced | Autonomous Operations | Optional |
| 5.7 | Evaluate agent output quality using structured rubrics | Advanced | Autonomous Operations | compulsory |

### PHASE 6 — SYSTEMS THINKING
*Architecture decisions, first autonomy, and teaching others*

| ID | Learning Outcome | Level | Domain | Type |
|----|------------------|-------|--------|------|
| 6.1 | Share skill files with colleagues | Advanced | Memory Engineering | Optional |
| 6.2 | Demonstrate task continuity across resets | Advanced | Memory Engineering | Optional |
| 6.3 | Diagnose and resolve memory/context issues | Advanced | Memory Engineering | Optional |
| 6.4 | Detect and prevent context poisoning in agent sessions | Advanced | Memory Engineering | Optional |
| 6.5 | Explain emergent vs traditional schema | Advanced | External Integration | Optional |
| 6.6 | Explain when KG needed vs flat files | Advanced | External Integration | Optional |
| 6.7 | Set up retrieval-augmented generation (RAG) for document-based Q&A | Advanced | External Integration | Optional |
| 6.8 | Position task on autonomy spectrum | Advanced | Autonomous Operations | compulsory |
| 6.9 | Design guardrails for autonomy levels | Advanced | Autonomous Operations | compulsory |
| 6.10 | Identify safety risks in user-facing agents | Advanced | Autonomous Operations | compulsory |
| 6.11 | Define and track autonomy levels using the Autonomy Slider (1-10) | Advanced | Autonomous Operations | compulsory |
| 6.12 | Onboard colleague to Domain 2 | Advanced | Autonomous Operations | Optional |
| 6.13 | Apply responsible AI principles: bias awareness, transparency, and accountability | Advanced | Autonomous Operations | Optional |

### PHASE 7A — PRODUCTION FOUNDATIONS
*Multi-agent systems, and guardrails*

| ID | Learning Outcome | Level | Domain | Type |
|----|------------------|-------|--------|------|
| 4.13 | Identify Procrustean bed risks | Expert | External Integration | — |
| 4.15 | Set up basic knowledge graph | Expert | External Integration | — |
| 4.16 | Query KG for multi-hop reasoning | Expert | External Integration | — |
| 7.1 | Curate reusable skill library for team | Expert | Memory Engineering | Optional |
| 7.2 | Implement cost/comm/approval guardrails | Expert | Autonomous Operations | compulsory |
| 7.3 | Set up safety monitoring | Expert | Autonomous Operations | Optional |
| 7.4 | Establish escalation protocols | Expert | Autonomous Operations | Optional |
| 7.5 | Design agent specialization | Expert | Autonomous Operations | compulsory |
| 7.6 | Implement agent handoff protocol | Expert | Autonomous Operations | compulsory |
| 7.7 | Run parallel agents for analyses | Expert | Autonomous Operations | Optional |

### PHASE 7B — SCALING & MASTERY
*Organizational rollout, reflective practice, and production hardening*

| ID | Learning Outcome | Level | Domain | Type |
|----|------------------|-------|--------|------|
| 8.1 | Practice deliberate thinking before prompting (Going Slow) | Expert | Mental Models | Optional |
| 8.2 | Study what masters actually do, not what they say (Being in the Arena) | Expert | Mental Models | compulsory |
| 8.3 | Create team adoption documentation | Expert | Autonomous Operations | Optional |
| 8.1 | Calculate and communicate AI ROI | Expert | Autonomous Operations | Optional |
| 8.4 | Treat agent system as production infra | Expert | Autonomous Operations | Optional |
| 8.5 | Set up staging environment | Expert | Autonomous Operations | compulsory |
| 8.6 | Implement observability | Expert | Autonomous Operations | Optional |
| 8.7 | Design a review queue with confidence scoring for human-in-the-loop oversight | Expert | Autonomous Operations | compulsory |
| 8.8 | Design micro-feedback loops for AI coaching | Expert | Autonomous Operations | Optional |
| 8.9 | Build evaluation harnesses to measure agent performance | Expert | Autonomous Operations | compulsory |

---

## 4. Self-Paced Track (condensed)

| Module | Topic | Description |
|--------|-------|-------------|
| 1 | Path to Agentic Mastery — Overview | Curriculum, 5 domains, Claude + Cursor + Git setup, create repo |
| 2 | Mental Models | Consumer vs producer mindset, firefighting vs system building, chat vs agentic system, context window, goldfish problem, agent loop, folder structure, voice typing, file types; assignments: theoretical concept + project idea doc + folder structure with planning .md; git push adding Taleemabad University as collaborator |
| 3 | Mental Models | 90-10 rule, progressive disclosure, file structure, prompt writing & techniques, iteration is learning, CLAUDE.md mastery → write first CLAUDE.md |
| 4 | Memory Architecture | Why context window fills up, memory architecture (context window → knowledge graph), foundational files memory.md / decisions.md / session logs, beads system, close the loop, update CLAUDE.md |
| 5 | Memory Architecture | CLAUDE.md "don't crowd the drawing room", skill files, why write skills, skills vs agents, one-prompt-wonder full project, organize skills/ docs/ context/ |
| 6 | Memory Architecture & Real World (DBs & APIs) | Law vs rules (is a hook a rule or law?), hooks, loops & scheduling loops, deployment, three-layer architecture, product deployment (getting users to test) |
| 7 | Real World — DBs & APIs | Database, UIDs, foreign keys → create ERD, environment variables, connect DB to project |
| 8 | Real World — DBs & APIs | MCP connections, what is MCP, why MCP in projects, MCP vs API |
| 9 | Memory Architecture | Evals — types of evals, BDD framework, LLM as a Judge, why we need these |
| 10 | Sharpening — Advanced Patterns | Harness |
| 11 | Sharpening — Advanced Patterns | Orchestrator |

---

## 5. Readings / Links

**Higher Order Reading**
- https://shumer.dev/something-big-is-happening
- https://danielmeppiel.github.io/awesome-ai-native/docs/prose/
- https://factory.strongdm.ai/
- https://www.youtube.com/watch?v=TXHyplCoxQs
- https://webdirections.org/blog/the-structure-of-engineering-revolutions/
- https://www.jampa.dev/p/the-rise-of-one-pizza-engineering
- https://www.seuros.com/blog/dictatorship-driven-development

**Understanding Agentic Engineering**
- https://simonwillison.net/guides/agentic-engineering-patterns/what-is-agentic-engineering/

**General Claude Code Learning**
- https://github.com/luongnv89/claude-howto
- https://github.com/shanraisshan/claude-code-best-practice
- https://boristane.com/blog/how-i-use-claude-code/
- https://anthropic.skilljar.com/claude-code-in-action

**Managing Memory using a File System (!important)**
- https://x.com/koylanai/status/2025286163641118915?s=48

**What to document and what not to document**
- https://haskellforall.com/2026/03/a-sufficiently-detailed-spec-is-code
- https://yagmin.com/blog/your-docs-directory-is-doomed/
- https://www.humanlayer.dev/blog/writing-a-good-claude-md

**Hooks**
- https://builder.aws.com/content/39qVvXF9Bu8U5NwPF5d5n25VEZI/automating-your-workflow-with-claude-code-hooks

**Useful Plugins**
- https://github.com/obra/superpowers

**Managing Context better when using MCP**
- https://mksg.lu/blog/context-mode

**On Building Skills**
- https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf
- https://arxiv.org/pdf/2602.12670

**Keeping tabs on your context spent (terminal/PowerShell only)**
- https://github.com/kamranahmedse/claude-statusline

**On building Evals**
- https://github.com/hamelsmu/evals-skills
- https://hamel.dev/notes/llm/evals/flashcards/
- https://www.deeplearning.ai/short-courses/evaluating-ai-agents/

**Understanding bias in models**
- https://amplifying.ai/research/claude-code-picks

**Self driving agents**
- https://www.youtube.com/watch?v=Rok-Y5DcHMI

**Making your service agent ready**
- https://basecamp.com/agents
- https://background-agents.com/
- https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution
- https://x.com/karpathy/status/2026360908398862478

**Understanding Harness Engineering**
- https://openai.com/index/harness-engineering/

**Let the model use the browser/computer**
- https://www.deeplearning.ai/short-courses/building-towards-computer-use-with-anthropic/
- https://claude.com/claude-for-chrome
