---
name: this-machine
description: The environment traps on this Windows box - a python3 that answers Python was not found because it is a Microsoft Store stub, Git Bash versus a bash stub, /tmp not existing for native programs, MSYS path rewriting, cp1252 Unicode crashes, a stopped Docker daemon, and Node 20 against tools that need 22. Use before writing any shell script, hook, or code that shells out, and whenever a command fails in a way that looks like a code bug but smells like the environment - ENOENT on a path that exists, a syntax error in a valid file, charmap or UnicodeEncodeError, or a tool that works in one shell and not another.
type: skill
last_verified: 2026-09-23
owner: aroma
---

# This machine

Verified by probe on 2026-09-23. Re-probe before trusting any number here; the commands are given
so you can.

| Thing | Value here |
|---|---|
| `python3` | **Microsoft Store stub** - not Python |
| `py`, `python` | Python 3.13.6 |
| `bash` | GNU bash 5.3.9 (x86_64-pc-cygwin), via Git Bash |
| `node` / `npm` | v20.19.0 / 10.8.2 |
| `git` | 2.54.0.windows.1 |
| `docker` | CLI 29.6.1 present, **daemon not running** |
| `jq` | 1.8.1 |
| Bash `/tmp` | `C:\Users\TBD-AR\AppData\Local\Temp` - invisible to native programs |

## 1. Probe interpreters by running them, never by looking them up

`command -v python3` succeeds here. Running it does not.

```
$ python3 --version
Python was not found; run without arguments to install from the Microsoft Store...
$ echo $?
49
```

The stub **exits non-zero and writes its complaint to stdout**, so `if ! python3 file.py` looks
exactly like a real syntax error. This made `validate-after-write.sh` flag every valid `.py` file
in the repo as broken.

```bash
PY=""
for c in py python; do "$c" --version >/dev/null 2>&1 && { PY="$c"; break; }; done
[ -n "$PY" ] || { echo "no python" >&2; exit 1; }
```

`.claude/hooks/_memory-lib.sh` already does this. Source it rather than re-implementing.

## 2. `bash` from a native program may not be Git Bash

`shutil.which("bash")` happily reports Git Bash, while `subprocess.run(["bash", ...])` resolves to a
different stub that fails with a **UTF-16** "The system cannot find the file specified." — a message
that will not even match a normal string comparison.

**Check the identity, not the presence:**

```bash
bash --version | head -1 | grep -q 'GNU bash' || { echo "not Git Bash" >&2; exit 1; }
```

In Python, call the absolute path (`C:/Program Files/Git/bin/bash.exe`), not `"bash"`.

## 3. `/tmp` does not exist for native programs

Bash maps `/tmp` to `C:\Users\TBD-AR\AppData\Local\Temp`. Node and Python do not.

```
$ node -e 'require("fs").writeFileSync("/tmp/probe.txt","x")'
node:fs:2368  ... throws
```

`node /tmp/x.js` works — Git Bash rewrites the *argument*. `fs.readFileSync('/tmp/x.txt')` inside
that same script does not — nothing rewrites a string literal.

**Use the session scratchpad** (a real Windows path), or convert:

```bash
WIN_TMP=$(cygpath -m /tmp)     # C:/Users/.../Temp
```

**Never hand a POSIX path across a process boundary.**

## 4. MSYS rewrites absolute paths passed to native executables

`railway ssh ls /data/cq-jobs` failed with `ls: cannot access 'C:/Program Files/Git/data/cq-jobs'`.
Git Bash rewrote `/data/...` on its way to a Windows binary.

```bash
MSYS_NO_PATHCONV=1 railway ssh ls /data/cq-jobs
```

Prefix any native exe that legitimately takes a POSIX-looking absolute path (railway, docker, ssh).

## 5. The console is cp1252 - non-ASCII output crashes Python

`UnicodeEncodeError: 'charmap' codec can't encode character '\u274c'` killed a pipeline stage over
a cross-mark in a log line.

```bash
export PYTHONIOENCODING=utf-8
py -X utf8 script.py
```

Prefer plain ASCII in anything a script prints.

## 6. Docker is not usable here - parity checks belong in CI

The CLI answers, the daemon does not:

```
$ docker info
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
```

Do not build a local production-parity harness. `scripts/pipeline-harness.sh` runs the render gates
in the production image; run it in CI, not here.

## 7. Node is 20.19.0 - some pinned tools want newer

`puppeteer-core@25.3.0` requires Node >= 22.12. If a Puppeteer step dies at import with an engine
complaint, that is the cause, not the code.

## 8. `git worktree` fails here

A committed `.chrome-profile` under `explainer-videos/` pushes paths past the Windows limit. Use
branches, not worktrees.

---

## References

- [`references/shell-escaping.md`](references/shell-escaping.md) — heredoc, template-literal and
  CRLF traps. Read before generating any patch script.
- [`references/hook-authoring.md`](references/hook-authoring.md) — the Claude Code hook contract.
  Read before editing anything in `.claude/hooks/` or `.claude/settings.json`.
