'use strict';
/**
 * Layout integrity: after the 2026-09-28 reorganisation, does every path this
 * repo names still exist, and does the pipeline still wire together?
 *
 * Three passes that day moved ~1,800 files out of the root into docs/, media/,
 * content/ and legacy/. The audit that followed found the failures a move
 * actually causes, and each section here exists because one of them happened:
 *
 *   - a moved file's OWN relative paths (__dirname, Path(__file__)) now point
 *     somewhere else -- the inbound references were all fixed, these were not
 *   - a script names an old root directory and quietly recreates it
 *   - a tool shells out to a path that is gone and reports a false PASS
 *   - a Markdown instruction Claude follows sends it to a folder that moved
 *
 * Offline and $0: no network, no model call, no media spend, and nothing is
 * written inside the repo (every store, render dir and run log is redirected to
 * a temp dir). Node built-ins only, matching test-regressions.js.
 *
 *   node orchestrator/test-layout.js
 *
 * The file map this enforces is docs/FILE_STRUCTURE.md. Change one, change both.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const toPosix = (p) => p.split(path.sep).join('/');
const rel = (p) => toPosix(path.relative(ROOT, p));
const exists = (p) => fs.existsSync(p);

// ── harness (the house shape, copied from test-regressions.js:21-63) ──────────

let pass = 0;
let skipped = 0;
const failures = [];

const skip = (why) => ({ __skip: true, why });

function report(name, detail) {
  if (detail && detail.__skip) {
    skipped++;
    console.log(`  SKIP  ${name}  (${detail.why})`);
    return;
  }
  pass++;
  console.log(`  PASS  ${name}${detail ? `  (${detail})` : ''}`);
}

function check(name, fn) {
  try {
    report(name, fn());
  } catch (e) {
    failures.push({ name, message: e.message });
    console.log(`  FAIL  ${name}\n          ${e.message.split('\n').join('\n          ')}`);
  }
}

async function checkAsync(name, fn) {
  try {
    report(name, await fn());
  } catch (e) {
    failures.push({ name, message: e.message });
    console.log(`  FAIL  ${name}\n          ${e.message.split('\n').join('\n          ')}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Fail with a bounded list, so one bad sweep cannot bury the rest of the output. */
function assertNone(hits, what) {
  if (!hits.length) return;
  const shown = hits.slice(0, 400).map((h) => `- ${h}`).join('\n');
  const more = hits.length > 400 ? `\n... and ${hits.length - 400} more` : '';
  throw new Error(`${hits.length} ${what}:\n${shown}${more}`);
}

const tmpDirs = [];
function tmpDir(tag) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `cq-layout-${tag}-`));
  tmpDirs.push(d);
  return d;
}

// ── the contract ──────────────────────────────────────────────────────────────

/** Tracked files allowed at the root. Each is pinned by something that breaks without it. */
const ROOT_FILES = [
  '.dockerignore', '.env.example', '.gitignore', '.railwayignore', 'CLAUDE.md', 'Dockerfile',
  'README.md', 'agent_memory.json', 'eslint.config.mjs', 'package-lock.json', 'package.json',
  'railway.json', 'requirements.txt',
];

/** Tracked directories allowed at the root. */
const ROOT_DIRS = [
  '.beads', '.claude', '.github', 'content', 'docs', 'evals', 'explainer-videos', 'gates',
  'legacy', 'media', 'orchestrator', 'prompts', 'prototypes', 'scripts', 'server', 'tests',
];

/**
 * Old root location -> new home. The single source of truth for "is this an old
 * path"; docs/FILE_STRUCTURE.md prints the same table for humans.
 */
const MOVED_DIRS = {
  'video_production': 'media/video_production',
  'updated': 'media/updated',
  'recordings': 'media/recordings',
  'voiceovers': 'media/voiceovers',
  'voiceover-windows-formal': 'media/voiceover-windows-formal',
  'animation-frames': 'media/animation-frames',
  'course-overview-video-output': 'media/course-overview-video-output',
  'blender': 'media/blender',
  'tools': 'media/tools',
  'avatar-video-kit': 'media/avatar-video-kit',
  'drawing-room-video': 'media/drawing-room-video',
  'fashion-tech-avatar': 'media/fashion-tech/avatar',
  'fashion-tech-avatar-broll': 'media/fashion-tech/broll',
  'fashion-tech-avatar-clean': 'media/fashion-tech/clean',
  'fashion-tech-real': 'media/fashion-tech/real',
  'assignments': 'content/assignments',
  'video_scripts': 'content/video_scripts',
  'templates': 'content/templates',
  'planning': 'content/planning',
  'memory': 'content/memory',
  'drafts': 'content/drafts',
  'published': 'content/published',
  'review_queue': 'content/review_queue',
  'weekly_artifacts': 'content/weekly_artifacts',
  'Agentic_AI_Mastery_Session1_Bundle': 'content/session-bundles/agentic-ai-mastery-session1',
  'agents': 'legacy/python/agents',
  'skills': 'legacy/python/skills',
  'utils': 'legacy/python/utils',
};
const OLD_NAMES = Object.keys(MOVED_DIRS);

/** Root-level Python modules that now live in legacy/python/ (checks/ for the old test_*). */
const MOVED_PY = [
  'config', 'logger', 'schemas', 'memory_manager', 'main', 'orchestrator',
  'video_quality_orchestrator', 'video_production_orchestrator',
  'video_production_orchestrator_remotion', 'video_production_cli', 'run_video_production',
];

/**
 * A mode-160000 gitlink with no .gitmodules and an empty checkout. Paths inside
 * it have never resolved on this machine; that predates the move and is tracked
 * as its own problem, not as layout breakage.
 */
const PHANTOM = 'media/drawing-room-video/drawing-room-remotion';

/** Files the scanner must not read: they deliberately spell out the old paths. */
const SCAN_SELF = new Set([
  'orchestrator/test-layout.js', 'scripts/verify-all.js',
  '.gitignore', '.dockerignore', '.railwayignore', // ignore-pattern semantics, see section 8
]);

// ── small utilities ───────────────────────────────────────────────────────────

