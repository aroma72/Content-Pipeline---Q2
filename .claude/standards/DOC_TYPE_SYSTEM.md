---
type: standards
last_verified: 2026-05-19
owner: aroma
---

# Documentation Type System

Progressive disclosure hierarchy: L1 (router) → L2 (runbook) → L3 (reference).

---

## The Three Tiers

### L1 — Router (≤150 lines)

**Purpose:** Navigation hub. Tells you where to go.

**Structure:**
- Quick navigation table (what I want to do → where to go)
- Folder structure
- Critical rules (never-break list)
- Known failure references
- Pre-push quality gate

**Example:** `CLAUDE.md`

**Line limit:** 150 (enforced by hook)

**Metadata:**
```yaml
---
type: router
last_verified: YYYY-MM-DD
owner: aroma
---
```

### L2 — Runbook (≤100 lines)

**Purpose:** Step-by-step procedures. How to do a specific task.

**Structure:**
- Problem statement
- Prerequisites (what must be true before starting)
- Step-by-step procedure (numbered)
- Validation (how to verify success)
- Troubleshooting (common errors + fixes)

**Example:** `docs/video-production.md`, `docs/audio-extraction.md`

**Line limit:** 100 (design guidance, not enforced)

**Metadata:**
```yaml
---
type: runbook
last_verified: YYYY-MM-DD
owner: aroma
---
```

### L3 — Reference (≤300 lines)

**Purpose:** Deep knowledge. Why things work this way.

**Structure:**
- Theory/context
- Detailed rules
- Examples and calculations
- Edge cases
- Known issues + solutions
- Related decisions (link to .beads/decisions.jsonl)

**Example:** `docs/design-standards.md`, `.claude/standards/VIDEO_PRODUCTION_RULES.md`

**Line limit:** 300 (design guidance, not enforced)

**Metadata:**
```yaml
---
type: reference
last_verified: YYYY-MM-DD
owner: aroma
---
```

---

## When to Use Each Type

| I need to... | Use this | Location |
|---|---|---|
| Navigate to a task | L1 Router | `CLAUDE.md` |
| Do a specific task | L2 Runbook | `docs/*.md` |
| Understand the why | L3 Reference | `docs/`, `.claude/standards/` |

### Decision Tree

```
START: New content needed?

  → Is it top-level navigation? → L1 Router (CLAUDE.md)
  
  → Is it a procedure (do X)? → L2 Runbook (docs/)
    • Video rendering → docs/video-production.md
    • Audio extraction → docs/audio-extraction.md
    • Git workflow → docs/git-workflow.md
  
  → Is it a policy or deep knowledge? → L3 Reference
    • Design standards → docs/design-standards.md
    • Video production rules → .claude/standards/VIDEO_PRODUCTION_RULES.md
    • VO policy → .claude/standards/VOICEOVER_POLICY.md
    • Troubleshooting → docs/troubleshooting.md
    • Content pipeline → docs/content-pipeline.md
```

---

## Mandatory Frontmatter

All markdown files (.md) must include YAML frontmatter:

```yaml
---
type: [router|runbook|reference|standards]
last_verified: YYYY-MM-DD
owner: aroma
---
```

**Fields:**
- `type` — One of: router, runbook, reference, standards
- `last_verified` — Date doc was last reviewed (ISO 8601)
- `owner` — Author/maintainer name

**Exception:** CLAUDE.md already has special format; don't enforce strict frontmatter.

---

## Line Limits (Guidance)

| Tier | Limit | Why | Enforcement |
|---|---|---|---|
| L1 Router | 150 | Short navigation, prevents bloat | Hook: guard-file-writes.sh |
| L2 Runbook | 100 | Focused procedures, easy to scan | Design guidance (warn if >100) |
| L3 Reference | 300 | Deep knowledge, stays maintainable | Design guidance (warn if >300) |

**Why limits exist:**
- L1 over 150 lines → should be multiple L2/L3 docs
- L2 over 100 lines → should split into multiple runbooks
- L3 over 300 lines → consider splitting by topic

---

## Loading Behavior

When Claude loads a document, it reads:
1. **L1 Router first** → determines which L2/L3 to consult
2. **L2 Runbook next** → step-by-step instructions
3. **L3 Reference as needed** → deep knowledge for edge cases

This prevents context bloat: read L1, then load only relevant L2/L3.

---

## Content Placement

| Content Type | Location | Example |
|---|---|---|
| Routes & navigation | CLAUDE.md (L1) | "Render videos → docs/video-production.md" |
| Procedures | docs/ (L2) | "How to render a video" |
| Design rules | .claude/standards/ (L3) | "SVG viewBox minimum 850px" |
| Decision history | .beads/decisions.jsonl | "Why we use Remotion" |
| Failure patterns | .beads/failures.jsonl | "Text cutoff → fix: viewBox 850px" |
| Work tracking | .beads/status.jsonl | "Task: Fix Part 1 text cutoff" |

---

## Anti-Patterns

❌ **Don't:**
- Mix L1 and L3 (e.g., routing + deep theory in same doc)
- Create docs without frontmatter metadata
- Store procedures as comments in code
- Put critical rules only in code — document in CLAUDE.md
- Reference docs that don't exist yet

✅ **Do:**
- Router → Link to Runbook → Link to Reference
- Keep frontmatter up-to-date (last_verified is current)
- Store decisions in .beads/decisions.jsonl, not comments
- Encode critical rules in CLAUDE.md L1
- Link liberally between docs

---

## Example: Video Production Task

**User asks:** "How do I render a video?"

1. **Load CLAUDE.md (L1)** — Find: "Render videos → docs/video-production.md"
2. **Load docs/video-production.md (L2)** — Follow procedure: Render → Extract VO → Mux
3. **Load .claude/standards/VIDEO_PRODUCTION_RULES.md (L3)** — Understand frame count formula if needed
4. **Load docs/audio-extraction.md (L3)** — Details on ffmpeg flags if mux fails

Total context for simple task: ~150 lines (just L2).
With edge case questions: +300 lines (add L3 reference).
Full knowledge: Router + Runbooks + References + Beads = ~1500 lines, split across files.

---

*Last verified: 2026-05-19*
