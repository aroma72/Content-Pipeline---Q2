'use strict';
/*
 * beats.js — "Slack, Speak Then Listen" (Module 14, video 4 of 7).
 * Script: ../Scripts/ns-04-slack-both-directions.md  ·  Guide §4a AND §4b
 *
 * TECHNICAL HOW-TO WALKTHROUGH, and the longest video in the module. §4a and §4b are merged because
 * speaking and listening are ONE app configured in one sitting — split across two videos, the learner
 * is left holding a half-built Slack app.
 *
 * The deliberate hand-off: the Request URL (beat 19) cannot be filled in until video 6 supplies a
 * public address. Beats 20-21 say so out loud and tell them to leave the tab open, rather than
 * stranding anyone on a form they cannot complete. Video 6 beat 11 pays it off with the green tick.
 */

module.exports = [
  { id: '01', mode: 'card',
    vo: 'Two halves: let it speak, then let it listen.',
    card: { small: 'Module 14 · Video 4', big: 'Slack — speak, then listen',
      sub: 'One app, two halves, one sitting' } },

  { id: '02', mode: 'info',
    vo: 'Most people do the first half and stop, and then wonder why it never replies.',
    cap: 'Why it never replies',
    info: { tpl: 'statement', data: { text: 'Most people build the speaking half and stop.', hi: 'and stop' } } },

  { id: '03', mode: 'card',
    vo: 'Half one — outbound.',
    card: { small: 'Half one of two', big: 'Outbound — let it speak.', sub: 'Scopes · install · token · invite' } },

  { id: '04', mode: 'ui',
    vo: 'Go to a p i dot slack dot com slash apps, and click Create New App.',
    cap: 'Step 1 · create the app',
    screen: { app: 'Slack API', url: 'api.slack.com/apps', stepper: '1 / 9',
      title: 'Your apps', sub: 'An app is the agent\'s identity in your workspace.',
      button: { label: 'Create New App', hl: true }, cursor: { x: 250, y: 330 } } },

  { id: '05', mode: 'ui',
    vo: 'From scratch, name it, pick the workspace.',
    cap: 'From scratch',
    screen: { app: 'Slack API', url: 'api.slack.com/apps/new', stepper: '1 / 9',
      title: 'Create an app',
      rows: [
        { k: 'From scratch', v: 'chosen', hl: true },
        { k: 'App Name', v: 'Project Agent' },
        { k: 'Workspace', v: 'your workspace' } ] } },

  { id: '06', mode: 'ui',
    vo: 'Open OAuth and Permissions, and scroll to Bot Token Scopes.',
    cap: 'Step 2 · Bot Token Scopes',
    screen: { app: 'Slack API', url: 'OAuth & Permissions', stepper: '2 / 9',
      title: 'Bot Token Scopes', sub: 'What the agent is allowed to do, anywhere.',
      rows: [ { k: 'Scopes', v: 'none yet' } ],
      button: { label: 'Add an OAuth Scope', hl: true } } },

  { id: '07', mode: 'ui',
    vo: 'Add chat colon write — that is permission to send messages.',
    cap: 'chat:write',
    screen: { app: 'Slack API', url: 'OAuth & Permissions', stepper: '2 / 9',
      title: 'Bot Token Scopes',
      rows: [ { k: 'chat:write', v: 'send messages', hl: true, tag: 'added', tagTone: 'ok' } ] } },

  { id: '08', mode: 'ui',
    vo: 'Add app underscore mentions colon read — so it sees when it is at-mentioned.',
    cap: 'app_mentions:read',
    screen: { app: 'Slack API', url: 'OAuth & Permissions', stepper: '2 / 9',
      title: 'Bot Token Scopes',
      rows: [
        { k: 'chat:write', v: 'send messages', tag: 'added', tagTone: 'ok' },
        { k: 'app_mentions:read', v: 'see @mentions of itself', hl: true, tag: 'added', tagTone: 'ok' } ] } },

  { id: '09', mode: 'ui',
    vo: 'Add channels colon history — so it can read the channel it is watching.',
    cap: 'channels:history',
    screen: { app: 'Slack API', url: 'OAuth & Permissions', stepper: '2 / 9',
      title: 'Bot Token Scopes',
      rows: [
        { k: 'chat:write', v: 'send messages', tag: 'added', tagTone: 'ok' },
        { k: 'app_mentions:read', v: 'see @mentions of itself', tag: 'added', tagTone: 'ok' },
        { k: 'channels:history', v: 'read messages in its channel', hl: true, tag: 'added', tagTone: 'ok' } ] } },

  { id: '10', mode: 'ui',
    vo: 'Scroll up, Install to Workspace, and approve.',
    cap: 'Step 3 · install',
    screen: { app: 'Slack API', url: 'OAuth & Permissions', stepper: '3 / 9',
      title: 'Install to Workspace', sub: 'Read what you are agreeing to — it lists exactly these scopes.',
      button: { label: 'Allow', hl: true } } },

  { id: '11', mode: 'ui',
    vo: 'Copy the Bot User OAuth Token — the one starting x o x b.',
    cap: 'Step 4 · the bot token',
    screen: { app: 'Slack API', url: 'OAuth & Permissions', stepper: '4 / 9',
      title: 'Bot User OAuth Token',
      rows: [
        { k: 'Token', v: 'xoxb-••••••••••••••••', hl: true, tag: 'copy', tagTone: '' },
        { k: 'Goes into', v: 'SLACK_BOT_TOKEN' } ] } },

  { id: '12', mode: 'card',
    vo: 'The step everybody misses, again.',
    card: { small: 'Step 5 of 9', big: 'A token does not put it in the room.',
      sub: 'Same rule as Notion\'s Connections' } },

  { id: '13', mode: 'ui',
    vo: 'In Slack itself, go to the channel and type slash invite, then your bot\'s name.',
    cap: 'Step 5 · invite the bot',
    screen: { app: 'Slack', url: '#project-agent', stepper: '5 / 9',
      title: 'The channel', sub: 'Type it in the composer, in Slack — not in the app settings.',
      rows: [ { k: 'Composer', v: '/invite @project-agent', hl: true } ] } },

  { id: '14', mode: 'ui',
    vo: 'A token does not put the bot in a channel. Somebody has to invite it.',
    cap: 'Now it is a member',
    screen: { app: 'Slack', url: '#project-agent', stepper: '5 / 9',
      title: 'Project Agent was added to #project-agent',
      rows: [
        { k: 'Has the token', v: 'yes — since step 4', tag: 'not enough', tagTone: 'bad' },
        { k: 'Is in the channel', v: 'only after /invite', hl: true, tag: 'now', tagTone: 'ok' } ] } },

  { id: '15', mode: 'info',
    vo: 'Same rule as Notion\'s Connections. The credential is necessary. It is not sufficient.',
    cap: 'The repeating pattern',
    info: { tpl: 'twocard', data: {
      left: { title: 'Notion', items: ['key from the integration', 'then share via Connections'] },
      right: { title: 'Slack', items: ['token from the app', 'then /invite to the channel'] } } } },

  { id: '16', mode: 'ui',
    vo: 'Right-click the channel, view channel details, copy the Channel ID from the bottom.',
    cap: 'Step 6 · the channel ID',
    screen: { app: 'Slack', url: '#project-agent — channel details', stepper: '6 / 9',
      title: 'Channel details', sub: 'Scroll to the very bottom.',
      rows: [ { k: 'Channel ID', v: 'C0A1B2C3D4E', hl: true, tag: 'copy', tagTone: '' },
              { k: 'Goes into', v: 'SLACK_CHANNEL_ID' } ] } },

  // ── CHECKPOINT: at the seam between the two halves ──
  { id: '17', mode: 'checkpoint',
    quiz: {
      stem: 'Your bot has chat:write, the app is installed, and the token is correct — but posting to your channel fails with not_in_channel. What is missing?',
      options: [
        'The channels:history scope',
        'The bot was never invited to that channel',
        'The app needs reinstalling after adding scopes',
        'The channel ID is wrong',
      ],
      answer: 1,
      correctNote: 'Exactly — and the error name says it plainly once you read it as a statement of fact rather than a failure: the bot is not in the channel. Scopes say what it may do anywhere; membership says where.',
      explain: 'The bot is not a member of that channel. This is the most common Slack error, and it catches people because everything else is genuinely correct — the token works, the scope is granted, the app is installed. But a scope is a permission, not a presence: chat:write means "may send messages", not "is in this room". channels:history governs reading, not posting. Reinstalling matters when you add a scope, which fails differently (missing_scope). And a wrong channel ID gives channel_not_found — the error is telling you it found the channel fine and your bot simply is not in it.',
    } },

  { id: '18', mode: 'card',
    vo: 'Half two — inbound. This is what makes it two-way.',
    card: { small: 'Half two of two', big: 'Inbound — let it listen.',
      sub: 'This is what makes it a colleague' } },

  { id: '19', mode: 'ui',
    vo: 'Event Subscriptions, toggle on — and here you need something we do not have yet.',
    cap: 'Step 7 · Event Subscriptions',
    screen: { app: 'Slack API', url: 'Event Subscriptions', stepper: '7 / 9',
      title: 'Enable Events', sub: 'Slack will send events to a URL you give it.',
      rows: [ { k: 'Request URL', v: '(empty — needs a public address)', hl: true, tag: 'video 6', tagTone: 'bad' } ] } },

  { id: '20', mode: 'info',
    vo: 'The Request URL has to be a real, public address that is already running your code.',
    cap: 'It must be reachable',
    info: { tpl: 'statement', data: { text: 'Outbound works from a laptop. Inbound needs a public address.', hi: 'a public address' } } },

  { id: '21', mode: 'info',
    vo: 'That comes in video six. Leave this tab open and come back to it.',
    cap: 'Leave the tab open',
    info: { tpl: 'checks', data: { title: 'You can finish everything except this', items: [
      'Scopes, install, token, invite, channel ID — done now',
      'Request URL — comes back in video 6' ] } } },

  { id: '22', mode: 'ui',
    vo: 'Under Subscribe to bot events, add app underscore mention.',
    cap: 'Step 8 · the events',
    screen: { app: 'Slack API', url: 'Event Subscriptions', stepper: '8 / 9',
      title: 'Subscribe to bot events',
      rows: [ { k: 'app_mention', v: 'someone @mentions the agent', hl: true, tag: 'added', tagTone: 'ok' } ] } },

  { id: '23', mode: 'ui',
    vo: 'And message dot channels, so it reacts to any message in a channel it is in.',
    cap: 'And message.channels',
    screen: { app: 'Slack API', url: 'Event Subscriptions', stepper: '8 / 9',
      title: 'Subscribe to bot events',
      rows: [
        { k: 'app_mention', v: 'someone @mentions the agent', tag: 'added', tagTone: 'ok' },
        { k: 'message.channels', v: 'any message in its channels', hl: true, tag: 'added', tagTone: 'ok' } ] } },

  { id: '24', mode: 'ui',
    vo: 'The moment you paste the URL, Slack sends a one-time challenge.',
    cap: 'The challenge',
    screen: { app: 'Slack API', url: 'Event Subscriptions', stepper: '8 / 9',
      title: 'Verifying your Request URL',
      rows: [
        { k: 'Slack sends', v: '{ "type": "url_verification", "challenge": "3eZ…" }' },
        { k: 'Your server must', v: 'echo the challenge value back', hl: true } ] } },

  { id: '25', mode: 'ui',
    vo: 'Your server has to echo that challenge value back, or the URL never verifies.',
    cap: 'Three lines',
    screen: { app: 'Your editor', url: 'app/api/slack_events.py',
      title: 'The challenge echo',
      code: [
        'if payload["type"] == "url_verification":',
        '    return {"challenge": payload["challenge"]}' ] } },

  { id: '26', mode: 'ui',
    vo: 'Last value: Basic Information, copy the Signing Secret.',
    cap: 'Step 9 · the signing secret',
    screen: { app: 'Slack API', url: 'Basic Information', stepper: '9 / 9',
      title: 'App Credentials',
      rows: [
        { k: 'Signing Secret', v: '••••••••••••••••', hl: true, tag: 'copy', tagTone: '' },
        { k: 'Goes into', v: 'SLACK_SIGNING_SECRET' } ] } },

  { id: '27', mode: 'ui',
    vo: 'That secret is how your server proves a request really came from Slack.',
    cap: 'Proving it is really Slack',
    screen: { app: 'Your editor', url: 'app/api/slack_events.py',
      title: 'The signature check',
      code: [
        'base = f"v0:{timestamp}:{body}"',
        'expected = "v0=" + hmac.new(SIGNING_SECRET, base, sha256).hexdigest()',
        'if not hmac.compare_digest(expected, signature):',
        '    raise HTTPException(403)' ] } },

  { id: '28', mode: 'info',
    vo: 'Anyone can post to a public URL. The signature is what makes it trustworthy.',
    cap: 'Why the signature exists',
    info: { tpl: 'statement', data: { text: 'Anyone can POST to a public URL.', hi: 'Anyone' } } },

  { id: '29', mode: 'info',
    vo: 'Four values: bot token, signing secret, channel ID — and the bot, invited.',
    cap: 'What you now have',
    info: { tpl: 'checks', data: { title: 'From this video', items: [
      'SLACK_BOT_TOKEN',
      'SLACK_SIGNING_SECRET',
      'SLACK_CHANNEL_ID',
      'The bot, invited to the channel' ] } } },

  { id: '30', mode: 'ui',
    vo: 'Outbound is one call: chat dot postMessage with your token and channel.',
    cap: 'Speaking is one call',
    screen: { app: 'Your editor', url: 'sending a message',
      title: 'chat.postMessage',
      code: [
        'requests.post("https://slack.com/api/chat.postMessage",',
        '  headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}"},',
        '  json={"channel": SLACK_CHANNEL_ID, "text": "login page is up, PR #42"})' ] } },

  { id: '31', mode: 'info',
    vo: 'Speak, then listen. Do both, and you have a colleague instead of a printer.',
    cap: 'A colleague, not a printer',
    info: { tpl: 'statement', data: { text: 'Speak, then listen. Both, or it is a printer.', hi: 'Both' } } },

  { id: '32', mode: 'card',
    vo: 'Your turn. Get the three values and invite the bot; the URL waits for video six.',
    card: { small: 'Your turn', big: 'Three values, and the invite.',
      sub: 'The Request URL waits for video 6' } },
];

module.exports.title = 'Slack — Speak, Then Listen';
module.exports.animateIds = [];
