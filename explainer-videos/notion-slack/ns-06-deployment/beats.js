'use strict';
/*
 * beats.js — "Your Deployment, The Body" (Module 14, video 6 of 7).
 * Script: ../Scripts/ns-06-the-body-you-already-have.md  ·  Guide §6
 *
 * TECHNICAL HOW-TO WALKTHROUGH, deliberately PLATFORM-AGNOSTIC. The learner already has something
 * live — Railway, Render, Vercel, Fly. This video never tells anyone to set up a new host; it is
 * three things to do to the host they already run. Every screen is named by what it DOES ("the page
 * where you paste private values"), never by one vendor's layout, so a learner on Render does not
 * feel this video is for somebody else.
 *
 * Beat 11 is the payoff of video 4's hand-off: the Request URL that could not be filled in then,
 * verifying now with the green tick.
 */

module.exports = [
  { id: '01', mode: 'card',
    vo: 'You do not need a new host. You already have one.',
    card: { small: 'Module 14 · Video 6', big: 'Your deployment — the body',
      sub: 'Three things to do to what you already run' } },

  { id: '02', mode: 'info',
    vo: 'You have a project deployed somewhere — Railway, Render, Vercel, Fly. That is the body.',
    cap: 'Whichever you already use',
    info: { tpl: 'statement', data: { text: 'Railway, Render, Vercel, Fly — whichever you already use.', hi: 'already use' } } },

  { id: '03', mode: 'info',
    vo: 'Three things left to do to it, and only one is code.',
    cap: 'Three things, one is code',
    info: { tpl: 'checks', data: { title: 'What is left', items: [
      'Tell it the secrets',
      'Give Slack and GitHub your address',
      'Add a check-in loop' ] } } },

  { id: '04', mode: 'card',
    vo: 'One — tell it the secrets.',
    card: { small: 'Step 1 of 3', big: 'Tell it the secrets.', sub: 'Never typed into the code' } },

  { id: '05', mode: 'ui',
    vo: 'Every platform has one page for private values.',
    cap: 'The variables page',
    screen: { app: 'Your host', url: 'the page where private values are pasted', stepper: '1 / 3',
      title: 'Environment variables',
      sub: 'Called Variables, Environment, Config — every platform has one.',
      rows: [ { k: 'Currently', v: 'empty' } ] } },

  { id: '06', mode: 'ui',
    vo: 'Paste in everything you collected: the Notion key, the Slack tokens, the GitHub token.',
    cap: 'Everything from videos 3, 4 and 5',
    screen: { app: 'Your host', url: 'environment variables', stepper: '1 / 3',
      title: 'Environment variables',
      rows: [
        { k: 'NOTION_API_KEY', v: '••••••••' },
        { k: 'NOTION_GOALS_DB_ID', v: '••••••••' },
        { k: 'SLACK_BOT_TOKEN', v: '••••••••' },
        { k: 'SLACK_SIGNING_SECRET', v: '••••••••' },
        { k: 'SLACK_CHANNEL_ID', v: '••••••••' },
        { k: 'GITHUB_TOKEN', v: '••••••••' },
        { k: 'GITHUB_WEBHOOK_SECRET', v: '••••••••', hl: true, tag: 'same as GitHub', tagTone: 'bad' } ] } },

  { id: '07', mode: 'info',
    vo: 'Your code reads these by name. They are never typed into the code itself.',
    cap: 'Read by name, never written down',
    info: { tpl: 'statement', data: { text: 'Your code reads them by name. It never contains them.', hi: 'never contains them' } } },

  { id: '08', mode: 'card',
    vo: 'Two — give Slack and GitHub your address.',
    card: { small: 'Step 2 of 3', big: 'Give Slack and GitHub your address.',
      sub: 'This is the step that actually connects everything' } },

  { id: '09', mode: 'ui',
    vo: 'Copy your app\'s normal web address — the link you would send a person.',
    cap: 'Your ordinary public URL',
    screen: { app: 'Your host', url: 'https://your-app.example.com', stepper: '2 / 3',
      title: 'Your app is already at a public address',
      rows: [ { k: 'Public URL', v: 'https://your-app.example.com', hl: true, tag: 'copy', tagTone: '' } ] } },

  { id: '10', mode: 'ui',
    vo: 'Paste it into Slack\'s Event Subscriptions box, the tab you left open.',
    cap: 'The tab from video 4',
    screen: { app: 'Slack API', url: 'Event Subscriptions', stepper: '2 / 3',
      title: 'Request URL',
      rows: [ { k: 'Request URL', v: 'https://your-app.example.com/slack/events', hl: true } ] } },

  { id: '11', mode: 'ui',
    vo: 'Slack sends its challenge, and the URL verifies.',
    cap: 'Verified — the payoff from video 4',
    screen: { app: 'Slack API', url: 'Event Subscriptions', stepper: '2 / 3',
      title: 'Request URL',
      rows: [ { k: 'Request URL', v: 'https://your-app.example.com/slack/events', tag: 'Verified', tagTone: 'ok', hl: true } ] } },

  { id: '12', mode: 'ui',
    vo: 'Paste it into GitHub\'s webhook payload URL as well.',
    cap: 'And into GitHub',
    screen: { app: 'GitHub', url: 'Settings — Webhooks', stepper: '2 / 3',
      title: 'Payload URL',
      rows: [ { k: 'Payload URL', v: 'https://your-app.example.com/webhooks/github', hl: true } ] } },

  { id: '13', mode: 'info',
    vo: 'That one step is what actually connects everything.',
    cap: 'The step that connects it',
    info: { tpl: 'statement', data: { text: 'That one step is what actually connects everything.', hi: 'actually connects' } } },

  { id: '14', mode: 'info',
    vo: 'It is you telling Slack and GitHub: when something happens, call this app.',
    cap: 'When something happens, call this',
    info: { tpl: 'twocard', data: {
      left: { title: 'Before', items: ['they had nowhere to call', 'events went nowhere'] },
      right: { title: 'After', items: ['they call your app', 'the moment something happens'] } } } },

  // ── CHECKPOINT ──
  { id: '15', mode: 'checkpoint',
    quiz: {
      stem: 'You are setting up Slack\'s Event Subscriptions and you paste in http://localhost:8000/slack/events. Slack refuses to verify it. Why?',
      options: [
        'Slack requires HTTPS, so https://localhost:8000 would work',
        'Slack is calling your server from the internet and cannot reach an address that only exists on your laptop',
        'The endpoint path must be exactly /slack/events',
        'Event Subscriptions must be toggled on before the URL is accepted',
      ],
      answer: 1,
      correctNote: 'Exactly, and this is the concrete reason a deployment stops being optional the moment you want inbound events. Outbound calls work fine from a laptop — you are calling Slack. Inbound means Slack calls you.',
      explain: 'localhost means "this machine" — and the machine Slack is calling from is Slack\'s, not yours. Their servers resolve it to themselves, find nothing, and verification fails. Switching to https does not help, because the problem is reachability rather than the protocol; the path can be anything you like as long as your app serves it; and toggling Event Subscriptions is what produced the URL box in the first place. This is why you can post messages from your laptop all day but cannot receive a single one until the app lives at a public address.',
    } },

  { id: '16', mode: 'card',
    vo: 'Three — add a check-in loop.',
    card: { small: 'Step 3 of 3', big: 'Add a check-in loop.', sub: 'The only actual code change' } },

  { id: '17', mode: 'ui',
    vo: 'A few lines that run every minute and ask: is there anything new for me?',
    cap: 'One line, in either language',
    screen: { app: 'Your editor', url: 'the check-in loop',
      title: 'Ask every sixty seconds',
      code: [
        '# Python',
        'scheduler.add_job(run_session, "interval", seconds=60)',
        '',
        '// Node',
        'cron.schedule("* * * * *", runSession)' ] } },

  { id: '18', mode: 'info',
    vo: 'In Python that is one line. In Node, a cron library does the same.',
    cap: 'Either language, one line',
    info: { tpl: 'statement', data: { text: 'One line. That is the whole code change.', hi: 'One line' } } },

  { id: '19', mode: 'info',
    vo: 'This is what makes it check in on its own, instead of only reacting to you.',
    cap: 'Checking in on its own',
    info: { tpl: 'twocard', data: {
      left: { title: 'Webhooks', items: ['react the instant it fires'] },
      right: { title: 'The loop', items: ['catch anything a webhook missed', 'every sixty seconds'] } } } },

  { id: '20', mode: 'ui',
    vo: 'How to know it worked: open your logs, send a test message, watch it arrive.',
    cap: 'How to know it worked',
    screen: { app: 'Your host', url: 'logs',
      title: 'Logs',
      code: [
        '14:02:11  tick — polling Notion, Slack, GitHub',
        '14:02:11  slack event received: app_mention',
        '14:02:12  created Notion card: Add login page' ] } },

  { id: '21', mode: 'info',
    vo: 'Within a second or two. If nothing appears, nothing is listening.',
    cap: 'If nothing appears',
    info: { tpl: 'statement', data: { text: 'If nothing appears in the logs, nothing is listening.', hi: 'nothing is listening' } } },

  { id: '22', mode: 'ui',
    vo: 'One thing to watch: some free tiers fall asleep after a quiet period.',
    cap: 'Free tiers fall asleep',
    screen: { app: 'Your host', url: 'free tier behaviour',
      title: 'Instance spins down when idle',
      rows: [
        { k: 'Quiet for a while', v: 'the app sleeps' },
        { k: 'First message after', v: 'delayed until it wakes', hl: true, tag: 'expect this', tagTone: 'bad' } ] } },

  { id: '23', mode: 'info',
    vo: 'A sleeping app misses the message until it wakes, so expect a delay, or upgrade the tier.',
    cap: 'Expect it, or upgrade',
    info: { tpl: 'statement', data: { text: 'A sleeping app misses the message until it wakes.', hi: 'until it wakes' } } },

  { id: '24', mode: 'info',
    vo: 'Secrets in, address out, check in every minute.',
    cap: 'All three',
    info: { tpl: 'checks', data: { title: 'Done, on the host you already had', items: [
      'Secrets pasted into the variables page',
      'Your address given to Slack and GitHub',
      'A check-in loop every sixty seconds' ] } } },

  { id: '25', mode: 'card',
    vo: 'Your turn. Three steps on the host you already have, then send yourself a test message.',
    card: { small: 'Your turn', big: 'Three steps, then send yourself a test message.',
      sub: 'And watch the logs' } },
];

module.exports.title = 'Your Deployment — The Body';
module.exports.animateIds = [];
