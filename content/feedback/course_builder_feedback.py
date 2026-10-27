"""
course_builder_feedback.py -- compare Course Builder user feedback with the frozen baseline, in numbers.

    py content/feedback/course_builder_feedback.py "<responses.xlsx>"              # NEW responses vs the baseline
    py content/feedback/course_builder_feedback.py "<responses.xlsx>" --all        # every response vs the baseline
    py content/feedback/course_builder_feedback.py "<responses.xlsx>" --since 2026-11-01
    py content/feedback/course_builder_feedback.py "<responses.xlsx>" --set-baseline   # (re)freeze the baseline

Reads the Google Form export ("Course Builder - User Feedback (Responses).xlsx") and prints:

  A. BASELINE RUBRIC -- only what the form asked, every row a number:
       Q1 how easy (1-10)   -> mean score, % rating it 8+                       [scored: higher is better]
       Q3 did you get stuck -> % who got through without getting stuck, % per sticking point
                                                                                 [scored: fewer stuck is better]
       Q4 how long it took  -> minutes inside the builder, total hours incl. preparation
                                                                                 [scored: less time in the builder is better]
       Q5 liked best        -> % naming each strength                            [shown with change, not scored]
       Q2 one improvement   -> % giving an idea, % per idea                      [shown with change, not scored]
     An improvement idea answers the question we asked; it is never counted as a shortfall.
     Then one EXPERIENCE SCORE (0-100) from Q1, Q3 and Q4, with the formula printed.

  B. SUGGESTED FOCUS AREAS -- things the answers point to that the form did not ask about. Each gets a
     PRIORITY (0-100): people who got STUCK on it count double, people who only wished for it count
     once, scaled so "everyone got stuck on it" = 100. Areas no question covers yet are "unmeasured".

By default only responses AFTER the baseline's last one are compared, because the export always
contains the old answers too. Theme matching is keyword-based so it is transparent and repeatable;
anything that matches no theme, or a time that cannot be read as a duration, is printed for a human
to tag. Needs openpyxl (`py -m pip install openpyxl`). Names are never written to the baseline.
"""
import argparse
import datetime as dt
import json
import re
import statistics
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl is missing: py -m pip install openpyxl")

HERE = Path(__file__).resolve().parent
BASELINE = HERE / "course-builder-baseline.json"

# The form's five questions, matched by a stable fragment so a reworded header still lines up.
Q = {
    "ease": "how easy was it",
    "improve": "one thing you would like to improve",
    "stuck": "did you get stuck",
    "time": "how long did the entire process take",
    "liked": "what did you like the best",
}

# Themes for the free-text questions: id -> (label, pattern[, veto pattern]).
THEMES = {
    "stuck": {
        "getting_started": ("Knowing how to start", r"\b(beginning|start(ing)?|where to|what to do|how to begin|onboard)"),
        "review_step": ("Seeing that a review was waiting", r"\breview"),
        "script_approval": ("Script approval / redrafts", r"\b(script|approv|redraft)"),
        "waiting_on_video": ("Waiting on videos / unclear progress", r"\b(waiting for (the )?video|progress|taking long|too long|slow)"),
        "errors": ("Errors or failures", r"\b(error|fail|crash|402|budget|broke)"),
    },
    "improve": {
        "org_context": ("Use our own context (pipelines, GitHub, MCP)", r"\b(organi[sz]ation|pipeline|mcp|github|our (own )?(data|context|process))"),
        "own_material": ("Upload own study / practice material", r"\b(upload|material|document|pdf|slides|my own)"),
        "assessments": ("Module assessments (MCQs)", r"\b(assessment|mcq|quiz|test)"),
        "guidance": ("Clearer guidance / next-step cues", r"\b(guide|guidance|instruction|tutorial|clear|pointer|notify|notification)"),
        "video_quality": ("Video quality (visuals, voice, text)", r"\b(video quality|voice|text|overlap|readab|visual|animation|music)"),
        "speed": ("Make it faster", r"\b(faster|speed|quicker|too long)"),
    },
    "liked": {
        "research": ("The automatic web research", r"\b(research|internet|web)"),
        "simplicity": ("It is simple / easy", r"\b(simple|easy|straightforward|intuitive)"),
        # "the videos are yet to be prepared" is not praise for the videos
        "videos": ("The finished videos", r"\b(video|animation|voice)", r"\b(yet to|not yet|haven'?t|have not|will see|later)"),
        "speed": ("It is fast", r"\b(fast|quick|minutes)"),
    },
}

