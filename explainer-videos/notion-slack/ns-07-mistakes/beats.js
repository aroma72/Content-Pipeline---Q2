'use strict';
/*
 * beats.js — "The Four Mistakes" (Module 14, video 7 of 7).
 * Script: ../Scripts/ns-07-the-four-mistakes.md  ·  Guide §7
 *
 * TECHNICAL HOW-TO, error-first. Placed LAST on purpose: the learner has now built the thing, so
 * these land as recognition rather than warning. Every error string appears exactly as it arrives.
 *
 * The teaching is diagnostic, not encyclopaedic: each mistake has a TELL you can read in seconds,
 * and the checkpoint rewards the move that matters — what is working tells you what is not broken.
 */

module.exports = [
  { id: '01', mode: 'card',
    vo: 'Four mistakes. Each has a tell.',
    card: { small: 'Module 14 · Video 7', big: 'The four mistakes',
      sub: 'Name the tell before you open any code' } },

  { id: '02', mode: 'info',
    vo: 'Learn the tells and you stop debugging by guesswork.',
    cap: 'Four tells',
    info: { tpl: 'fourparts', data: { title: 'What goes wrong', parts: [
      'The credential is set, but nothing was shared',
      'The webhook points somewhere unreachable',
      'The secret is set in one place, not both',
      'A real key ended up in a tracked file' ] } } },

  { id: '03', mode: 'card',
    vo: 'One — the credential is set, but the thing was never shared.',
    card: { small: 'Mistake one', big: 'The key opens nothing.',
      sub: 'Notion Connections · Slack /invite' } },

  { id: '04', mode: 'ui',
    vo: 'Your Notion call returns object not found, on a database you are looking straight at.',
    cap: 'On a database you can see',
    screen: { app: 'Your editor  ·  and Notion', url: 'the 404 that lies to you',
      title: 'It says the database does not exist',
      code: [
        '{ "object": "error", "status": 404,',
        '  "code": "object_not_found",',
        '  "message": "Could not find database with ID ...' ] } },

  { id: '05', mode: 'info',
    vo: 'Four hundred and four. Object not found.',
    cap: 'The exact string',
    info: { tpl: 'statement', data: { text: '404 · object_not_found', hi: 'object_not_found' } } },

  { id: '06', mode: 'info',
    vo: 'The credential is necessary. It is not sufficient.',
    cap: 'Necessary, not sufficient',
    info: { tpl: 'statement', data: { text: 'The credential is necessary. It is not sufficient.', hi: 'not sufficient' } } },

  { id: '07', mode: 'info',
    vo: 'Notion needs Connections. Slack needs an invite.',
    cap: 'The same rule, twice',
    info: { tpl: 'twocard', data: {
      left: { title: 'Notion', items: ['the key is not access', '··· → Connections → add it'] },
      right: { title: 'Slack', items: ['the token is not presence', '/invite @your-bot'] } } } },

  { id: '08', mode: 'info',
    vo: 'Both ask you to say: let this integration see this specific thing.',
    cap: 'Say it explicitly',
    info: { tpl: 'statement', data: { text: 'Let this integration see this specific thing.', hi: 'this specific thing' } } },

  { id: '09', mode: 'card',
    vo: 'Two — you pointed a webhook at your own laptop.',
    card: { small: 'Mistake two', big: 'It points somewhere unreachable.',
      sub: 'localhost means "this machine" — theirs, not yours' } },

  { id: '10', mode: 'ui',
    vo: 'Slack refuses to verify localhost, and the error says nothing useful.',
    cap: 'Verification just fails',
    screen: { app: 'Slack API', url: 'Event Subscriptions',
      title: 'Your URL didn\'t respond with the value of the challenge parameter',
      rows: [ { k: 'Request URL', v: 'http://localhost:8000/slack/events', hl: true, tag: 'unreachable', tagTone: 'bad' } ] } },

  { id: '11', mode: 'info',
    vo: 'Because Slack is calling you, from the outside, and that address means nothing to them.',
    cap: 'They call you, not the reverse',
    info: { tpl: 'twocard', data: {
      left: { title: 'Outbound', items: ['you call Slack', 'works from anywhere, even a laptop'] },
      right: { title: 'Inbound', items: ['Slack calls you', 'needs an address the internet can reach'] } } } },

  { id: '12', mode: 'info',
    vo: 'Outbound works from anywhere. Inbound needs a public address.',
    cap: 'The asymmetry',
    info: { tpl: 'statement', data: { text: 'Outbound works from anywhere. Inbound needs an address.', hi: 'needs an address' } } },

  // ── CHECKPOINT ──
  { id: '13', mode: 'checkpoint',
    quiz: {
      stem: 'Your agent posts to Slack perfectly, but has never once received a message. Which mistake is this?',
      options: [
        'The credential is set but the channel was never shared',
        'The webhook points somewhere the outside world cannot reach',
        'The signing secret is set in only one place',
        'A key was committed and has been revoked',
      ],
      answer: 1,
      correctNote: 'Exactly — and the tell is the asymmetry. Sending working proves the token and scopes are fine, because you are the one calling Slack. Receiving nothing points at reachability.',
      explain: 'It is the reachability one, and the giveaway is that sending works. If the credential were unshared or the bot uninvited you could not post at all, so the thing that is working rules that out. A half-set signing secret would produce requests that arrive and get rejected — 403s in your logs — not silence. A revoked key would break sending too, loudly and immediately. Silence in one direction while the other is healthy nearly always means nothing is listening at a public address.',
    } },

  { id: '14', mode: 'card',
    vo: 'Three — the secret is set in one place, not both.',
    card: { small: 'Mistake three', big: 'Set in one place, not both.',
      sub: 'And nothing can tell you the strings differ' } },

  { id: '15', mode: 'ui',
    vo: 'Every delivery comes back four oh three, and both dashboards look perfectly fine.',
    cap: 'A column of 403s',
    screen: { app: 'GitHub', url: 'Settings — Webhooks — Recent Deliveries',
      title: 'Recent deliveries',
      rows: [
        { k: 'push', v: '403', tag: 'rejected', tagTone: 'bad' },
        { k: 'push', v: '403', tag: 'rejected', tagTone: 'bad' },
        { k: 'Secret', v: 'set', tag: 'looks fine', tagTone: '' } ] } },

  { id: '16', mode: 'info',
    vo: 'Nothing can show you that two strings differ. Only the signature check knows.',
    cap: 'Only the check knows',
    info: { tpl: 'twocard', data: {
      left: { title: 'The dashboard', items: ['shows "set"', 'never shows the value'] },
      right: { title: 'Your server', items: ['shows "set"', 'never shows the value'] } } } },

  { id: '17', mode: 'info',
    vo: 'Set it in the dashboard and as the environment variable. Then confirm it really got set.',
    cap: 'Both places, then confirm',
    info: { tpl: 'checks', data: { title: 'When a webhook 403s', items: [
      'Is the env var actually set on the host?',
      'Does it match what is typed into the dashboard, character for character?' ] } } },

  { id: '18', mode: 'card',
    vo: 'Four — a real key ended up in a tracked file.',
    card: { small: 'Mistake four', big: 'A key in a tracked file.',
      sub: 'And git history outlives the fix' } },

  { id: '19', mode: 'ui',
    vo: 'You push, and by morning the token is dead.',
    cap: 'Revoked before you noticed',
    screen: { app: 'Your inbox', url: 'automated notice',
      title: 'A credential in your repository was disabled',
      rows: [
        { k: 'Detected', v: 'in a pushed commit' },
        { k: 'Action taken', v: 'the token was revoked', hl: true, tag: 'already done', tagTone: 'bad' } ] } },

  { id: '20', mode: 'info',
    vo: 'That is the good outcome. Someone else could have found it first.',
    cap: 'The good outcome',
    info: { tpl: 'statement', data: { text: 'That is the good outcome. Someone else could have found it first.', hi: 'the good outcome' } } },

  { id: '21', mode: 'info',
    vo: 'Only dot env — and dot env is gitignored.',
    cap: 'Only .env',
    info: { tpl: 'checks', data: { title: 'Where secrets live', items: [
      '.env, locally',
      '.env listed in .gitignore',
      'the host\'s variables page, in production' ] } } },

  { id: '22', mode: 'info',
    vo: 'It stays in git history after you fix the file, so rotate the key too.',
    cap: 'Rotate, do not just delete',
    info: { tpl: 'statement', data: { text: 'Deleting the line does not remove it from history. Rotate.', hi: 'Rotate' } } },

  { id: '23', mode: 'info',
    vo: 'Key without access, localhost, half-set secret, committed key.',
    cap: 'The four tells',
    info: { tpl: 'fourparts', data: { title: 'Name the tell', parts: [
      '404 on something you can see → never shared',
      'Sending works, nothing arrives → unreachable address',
      '403 on every delivery → secret set in one place',
      'A token dies overnight → it was committed' ] } } },

  { id: '24', mode: 'card',
    vo: 'Name the tell before you open the code.',
    card: { small: 'Module 14 complete', big: 'Name the tell before you open the code.',
      sub: 'You now have all four connections running' } },
];

module.exports.title = 'The Four Mistakes';
module.exports.animateIds = [];
