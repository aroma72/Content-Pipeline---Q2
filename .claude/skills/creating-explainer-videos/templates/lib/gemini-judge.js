'use strict';
/*
 * gemini-judge.js — the one way a sensor asks Gemini for a JSON verdict.
 *
 * WHY THIS EXISTS
 * eval-text.js made a single bare fetch with no timeout: a slow or flaky judge
 * either hung the produce stage until its 20-minute sensor timeout or turned a
 * 503 into "exit 3, no verdict". qa-art.js had its own three-attempt loop with
 * its own backoff. Two copies of "call the judge" drift; this is the one copy.
 *
 * RULES
 *  - Retry on what retrying can fix: a network error, a timeout, 429, 5xx.
 *  - Do not retry a 4xx that is not 429 -- a bad key or a bad request stays bad.
 *  - Exhaustion is JudgeUnavailableError, so the caller exits 3 (infrastructure,
 *    not a finding). Unparseable JSON is JudgeUnparseableError, same exit.
 *  - Self-contained: this file is copied into every video folder with the
 *    sensors, so it must not require anything from orchestrator/.
 */

class JudgeUnavailableError extends Error {
  constructor(message, { attempts, status } = {}) {
    super(message);
    this.name = 'JudgeUnavailableError';
    this.attempts = attempts;
    this.status = status;
  }
}
class JudgeUnparseableError extends Error {
  constructor(message, { raw } = {}) {
    super(message);
    this.name = 'JudgeUnparseableError';
    this.raw = raw;
  }
}

const RETRYABLE_STATUS = (s) => s === 429 || (s >= 500 && s < 600);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * Ask the judge once per attempt until it answers, and parse the first
 * candidate's text as JSON.
 *
 * @param {object} o
 * @param {string} o.key           Google API key
 * @param {string} o.model         e.g. 'gemini-2.5-flash'
 * @param {object[]} o.parts       the `parts` array of the single user turn
 * @param {number} [o.timeoutMs]   per attempt (default 60s)
 * @param {number} [o.attempts]    total tries (default 3)
 * @param {number[]} [o.backoffMs] waits between tries
 * @param {Function} [o.fetchImpl] injectable for tests
 * @param {Function} [o.log]       receives one line per retry
 * @param {object} [o.generationConfig]
 * @returns {Promise<any>} the parsed JSON
 */
async function judgeJson({
  key, model, parts, timeoutMs = 60 * 1000, attempts = 3, backoffMs = [2000, 8000, 20000],
  fetchImpl = globalThis.fetch, log = () => {}, generationConfig,
}) {
  if (!key) throw new JudgeUnavailableError('no API key for the judge', { attempts: 0 });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: generationConfig || { temperature: 0, responseMimeType: 'application/json' },
  });

  let last = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let res;
    try {
      res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body,
        signal: globalThis.AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      // Network error or timeout: nothing was decided. Try again.
      last = { message: e && e.name === 'TimeoutError' ? `timed out after ${timeoutMs}ms` : (e && e.message) || String(e) };
      if (attempt < attempts) { log(`judge ${model}: ${last.message} -- retry ${attempt}/${attempts - 1}`); await sleep(backoffMs[attempt - 1] || backoffMs[backoffMs.length - 1] || 0); }
      continue;
    }

    if (!res.ok) {
      let text = '';
      try { text = (await res.text()).slice(0, 160); } catch { /* best effort */ }
      last = { status: res.status, message: `HTTP ${res.status} ${text}` };
      if (!RETRYABLE_STATUS(res.status)) {
        throw new JudgeUnavailableError(`judge ${model}: ${last.message}`, { attempts: attempt, status: res.status });
      }
      if (attempt < attempts) { log(`judge ${model}: ${last.message} -- retry ${attempt}/${attempts - 1}`); await sleep(backoffMs[attempt - 1] || backoffMs[backoffMs.length - 1] || 0); }
      continue;
    }

    let j;
    try { j = await res.json(); } catch (e) {
      throw new JudgeUnparseableError(`judge ${model}: response was not JSON (${e.message})`, { raw: null });
    }
    const txt = ((j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [])
      .map((p) => p.text || '').join('');
    try { return JSON.parse(txt); } catch {
      throw new JudgeUnparseableError(`judge ${model}: unparseable verdict: ${txt.slice(0, 200)}`, { raw: txt });
    }
  }
  throw new JudgeUnavailableError(
    `judge ${model}: no answer after ${attempts} attempt(s): ${(last && last.message) || 'unknown'}`,
    { attempts, status: last && last.status }
  );
}

module.exports = { judgeJson, JudgeUnavailableError, JudgeUnparseableError, RETRYABLE_STATUS };
