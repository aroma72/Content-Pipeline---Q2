---
type: reference
last_verified: 2026-05-19
owner: aroma
---

# Agent: daily-git-sync

Automatically commit all changes daily at 12:00 PM.

---

## Purpose

Keep git history clean and up-to-date. Automatically captures daily work without requiring manual commit discipline.

---

## Schedule

**Time:** 12:00 PM daily (noon)  
**Timezone:** Local system timezone  
**Frequency:** Every day at 12:00 PM

---

## Workflow

### Pre-Commit Checks

Before committing, verify:

1. **No sensitive files**
   ```bash
   git status | grep -E ".env|secrets|credentials"
   ```
   If found: STOP. Remove from git, add to .gitignore.

2. **No merge conflicts**
   ```bash
   git status | grep -E "both modified|both added"
   ```
   If found: STOP. Resolve conflicts before running agent.

3. **No unstaged binaries**
   ```bash
   git status | grep -E ".mp4|.mov|.png|.psd"
   ```
   If found: Check if intentional. Video files should go in `updated/` only.

### Commit All Changes

```bash
# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "Daily sync: $(date +%Y-%m-%d)"
```

**Message format:** `Daily sync: YYYY-MM-DD`

### Log Commit

Record in `.beads/status.jsonl`:

```bash
echo '{"timestamp":"2026-05-19T12:00:00Z","task":"daily-git-sync","status":"completed","changes":"'$(git diff HEAD~1 --stat | wc -l)' files"}' >> .beads/status.jsonl
```

---

## What Gets Committed

✅ **Included:**
- Python scripts and agents
- Markdown documentation
- TSX/React components (Remotion)
- Configuration files
- `.beads/` JSONL work tracking
- `.claude/` harness files

❌ **Excluded (via .gitignore):**
- `.env` environment variables
- `credentials.json`, `secrets.txt`
- `node_modules/` (development only)
- Video files > 100MB (use `updated/` with Git LFS if needed)
- `.DS_Store`, `Thumbs.db`
- IDE artifacts (`.vscode/`, `.idea/`)

---

## Safety Checks

If any of these conditions are true, **SKIP COMMIT:**

1. **Uncommitted submodule changes**
   ```bash
   git status --short | grep "^M " | grep -q "drawing-room-video"
   ```
   → Submodule needs explicit commit first

2. **Unresolved merge conflicts**
   ```bash
   git diff --check
   ```
   → Cannot commit with conflicts

3. **Test failures** (if tests exist)
   ```bash
   pytest && npm test  # Must pass
   ```
   → Do not commit broken code

4. **Critical rule violations**
   ```bash
   # Check for: force-push, .env commits, unauthorized ElevenLabs
   git log -1 --format=%B | grep -E "force|--force"
   ```
   → Hook will block these anyway

---

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| Commit fails with "no changes" | Nothing staged | Check what changed: `git status` |
| "Permission denied" error | Git credentials expired | Run: `git config --global credential.helper cache` |
| Large files block commit | Files > 100MB detected | Remove from staging: `git restore --staged filename` |
| Merge conflicts prevent commit | Branch diverged from main | Resolve conflicts: `git merge main` |

---

## Manual Trigger

If you need to sync before 12 PM, manually run:

```bash
cd /path/to/Content Queen
git add -A
git commit -m "Manual sync: $(date +%Y-%m-%d_%H:%M)"
git push
```

---

## Related Documentation

- **git-workflow skill** — Submodule commit ordering
- **CLAUDE.md** — Critical git rules (no force-push to main)
- **.beads/status.jsonl** — Work tracking

---

*Last verified: 2026-05-19*