let gitOk = true;
function git(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    if (e.status === undefined || e.code === 'ENOENT') gitOk = false;
    throw e;
  }
}
function gitIgnored(relPath) {
  try {
    execFileSync('git', ['check-ignore', '-q', relPath], { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
let TRACKED = null;
function tracked() {
  if (TRACKED) return TRACKED;
  TRACKED = git(['ls-files', '-z']).split('\0').filter(Boolean);
  return TRACKED;
}

const SKIP_DIRS = new Set(['node_modules', '.git', '__pycache__', '.pytest_cache', '.chrome-profile',
  'frames', 'out', 'audio', 'art', 'clips', 'layers']);

/** Walk a tree, yielding repo-relative posix paths of files. Never enters vendor/output dirs. */
function* walk(dir, filter) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      yield* walk(full, filter);
    } else if (e.isFile()) {
      const r = rel(full);
      if (!filter || filter(r)) yield r;
    }
  }
}

function readText(r) {
  try {
    const st = fs.statSync(path.join(ROOT, r));
    if (st.size > 1024 * 1024) return null; // generated data, not something a person edits
    return fs.readFileSync(path.join(ROOT, r), 'utf8');
  } catch {
    return null;
  }
}

/** Lines outside <!-- layout-audit:ignore-start --> ... <!-- layout-audit:ignore-end --> fences. */
function unfencedLines(text) {
  const out = [];
  let fenced = false;
  text.split(/\r?\n/).forEach((line, i) => {
    if (/layout-audit:ignore-start/.test(line)) { fenced = true; return; }
    if (/layout-audit:ignore-end/.test(line)) { fenced = false; return; }
    if (/^\s*<!--.*-->\s*$/.test(line)) return; // an HTML comment is provenance, never rendered
    if (!fenced) out.push([i + 1, line]);
  });
  return out;
}

/** A path on a machine that is not this one. Pre-existing, listed, never failed. */
const FOREIGN_MACHINE = /Aroma Tahir|\\Users\\Aroma|\/Users\/Aroma/;

// ── the stale-path detector (pure functions, so section 6 can prove it works) ─

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const OLD_ALT = OLD_NAMES.slice().sort((a, b) => b.length - a.length).map(esc).join('|');

/**
 * Form A: a root-relative path string beginning with an old root name:
 * `"video_production/x"`, `cd drawing-room-video/...`, `node tools/x.js`.
 * Not preceded by a path or word character, so `media/video_production/` and
 * `.claude/skills/` never match.
 */
const FORM_A = new RegExp(`(?<![\\w.@$~/\\\\-])(?:\\./)?(${OLD_ALT})/([\\w.*{}<>-]*)`, 'g');

/**
 * How strictly each kind of file is read. A path in a shell script is an
 * unquoted word, so every old name counts there (`grep ... skills/ agents/` was a
 * real false PASS). In JS/Python a path is a string literal, and six of the old
 * names are also ordinary words this codebase uses for OTHER folders -- `templates/`
 * almost always means the skill's templates, `memory` a durability mode -- so a
 * mere mention is not evidence. Those are judged by form B (a path actually being
 * built) instead.
 */
const CODE_AMBIGUOUS = new Set(['templates', 'memory', 'tools', 'skills', 'agents', 'utils']);
const QUOTED_ONLY = new Set(['updated', 'published', 'drafts', 'planning', 'recordings']);

function modeOf(fileRel) {
  if (/\.md$/.test(fileRel)) return 'doc';
  if (/\.(sh|ps1|bat|cmd|ya?ml|toml)$/.test(fileRel)) return 'shell';
  return 'code'; // js, py, json, ts
}

/** Drop the comment part of a line, so prose about history is not read as a path. */
function stripComment(line, mode) {
  if (mode === 'doc') return line;
  const t = line.trimStart();
  if (mode === 'code' && (/^(\*|\/\*|\/\/)/.test(t) || /^#(?!!)/.test(t))) return '';
  if (mode === 'shell' && (/^#/.test(t) || /^(REM|::)\b/i.test(t) || /^\s*(echo|Write-Host)\b/i.test(t))) return '';
  // A trailing `// ...` or ` # ...` outside quotes.
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (mode === 'code' && c === '/' && line[i + 1] === '/' && line[i - 1] !== ':') return line.slice(0, i);
    if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

/**
 * Candidates from one line of a file. `fileRel` is the repo-relative path of the
 * file, used for the "is this a legitimate local sub-folder" guard: a skill that
 * says `templates/lib/config.js` about its OWN templates/ folder is fine.
 */
function formAHits(line, fileRel, mode = modeOf(fileRel)) {
  const hits = [];
  const dir = path.dirname(path.join(ROOT, fileRel));
  const text = stripComment(line, mode);
  FORM_A.lastIndex = 0;
  let m;
  while ((m = FORM_A.exec(text))) {
    const name = m[1];
    if (mode === 'code' && CODE_AMBIGUOUS.has(name)) continue;
    if (mode === 'code' && QUOTED_ONLY.has(name) && !/['"`]$/.test(text.slice(0, m.index))) continue;
    const local = path.join(dir, name);
    if (exists(local)) continue;                        // a real sub-folder beside this file
    if (exists(path.join(ROOT, name))) continue;        // (would mean it was resurrected; section 2 fails that)
    hits.push({ name, text: m[0] });
  }
  return hits;
}

/**
 * Form C: an old directory name as a whole string, used as a path value:
 *   const voDir = 'voiceover-windows-formal';      $outDir = "voiceover-windows-formal"
 *   Path("updated")                                 os.makedirs("video_production")
 * Only names that are never ordinary words here, plus Python's Path("<word>").
 * A literal that follows another path segment (`'media', 'video_production'`,
 * `MEDIA_DIR / "video_production"`) is relative to something else and skipped;
 * one that follows a root anchor is form B's to judge.
 */
const C_NAMES = new Set(['video_production', 'voiceovers', 'voiceover-windows-formal', 'animation-frames',
  'course-overview-video-output', 'avatar-video-kit', 'drawing-room-video', 'fashion-tech-avatar',
  'fashion-tech-avatar-broll', 'fashion-tech-avatar-clean', 'fashion-tech-real', 'video_scripts',
  'weekly_artifacts', 'Agentic_AI_Mastery_Session1_Bundle']);
const NOT_A_PATH_CALL = /\b(includes|indexOf|startsWith|endsWith|has|test|match|matchAll|replace|split|log|error|warn|info|push|add|get|set|print|grep|contains)\s*$/;

function formCHits(line, fileRel, mode = modeOf(fileRel)) {
  if (mode === 'doc' || /\.json$/.test(fileRel)) return [];
  const text = stripComment(line, mode);
  const hits = [];
  const dir = path.dirname(path.join(ROOT, fileRel));
  for (const m of text.matchAll(/(['"])([\w-]+)\1/g)) {
    const name = m[2];
    const pyPathWord = mode === 'code' && /\.py$/.test(fileRel) && QUOTED_ONLY.has(name) && /Path\(\s*$/.test(text.slice(0, m.index));
    if (!C_NAMES.has(name) && !pyPathWord) continue;
    const before = text.slice(0, m.index).replace(/\s+$/, '');
    const last = before.slice(-1);
    if (mode === 'shell' ? last !== '=' : !(last === '=' || last === '(')) continue;
    if (last === '(' && NOT_A_PATH_CALL.test(before.slice(0, -1))) continue;
    if (exists(path.join(dir, name))) continue;
    hits.push({ name, text: m[0] });
  }
  return hits;
}

/**
 * Form D: a moved root FILE run as a command -- `python main.py`,
 * `python test_safety_system.py`, `node generate-frames.js`, `.\render_all_3d.ps1`.
 * The directory forms cannot see these: the file had no folder to rename.
 * Flagged when the bare filename no longer exists at the root (or beside the
 * doc), and names where it went instead.
 */
const RUNNER = /(?:^|[\s`'"(;&|])(?:python3?|py(?:\s+-3)?|node|bash|sh|pwsh|powershell(?:\.exe)?(?:\s+-File)?|\.[\\/])\s*([\w.-]+\.(?:py|js|ps1|sh))(?=[\s`'")\],;:]|$)/g;
const FILE_HOMES = ['legacy/python', 'legacy/python/checks', 'legacy/node', 'legacy/powershell', 'legacy/scratch', 'docs/onboarding'];

function newHomeOfFile(name) {
  for (const d of FILE_HOMES) {
    const direct = path.join(ROOT, d, name);
    if (exists(direct)) return `${d}/${name}`;
  }
  const m = /^test_(.+\.py)$/.exec(name); // the nine ad-hoc scripts were renamed check_*
  if (m && exists(path.join(ROOT, 'legacy', 'python', 'checks', `check_${m[1]}`))) return `legacy/python/checks/check_${m[1]}`;
  return null;
}

function formDHits(line, fileRel, mode = modeOf(fileRel)) {
  if (mode === 'code') return [];
  const text = stripComment(line, mode);
  const dir = path.dirname(path.join(ROOT, fileRel));
  const hits = [];
  RUNNER.lastIndex = 0;
  let m;
  while ((m = RUNNER.exec(text))) {
    const name = m[1];
    if (exists(path.join(ROOT, name)) || exists(path.join(dir, name))) continue;
    const home = newHomeOfFile(name);
    if (home) hits.push({ name, text: `${m[0].trim()}  -> ${home}` });
  }
  // In a doc, a moved file named on its own in backticks: "update `config.py`".
  if (mode === 'doc') {
    for (const b of text.matchAll(/`([\w.-]+\.(?:py|js|ps1))(?::\d+)?`/g)) {
      const name = b[1];
      if (exists(path.join(ROOT, name)) || exists(path.join(dir, name))) continue;
      const home = newHomeOfFile(name);
      if (home && !hits.some((h) => h.name === name)) hits.push({ name, text: `\`${name}\`  -> ${home}` });
    }
  }
  return hits;
}

/** Is index `at` of `line` inside a string literal? (A require() in source text being searched is not a require.) */
function insideString(line, at) {
  let q = null;
  for (let i = 0; i < at; i++) {
    const c = line[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') q = c;
  }
  return q !== null;
}

/**
 * Form B: a path built from an anchor whose depth changed when the file moved.
 *   JS:      path.join(__dirname, 'animation-frames')        (anchor = this file's dir)
 *            path.join(REPO, 'video_production', ...)         (anchor = repo root)
 *   Python:  Path(__file__).parent / 'voiceovers'             (anchor computed from the chain)
 *            BASE / "updated"                                  (anchor = repo root)
 * Flagged when one of its literal segments is an old root name and the
 * resolved location does not exist.
 */
const JS_JOIN = /path\.(?:join|resolve)\(\s*([A-Za-z_$][\w$.]*)\s*((?:,\s*(['"])[^'"\n]*\3\s*)+)\)/g;
const ROOT_IDENTS = /^(ROOT|REPO|REPO_ROOT|PROJECT_DIR|BASE|BASE_DIR|repoRoot|PATHS\.repoRoot)$/;
const PY_CHAIN = /(Path\(__file__\)(?:\.resolve\(\))?((?:\.parent|\.parents\[\d+\])+)|\b(BASE_DIR|BASE|REPO_ROOT|REPO|ROOT|base_path)\b)((?:\s*\/\s*(['"])[^'"\n]+\5)+)/g;

function literalsOf(argText) {
  const out = [];
  const re = /(['"])([^'"\n]*)\1/g;
  let m;
  while ((m = re.exec(argText))) out.push(m[2]);
  return out;
}

function formBHits(line, fileRel) {
  const hits = [];
  const fileAbs = path.join(ROOT, fileRel);
  const flag = (segs, base, text, knownDepth) => {
    // A vendored package reached by COUNTING PARENTS from this file. If the
    // climb lands in a folder with no such package while the repo's root install
    // has it, the count is off by the depth the file moved -- the ffmpeg-static
    // case in legacy/python/skills. Only when the anchor's depth is certain
    // (__dirname / __file__), and only for a climb toward an ancestor; a
    // per-project install (explainer-videos/<x>/node_modules) is on-demand.
    const nm = segs.indexOf('node_modules');
    if (nm !== -1) {
      if (!knownDepth || !segs[nm + 1]) return;
      const nmParent = path.resolve(base, ...segs.slice(0, nm));
      const fileDir = path.dirname(fileAbs);
      const climbs = nmParent !== fileDir && (fileDir + path.sep).startsWith(nmParent + path.sep);
      const pkg = path.join(nmParent, 'node_modules', segs[nm + 1]);
      if (climbs && !exists(pkg) && exists(path.join(ROOT, 'node_modules', segs[nm + 1]))) {
        hits.push({ name: 'node_modules', text: `${text} -> ${toPosix(path.relative(ROOT, pkg))} (no such package dir; the root install has it)` });
      }
      return;
    }
    const firstOld = segs.find((s) => OLD_NAMES.includes(s.split('/')[0]));
    if (!firstOld) return;
    const resolved = path.resolve(base, ...segs);
    // An output that does not exist yet is fine if its parent chain reached a
    // real directory OTHER than an old name -- e.g. media/updated/ on a clean clone.
    const idx = segs.findIndex((s) => OLD_NAMES.includes(s.split('/')[0]));
    const upTo = path.resolve(base, ...segs.slice(0, idx + 1));
    if (exists(resolved) || exists(upTo)) return;
    hits.push({ name: firstOld.split('/')[0], text: `${text} -> ${toPosix(path.relative(ROOT, resolved)) || '.'}` });
  };

  if (/\.(m?js|cjs|ts)$/.test(fileRel)) {
    JS_JOIN.lastIndex = 0;
    let m;
    while ((m = JS_JOIN.exec(line))) {
      const anchor = m[1];
      let base = null;
      if (anchor === '__dirname') base = path.dirname(fileAbs);
      else if (ROOT_IDENTS.test(anchor)) base = ROOT;
      if (!base) continue;
      flag(literalsOf(m[2]), base, m[0], anchor === '__dirname');
    }
  }
  if (/\.py$/.test(fileRel)) {
    PY_CHAIN.lastIndex = 0;
    let m;
    while ((m = PY_CHAIN.exec(line))) {
      let base;
      if (m[2] !== undefined) {
        // Path(__file__) -> .parent counts 1, .parents[n] counts n+1.
        let up = 0;
        const partRe = /\.parent(?:s\[(\d+)\])?/g;
        let p;
        while ((p = partRe.exec(m[2]))) up += p[1] === undefined ? 1 : Number(p[1]) + 1;
        base = path.dirname(fileAbs);
        for (let i = 1; i < up; i++) base = path.dirname(base);
      } else {
        base = ROOT;
      }
      flag(literalsOf(m[4]), base, m[0], m[2] !== undefined);
    }
  }
  return hits;
}

// ── scopes ────────────────────────────────────────────────────────────────────

const CODE_EXT = /\.(m?js|cjs|ts|py|sh|ps1|bat|cmd|ya?ml|json|toml)$/;

/** Code and config: every text file that could open or build a path. */
function codeFiles() {
  const out = [];
  for (const r of walk(ROOT, (x) => CODE_EXT.test(x))) {
    if (SCAN_SELF.has(r)) continue;
    if (/(^|\/)package-lock\.json$/.test(r)) continue;
    if (r.startsWith('docs/archive/') || r.startsWith('legacy/scratch/')) continue;
    if (r.startsWith('evals/agent-plugin/')) continue;           // regenerated from .claude/skills
    if (r.startsWith('.claude/memories/') || r.startsWith('.claude/memory-db/')) continue;
    if (r.startsWith('.beads/')) continue;                       // append-only logs, history by design
    if (r.startsWith('.claude/logs/')) continue;
    if (/(^|\/)beats\.js$/.test(r)) continue;                 // lesson script content, not paths in this repo
    out.push(r);
  }
  return out;
}

/**
 * Markdown that someone -- Claude or a person -- follows as instructions or
 * routing. Historical records are out of scope: they describe the tree as it
 * was on the day they were written, and rewriting them would falsify them.
 */
function instructionDocs() {
  const out = [];
  const add = (r) => { if (exists(path.join(ROOT, r)) && !out.includes(r)) out.push(r); };
  add('CLAUDE.md'); add('README.md');
  for (const r of walk(path.join(ROOT, '.claude'), (x) => x.endsWith('.md'))) {
    if (r.startsWith('.claude/memories/')) {
      // Warm-tier reference files are routing; the narrative ones are history.
      if (/\/(session-archive)\//.test(r)) continue;
      if (/\/(active-session|mistakes|mistakes-export|lessons|lessons-export)\.md$/.test(r)) continue;
    }
    add(r);
  }
  for (const r of walk(path.join(ROOT, 'docs'), (x) => x.endsWith('.md'))) {
    if (r.startsWith('docs/archive/')) continue;
    if (r === 'docs/agentic-ai-mastery-curriculum.md') continue; // course prose about the learner's own repo
    add(r);
  }
  for (const d of ['.github', 'tests', 'gates', 'orchestrator', 'scripts', 'evals/skills']) {
    for (const r of walk(path.join(ROOT, d), (x) => x.endsWith('.md'))) add(r);
  }
  add('explainer-videos/README.md');
  add('explainer-videos/EXPLAINER-VIDEO-PIPELINE-SPEC.md');
  for (const d of ['media', 'content', 'legacy']) {
    for (const r of walk(path.join(ROOT, d), (x) => /(^|\/)README\.md$/.test(x))) add(r);
  }
  add('content/planning/planning.md');
  add('content/memory/MEMORY.md');
  return out.filter((r) => !r.startsWith('evals/agent-plugin/'));
}

function scan(files, { formB }) {
  const stale = [];
  const foreign = [];
  for (const r of files) {
    const text = readText(r);
    if (text === null) continue;
    for (const [n, line] of (r.endsWith('.md') ? unfencedLines(text) : text.split(/\r?\n/).map((l, i) => [i + 1, l]))) {
      if (FOREIGN_MACHINE.test(line)) { foreign.push(`${r}:${n}`); continue; }
      for (const h of formAHits(line, r)) stale.push(`${r}:${n}  ${h.text.trim()}  -> ${MOVED_DIRS[h.name]}/`);
      for (const h of formDHits(line, r)) stale.push(`${r}:${n}  ${h.text}`);
      if (formB) for (const h of formBHits(line, r)) stale.push(`${r}:${n}  ${h.text.trim()}`);
      if (formB) for (const h of formCHits(line, r)) stale.push(`${r}:${n}  ${h.text}  (a bare old directory name) -> ${MOVED_DIRS[h.name]}/`);
    }
  }
  return { stale, foreign };
}

/** Repo paths inside a text: tokens whose first segment is a real or former root entry. */
function pathTokens(text) {
  const cleaned = text.replace(/\$\{?(?:REPO_ROOT|REPO|ROOT|CLAUDE_PROJECT_DIR)(?::-\.)?\}?"?\//g, ' ');
  const re = /(?<![\w@$.~/\\:-])(?:\.\/)?((?:\.?[A-Za-z0-9_-][\w.-]*\/)+[\w.*{}-]*)/g;
  const out = [];
  let m;
  while ((m = re.exec(cleaned))) out.push(m[1]);
  return out;
}

// ── python ────────────────────────────────────────────────────────────────────

/** `python3` here is a Store stub that prints to stderr; only a real 3.x counts. */
function pythonCmd() {
  for (const c of [process.env.PYTHON, 'py', 'python', 'python3'].filter(Boolean)) {
    try {
      const out = execFileSync(c, ['-c', 'import sys; print(sys.version_info[0])'], {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 20000,
      }).trim();
      if (out === '3') return c;
    } catch { /* next */ }
  }
  return null;
}

/** Spawn and collect, with a timeout. Never throws; the caller decides. */
function runChild(cmd, args, { cwd = ROOT, env = {}, timeoutMs = 120000, input } = {}) {
  return new Promise((resolve) => {
    let out = '';
    let err = '';
    let done = false;
    const child = spawn(cmd, args, {
      cwd, env: { ...process.env, ...env }, windowsHide: true,
      shell: process.platform === 'win32' && /^(npm|npx)$/.test(cmd),
    });
    const t = setTimeout(() => { if (!done) { done = true; child.kill(); resolve({ code: null, out, err: `${err}\n(timed out after ${timeoutMs}ms)` }); } }, timeoutMs);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => { if (!done) { done = true; clearTimeout(t); resolve({ code: null, out, err: e.message }); } });
    child.on('close', (code) => { if (!done) { done = true; clearTimeout(t); resolve({ code, out, err }); } });
    if (input !== undefined) child.stdin.end(input);
  });
}

// ── HTTP (the shape of test-server.js:63-176, copied: requiring it runs its suite) ─

async function withServer(envPatch, opts, fn) {
  const saved = {};
  for (const k of Object.keys(envPatch)) {
    saved[k] = process.env[k];
    process.env[k] = envPatch[k];
  }
  const { createApp } = require(path.join(ROOT, 'server', 'app'));
  const server = http.createServer(createApp(opts));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    return await fn(server.address().port);
  } finally {
    await new Promise((r) => server.close(r));
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

function req(port, { method = 'GET', path: p = '/', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const h = { ...headers };
    if (payload !== null) { h['content-type'] = 'application/json'; h['content-length'] = Buffer.byteLength(payload); }
    const r = http.request({ host: '127.0.0.1', port, method, path: p, headers: h }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch { /* not json */ }
        resolve({ status: res.statusCode, text, json });
      });
    });
    r.on('error', reject);
    if (payload !== null) r.write(payload);
    r.end();
  });
}

/** Stands in for server/lib/one-video, so no route can reach the spine or spend. */
function fakePipeline() {
  const nope = async () => { throw new Error('test-layout: the fake pipeline must never be driven'); };
  return {
    SERIES: 'made', write: nope, produce: nope, approve: nope,
    finished: () => [], fileForSlug: () => null, finishedFile: () => null,
    slugify: (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  };
}

const LMS_TOKEN = 'lms-token-long-enough-for-the-rules';
const LEGACY_TOKEN = 'legacy-token-long-enough-for-rules';

function freshEnv() {
  return {
    CONTENT_API_TOKEN: LEGACY_TOKEN,
    TENANTS_JSON: JSON.stringify([{ id: 'layout-t', name: 'Layout test tenant', token: LMS_TOKEN, monthlyUsd: 10 }]),
    TICK_INTERVAL_MS: '0',
    COURSE_AUTO_RESUME: '0',
    JOB_STORE_DIR: tmpDir('store'),
    EXPLAINER_VIDEOS_DIR: tmpDir('vids'),
    OWNER_COOKIE_SECRET: 'a-test-cookie-secret-long-enough-to-sign',
    PIPELINE_MAX_APPROVABLE_USD: '5',
    PIPELINE_BUDGET_USD: '0',
  };
}

// ── 1. the root ───────────────────────────────────────────────────────────────

function rootChecks() {
  console.log('\n1. The root holds only what is pinned there');

  check('tracked root files are exactly the pinned set', () => {
    const top = new Set(tracked().filter((f) => !f.includes('/')));
    const extra = [...top].filter((f) => !ROOT_FILES.includes(f));
    const missing = ROOT_FILES.filter((f) => !top.has(f));
    assertNone(extra.map((f) => `${f}  (not pinned -- move it; docs/FILE_STRUCTURE.md says where)`), 'unexpected tracked file(s) at the root');
    assertNone(missing.map((f) => `${f}  (pinned, but not tracked)`), 'pinned root file(s) missing');
    return `${top.size} files`;
  });

  check('tracked root directories are exactly the expected set', () => {
    const top = new Set(tracked().filter((f) => f.includes('/')).map((f) => f.split('/')[0]));
    const extra = [...top].filter((d) => !ROOT_DIRS.includes(d));
    const missing = ROOT_DIRS.filter((d) => !top.has(d));
    assertNone(extra.map((d) => `${d}/  (group it under media/, content/ or legacy/)`), 'unexpected tracked director(ies) at the root');
    assertNone(missing.map((d) => `${d}/`), 'expected root director(ies) missing');
    return `${top.size} directories`;
  });

  check('nothing untracked sits at the root unless it is gitignored', () => {
    const allowed = new Set([...ROOT_FILES, ...ROOT_DIRS]);
    const loose = fs.readdirSync(ROOT).filter((n) => !allowed.has(n) && n !== '.git' && !gitIgnored(n));
    assertNone(loose.map((n) => `${n}  (move it, or gitignore it if it is generated)`), 'loose root entr(ies)');
    return 'root is clean';
  });

  check('no loose Python, PowerShell, Office or stray Markdown at the root', () => {
    const bad = fs.readdirSync(ROOT).filter((n) =>
      /\.(py|ps1|docx|pdf|pptx)$/i.test(n)
      || (/\.md$/i.test(n) && !['CLAUDE.md', 'README.md'].includes(n))
      || (/\.(js|cjs)$/i.test(n)));
    assertNone(bad, 'loose script/document file(s) at the root');
    return 'none';
  });
}

// ── 2. nothing came back ──────────────────────────────────────────────────────

function resurrectionChecks() {
  console.log('\n2. No old root location has been recreated');

  check('none of the 28 moved directories exists at the root again', () => {
    const back = OLD_NAMES.filter((d) => exists(path.join(ROOT, d)));
    assertNone(back.map((d) => `${d}/  (moved to ${MOVED_DIRS[d]}/ -- whatever recreated it still uses the old path)`), 'moved director(ies) back at the root');
    return `${OLD_NAMES.length} checked`;
  });

  check('every new home exists', () => {
    // Gitignored working dirs (media/updated, content/published...) are created on
    // first use, so on a clean clone only their parent has to be there.
    const missing = Object.values(MOVED_DIRS).filter((d) => !exists(path.join(ROOT, d)) && !exists(path.join(ROOT, path.dirname(d))));
    assertNone(missing, 'new home(s) missing');
    return `${Object.keys(MOVED_DIRS).length} homes`;
  });

  check('the Python layer is whole in legacy/python/', () => {
    const missing = MOVED_PY.filter((m) => !exists(path.join(ROOT, 'legacy', 'python', `${m}.py`)));
    for (const d of ['agents', 'skills', 'utils', 'checks']) {
      if (!exists(path.join(ROOT, 'legacy', 'python', d))) missing.push(`${d}/`);
    }
    assertNone(missing.map((m) => `legacy/python/${m}`), 'piece(s) of the Python layer missing');
    return `${MOVED_PY.length} modules + agents/ skills/ utils/ checks/`;
  });

  check('no test_*.py outside tests/ (a bare `pytest` would import it)', () => {
    const stray = [...walk(ROOT, (r) => /(^|\/)(test_[^/]*|[^/]*_test)\.py$/.test(r))]
      .filter((r) => !r.startsWith('tests/'));
    assertNone(stray.map((r) => `${r}  (rename to check_*.py -- collection imports the module)`), 'collectable script(s) outside tests/');
    return 'none';
  });
}

// ── 3. path constants ─────────────────────────────────────────────────────────

function constantChecks() {
  console.log('\n3. Every path constant the code resolves exists');
  const { PATHS, loadPrompt } = require(path.join(ROOT, 'orchestrator', 'lib', 'paths'));

  check('every PATHS entry exists (lazy logs: their parent does)', () => {
    const lazy = new Set(['legacyQueue', 'runsDir', 'runsLog', 'failuresLog', 'improvementsLog', 'qaRatingsLog']);
    const bad = [];
    for (const [k, v] of Object.entries(PATHS)) {
      if (lazy.has(k) ? !exists(path.dirname(v)) : !exists(v)) bad.push(`PATHS.${k} = ${rel(v)}`);
    }
    assertNone(bad, 'PATHS entr(ies) point nowhere');
    return `${Object.keys(PATHS).length} entries`;
  });

  check('every prompt a stage loads is present in prompts/', () => {
    const names = new Set();
    // Stages name a prompt as `promptName: 'x'`; llm.js / llm-cli.js hand it to loadPrompt().
    for (const d of ['orchestrator/lib', 'server']) {
      for (const r of walk(path.join(ROOT, d), (x) => x.endsWith('.js'))) {
        const t = readText(r) || '';
        for (const m of t.matchAll(/(?:loadPrompt\(\s*|promptName\s*:\s*)['"]([\w-]+)['"]/g)) names.add(m[1]);
      }
    }
    assert(names.size >= 3, `found only ${names.size} prompt name(s) -- the sweep is broken`);
    const missing = [];
    for (const n of names) {
      try { if (!loadPrompt(n).trim()) missing.push(`${n} (empty)`); } catch (e) { missing.push(`${n}: ${e.message}`); }
    }
    assertNone(missing, 'prompt(s) missing');
    return `${names.size} prompts`;
  });
}

// ── 4. config names only real paths ───────────────────────────────────────────

function configChecks() {
  console.log('\n4. CI, hooks, harness and build config name only real paths');

  const sources = [];
  const addGlob = (dir, re) => { for (const r of walk(path.join(ROOT, dir), (x) => re.test(x))) sources.push(r); };
  addGlob('.github', /\.(ya?ml)$|\/hooks\//);
  addGlob('.claude/hooks', /\.sh$/);
  addGlob('.claude/scripts', /\.(sh|ps1|bat|cmd)$/);
  addGlob('scripts', /\.(sh|ps1)$/);
  sources.push('.claude/settings.json', 'eslint.config.mjs');

  const liveRoot = new Set([...ROOT_FILES, ...ROOT_DIRS]);
  const texts = sources.map((r) => [r, readText(r) || '']);
  // package.json: only its scripts, not dependency names.
  texts.push(['package.json#scripts', Object.values(JSON.parse(readText('package.json')).scripts || {}).join('\n')]);
  // .dockerignore: only the allowlist -- those are the paths that ship.
  texts.push(['.dockerignore#allow', (readText('.dockerignore') || '').split(/\r?\n/).filter((l) => l.startsWith('!')).map((l) => l.slice(1)).join('\n')]);

  check('no config names an old root location', () => {
    const bad = [];
    for (const [r, t] of texts) {
      t.split(/\r?\n/).forEach((line, i) => {
        if (/^\s*#/.test(line)) return; // a comment describing history is not a path
        for (const tok of pathTokens(line)) {
          const first = tok.replace(/^\.\//, '').split('/')[0];
          if (OLD_NAMES.includes(first) && !exists(path.join(ROOT, path.dirname(r.split('#')[0]), first))) {
            bad.push(`${r}:${i + 1}  ${tok}  -> ${MOVED_DIRS[first]}/`);
          }
        }
      });
    }
    assertNone(bad, 'stale path(s) in config');
    return `${texts.length} config sources`;
  });

  check('every live path config names exists (or is generated and gitignored)', () => {
    const bad = [];
    for (const [r, t] of texts) {
      t.split(/\r?\n/).forEach((line, i) => {
        if (/^\s*#/.test(line)) return;
        for (const tok of pathTokens(line)) {
          const clean = tok.replace(/^\.\//, '').replace(/[.,;:]+$/, '').replace(/\/+$/, '');
          const first = clean.split('/')[0];
          if (!liveRoot.has(first)) continue;
          if (/[<>$]/.test(clean)) continue;                       // a placeholder, not a path
          if (clean.startsWith(`${PHANTOM}/`)) continue;           // inside the empty gitlink: pre-existing, see FILE_STRUCTURE
          if (tracked().some((f) => f.startsWith(clean))) continue; // a prefix a grep matches, e.g. tests/test_
          const literal = clean.split(/[*{]/)[0].replace(/\/[^/]*$/, (x) => (clean.includes('*') || clean.includes('{') ? '' : x));
          const target = literal || first;
          if (exists(path.join(ROOT, target))) continue;
          if (gitIgnored(target)) continue;                        // logs, stores, build.json...
          if (/\.(jsonl|log|json)$/.test(target) && exists(path.join(ROOT, path.dirname(target)))) continue; // created lazily
          bad.push(`${r}:${i + 1}  ${tok}`);
        }
      });
    }
    assertNone(bad, 'path(s) named by config that do not exist');
    return 'all resolve';
  });

  check('the installed git hook matches its source', () => {
    const inst = path.join(ROOT, '.git', 'hooks', 'pre-commit');
    if (!exists(inst)) return skip('no hook installed in this clone (bash scripts/install-hooks.sh)');
    const src = readText('.github/hooks/pre-commit');
    const got = fs.readFileSync(inst, 'utf8');
    assert(got.replace(/\r\n/g, '\n') === (src || '').replace(/\r\n/g, '\n'),
      '.git/hooks/pre-commit differs from .github/hooks/pre-commit -- re-run: bash scripts/install-hooks.sh');
    return 'in sync';
  });
}

// ── 5 + 6. the stale-path scanner, and proof that it can fail ─────────────────

function scannerChecks() {
  console.log('\n5. No code or instruction doc still points at an old root location');

  let foreignCount = 0;
  check('code and config: no stale root-relative path', () => {
    const { stale, foreign } = scan(codeFiles(), { formB: true });
    foreignCount += foreign.length;
    assertNone(stale, 'stale path(s) in code');
    return `${codeFiles().length} files`;
  });

  check('instruction and routing docs: no stale root-relative path', () => {
    const docs = instructionDocs();
    const { stale, foreign } = scan(docs, { formB: false });
    foreignCount += foreign.length;
    assertNone(stale, 'stale path(s) in docs');
    return `${docs.length} docs`;
  });

  check('paths on another machine are counted, not failed', () => (foreignCount
    ? `${foreignCount} pre-existing C:\\Users\\Aroma Tahir\\... line(s); dead before 2026-09-28`
    : 'none'));

  console.log('\n6. The detector itself flags what it should (a gate is not trusted until seen to fail)');

  check('form A flags an old root path and ignores the new one', () => {
    const f = 'orchestrator/__synthetic__.js';
    assert(formAHits('const p = "video_production/x.mp4";', f).length === 1, 'did not flag "video_production/x.mp4"');
    assert(formAHits('cd drawing-room-video/drawing-room-remotion', f).length === 1, 'did not flag `cd drawing-room-video/`');
    assert(formAHits('node tools/blender-render.js', 'scripts/__synthetic__.sh').length === 1, 'did not flag `node tools/...` in a shell script');
    assert(formAHits('grep -r X skills/ agents/', 'scripts/__synthetic__.sh').length === 2, 'did not flag `skills/ agents/` as shell words');
    assert(formAHits('out = Path("updated/x.mp4")', 'legacy/python/__s__.py').length === 1, 'did not flag Path("updated/...")');
    assert(formAHits('// see templates/lib/config.js', f).length === 0, 'flagged a comment about the skill templates');
    assert(formAHits("rationale: 'copied to updated/ later'", f).length === 0, 'flagged prose inside a string');
    assert(formAHits('const p = "media/video_production/x.mp4";', f).length === 0, 'flagged the NEW path');
    assert(formAHits('see .claude/skills/git-workflow/SKILL.md', f).length === 0, 'flagged .claude/skills/');
    assert(formAHits("status === 'published'", f).length === 0, "flagged the job status 'published'");
    assert(formAHits('evals/skills/run.js', f).length === 0, 'flagged evals/skills/');
    return '6 must-flag / 6 must-not';
  });

  check('form A respects a real local sub-folder of the same name', () => {
    const f = '.claude/skills/creating-explainer-videos/SKILL.md';
    assert(formAHits('copy templates/lib/config.js', f).length === 0, 'flagged a skill describing its own templates/');
    assert(formAHits('copy templates/lib/config.js', '.claude/skills/paid-run-protocol/SKILL.md').length === 1,
      'did not flag templates/ from a skill that has no templates/ folder');
    return 'local guard works both ways';
  });

  check('form B flags a moved file whose __dirname/__file__ path went stale', () => {
    assert(formBHits("const OUT = path.join(__dirname, 'animation-frames');", 'legacy/node/x.js').length === 1,
      'did not flag path.join(__dirname, "animation-frames") from legacy/node/');
    assert(formBHits("const OUT = path.join(__dirname, '..', '..', 'media', 'animation-frames');", 'legacy/node/x.js').length === 0,
      'flagged the corrected ../../media/animation-frames');
    assert(formBHits("out = Path(__file__).parent / 'voiceovers' / 'x'", 'legacy/python/x.py').length === 1,
      'did not flag Path(__file__).parent / "voiceovers" from legacy/python/');
    assert(formBHits("out = Path(__file__).resolve().parents[2] / 'media' / 'voiceovers'", 'legacy/python/x.py').length === 0,
      'flagged the corrected parents[2] / media / voiceovers');
    assert(formBHits("x = BASE / 'updated' / 'a.mp4'", 'legacy/python/x.py').length === 1, 'did not flag BASE / "updated"');
    assert(formBHits('f = Path(__file__).parent.parent / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"', 'legacy/python/skills/x.py').length === 1,
      'did not flag a node_modules path counted from the wrong depth');
    assert(formBHits('f = Path(__file__).resolve().parents[3] / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"', 'legacy/python/skills/x.py').length === 0,
      'flagged the corrected parents[3] node_modules path');
    return '4 must-flag / 3 must-not';
  });

  check('form C flags a bare old directory name used as a path value', () => {
    assert(formCHits("const voDir = 'voiceover-windows-formal';", 'legacy/node/x.js').length === 1, 'did not flag const voDir = "voiceover-windows-formal"');
    assert(formCHits('$outDir = "voiceover-windows-formal"', 'legacy/powershell/x.ps1').length === 1, 'did not flag a PowerShell assignment');
    assert(formCHits('UPDATED = Path("updated")', 'legacy/python/x.py').length === 1, 'did not flag Path("updated")');
    assert(formCHits("const d = path.join(REPO, 'media', 'video_production');", 'scripts/x.js').length === 0, 'flagged a corrected media/ join');
    assert(formCHits('VIDEO_PRODUCTION_DIR = MEDIA_DIR / "video_production"', 'legacy/python/config.py').length === 0, 'flagged MEDIA_DIR / "video_production"');
    assert(formCHits("if (s.includes('drawing-room-video')) x();", 'scripts/x.js').length === 0, 'flagged a substring test');
    assert(formCHits("status = 'published'", 'legacy/python/x.py').length === 0, "flagged the status word 'published'");
    return '3 must-flag / 4 must-not';
  });

  check('form D flags a moved root file run as a command', () => {
    const d = 'docs/__synthetic__.md';
    assert(formDHits('Run `python main.py --dry-run`', d).length === 1, 'did not flag `python main.py`');
    assert(formDHits('python test_safety_system.py', d).length === 1, 'did not flag the renamed test_safety_system.py');
    assert(formDHits('python3 video_quality_orchestrator.py', 'scripts/__s__.sh').length === 1, 'did not flag it in a shell script');
    assert(formDHits('Run `python legacy/python/main.py --dry-run`', d).length === 0, 'flagged the corrected path');
    assert(formDHits('node scripts/deploy.sh and node evals/skills/run.js', d).length === 0, 'flagged paths that never moved');
    assert(formDHits('node compile-lesson.js', 'explainer-videos/README.md').length === 0, 'flagged a template script run inside a video folder');
    return '3 must-flag / 3 must-not';
  });

  check('markdown fences switch the scanner off and back on', () => {
    const lines = unfencedLines('a\n<!-- layout-audit:ignore-start -->\nvideo_production/x\n<!-- layout-audit:ignore-end -->\nb');
    assert(lines.map((l) => l[1]).join('|') === 'a|b', `fence leaked: ${JSON.stringify(lines)}`);
    return 'fenced lines skipped';
  });
}

// ── 7. links ──────────────────────────────────────────────────────────────────

function linkChecks() {
  console.log('\n7. Every relative Markdown link and every mapped path resolves');

  check('relative links in instruction docs point at real files', () => {
    const bad = [];
    for (const r of instructionDocs()) {
      const text = readText(r);
      if (text === null) continue;
      let inFence = false;
      text.split(/\r?\n/).forEach((line, i) => {
        if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return; }
        if (inFence) return;
        for (const m of line.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
          let target = m[1];
          if (/^(https?:|mailto:|#|data:)/.test(target)) continue;
          target = decodeURIComponent(target.split('#')[0].split('?')[0]);
          if (!target) continue;
          const abs = target.startsWith('/') ? path.join(ROOT, target) : path.join(path.dirname(path.join(ROOT, r)), target);
          if (!exists(abs)) bad.push(`${r}:${i + 1}  (${m[1]})`);
        }
      });
    }
    assertNone(bad, 'broken relative link(s)');
    return `${instructionDocs().length} docs`;
  });

  check('every backtick path in CLAUDE.md, the file map and the folder READMEs exists', () => {
    const docs = ['CLAUDE.md', 'docs/FILE_STRUCTURE.md', 'media/README.md', 'content/README.md', 'legacy/README.md', 'docs/README.md']
      .filter((r) => exists(path.join(ROOT, r)));
    assert(docs.includes('docs/FILE_STRUCTURE.md'), 'docs/FILE_STRUCTURE.md is missing -- CLAUDE.md routes "find a file" to it');
    const liveRoot = new Set([...ROOT_FILES, ...ROOT_DIRS]);
    const bad = [];
    for (const r of docs) {
      for (const [n, line] of unfencedLines(readText(r) || '')) {
        for (const m of line.matchAll(/`([^`\s]+)`/g)) {
          const tok = m[1].replace(/^\.\//, '').replace(/[,.;:]+$/, '');
          const first = tok.split('/')[0];
          if (!tok.includes('/') || !liveRoot.has(first)) continue;
          if (/[<>*{}$|]/.test(tok) || /\.\.\./.test(tok)) continue;   // placeholders and globs
          const clean = tok.replace(/\/+$/, '').replace(/:\d+(-\d+)?$/, '');
          if (exists(path.join(ROOT, clean)) || gitIgnored(clean)) continue;
          bad.push(`${r}:${n}  \`${m[1]}\``);
        }
      }
    }
    assertNone(bad, 'mapped path(s) that do not exist');
    return `${docs.length} docs`;
  });

  check('CLAUDE.md routes "find a file" to docs/FILE_STRUCTURE.md and stays <= 150 lines', () => {
    const t = readText('CLAUDE.md') || '';
    assert(t.includes('docs/FILE_STRUCTURE.md'), 'CLAUDE.md does not link docs/FILE_STRUCTURE.md');
    const lines = t.split('\n').length - (t.endsWith('\n') ? 1 : 0);
    assert(lines <= 150, `CLAUDE.md is ${lines} lines; the L1 router cap is 150 (.claude/hooks/guard-file-writes.sh)`);
    return `${lines} lines`;
  });
}

// ── 8. ignore coverage ────────────────────────────────────────────────────────

function ignoreChecks() {
  console.log('\n8. Output and vendor paths are still gitignored after nesting');
  check('every generated location is ignored at its new depth', () => {
    const must = [
      'node_modules/x', 'gates/node_modules/x', 'media/fashion-tech/avatar/node_modules/x',
      'media/drawing-room-video/node_modules/x', 'media/video_production/x.mp4', 'media/updated/x.mp4',
      'media/voiceovers/x.wav', 'media/recordings/x.mp4', 'media/course-overview-video-output/x.mp4',
      'media/blender/Blender/x', 'content/published/x', 'content/review_queue/x',
      'legacy/python/__pycache__/x.pyc', '.env',
    ];
    const bad = must.filter((p) => !gitIgnored(p));
    assertNone(bad.map((p) => `${p}  (git would offer this for commit)`), 'path(s) no longer ignored');
    return `${must.length} paths`;
  });
}

// ── 9. every Node module loads ────────────────────────────────────────────────

async function moduleChecks() {
  console.log('\n9. Every Node module loads, and every relative require() resolves');

  await checkAsync('server/lib, orchestrator/lib and the stages all load', async () => {
    const files = [
      ...walk(path.join(ROOT, 'server'), (r) => r.endsWith('.js')),
      ...walk(path.join(ROOT, 'orchestrator', 'lib'), (r) => r.endsWith('.js')),
    ];
    // A child process: some modules start work on load, and a clean exit here
    // proves they also let go of it.
    const script = `
      const path = require('path'); const out = [];
      for (const f of JSON.parse(process.argv[1])) {
        try { require(path.join(process.cwd(), f)); out.push([f, null]); }
        catch (e) { out.push([f, (e && e.message || String(e)).split('\\n')[0]]); }
      }
      process.stdout.write(JSON.stringify(out)); process.exit(0);`;
    const env = { JOB_STORE_DIR: tmpDir('mods'), EXPLAINER_VIDEOS_DIR: tmpDir('modv'), TICK_INTERVAL_MS: '0', COURSE_AUTO_RESUME: '0' };
    const r = await runChild(process.execPath, ['-e', script, JSON.stringify(files)], { env, timeoutMs: 60000 });
    assert(r.code === 0, `loader exited ${r.code}: ${r.err.slice(0, 400)}`);
    const results = JSON.parse(r.out);
    assertNone(results.filter(([, e]) => e).map(([f, e]) => `${f}: ${e}`), 'module(s) failed to load');
    return `${results.length} modules`;
  });

  await checkAsync('every JS file outside the service still parses (node --check)', async () => {
    const roots = ['legacy/node', 'media', 'content', 'scripts', 'prototypes', 'gates', 'evals', '.claude/scripts'];
    const files = [];
    for (const d of roots) for (const r of walk(path.join(ROOT, d), (x) => /\.(c?js)$/.test(x))) files.push(r);
    const bad = [];
    // One process per chunk: `node --check` takes a single file.
    const chunks = [];
    for (let i = 0; i < files.length; i += 24) chunks.push(files.slice(i, i + 24));
    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (f) => {
        const r = await runChild(process.execPath, ['--check', f], { timeoutMs: 30000 });
        if (r.code !== 0) bad.push(`${f}: ${(r.err.split('\n').find((l) => /Error/.test(l)) || r.err).trim().slice(0, 160)}`);
      }));
    }
    assertNone(bad, 'file(s) that no longer parse');
    return `${files.length} files`;
  });

  check("every literal relative require() resolves from the file's new location", () => {
    const bad = [];
    const tryResolve = (base) => ['', '.js', '.json', '.cjs', '/index.js'].some((ext) => exists(base + ext));
    for (const r of codeFiles().filter((x) => /\.(c?js|mjs)$/.test(x))) {
      const text = readText(r);
      if (!text) continue;
      const dir = path.dirname(path.join(ROOT, r));
      text.split(/\r?\n/).forEach((line, i) => {
        if (/^\s*\/\//.test(line)) return;
        for (const m of line.matchAll(/require\(\s*(['"])(\.{1,2}\/[^'"]+)\1\s*\)/g)) {
          if (insideString(line, m.index)) continue; // source text being searched, or code run from another cwd
          if (!tryResolve(path.resolve(dir, m[2]))) bad.push(`${r}:${i + 1}  require('${m[2]}')`);
        }
        for (const m of line.matchAll(/require\(\s*path\.(?:join|resolve)\(\s*__dirname\s*((?:,\s*(['"])[^'"]+\3\s*)+)\)\s*\)/g)) {
          if (insideString(line, m.index)) continue;
          const target = path.resolve(dir, ...literalsOf(m[1]));
          if (!tryResolve(target)) bad.push(`${r}:${i + 1}  require(path.join(__dirname, ...)) -> ${rel(target)}`);
        }
      });
    }
    assertNone(bad, 'unresolvable require(s)');
    return 'all resolve';
  });

  check('every puppeteer candidate list has at least one candidate that resolves', () => {
    const bad = [];
    let lists = 0;
    for (const r of codeFiles().filter((x) => /\.(c?js)$/.test(x))) {
      const text = readText(r);
      if (!text || !text.includes('node_modules/puppeteer')) continue;
      const dir = path.dirname(path.join(ROOT, r));
      for (const m of text.matchAll(/\[([^\]]*node_modules\/puppeteer[^\]]*)\]/g)) {
        lists++;
        const ok = literalsOf(m[1]).some((c) => {
          try { require.resolve(c.startsWith('.') ? path.resolve(dir, c) : c, { paths: [dir, ROOT] }); return true; } catch { return false; }
        });
        if (!ok) bad.push(`${r}  (none of: ${literalsOf(m[1]).join(', ')})`);
      }
    }
    assertNone(bad, 'puppeteer list(s) with no working candidate');
    return lists ? `${lists} lists` : skip('no candidate lists found');
  });
}

// ── 10. the HTTP API ──────────────────────────────────────────────────────────

async function httpChecks() {
  console.log('\n10. The HTTP API boots in-process and every route is wired');

  await checkAsync('free routes answer, token routes answer with a token, paid routes refuse without one', async () => {
    const env = freshEnv();
    const store = require(path.join(ROOT, 'server', 'lib', 'job-store')).open({ dir: env.JOB_STORE_DIR, env });
    return withServer(env, { oneVideo: fakePipeline(), store }, async (port) => {
      const auth = { authorization: `Bearer ${LMS_TOKEN}` };
      const bad = [];
      const expect = async (label, opts, ok) => {
        const res = await req(port, opts);
        if (!ok(res.status, res)) bad.push(`${label}: ${opts.method || 'GET'} ${opts.path} -> ${res.status} ${res.text.slice(0, 120).replace(/\s+/g, ' ')}`);
        return res;
      };
      const is = (...codes) => (s) => codes.includes(s);

      const h = await expect('health', { path: '/health' }, is(200, 503));
      if (h.json) {
        if (h.json.storage && h.json.storage.error) bad.push(`health: storage block errored: ${h.json.storage.error}`);
        if (h.json.courses && h.json.courses.error) bad.push(`health: courses block errored: ${h.json.courses.error}`);
        if (!h.json.contractVersion) bad.push('health: no contractVersion');
      } else bad.push('health: body is not JSON');

      // Free pages. A 404 here means a file the route serves has moved.
      await expect('root', { path: '/' }, is(200));
      await expect('demo redirect', { path: '/demo' }, is(301, 302, 303, 307, 308));
      for (const p of ['/demo/quiz', '/demo/course-builder', '/demo/make-a-video']) await expect('page', { path: p }, is(200));
      await expect('api index', { path: '/api/v1/' }, is(200));
      await expect('api health', { path: '/api/v1/health' }, is(200));

      // Token-gated reads: must work WITH the token, and be refused without it.
      for (const p of ['/api/v1/videos', '/api/v1/deliverables', '/demo/jobs', '/demo/spend', '/demo/videos']) {
        await expect('token read', { path: p, headers: auth }, is(200));
        await expect('token read, no token', { path: p }, (s) => s === 401 || s === 403);
      }

      // Anything that spends or publishes must refuse an anonymous caller.
      const paid = [
        ['POST', '/api/v1/courses/plan'], ['POST', '/api/v1/courses/build'],
        ['POST', '/api/v1/courses/worker/resume'], ['POST', '/api/v1/admin/reset'],
        ['POST', '/demo/make-video/layout-probe/produce'], ['POST', '/demo/make-video/layout-probe/approve'],
        ['POST', '/demo/course-builder/build'], ['POST', '/tick'],
      ];
      for (const [method, p] of paid) {
        await expect('paid route, anonymous', { method, path: p, body: {} }, (s) => s === 401 || s === 403);
      }
      assertNone(bad, 'route(s) misbehaving');
      return `${8 + 10 + paid.length} requests`;
    });
  });
}

// ── 11. the pipeline wires together ───────────────────────────────────────────

const DRY_BEATS = [
  { id: '01', mode: 'scene', vo: 'Ali opens the weekly report and the totals do not add up.', cap: 'The totals are wrong', art: 'a teacher at a wooden desk reading a printed report, flat illustration, cream background' },
  { id: '02', mode: 'info', vo: 'He checks each column against the source sheet, one row at a time.', cap: 'Check against the source', info: { tpl: 'statement', data: { text: 'Check each column against the source.', hi: 'source' } } },
  { id: '03', mode: 'checkpoint', quiz: { stem: 'What should Ali check first?', options: ['The font', 'The source sheet'], answer: 1, correctNote: 'Right: the numbers come from the source.', explain: 'Formatting cannot change a total. The source data can.' } },
  { id: '04', mode: 'info', vo: 'The mismatch was one copied formula, and now he knows where to look.', cap: 'One copied formula', info: { tpl: 'statement', data: { text: 'One copied formula broke the total.', hi: 'copied formula' } } },
];

/** Runs the spine in a child, dry, with every file it writes redirected to a temp dir. */
function spineScript() {
  return `
    const path = require('path'); const fs = require('fs');
    const ROOT = process.cwd(); const tmp = process.env.LAYOUT_TMP;
    const { PATHS } = require(path.join(ROOT, 'orchestrator/lib/paths'));
    PATHS.beads = path.join(tmp, 'beads'); PATHS.runsDir = path.join(tmp, 'runs');
    for (const k of ['runsLog','failuresLog','improvementsLog','qaRatingsLog']) PATHS[k] = path.join(tmp, 'beads', k + '.jsonl');
    const spine = require(path.join(ROOT, 'orchestrator/lib/spine'));
    const beats = JSON.parse(process.env.LAYOUT_BEATS);
    const item = { id: 'layout/probe', series: 'layout', slug: 'probe', topic: 'Layout probe' };
    const summarise = (st) => Object.fromEntries(Object.entries(st.stages).map(([n, s]) => [n, [s.status, s.error ? String(s.error).replace(/\\s+/g, ' ').slice(0, 600) : null]]));
    (async () => {
      const out = {};
      const a = await spine.executeStages(item, { dryRun: true, quiet: true, stopAfter: 'script' });
      out.head = { status: a.status, stages: summarise(a) };
      const b = await spine.executeStages({ ...item, slug: 'probe2', id: 'layout/probe2' }, {
        dryRun: true, quiet: true, stopAfter: 'upload', fromStage: 'gate',
        seedArtifacts: { script: { title: 'Layout probe', beats, beatCount: beats.length, handWritten: true } },
        scriptApproved: true, reviewApproved: true });
      out.tail = { status: b.status, stages: summarise(b) };
      process.stdout.write('\\n@@' + JSON.stringify(out)); process.exit(0);
    })().catch((e) => { process.stdout.write('\\n@@' + JSON.stringify({ threw: e.message })); process.exit(0); });`;
}

async function pipelineChecks() {
  console.log('\n11. The explainer pipeline wires together (dry run: no calls, no spend, no repo writes)');
  const { PATHS } = require(path.join(ROOT, 'orchestrator', 'lib', 'paths'));

  check('every script produce.js runs exists in the skill templates', () => {
    const src = readText('orchestrator/lib/stages/produce.js') || '';
    const names = new Set([...src.matchAll(/['"]([\w-]+\.(?:js|py))['"]/g)].map((m) => m[1])
      .filter((n) => !/^(beats|durations|package)\./.test(n)));
    assert(names.size >= 10, `found only ${names.size} script names in produce.js -- the sweep is broken`);
    const missing = [...names].filter((n) => !exists(path.join(PATHS.videoTemplates, n)) && !exists(path.join(PATHS.brandBumpers, n)));
    assertNone(missing.map((n) => `${n}  (not in ${rel(PATHS.videoTemplates)}/)`), 'template script(s) missing');
    return `${names.size} scripts`;
  });

  check('the brand bumpers the deliverable is wrapped in are present', () => {
    const need = ['render-bumpers.js', 'bumper.html', 'config.js', 'package.json', 'brand'];
    const missing = need.filter((n) => !exists(path.join(PATHS.brandBumpers, n)));
    assertNone(missing.map((n) => `${rel(PATHS.brandBumpers)}/${n}`), 'bumper file(s) missing');
    return `${need.length} present`;
  });

  let spine = null;
  await checkAsync('the spine runs every stage in dry run', async () => {
    const env = {
      LAYOUT_TMP: tmpDir('spine'), LAYOUT_BEATS: JSON.stringify(DRY_BEATS),
      EXPLAINER_VIDEOS_DIR: tmpDir('spinev'), JOB_STORE_DIR: tmpDir('spines'),
      TICK_INTERVAL_MS: '0', PIPELINE_BUDGET_USD: '0',
    };
    const before = gitOk ? git(['status', '--porcelain', '--', 'orchestrator', 'explainer-videos', '.beads']) : '';
    const r = await runChild(process.execPath, ['-e', spineScript()], { env, timeoutMs: 240000 });
    const after = gitOk ? git(['status', '--porcelain', '--', 'orchestrator', 'explainer-videos', '.beads']) : '';
    const at = r.out.lastIndexOf('@@');
    assert(at !== -1, `the spine probe printed no result (exit ${r.code}): ${r.err.slice(-400)}`);
    spine = JSON.parse(r.out.slice(at + 2));
    assert(!spine.threw, `the spine threw: ${spine.threw}`);
    assert(before === after, `the dry run wrote inside the repo:\n${after}`);
    const tail = spine.tail.stages;
    const wanted = ['gate', 'script-approval', 'references', 'produce', 'qa', 'review', 'upload'];
    const bad = wanted.filter((s) => !tail[s] || tail[s][0] !== 'done').map((s) => `${s}: ${tail[s] ? tail[s].join(' -- ') : 'never ran'}`);
    if (!spine.head.stages.research || spine.head.stages.research[0] !== 'done') bad.unshift(`research: ${JSON.stringify(spine.head.stages.research)}`);
    assertNone(bad, 'stage(s) that did not complete in dry run');
    return `research + ${wanted.length} stages done, repo untouched`;
  });

  check("the script stage's own dry-run fixture passes the checkpoint rule", () => {
    if (!spine) return skip('the spine probe did not run');
    const s = spine.head.stages.script;
    if (s && s[0] === 'done') return 'passes';
    if (s && /CHECKPOINT/i.test(String(s[1]))) {
      return skip('PRE-EXISTING, not the reorg: orchestrator/lib/stages/script.js dryRunValue still uses an '
        + "'info' quiz beat instead of mode:'checkpoint', so `run.js run --dry-run` stops at `script`. "
        + 'This check upgrades itself to PASS once that fixture carries a checkpoint beat.');
    }
    throw new Error(`script stage in dry run: ${JSON.stringify(s)}`);
  });

  await checkAsync('preflight runs (its findings are the machine, not the layout)', async () => {
    const pf = require(path.join(ROOT, 'orchestrator', 'lib', 'preflight'));
    const r = await pf.check({ videoDir: tmpDir('pf') });
    const notOk = r.results.filter((x) => x.ok === false).map((x) => x.name);
    return notOk.length ? `ran; this machine lacks: ${notOk.join(', ')}` : 'ran; all green';
  });
}

// ── 12. the Python layer ──────────────────────────────────────────────────────

const PY_PROBE = `
import sys, json, importlib, pkgutil, os
root = sys.argv[1]
sys.path.insert(0, os.path.join(root, 'legacy', 'python'))
out = {'constants': None, 'imports': []}
import config
out['constants'] = {k: str(getattr(config, k)) for k in ['BASE_DIR','MEDIA_DIR','CONTENT_DIR','RECORDINGS_DIR','DRAFTS_DIR','PUBLISHED_DIR','REVIEW_DIR','ARTIFACTS_DIR','PROMPTS_DIR','VIDEO_PRODUCTION_DIR']}
mods = ['config','logger','schemas','memory_manager','orchestrator']
for pkg in ['agents','skills','utils']:
    d = os.path.join(root, 'legacy', 'python', pkg)
    mods += [pkg + '.' + m.name for m in pkgutil.iter_modules([d])]
for m in mods:
    try:
        importlib.import_module(m); out['imports'].append([m, None, None])
    except ModuleNotFoundError as e:
        out['imports'].append([m, 'missing', e.name])
    except Exception as e:
        out['imports'].append([m, 'error', (type(e).__name__ + ': ' + str(e)).splitlines()[0][:200]])
print('@@' + json.dumps(out))
`;

async function pythonChecks() {
  console.log('\n12. The Python layer imports from legacy/python and nothing reaches for the root');
  const py = pythonCmd();
  if (!py) {
    for (const n of ['config.py resolves to the repo root', 'library modules import', 'main.py --dry-run', 'pytest collects only tests/']) {
      report(n, skip('no Python 3 on PATH (py/python)'));
    }
    return;
  }

  let probe = null;
  await checkAsync('config.py resolves to the repo root (asserted as strings: importing it mkdirs them)', async () => {
    const r = await runChild(py, ['-c', PY_PROBE, ROOT], { timeoutMs: 120000, env: { PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' } });
    const at = r.out.lastIndexOf('@@');
    assert(at !== -1, `probe printed nothing (exit ${r.code}): ${r.err.slice(-500)}`);
    probe = JSON.parse(r.out.slice(at + 2));
    const c = probe.constants;
    const want = {
      BASE_DIR: ROOT, MEDIA_DIR: path.join(ROOT, 'media'), CONTENT_DIR: path.join(ROOT, 'content'),
      RECORDINGS_DIR: path.join(ROOT, 'media', 'recordings'), DRAFTS_DIR: path.join(ROOT, 'content', 'drafts'),
      PUBLISHED_DIR: path.join(ROOT, 'content', 'published'), REVIEW_DIR: path.join(ROOT, 'content', 'review_queue'),
      ARTIFACTS_DIR: path.join(ROOT, 'content', 'weekly_artifacts'), PROMPTS_DIR: path.join(ROOT, 'prompts'),
      VIDEO_PRODUCTION_DIR: path.join(ROOT, 'media', 'video_production'),
    };
    const norm = (p) => path.resolve(p).toLowerCase();
    const bad = Object.entries(want).filter(([k, v]) => norm(c[k]) !== norm(v)).map(([k, v]) => `${k} = ${c[k]}  (expected ${v})`);
    assertNone(bad, 'config constant(s) resolving to the wrong place');
    assert(!exists(path.join(ROOT, 'legacy', 'python', 'media')) && !exists(path.join(ROOT, 'legacy', 'python', 'content')),
      'importing config.py created legacy/python/media or /content -- BASE_DIR is anchored at the wrong depth');
    return 'BASE_DIR is the repo root; no forked tree';
  });

  check('every library module imports (a missing third-party package is named, not hidden)', () => {
    if (!probe) return skip('the probe did not run');
    const own = new Set(['config', 'logger', 'schemas', 'memory_manager', 'orchestrator', 'agents', 'skills', 'utils']);
    const broken = [];
    const thirdParty = new Map();
    for (const [m, kind, detail] of probe.imports) {
      if (!kind) continue;
      const top = kind === 'missing' ? String(detail).split('.')[0] : null;
      if (kind === 'missing' && !own.has(top) && !/^video_production/.test(top)) {
        thirdParty.set(top, (thirdParty.get(top) || []).concat(m));
      } else {
        broken.push(`${m}: ${kind === 'missing' ? `cannot find repo module '${detail}'` : detail}`);
      }
    }
    assertNone(broken, 'module(s) that no longer import -- a moved path, not a missing package');
    const ok = probe.imports.filter(([, k]) => !k).length;
    if (thirdParty.size) {
      // Say which fix applies: an unlisted package cannot be fixed by installing requirements.txt.
      const listed = new Set((readText('requirements.txt') || '').split(/\r?\n/)
        .map((l) => l.trim().split(/[<>=!~\[;\s]/)[0].toLowerCase()).filter(Boolean));
      return skip(`${ok}/${probe.imports.length} import. PRE-EXISTING, not the reorg -- missing packages: `
        + [...thirdParty].map(([pkg, ms]) => `'${pkg}' (${listed.has(pkg.toLowerCase()) ? 'in requirements.txt, not installed' : 'NOT listed in requirements.txt'}; `
          + `needed by ${ms.slice(0, 3).join(', ')}${ms.length > 3 ? '...' : ''})`).join('; '));
    }
    return `${ok} modules`;
  });

  await checkAsync('legacy/python/main.py --dry-run runs the weekly cycle (what CI runs)', async () => {
    const r = await runChild(py, [path.join('legacy', 'python', 'main.py'), '--dry-run'], { timeoutMs: 120000, env: { PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' } });
    assert(r.code === 0, `exit ${r.code}: ${(r.err || r.out).slice(-500)}`);
    assert(/PERCEIVE/.test(r.out) && /PLAN/.test(r.out), `no PERCEIVE/PLAN in the output: ${r.out.slice(0, 300)}`);
    return 'PERCEIVE ... PLAN';
  });

  await checkAsync('a bare pytest at the repo root collects only tests/', async () => {
    // Section 2 has already proved there is no test_*.py elsewhere, so this cannot import anything that spends.
    const stray = [...walk(ROOT, (r) => /(^|\/)(test_[^/]*|[^/]*_test)\.py$/.test(r))].filter((r) => !r.startsWith('tests/'));
    if (stray.length) return skip('refusing to run collection: a collectable script exists outside tests/ (section 2)');
    const r = await runChild(py, ['-m', 'pytest', '--collect-only', '-q', '-p', 'no:cacheprovider'], { timeoutMs: 120000, env: { PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' } });
    if (/No module named pytest/.test(r.err)) return skip('pytest is not installed');
    const ids = r.out.split(/\r?\n/).filter((l) => l.includes('::'));
    assert(ids.length > 0, `collected nothing (exit ${r.code}): ${(r.err || r.out).slice(-400)}`);
    const outside = ids.filter((l) => !l.startsWith('tests/'));
    assertNone(outside, 'test(s) collected outside tests/');
    return `${ids.length} tests, all under tests/`;
  });
}

// ── run ───────────────────────────────────────────────────────────────────────

(async () => {
  console.log('test-layout: the repo layout and the wiring that depends on it');
  try {
    tracked();
  } catch {
    console.log('  git is unavailable -- sections that need the index will fail');
  }

  rootChecks();
  resurrectionChecks();
  constantChecks();
  configChecks();
  scannerChecks();
  linkChecks();
  ignoreChecks();
  await moduleChecks();
  await httpChecks();
  await pipelineChecks();
  await pythonChecks();

  for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }

  console.log(`\n${'-'.repeat(64)}`);
  console.log(`  ${pass} passed, ${failures.length} failed` + (skipped ? `, ${skipped} skipped` : ''));
  if (failures.length) {
    for (const f of failures) console.log(`    - ${f.name}`);
    process.exitCode = 1;
  }
  // The HTTP section loads the whole server; do not let a stray handle hold the run open.
  setTimeout(() => process.exit(process.exitCode || 0), 500).unref();
})();

