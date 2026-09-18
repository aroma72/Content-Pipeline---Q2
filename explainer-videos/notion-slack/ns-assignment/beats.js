'use strict';
/*
 * beats.js — "Module 14 Assignment — Connect Your Own Project" (the assignment guide video).
 * Companion to: Module 14 - Assignment (Connect Your Own Project).docx
 *
 * Rebuilt 2026-09-17 on Aroma's own three-part script, replacing the seven-part walkthrough:
 *   Part 1 — already done, but do it on your REAL project
 *   Part 2 — one Slack message; the agent does the work and reports on itself in assignment.md
 *   Part 3 — break it on purpose, and write reflection.md by hand
 *
 * TECHNICAL HOW-TO FORMAT, same as videos 1-7: no protagonist, walkthrough.html renderer.
 * Beat 10 carries the prompt verbatim so it can be screenshotted off the screen; it uses
 * `codeDense` (28px, the qa-frames floor) because the whole block has to fit on one slide.
 */

// Wrapped at 80 columns so it lands as eleven lines inside the window at 28px. If you edit the
// prompt, edit the same words in make-assignment-doc-v3.js — a learner copies one and is marked
// against the other.
const PROMPT = [
  "Add a footer to this project's homepage with my name, the project name,",
  'and the line "Built with Claude." Open a PR when it\'s done. Before opening',
  'the PR, write (or update) a file at the repo root called assignment.md',
  "covering this run. Use real values only, never placeholders: your bot/app's",
  "name and this project's name, the Slack channel (and workspace, if named)",
  "this came through, how many Notion databases you're connected to and which",
  'one you used, the exact title of the Notion card you created with a link to',
  'it, its full status history with timestamps (example: To Do, then In',
  'Progress, then Blocked, then In Progress, then Done), the task text as',
  "posted here, your polling or check-in interval, and the pull request's",
  'number/link. If any step fails, say so honestly instead of skipping it.',
];

