'use strict';
/**
 * Notion — the work queue and the system of record.
 *
 * Follows the orchestration-harness model: the Notion ticket IS the unit of work,
 * and its page id is the context key that groups everything related to one video.
 * Work arriving from Slack gets a stub ticket immediately, so there is exactly one
 * place to look for "what is the agent doing".
 *
 * State lives in Notion rather than in a local SQLite file because Railway wipes
 * the container filesystem on every redeploy. A database that forgets every queued
 * job whenever the service restarts is worse than no database, and Notion is
 * already the thing a human looks at.
 */

const { config } = require('./config');

const API = 'https://api.notion.com/v1';
const VERSION = '2022-06-28';

const isConfigured = () => Boolean(config.notion.apiKey && config.notion.databaseId);

async function notionFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.notion.apiKey}`,
      'Notion-Version': VERSION,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.object === 'error') {
    throw new Error(`Notion ${options.method || 'GET'} ${path} -> ${res.status} ${body.code || ''} ${body.message || ''}`.trim());
  }
  return body;
}

/**
 * Notion rich_text. An empty string must become an EMPTY ARRAY, not an array
 * holding an empty string: `is_empty` is false for the latter, so a ticket
 * "cleared" that way stays invisible to the queue filter forever — released by
 * a failed run, but never picked up again.
 */
const text = (s) => {
  const v = String(s == null ? '' : s);
  return v ? [{ type: 'text', text: { content: v.slice(0, 1900) } }] : [];
};

/** Read a property back out of a page, tolerating the ones we never set. */
function readProps(page) {
  const p = page.properties || {};
  const title = (p.Deliverable && p.Deliverable.title || []).map((x) => x.plain_text).join('');
  const rich = (name) => ((p[name] && p[name].rich_text) || []).map((x) => x.plain_text).join('');
  return {
    id: page.id,
    url: page.url,
    title,
    status: (p.Status && p.Status.select && p.Status.select.name) || null,
    series: rich('Series'),
    notes: rich('Notes'),
    sessionId: rich('Agent Session ID'),
    source: (p.Source && p.Source.select && p.Source.select.name) || null,
  };
}

/**
 * Create the ticket for a piece of work.
 *
 * `dedupeKey` is written into Notes and searched before insert. The harness gets
 * this for free from a primary key on a deterministic event id; here the same
 * guarantee is bought with a query, because Notion has no unique constraint. It
 * matters: Slack search returns the same message on every tick until the marker
 * moves, so without this one mention becomes a video per tick, forever.
 */
async function createTicket({ title, series, notes, source, dedupeKey, status = 'Not Started' }) {
  const existing = dedupeKey ? await findByDedupeKey(dedupeKey) : null;
  if (existing) return { ...existing, alreadyExisted: true };

  const page = await notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: config.notion.databaseId },
      properties: {
        Deliverable: { title: text(title) },
        Status: { select: { name: status } },
        Series: { rich_text: text(series || '') },
        Notes: { rich_text: text([notes, dedupeKey ? `[key:${dedupeKey}]` : ''].filter(Boolean).join(' ')) },
        Source: { select: { name: source || 'manual' } },
      },
    }),
  });
  return { ...readProps(page), alreadyExisted: false };
}

/** Look for a ticket already carrying this key. */
async function findByDedupeKey(dedupeKey) {
  const body = await notionFetch(`/databases/${config.notion.databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: { property: 'Notes', rich_text: { contains: `[key:${dedupeKey}]` } },
      page_size: 1,
    }),
  });
  const hit = (body.results || [])[0];
  return hit ? readProps(hit) : null;
}

/**
 * Tickets in a given status with no session claimed.
 *
 * The empty-session condition is what stops a tick from picking up work another
 * tick is already running — the harness's "don't spawn a second session for the
 * same context" rule, enforced by the query rather than by hoping.
 */
async function queuedTickets({ status = 'Not Started' } = {}) {
  const body = await notionFetch(`/databases/${config.notion.databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: {
        and: [
          { property: 'Status', select: { equals: status } },
          { property: 'Agent Session ID', rich_text: { is_empty: true } },
        ],
      },
      page_size: 25,
    }),
  });
  return (body.results || []).map(readProps);
}

async function update(pageId, props) {
  const properties = {};
  if (props.status) properties.Status = { select: { name: props.status } };
  if (props.sessionId !== undefined) properties['Agent Session ID'] = { rich_text: text(props.sessionId) };
  if (props.videoUrl !== undefined) properties['Video URL'] = { url: props.videoUrl || null };
  if (props.qaScore !== undefined && props.qaScore !== null) properties['QA Score'] = { number: props.qaScore };
  if (props.notes !== undefined) properties.Notes = { rich_text: text(props.notes) };
  if (props.series !== undefined) properties.Series = { rich_text: text(props.series) };
  return notionFetch(`/pages/${pageId}`, { method: 'PATCH', body: JSON.stringify({ properties }) });
}

/**
 * Progress and results go on the ticket as comments, so the page reads as a log.
 *
 * The comment endpoint needs comment capabilities on the integration, which are
 * granted in Notion's UI and cannot be set through the API. When they are absent
 * every call 403s. Rather than lose the record — the run log is the whole point —
 * fall back to appending onto the Notes property, which only needs the update
 * capability the integration already has.
 */
async function comment(pageId, body) {
  try {
    return await notionFetch('/comments', {
      method: 'POST',
      body: JSON.stringify({ parent: { page_id: pageId }, rich_text: text(body) }),
    });
  } catch (e) {
    if (!/restricted_resource|unauthorized|403/i.test(e.message)) throw e;

    const page = await notionFetch(`/pages/${pageId}`);
    const current = ((page.properties && page.properties.Notes && page.properties.Notes.rich_text) || [])
      .map((x) => x.plain_text).join('');
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    return notionFetch(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        // Notes is capped at 2000 chars by Notion; keep the tail, which is the
        // most recent and most useful part of a run log.
        properties: { Notes: { rich_text: text(`${current}\n[${stamp}] ${body}`.slice(-1900)) } },
      }),
    });
  }
}

module.exports = {
  isConfigured, createTicket, findByDedupeKey, queuedTickets, update, comment, readProps,
};
