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

/**
 * Series, as people actually write it: "series: evals", "series evals",
 * "series called testing", "series named 'testing'".
 *
 * The `called|named` alternatives matter — without them the plain form captures
 * the word "called" as the series name, and files the video under a folder of
 * that name.
 */
const SERIES_PATTERN = /\bseries\s*(?:called\s+|named\s+|[:=]\s*)?["'“”]?([a-z0-9][a-z0-9._-]*)["'“”]?/i;

/**
 * Words that follow "series" when someone is TALKING ABOUT the series rather
 * than naming one. Without this, "what should the series name be?" filed a video
 * under a series literally called `name` -- seen in production.
 */
const SERIES_NON_NAMES = new Set([
  'name', 'names', 'called', 'named', 'is', 'be', 'should', 'would', 'does', 'do',
  'the', 'a', 'an', 'this', 'that', 'it', 'what', 'which', 'for', 'to', 'of', 'in',
  'and', 'or', 'but', 'we', 'you', 'i', 'go', 'goes', 'use', 'using', 'set',
]);

/** The series someone actually NAMED, or '' if they were only discussing it. */
function extractSeries(text) {
  const m = String(text || '').match(SERIES_PATTERN);
  if (!m) return '';
  const candidate = m[1].toLowerCase();
  if (SERIES_NON_NAMES.has(candidate)) return '';
  // A question is a request for information, not an answer to one.
  if (/\?\s*$/.test(String(text).trim()) && /\b(what|which|should|can|could|do|does|is)\b/i.test(text)) {
    return '';
  }
  return candidate;
}
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

  // Pull the series out before it can pollute the topic.
  let series = extractSeries(text);

  let topic = text
    .replace(SERIES_PATTERN, ' ')
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
      // Must say "mention me": polling finds work via search.messages, which only
      // returns messages containing the bot's handle. A bare thread reply is
      // invisible to the harness, and the human is left waiting on a bot that
      // never saw them.
      question:
        `Which series should "${topic}" go in? It decides the folder and the module ` +
        `number, so I won't guess it.\n` +
        `Mention me again with the series, e.g. \`@content_queen make a video about ${topic}, series: evals\``,
    };
  }

  return { ok: true, topic, series, title: topic };
}

/**
 * Read a follow-up reply in a thread the bot is already part of.
 *
 * Unlike parseRequest this does NOT demand a full "make a video about X"
 * sentence: the conversation already established that a video is wanted, so a
 * reply only has to supply the missing pieces. Returns whatever it can find, so
 * "series: evals" alone is useful, and so is a bare topic in quotes.
 *
 * `needs` is what the bot actually asked for -- 'series', 'topic', or both. A
 * one-word reply is genuinely ambiguous ("evals" is a series, "checklists" is a
 * topic) and only the question being answered disambiguates it. Assuming
 * "series" meant a one-word TOPIC was silently filed as a folder name and the
 * video was never about what the person asked for.
 */
function parseFollowUp(rawText, { needs = ['series'] } = {}) {
  const text = stripSlackMentions(rawText).replace(/\s+/g, ' ').trim();
  if (!text) return {};

  const out = {};

  const named = extractSeries(text);
  const sm = text.match(SERIES_PATTERN);
  let rest = text;
  if (named && sm) {
    out.series = named;
    // Cut the series phrase out before hunting for a topic, or a quoted series
    // name gets picked up as the topic too.
    rest = text.slice(0, sm.index) + ' ' + text.slice(sm.index + sm[0].length);
  }

  // A quoted phrase is the clearest statement of intent someone can make.
  const quoted = rest.match(/["'“”]([^"'“”]{3,80})["'“”]/);
  if (quoted) {
    out.topic = quoted[1].trim();
    return out;
  }

  // Otherwise take what follows a topic preposition, e.g. "... has to be on ai in 2030".
  const after = rest.match(/\b(?:about|on|for|covering|regarding)\b\s+(.{3,90})$/i);
  if (after) {
    out.topic = after[1]
      .replace(/^(?:the\s+)?(?:video|lesson|explainer|clip)\s+/i, '')
      .replace(/[\s,.:;!]+$/g, '')
      .trim();
  }

  // A short bare reply answers the question that was asked. Which field it fills
  // is decided by `needs`, never by assuming.
  if (!out.series && !out.topic && !/\?\s*$/.test(text)) {
    const wants = Array.isArray(needs) ? needs : [needs];
    if (wants.includes('series') && /^[a-z0-9][a-z0-9._-]{1,30}$/i.test(text)) {
      out.series = text.toLowerCase();
    } else if (wants.includes('topic') && text.length >= 3 && text.length <= 120) {
      // A topic is prose, so it is not held to the slug-shaped rule above.
      out.topic = text.replace(/[\s,.:;!]+$/g, '').trim();
    }
  }

  return out;
}

module.exports = { parseRequest, parseFollowUp, stripSlackMentions, adfToText, SERIES_PATTERN, extractSeries };
