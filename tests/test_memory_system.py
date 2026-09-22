"""Guards for the hot/warm/cold memory system.

These exist because of specific ways this kind of system rots quietly:

  - a budget restated in a second place drifts, and then one surface nags forever while the
    mechanism ignores it (the ported system ran 80 vs 300 for weeks)
  - rotation that is not idempotent rewrites the hot file on every run
  - a beads ingest that blacklists fixture strings silently starts eating test data
  - a hook registered under an event name that does not exist is indistinguishable from one
    that works

Run with `pytest tests/` — a bare `pytest` from the repo root collects ad-hoc root-level scripts
that fire live API calls at import.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
MEM = REPO / ".claude" / "memories"
HOOKS = REPO / ".claude" / "hooks"
DEFAULT_BUDGET = 300


def python_cmd():
    """The interpreter that actually runs. `python3` here is a Store stub that exits non-zero."""
    for c in ("py", "python", sys.executable):
        try:
            if subprocess.run([c, "-c", ""], capture_output=True, timeout=20).returncode == 0:
                return c
        except (OSError, subprocess.SubprocessError):
            continue
    pytest.skip("no usable python interpreter found")


# --------------------------------------------------------------- structure

def test_store_exists():
    assert MEM.is_dir()
    assert (MEM / "active-session.md").exists()
    assert (MEM / "MEMORY-INDEX.md").exists()
    assert (MEM / "session-archive").is_dir()
    assert (REPO / ".claude" / "standards" / "MEMORY_TIERS.md").exists()
    assert (REPO / ".claude" / "memory-db" / "mem.py").exists()


def test_warm_files_carry_frontmatter():
    """Warm files are governed by the metadata contract; staleness is read from last_verified."""
    for name in ("lessons.md", "deployment.md", "phase-status.md",
                 "pipeline-mechanics.md", "product-context.md", "architecture.md"):
        t = (MEM / name).read_text(encoding="utf-8")
        assert t.startswith("---\n"), f"{name} has no frontmatter"
        assert re.search(r"^last_verified:\s*\d{4}-\d{2}-\d{2}$", t, re.M), f"{name} last_verified"
        assert re.search(r"^owner:\s*\S+", t, re.M), f"{name} owner"


def test_hot_and_cold_files_have_no_frontmatter():
    """They are machine-managed, and validate-after-write.sh exempts them. If that changes, the
    exemption and this test must change together."""
    assert not (MEM / "active-session.md").read_text(encoding="utf-8").startswith("---\n")


# --------------------------------------------------------------- the budget

def test_budget_is_never_restated():
    """Every surface must READ DR_ACTIVE_SESSION_BUDGET, never hardcode its value.

    A second copy of the number is the bug: the two disagree, the stricter one fires on every
    turn, and a hook that always fires teaches the reader to skip all hook output.
    """
    surfaces = [
        HOOKS / "_memory-lib.sh",
        HOOKS / "rotate-active-session.sh",
        HOOKS / "session-start.sh",
        REPO / ".claude" / "scripts" / "audit-memory.py",
    ]
    definers = 0
    for p in surfaces:
        t = p.read_text(encoding="utf-8")
        assert "DR_ACTIVE_SESSION_BUDGET" in t or "BUDGET_LINES" in t, f"{p.name} ignores the budget"
        for line in t.splitlines():
            if not re.search(r"\b" + str(DEFAULT_BUDGET) + r"\b", line):
                continue
            if line.strip().startswith("#"):
                continue          # prose about the number, not a second copy of it
            # The number may appear ONLY on a line that reads the env var, i.e. supplies its
            # default. Anywhere else is a second source of truth, and the two will drift.
            assert "DR_ACTIVE_SESSION_BUDGET" in line, \
                f"{p.name} hardcodes {DEFAULT_BUDGET}: {line.strip()}"
            definers += 1
    assert definers <= 2, f"the default is stated in {definers} places; expected 1-2"


def test_thresholds_match_the_standard():
    """session-start.sh, audit-memory.py and MEMORY_TIERS.md must agree on freshness."""
    std = (REPO / ".claude" / "standards" / "MEMORY_TIERS.md").read_text(encoding="utf-8")
    declared = dict(re.findall(r"^\| `([a-z-]+\.md)` \| (\d+) days \|", std, re.M))
    assert declared, "MEMORY_TIERS.md 2 has no threshold table"

    hook = (HOOKS / "session-start.sh").read_text(encoding="utf-8")
    in_hook = dict(re.findall(r'"([a-z-]+\.md):(\d+)"', hook))
    assert in_hook, "session-start.sh has no threshold list"

    audit = (REPO / ".claude" / "scripts" / "audit-memory.py").read_text(encoding="utf-8")
    in_audit = dict(re.findall(r'"([a-z-]+\.md)":\s*(\d+)', audit))

    for name, days in declared.items():
        assert in_hook.get(name) == days, f"{name}: standard says {days}d, hook says {in_hook.get(name)}"
        assert in_audit.get(name) == days, f"{name}: standard says {days}d, audit says {in_audit.get(name)}"


# --------------------------------------------------------------- rotation

def _seed(root, sections=4, lines_each=100):
    mem = root / ".claude" / "memories" / "session-archive"
    mem.mkdir(parents=True)
    (root / ".claude" / "hooks").mkdir(parents=True)
    for f in ("_memory-lib.sh", "rotate-active-session.sh"):
        (root / ".claude" / "hooks" / f).write_bytes((HOOKS / f).read_bytes())
    out = ["# Active Session\n", "\n", "## NEXT_STEPS\n", "- resume this\n", "\n"]
    for i in range(sections):
        d = f"2026-09-{i + 1:02d}"
        out.append(f"## {d} — section {i}\n")
        out += [f"line {j} of {d}\n" for j in range(lines_each)]
        out.append("\n")
    (root / ".claude" / "memories" / "active-session.md").write_text("".join(out), encoding="utf-8")
    return root / ".claude" / "memories" / "active-session.md"


def _posix(p):
    r"""Git Bash needs /c/x, not C:\x — a Windows path reaches CreateProcess verbatim and fails
    with an unhelpful UTF-16 'cannot find the file specified'."""
    s = str(p).replace("\\", "/")
    if len(s) > 1 and s[1] == ":":
        s = "/" + s[0].lower() + s[2:]
    return s


def bash_cmd():
    r"""Resolve a bash that actually runs.

    A bare "bash" from subprocess on this machine resolves to a Windows stub that fails with a
    UTF-16 "The system cannot find the file specified." — the same trap as `python3` being a
    Store alias (lessons.md H1). Probe by running --version, never by trusting the name.
    """
    import shutil
    candidates = [shutil.which("bash"),
                  r"C:\Program Files\Git\bin\bash.exe",
                  r"C:\Program Files\Git\usr\bin\bash.exe",
                  "bash"]
    for c in candidates:
        if not c:
            continue
        try:
            r = subprocess.run([c, "--version"], capture_output=True, text=True, timeout=30)
            if r.returncode == 0 and "GNU bash" in (r.stdout or ""):
                return c
        except (OSError, subprocess.SubprocessError):
            continue
    pytest.skip("no working bash found")


def _rotate(root, *args):
    script = root / ".claude" / "hooks" / "rotate-active-session.sh"
    env = dict(os.environ, DR_REPO_ROOT=_posix(root))
    # Importing tests/test_signal_intake.py loads .env, which sets RAILWAY_ENVIRONMENT=production
    # into the whole pytest process. That is the hooks' kill switch, so inheriting it makes every
    # hook a silent no-op — and the tests then pass or fail depending on collection order alone.
    # A hook test must set the kill switch deliberately, never inherit it.
    env.pop("RAILWAY_ENVIRONMENT", None)
    return subprocess.run([bash_cmd(), _posix(script), *args],
                          capture_output=True, text=True, env=env, timeout=120)


def test_kill_switch_stops_the_hooks(tmp_path):
    """The flip side of the above: when RAILWAY_ENVIRONMENT *is* set, nothing may run."""
    active = _seed(tmp_path)
    before = active.read_bytes()
    script = tmp_path / ".claude" / "hooks" / "rotate-active-session.sh"
    env = dict(os.environ, DR_REPO_ROOT=_posix(tmp_path), RAILWAY_ENVIRONMENT="production")
    r = subprocess.run([bash_cmd(), _posix(script)],
                       capture_output=True, text=True, env=env, timeout=120)
    assert r.returncode == 0
    assert active.read_bytes() == before, "the hook ran inside the container kill switch"


def test_rotation_moves_whole_sections_and_keeps_the_newest(tmp_path):
    active = _seed(tmp_path)
    assert _rotate(tmp_path).returncode == 0

    text = active.read_text(encoding="utf-8")
    assert len(text.splitlines()) <= DEFAULT_BUDGET
    assert "2026-09-04" in text, "rotation removed the newest section"
    assert "- resume this" in text, "rotation dropped NEXT_STEPS"

    archive = tmp_path / ".claude" / "memories" / "session-archive"
    moved = sorted(p.name for p in archive.glob("2026-*.md"))
    assert moved, "nothing was archived"
    for name in moved:
        # A section must arrive whole -- a half-section in the archive is unreadable and the
        # other half is gone.
        body = (archive / name).read_text(encoding="utf-8")
        assert body.count(f"line 0 of {name[:10]}") == 1
        assert body.count(f"line 99 of {name[:10]}") == 1


def test_rotation_is_idempotent(tmp_path):
    active = _seed(tmp_path)
    _rotate(tmp_path)
    after_first = active.read_bytes()
    r = _rotate(tmp_path)
    assert r.returncode == 0
    assert active.read_bytes() == after_first, "a second rotation rewrote the file"
    assert r.stdout.strip() == "", "a no-op rotation should be silent"


def test_rotation_refuses_without_dated_sections(tmp_path):
    """Guessing at a cut point would split a section in half. Staying over budget is better."""
    _seed(tmp_path, sections=0)
    active = tmp_path / ".claude" / "memories" / "active-session.md"
    active.write_text("# Active Session\n" + "filler\n" * 400, encoding="utf-8")
    before = active.read_bytes()
    r = _rotate(tmp_path)
    assert r.returncode == 0
    assert active.read_bytes() == before, "rotated a file with no safe boundary"
    assert "NO dated" in r.stderr


# --------------------------------------------------------------- the index

def test_beads_ingest_excludes_test_fixtures():
    """317 of 345 rows in failures.jsonl are fixtures. Whitelisting on shape (a failure_id, or an
    itemId outside test/) survives someone adding a new fixture; blacklisting marker strings
    does not."""
    src = (REPO / ".claude" / "memory-db" / "mem.py").read_text(encoding="utf-8")
    assert "TEST_ITEM" in src and "^(test|testing)/" in src

    db = REPO / ".claude" / "memory-db" / "agent-memory.db"
    if not db.exists():
        pytest.skip("index not built; run `mem.py rebuild`")
    import sqlite3
    conn = sqlite3.connect(str(db))
    leaked = conn.execute(
        "SELECT COUNT(*) FROM mistakes WHERE what LIKE '%test/%' OR what LIKE '%testing/%'"
    ).fetchone()[0]
    conn.close()
    assert leaked == 0, f"{leaked} test fixtures leaked into memory"


def test_rebuild_round_trips(tmp_path):
    """The .db is gitignored, so losing it must be a non-event."""
    py = python_cmd()
    env = dict(os.environ, DR_MEMORY_DB=str(tmp_path / "probe.db"))
    r = subprocess.run([py, str(REPO / ".claude" / "memory-db" / "mem.py"), "rebuild"],
                       capture_output=True, text=True, env=env, timeout=180)
    assert r.returncode == 0, r.stderr
    assert (tmp_path / "probe.db").exists()
    counts = dict(kv.strip().split(": ") for kv in r.stdout.strip().split("|"))
    assert int(counts["lessons"]) > 0, "rebuild found no lessons — check the heading parser"


def test_promotion_threshold_is_three():
    src = (REPO / ".claude" / "memory-db" / "mem.py").read_text(encoding="utf-8")
    assert "threshold=3" in src
    assert "lesson_provenance" in src, "no guard against promoting the same mistake twice"


def test_sqlite_is_concurrency_safe():
    """Two Claude sessions share this repo; the default busy_timeout of 0 fails instantly."""
    src = (REPO / ".claude" / "memory-db" / "mem.py").read_text(encoding="utf-8")
    assert "journal_mode=WAL" in src
    assert "busy_timeout" in src


def test_promotion_does_not_require_an_api_key():
    """There is no ANTHROPIC_API_KEY in this environment. The mechanism must still work."""
    src = (REPO / ".claude" / "memory-db" / "mem.py").read_text(encoding="utf-8")
    # Naming the key in a comment that explains why it is NOT used is fine. Reading it, or
    # reaching for the network, is not.
    for pattern in (r"environ\[.ANTHROPIC_API_KEY", r"environ\.get\(.ANTHROPIC_API_KEY",
                    r"api\.anthropic\.com", r"urllib\.request", r"^import requests"):
        assert not re.search(pattern, src, re.M), \
            f"promotion reaches for {pattern}; it must work without a key"


# --------------------------------------------------------------- wiring

def test_hooks_are_registered_under_real_event_names():
    """A hook under an event name that does not exist is silently ignored and looks identical to
    one that works. This list is from the published reference, verified 2026-09-21."""
    VALID = {
        "SessionStart", "SessionEnd", "UserPromptSubmit", "UserPromptExpansion",
        "PreToolUse", "PostToolUse", "PostToolUseFailure", "PostToolBatch",
        "PreCompact", "PostCompact", "Stop", "StopFailure", "Notification",
        "SubagentStart", "SubagentStop", "PermissionRequest", "PermissionDenied",
    }
    hooks = json.loads((REPO / ".claude" / "settings.json").read_text(encoding="utf-8"))["hooks"]
    unknown = set(hooks) - VALID
    assert not unknown, f"unknown hook events: {unknown}"


def test_every_memory_hook_is_registered_and_present():
    blob = (REPO / ".claude" / "settings.json").read_text(encoding="utf-8")
    for name in ("capture-tool-failures.sh", "capture-active-session-changes.sh",
                 "pre-compact.sh", "post-compact.sh", "prompt-submit.sh"):
        assert name in blob, f"{name} is not registered"
        assert (HOOKS / name).exists(), f"{name} is registered but missing"
    # These two are chained from session-end.sh rather than registered directly.
    end = (HOOKS / "session-end.sh").read_text(encoding="utf-8")
    assert "rotate-active-session.sh" in end
    assert "distill-memory.sh" in end


def test_wrappers_read_stdin_only_once():
    """stdin is a stream: two `jq` calls means the second reads EOF, the hook gets an empty
    argument, takes its guard, and exits 0 having done nothing. It looks exactly like success."""
    hooks = json.loads((REPO / ".claude" / "settings.json").read_text(encoding="utf-8"))["hooks"]
    for event, blocks in hooks.items():
        for block in blocks:
            for h in block.get("hooks", []):
                cmd = h.get("command", "")
                if cmd.count("jq ") > 1:
                    assert "$(cat)" in cmd, \
                        f"{event}: multiple jq calls without buffering stdin first"
                    # `read` stops at the first newline and would truncate multi-line tool output.
                    assert "| read " not in cmd, f"{event}: uses `read` instead of `cat`"


def test_hooks_are_inert_in_the_container():
    for p in HOOKS.glob("*.sh"):
        t = p.read_text(encoding="utf-8")
        if "_memory-lib.sh" in t or p.name == "_memory-lib.sh":
            assert "RAILWAY_ENVIRONMENT" in (HOOKS / "_memory-lib.sh").read_text(encoding="utf-8")
            break


def test_memory_db_is_gitignored():
    """Committing it would be unmergeable across two sessions and would bloat history for a file
    `mem.py rebuild` regenerates."""
    r = subprocess.run(["git", "check-ignore", ".claude/memory-db/agent-memory.db"],
                       cwd=REPO, capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, "the SQLite index is not gitignored"
