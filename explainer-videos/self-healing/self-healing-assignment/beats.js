'use strict';
/*
 * beats.js — "Self-Healing & Self-Improving — Assignment" (companion video to the docx).
 * Claude Code IDE-screencast format (matches harness Assignment 1/2 + M11 assessment; assessment.html
 * renderer). Content = build a real Act -> Critic -> Retry -> Remember loop on one task you actually
 * have, then decide where the learning is stored and where the human line sits.
 * Grounded in videos 01-05 of the series. Narrated; wrapped in Taleemabad bumpers.
 * Interactive QUESTION -> REVEAL (card beats, holdAfter) per house rule. No character art (i2v N/A).
 */

const T = {
  agent:    { name: 'agent.js' },
  prompts:  { name: 'prompts/' },
  task:     { name: 'task.md', indent: 1 },
  critic:   { name: 'critic.js' },
  loop:     { name: 'loop.js' },
  memory:   { name: 'memory/' },
  learned:  { name: 'learned.jsonl', indent: 1 },
  runs:     { name: 'runs.jsonl', indent: 1 },
  policy:   { name: 'POLICY.md' },
  env:      { name: '.env' },
};
const BASE = [T.agent, T.prompts, T.task, T.env];
const withFiles = (...extra) => BASE.concat(extra);

