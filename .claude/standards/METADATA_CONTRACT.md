---
type: standards
last_verified: 2026-05-19
owner: aroma
---

# Metadata Contract

Required YAML frontmatter for all markdown files.

---

## The Contract

Every markdown file in the project must start with YAML frontmatter:

```yaml
---
type: [type-here]
last_verified: YYYY-MM-DD
owner: aroma
---
```

This applies to ALL `.md` files except:
- Git-generated files (.gitignore, etc.)
- Auto-generated documentation
- CLAUDE.md (has its own special format)

---

## Field Definitions

### `type` (required)

Document type — must be one of:
- **router** — Navigation hub (CLAUDE.md, docs/README.md)
- **runbook** — Step-by-step procedure
- **reference** — Deep knowledge, design rules
- **standards** — Policy documents
- **guide** — Onboarding, setup instructions

**Examples:**
```yaml
type: router       # Navigation doc
type: runbook      # Video rendering procedure
type: reference    # Frame count formula deep dive
type: standards    # Voiceover policy
type: guide        # Getting started with Remotion
```

### `last_verified` (required)

Date when document was last reviewed and confirmed accurate. ISO 8601 format: `YYYY-MM-DD`.

**Usage:**
- Update whenever doc content changes
- Update even if only fixing a typo (confidence that it's still correct)
- Use for staleness checks: > 7 days old → warn in session-start.sh

**Examples:**
```yaml
last_verified: 2026-05-19
last_verified: 2026-04-01
```

### `owner` (required)

Person responsible for this document. Usually `aroma` in Drawing Room.

**Usage:**
- Accountability: who can edit this doc?
- Attribution: who approved these rules?
- Future contacts: who do I ask about this?

**Examples:**
```yaml
owner: aroma
owner: aroma  # (may change if delegated)
```

---

## Validation

The hook `validate-after-write.sh` checks:

1. **Frontmatter exists** — File starts with `---`
2. **All required fields present** — type, last_verified, owner
3. **Type is valid** — One of the allowed types
4. **Date format correct** — YYYY-MM-DD (ISO 8601)
5. **Owner specified** — Non-empty string

**Failure:** Hook warns during write; doc still created but flagged for manual fixing.

---

## Examples

### Good: Runbook with Frontmatter

```markdown
---
type: runbook
last_verified: 2026-05-19
owner: aroma
---

# How to Render a Video

## Prerequisites
- Remotion installed
- Node.js 16+

## Steps
1. Navigate to project root
2. Run: `npx remotion render AutonomousSystemsPart1`
...
```

### Good: Reference with Frontmatter

```markdown
---
type: reference
last_verified: 2026-05-15
owner: aroma
---

# SVG ViewBox Safety Rules

SVG diagrams must have minimum height 850px...
```

### Bad: Missing Frontmatter

```markdown
# How to Render Videos

(no frontmatter - hook will warn)
```

### Bad: Invalid Type

```markdown
---
type: tutorial  # ❌ Not in allowed types
last_verified: 2026-05-19
owner: aroma
---
```

### Bad: Invalid Date

```markdown
---
type: runbook
last_verified: 05/19/2026  # ❌ Should be 2026-05-19
owner: aroma
---
```

---

## Maintenance Checklist

When reviewing or updating a document:

- [ ] Frontmatter is present and complete
- [ ] `type` is accurate and in allowed list
- [ ] `last_verified` is today's date (if content changed)
- [ ] `owner` is set (usually `aroma`)
- [ ] Content is still accurate and relevant
- [ ] Line count appropriate for tier (L1 ≤150, L2 ≤100, L3 ≤300)
- [ ] Links to other docs are valid (no 404s)
- [ ] Code examples still work

---

## Why This Matters

1. **Discoverability** — Type tells Claude which docs to load first
2. **Freshness** — last_verified flags stale docs needing review
3. **Accountability** — owner creates responsibility for quality
4. **Consistency** — Metadata format uniform across project
5. **Automation** — Hooks and scripts can validate frontmatter

---

## Adding Frontmatter to Existing Files

If an older file is missing frontmatter:

1. Read the file
2. Determine its `type` (router/runbook/reference/standards)
3. Set `last_verified` to today's date
4. Set `owner` to `aroma` (or whoever maintains it)
5. Add block at top:

```yaml
---
type: [your-type]
last_verified: 2026-05-19
owner: aroma
---
```

---

*Last verified: 2026-05-19*