module.exports = [
  { id: '01', mode: 'card',
    vo: 'Today I want to walk you through the Module fourteen assignment, and it is less scary than it looks.',
    card: { small: 'Module 14 · Assignment', big: 'Three parts. That is all this is.',
      sub: 'And the first one you have already done' } },

  { id: '02', mode: 'ui',
    vo: 'It really only comes down to three parts.',
    cap: 'The whole assignment',
    screen: { app: 'Assignment', url: 'three parts',
      title: 'What you are being asked for',
      rows: [
        { k: 'Part 1', v: 'Slack, Notion and GitHub connected', tag: 'done', tagTone: 'ok' },
        { k: 'Part 2', v: 'One message. The agent reports on itself', hl: true },
        { k: 'Part 3', v: 'Break it, and write down what happened' } ] } },

  { id: '03', mode: 'card',
    vo: 'Part one is basically done already.',
    card: { small: 'Part 1', big: 'Already done.',
      sub: 'If you followed the videos, tick it off' } },

  { id: '04', mode: 'ui',
    vo: 'If you sat through the videos and actually connected Slack, GitHub and Notion, with webhooks and polling, and your keys set up, you have finished this part.',
    cap: 'Part 1 · what it means',
    screen: { app: 'Assignment', url: 'part 1',
      title: 'You have this already',
      rows: [
        { k: 'Slack', v: 'app installed, bot invited, events arriving' },
        { k: 'Notion', v: 'integration added under Connections' },
        { k: 'GitHub', v: 'token and webhook, secrets matching' },
        { k: 'The loop', v: 'polling or a check-in interval, running' },
        { k: 'Your keys', v: 'in environment variables, nothing committed' } ] } },

  { id: '05', mode: 'info',
    vo: 'One thing to do differently this time. Do not build this on a throwaway test repo.',
    cap: 'The one change',
    info: { tpl: 'statement', data: { text: 'Do it on the project you actually work on.', hi: 'actually work on' } } },

  { id: '06', mode: 'info',
    vo: 'That is what makes this assignment real, rather than just a demo.',
    cap: 'Why it matters',
    info: { tpl: 'twocard', data: {
      left: { title: 'A scratch repo', items: ['Proves the wiring works', 'Tells you nothing about your own work'] },
      right: { title: 'Your real project', items: ['The same wiring', 'You find out whether you trust it'] } } } },

  { id: '07', mode: 'card',
    vo: 'Part two is easy, and it is only easy because part one is done.',
    card: { small: 'Part 2', big: 'One message.',
      sub: 'You never touch an editor' } },

  { id: '08', mode: 'ui',
    vo: 'You open Slack and send your agent one message. It picks it up the same way it picks up every other task, through the webhook you built.',
    cap: 'What happens next',
    screen: { app: 'Assignment', url: 'part 2',
      title: 'What the agent does',
      rows: [
        { k: 'Picks it up', v: 'through your webhook, as usual' },
        { k: 'Creates a card', v: 'in Notion, and moves it while it works' },
        { k: 'Opens a pull request', v: 'with the footer in it' },
        { k: 'Writes assignment.md', v: 'at the repo root, about this run', hl: true } ] } },

  { id: '09', mode: 'ui',
    vo: 'Here is the message. Screenshot this, or copy it out of the assignment document, swap in your own name, and send it to your agent exactly as written.',
    cap: 'Copy this, change only the name',
    screen: { app: 'Slack', url: 'send this to your agent',
      title: 'The message',
      code: PROMPT, codeDense: true } },

  { id: '10', mode: 'ui',
    vo: 'Everything in that file has to be a real value it actually observed. Never a placeholder.',
    cap: 'What assignment.md must contain',
    screen: { app: 'assignment.md', url: 'real values only',
      title: 'Written by the agent, not by you',
      rows: [
        { k: 'Names', v: 'your bot or app, and this project' },
        { k: 'Where it came from', v: 'the Slack channel, and workspace' },
        { k: 'Notion', v: 'how many databases, and which one' },
        { k: 'The card', v: 'title, link, status history with times', hl: true },
        { k: 'The task', v: 'the text exactly as you posted it' },
        { k: 'The run', v: 'the check-in interval, and the PR link' } ] } },

  { id: '11', mode: 'info',
    vo: 'And if a step fails, it should say so, instead of quietly skipping it.',
    cap: 'Honesty is the point',
    info: { tpl: 'statement', data: { text: 'An honest failure beats a tidy invention.', hi: 'tidy invention' } } },

  { id: '12', mode: 'info',
    vo: 'I kept the task itself deliberately simple. Every project has a homepage, and a footer needs no login and no database, so nobody gets stuck on a task that does not fit their setup.',
    cap: 'Why a footer',
    info: { tpl: 'statement', data: { text: 'A footer: no login, no database, nothing to get stuck on.', hi: 'nothing to get stuck on' } } },

  // ── CHECKPOINT ──
  { id: '13', mode: 'checkpoint',
    quiz: {
      stem: 'Your agent opens the pull request, but it could not read the Notion card back. So assignment.md lists a neat "To Do, In Progress, Done" with no timestamps — a sequence it worked out rather than observed. What should it have done instead?',
      options: [
        'Exactly that — the order is almost certainly right anyway',
        'Left the status history out quietly and reported everything else',
        'Said plainly that it could not retrieve the status history',
        'Held the pull request back until it could read the card',
      ],
      answer: 2,
      correctNote: 'Correct. The instruction is explicit: if any step fails, say so instead of skipping it. A named gap is useful information — it tells you exactly which permission is missing.',
      explain: 'It should say plainly that it could not retrieve the status history. This file exists for one reason: to show what actually happened, not what probably happened. A sequence the agent worked out looks identical on the page to one it observed, which is why a tidy history with no timestamps is marked as a failure rather than a formatting slip. Leaving it out quietly is the same problem in a quieter coat — the marker cannot tell a missing field from a missing permission. And holding the pull request back is worse than either: the work is finished, and it is the report that is incomplete.',
    } },

  { id: '14', mode: 'card',
    vo: 'Part three is where you break something on purpose.',
    card: { small: 'Part 3', big: 'Break it on purpose.',
      sub: 'Then write down what actually happened' } },

  { id: '15', mode: 'ui',
    vo: 'Go and break your own setup. Remove your Notion integration from Connections, or forget to invite your bot to the channel, and watch what error shows up.',
    cap: 'Pick one, and watch',
    screen: { app: 'Assignment', url: 'part 3',
      title: 'Break it, and read the error',
      rows: [
        { k: 'Remove it from Connections', v: '404 object_not_found' },
        { k: 'Forget the /invite', v: 'not_in_channel' },
        { k: 'Change one side of the secret', v: '403 on every delivery' },
        { k: 'Point the URL somewhere dead', v: 'nothing arrives at all' } ] } },

  { id: '16', mode: 'info',
    vo: 'Then write it down, by hand, in a file called reflection dot m d. What you did, the exact error you saw, and how you fixed it.',
    cap: 'reflection.md',
    info: { tpl: 'checks', data: { title: 'In your own words', items: [
      'What you broke, and why you picked that one',
      'The exact error text, copied out',
      'Where you looked first, and whether that was right',
      'How you fixed it' ] } } },

  { id: '17', mode: 'info',
    vo: 'This part I really do want in your own words. Claude was not there when it broke, so it cannot write this one honestly for you.',
    cap: 'Yours, not your agent’s',
    info: { tpl: 'statement', data: { text: 'Claude was not there when it broke.', hi: 'was not there' } } },

  { id: '18', mode: 'ui',
    vo: 'When you are done, just send me the link to your repo. I will be looking for three things.',
    cap: 'What to hand in',
    screen: { app: 'Assignment', url: 'hand in',
      title: 'Send one repo link',
      rows: [
        { k: 'Your working code', v: 'the footer, in a pull request or merged' },
        { k: 'assignment.md', v: 'written by your agent, real values' },
        { k: 'reflection.md', v: 'written by you, by hand', hl: true } ] } },

  { id: '19', mode: 'card',
    vo: 'And that is the whole assignment.',
    card: { small: 'Module 14 · Assignment', big: 'Three parts. One message. One honest write-up.',
      sub: 'Everything you need is in videos 1 to 7' } },
];

module.exports.title = 'Module 14 Assignment — Connect Your Own Project';
module.exports.animateIds = [];
