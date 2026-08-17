'use strict';
/**
 * The tick — one cycle of the harness.
 *
 *   poll Slack -> create Notion tickets -> dispatch queued tickets -> report back
 *
 * Modelled on the orchestration harness: no daemon reacting to pushes, just a
 * loop that reconciles the outside world with the queue. The Notion ticket is the
 * unit of work and its page id is the context key; everything about one video
 * hangs off it, so there is exactly one place a human looks to see what happened.
 *
 * Two invariants worth stating because both were tempting to skip:
 *
 * 1. Only one tick runs at a time. Slack's search returns the same matches until
 *    a ticket exists to dedupe against, so two overlapping ticks would both see a
 *    fresh mention and both start the same paid render.
 *
 * 2. Spending above the budget stops and ASKS. Aroma's rule is that a video over
 *    the ceiling needs explicit permission, and silence is never permission — so
 *    an unanswered question leaves the ticket Blocked forever rather than
 *    eventually proceeding.
 */

const path = require('path');
const { config } = require('./config');
const slack = require('./slack');
const notion = require('./notion');
const { parseRequest } = require('./parse');

const queue = require('../../orchestrator/lib/queue');
const spine = require('../../orchestrator/lib/spine');
const state = require('../../orchestrator/lib/state');

let ticking = false;
let lastTick = null;

const log = (msg) => console.log(`[tick] ${msg}`);

// Markers stashed in the ticket's Notes. Notion has no hidden metadata, and a
// separate local database would not survive a Railway redeploy, so the ticket
// carries its own context.
const MARK = {
  slack: (channel, threadTs) => `[slack:${channel}/${threadTs}]`,
  approval: (usd) => `[approval:${usd}]`,
};
const readMark = (notes, name) => {
  const m = String(notes || '').match(new RegExp(`\\[${name}:([^\\]]+)\\]`));
  return m ? m[1] : null;
};

