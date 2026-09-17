'use strict';
/*
 * beats.js — "Why a Chat Window Isn't Enough" (Module 14, video 1 of 7).
 * Script: ../Scripts/ns-01-why-a-chat-window-isnt-enough.md  ·  Guide §1
 *
 * TECHNICAL HOW-TO FORMAT — no protagonist, no illustrated art. Every beat is a `card`
 * (full-screen statement), an `info` diagram, or a `ui` re-created product screen.
 * Renderer: animation/walkthrough.html. No Imagen, no cutouts, no i2v — TTS + HTML only.
 *
 * Beat 18 is the CHECKPOINT: never drawn, never spoken. The player pauses there, the LMS asks the
 * question, the learner must click an option to continue, gets feedback, then playback resumes.
 */

module.exports = [
  { id: '01', mode: 'card',
    vo: 'If you have to open it and talk to it, it is a chat window with extra steps.',
    card: { small: 'Module 14 · Video 1', big: 'A chat window is not an agentic system.',
      sub: 'Three things are missing, and none of them is intelligence.' } },

  { id: '02', mode: 'ui',
    vo: 'This is the normal setup: an editor open, a prompt typed, an answer coming back.',
    cap: 'The usual arrangement',
    screen: { app: 'Your editor', url: 'localhost — one session, one window',
      title: 'Agent session', sub: 'You type. It answers. Nothing else is running.',
      code: ['> add a login page', '', 'Working…', 'Done — here is the component.'] } },

  { id: '03', mode: 'ui',
    vo: 'It works. It works well. And it only works while you are sitting there.',
    cap: 'Only while you are there',
    screen: { app: 'Your editor', url: 'localhost — one session, one window',
      title: 'Agent session', sub: 'Close the window and the process ends with it.',
      code: ['> add a login page', '', 'Working…', 'Done — here is the component.', '', '^C'] } },

  { id: '04', mode: 'info',
    vo: 'Close the laptop and the agent stops existing.',
    cap: 'It stops existing',
    info: { tpl: 'statement', data: { text: 'Close the laptop and the agent stops existing.', hi: 'stops existing' } } },

  { id: '05', mode: 'info',
    vo: 'That is not an agent doing your work. That is you, doing your work, faster.',
    cap: 'Faster, but still you',
    info: { tpl: 'twocard', data: {
      left: { title: 'What you have', items: ['a very fast assistant', 'that needs you present'] },
      right: { title: 'What you wanted', items: ['work that happens', 'while you do something else'] } } } },

  { id: '06', mode: 'info',
    vo: 'Three capabilities are missing, and none of them is intelligence.',
    cap: 'Three things are missing',
    info: { tpl: 'checks', data: { title: 'A system that runs without you needs', items: [
      'Somewhere to keep track of what it is doing',
      'A way to talk to you, in both directions',
      'A process that is running when you are not there' ] } } },

  { id: '07', mode: 'info',
    vo: 'The first: somewhere to keep track of what it is doing.',
    cap: 'One · a place to track',
    info: { tpl: 'twocard', data: {
      left: { title: 'Today', items: ['the chat scrollback', 'gone when the session ends'] },
      right: { title: 'Needed', items: ['a task board it can read', 'and write to'] } } } },

  { id: '08', mode: 'info',
    vo: 'Not in its context window, and not in a chat history that scrolls away.',
    cap: 'Not the scrollback',
    info: { tpl: 'statement', data: { text: 'A context window is memory that ends. A board is memory that stays.', hi: 'memory that stays' } } },

  { id: '09', mode: 'info',
    vo: 'The second: a way to talk to you, in both directions.',
    cap: 'Two · a two-way line',
    info: { tpl: 'twocard', data: {
      left: { title: 'You → agent', items: ['new instructions', 'from wherever you are'] },
      right: { title: 'Agent → you', items: ['what it did', 'and when it is blocked'] } } } },

  { id: '10', mode: 'info',
    vo: 'You tell it what to do. It tells you what happened, or that it is blocked.',
    cap: 'Both directions, or neither',
    info: { tpl: 'statement', data: { text: 'One direction is a command line. Two is a colleague.', hi: 'Two is a colleague' } } },

  { id: '11', mode: 'info',
    vo: 'The third: a process that is running when you are not there.',
    cap: 'Three · something awake',
    info: { tpl: 'bignum', data: {
      left: { big: '24', lab: 'hours it should be reachable' },
      sep: 'versus',
      right: { big: '0', lab: 'hours your laptop is open at 3am' } } } },

  { id: '12', mode: 'info',
    vo: 'Four services supply those three.',
    cap: 'Four services',
    info: { tpl: 'fourparts', data: { title: 'Four places', parts: [
      'Notion — the task board',
      'Slack — the two-way line',
      'GitHub — where the work lands',
      'Your deployment — the process that stays up' ] } } },

  { id: '13', mode: 'info',
    vo: 'Notion is the task board: what it is doing, and what it did.',
    cap: 'Notion · the board',
    info: { tpl: 'screen', data: { title: 'Notion — the task board', lines: [
      { k: 'Tracks', v: 'one row per task, with a status' },
      { k: 'Survives', v: 'the session ending' } ] } } },

  { id: '14', mode: 'info',
    vo: 'Slack is the two-way line: your instructions in, its reports out.',
    cap: 'Slack · the line',
    info: { tpl: 'screen', data: { title: 'Slack — the conversation', lines: [
      { k: 'In', v: 'you ask, from your phone if you like' },
      { k: 'Out', v: 'it reports, or says it is stuck' } ] } } },

  { id: '15', mode: 'info',
    vo: 'GitHub is where the work lands, as commits and pull requests you can read.',
    cap: 'GitHub · the workshop',
    info: { tpl: 'screen', data: { title: 'GitHub — where work lands', lines: [
      { k: 'Produces', v: 'commits and pull requests' },
      { k: 'Lets you', v: 'read, question, approve or refuse' } ] } } },

  { id: '16', mode: 'info',
    vo: 'Your deployment is the process that stays up.',
    cap: 'Your deployment · the body',
    info: { tpl: 'screen', data: { title: 'Your deployment — the body', lines: [
      { k: 'Runs', v: 'the agent itself, all day' },
      { k: 'Receives', v: 'everything the other three send' } ] } } },

  { id: '17', mode: 'info',
    vo: 'You already have that last one. It is whatever your project is deployed on today.',
    cap: 'You already have it',
    info: { tpl: 'statement', data: { text: 'Railway, Render, Vercel, Fly — whichever you already use.', hi: 'already use' } } },

  // ── CHECKPOINT: nothing drawn, nothing spoken. Pause → ask → feedback → resume. ──
  { id: '18', mode: 'checkpoint',
    quiz: {
      stem: 'Your agent answers correctly every time you open the project and type a prompt. Which of the three capabilities does it have?',
      options: [
        'Somewhere to track its work',
        'A two-way line to you',
        'A process running when you are not there',
        'None of them',
      ],
      answer: 3,
      correctNote: 'Correct — and that is why connecting one service never feels like enough. While the only way to reach it is to open the project, you are personally doing all three jobs.',
      explain: 'It has none of them, which surprises people because the setup clearly works. Look at what happens when you walk away: the task history disappears with the session, so there is no tracking; nothing can reach you, and you cannot reach it, without opening the editor, so there is no two-way line; and the process itself is your laptop, so nothing is running at all. Answering well while you watch is not the same as having any of the three.',
    } },

  { id: '19', mode: 'info',
    vo: 'None of the four is the point. The loop between them is the point.',
    cap: 'The loop is the point',
    info: { tpl: 'statement', data: { text: 'None of the four is the point. The loop between them is.', hi: 'The loop' } } },

  { id: '20', mode: 'ui',
    vo: 'Here is the whole thing in one sentence.',
    cap: 'The premise',
    screen: { app: 'Module 14', url: 'the one sentence this module builds toward',
      title: 'You stop opening the project and chatting with it.',
      rows: [
        { k: 'You ask', v: 'in Slack' },
        { k: 'It works', v: 'in the background' },
        { k: 'It tracks itself', v: 'in Notion' },
        { k: 'It comes back', v: 'when it is done, or stuck', hl: true } ] } },

  { id: '21', mode: 'info',
    vo: 'You ask in Slack. It works in the background. It tracks itself in Notion.',
    cap: 'Ask · work · track',
    info: { tpl: 'checks', data: { items: [
      'You ask in Slack',
      'It works in the background',
      'It tracks itself in Notion' ] } } },

  { id: '22', mode: 'info',
    vo: 'And it comes back to you when it is done, or when it is stuck.',
    cap: 'And it reports back',
    info: { tpl: 'checks', data: { items: [
      'You ask in Slack',
      'It works in the background',
      'It tracks itself in Notion',
      'It comes back when it is done, or stuck' ] } } },

  { id: '23', mode: 'card',
    vo: 'Which of the three is your setup missing right now?',
    card: { small: 'Before the next video', big: 'Which of the three is your setup missing?',
      sub: 'Track · talk both ways · stay awake' } },
];

module.exports.title = 'Why a Chat Window Isn\'t Enough';
// No art, no cutouts, no i2v in this format — movement comes from the renderer.
module.exports.animateIds = [];
