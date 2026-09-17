'use strict';
/*
 * beats.js — "Module 14 Assignment — Connect Your Own Project" (the assignment guide video).
 * Companion to: Module 14 - Assignment (Connect Your Own Project).docx
 *
 * TECHNICAL HOW-TO FORMAT, same as videos 1-7: no protagonist, walkthrough.html renderer.
 * Its job is NOT to re-teach the steps — videos 3-6 did that. It is to show the learner what the
 * assignment asks for, what evidence to capture at each part, and how it is marked, so nobody
 * finishes the work and then loses marks for not having screenshotted the one thing that proves it.
 */

module.exports = [
  { id: '01', mode: 'card',
    vo: 'The assignment is the same work, on a project of your own.',
    card: { small: 'Module 14 · Assignment', big: 'Connect your own project.',
      sub: 'Seven parts · about two hours · evidence at every step' } },

  { id: '02', mode: 'info',
    vo: 'One sentence tells you when you are done.',
    cap: 'The test of done',
    info: { tpl: 'statement', data: { text: 'You ask in Slack. A card, a pull request, and a reply come back.', hi: 'come back' } } },

  { id: '03', mode: 'info',
    vo: 'And you never open an editor to make it happen.',
    cap: 'Without opening an editor',
    info: { tpl: 'statement', data: { text: 'Without opening an editor, on a laptop you have closed.', hi: 'you have closed' } } },

  { id: '04', mode: 'ui',
    vo: 'Six things to have ready before part one.',
    cap: 'Before you start',
    screen: { app: 'Assignment', url: 'before you start',
      title: 'Have these six ready',
      rows: [
        { k: 'Notion', v: 'a page you will share with an integration' },
        { k: 'Slack', v: 'permission to install an app — ask your admin today' },
        { k: 'GitHub', v: 'a scratch repo you will let an agent change' },
        { k: 'A deployment', v: 'anything already live — you are not making a new one', hl: true },
        { k: 'A test channel', v: 'not #general' },
        { k: '.env', v: 'already listed in .gitignore' } ] } },

  { id: '05', mode: 'info',
    vo: 'Missing one of those is the usual reason this takes an evening instead of two hours.',
    cap: 'Ask your admin today',
    info: { tpl: 'statement', data: { text: 'Slack admin approval is the one that costs you a day.', hi: 'costs you a day' } } },

  { id: '06', mode: 'ui',
    vo: 'Parts one to five are the four connections, exactly as the videos taught them.',
    cap: 'Parts 1 to 5',
    screen: { app: 'Assignment', url: 'the seven parts',
      title: 'What you build',
      rows: [
        { k: 'Part 1', v: 'Notion board, shared under Connections' },
        { k: 'Part 2', v: 'Slack outbound: scopes, install, invite' },
        { k: 'Part 3', v: 'Slack inbound: events, challenge, signature' },
        { k: 'Part 4', v: 'GitHub: fine-grained token and a webhook' },
        { k: 'Part 5', v: 'Your deployment: variables, address, check-in loop' } ] } },

  { id: '07', mode: 'ui',
    vo: 'Part six is the one that counts for most. Prove the loop, end to end.',
    cap: 'Part 6 · prove it',
    screen: { app: 'Assignment', url: 'part 6',
      title: 'Prove the loop',
      rows: [
        { k: 'Ask', v: 'in Slack, for a small real change' },
        { k: 'A card appears', v: 'in Notion, and its status moves' },
        { k: 'A pull request opens', v: 'on GitHub' },
        { k: 'The agent replies', v: 'in your thread', hl: true },
        { k: 'You merge it', v: 'the agent proposes, you decide' } ] } },

  { id: '08', mode: 'info',
    vo: 'That part alone is worth twenty-four of the hundred marks.',
    cap: '24 of 100',
    info: { tpl: 'bignum', data: {
      left: { big: '24', lab: 'marks for the loop' },
      sep: 'of',
      right: { big: '100', lab: 'total' } } } },

  { id: '09', mode: 'ui',
    vo: 'Part seven asks you to break it, four times, on purpose.',
    cap: 'Part 7 · break it',
    screen: { app: 'Assignment', url: 'part 7',
      title: 'Break it on purpose',
      rows: [
        { k: 'Remove it from Connections', v: '404 object_not_found' },
        { k: 'Point the URL at localhost', v: 'verification fails' },
        { k: 'Change the secret on one side', v: '403 on every delivery' },
        { k: 'Search your repo for token prefixes', v: 'ideally nothing' } ] } },

  { id: '10', mode: 'info',
    vo: 'An integration you cannot break on demand is one you cannot debug under pressure.',
    cap: 'Why you break it',
    info: { tpl: 'statement', data: { text: 'What you can break on demand, you can debug under pressure.', hi: 'debug under pressure' } } },

  { id: '11', mode: 'ui',
    vo: 'Capture evidence as you go, not at the end.',
    cap: 'Evidence A to G',
    screen: { app: 'Assignment', url: 'what to capture',
      title: 'Evidence, one per part',
      rows: [
        { k: 'A', v: 'Connections panel + your four columns' },
        { k: 'B', v: 'Bot Token Scopes + the invite confirmation' },
        { k: 'C', v: 'Your challenge handler and signature check' },
        { k: 'D', v: 'Token permissions: Contents read/write, one repo' },
        { k: 'E', v: 'Request URL verified + a log line arriving' },
        { k: 'F', v: 'The Slack thread, the card, the pull request' },
        { k: 'G', v: 'Your four-row table of errors and fixes' } ] } },

  { id: '12', mode: 'info',
    vo: 'People lose marks for not screenshotting the thing that proves it, having done the work.',
    cap: 'Capture as you go',
    info: { tpl: 'statement', data: { text: 'Do the work, then fail to prove it — the commonest way to lose marks.', hi: 'fail to prove it' } } },

  // ── CHECKPOINT ──
  { id: '13', mode: 'checkpoint',
    quiz: {
      stem: 'You finish every part, everything works, and your submission includes a screenshot of your host\'s variables page with the Slack bot token readable. What happens?',
      options: [
        'Full marks — the work is complete',
        'A small deduction for presentation',
        'The submission is returned unmarked, and you rotate that token today',
        'Nothing, because it is only a test workspace',
      ],
      answer: 2,
      correctNote: 'Correct. A visible credential voids the submission regardless of how good the work is — and the right response is not embarrassment, it is rotating the token the same day, because it is now in a file you have sent to somebody.',
      explain: 'It is returned unmarked, and the token has to be rotated. This is not a presentation rule, it is the whole point of the module\'s last lesson: a credential that leaves your machine is burned, whether it reached a public repo or a marker\'s inbox. "Only a test workspace" is the reasoning that ends with a real one leaking — and a token that can post to Slack and commit to a repo is not harmless even in a test. Mask every value in every screenshot, and if one slips through, rotate it rather than hoping.',
    } },

  { id: '14', mode: 'ui',
    vo: 'One hundred marks, weighted toward the thing that actually proves the system runs.',
    cap: 'How it is marked',
    screen: { app: 'Assignment', url: 'marking',
      title: '100 marks',
      rows: [
        { k: 'The loop proven (part 6)', v: '24', hl: true },
        { k: 'Slack inbound (part 3)', v: '14' },
        { k: 'GitHub two jobs (part 4)', v: '14' },
        { k: 'Deployment (part 5)', v: '14' },
        { k: 'Notion + Slack outbound', v: '24' },
        { k: 'Broke it and fixed it (part 7)', v: '10' },
        { k: 'A live credential anywhere', v: '−100', tag: 'voids it', tagTone: 'bad' } ] } },

  { id: '15', mode: 'info',
    vo: 'If the loop never fully works, parts one to five and seven are still worth seventy-six.',
    cap: 'If it does not all work',
    info: { tpl: 'statement', data: { text: 'A careful debugging story beats a bare claim that it worked.', hi: 'beats a bare claim' } } },

  { id: '16', mode: 'info',
    vo: 'So submit what you built and what you diagnosed, either way.',
    cap: 'Submit either way',
    info: { tpl: 'checks', data: { title: 'Hand in', items: [
      'Links to your repo and your deployed app',
      'Evidence A to G, each with a one-line caption',
      'What broke and how I found it — the real story',
      'What you would and would not let this agent do' ] } } },

  { id: '17', mode: 'card',
    vo: 'Two hours, your own project, and an agent that works while you do something else.',
    card: { small: 'Module 14 · Assignment', big: 'Your project. Two hours. One loop.',
      sub: 'Everything you need is in videos 1 to 7' } },
];

module.exports.title = 'Module 14 Assignment — Connect Your Own Project';
module.exports.animateIds = [];
