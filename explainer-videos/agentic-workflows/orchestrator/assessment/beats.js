'use strict';
/*
 * beats.js — "Orchestrator Assessment" (Agentic Workflows). Claude Code IDE-screencast
 * format. Narrated; Taleemabad bumpers. The learner builds an orchestrator for THEIR
 * project where an ORCHESTRATOR agent runs a team of sub-agents — each sub-agent given one
 * specific task and one guardrail — to make the whole project run autonomously. Four methods:
 *   1. The orchestrator + sub-agents — the main agent that splits, delegates, and combines
 *   2. A task and a guardrail each   — every sub-agent: one task + one guardrail (a skill file)
 *   3. Make it autonomous            — a hook + a loop so the orchestrator runs the team itself
 *   4. Keep it honest                — evals so every sub-agent stays inside its guardrail
 */

const T = {
  claude: { name: 'CLAUDE.md' }, server: { name: 'server.js' }, env: { name: '.env' },
  plan: { name: 'agents-plan.md' },
  dotclaude: { name: '.claude/' },
  settings: { name: 'settings.json', indent: 1 },
  skills: { name: 'skills/', indent: 1 },
  skPrice: { name: 'pricing/SKILL.md', indent: 2 },
  skStock: { name: 'inventory/SKILL.md', indent: 2 },
  skReply: { name: 'replies/SKILL.md', indent: 2 },
  evals: { name: 'evals/' },
};
const BASE = [T.claude, T.server, T.env];
const withFiles = (...extra) => BASE.concat(extra);

