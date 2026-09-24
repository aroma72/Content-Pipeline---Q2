#!/usr/bin/env node
'use strict';
/**
 * Prove the live service behaves the way the handoff says it does.
 *
 *   CONTENT_API_TOKEN=<token> node scripts/verify-live.js
 *   CONTENT_API_TOKEN=<token> node scripts/verify-live.js --base https://staging.example
 *
 * READ-ONLY BY CONSTRUCTION. It never calls /courses/plan, /courses/build,
 * /produce or /approve -- those spend money or publish, and a verification tool
 * that can do either is a tool nobody runs. Every request here is a GET, except
 * the attempts probe, which exists precisely to confirm that it refuses.
 *
 * The token is read from the environment and never printed, not even truncated.
 */

const BASE = (() => {
  const i = process.argv.indexOf('--base');
  return (i > -1 && process.argv[i + 1]) || 'https://content-queen-production.up.railway.app';
})();
const TOKEN = process.env.CONTENT_API_TOKEN || '';

let pass = 0;
const failures = [];

function report(name, detail) {
  pass++;
  console.log('  PASS  ' + name + (detail ? '  (' + detail + ')' : ''));
}
async function check(name, fn) {
  try {
    report(name, await fn());
  } catch (e) {
    failures.push({ name, message: e.message });
    console.log('  FAIL  ' + name + '\n          ' + e.message);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

async function get(path, auth = true) {
  const headers = auth && TOKEN ? { authorization: 'Bearer ' + TOKEN } : {};
  const res = await fetch(BASE + path, { headers });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text };
}

(async () => {
  console.log('\n' + '='.repeat(64));
  console.log('  LIVE VERIFICATION  ' + BASE);
  console.log('='.repeat(64) + '\n');

  console.log('1. durability -- what survives a redeploy');

  await check('the job store is on a mounted volume', async () => {
    const r = await get('/health', false);
    assert(r.status === 200, 'expected 200, got ' + r.status);
    const d = r.json.jobStore && r.json.jobStore.durability;
    assert(d === 'volume',
      'jobStore durability is "' + d + '", not "volume" -- attach a Railway volume');
    return r.json.jobStore.dir;
  });

  await check('course state lives in the same store, not in the image', async () => {
    const r = await get('/health', false);
    const c = r.json.courses;
    assert(c, 'no courses block on /health -- this build predates the course-durability work');
    assert(c.durability === 'volume', 'course durability is "' + c.durability + '", not "volume"');
    assert(/cq-jobs/.test(c.queueFile), 'the queue is not under the job store: ' + c.queueFile);
    return c.queueFile;
  });

  await check('the two agree -- one store, one durability tier', async () => {
    const r = await get('/health', false);
    assert(r.json.jobStore.durability === r.json.courses.durability,
      'jobStore and courses disagree about where state lives');
    return r.json.courses.durability;
  });

  console.log('\n2. the question contract');

  await check('the index states the flag invariant', async () => {
    const r = await get('/api/v1', false);
    assert(r.status === 200, 'expected 200, got ' + r.status);
    const rules = (r.json.howTheQuestionBehaves || {}).rules || [];
    const joined = rules.join(' ');
    assert(/cannot gate anything/.test(joined),
      'the index does not state that a question which never pauses cannot gate');
    assert(/questionStyle/.test(joined), 'the index never explains questionStyle');
    return rules.length + ' rules, ' + (r.json.endpoints || []).length + ' endpoints';
  });

  console.log('\n3. the course worker -- contract 1.2 (a hold is per course; a script is read before we spend)');

  await check('the index and /health agree on a contractVersion of at least 1.2', async () => {
    const idx = await get('/api/v1', false);
    const h = await get('/health', false);
    const v = String(idx.json.contractVersion || '');
    assert(/^\d+\.\d+$/.test(v), 'the index carries no contractVersion -- this build predates 1.1');
    assert(h.json.contractVersion === v, '/health says ' + h.json.contractVersion + ', the index says ' + v);
    const [maj, min] = v.split('.').map(Number);
    assert(maj > 1 || (maj === 1 && min >= 2), 'contractVersion ' + v + ' is older than 1.2');
    return 'contract ' + v;
  });

  await check('the free exits are on the index: skip, and resume after a boot', async () => {
    const r = await get('/api/v1', false);
    const paths = (r.json.endpoints || []).map((e) => e.method + ' ' + e.path);
    for (const want of ['POST /api/v1/courses/worker/resume', 'POST /api/v1/courses/:courseId/lessons/:lessonId/skip']) {
      assert(paths.includes(want), 'the index does not list ' + want);
    }
    return 'both listed';
  });

  await check('/health says whether the worker is idle with work waiting', async () => {
    const r = await get('/health', false);
    const w = r.json.courses && r.json.courses.worker;
    assert(w && typeof w.needsResume === 'boolean', 'no courses.worker.needsResume on /health');
    assert(typeof w.eligible === 'number' && typeof w.heldCourses === 'number', 'worker counts missing');
    if (w.needsResume) {
      console.log('          note: needsResume is TRUE -- ' + w.eligible + ' eligible lesson(s) are waiting. '
        + 'POST /api/v1/courses/worker/resume starts them; it spends what a build already reserved.');
    }
    return 'running=' + w.running + ' eligible=' + w.eligible + ' held=' + w.heldCourses + ' needsResume=' + w.needsResume;
  });

  // ── 3b. the pre-spend script gate (contract 1.2) ──────────────────────────
  // The gate is ALWAYS ON: a course built against this service stops at lesson one
  // after ~2 minutes and waits for a person. If these routes are not live, an LMS
  // that has wired the approve call is calling a 404 and its course is stuck.

  await check('the script gate routes are on the index the LMS pins to', async () => {
    const r = await get('/api/v1', false);
    const paths = (r.json.endpoints || []).map((e) => e.method + ' ' + e.path);
    const want = [
      'GET /api/v1/courses/:courseId/lessons/:lessonId/script',
      'GET /api/v1/courses/:courseId/lessons/:lessonId/script.md',
      'POST /api/v1/courses/:courseId/lessons/:lessonId/script/approve',
      'POST /api/v1/courses/:courseId/lessons/:lessonId/script/revise',
    ];
    for (const w of want) assert(paths.includes(w), 'the index does not list ' + w);
    return want.length + ' routes listed';
  });

  await check('script-approval is in the published blockedBy set', async () => {
    const r = await get('/api/v1', false);
    const set = r.json.blockedBy;
    assert(Array.isArray(set), 'the index does not publish the blockedBy set any more');
    assert(set.includes('script-approval'),
      'script-approval is not published, so the LMS cannot branch on the gate: ' + set.join(', '));
    return set.length + ' values, including script-approval';
  });

  if (!TOKEN) {
    console.log('\n  SKIP  everything below needs CONTENT_API_TOKEN in the environment.\n');
  } else {
    if (process.env.COURSE_ID) {
      await check('the course view names what holds this course, and where its lessons stand', async () => {
        const r = await get('/api/v1/courses/' + process.env.COURSE_ID);
        assert(r.status === 200, 'expected 200, got ' + r.status);
        const w = r.json.worker || {};
        assert('held' in w && 'needsResume' in w, 'the course view predates 1.1');
        const q = (r.json.items || []).filter((i) => i.status === 'queued');
        return 'held=' + JSON.stringify(w.held) + ' needsResume=' + w.needsResume
          + ' positions=' + JSON.stringify(q.map((i) => i.queuePosition));
      });
    }

    await check('the catalogue classifies every row', async () => {
      const r = await get('/api/v1/videos');
      assert(r.status === 200, 'expected 200, got ' + r.status);
      const rows = r.json.videos || [];
      assert(rows.length > 0, 'the catalogue is empty');
      for (const row of rows) {
        assert(['committed', 'ephemeral', 'unknown'].includes(row.durability),
          row.path + ' has no usable durability');
        assert(['popup', 'on-screen'].includes(row.questionStyle),
          row.path + ' has no usable questionStyle');
      }
      const eph = rows.filter((x) => x.durability !== 'committed');
      const popup = rows.filter((x) => x.questionStyle === 'popup').length;
      return rows.length + ' rows, ' + popup + ' popup, ' + eph.length + ' not committed';
    });

    await check('NO checkpoint ever demands an answer it never stops for', async () => {
      const list = await get('/api/v1/videos');
      let gating = 0;
      let drawn = 0;
      for (const row of list.json.videos) {
        const r = await get('/api/v1/videos/' + row.videoId + '/checkpoints');
        assert(r.status === 200, row.videoId + ': expected 200, got ' + r.status);
        for (const c of r.json.checkpoints) {
          if (c.pausesVideo === false) {
            drawn++;
            assert(c.requiresAnswer === false && c.blocking === false && c.allowSkip === true,
              row.videoId + '/' + c.id + ' does not pause but still demands an answer');
            assert(typeof c.onScreenUntilSeconds === 'number',
              row.videoId + '/' + c.id + ' does not pause and does not say how long it is legible');
          } else {
            gating++;
            assert(c.requiresAnswer === true && c.blocking === true && c.allowSkip === false,
              row.videoId + '/' + c.id + ' pauses but the learner can skip past it');
          }
        }
      }
      return gating + ' gating, ' + drawn + ' drawn on screen';
    });

    await check('an unknown course reports durability rather than assuming the worst', async () => {
      const r = await get('/api/v1/courses/course-does-not-exist');
      assert(r.status === 404, 'expected 404, got ' + r.status);
      assert(!/not durable across/.test(r.text),
        'still claims the queue is not durable, and cites a handoff nobody was sent');
      assert(['volume', 'container', 'ephemeral', 'memory'].includes(r.json.durability),
        'no usable durability on the 404');
      return '404, durability: ' + r.json.durability;
    });

    await check('recording an attempt is refused, on purpose', async () => {
      const res = await fetch(BASE + '/api/v1/videos/sample/checkpoints/q1/attempts', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + TOKEN, 'content-type': 'application/json' },
        body: JSON.stringify({ chosenIndex: 0 }),
      });
      assert(res.status === 501, 'expected 501, got ' + res.status);
      return '501 -- the LMS owns the learner and the gradebook';
    });

    await check('spend is attributed to a tenant', async () => {
      const r = await get('/demo/spend');
      assert(r.status === 200, 'expected 200, got ' + r.status);
      const ceiling = r.json.monthlyUsd === null ? 'NONE' : '$' + r.json.monthlyUsd;
      if (r.json.tenant === 'default') {
        console.log('          note: this credential is the shared "default" tenant, not its own.');
      }
      assert(r.json.courses && typeof r.json.courses.lessons === 'number',
        '/demo/spend has no courses block -- course spend is invisible here (pre-1.1)');
      return 'tenant: ' + r.json.tenant + ', monthly ceiling: ' + ceiling
        + ', course lessons this month: ' + r.json.courses.lessons;
    });
  }

  console.log('\n' + '-'.repeat(64));
  console.log('  ' + pass + ' passed, ' + failures.length + ' failed');
  if (failures.length) {
    for (const f of failures) console.log('    - ' + f.name + ': ' + f.message);
    process.exitCode = 1;
  }
  console.log('');
})();
