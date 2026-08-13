'use strict';
/**
 * Child-process helper for stages that drive the real video pipeline.
 *
 * Uses spawn with an argv array, never a shell string. The project path
 * contains a space ("Content Queen"); shelling out via a concatenated string is
 * precisely the bug class that left the health-check scheduler dead for three
 * months (ILHAM 5.2). An argv array cannot split on whitespace.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Resolve a bare command name to a real executable on Windows.
 *
 * `npm` on Windows is `npm.cmd`; spawning "npm" with shell:false is ENOENT.
 * The usual fix -- shell:true -- is wrong here: the project path contains a
 * space ("Content Queen"), and a shell re-parses the command string and splits
 * on it. So resolve the name against PATH + PATHEXT ourselves and keep passing
 * an argv array.
 */
function resolveCommand(cmd) {
  if (process.platform !== 'win32') return cmd;
  if (cmd.includes(path.sep) || cmd.includes('/') || path.isAbsolute(cmd)) return cmd;
  if (path.extname(cmd)) return cmd;

  // Interpreters that may be installed but not on PATH. Windows installs Python
  // per-user by default and does not add it to PATH unless the installer box was
  // ticked -- so `python` being absent from PATH does not mean it is absent.
  for (const candidate of EXTRA_LOOKUP[cmd] || []) {
    try { if (fs.existsSync(candidate)) return candidate; } catch { /* keep looking */ }
  }

  const exts = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean);
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, cmd + ext);
      try {
        if (fs.existsSync(candidate)) return candidate;
      } catch { /* unreadable PATH entry -- keep looking */ }
    }
  }
  return cmd; // let spawn report ENOENT with the original name
}

// Known off-PATH (or better-than-PATH) executable locations, checked BEFORE PATH.
const LOCALAPPDATA = process.env.LOCALAPPDATA || '';
const APPDATA = process.env.APPDATA || '';
const EXTRA_LOOKUP = {
  python: LOCALAPPDATA ? [
    path.join(LOCALAPPDATA, 'Programs', 'Python', 'Python314', 'python.exe'),
    path.join(LOCALAPPDATA, 'Programs', 'Python', 'Python313', 'python.exe'),
    path.join(LOCALAPPDATA, 'Programs', 'Python', 'Python312', 'python.exe'),
    path.join(LOCALAPPDATA, 'Programs', 'Python', 'Python311', 'python.exe'),
  ] : [],

  // `claude` on PATH is claude.cmd, a batch wrapper -- and batch wrappers need
  // shell:true, which re-splits arguments. A prompt is nothing but spaces, so
  // that route is unusable. The .cmd merely calls this .exe, so target it
  // directly and keep shell:false.
  claude: [
    process.env.CLAUDE_CLI_PATH,
    APPDATA && path.join(APPDATA, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'),
    LOCALAPPDATA && path.join(LOCALAPPDATA, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'),
  ].filter(Boolean),
};

class CommandError extends Error {
  constructor(message, { code, stdout, stderr, cmd }) {
    super(message);
    this.name = 'CommandError';
    this.code = code;
    this.stdout = stdout;
    this.stderr = stderr;
    this.cmd = cmd;
  }
}

/**
 * @param {string}   cmd       executable (e.g. 'node', 'python')
 * @param {string[]} args      argv, each element passed through untouched
 * @param {object}   opts      { cwd, env, timeoutMs, onLine, dryRun }
 * @returns {Promise<{code, stdout, stderr, cmd, skipped?}>}
 */
function run(cmd, args, opts = {}) {
  const {
    cwd,
    env = process.env,
    timeoutMs = 30 * 60 * 1000,   // art + render stages are genuinely slow
    onLine = null,
    dryRun = false,
    input = null,                 // written to the child's stdin, which is then closed
  } = opts;

  const printable = `${cmd} ${args.join(' ')}`;

  if (dryRun) {
    return Promise.resolve({ code: 0, stdout: '', stderr: '', cmd: printable, skipped: true });
  }

  const exe = resolveCommand(cmd);

  // Node 20+ refuses to spawn .cmd/.bat without shell:true (CVE-2024-27980), so
  // batch wrappers like npm.cmd need it. That re-introduces shell word-splitting
  // on the ARGUMENTS, so refuse rather than silently mis-split. `cwd` is passed
  // as an option and never through the command line, so a space in the project
  // path stays safe either way.
  const isBatch = /\.(cmd|bat)$/i.test(exe);
  if (isBatch) {
    const unsafe = args.find((a) => /[\s"'`&|<>^]/.test(String(a)));
    if (unsafe !== undefined) {
      return Promise.reject(new CommandError(
        `Refusing to run batch wrapper '${exe}' with argument ${JSON.stringify(unsafe)}: ` +
        `it needs shell:true on Windows, which would re-split that argument.`,
        { code: null, stdout: '', stderr: '', cmd: printable }
      ));
    }
  }

  // Under shell:true the EXECUTABLE PATH is also re-split on whitespace, and
  // npm.cmd normally lives in "C:\Program Files\nodejs" -- so an unquoted path
  // fails with `'C:\Program' is not recognized`. Same defect that left the
  // health-check scheduler dead for three months; quote the path.
  const spawnTarget = isBatch ? `"${exe}"` : exe;

  return new Promise((resolve, reject) => {
    const child = spawn(spawnTarget, args, {
      cwd,
      env,
      // shell:false everywhere except batch wrappers, which Windows requires.
      shell: isBatch,
      windowsHide: true,
    });

    // Close the child's stdin immediately unless we have something to send.
    // Left open, a CLI that reads stdin (the `claude` CLI does) sits waiting for
    // input that will never arrive, warns, and then behaves as if degraded.
    if (child.stdin) {
      if (input !== undefined && input !== null) child.stdin.end(String(input));
      else child.stdin.end();
    }

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    const feed = (buf, sink) => {
      const text = buf.toString();
      if (sink === 'out') stdout += text; else stderr += text;
      if (onLine) for (const line of text.split(/\r?\n/)) if (line.trim()) onLine(line, sink);
    };

    child.stdout.on('data', (b) => feed(b, 'out'));
    child.stderr.on('data', (b) => feed(b, 'err'));

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new CommandError(
        `Failed to spawn '${cmd}': ${err.message}`,
        { code: null, stdout, stderr, cmd: printable }
      ));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        return reject(new CommandError(
          `Timed out after ${timeoutMs}ms: ${printable}`,
          { code: null, stdout, stderr, cmd: printable }
        ));
      }
      if (code !== 0) {
        // Tail the stderr into the message: the stage log is often the only
        // thing a later reader has, and "exit 1" alone is not diagnosable.
        const tail = (stderr || stdout).trim().split(/\r?\n/).slice(-8).join('\n');
        return reject(new CommandError(
          `Exit ${code}: ${printable}\n${tail}`,
          { code, stdout, stderr, cmd: printable }
        ));
      }
      resolve({ code, stdout, stderr, cmd: printable });
    });
  });
}

module.exports = { run, resolveCommand, CommandError };