NO_ANSWER = re.compile(r"^\s*(no|nope|none|n/?a|not really|nothing( really| much)?|all good|-)\s*[.!]?\s*$", re.I)

# Rubric B. `stuck` keys are blockers (weight 2), `wish` keys are requests (weight 1).
SUGGESTIONS = [
    ("Review step is visible", ["stuck.review_step"], [],
     "One person did not realise the course was waiting for their review.",
     "Did you know when the course was waiting for your review? (Yes / No / Not sure)"),
    ("Getting started is obvious", ["stuck.getting_started"], ["improve.guidance"],
     "One person needed a colleague to explain how to begin.",
     "How easy was it to know where to start? (1-10)"),
    ("Using our own context", [], ["improve.org_context"],
     "Asked to point the builder at our pipelines (GitHub / MCP) instead of explaining them.",
     "Would linking your team's tools or docs help? Which ones?"),
    ("Bringing your own material", [], ["improve.own_material"],
     "Asked to upload study and practice material.",
     "Did you have material you wanted to include in the course? (Yes / No)"),
    ("Module assessments", [], ["improve.assessments"],
     "Asked for an optional MCQ assessment per module.",
     "Would an end-of-module quiz be useful for your learners? (Yes / No)"),
    ("Finished video quality", ["stuck.waiting_on_video"], ["improve.video_quality"],
     "No one had seen a finished video when they answered; the form does not ask about the videos.",
     "How would you rate the finished videos? (1-10) Was any on-screen text hard to read?"),
    ("Time inside vs outside the builder", None, None,
     "One answer split 2-3 days of preparing from a few minutes in the builder; Q4 asks for one total.",
     "Split Q4: time preparing before you started, and time inside the builder."),
    ("Would you use it again", None, None,
     "The form measures ease but not whether people would come back or recommend it.",
     "How likely are you to build your next course with it? (1-10)"),
]

# --- Q4: turn "1 hour" / "two to three days" / "a few minutes" into minutes -------------------
WORDS = {"a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
         "eight": 8, "nine": 9, "ten": 10, "fifteen": 15, "twenty": 20, "thirty": 30, "forty": 40,
         "few": 3, "a few": 3, "couple": 2, "a couple of": 2, "half an": 0.5, "half": 0.5}
UNIT_MIN = {"min": 1, "minute": 1, "hour": 60, "hr": 60, "day": 8 * 60, "week": 40 * 60}  # working day / week
NUM = r"(\d+(?:\.\d+)?|a couple of|a few|half an|couple|few|" + "|".join(sorted(WORDS, key=len, reverse=True)) + r")"
DUR = re.compile(NUM + r"(?:\s*(?:to|-|–|or)\s*" + NUM + r")?\s*(min(?:ute)?|hour|hr|day|week)s?\b", re.I)


def durations_min(text):
    """Every duration in an answer, in minutes. A range counts as its midpoint."""
    out = []
    for m in DUR.finditer(str(text or "")):
        val = lambda s: float(s) if re.match(r"\d", s) else WORDS.get(s.lower())
        lo, hi = val(m.group(1)), (val(m.group(2)) if m.group(2) else None)
        if lo is None:
            continue
        n = (lo + hi) / 2 if hi is not None else lo
        unit = m.group(3).lower()
        out.append(n * UNIT_MIN["min" if unit.startswith("min") else unit])
    return out