module.exports = [
  { id: '01', mode: 'card',
    vo: 'This is your assignment: build an agent that catches its own mistakes, then keeps the fix.',
    card: { small: 'Self-Healing & Self-Improving · Assignment', big: 'Build a loop that recovers — then make sure it does not need to.' } },

  { id: '02', mode: 'ide',
    vo: 'Start with one real task you actually run, not a toy example.',
    screen: { tree: BASE, active: 'prompts/task.md',
      editor: { name: 'prompts/task.md', lines: ['# The task', '', 'One real job I run every week.', 'Input: ...', 'Output: ...'] }, chat: [] } },

  { id: '03', mode: 'ide',
    vo: 'You will build four parts, in the order the series taught them.',
    screen: { tree: BASE, active: 'prompts/task.md',
      editor: { name: 'prompts/task.md', lines: ['# The task', '', 'One real job I run every week.'] },
      chat: [{ role: 'claude', text: 'Four parts to build:\n1. The failure — name what actually goes wrong\n2. The critic — the cheapest thing that catches it\n3. The loop — retry, capped, then a human\n4. The memory — where the fix gets stored' }] } },

  // ---- PART 1: name the failure ----
  { id: '04', mode: 'ide',
    vo: 'Part one, the failure: write down exactly what going wrong looks like.',
    screen: { method: '1 · Name the failure', tree: BASE, active: 'prompts/task.md',
      editor: { name: 'prompts/task.md', lines: ['## What "wrong" looks like', '', '- returns an empty result', '- invents a policy that does not exist', '- refunds more than the order was worth'] },
      chat: [{ role: 'you', text: 'Help me write down the three ways this task actually fails today, in plain language — not "it hallucinates".' }] } },

  { id: '05', mode: 'ide',
    vo: 'A failure you cannot describe is a failure nothing can ever catch.',
    screen: { method: '1 · Name the failure', tree: BASE, active: 'prompts/task.md',
      editor: { name: 'prompts/task.md', lines: ['bad: "it hallucinates sometimes"', 'good: "it returns a refund above the order total"', '', 'a critic can only check what you can state'] },
      chat: [{ role: 'claude', text: 'Rewrite each failure so a rule or a test could detect it. If you cannot state it, you cannot check it.' }] } },

  // ---- PART 2: the critic ----
  { id: '06', mode: 'ide',
    vo: 'Part two, the critic: pick the cheapest one that catches your real failure.',
    screen: { method: '2 · Build the critic', tree: withFiles({ name: 'critic.js', tag: 'new' }), active: 'critic.js',
      editor: { name: 'critic.js', lines: ['// a rule    — free, instant, narrow', '// a test    — cheap, exact', '// a model   — catches the vague', '// a person  — catches anything, slowest', '', 'if (refund > orderTotal) return fail("refund exceeds order")'] },
      chat: [{ role: 'you', text: 'Write me a critic for this output. Start with plain rules — only use a model call for the failures a rule cannot describe.' }] } },

  { id: '07', mode: 'ide',
    vo: 'A good critic returns the reason, not just a thumbs down.',
    screen: { method: '2 · Build the critic', tree: withFiles({ name: 'critic.js', tag: 'ok' }), active: 'critic.js',
      editor: { name: 'critic.js', lines: ['return { ok: false,', '  reason: "refund 8,400 exceeds order total 5,200" }', '', '// the reason IS the thing that makes the retry work'] },
      chat: [{ role: 'claude', text: 'The reason is what the retry reads. "Failed" teaches nothing; "refund exceeds order total by 3,200" fixes itself.' }] } },

  // ---- PART 3: the loop ----
  { id: '08', mode: 'ide',
    vo: 'Part three, the loop: feed the reason back and let it try again.',
    screen: { method: '3 · Close the loop', tree: withFiles({ name: 'critic.js' }, { name: 'loop.js', tag: 'new' }), active: 'loop.js',
      editor: { name: 'loop.js', lines: ['result = agent.run(task)', 'check  = critic(result)', '', 'while (!check.ok && tries < 3) {', '  result = agent.run(task, check.reason)', '  check  = critic(result)', '}'] },
      chat: [{ role: 'you', text: 'Wire the loop: act, check, and on failure pass the reason back in and retry.' }] } },

  { id: '09', mode: 'ide',
    vo: 'Cap the tries, because a loop with no cap is a bill with no ceiling.',
    screen: { method: '3 · Close the loop', tree: withFiles({ name: 'critic.js' }, { name: 'loop.js', tag: 'ok' }), active: 'loop.js',
      editor: { name: 'loop.js', lines: ['if (tries >= 3) escalateToHuman(result, check.reason)', '', '// three tries, then it is mine'] },
      chat: [{ role: 'claude', text: 'Capped at 3. After that it stops and hands the whole trail to a person — never silently forever.' }],
      terminal: ['$ node loop.js', 'try 1 ✗ refund exceeds order total', 'try 2 ✓ passed — 1 retry, healed'] } },

  // ---- PART 4: remember ----
  { id: '10', mode: 'ide',
    vo: 'Part four, the memory: decide where the fix is going to live.',
    screen: { method: '4 · Store the fix', tree: withFiles({ name: 'memory/', tag: 'new' }, { name: 'learned.jsonl', indent: 1, tag: 'new' }, { name: 'runs.jsonl', indent: 1, tag: 'new' }), active: 'learned.jsonl',
      editor: { name: 'memory/learned.jsonl', lines: ['{"lesson":"never refund above order total","stored_in":"instructions"}', '', 'memory · retrieval · instructions · tools · workflow · checks'] },
      chat: [{ role: 'you', text: 'For each repeated failure, tell me where the fix should be stored — memory, retrieval, instructions, tools, workflow, or a new check — and why.' }] } },

  { id: '11', mode: 'ide',
    vo: 'Then prove it: the same failure should stop showing up in your run log.',
    screen: { method: '4 · Store the fix', tree: withFiles({ name: 'memory/' }, { name: 'runs.jsonl', indent: 1, tag: 'ok' }), active: 'runs.jsonl',
      editor: { name: 'memory/runs.jsonl', lines: ['before  10 runs · 6 retries · 2 escalations', 'after   10 runs · 1 retry  · 0 escalations', '', 'the fix was kept, so the loop got shorter'] },
      chat: [{ role: 'claude', text: 'Run 10 before and 10 after. If the retry count does not drop, the fix was not really stored.' }],
      terminal: ['$ node loop.js --runs 10', 'retries 6 → 1 · escalations 2 → 0'] } },

  // ---- PART 5: the line ----
  { id: '12', mode: 'ide',
    vo: 'Last, draw the line: what may this system change on its own, and what needs you.',
    screen: { method: '5 · Draw the human line', tree: withFiles({ name: 'POLICY.md', tag: 'new' }), active: 'POLICY.md',
      editor: { name: 'POLICY.md', lines: ['May change itself:', '- its own memory', '- what it retrieves', '', 'Only with a person:', '- the rules', '- anything about money', '- the model itself'] },
      chat: [{ role: 'you', text: 'Write POLICY.md: two lists — what this system may change about itself alone, and what always needs a human.' }] } },

  { id: '13', mode: 'ide',
    vo: 'And check honestly whether fine-tuning is even on the table for you.',
    screen: { method: '5 · Draw the human line', tree: withFiles({ name: 'POLICY.md', tag: 'ok' }), active: 'POLICY.md',
      editor: { name: 'POLICY.md', lines: ['Fine-tune check', '  narrow task      ?', '  high volume      ?', '  real dataset     ?', '  measurable       ?', '  stable task      ?', '', 'all five, or not yet'] },
      chat: [{ role: 'claude', text: 'Answer all five honestly. Fewer than five means fix the system, not the model — and say which rung of the ladder you are on.' }] } },

  // ---- QUESTION -> REVEAL ----
  { id: '14', mode: 'card', holdAfter: 6,
    vo: 'Quick question: it heals every time, but the retry count never drops — what is missing?',
    card: { small: 'Your turn — write it down', big: 'It heals every time, but the retry count never drops. What is missing?',
      sub: 'A) A bigger model     B) The remember step — nothing is being stored     C) More retries' } },

  { id: '15', mode: 'card',
    vo: 'The answer is B: it is healing, but nothing is being kept, so it never improves.',
    card: { small: 'The answer', big: 'B — nothing is being stored.',
      sub: 'Healing without remembering repeats forever. Store the fix.' } },

  // ---- submit + close ----
  { id: '16', mode: 'ide',
    vo: 'Submit five things: your failures, your critic, your loop, your before-and-after, and your policy.',
    screen: { tree: withFiles({ name: 'critic.js', tag: 'ok' }, { name: 'loop.js', tag: 'ok' }, { name: 'memory/', tag: 'ok' }, { name: 'POLICY.md', tag: 'ok' }), active: 'POLICY.md',
      editor: { name: 'POLICY.md', lines: ['the loop you built', '', 'act · critic · retry · remember'] },
      chat: [{ role: 'claude', text: 'Submit on the LMS:\n1. The three named failures\n2. critic.js — and which flavour you chose, and why\n3. loop.js — with the cap and the escalation\n4. Before/after run counts — retries and escalations\n5. POLICY.md — plus your five-point fine-tune check' }] } },

  { id: '17', mode: 'card',
    vo: 'Act, critic, retry, remember — build the room first, and decide about the brain last.',
    card: { small: 'Self-Healing & Self-Improving', big: 'Act · Critic · Retry · Remember ✓', sub: 'Build the room first. The brain comes last.' } },
];

module.exports.title = 'Self-Healing & Self-Improving — Assignment';
