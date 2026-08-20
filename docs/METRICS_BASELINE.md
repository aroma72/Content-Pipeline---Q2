---
type: reference
last_verified: 2026-08-04
owner: aroma
---

# Turnaround Baseline (for Goal 1: ≥40% reduction metric)

Captured 2026-08-04 from `updated/` file history + git + `.beads` logs, to anchor the
"turnaround time (draft → published) reduced by ≥40%" success metric.

## Honest limitation (why this is provisional)
A clean wall-clock **draft → published** number is NOT cleanly recoverable from history because:
- Final MP4s in `updated/` are **git-ignored / untracked** — git has no add-date for them.
- Source folders are only captured by the **noon daily-git-sync**, so their first-commit
  timestamps (e.g. `explainer-videos/evals` first commit `2026-07-23 12:00:03`) are *sync* times,
  not *draft-start* times.
- So the only reliable signal is **file modified-times of finished MP4s** = publish-side cadence.

## What the data DOES show (best available signal)
Per-video **publish cadence during an active batch session** (finished MP4s landing back-to-back):

| Session | Finished videos | Span | Avg spacing |
|--------|------------------|------|-------------|
| 2026-06-11 | 5 (12:05→14:22) | 2h17m | **~34 min/video** |
| 2026-06-17 | 4 (16:35→19:34) | 2h59m | ~45 min/video |

- `.beads/status.jsonl`: a fully reviewer-gated **6s reel** logged **~1.0 hr** hands-on effort.
- (The 2026-06-05 14:08–14:09 cluster of ~24 files is a **bulk copy** into `updated/`, not
  production cadence — excluded.)

## Provisional baseline (use until W2 instrumented runs replace it)
- **Active per-video production: ≈ 34 min / finished short video.**
- **≥40% target ⇒ ≤ ~20 min / finished video** autonomously.
- NOTE: the *fuller* draft→published cycle (topic/recommendation → research → script → review
  gates → publish) historically spans **hours-to-days** of wall-clock because of manual review
  gates; that end-to-end number is where autonomy's 40% cut matters most, and it is not in history.

## Next step (locks the REAL baseline)
Week 1–2 instrumentation logs per-run timestamps. **Time the first 1–2 manual end-to-end runs**
and record them here as the authoritative "before" number, replacing the provisional figure above.
