#!/usr/bin/env node
'use strict';
/**
 * Orchestrator CLI -- ILHAM plan 3.1.
 *
 *   node orchestrator/run.js enqueue --topic "..." --series evals
 *   node orchestrator/run.js run     [--stop-after qa] [--budget 2.00] [--dry-run]
 *   node orchestrator/run.js drain   [--max 5] [...same flags]
 *   node orchestrator/run.js resume  <runId>
 *   node orchestrator/run.js status  [runId]
 *   node orchestrator/run.js queue
 *   node orchestrator/run.js metrics
 *
 * `--stop-after qa` is the plan's own scoping for 3.1: the chain is built and
 * proven up to QA while upload (2.1) and NAZIM (1.2) are still blocked. Without
 * it a run halts at `upload` as `blocked`, which is correct but noisy.
 */

// Load .env before anything reads process.env (credentials live there).
require('./lib/env').loadDotenv();

const spine = require('./lib/spine');
const queue = require('./lib/queue');
const state = require('./lib/state');
const jsonl = require('./lib/jsonl');
const { PATHS } = require('./lib/paths');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

function runOpts(args, item) {
  const opts = {
    dryRun: Boolean(args['dry-run']),
    stopAfter: typeof args['stop-after'] === 'string' ? args['stop-after'] : null,
    fromStage: typeof args.from === 'string' ? args.from : null,
    budgetUsd: args.budget !== undefined && args.budget !== true ? Number(args.budget) : null,
    // Opt-in override of plan 2.3's born-unlisted rule. Default is unlisted so an
    // unattended run can never make an unwatched video public.
    publishPublic: Boolean(args['publish-public']),
    quiet: Boolean(args.quiet),
  };

  // `--from produce` means "the script already exists on disk". Read beats.js and
  // hand `produce` the artifact the script stage would have given it, so the
  // spend estimate is computed from the real beats rather than guessed.
  if (opts.fromStage && item) {
    const { videoDir } = require('./lib/paths');
    const beatsPath = require('path').join(videoDir(item.series, item.slug), 'beats.js');
    if (!require('fs').existsSync(beatsPath)) {
      throw new Error(`--from ${opts.fromStage} needs an existing script, but ${beatsPath} does not exist`);
    }
    delete require.cache[require.resolve(beatsPath)];
    const beats = require(beatsPath);
    if (!Array.isArray(beats) || !beats.length) {
      throw new Error(`${beatsPath} did not export a non-empty array of beats`);
    }
    opts.seedArtifacts = {
      script: {
        title: typeof args.title === 'string' ? args.title : item.topic,
        beats,
        beatCount: beats.length,
        beatsPath,
        handWritten: true,
      },
    };
  }
  return opts;
}