# --- Experience score: one number from what the form asked (weights are a choice, change freely) --
WEIGHTS = {"ease": 0.5, "smooth": 0.3, "speed": 0.2}
FAST, SLOW = 15, 120   # minutes in the builder: <=15 scores 100, >=120 scores 0


def experience(m):
    parts = {
        "ease": None if m["ease_mean"] is None else m["ease_mean"] * 10,
        "smooth": None if m["smooth_share"] is None else m["smooth_share"] * 100,
        "speed": None if m["builder_min_median"] is None
        else max(0.0, min(100.0, 100 * (SLOW - m["builder_min_median"]) / (SLOW - FAST))),
    }
    have = {k: v for k, v in parts.items() if v is not None}
    if not have:
        return None, parts
    w = sum(WEIGHTS[k] for k in have)
    return round(sum(WEIGHTS[k] * v for k, v in have.items()) / w, 1), parts


def load(xlsx):
    ws = openpyxl.load_workbook(xlsx, data_only=True).worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    header = [str(h or "").strip().lower() for h in rows[0]]
    col = lambda frag: next((i for i, h in enumerate(header) if frag in h), None)
    idx = {k: col(v) for k, v in Q.items()}
    ts = col("timestamp")
    out = []
    for r in rows[1:]:
        if not any(r):
            continue
        rec = {k: (r[i] if i is not None else None) for k, i in idx.items()}
        rec["timestamp"] = r[ts] if ts is not None else None
        out.append(rec)
    return out


def themes_of(question, text):
    """Theme ids a free-text answer matches. A theme's third pattern, if any, vetoes it."""
    text = str(text or "")
    hits = []
    for tid, spec in THEMES[question].items():
        rx, veto = spec[1], (spec[2] if len(spec) > 2 else None)
        if re.search(rx, text, re.I) and not (veto and re.search(veto, text, re.I)):
            hits.append(tid)
    return hits


def answered(r, q):
    return r[q] and not NO_ANSWER.match(str(r[q]))


def score(responses):
    n = len(responses)
    m = {"n": n}
    eases = [float(r["ease"]) for r in responses if isinstance(r["ease"], (int, float))]
    m["ease_mean"] = round(sum(eases) / len(eases), 2) if eases else None
    m["ease_8plus_share"] = round(sum(e >= 8 for e in eases) / len(eases), 3) if eases else None
    m["smooth_share"] = round(sum(not answered(r, "stuck") for r in responses) / n, 3) if n else None
    flagged = []
    for q in THEMES:
        for tid in THEMES[q]:
            m[f"{q}.{tid}"] = sum(tid in themes_of(q, r[q]) for r in responses if answered(r, q))
        flagged += [(q, str(r[q])) for r in responses if answered(r, q) and not themes_of(q, r[q])]
    m["improve_any"] = sum(bool(answered(r, "improve")) for r in responses)
    # Q4: the shortest duration in an answer is the time in the builder, the longest the whole effort
    # (one answer gave both: "two to three days" of preparing, "a few minutes" in the builder).
    builder, total = [], []
    for r in responses:
        ds = durations_min(r["time"])
        if ds:
            builder.append(min(ds)); total.append(max(ds))
        elif r["time"]:
            flagged.append(("time", str(r["time"])))
    m["builder_min_median"] = round(statistics.median(builder), 1) if builder else None
    m["builder_under_60_share"] = round(sum(b < 60 for b in builder) / len(builder), 3) if builder else None
    m["total_hours_median"] = round(statistics.median(total) / 60, 1) if total else None
    m["time_answers"] = [str(r["time"]) for r in responses if r["time"]]
    m["experience"], _ = experience(m)
    return m, flagged


def priority(m, stuck_keys, wish_keys):
    """0-100: blockers count twice, wishes once; everyone stuck on it = 100."""
    n = m["n"] or 1
    return round((2 * sum(m.get(k, 0) for k in stuck_keys) + sum(m.get(k, 0) for k in wish_keys)) / (2 * n) * 100)


