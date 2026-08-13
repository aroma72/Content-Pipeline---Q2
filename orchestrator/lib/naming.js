'use strict';
/**
 * Video title convention:
 *
 *     <module number> | <module topic name> | <subtopic being covered>
 *     e.g.  5 | Autonomous Operations | When a good eval score lies
 *
 * The title is composed HERE and nowhere else, because it reaches three places
 * that must agree: the brand intro bumper, the YouTube video title, and the
 * publish-review log. Composing it per call-site is how those drift apart.
 *
 * Module numbers and names are the five competency domains from
 * docs/agentic-ai-mastery-curriculum.md -- not invented here. If that file's
 * domain table changes, change MODULES to match.
 */

/** The five competency domains, verbatim from the curriculum's domain table. */
const MODULES = {
  1: 'Mental Models',
  2: 'Agent Fundamentals',
  3: 'Memory Engineering',
  4: 'External Integration',
  5: 'Autonomous Operations',
};

/**
 * Module 0 is RESERVED for pipeline test runs and is deliberately NOT a
 * curriculum domain. Kept separate from MODULES so the "every module name exists
 * in the curriculum doc" test stays meaningful, and so a `0 | Test | ...` title is
 * self-evidently not course content if one ever escapes to a channel.
 */
const RESERVED_MODULES = {
  0: 'Test',
};

/** Lookup across real domains and reserved values. */
function moduleName(n) {
  return MODULES[n] || RESERVED_MODULES[n] || null;
}

/**
 * Which module an existing series belongs to.
 *
 * Deliberately incomplete: a series that is not listed here gets no guess. An
 * inferred wrong module number is worse than a missing one, because it looks
 * authoritative in a learner-facing title.
 */
const SERIES_MODULE = {
  'mental-models': 1,
  'evals': 5,
  'autonomy': 5,
  'autonomous-ops': 5,
  'harness': 5,
  'agentic-workflows': 5,
};

const SEP = ' | ';
const YOUTUBE_TITLE_MAX = 100;

class NamingError extends Error {}

/**
 * Resolve the module for a queue item.
 * Explicit values on the item always win over the series lookup.
 * @returns {{number: number|null, topic: string|null, source: string}}
 */
function resolveModule(item = {}) {
  if (item.module !== undefined && item.module !== null && item.module !== '') {
    const n = Number(item.module);
    if (!Number.isInteger(n)) throw new NamingError(`module must be a whole number, got ${JSON.stringify(item.module)}`);
    const topic = item.moduleTopic || moduleName(n);
    if (!topic) {
      throw new NamingError(
        `module ${n} is not a known module ` +
        `(curriculum: ${Object.keys(MODULES).join(', ')}; reserved: ${Object.keys(RESERVED_MODULES).join(', ')}), ` +
        `so --module-topic is required to name it.`
      );
    }
    const source = item.moduleTopic ? 'explicit'
      : (RESERVED_MODULES[n] ? 'reserved — NOT course content' : 'curriculum');
    return { number: n, topic, source };
  }

  const fromSeries = SERIES_MODULE[item.series];
  if (fromSeries) return { number: fromSeries, topic: moduleName(fromSeries), source: 'series map' };

  return { number: null, topic: item.moduleTopic || null, source: 'unknown' };
}

/**
 * Compose the full learner-facing title.
 *
 * @param {object} item      queue item (series, module, moduleTopic)
 * @param {string} subtopic  what this specific video covers
 * @returns {{title: string, warning: string|null}}
 */
function composeTitle(item, subtopic) {
  const sub = String(subtopic || '').trim().replace(/\s+/g, ' ');
  if (!sub) throw new NamingError('a video needs a subtopic for its title');
  // A subtopic that already contains the separator would produce a title with
  // four segments and quietly break the convention it is meant to follow.
  if (sub.includes('|')) {
    throw new NamingError(`subtopic must not contain '|' (it is the field separator): ${JSON.stringify(sub)}`);
  }

  const mod = resolveModule(item);

  if (mod.number === null || !mod.topic) {
    // Return something usable rather than failing a whole render over a title,
    // but say plainly that the convention was not met -- a silently
    // non-conforming title is the thing this module exists to prevent.
    return {
      title: sub,
      warning:
        `Title does not follow "<module> | <topic> | <subtopic>": series '${item.series}' ` +
        `has no module mapping. Pass --module <1-5> (and --module-topic if it is a new ` +
        `domain) when enqueuing.`,
    };
  }

  let title = `${mod.number}${SEP}${mod.topic}${SEP}${sub}`;

  // YouTube truncates past 100 chars. Trim the subtopic rather than the module
  // prefix, so the convention survives and only the tail is shortened.
  if (title.length > YOUTUBE_TITLE_MAX) {
    const prefix = `${mod.number}${SEP}${mod.topic}${SEP}`;
    const room = YOUTUBE_TITLE_MAX - prefix.length - 1; // -1 for the ellipsis
    if (room < 12) {
      throw new NamingError(
        `module prefix "${prefix}" leaves no room for a subtopic within ${YOUTUBE_TITLE_MAX} chars`
      );
    }
    title = prefix + sub.slice(0, room).trimEnd() + '…';
  }

  return { title, warning: null };
}

/** Does a string already follow the convention? Used by tests and validation. */
function followsConvention(title) {
  const parts = String(title).split('|').map((p) => p.trim());
  if (parts.length !== 3) return false;
  const n = Number(parts[0]);
  return Number.isInteger(n) && parts[1].length > 0 && parts[2].length > 0;
}

module.exports = {
  composeTitle, resolveModule, followsConvention, moduleName,
  MODULES, RESERVED_MODULES, SERIES_MODULE, NamingError, SEP,
};