function summarise(st) {
  const mins = st.finishedAt
    ? ((new Date(st.finishedAt) - new Date(st.startedAt)) / 60000).toFixed(1)
    : '?';
  console.log('');
  console.log(`  run        ${st.runId}`);
  console.log(`  item       ${st.item.id}`);
  console.log(`  status     ${st.status.toUpperCase()}`);
  console.log(`  elapsed    ${mins} min`);
  console.log(`  spend      $${st.spend.usd.toFixed(2)}`);
  console.log(`  human      ${st.interventions.length} intervention(s)`);
  for (const [name, s] of Object.entries(st.stages)) {
    const ms = s.ms === null ? '   —  ' : `${(s.ms / 1000).toFixed(1)}s`.padStart(7);
    const attempts = s.attempts > 1 ? ` x${s.attempts}` : '';
    console.log(`    ${name.padEnd(9)} ${String(s.status).padEnd(8)} ${ms}${attempts}${s.error ? `  ${s.error.split('\n')[0]}` : ''}`);
  }
  for (const i of st.interventions) console.log(`    ! ${i.stage}: ${i.kind} — ${i.detail || ''}`);
  console.log('');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];

  switch (cmd) {
    case 'enqueue': {
      if (!args.topic || args.topic === true) throw new Error('--topic is required');
      if (!args.series || args.series === true) throw new Error('--series is required');
      const item = queue.enqueue({
        topic: args.topic,
        series: args.series,
        slug: typeof args.slug === 'string' ? args.slug : undefined,
        source: typeof args.source === 'string' ? args.source : 'manual',
        recommendationId: typeof args['recommendation-id'] === 'string' ? args['recommendation-id'] : null,
        priority: args.priority ? Number(args.priority) : 5,
        notes: typeof args.notes === 'string' ? args.notes : null,
        module: args.module !== undefined && args.module !== true ? args.module : null,
        moduleTopic: typeof args['module-topic'] === 'string' ? args['module-topic'] : null,
      });
      console.log(`queued ${item.id} (priority ${item.priority})`);

      // Say up front whether this item can produce a conforming title, rather than
      // letting it surface as a warning 40 minutes into a render.
      const naming = require('./lib/naming');
      const mod = naming.resolveModule(item);
      if (mod.number === null) {
        console.log(
          `  WARNING: no module for series '${item.series}', so the title will not follow\n` +
          `  "<module> | <topic> | <subtopic>". Re-enqueue with --module <1-5>` +
          ` (and --module-topic for a new domain).\n` +
          `  Known modules: ${Object.entries(naming.MODULES).map(([n, t]) => `${n}=${t}`).join(', ')}`
        );
      } else {
        console.log(`  title will read: ${mod.number} | ${mod.topic} | <subtopic>   (${mod.source})`);
      }
      break;
    }

    case 'requeue': {
      // Put a failed or blocked item back in line, once whatever blocked it is
      // fixed. Plan item 5.1 (self-repair) drives this automatically.
      const id = args._[1];
      if (!id) throw new Error('usage: requeue <itemId>');
      const item = queue.requeue(id);
      console.log(`requeued ${item.id}`);
      break;
    }

    case 'run': {
      const item = queue.nextQueued();
      if (!item) { console.log('queue is empty'); break; }
      queue.claim(item.id, 'pending');
      const st = await spine.execute(item, runOpts(args, item));
      summarise(st);
      process.exitCode = st.status === state.STATUS.DONE ? 0 : 1;
      break;
    }

    case 'drain': {
      const max = args.max ? Number(args.max) : Infinity;
      let done = 0;
      for (let i = 0; i < max; i++) {
        const item = queue.nextQueued();
        if (!item) break;
        queue.claim(item.id, 'pending');
        const st = await spine.execute(item, runOpts(args, item));
        summarise(st);
        done++;
        // Stop the batch on the first non-success: a systemic failure (expired
        // key, missing binary) would otherwise burn the whole queue one item
        // at a time before anyone noticed.
        if (st.status !== state.STATUS.DONE) {
          console.log(`stopping drain after a ${st.status} run`);
          process.exitCode = 1;
          break;
        }
      }
      console.log(`drained ${done} item(s)`);
      break;
    }

    case 'resume': {
      const runId = args._[1];
      if (!runId) throw new Error('usage: resume <runId>');
      const prior = state.load(runId);
      const st = await spine.execute(prior.item, { ...runOpts(args, prior.item), resumeState: prior });
      summarise(st);
      process.exitCode = st.status === state.STATUS.DONE ? 0 : 1;
      break;
    }

    case 'status': {
      const runId = args._[1];
      if (runId) { summarise(state.load(runId)); break; }
      const runs = state.list().slice(-15);
      if (!runs.length) { console.log('no runs yet'); break; }
      for (const r of runs) {
        console.log(`${r.runId}  ${String(r.status).padEnd(8)}  ${r.item.id}`);
      }
      break;
    }

    case 'queue': {
      const items = queue.currentItems();
      if (!items.length) { console.log('queue is empty'); break; }
      for (const i of items) {
        console.log(`[${String(i.status).padEnd(8)}] p${i.priority} ${i.id}  (${i.source})  ${i.topic}`);
      }
      break;
    }

    case 'metrics': {
      // The three numbers ILHAM plan 7.2 has to prove.
      const runs = jsonl.readValid(PATHS.runsLog).filter((r) => r.type === 'run');
      if (!runs.length) { console.log('no completed runs logged yet'); break; }
      const done = runs.filter((r) => r.status === 'done');
      const withIntervention = runs.filter((r) => r.interventionCount > 0).length;
      const mins = done.map((r) => r.totalMinutes).filter((m) => typeof m === 'number');
      const avg = mins.length ? (mins.reduce((a, b) => a + b, 0) / mins.length) : null;
      console.log(`runs logged        ${runs.length} (${done.length} done)`);
      console.log(`intervention rate  ${((withIntervention / runs.length) * 100).toFixed(0)}%  (target <=20%)`);
      console.log(`avg turnaround     ${avg === null ? 'n/a' : avg.toFixed(1) + ' min'}  (baseline ~34 min, target >=40% faster)`);
      console.log(`total spend        $${runs.reduce((a, r) => a + (r.spendUsd || 0), 0).toFixed(2)}`);
      break;
    }

    default:
      console.log(require('fs').readFileSync(__filename, 'utf8')
        .split('\n').slice(3, 18).map((l) => l.replace(/^ \* ?/, '')).join('\n'));
      process.exitCode = cmd ? 1 : 0;
  }
}

main().catch((err) => {
  console.error(`\n${err.name || 'Error'}: ${err.message}\n`);
  process.exitCode = 1;
});
