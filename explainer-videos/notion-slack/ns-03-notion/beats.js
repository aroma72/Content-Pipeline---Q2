'use strict';
/*
 * beats.js — "Notion, The Task Board" (Module 14, video 3 of 7).
 * Script: ../Scripts/ns-03-notion-operating-area.md  ·  Guide §3, every step
 *
 * TECHNICAL HOW-TO WALKTHROUGH. Every screen is a re-creation, not a capture: nothing real can leak,
 * every label is proofread-able, and a vendor moving a button is a one-line fix rather than a re-shoot.
 * Renderer: animation/walkthrough.html.
 *
 * The worked example is the same one used in video 2 and carried through 4–6: task "Add login page".
 * Step counter runs 1/5 … 5/5 across: integration → board → columns → Connections → the two values.
 */

module.exports = [
  { id: '01', mode: 'card',
    vo: 'Five steps, and the agent has a board it can read and write.',
    card: { small: 'Module 14 · Video 3', big: 'Notion — the task board',
      sub: 'Where the agent keeps track of its own work' } },

  { id: '02', mode: 'info',
    vo: 'We are building the place your agent keeps track of its own work.',
    cap: 'The operating area',
    info: { tpl: 'statement', data: { text: 'Not the agent\'s memory. A board you can both read.', hi: 'you can both read' } } },

  { id: '03', mode: 'ui',
    vo: 'Go to notion dot so slash my dash integrations, and click New integration.',
    cap: 'Step 1 · create the integration',
    screen: { app: 'Notion', url: 'notion.so/my-integrations', stepper: '1 / 5',
      title: 'My integrations', sub: 'An integration is the agent\'s own identity in your workspace.',
      button: { label: '+ New integration', hl: true }, cursor: { x: 250, y: 330 } } },

  { id: '04', mode: 'ui',
    vo: 'Name it after the agent, pick the workspace, and submit.',
    cap: 'Name it after the job',
    screen: { app: 'Notion', url: 'notion.so/my-integrations/new', stepper: '1 / 5',
      title: 'New integration',
      rows: [
        { k: 'Name', v: 'Project Agent', hl: true },
        { k: 'Associated workspace', v: 'your workspace' },
        { k: 'Type', v: 'Internal' } ],
      button: { label: 'Submit' } } },

  { id: '05', mode: 'ui',
    vo: 'Copy the Internal Integration Secret. This is the agent\'s key — treat it like a password.',
    cap: 'The secret · treat it like a password',
    screen: { app: 'Notion', url: 'notion.so/my-integrations/project-agent', stepper: '1 / 5',
      title: 'Project Agent', sub: 'Secrets tab',
      rows: [
        { k: 'Internal Integration Secret', v: 'ntn_••••••••••••••••••••', hl: true, tag: 'copy', tagTone: '' },
        { k: 'Goes into', v: 'NOTION_API_KEY' } ] } },

  { id: '06', mode: 'card',
    vo: 'One down. The next two are the board itself.',
    card: { small: 'Step 1 of 5 done', big: 'Now the board.', sub: 'Four columns, and the names matter' } },

  { id: '07', mode: 'ui',
    vo: 'Make the database that will be the task board.',
    cap: 'Step 2 · the board',
    screen: { app: 'Notion', url: 'your workspace — Agent tasks', stepper: '2 / 5',
      title: 'Agent tasks', sub: 'A database. Empty, for now.',
      rows: [ { k: 'Rows', v: 'none yet' } ] } },

  { id: '08', mode: 'ui',
    vo: 'Four columns, and the names matter: Name, Status, Priority, Notes.',
    cap: 'Step 3 · four columns',
    screen: { app: 'Notion', url: 'your workspace — Agent tasks', stepper: '3 / 5',
      title: 'Agent tasks', sub: 'The agent reads and writes these by name.',
      rows: [
        { k: 'Name', v: 'title', tag: 'required', tagTone: '' },
        { k: 'Status', v: 'select' },
        { k: 'Priority', v: 'select' },
        { k: 'Notes', v: 'rich text' } ] } },

  { id: '09', mode: 'ui',
    vo: 'Status is a select — to do, in progress, done, blocked.',
    cap: 'Status · four options',
    screen: { app: 'Notion', url: 'your workspace — Agent tasks', stepper: '3 / 5',
      title: 'Status', sub: 'How the agent tells you where a task has got to.',
      rows: [
        { k: 'Option', v: 'To Do' },
        { k: 'Option', v: 'In Progress' },
        { k: 'Option', v: 'Done' },
        { k: 'Option', v: 'Blocked', hl: true, tag: 'needs you', tagTone: 'bad' } ] } },

  { id: '10', mode: 'ui',
    vo: 'Priority is a select too — low, medium, high — so it knows what to pick up first.',
    cap: 'Priority · what to pick up first',
    screen: { app: 'Notion', url: 'your workspace — Agent tasks', stepper: '3 / 5',
      title: 'Priority',
      rows: [ { k: 'Option', v: 'Low' }, { k: 'Option', v: 'Medium' }, { k: 'Option', v: 'High', hl: true } ] } },

  { id: '11', mode: 'ui',
    vo: 'Notes is where the agent writes its own log as it works.',
    cap: 'Notes · its own log',
    screen: { app: 'Notion', url: 'your workspace — Agent tasks', stepper: '3 / 5',
      title: 'Notes', sub: 'Rich text. The agent appends to it as it goes.',
      rows: [ { k: 'Example', v: 'started — writing the form component', hl: true } ] } },

  { id: '12', mode: 'card',
    vo: 'Now the step everybody misses.',
    card: { small: 'Step 4 of 5', big: 'The step everybody misses.',
      sub: 'The key alone opens nothing' } },

  { id: '13', mode: 'ui',
    vo: 'Open the board, click the three dots, top right.',
    cap: 'Step 4 · the three dots',
    screen: { app: 'Notion', url: 'your workspace — Agent tasks', stepper: '4 / 5',
      title: 'Agent tasks',
      menu: { items: [
        { label: 'Copy link' }, { label: 'Duplicate' },
        { label: 'Connections', hl: true }, { label: 'Move to' } ] },
      cursor: { x: 1290, y: 245 } } },

  { id: '14', mode: 'ui',
    vo: 'Choose Connections, and add the integration by name.',
    cap: 'Add it by name',
    screen: { app: 'Notion', url: 'your workspace — Agent tasks', stepper: '4 / 5',
      title: 'Connections', sub: 'Search for the integration you created in step 1.',
      rows: [ { k: 'Search', v: 'Project Agent', hl: true, tag: 'add', tagTone: 'ok' } ] } },

  { id: '15', mode: 'ui',
    vo: 'The key alone does nothing. Notion also needs you to share the page with it.',
    cap: 'Credential, then access',
    screen: { app: 'Notion', url: 'your workspace — Agent tasks', stepper: '4 / 5',
      title: 'Project Agent will have access to this page',
      rows: [
        { k: 'Has the key', v: 'yes — since step 1', tag: 'not enough', tagTone: 'bad' },
        { k: 'Has access', v: 'only after this confirmation', hl: true, tag: 'now', tagTone: 'ok' } ],
      button: { label: 'Confirm', hl: true } } },

  { id: '16', mode: 'info',
    vo: 'Same as inviting a person. Having a key is not the same as being let in.',
    cap: 'Necessary, not sufficient',
    info: { tpl: 'statement', data: { text: 'Having a key is not the same as being let in.', hi: 'being let in' } } },

  // ── CHECKPOINT: nothing drawn, nothing spoken. Pause → ask → feedback → resume. ──
  { id: '17', mode: 'checkpoint',
    quiz: {
      stem: 'You created the integration, copied the secret, and your code returns a 404 saying the database does not exist — but you are looking straight at it in your browser. What is wrong?',
      options: [
        'The secret was copied incorrectly',
        'The database was never shared with the integration under Connections',
        'The database ID includes the view ID',
        'Notion needs a paid plan for API access',
      ],
      answer: 1,
      correctNote: 'Exactly — and note how the error lies to you. It says "does not exist", which sends people hunting for a typo in the ID, when the real meaning is "exists, but not for you".',
      explain: 'It is the sharing step, and the reason it catches everyone is that you can see the database perfectly well — but you are signed in as you, and the integration is not you. It has its own identity, with access to nothing, until a human explicitly shares a page with it. A mistyped secret would fail as an authentication error, not a missing object; a view ID in the database ID gives a different and clearer error; and none of this requires a paid plan.',
    } },

  { id: '18', mode: 'ui',
    vo: 'Last, the database ID — the thirty-two characters in the URL, before the question mark.',
    cap: 'Step 5 · the database ID',
    screen: { app: 'Notion', url: 'notion.so/workspace/8f3c2a17b4e94d0aa1c6e2f70b9d4c85?v=2b7e…', stepper: '5 / 5',
      title: 'The ID is in the address bar',
      rows: [ { k: 'Database ID', v: '8f3c2a17b4e94d0aa1c6e2f70b9d4c85', hl: true, tag: 'this one', tagTone: 'ok' } ] } },

  { id: '19', mode: 'ui',
    vo: 'The part after v equals is the view, not the board.',
    cap: 'Not the view ID',
    screen: { app: 'Notion', url: 'notion.so/workspace/8f3c2a17b4e94d0aa1c6e2f70b9d4c85?v=2b7e…', stepper: '5 / 5',
      title: 'Two IDs, one address bar',
      rows: [
        { k: 'Before the ?', v: '8f3c2a17b4e94d0aa1c6e2f70b9d4c85', tag: 'the board', tagTone: 'ok' },
        { k: 'After ?v=', v: '2b7e…', tag: 'the view — wrong', tagTone: 'bad' } ] } },

  { id: '20', mode: 'info',
    vo: 'Two values go to the agent: the secret, and the database ID.',
    cap: 'Two values, that is all',
    info: { tpl: 'checks', data: { title: 'Hand the agent', items: [
      'NOTION_API_KEY — the integration secret',
      'NOTION_GOALS_DB_ID — the 32-character database ID' ] } } },

  { id: '21', mode: 'ui',
    vo: 'Test it by having the agent create one card.',
    cap: 'Query, then create',
    screen: { app: 'Your editor', url: 'the create-or-update shape',
      title: 'One query, then create or update',
      code: [
        'existing = notion.databases.query(',
        '    database_id=DB_ID,',
        '    filter={"property": "Name", "title": {"equals": title}})',
        '',
        'notion.pages.create(...) if not existing["results"] else notion.pages.update(...)'
      ] } },

  { id: '22', mode: 'ui',
    vo: 'If it appears on your board, the connection is real.',
    cap: 'A card nobody typed',
    screen: { app: 'Notion', url: 'your workspace — Agent tasks',
      title: 'Agent tasks',
      rows: [
        { k: 'Name', v: 'Add login page', hl: true },
        { k: 'Status', v: 'In Progress', tag: 'by the agent', tagTone: 'ok' },
        { k: 'Notes', v: 'started — writing the form component' } ] } },

  { id: '23', mode: 'info',
    vo: 'That card was not typed by a person. That is the whole point.',
    cap: 'Not typed by a person',
    info: { tpl: 'statement', data: { text: 'That card was not typed by a person.', hi: 'not typed by a person' } } },

  { id: '24', mode: 'card',
    vo: 'Your turn. Build the board, share it, and make one card appear.',
    card: { small: 'Your turn', big: 'Build it, share it, make one card appear.',
      sub: 'Then video 4 gives the agent a voice' } },
];

module.exports.title = 'Notion — The Task Board';
module.exports.animateIds = [];
