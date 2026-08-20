'use strict';
/*
 * beats.js — "Module 11 Assessment" (The Autonomy Dial). Claude Code IDE-screencast format
 * (matches the evals assessment guide). Narrated; wrapped in Taleemabad bumpers. Covers the
 * whole module — all four autonomy videos — as FOUR labelled methods you type and Claude runs:
 *   1. The dial            (v1 spectrum: place one task on 1-10 via "can I undo it?")
 *   2. One guardrail       (v2 guardrails: write the rule that lets it act without asking)
 *   3. Pre-mortem          (v3 safety risks: three questions, find the irreversible one)
 *   4. Slider by evidence  (v4 slider: put a number on it, move it only on a track record)
 * Every method beat carries `screen.method` — assessment.html renders it as a persistent
 * labelled banner so the viewer always knows which method they are watching.
 */

const T = {
  claude: { name: 'CLAUDE.md' }, server: { name: 'server.js' }, env: { name: '.env' },
  guard: { name: 'guardrail.md' }, notes: { name: 'autonomy-notes.md' },
};
const BASE = [T.claude, T.server, T.env];
const withFiles = (...extra) => BASE.concat(extra);

module.exports = [
  { id: '01', mode: 'card',
    vo: 'This is your module eleven assessment, and it pulls the whole autonomy dial into one decision.',
    card: { small: 'Module 11 · Assessment', big: 'Place one task on the dial, write its guardrail, check the risk, and set a number you can defend.' } },

  { id: '02', mode: 'ide',
    vo: 'Open your own Claude Code project, the one you have been building all along.',
    screen: { tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# My project', '', 'The app my users depend on.'] }, chat: [] } },

  { id: '03', mode: 'ide',
    vo: 'You will use four methods, and you decide while Claude does the work.',
    screen: { tree: BASE, active: 'CLAUDE.md',
      editor: { name: 'CLAUDE.md', lines: ['# My project', '', 'The app my users depend on.'] },
      chat: [{ role: 'claude', text: 'Four methods — you decide, I build:\n1. Place the task on the dial\n2. Write one guardrail\n3. Run the pre-mortem\n4. Set the slider by evidence' }] } },

  // ---- METHOD 1: The dial (v1 spectrum) ----
  { id: '04', mode: 'ide',
    vo: 'Method one, the dial. Name the one task you would hand your AI, and ask if you can undo it.',
    screen: { method: '1 · The dial', tree: BASE, active: 'server.js',
      editor: { name: 'server.js', lines: ['app.post("/refund", (req, res) => {', '  // the task I might hand over', '})'] },
      chat: [{ role: 'you', text: 'A task I might hand my AI: issuing refunds. Ask me the one question that sets its autonomy — if it goes wrong, can I undo it in time? — then place it low, middle, or high on a 1 to 10 dial.' }] } },

  { id: '05', mode: 'ide',
    vo: 'Easy to undo sits high and runs free, hard to undo sits low and waits for you.',
    screen: { method: '1 · The dial', tree: withFiles({ name: 'autonomy-notes.md', tag: 'new' }), active: 'autonomy-notes.md',
      editor: { name: 'autonomy-notes.md', lines: ['# autonomy-notes', '', 'Task: issue refunds', 'Can I undo it?  no — the money is gone', '', 'Dial today:  2 / 10  (low)'] },
      chat: [{ role: 'claude', text: 'A refund cannot be pulled back, so it sits low. Start it at 2 and let it earn its way up.' }] } },

  { id: '06', mode: 'ide',
    vo: 'Set the dial for that one task, not for the whole bot, and start every new task low.',
    screen: { method: '1 · The dial', tree: withFiles(T.notes), active: 'autonomy-notes.md',
      editor: { name: 'autonomy-notes.md', lines: ['Task: issue refunds  —  2 / 10', '', 'Per task, not per bot.', 'Every new task starts low, earns up.'] }, chat: [] } },

  // ---- METHOD 2: One guardrail (v2 guardrails) ----
  { id: '07', mode: 'ide',
    vo: 'Method two, the guardrail. Write one rule that lets the helper act without asking you every time.',
    screen: { method: '2 · One guardrail', tree: withFiles(T.notes), active: 'server.js',
      editor: { name: 'server.js', lines: ['// today it asks me on every refund', '// one rule could let it act alone'] },
      chat: [{ role: 'you', text: 'Help me write one guardrail rule for refunds — under this go ahead, over this ask me — in one sentence, and save it as guardrail.md.' }] } },

  { id: '08', mode: 'ide',
    vo: 'A good rule is not a cage, it is what lets you walk away.',
    screen: { method: '2 · One guardrail', tree: withFiles(T.notes, { name: 'guardrail.md', tag: 'new' }), active: 'guardrail.md',
      editor: { name: 'guardrail.md', lines: ['# guardrail', '', 'Refunds under 500, go ahead.', '500 or more, ask me.'] },
      chat: [{ role: 'claude', text: 'Saved guardrail.md. One line turns "ask me every time" into "go ahead".' }] } },

  { id: '09', mode: 'ide',
    vo: 'One rule, and the small refunds run alone while the big ones still come to you.',
    screen: { method: '2 · One guardrail', tree: withFiles(T.notes, { name: 'guardrail.md', tag: 'ok' }), active: 'guardrail.md',
      editor: { name: 'guardrail.md', lines: ['Refunds under 500  →  go ahead', '500 or more  →  ask me'] },
      chat: [{ role: 'claude', text: 'A 200 refund is handled alone. A 3000 refund stops and asks you.' }],
      terminal: ['a 200 refund  →  handled alone', 'a 3000 refund  →  stopped, asked you'] } },

  // ---- METHOD 3: Pre-mortem (v3 safety risks) ----
  { id: '10', mode: 'ide',
    vo: 'Method three, the pre-mortem. Before you hand over, picture the worst Friday first.',
    screen: { method: '3 · Pre-mortem', tree: withFiles(T.notes, T.guard), active: 'server.js',
      editor: { name: 'server.js', lines: ['// before it acts alone', '// what is the worst a stranger could cause?'] },
      chat: [{ role: 'you', text: 'Be a hostile stranger against refunds. Answer three things — could you trick it, could you make it do too much, could you make it do something I cannot undo — and show me the one that hurts most.' }] } },

  { id: '11', mode: 'ide',
    vo: 'The three questions find the one action that is easy to trigger and impossible to take back.',
    screen: { method: '3 · Pre-mortem', tree: withFiles(T.notes, T.guard), active: 'autonomy-notes.md',
      editor: { name: 'autonomy-notes.md', lines: ['Pre-mortem:', '· tricked?    yes — a fake "manager approved"', '· too much?   yes — a full refund', "· can't undo?  yes — the money is gone", '', 'Worst: a 3000 refund it cannot take back'] },
      chat: [{ role: 'claude', text: '⚠ The one that hurts: a stranger\'s message tricks it into a big refund you cannot reverse.' }] } },

  { id: '12', mode: 'ide',
    vo: 'So that one stays a stop and ask, however good the week has been.',
    screen: { method: '3 · Pre-mortem', tree: withFiles({ name: 'autonomy-notes.md', tag: 'ok' }, T.guard), active: 'autonomy-notes.md',
      editor: { name: 'autonomy-notes.md', lines: ['Irreversible risk: big refund from a fake message', '', 'Stays a stop-and-ask, always.', 'Small refunds still run free.'] }, chat: [] } },

  // ---- METHOD 4: Slider by evidence (v4 slider) ----
  { id: '13', mode: 'ide',
    vo: 'Method four, the slider. Put a number on the task, and move it by evidence, not by feeling.',
    screen: { method: '4 · Slider by evidence', tree: withFiles(T.notes, T.guard), active: 'autonomy-notes.md',
      editor: { name: 'autonomy-notes.md', lines: ['Refund task:  2 / 10 today', '', '"I trust it now" is a mood.', 'A number you can move is a decision.'] },
      chat: [{ role: 'you', text: 'Help me set a 1 to 10 number for refunds today, then tell me exactly what track record would earn the next notch and what one bad result would drop it back.' }] } },

  { id: '14', mode: 'ide',
    vo: 'Do the thing a feeling cannot do, and count.',
    screen: { method: '4 · Slider by evidence', tree: withFiles(T.notes, T.guard), active: 'autonomy-notes.md',
      editor: { name: 'autonomy-notes.md', lines: ['Last week:  39 of 40 refunds correct', '', 'Evidence earns the notch:', '2  →  6   on 39 of 40'] },
      chat: [{ role: 'claude', text: 'Thirty-nine of forty right earns a raise. Move it from 2 up to 6.' }],
      terminal: ['last week:  39 / 40 correct'] } },

  { id: '15', mode: 'ide',
    vo: 'The number climbs on a good week and drops on a bad one, and some tasks have a ceiling.',
    screen: { method: '4 · Slider by evidence', tree: withFiles(T.notes, T.guard), active: 'autonomy-notes.md',
      editor: { name: 'autonomy-notes.md', lines: ['Refund task:  6 / 10', '', 'Up on evidence, down on a miss.', 'Ceiling: 6 — never higher for this task.'] },
      chat: [{ role: 'claude', text: 'One bad week drops it back to four. Higher was never the goal — the right level was.' }] } },

  // ---- both projects + submit + close ----
  { id: '16', mode: 'ide',
    vo: 'Do the dial and the guardrail for both your personal bot and your main project.',
    screen: { tree: withFiles({ name: 'autonomy-notes.md', tag: 'ok' }, { name: 'guardrail.md', tag: 'ok' }), active: 'guardrail.md',
      editor: { name: 'guardrail.md', lines: ['personal bot   →  guardrail.md  ✓', 'main project   →  guardrail.md  ✓'] }, chat: [] } },

  { id: '17', mode: 'ide',
    vo: 'Commit the guardrail in both repositories, and keep your secrets out.',
    screen: { tree: withFiles({ name: 'autonomy-notes.md', tag: 'ok' }, { name: 'guardrail.md', tag: 'ok' }), active: '.env',
      editor: { name: '.gitignore', lines: ['.env', '', '# guardrail.md  →  committed', '# .env  →  never'] },
      chat: [{ role: 'you', text: 'Run git status, confirm .env is ignored and no secret is tracked, then commit guardrail.md and push.' }],
      terminal: ['$ git status', 'guardrail.md staged · .env ignored ✓'] } },

  { id: '18', mode: 'ide',
    vo: 'Then put it all in one Google Doc with two sections, your personal bot and your main project.',
    screen: { tree: withFiles({ name: 'autonomy-notes.md', tag: 'ok' }, { name: 'guardrail.md', tag: 'ok' }), active: 'autonomy-notes.md',
      editor: { name: 'submission.md', lines: ['1 · Personal bot   —  dial + guardrail', '2 · Main project   —  dial + guardrail', '                      + pre-mortem + slider', '', '+ a 3-line reflection'] }, chat: [] } },

  { id: '19', mode: 'ide',
    vo: 'Submit the link on the portal with the number, the guardrail, the risk you caught, and the evidence.',
    screen: { tree: withFiles({ name: 'autonomy-notes.md', tag: 'ok' }, { name: 'guardrail.md', tag: 'ok' }), active: 'autonomy-notes.md',
      editor: { name: 'autonomy-notes.md', lines: ['Refund task:  2 → 6 on 39 of 40', 'Guardrail:  under 500 go ahead', 'Risk caught:  big refund from a fake message'] },
      chat: [{ role: 'claude', text: 'Submit on the LMS:\n1. the dial number + why\n2. guardrail.md (both projects)\n3. the irreversible risk + stop-and-ask\n4. the evidence that moves the slider' }] } },

  { id: '20', mode: 'card',
    vo: 'A task on the dial, one guardrail, a risk you named, and a number you can defend. You decide, and Claude does the work.',
    card: { small: 'Module 11', big: 'Dial · Guardrail · Pre-mortem · Slider ✓', sub: 'You decide. Claude does the work.' } },
];

module.exports.title = 'Module 11 Assessment';