def verdict(base, now, better):
    if base is None or now is None:
        return "no data"
    if abs(now - base) < 1e-9:
        return "same"
    return "IMPROVED" if (now > base) == (better == "up") else "WORSE"


def delta(base, now, unit):
    if base is None or now is None:
        return ""
    d = now - base
    if unit == "%":
        return f"{d * 100:+.0f} pts"
    return f"{d:+.1f}" + {"min": " min", "h": " h"}.get(unit, "")


def show(v, unit):
    if v is None:
        return "-"
    return {"%": f"{v * 100:.0f}%", "min": f"{v:.0f} min", "h": f"{v:.1f} h"}.get(unit, f"{v:.1f}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx")
    ap.add_argument("--set-baseline", action="store_true")
    ap.add_argument("--all", action="store_true", help="compare every response, not just the new ones")
    ap.add_argument("--since", help="compare responses on/after this date (YYYY-MM-DD)")
    a = ap.parse_args()

    responses = load(a.xlsx)
    stamp = lambda r: r["timestamp"] if isinstance(r["timestamp"], dt.datetime) else None

    if a.set_baseline:
        m, flagged = score(responses)
        last = max((stamp(r) for r in responses if stamp(r)), default=None)
        BASELINE.write_text(json.dumps({
            "frozen": dt.date.today().isoformat(),
            "lastResponseAt": last.isoformat() if last else None,
            "metrics": m,
        }, indent=2), encoding="utf-8")
        print(f"Baseline frozen from {m['n']} response(s) -> {BASELINE.name}  (experience score {m['experience']})")
        for q, t in flagged:
            print(f"  needs a human tag [{q}]: {t[:120]}")
        return

    if not BASELINE.exists():
        sys.exit("No baseline yet -- run with --set-baseline first.")
    base = json.loads(BASELINE.read_text(encoding="utf-8"))
    if a.all:
        chosen, scope = responses, "all responses"
    else:
        since = dt.datetime.fromisoformat(a.since) if a.since else (
            dt.datetime.fromisoformat(base["lastResponseAt"]) if base.get("lastResponseAt") else None)
        chosen = [r for r in responses if not since or (stamp(r) and stamp(r) > since)]
        scope = f"responses after {since:%Y-%m-%d %H:%M}" if since else "all responses"
    if not chosen:
        sys.exit(f"No {scope} in this export -- nothing to compare yet.")

    now, flagged = score(chosen)
    b = base["metrics"]
    bn, nn = b["n"], now["n"]
    print(f"\nCourse Builder feedback  |  baseline frozen {base['frozen']} (n={bn})  |  this round: {scope} (n={nn})")
    if nn < 5:
        print("Fewer than 5 responses this round: read any change as a signal, not a trend.")

    W = 50
    row = lambda q, label, bv, nv, unit, verd: print(
        f"{q:4}{label:{W}} {show(bv, unit):>9} {show(nv, unit):>9} {delta(bv, nv, unit):>9}  {verd}")
    pct_of = lambda c, n: (c / n) if n else None

    print("\n=== A. BASELINE RUBRIC -- what the form asked ===\n")
    print(f"{'':4}{'Measure':{W}} {'Baseline':>9} {'Now':>9} {'Change':>9}  Verdict")
    print("-" * 96)
    row("Q1", "Ease of building a course (mean, 1-10)", b["ease_mean"], now["ease_mean"], "", verdict(b["ease_mean"], now["ease_mean"], "up"))
    row("", "  rated it 8 or higher", b["ease_8plus_share"], now["ease_8plus_share"], "%", verdict(b["ease_8plus_share"], now["ease_8plus_share"], "up"))
    row("Q3", "Got through without getting stuck", b["smooth_share"], now["smooth_share"], "%", verdict(b["smooth_share"], now["smooth_share"], "up"))
    for tid, (label, *_r) in THEMES["stuck"].items():
        bv, nv = b.get(f"stuck.{tid}", 0), now.get(f"stuck.{tid}", 0)
        if bv or nv:
            v = verdict(pct_of(bv, bn), pct_of(nv, nn), "down") if bv else "NEW sticking point"
            row("", "  stuck at: " + label, pct_of(bv, bn), pct_of(nv, nn), "%", v)
    row("Q4", "Time inside the builder (median)", b["builder_min_median"], now["builder_min_median"], "min",
        verdict(b["builder_min_median"], now["builder_min_median"], "down"))
    row("", "  finished in the builder within an hour", b["builder_under_60_share"], now["builder_under_60_share"], "%",
        verdict(b["builder_under_60_share"], now["builder_under_60_share"], "up"))
    row("", "  whole effort incl. preparation (median)", b["total_hours_median"], now["total_hours_median"], "h", "not scored")
    print(f"{'Q5':4}What people liked best (share naming it){'':10}{'':>9} {'':>9} {'':>9}  not scored")
    for tid, (label, *_r) in THEMES["liked"].items():
        bv, nv = b.get(f"liked.{tid}", 0), now.get(f"liked.{tid}", 0)
        if bv or nv:
            row("", "  " + label, pct_of(bv, bn), pct_of(nv, nn), "%", "")
    row("Q2", "Gave an improvement idea", pct_of(b.get("improve_any", 0), bn), pct_of(now["improve_any"], nn), "%", "not scored")
    for tid, (label, *_r) in THEMES["improve"].items():
        bv, nv = b.get(f"improve.{tid}", 0), now.get(f"improve.{tid}", 0)
        if bv or nv:
            row("", "  " + label, pct_of(bv, bn), pct_of(nv, nn), "%", "")
    print("-" * 96)
    be, bp = experience(b)
    ne, np_ = experience(now)
    print(f"{'':4}{'EXPERIENCE SCORE (0-100)':{W}} {show(be, ''):>9} {show(ne, ''):>9} {delta(be, ne, ''):>9}  "
          f"{verdict(be, ne, 'up')}")
    print(f"{'':4}= {int(WEIGHTS['ease']*100)}% ease (Q1 x10) + {int(WEIGHTS['smooth']*100)}% got through without getting stuck (Q3)"
          f" + {int(WEIGHTS['speed']*100)}% speed (Q4: <={FAST} min = 100, >={SLOW} min = 0)")
    print(f"{'':4}  now: ease {show(np_['ease'], '')}, smooth {show(np_['smooth'], '')}, speed {show(np_['speed'], '')}")

    print("\n=== B. SUGGESTED FOCUS AREAS -- not asked in this form ===")
    print("Priority 0-100: got STUCK on it counts 2, only wished for it counts 1; everyone stuck on it = 100.\n")
    print(f"{'':4}{'Area':38} {'Baseline':>9} {'Now':>9} {'Change':>9}")
    print("-" * 74)
    for i, (area, stuck_k, wish_k, why, ask) in enumerate(SUGGESTIONS, 1):
        if stuck_k is None:
            print(f"B{i:<3}{area:38} {'unmeasured':>9} {'unmeasured':>9}")
            continue
        bp_, np2 = priority(b, stuck_k, wish_k), priority(now, stuck_k, wish_k)
        print(f"B{i:<3}{area:38} {bp_:>9} {np2:>9} {np2 - bp_:>+9}")
    print("-" * 74)
    for i, (area, _s, _w, why, ask) in enumerate(SUGGESTIONS, 1):
        print(f"B{i}. {area}: {why}\n     Add to the form: {ask}")

    print("\nQ4 as written this round:")
    for t in now["time_answers"]:
        print(f"    - {t[:130]}")
    if flagged:
        print("\nNeeds a human tag (matched no theme, or a time that is not a duration):")
        for q, t in flagged:
            print(f"  [{q}] {t[:140]}")


if __name__ == "__main__":
    main()
