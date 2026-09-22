#!/usr/bin/env python
"""mem.py - the searchable index over Drawing Room's memory store.

This is an INDEX, not a source of truth. Every row in it can be reconstructed from
`.claude/memories/**` and `.beads/*.jsonl` by `mem.py rebuild`, which is why the .db file is
gitignored: a SQLite binary cannot be merged between two concurrent sessions, and its pages do
not delta-compress, so committing it on every session would bloat history permanently for a
file that can be regenerated in a second.

What it adds over grepping the markdown:
  - FTS5 search, so `session-start.sh` can surface the 3 lessons relevant to what you're resuming
  - confidence counters: re-encountering a lesson strengthens it AND resets its decay clock
  - retry counters: a mistake seen 3 times gets promoted into a written lesson
  - TTL decay, so stale rows stop surfacing without anyone deleting anything

Governance: .claude/standards/MEMORY_TIERS.md
"""

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

REPO = Path(os.environ.get("DR_REPO_ROOT", Path(__file__).resolve().parents[2]))
MEM = REPO / ".claude" / "memories"
DB_PATH = Path(os.environ.get("DR_MEMORY_DB", REPO / ".claude" / "memory-db" / "agent-memory.db"))

# How long a row stays trustworthy. Mirrors the decay schedule in MEMORY_TIERS.md §2.
TTL_DAYS = {
    "lesson": 365,   # confirmed patterns are stable
    "mistake": 90,   # a failure not seen in 90 days has probably been fixed
    "session": 90,   # the markdown archive stays the durable record
    "pattern": 730,
}

SCHEMA = """
CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'pattern',
    when_to_use TEXT,
    what TEXT NOT NULL,
    why TEXT,
    source TEXT,
    confidence INTEGER DEFAULT 1,
    sha256 TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now')),
    confirmed_at TEXT DEFAULT (datetime('now')),
    invalidated INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS mistakes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    what TEXT NOT NULL,
    root_cause TEXT,
    fix TEXT,
    retries INTEGER DEFAULT 1,
    session_date TEXT,
    resolved INTEGER DEFAULT 0,
    sha256 TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_date TEXT,
    session_time TEXT,
    task TEXT,
    what_was_built TEXT,
    errors_hit TEXT,
    decisions_made TEXT,
    outcome TEXT,
    sha256 TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS lesson_provenance (
    lesson_id INTEGER REFERENCES lessons(id),
    mistake_id INTEGER REFERENCES mistakes(id),
    promoted_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (lesson_id, mistake_id)
);
CREATE TABLE IF NOT EXISTS digest_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    window TEXT, start_date TEXT, end_date TEXT,
    output_path TEXT, item_count INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS lessons_fts USING fts5(
    title, category, when_to_use, what, why, content=lessons, content_rowid=id);
CREATE VIRTUAL TABLE IF NOT EXISTS mistakes_fts USING fts5(
    what, root_cause, fix, content=mistakes, content_rowid=id);
CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
    task, what_was_built, errors_hit, decisions_made, content=sessions, content_rowid=id);

CREATE TRIGGER IF NOT EXISTS lessons_ai AFTER INSERT ON lessons BEGIN
    INSERT INTO lessons_fts(rowid, title, category, when_to_use, what, why)
    VALUES (new.id, new.title, new.category, new.when_to_use, new.what, new.why);
END;
CREATE TRIGGER IF NOT EXISTS lessons_ad AFTER DELETE ON lessons BEGIN
    INSERT INTO lessons_fts(lessons_fts, rowid, title, category, when_to_use, what, why)
    VALUES ('delete', old.id, old.title, old.category, old.when_to_use, old.what, old.why);
END;
CREATE TRIGGER IF NOT EXISTS mistakes_ai AFTER INSERT ON mistakes BEGIN
    INSERT INTO mistakes_fts(rowid, what, root_cause, fix)
    VALUES (new.id, new.what, new.root_cause, new.fix);
END;
CREATE TRIGGER IF NOT EXISTS mistakes_ad AFTER DELETE ON mistakes BEGIN
    INSERT INTO mistakes_fts(mistakes_fts, rowid, what, root_cause, fix)
    VALUES ('delete', old.id, old.what, old.root_cause, old.fix);
END;
CREATE TRIGGER IF NOT EXISTS sessions_ai AFTER INSERT ON sessions BEGIN
    INSERT INTO sessions_fts(rowid, task, what_was_built, errors_hit, decisions_made)
    VALUES (new.id, new.task, new.what_was_built, new.errors_hit, new.decisions_made);
END;
CREATE TRIGGER IF NOT EXISTS sessions_ad AFTER DELETE ON sessions BEGIN
    INSERT INTO sessions_fts(sessions_fts, rowid, task, what_was_built, errors_hit, decisions_made)
    VALUES ('delete', old.id, old.task, old.what_was_built, old.errors_hit, old.decisions_made);
END;
"""