module.exports = [
  { id: '01', mode: 'card',
    vo: 'This is your orchestrator assessment, where one orchestrator agent runs a team of sub-agents to make your project autonomous.',
    card: { small: 'Agentic Workflows · Assessment', big: 'An orchestrator agent runs a team of sub-agents — each with one task and one guardrail — so your project runs itself.' } },

  { id: '02', mode: 'ide',
    vo: 'Open your own project, the one with a job too big for a single agent.',
    screen: { tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# My project', '', 'One big job no single agent should run alone.'] }, chat: [] } },

  { id: '03', mode: 'ide',
    vo: 'You will use four methods, and you design the team while the agents do the work.',
    screen: { tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# My project', '', 'One big job no single agent should run alone.'] },
      chat: [{ role: 'claude', text: 'Four methods — you design, I build:\n1. The orchestrator and its sub-agents\n2. A task and a guardrail for each\n3. Make the whole project autonomous\n4. Keep it honest with evals' }] } },

  // ---- METHOD 1: the orchestrator + sub-agents ----
  { id: '04', mode: 'ide',
    vo: 'Method one, the orchestrator. It is the main agent that splits your biggest job across sub-agents and runs them.',
    screen: { method: '1 · The orchestrator + sub-agents', tree: BASE, active: 'server.js',
      editor: { name: 'server.js', lines: ['// the biggest job in my project', '// one orchestrator agent will run a team on it'] },
      chat: [{ role: 'you', text: 'Be the orchestrator for my project. Take the biggest job, split it into a few sub-agents you will run, and name each one.' }] } },

  { id: '05', mode: 'ide',
    vo: 'The orchestrator does none of the work itself, it only splits, delegates, and combines.',
    screen: { method: '1 · The orchestrator + sub-agents', tree: withFiles({ name: 'agents-plan.md', tag: 'new' }), active: 'agents-plan.md',
      editor: { name: 'agents-plan.md', lines: ['# the team', '', 'ORCHESTRATOR — splits, delegates, combines', '  ├─ Pricing    — sets prices', '  ├─ Inventory  — reorders stock', '  └─ Replies    — answers buyers'] },
      chat: [{ role: 'claude', text: 'You are the orchestrator. Your team is Pricing, Inventory, and Replies. You split and combine, they execute.' }] } },

  { id: '06', mode: 'ide',
    vo: 'So first, name the sub-agents your orchestrator will run.',
    screen: { method: '1 · The orchestrator + sub-agents', tree: withFiles(T.plan), active: 'agents-plan.md',
      editor: { name: 'agents-plan.md', lines: ['The orchestrator runs three sub-agents.', '', 'The orchestrator coordinates.', 'Each sub-agent executes one job.'] }, chat: [] } },

  // ---- METHOD 2: a task and a guardrail each ----
  { id: '07', mode: 'ide',
    vo: 'Method two, give every sub-agent one specific task and one guardrail it cannot cross.',
    screen: { method: '2 · A task + a guardrail each', tree: withFiles(T.plan, T.dotclaude, T.skills), active: 'agents-plan.md',
      editor: { name: 'agents-plan.md', lines: ['Pricing   — set prices    · never below cost', 'Inventory — reorder stock · cap 10k per order', 'Replies   — answer buyers · no refunds, escalate'] },
      chat: [{ role: 'you', text: 'For each sub-agent, write its one task and one guardrail as a skill file — .claude/skills/<name>/SKILL.md.' }] } },

  { id: '08', mode: 'ide',
    vo: 'A skill file holds that agent’s task and the limit it must stay inside.',
    screen: { method: '2 · A task + a guardrail each', tree: withFiles(T.plan, T.dotclaude, T.skills, { name: 'pricing/SKILL.md', indent: 2, tag: 'new' }), active: 'pricing/SKILL.md',
      editor: { name: '.claude/skills/pricing/SKILL.md', lines: ['# pricing', '', 'Task: set a price for each item.', '', 'Guardrail:', '- never below cost', '- flag any change over 20%'] },
      chat: [{ role: 'claude', text: 'One skill = one sub-agent. Its task at the top, the guardrail it cannot cross right under it.' }] } },

  { id: '09', mode: 'ide',
    vo: 'Do this for every sub-agent, so each one has a clear job and a clear limit.',
    screen: { method: '2 · A task + a guardrail each', tree: withFiles(T.plan, T.dotclaude, T.skills,
        { name: 'pricing/SKILL.md', indent: 2, tag: 'ok' }, { name: 'inventory/SKILL.md', indent: 2, tag: 'ok' }, { name: 'replies/SKILL.md', indent: 2, tag: 'ok' }), active: 'replies/SKILL.md',
      editor: { name: '.claude/skills/replies/SKILL.md', lines: ['# replies', '', 'Task: answer a customer message.', '', 'Guardrail:', '- no refunds', '- escalate anything angry or legal'] },
      chat: [{ role: 'claude', text: 'Three sub-agents, three skills — each with its one task and its one guardrail.' }] } },

  // ---- METHOD 3: make it autonomous ----
  { id: '10', mode: 'ide',
    vo: 'Method three, make the whole project autonomous. Add a hook so the orchestrator runs when new work arrives.',
    screen: { method: '3 · Make it autonomous', tree: withFiles(T.plan, T.dotclaude, T.settings, T.skills), active: 'settings.json',
      editor: { name: '.claude/settings.json', lines: ['"hooks": {', '  "on-new-order": "run the orchestrator"', '}'] },
      chat: [{ role: 'you', text: 'Add a hook so the orchestrator runs the team automatically whenever new work comes in.' }] } },

  { id: '11', mode: 'ide',
    vo: 'Add a loop so it repeats on its own, without you starting it.',
    screen: { method: '3 · Make it autonomous', tree: withFiles(T.plan, T.dotclaude, T.settings, T.skills), active: 'settings.json',
      editor: { name: '.claude/settings.json', lines: ['"hooks": { "on-new-order": "run the orchestrator" },', '"loop":  "every 30 min → run the queue"'] },
      chat: [{ role: 'claude', text: 'Hook + loop set. The orchestrator wakes on new work and again every 30 minutes.' }] } },

  { id: '12', mode: 'ide',
    vo: 'Now the orchestrator runs every sub-agent by itself, on a schedule.',
    screen: { method: '3 · Make it autonomous', tree: withFiles(T.plan, T.dotclaude, T.settings, T.skills), active: 'settings.json',
      editor: { name: '(running…)', lines: ['ORCHESTRATOR → pricing → inventory → replies', 'then the orchestrator combines the results'] },
      chat: [{ role: 'claude', text: 'Loop tick: the orchestrator splits, delegates to each sub-agent, and combines — no one pressing go.' }],
      terminal: ['$ orchestrator (loop)', 'pricing ok · inventory ok · replies ok · combined ✓'] } },

  // ---- METHOD 4: keep it honest ----
  { id: '13', mode: 'ide',
    vo: 'Method four, keep it honest. Add a check that each sub-agent did its task inside its guardrail.',
    screen: { method: '4 · Keep it honest', tree: withFiles(T.plan, T.dotclaude, T.settings, T.skills, { name: 'evals/', tag: 'new' }), active: 'evals/',
      editor: { name: 'evals/agents.eval.js', lines: ['eval("pricing never below cost")', 'eval("inventory under 10k cap")', 'eval("replies never refund")'] },
      chat: [{ role: 'you', text: 'Add an eval for each sub-agent — did it do its task and stay inside its guardrail?' }] } },

  { id: '14', mode: 'ide',
    vo: 'Then check the combined result, that the orchestrator’s pieces still fit together.',
    screen: { method: '4 · Keep it honest', tree: withFiles(T.plan, T.dotclaude, T.settings, T.skills, T.evals), active: 'evals/',
      editor: { name: 'evals/synthesis.eval.js', lines: ['eval("prices, stock and replies agree")', '', '// the orchestrator’s real job:', '// do the combined pieces fit?'] },
      chat: [{ role: 'claude', text: 'Two layers: each sub-agent inside its guardrail, and the orchestrator’s combined result makes sense.' }] } },

  { id: '15', mode: 'ide',
    vo: 'A failing eval catches the one sub-agent that broke its limit, so you fix it.',
    screen: { method: '4 · Keep it honest', tree: withFiles(T.plan, T.dotclaude, T.settings, T.skills, { name: 'evals/', tag: 'ok' }), active: 'evals/',
      editor: { name: 'evals/agents.eval.js', lines: ['inventory: reordered 12k  >  10k cap', '', 'guardrail crossed → eval FAILED', 'tighten the skill, re-run'] },
      chat: [{ role: 'claude', text: '⚠ inventory broke its 10k guardrail. The eval caught it before it shipped — tighten that skill and re-run.' }],
      terminal: ['$ node evals/agents.eval.js', '2 / 3 pass — inventory FAILED (12k > 10k)'] } },

  // ---- submit + close ----
  { id: '16', mode: 'ide',
    vo: 'When the orchestrator runs the team itself and the evals stay green, your project is autonomous.',
    screen: { tree: withFiles({ name: 'agents-plan.md', tag: 'ok' }, T.dotclaude, { name: 'settings.json', indent: 1, tag: 'ok' }, T.skills, { name: 'evals/', tag: 'ok' }), active: 'agents-plan.md',
      editor: { name: 'agents-plan.md', lines: ['orchestrator + sub-agents ✓   task + guardrail each ✓', 'hook + loop ✓   evals ✓', '', 'split → delegate → combine → check, on its own'] }, chat: [] } },

  { id: '17', mode: 'ide',
    vo: 'Commit your sub-agent skills, your hooks, and your evals, and keep your secrets out.',
    screen: { tree: withFiles(T.plan, T.dotclaude, T.settings, T.skills, T.evals), active: '.env',
      editor: { name: '.gitignore', lines: ['.env', '', '# skills/, the hook, evals/  →  committed', '# .env  →  never'] },
      chat: [{ role: 'you', text: 'Run git status, confirm .env is ignored, then commit the sub-agent skills, the settings hook, and the evals.' }],
      terminal: ['$ git status', '.claude/skills, settings.json, evals/ staged · .env ignored ✓'] } },

  { id: '18', mode: 'ide',
    vo: 'Then put it all in one Google Doc with two sections.',
    screen: { tree: withFiles(T.plan, T.dotclaude, T.settings, T.skills, T.evals), active: 'agents-plan.md',
      editor: { name: 'submission.md', lines: ['1 · The team   — the orchestrator + each sub-agent’s task & guardrail', '2 · Autonomous + honest   — hooks, loop, evals', '', '+ a 3-line reflection'] }, chat: [] } },

  { id: '19', mode: 'ide',
    vo: 'Submit the team, each sub-agent’s task and guardrail, the hook and loop, and the evals you added.',
    screen: { tree: withFiles(T.plan, T.dotclaude, T.settings, T.skills, T.evals), active: 'agents-plan.md',
      editor: { name: 'agents-plan.md', lines: ['ORCHESTRATOR + Pricing · Inventory · Replies', 'each: one task + one guardrail (skills)', 'hook + loop → runs itself', 'evals → caught inventory over cap'] },
      chat: [{ role: 'claude', text: 'Submit on the LMS:\n1. the orchestrator and its sub-agents\n2. each sub-agent’s task + guardrail (skills)\n3. the hook + loop that make it autonomous\n4. the evals + the one limit caught\n5. your repo link' }] } },

  { id: '20', mode: 'card',
    vo: 'An orchestrator, a team of sub-agents each with a task and a guardrail, running your project on its own. You design, and the agents do the work.',
    card: { small: 'Agentic Workflows', big: 'Orchestrator · Task + Guardrail · Autonomous · Honest ✓', sub: 'You design the team. The agents do the work.' } },
];

module.exports.title = 'Orchestrator Assessment';
