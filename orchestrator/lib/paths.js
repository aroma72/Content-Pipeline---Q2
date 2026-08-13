'use strict';
/**
 * Single source of truth for every path the orchestrator touches.
 *
 * Everything is derived from this file's own location. Nothing is hardcoded --
 * the project lives under "Content Queen", which contains a space, and a
 * hardcoded path is exactly what broke the health-check scheduler (ILHAM 5.2).
 */

const path = require('path');
const fs = require('fs');

const ORCHESTRATOR_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ORCHESTRATOR_DIR, '..');

const PATHS = {
  repoRoot: REPO_ROOT,
  orchestrator: ORCHESTRATOR_DIR,

  // Work tracking -- append-only JSONL, per the project's .beads convention.
  beads: path.join(REPO_ROOT, '.beads'),
  runsLog: path.join(REPO_ROOT, '.beads', 'runs.jsonl'),
  failuresLog: path.join(REPO_ROOT, '.beads', 'failures.jsonl'),
  improvementsLog: path.join(REPO_ROOT, '.beads', 'improvements.jsonl'),
  qaRatingsLog: path.join(REPO_ROOT, '.beads', 'qa_ratings.jsonl'),

  // Orchestrator-owned state.
  queue: path.join(ORCHESTRATOR_DIR, 'queue.jsonl'),
  runsDir: path.join(ORCHESTRATOR_DIR, '.runs'),

  // The video pipeline this spine drives.
  explainerVideos: path.join(REPO_ROOT, 'explainer-videos'),
  videoTemplates: path.join(
    REPO_ROOT, '.claude', 'skills', 'creating-explainer-videos', 'templates'
  ),
  brandBumpers: path.join(REPO_ROOT, 'explainer-videos', 'brand-intro-outro'),

  // Prompts. Never inline a system prompt -- project rule.
  prompts: path.join(REPO_ROOT, 'prompts'),

  standards: path.join(REPO_ROOT, '.claude', 'standards'),
};

/** Resolve a per-run state file. */
function runStatePath(runId) {
  return path.join(PATHS.runsDir, `${runId}.json`);
}

/** Resolve the working folder for a video, e.g. explainer-videos/<series>/<slug>. */
function videoDir(series, slug) {
  return path.join(PATHS.explainerVideos, series, slug);
}

/** Load a prompt by name from prompts/ -- mirrors the Python _load_prompt() rule. */
function loadPrompt(name) {
  const file = path.join(PATHS.prompts, `${name}.txt`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Prompt '${name}' not found at ${file}. ` +
      `System prompts must live in prompts/ -- never inline them.`
    );
  }
  return fs.readFileSync(file, 'utf8');
}

function ensureDirs() {
  for (const dir of [PATHS.beads, PATHS.runsDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = { PATHS, runStatePath, videoDir, loadPrompt, ensureDirs };
