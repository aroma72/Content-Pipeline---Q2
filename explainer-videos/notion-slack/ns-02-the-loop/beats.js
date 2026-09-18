'use strict';
/*
 * beats.js — "The Loop, End to End" (Module 14, video 2 of 7).
 * Script: ../Scripts/ns-02-the-loop-end-to-end.md  ·  Guide §2
 *
 * TECHNICAL HOW-TO FORMAT — no protagonist. card / info / ui only, rendered by
 * animation/walkthrough.html. No Imagen, no cutouts, no i2v.
 *
 * The five `ui` screens (L1–L5) use the SAME invented example as videos 3–6 — task "Add login page",
 * PR #42 — so the module reads as one continuous worked example rather than five unrelated demos.
 */

module.exports = [
  { id: '01', mode: 'card',
    vo: 'One request. Four services. A path it always takes.',
    card: { small: 'Module 14 · Video 2', big: 'One request, four services, one path.',
      sub: 'Slack in · Notion tracks · GitHub lands · Slack out' } },

  { id: '02', mode: 'ui',
    vo: 'It starts with a message: add a login page.',
    cap: 'You ask, in Slack',
    screen: { app: 'Slack', url: '#project-agent',
      title: 'You, 09:14', sub: 'The only part of the loop you touch.',
      rows: [ { k: 'Message', v: '@agent add a login page', hl: true } ] } },

  { id: '03', mode: 'info',
    vo: 'Slack is the conversation — the only place you touch.',
    cap: 'Slack · the conversation',
    info: { tpl: 'fourparts', data: { title: 'The loop', parts: [
      'Slack — the conversation  ← you are here',
      'Notion — the operating area',
      'GitHub — the workshop',
      'Your deployment — the body' ] } } },

  { id: '04', mode: 'info',
    vo: 'Everything after this happens without you.',
    cap: 'Without you',
    info: { tpl: 'statement', data: { text: 'Everything after this happens without you.', hi: 'without you' } } },

  { id: '05', mode: 'ui',
    vo: 'A card appears on the board: add a login page, status to do.',
    cap: 'Notion · a card appears',
    screen: { app: 'Notion', url: 'Agent tasks — board',
      title: 'Agent tasks',
      rows: [
        { k: 'Name', v: 'Add login page' },
        { k: 'Status', v: 'To Do', tag: 'new', tagTone: '' },
        { k: 'Priority', v: 'Medium' },
        { k: 'Notes', v: '—' } ] } },

  { id: '06', mode: 'info',
    vo: 'Notion is the operating area — where the work is tracked.',
    cap: 'Notion · the operating area',
    info: { tpl: 'fourparts', data: { title: 'The loop', parts: [
      'Slack — the conversation',
      'Notion — the operating area  ← you are here',
      'GitHub — the workshop',
      'Your deployment — the body' ] } } },

  { id: '07', mode: 'info',
    vo: 'Not in the agent\'s context, and not in a chat that scrolls away.',
    cap: 'Somewhere it survives',
    info: { tpl: 'statement', data: { text: 'A board survives the session. A scrollback does not.', hi: 'survives the session' } } },

  { id: '08', mode: 'ui',
    vo: 'The agent picks the top card and moves it to In Progress.',
    cap: 'It claims the work',
    screen: { app: 'Notion', url: 'Agent tasks — board',
      title: 'Agent tasks',
      rows: [
        { k: 'Name', v: 'Add login page' },
        { k: 'Status', v: 'In Progress', hl: true, tag: 'claimed', tagTone: 'ok' },
        { k: 'Priority', v: 'Medium' },
        { k: 'Notes', v: 'started — writing the form component' } ] } },

  { id: '09', mode: 'ui',
    vo: 'It writes the code, commits, and opens a pull request.',
    cap: 'GitHub · the work lands',
    screen: { app: 'GitHub', url: 'your-org/your-project — pull requests',
      title: 'Add login page  #42', sub: 'opened by the agent · 2 files changed',
      rows: [
        { k: 'Commits', v: '2' },
        { k: 'Files changed', v: 'LoginForm.tsx, routes.ts' },
        { k: 'Status', v: 'Open — awaiting your review', hl: true } ] } },

  { id: '10', mode: 'info',
    vo: 'GitHub is the workshop — where the work actually lands.',
    cap: 'GitHub · the workshop',
    info: { tpl: 'fourparts', data: { title: 'The loop', parts: [
      'Slack — the conversation',
      'Notion — the operating area',
      'GitHub — the workshop  ← you are here',
      'Your deployment — the body' ] } } },

  { id: '11', mode: 'info',
    vo: 'A change you can read, question, approve, or refuse.',
    cap: 'It proposes. You decide.',
    info: { tpl: 'statement', data: { text: 'The agent proposes. You decide.', hi: 'You decide' } } },

  { id: '12', mode: 'ui',
    vo: 'The card moves to Done, and a message arrives back in the channel.',
    cap: 'And it reports back',
    screen: { app: 'Slack', url: '#project-agent',
      title: 'agent, 09:21',
      rows: [
        { k: 'Message', v: 'login page is up, PR #42', hl: true },
        { k: 'Notion card', v: 'Done' } ] } },

  { id: '13', mode: 'info',
    vo: 'That is the loop. You touched it once.',
    cap: 'You touched it once',
    info: { tpl: 'bignum', data: {
      left: { big: '1', lab: 'thing you did' },
      sep: 'produced',
      right: { big: '4', lab: 'services doing the rest' } } } },

  // ── CHECKPOINT: nothing drawn, nothing spoken. Pause → ask → feedback → resume. ──
  { id: '14', mode: 'checkpoint',
    quiz: {
      stem: 'Your agent is connected to Slack, Notion and GitHub, and the loop works exactly as shown. You shut your laptop and go home. What happens to the next request someone sends?',
      options: [
        'It queues and runs when you open the laptop again',
        'Nothing happens; there is no process running to receive it',
        'Slack retries until the agent responds',
        'Notion creates the card and the rest waits',
      ],
      answer: 1,
      correctNote: 'Exactly. Slack, Notion and GitHub are services the agent calls — none of them runs it. The code doing the reading, deciding and committing has to be executing somewhere, and if that somewhere is your laptop, closing it ends the loop.',
      explain: 'Nothing happens at all, and the reason it is tempting to think otherwise is that these services feel active. They are not. Slack delivers an event to a URL; if nothing answers, it retries briefly and gives up — it does not hold messages for an app that is switched off. Notion only creates a card when something calls its API, and nothing is calling. Your agent is a program, and a program that is not running cannot poll, cannot be notified, and cannot create anything.',
    } },

  { id: '15', mode: 'info',
    vo: 'One thing is missing from that diagram, and it is the one nobody draws.',
    cap: 'One thing is missing',
    info: { tpl: 'statement', data: { text: 'One thing is missing, and nobody draws it.', hi: 'nobody draws it' } } },

  { id: '16', mode: 'info',
    vo: 'Something has to be running to do any of it.',
    cap: 'Something has to be running',
    info: { tpl: 'fourparts', data: { title: 'The loop, with the part nobody draws', parts: [
      'Slack — the conversation',
      'Notion — the operating area',
      'GitHub — the workshop',
      'Your deployment — the body, running all of it  ← the missing one' ] } } },

  { id: '17', mode: 'info',
    vo: 'A small server that never turns off.',
    cap: 'A server that never turns off',
    info: { tpl: 'statement', data: { text: 'A small server that never turns off.', hi: 'never turns off' } } },

  { id: '18', mode: 'info',
    vo: 'It checks for new work every sixty seconds.',
    cap: 'It checks, on a timer',
    info: { tpl: 'twocard', data: {
      left: { title: 'Polling', items: ['asks every 60 seconds', 'is there anything new?'] },
      right: { title: 'Webhooks', items: ['—'] } } } },

  { id: '19', mode: 'info',
    vo: 'And reacts to a GitHub webhook the instant it fires.',
    cap: 'And reacts, instantly',
    info: { tpl: 'twocard', data: {
      left: { title: 'Polling', items: ['asks every 60 seconds', 'is there anything new?'] },
      right: { title: 'Webhooks', items: ['no asking at all', 'woken the instant it fires'] } } } },

  { id: '20', mode: 'info',
    vo: 'Polling finds work. Webhooks find it faster. You want both.',
    cap: 'You want both',
    info: { tpl: 'statement', data: { text: 'Polling finds work. Webhooks find it faster.', hi: 'faster' } } },

  { id: '21', mode: 'card',
    vo: 'Take the next thing you would ask for, and trace it around the four.',
    card: { small: 'Before the next video', big: 'Trace your next request around the four.',
      sub: 'Ask · track · build · report — on something that stays awake' } },
];

module.exports.title = 'The Loop, End to End';
module.exports.animateIds = [];
