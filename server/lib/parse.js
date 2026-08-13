'use strict';
/**
 * Turn a human sentence into a queue item.
 *
 * The bot is addressed conversationally ("@Drawing Room make a video about what a
 * rubric actually does, series: evals"), so this strips the addressing noise and
 * pulls out the two fields the queue requires: topic and series.
 *
 * Deliberately refuses to guess the series. queue.enqueue derives the item id from
 * `<series>/<slug>`, so a wrong guess files the video under the wrong module and
 * the mistake only surfaces after a paid render. Missing series is returned as a
 * question for the human, not as a default.
 */

const { config } = require('./config');

// How someone asks for a video. Anything else is treated as conversation.
const MAKE_RE = /\b(make|create|produce|build|do|record|generate)\b/i;
const VIDEO_RE = /\b(video|lesson|explainer|clip)\b/i;

/** Remove Slack's mention markup, e.g. "<@U123ABC> hello" -> "hello". */
function stripSlackMentions(text) {
  return String(text || '')
    .replace(/<@[^>]+>/g, ' ')
    // Slack wraps links as <url|label>; keep the label, drop the plumbing.
    .replace(/<([^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<([^>]+)>/g, '$1');
}

/**
 * Jira comment bodies arrive as Atlassian Document Format — a nested node tree,
 * not a string. Walk it and collect the text leaves.
 */
function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(adfToText).join(' ');
  if (node.type === 'text' && typeof node.text === 'string') return node.text;
  // A mention of the bot renders as its own node type, not as text.
  if (node.type === 'mention' && node.attrs) return `@${node.attrs.text || ''}`;
  if (node.content) return adfToText(node.content);
  return '';
}

/**
 * @returns {{ok: true, topic, series, title}|{ok: false, reason, question?}}
 */
function parseRequest(rawText) {
  const text = stripSlackMentions(rawText).replace(/\s+/g, ' ').trim();

  if (!text) return { ok: false, reason: 'empty' };
  if (!MAKE_RE.test(text) || !VIDEO_RE.test(text)) {
    return { ok: false, reason: 'not_a_request' };
  }

  // Pull "series: evals" or "series evals" out before it can pollute the topic.
  let series = '';
  const seriesMatch = text.match(/\bseries\s*[:=]?\s*([a-z0-9][a-z0-9._-]*)/i);
  if (seriesMatch) series = seriesMatch[1].toLowerCase();

  let topic = text
    .replace(/\bseries\s*[:=]?\s*[a-z0-9][a-z0-9._-]*/i, ' ')
    // Strip the request framing so the topic reads as a title, not an instruction.
    .replace(/^.*?\b(?:make|create|produce|build|do|record|generate)\b\s*/i, '');

  // Strip the leading filler one token at a time until nothing more matches.
  // A single pass is not enough: "an explainer video covering X" needs the
  // article, then two nouns, then the preposition removed, and stopping early
  // leaves "video covering X" as the topic.
  const LEADING_NOISE = [
    /^(?:me|us)\s+/i,
    /^(?:a|an|the)\s+/i,
    /^(?:new|short|quick|brief)\s+/i,
    /^(?:video|lesson|explainer|clip)\b/i,
    /^(?:about|on|for|covering|explaining|regarding|re)\b/i,
    /^[\s,:—-]+/,
  ];
  for (let changed = true; changed; ) {
    changed = false;
    for (const re of LEADING_NOISE) {
      const next = topic.replace(re, '');
      if (next !== topic) { topic = next.trimStart(); changed = true; }
    }
  }

  topic = topic.replace(/\s+/g, ' ').replace(/[\s,.:;!]+$/g, '').trim();

  if (!topic) return { ok: false, reason: 'no_topic', question: 'What should the video be about?' };

  if (!series) series = config.pipeline.defaultSeries;
  if (!series) {
    return {
      ok: false,
      reason: 'no_series',
      question:
        `Which series should "${topic}" go in? Reply with e.g. \`series: evals\` — ` +
        `it decides the folder and the module number, so I won't guess it.`,
    };
  }

  return { ok: true, topic, series, title: topic };
}

module.exports = { parseRequest, stripSlackMentions, adfToText };