def sha(*parts):
    raw = "|".join((p or "").strip().lower() for p in parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.row_factory = sqlite3.Row
    # WAL + a real busy timeout, because two Claude sessions share this repo. With the default
    # busy_timeout of 0 the second writer fails instantly rather than waiting.
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.executescript(SCHEMA)
    return conn


# ---------------------------------------------------------------- writes

def add_lesson(conn, title, what, category="pattern", when_to_use="", why="", source=""):
    fp = sha(title, what)
    row = conn.execute("SELECT id, confidence FROM lessons WHERE sha256=?", (fp,)).fetchone()
    if row:
        # Re-encountering a lesson strengthens it and resets its decay clock. This is the
        # access-count + recency mechanism: a pattern you keep meeting stays hot for free.
        conn.execute(
            "UPDATE lessons SET confidence=confidence+1, confirmed_at=datetime('now'), invalidated=0 WHERE id=?",
            (row["id"],))
        conn.commit()
        return row["id"], "strengthened"
    cur = conn.execute(
        "INSERT INTO lessons (title, category, when_to_use, what, why, source, sha256) VALUES (?,?,?,?,?,?,?)",
        (title, category, when_to_use, what, why, source, fp))
    conn.commit()
    return cur.lastrowid, "added"


def add_mistake(conn, what, root_cause="", fix="", date=None):
    fp = sha(what, root_cause)
    row = conn.execute("SELECT id, retries FROM mistakes WHERE sha256=?", (fp,)).fetchone()
    if row:
        conn.execute("UPDATE mistakes SET retries=retries+1 WHERE id=?", (row["id"],))
        if fix:
            conn.execute("UPDATE mistakes SET fix=? WHERE id=? AND (fix IS NULL OR fix='')",
                         (fix, row["id"]))
        conn.commit()
        return row["id"], "repeated"
    cur = conn.execute(
        "INSERT INTO mistakes (what, root_cause, fix, session_date, sha256) VALUES (?,?,?,?,?)",
        (what, root_cause, fix, date or datetime.now().strftime("%Y-%m-%d"), fp))
    conn.commit()
    return cur.lastrowid, "added"


def add_session(conn, d):
    fp = sha(d.get("session_date", ""), d.get("session_time", ""), d.get("task", ""))
    if conn.execute("SELECT 1 FROM sessions WHERE sha256=?", (fp,)).fetchone():
        return None, "duplicate"
    cur = conn.execute(
        "INSERT INTO sessions (session_date, session_time, task, what_was_built, errors_hit,"
        " decisions_made, outcome, sha256) VALUES (?,?,?,?,?,?,?,?)",
        (d.get("session_date"), d.get("session_time"), d.get("task"), d.get("what_was_built"),
         d.get("errors_hit"), d.get("decisions_made"), d.get("outcome"), fp))
    conn.commit()
    return cur.lastrowid, "added"


# ---------------------------------------------------------------- reads

FTS_STRIP = re.compile(r"[^\w\s]")


def search(conn, query, table="lessons", limit=5):
    # FTS5 treats punctuation as syntax; an unescaped apostrophe or hyphen from a NEXT_STEPS
    # line would raise rather than return nothing, and this runs inside a hook.
    q = " OR ".join(t for t in FTS_STRIP.sub(" ", query).split() if len(t) > 2)
    if not q:
        return []
    live = {"lessons": "invalidated=0", "mistakes": "resolved=0", "sessions": "1=1"}[table]
    try:
        return conn.execute(
            f"SELECT t.* FROM {table}_fts f JOIN {table} t ON t.id=f.rowid"
            f" WHERE {table}_fts MATCH ? AND {live} ORDER BY rank LIMIT ?", (q, limit)).fetchall()
    except sqlite3.OperationalError:
        return []


def stats(conn):
    g = lambda s: conn.execute(s).fetchone()[0]
    return {
        "lessons": g("SELECT COUNT(*) FROM lessons WHERE invalidated=0"),
        "lessons_decayed": g("SELECT COUNT(*) FROM lessons WHERE invalidated=1"),
        "mistakes_open": g("SELECT COUNT(*) FROM mistakes WHERE resolved=0"),
        "mistakes_resolved": g("SELECT COUNT(*) FROM mistakes WHERE resolved=1"),
        "sessions": g("SELECT COUNT(*) FROM sessions"),
        "promotions": g("SELECT COUNT(*) FROM lesson_provenance"),
        "pending_promotion": g(
            "SELECT COUNT(*) FROM mistakes m LEFT JOIN lesson_provenance lp ON lp.mistake_id=m.id"
            " WHERE m.retries>=3 AND m.resolved=0 AND lp.lesson_id IS NULL"),
    }


# ---------------------------------------------------------------- promotion & decay

def promote_mistakes(conn, threshold=3, dry_run=False):
    """A failure seen `threshold` times is no longer an incident; it is a rule."""
    rows = conn.execute(
        "SELECT m.* FROM mistakes m LEFT JOIN lesson_provenance lp ON lp.mistake_id=m.id"
        " WHERE m.retries>=? AND m.resolved=0 AND lp.lesson_id IS NULL LIMIT 20",
        (threshold,)).fetchall()
    out = []
    for m in rows:
        # Nazim calls Haiku here to phrase the lesson. This environment has no ANTHROPIC_API_KEY
        # (see deployment.md §3), so promotion is deterministic instead: the mistake's own fields
        # become the lesson. Worse prose, same mechanism — and it never fails for want of a key.
        title = (m["what"] or "")[:80]
        lesson = {
            "title": title,
            "category": "anti-pattern",
            "when_to_use": f"Seen {m['retries']}x; first on {m['session_date']}",
            "what": m["fix"] or m["what"],
            "why": m["root_cause"] or "Recurred often enough to be structural, not incidental.",
            "source": f"auto-promoted from mistake #{m['id']}",
        }
        out.append(lesson)
        if dry_run:
            continue
        lid, _ = add_lesson(conn, lesson["title"], lesson["what"], lesson["category"],
                            lesson["when_to_use"], lesson["why"], lesson["source"])
        conn.execute("INSERT OR IGNORE INTO lesson_provenance (lesson_id, mistake_id) VALUES (?,?)",
                     (lid, m["id"]))
        conn.commit()
        mfile = MEM / "mistakes.md"
        if mfile.exists():
            with mfile.open("a", encoding="utf-8") as fh:
                fh.write(f"RESOLUTION: auto-promoted to lesson #{lid} (retries>={threshold})"
                         f" | {datetime.now():%Y-%m-%d}\n")
    return out


def decay(conn, table, dry_run=False):
    """Soft-flag what has gone stale. Only `sessions` is deleted, and only from the DB --
    the markdown archive remains the durable record."""
    spec = {
        "lessons": ("SELECT COUNT(*) FROM lessons WHERE invalidated=0 AND datetime(confirmed_at) < datetime('now', ?)",
                    "UPDATE lessons SET invalidated=1 WHERE invalidated=0 AND datetime(confirmed_at) < datetime('now', ?)",
                    TTL_DAYS["lesson"]),
        "mistakes": ("SELECT COUNT(*) FROM mistakes WHERE resolved=0 AND datetime(created_at) < datetime('now', ?)",
                     "UPDATE mistakes SET resolved=1 WHERE resolved=0 AND datetime(created_at) < datetime('now', ?)",
                     TTL_DAYS["mistake"]),
        "sessions": ("SELECT COUNT(*) FROM sessions WHERE datetime(created_at) < datetime('now', ?)",
                     "DELETE FROM sessions WHERE datetime(created_at) < datetime('now', ?)",
                     TTL_DAYS["session"]),
    }[table]
    window = f"-{spec[2]} days"
    n = conn.execute(spec[0], (window,)).fetchone()[0]
    if n and not dry_run:
        conn.execute(spec[1], (window,))
        conn.commit()
    return n


# ---------------------------------------------------------------- export & rebuild

def export_md(conn):
    """Regenerate the two -export.md files. DESTRUCTIVE by design: these are views of the DB,
    and any hand edit is meant to be lost (MEMORY_TIERS.md §5)."""
    lessons = conn.execute(
        "SELECT * FROM lessons WHERE invalidated=0 ORDER BY confidence DESC, confirmed_at DESC").fetchall()
    lines = ["# Lessons — generated from the memory DB", "",
             f"<!-- GENERATED by mem.py export-md on {datetime.now():%Y-%m-%d %H:%M}. Do not hand-edit. -->",
             "", f"{len(lessons)} live lessons, strongest first.", ""]
    for r in lessons:
        lines += [f"### {r['title']}",
                  f"**Confidence:** {r['confidence']} | **Category:** {r['category']} |"
                  f" **Confirmed:** {r['confirmed_at'][:10]}" + (f" | **Source:** {r['source']}" if r["source"] else ""),
                  ""]
        if r["when_to_use"]:
            lines += [f"**When:** {r['when_to_use']}", ""]
        lines += [r["what"] or "", ""]
        if r["why"]:
            lines += [f"**Why:** {r['why']}", ""]
    (MEM / "lessons-export.md").write_text("\n".join(lines), encoding="utf-8")

    mis = conn.execute("SELECT * FROM mistakes WHERE resolved=0 ORDER BY retries DESC, created_at DESC").fetchall()
    ml = ["# Open mistakes — generated from the memory DB", "",
          f"<!-- GENERATED by mem.py export-md on {datetime.now():%Y-%m-%d %H:%M}. Do not hand-edit. -->",
          "", f"{len(mis)} unresolved. Anything at 3+ retries is due for promotion to a lesson.", ""]
    for r in mis:
        ml.append(f"- **{r['retries']}x** [{r['session_date']}] {r['what']}"
                  + (f" — _root cause:_ {r['root_cause']}" if r["root_cause"] else "")
                  + (f" — _fix:_ {r['fix']}" if r["fix"] else ""))
    (MEM / "mistakes-export.md").write_text("\n".join(ml) + "\n", encoding="utf-8")
    return len(lessons), len(mis)


TEST_ITEM = re.compile(r"^(test|testing)/", re.I)


def ingest_beads(conn, verbose=False):
    """Read .beads/failures.jsonl as a cold source.

    WHITELIST, never blacklist. Of 345 rows, ~7 are curated (they carry `failure_id`) and 338 are
    machine rows, 317 of which are test fixtures with itemIds like `test/redraft-loop-test` and
    errors like DISTINCTIVE-CAUSE-42. Matching those marker strings would rot the next time
    somebody adds a fixture; requiring a real shape does not.
    """
    path = REPO / ".beads" / "failures.jsonl"
    added = skipped = 0
    if not path.exists():
        return 0, 0
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            skipped += 1
            continue
        if row.get("failure_id"):
            _, how = add_mistake(conn,
                                 what=row.get("pattern") or row["failure_id"],
                                 root_cause=row.get("root_cause", ""),
                                 fix=row.get("fix_applied") or row.get("prevention", ""),
                                 date=(row.get("timestamp") or "")[:10])
            added += how != "duplicate"
            continue
        item = row.get("itemId") or ""
        if not item or TEST_ITEM.match(item):
            skipped += 1
            continue
        _, how = add_mistake(conn,
                             what=f"{row.get('stage', 'stage')} failed on {item}",
                             root_cause=str(row.get("error", ""))[:300],
                             date=(row.get("at") or row.get("timestamp") or "")[:10])
        added += how != "duplicate"
    return added, skipped


HEAD_RE = re.compile(r"^#{2,3}\s+(.+?)\s*$")


def rebuild(conn):
    """Reconstruct the whole index from the markdown tiers + beads.

    This is what makes gitignoring the .db safe: losing it is a non-event.
    """
    for t in ("lessons", "mistakes", "sessions", "lesson_provenance"):
        conn.execute(f"DELETE FROM {t}")
    conn.commit()

    n_lessons = 0
    lf = MEM / "lessons.md"
    if lf.exists():
        title, buf = None, []
        for line in lf.read_text(encoding="utf-8").splitlines():
            m = HEAD_RE.match(line)
            if m and not line.startswith("# "):
                if title and buf:
                    add_lesson(conn, title, "\n".join(buf).strip(), source="lessons.md")
                    n_lessons += 1
                title, buf = m.group(1), []
            elif title:
                buf.append(line)
        if title and buf:
            add_lesson(conn, title, "\n".join(buf).strip(), source="lessons.md")
            n_lessons += 1

    n_sessions = 0
    for f in sorted((MEM / "session-archive").glob("*.md")):
        if "-pre-compact-" in f.name or "-pre-distill" in f.name:
            continue
        date = f.stem[:10]
        for block in re.split(r"^## ", f.read_text(encoding="utf-8"), flags=re.M)[1:]:
            head, _, body = block.partition("\n")
            add_session(conn, {"session_date": date, "session_time": head[:5],
                               "task": head.strip(), "what_was_built": body[:2000]})
            n_sessions += 1

    n_mistakes, skipped = ingest_beads(conn)
    return {"lessons": n_lessons, "sessions": n_sessions, "mistakes": n_mistakes,
            "beads_skipped": skipped}


# ---------------------------------------------------------------- cli

def main():
    ap = argparse.ArgumentParser(description="Drawing Room memory index")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("add-lesson"); p.add_argument("--title", required=True)
    p.add_argument("--what", required=True); p.add_argument("--category", default="pattern")
    p.add_argument("--when-to-use", default=""); p.add_argument("--why", default="")
    p.add_argument("--source", default="")

    p = sub.add_parser("add-mistake"); p.add_argument("--what", required=True)
    p.add_argument("--root-cause", default=""); p.add_argument("--fix", default="")
    p.add_argument("--date", default="")

    p = sub.add_parser("add-session"); p.add_argument("--json", required=True)

    p = sub.add_parser("search"); p.add_argument("--query", required=True)
    p.add_argument("--table", default="lessons", choices=["lessons", "mistakes", "sessions"])
    p.add_argument("--limit", type=int, default=5)

    sub.add_parser("stats")
    sub.add_parser("export-md")
    sub.add_parser("rebuild")
    sub.add_parser("ingest-beads")

    p = sub.add_parser("promote-mistakes"); p.add_argument("--threshold", type=int, default=3)
    p.add_argument("--dry-run", action="store_true")

    p = sub.add_parser("decay"); p.add_argument("--table", required=True,
                                                choices=["lessons", "mistakes", "sessions"])
    p.add_argument("--dry-run", action="store_true")

    a = ap.parse_args()
    conn = connect()

    if a.cmd == "add-lesson":
        i, how = add_lesson(conn, a.title, a.what, a.category, a.when_to_use, a.why, a.source)
        print(f"{how} #{i}")
    elif a.cmd == "add-mistake":
        i, how = add_mistake(conn, a.what, a.root_cause, a.fix, a.date or None)
        print(f"{how} #{i}")
    elif a.cmd == "add-session":
        i, how = add_session(conn, json.loads(a.json))
        print(f"{how} #{i}")
    elif a.cmd == "search":
        rows = search(conn, a.query, a.table, a.limit)
        for r in rows:
            if a.table == "lessons":
                print(f"- [{r['confidence']}x] {r['title']}: {(r['what'] or '')[:160]}")
            elif a.table == "mistakes":
                print(f"- [{r['retries']}x] {(r['what'] or '')[:160]}")
            else:
                print(f"- [{r['session_date']}] {(r['task'] or '')[:160]}")
        if not rows:
            print("", end="")
    elif a.cmd == "stats":
        s = stats(conn)
        print(" | ".join(f"{k}: {v}" for k, v in s.items()))
    elif a.cmd == "export-md":
        print("exported %d lessons, %d open mistakes" % export_md(conn))
    elif a.cmd == "rebuild":
        r = rebuild(conn); export_md(conn)
        print(" | ".join(f"{k}: {v}" for k, v in r.items()))
    elif a.cmd == "ingest-beads":
        print("ingested %d, skipped %d" % ingest_beads(conn))
    elif a.cmd == "promote-mistakes":
        out = promote_mistakes(conn, a.threshold, a.dry_run)
        print(f"{'would promote' if a.dry_run else 'promoted'} {len(out)}")
        for l in out:
            print(f"  - {l['title'][:100]}")
    elif a.cmd == "decay":
        n = decay(conn, a.table, a.dry_run)
        print(f"{'would decay' if a.dry_run else 'decayed'} {n} rows in {a.table}")
    conn.close()


if __name__ == "__main__":
    sys.exit(main())
