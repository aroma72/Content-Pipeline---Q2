'use strict';
/**
 * Jira Cloud REST v3 — comment back on an issue and attach the deliverable.
 *
 * Auth is basic with an API token, which is what Atlassian issues for Cloud;
 * there is no bearer-token equivalent for a user-scoped token.
 */

const fs = require('fs');
const path = require('path');
const { config } = require('./config');

function authHeader() {
  const raw = `${config.jira.email}:${config.jira.apiToken}`;
  return 'Basic ' + Buffer.from(raw).toString('base64');
}

const isConfigured = () =>
  Boolean(config.jira.baseUrl && config.jira.email && config.jira.apiToken);

/**
 * Jira v3 takes comment bodies as Atlassian Document Format, not a string.
 * Passing plain text gets a 400 that reads like an auth problem, so build the
 * node tree properly. Blank lines become separate paragraphs.
 */
function toADF(text) {
  const paragraphs = String(text).split(/\n{2,}/).filter(Boolean);
  return {
    type: 'doc',
    version: 1,
    content: (paragraphs.length ? paragraphs : ['']).map((p) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: p }],
    })),
  };
}

async function jiraFetch(urlPath, options = {}) {
  const res = await fetch(`${config.jira.baseUrl}${urlPath}`, {
    ...options,
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Jira ${options.method || 'GET'} ${urlPath} -> ${res.status} ${body.slice(0, 300)}`);
  }
  return res;
}

async function addComment(issueKey, text) {
  if (!isConfigured()) return null;
  try {
    const res = await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: toADF(text) }),
    });
    return await res.json();
  } catch (e) {
    console.error('[jira] addComment failed:', e.message);
    return null;
  }
}

/**
 * Attach the video to the issue.
 *
 * Jira Cloud enforces a site-wide maximum attachment size that is well below a
 * typical rendered lesson, and the failure is a flat 413. Rather than lose the
 * delivery, oversize files fall back to a comment saying where the file is — the
 * caller can then link a hosted copy instead.
 */
async function attachFile(issueKey, filePath) {
  if (!isConfigured()) return null;
  if (!fs.existsSync(filePath)) return null;

  const form = new FormData();
  const bytes = await fs.promises.readFile(filePath);
  form.append('file', new Blob([bytes]), path.basename(filePath));

  try {
    const res = await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/attachments`, {
      method: 'POST',
      // Jira rejects attachment uploads without this header as XSRF.
      headers: { 'X-Atlassian-Token': 'no-check' },
      body: form,
    });
    return await res.json();
  } catch (e) {
    console.error('[jira] attachFile failed:', e.message);
    await addComment(
      issueKey,
      `The video rendered but could not be attached (${e.message}). ` +
      `It is usually the site attachment size limit — ask a Jira admin to raise it, ` +
      `or fetch the file from the pipeline server at ${filePath}.`
    );
    return null;
  }
}

module.exports = { isConfigured, addComment, attachFile, toADF };