/** Words that count as a human granting permission to overspend. */
const APPROVE_RE = /\b(approve[d]?|approval|yes|go ahead|proceed|do it|ok(ay)?)\b/i;
const DENY_RE = /\b(no|deny|denied|stop|cancel|don'?t)\b/i;

// ─── step 1: Slack -> tickets ────────────────────────────────────────────────

async function intakeFromSlack(report) {
  const mentions = await slack.searchMentions({ limit: 20 });
  report.mentionsSeen = mentions.length;

  for (const m of mentions) {
    // Never act on a bot's post — above all our own. The bot's replies quote the
    // request back ("Queued: make a video about X"), so a loop here means one
    // request becomes an unbounded series of paid renders. Checked three ways
    // because search labels humans and bots differently.
    if (m.botId) continue;
    if (config.slack.botUserId && m.user === config.slack.botUserId) continue;
    if (m.username && /content[_ ]?queen|drawing[_ ]?room/i.test(m.username)) continue;

    const dedupeKey = `slack-${m.channel}-${m.ts}`;
    const parsed = parseRequest(m.text);

    if (!parsed.ok) {
      // Only answer a request we understood but could not complete. Replying to
      // every unrelated mention would make the bot insufferable in a busy channel.
      if (parsed.reason === 'no_series' || parsed.reason === 'no_topic') {
        const already = await notion.findByDedupeKey(dedupeKey);
        if (!already) {
          await slack.postMessage({ channel: m.channel, threadTs: m.threadTs, text: parsed.question });
          // Recorded so the question is asked once, not once per tick — but
          // parked as Blocked, never Not Started. A half-formed request is not
          // work: left queued, the dispatcher picks it up as a real video and
          // immediately blocks it again, which is just noise on the ticket.
          await notion.createTicket({
            title: `Needs detail: ${m.text.slice(0, 60)}`,
            series: '', source: 'slack', dedupeKey, status: 'Blocked',
            notes: `${MARK.slack(m.channel, m.threadTs)} awaiting clarification`,
          });
          report.asked++;
        }
      }
      continue;
    }

    const ticket = await notion.createTicket({
      title: parsed.topic,
      series: parsed.series,
      source: 'slack',
      dedupeKey,
      notes: MARK.slack(m.channel, m.threadTs),
    });

    if (ticket.alreadyExisted) continue;

    report.created++;
    await slack.postMessage({
      channel: m.channel,
      threadTs: m.threadTs,
      text: `Queued *${parsed.topic}* (series \`${parsed.series}\`).\nTracking it here: ${ticket.url}`,
    });
  }
}

// ─── step 2: blocked tickets waiting on permission ───────────────────────────

/**
 * A ticket that asked to overspend resumes only on an explicit human yes.
 * Checked before dispatch so an approval granted between ticks is picked up.
 */
async function resolveApprovals(report) {
  const blocked = await notion.queuedTickets({ status: 'Blocked' }).catch(() => []);
  for (const t of blocked) {
    const askedUsd = Number(readMark(t.notes, 'approval'));
    const slackRef = readMark(t.notes, 'slack');
    if (!askedUsd || !slackRef) continue;

    const [channel, threadTs] = slackRef.split('/');
    const replies = await slack.threadReplies({ channel, threadTs });

    // Only a human's reply counts. The bot's own question contains "approve".
    const human = replies.filter((r) => !r.botId && r.user !== config.slack.botUserId);
    const decision = human.reverse().find((r) => APPROVE_RE.test(r.text) || DENY_RE.test(r.text));
    if (!decision) continue;

    if (DENY_RE.test(decision.text) && !APPROVE_RE.test(decision.text)) {
      await notion.update(t.id, { status: 'Done', notes: `${t.notes} — declined by human` });
      await slack.postMessage({ channel, threadTs, text: 'Understood — cancelled, nothing was spent.' });
      report.declined++;
      continue;
    }

    if (askedUsd > config.pipeline.maxApprovableUsd) {
      await slack.postMessage({
        channel, threadTs,
        text: `That needs $${askedUsd}, above the $${config.pipeline.maxApprovableUsd} hard ceiling. `
            + `Raise PIPELINE_MAX_APPROVABLE_USD if you really want it.`,
      });
      continue;
    }

    report.approved++;
    await notion.update(t.id, { status: 'Not Started', notes: `${t.notes} [granted:${askedUsd}]` });
  }
}

// ─── step 3: dispatch ────────────────────────────────────────────────────────

async function dispatch(ticket, report) {
  const slackRef = readMark(ticket.notes, 'slack');
  const [channel, threadTs] = slackRef ? slackRef.split('/') : [config.slack.defaultChannel, null];
  const say = (text) => slack.postMessage({ channel, threadTs, text }).catch(() => {});

  if (!ticket.series) {
    await notion.update(ticket.id, { status: 'Blocked', notes: `${ticket.notes} — no series` });
    await say(`I need a series for *${ticket.title}* before I can build it.`);
    return;
  }

  // A granted approval raises the ceiling for this one video only.
  const granted = Number(readMark(ticket.notes, 'granted')) || null;
  const budgetUsd = granted || config.pipeline.budgetUsd;

  let item;
  try {
    item = queue.enqueue({ topic: ticket.title, series: ticket.series, source: 'manual', notes: `notion:${ticket.id}` });
  } catch (e) {
    // The spine's queue is append-only and rejects a duplicate id. A dispatch
    // that died partway leaves its item behind, so a plain failure here would
    // wedge that ticket permanently: every retry re-enqueues, re-fails, blocks.
    // Reclaim the orphan instead when it is genuinely not running.
    const existing = queue.get(`${ticket.series}/${queue.slugify(ticket.title)}`);
    if (existing && ['queued', 'failed'].includes(existing.status)) {
      item = existing;
      log(`reusing orphaned queue item ${existing.id} (${existing.status})`);
    } else {
      await notion.update(ticket.id, { status: 'Blocked', notes: `${ticket.notes} — ${e.message}` });
      await say(`Couldn't queue that: ${e.message}`);
      return;
    }
  }

  const st = state.create(item);
  await notion.update(ticket.id, { status: 'In Progress', sessionId: st.runId });
  await say(`Starting *${ticket.title}* — run \`${st.runId}\`.${config.pipeline.dryRun ? '\n_(dry run: nothing will be spent)_' : ''}`);
  report.dispatched++;

  let final;
  try {
    final = await spine.execute(item, {
      resumeState: st,
      budgetUsd,
      stopAfter: config.pipeline.stopAfter || null,
      dryRun: config.pipeline.dryRun,
      quiet: true,
    });
  } catch (e) {
    await notion.update(ticket.id, { status: 'Blocked', sessionId: '' });
    await notion.comment(ticket.id, `Run failed: ${e.message}`).catch(() => {});
    await say(`That run failed: ${e.message}`);
    return;
  }

  await report_result(final, ticket, say, report);
}

/** Turn a finished run into a ticket update, a Slack post, and maybe a question. */
async function report_result(final, ticket, say, report) {
  const produced = final.artifacts && final.artifacts.produce;
  const qa = final.artifacts && final.artifacts.qa;
  const qaScore = qa && (typeof qa.combined_score === 'number' ? qa.combined_score : qa.total);

  if (final.status !== 'done') {
    const stuck = Object.entries(final.stages || {})
      .find(([, s]) => s.status === 'failed' || s.status === 'blocked');
    const where = stuck ? stuck[0] : 'unknown';
    const why = (stuck && stuck[1].error) || 'no reason recorded';

    // The budget blocker is not a failure — it is the pipeline asking to spend.
    const overBudget = /costs ~\$([0-9.]+)/.exec(String(why));
    if (overBudget && config.pipeline.askAboveBudget) {
      const needUsd = Number(overBudget[1]);
      await notion.update(ticket.id, {
        status: 'Blocked',
        sessionId: '',
        notes: `${ticket.notes} ${MARK.approval(needUsd)}`,
      });
      await say(
        `*${ticket.title}* needs about *$${needUsd.toFixed(2)}*, over the $${config.pipeline.budgetUsd.toFixed(2)} limit.\n`
        + `Reply *approve* here and I'll build it. Nothing has been spent, and I won't proceed without a yes.`
      );
      report.askedApproval++;
      return;
    }

    await notion.update(ticket.id, { status: 'Blocked', sessionId: '' });
    await notion.comment(ticket.id, `Stopped at ${where}: ${String(why).slice(0, 1500)}`).catch(() => {});
    await say(`Stopped at *${where}*.\n\`\`\`${String(why).slice(0, 600)}\`\`\``);
    return;
  }

  const finalPath = produced && produced.finalPath;
  await notion.update(ticket.id, {
    status: 'Done',
    qaScore: typeof qaScore === 'number' ? qaScore : undefined,
  });

  const summary = `Done — *${ticket.title}*`
    + (typeof qaScore === 'number' ? `  ·  QA ${qaScore.toFixed(1)}/7.0` : '')
    + (config.pipeline.dryRun ? '\n_(dry run — no video was actually rendered)_' : '');

  await notion.comment(ticket.id, summary.replace(/\*/g, '')).catch(() => {});

  if (finalPath && !config.pipeline.dryRun) {
    const chan = readMark(ticket.notes, 'slack');
    const [channel, threadTs] = chan ? chan.split('/') : [config.slack.defaultChannel, null];
    await slack.uploadVideo({ channel, threadTs, filePath: finalPath, title: ticket.title, comment: summary });
  } else {
    await say(summary);
  }
  report.completed++;
}

// ─── the tick ────────────────────────────────────────────────────────────────

async function runTick({ trigger = 'timer' } = {}) {
  if (ticking) return { skipped: 'a tick is already running' };
  ticking = true;

  const report = {
    trigger, startedAt: new Date().toISOString(),
    mentionsSeen: 0, created: 0, asked: 0, approved: 0, declined: 0,
    dispatched: 0, completed: 0, askedApproval: 0, errors: [],
  };

  try {
    if (slack.isConfigured() && config.slack.userToken) {
      await intakeFromSlack(report).catch((e) => report.errors.push(`intake: ${e.message}`));
    }
    if (notion.isConfigured()) {
      await resolveApprovals(report).catch((e) => report.errors.push(`approvals: ${e.message}`));

      const queued = await notion.queuedTickets();
      report.queueDepth = queued.length;
      // One video per tick. A render is long and CPU-bound; starting several on
      // one Railway instance makes all of them slower than doing them in turn.
      if (queued.length) {
        // Keep the origin of the failure. "fetch failed" on its own names no
        // call site, and undici raises it identically for Slack, Notion and the
        // model API — three very different problems.
        await dispatch(queued[0], report).catch((e) => {
          const where = String(e.stack || '').split('\n')[1] || '';
          report.errors.push(`dispatch: ${e.message}${where ? ` @${where.trim()}` : ''}`);
          console.error('[tick] dispatch failed:', e);
        });
      }
    }
  } finally {
    ticking = false;
    report.finishedAt = new Date().toISOString();
    lastTick = report;
  }
  return report;
}

function startLoop() {
  const ms = config.tick.intervalMs;
  if (!ms) { console.log('[tick] loop disabled (TICK_INTERVAL_MS=0)'); return null; }
  console.log(`[tick] polling every ${Math.round(ms / 1000)}s`);
  return setInterval(() => {
    runTick({ trigger: 'timer' }).catch((e) => console.error('[tick]', e.message));
  }, ms);
}

module.exports = {
  runTick, startLoop, status: () => ({ ticking, lastTick }),
  // Exposed for tests. The spend gate is skipped under dryRun inside produce, so
  // the ask-for-permission path can only be exercised by handing report_result a
  // blocked run directly — otherwise it would need a real, paying run to verify.
  _internals: { report_result, readMark, MARK, APPROVE_RE, DENY_RE },
};
