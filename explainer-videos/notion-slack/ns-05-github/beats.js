'use strict';
/*
 * beats.js — "GitHub, Two Jobs" (Module 14, video 5 of 7).
 * Script: ../Scripts/ns-05-github-two-jobs.md  ·  Guide §5
 *
 * TECHNICAL HOW-TO WALKTHROUGH. The whole point is keeping the two jobs SEPARATE:
 *   job one — the workshop: a fine-grained token so the agent can commit and open PRs
 *   job two — the doorbell: a webhook so a repo event wakes it, instead of waiting for the clock
 * Blurred together, "connect GitHub" sounds like one more API key and the trigger half never gets built.
 *
 * Beat 22 deliberately reuses video 4's signature-check treatment, so the learner SEES the repeated
 * pattern rather than being told about it: a webhook is someone else's server calling yours, and the
 * secret is how you prove it is really them.
 */

module.exports = [
  { id: '01', mode: 'card',
    vo: 'GitHub does two jobs. Most people build one and miss the other.',
    card: { small: 'Module 14 · Video 5', big: 'GitHub — two jobs',
      sub: 'The workshop, and the doorbell' } },

  { id: '02', mode: 'info',
    vo: 'Job one is the workshop. Job two is the doorbell.',
    cap: 'Two jobs, kept apart',
    info: { tpl: 'twocard', data: {
      left: { title: 'The workshop', items: ['where the code lives', 'where commits and PRs land'] },
      right: { title: 'The doorbell', items: ['a webhook', 'wakes the agent on an event'] } } } },

  { id: '03', mode: 'card',
    vo: 'Job one — the workshop.',
    card: { small: 'Job one of two', big: 'The workshop.', sub: 'A token so it can commit like a person' } },

  { id: '04', mode: 'ui',
    vo: 'The agent\'s code lives in a repo, and it needs to commit like a person does.',
    cap: 'Where the code lives',
    screen: { app: 'GitHub', url: 'your-org/your-project',
      title: 'your-project', sub: 'The repo the agent works in.',
      rows: [ { k: 'Branch', v: 'main' }, { k: 'The agent will', v: 'commit, and open pull requests' } ] } },

  { id: '05', mode: 'ui',
    vo: 'Settings, Developer settings, Personal access tokens, Fine-grained.',
    cap: 'Step 1 · a fine-grained token',
    screen: { app: 'GitHub', url: 'github.com/settings/personal-access-tokens', stepper: '1 / 7',
      title: 'Fine-grained personal access tokens',
      sub: 'Fine-grained, not classic — it can be scoped to one repository.',
      button: { label: 'Generate new token', hl: true }, cursor: { x: 250, y: 360 } } },

  { id: '06', mode: 'ui',
    vo: 'Scope it to the one repository. Not all of them.',
    cap: 'Step 2 · one repo only',
    screen: { app: 'GitHub', url: 'new fine-grained token', stepper: '2 / 7',
      title: 'Repository access',
      rows: [
        { k: 'All repositories', v: 'no', tag: 'too much', tagTone: 'bad' },
        { k: 'Only select repositories', v: 'your-project', hl: true, tag: 'this', tagTone: 'ok' } ] } },

  { id: '07', mode: 'ui',
    vo: 'Grant Contents, read and write. That is what lets it commit.',
    cap: 'Step 3 · Contents read/write',
    screen: { app: 'GitHub', url: 'new fine-grained token', stepper: '3 / 7',
      title: 'Repository permissions',
      rows: [
        { k: 'Contents', v: 'Read and write', hl: true, tag: 'required', tagTone: 'ok' },
        { k: 'Everything else', v: 'leave as No access' } ] } },

  { id: '08', mode: 'info',
    vo: 'Fine-grained and one repo, so a leaked token cannot reach anything else.',
    cap: 'Blast radius of one repo',
    info: { tpl: 'statement', data: { text: 'Scope it to one repo, so a leak costs one repo.', hi: 'one repo' } } },

  { id: '09', mode: 'ui',
    vo: 'Copy the token. This is the credential that makes it a committer, not a reader.',
    cap: 'The token',
    screen: { app: 'GitHub', url: 'new fine-grained token', stepper: '3 / 7',
      title: 'Your new token',
      rows: [
        { k: 'Token', v: 'github_pat_••••••••••••', hl: true, tag: 'copy now', tagTone: '' },
        { k: 'Goes into', v: 'GITHUB_TOKEN' } ] } },

  { id: '10', mode: 'ui',
    vo: 'Now it can push commits and open pull requests on its own.',
    cap: 'It can open a PR',
    screen: { app: 'GitHub', url: 'your-org/your-project — pull requests',
      title: 'Add login page  #42', sub: 'opened by project-agent · 2 files changed',
      rows: [
        { k: 'Commits', v: '2' },
        { k: 'Status', v: 'Open — awaiting your review', hl: true } ] } },

  { id: '11', mode: 'info',
    vo: 'A pull request is the agent proposing. You still decide.',
    cap: 'It proposes. You decide.',
    info: { tpl: 'statement', data: { text: 'A pull request is the agent proposing. You still decide.', hi: 'You still decide' } } },

  { id: '12', mode: 'card',
    vo: 'Job two — the doorbell.',
    card: { small: 'Job two of two', big: 'The doorbell.', sub: 'So it reacts, instead of waiting for the clock' } },

  { id: '13', mode: 'info',
    vo: 'So far it only acts when you message it, or when the clock says so.',
    cap: 'Two triggers so far',
    info: { tpl: 'checks', data: { title: 'What can start the agent today', items: [
      'You message it in Slack',
      'The timer ticks over' ] } } },

  { id: '14', mode: 'ui',
    vo: 'A webhook adds a third trigger: something happened in the repo.',
    cap: 'Step 4 · a third trigger',
    screen: { app: 'GitHub', url: 'your-org/your-project — Settings', stepper: '4 / 7',
      title: 'Webhooks', sub: 'GitHub calls your server the moment something happens.',
      button: { label: 'Add webhook', hl: true }, cursor: { x: 250, y: 350 } } },

  { id: '15', mode: 'ui',
    vo: 'Repo, Settings, Webhooks, Add webhook.',
    cap: 'The webhook form',
    screen: { app: 'GitHub', url: 'Settings — Webhooks — Add webhook', stepper: '5 / 7',
      title: 'Add webhook',
      rows: [
        { k: 'Payload URL', v: '(empty)' },
        { k: 'Content type', v: '(empty)' },
        { k: 'Secret', v: '(empty)' } ] } },

  { id: '16', mode: 'ui',
    vo: 'Payload URL is your deployed app\'s address plus the endpoint.',
    cap: 'Step 5 · the payload URL',
    screen: { app: 'GitHub', url: 'Settings — Webhooks — Add webhook', stepper: '5 / 7',
      title: 'Payload URL',
      rows: [ { k: 'Payload URL', v: 'https://your-app.example.com/webhooks/github', hl: true } ] } },

  { id: '17', mode: 'ui',
    vo: 'Content type, application slash json.',
    cap: 'application/json',
    screen: { app: 'GitHub', url: 'Settings — Webhooks — Add webhook', stepper: '5 / 7',
      title: 'Content type',
      rows: [ { k: 'Content type', v: 'application/json', hl: true } ] } },

  { id: '18', mode: 'ui',
    vo: 'Secret: any string — and set the exact same string on your server.',
    cap: 'Step 6 · the secret, in BOTH places',
    screen: { app: 'GitHub  ·  and your host', url: 'the same string, twice', stepper: '6 / 7',
      title: 'One secret, two places',
      rows: [
        { k: 'GitHub — Secret', v: '••••••••••••', hl: true },
        { k: 'Host — GITHUB_WEBHOOK_SECRET', v: '••••••••••••', hl: true, tag: 'must match', tagTone: 'bad' } ] } },

  // ── CHECKPOINT ──
  { id: '19', mode: 'checkpoint',
    quiz: {
      stem: 'You added the webhook with a secret, deployed your server, and pushed an event — but the server rejects every delivery with a 403. What is almost certainly wrong?',
      options: [
        'The payload URL is wrong',
        'The secret in GitHub and the secret on your server do not match',
        'The token needs Contents write permission',
        'GitHub has not verified the webhook yet',
      ],
      answer: 1,
      correctNote: 'Right — and this one is nasty because both halves look correct in isolation. GitHub shows a secret is set; your server has a secret set. Neither dashboard can tell you they are different strings.',
      explain: 'The two secrets do not match. The signature check recomputes the HMAC from the secret on your server and compares it to the header GitHub sent — if the strings differ by one character, or the environment variable was never actually set on the host, every delivery fails and returns 403. A wrong payload URL gives no delivery at all rather than a rejected one; the token\'s Contents permission governs committing, which has nothing to do with inbound verification; and GitHub does not hold webhooks back for verification the way Slack does.',
    } },

  { id: '20', mode: 'ui',
    vo: 'Pick the events to fire on.',
    cap: 'Step 7 · which events',
    screen: { app: 'GitHub', url: 'Settings — Webhooks — Add webhook', stepper: '7 / 7',
      title: 'Which events would you like to trigger this webhook?',
      rows: [ { k: 'repository_invitation', v: 'the agent is added to a repo', hl: true, tag: 'ticked', tagTone: 'ok' } ] } },

  { id: '21', mode: 'info',
    vo: 'The real system listens for repository invitations, so it can accept being added to a repo on its own.',
    cap: 'Accepting its own invitations',
    info: { tpl: 'statement', data: { text: 'It can accept being added to a repo without a human clicking.', hi: 'without a human clicking' } } },

  { id: '22', mode: 'ui',
    vo: 'Your server checks the signature the same way it did for Slack.',
    cap: 'The same check as Slack',
    screen: { app: 'Your editor', url: 'app/routers/github_webhook.py',
      title: 'The signature check — again',
      code: [
        'expected = hmac.new(GITHUB_WEBHOOK_SECRET, body, sha256).hexdigest()',
        'if not hmac.compare_digest(signature, expected):',
        '    raise HTTPException(403)' ] } },

  { id: '23', mode: 'info',
    vo: 'A webhook is just someone else\'s server calling yours.',
    cap: 'What a webhook is',
    info: { tpl: 'statement', data: { text: 'A webhook is someone else\'s server calling yours.', hi: 'calling yours' } } },

  { id: '24', mode: 'info',
    vo: 'And the secret is how you prove it is really them.',
    cap: 'One idea, not two tricks',
    info: { tpl: 'twocard', data: {
      left: { title: 'Slack', items: ['signing secret', 'HMAC over timestamp and body'] },
      right: { title: 'GitHub', items: ['webhook secret', 'HMAC over the body'] } } } },

  { id: '25', mode: 'info',
    vo: 'Two jobs, two credentials: a token to act, a secret to be trusted.',
    cap: 'What you now have',
    info: { tpl: 'checks', data: { title: 'From this video', items: [
      'GITHUB_TOKEN — so it can commit and open PRs',
      'GITHUB_WEBHOOK_SECRET — so you can trust what arrives' ] } } },

  { id: '26', mode: 'card',
    vo: 'Your turn. Make the token, add the webhook, and set the secret in both places.',
    card: { small: 'Your turn', big: 'Token, webhook, secret — in both places.',
      sub: 'Video 6 gives it somewhere to run' } },
];

module.exports.title = 'GitHub — Two Jobs';
module.exports.animateIds = [];
