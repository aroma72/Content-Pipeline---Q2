---
type: reference
last_verified: 2026-05-19
owner: aroma
---

# Skill: git-workflow

Proper git workflow for this project, especially submodule commit ordering.

---

## Purpose

Ensure git history is clean, submodule pointers stay in sync, and changes are properly attributed.

---

## Critical Rule: Submodule First

🚫 **NEVER:**
```bash
git add drawing-room-video/
git commit -m "Update submodule"  # ❌ WRONG - commits stale pointer
```

✅ **ALWAYS:**
```bash
# Step 1: Commit submodule changes FIRST
cd drawing-room-video/drawing-room-remotion
git add src/Root.tsx src/AutonomousSystemsPart*.tsx
git commit -m "Update: Autonomous Session Parts 1-3"
cd ../..

# Step 2: Then commit main repo submodule pointer
git add drawing-room-video/
git commit -m "Update: Submodule pointer (Part 1-3 changes)"
```

**Why:** Main repo stores a commit hash pointer to the submodule. If you commit main repo without updating submodule, the pointer is stale.

---

## Workflow: Making Changes to Remotion Compositions

### Scenario: Update Autonomous Session Part 1

**In submodule (drawing-room-video/drawing-room-remotion):**
```bash
# Make changes to TSX
# Edit src/Root.tsx (durationInFrames)
# Edit src/AutonomousSystemsPart1New.tsx (Scene changes)

# Stage changes IN SUBMODULE
cd drawing-room-video/drawing-room-remotion
git add src/Root.tsx src/AutonomousSystemsPart1New.tsx

# Commit in submodule
git commit -m "Fix: Autonomous Session Part 1 SVG text cutoff and blank slides"
git log --oneline -1  # Note the commit hash
```

**Back in main repo:**
```bash
cd ../..  # Back to Content Queen root

# Check submodule status
git status | grep drawing-room-video

# Stage the submodule pointer update
git add drawing-room-video/

# Commit the pointer update
git commit -m "Update: Submodule pointer for Part 1 fixes"

# Verify
git log --oneline -1
git show --name-status  # Should show drawing-room-video/ as modified
```

---

## Workflow: Full Production Pipeline Commit

When completing render → extract VO → mux → publish:

```bash
#!/bin/bash
set -e

echo "📝 Committing full production pipeline..."

# Step 1: If submodule changed (updated Root.tsx for frame counts)
cd drawing-room-video/drawing-room-remotion
if git status --short | grep -q "^M"; then
  git add src/Root.tsx src/Autonomous*.tsx
  git commit -m "Update: Frame counts and Scene timing for Parts 1-3"
  cd ../..
  git add drawing-room-video/
  git commit -m "Update: Submodule pointer (frame count updates)"
fi

cd ../..

# Step 2: Commit final videos and work tracking
git add updated/autonomous_part*.mp4
git add .beads/status.jsonl
git commit -m "Complete: Autonomous Session Parts 1-3 production (render→extract→mux→publish)"

# Step 3: Verify
git log --oneline -3
echo "✅ Commits complete"
```

---

## Commit Message Format

**Short format (most commits):**
```
<TYPE>: <SUBJECT>
```

**Types:**
- `Fix:` — Bug fix (text cutoff, frame count error)
- `Add:` — New feature (new agent, new skill)
- `Update:` — Change to existing (submodule pointer, script improvement)
- `Refactor:` — Code restructuring (no functional change)
- `Docs:` — Documentation only
- `Complete:` — Finished task/milestone

**Examples:**
```
Fix: SVG text cutoff in Autonomous Session Part 2 Scene 2
Add: Quality checker agent for pre-render validation
Update: Frame counts for Parts 1-3 (match VO duration)
Update: Submodule pointer (Part 1-3 changes)
Refactor: Audio mux workflow for clarity
Docs: Add SVG design standards reference
Complete: Autonomous Session Parts 1-3 production
```

**Detailed format (important changes):**
```
Fix: SVG text cutoff in Autonomous Session Part 2

- Changed viewBox from "0 0 1000 700" to "0 0 1000 850"
- Provides 60px clearance for radial diagram labels
- Fixes 3 pillar labels being clipped at diagram edges
- Tested: All labels now visible, no text overflow

Fixes #42
```

---

## Status Checks Before Committing

```bash
# 1. Check what will be committed
git status
git diff --cached

# 2. Verify no sensitive files are staged
git diff --cached | grep -E ".env|secrets|credentials"
# Should return nothing

# 3. Verify submodule pointer is up-to-date (if submodule changed)
cd drawing-room-video/drawing-room-remotion
git log -1 --format="%H %s"
# Then back in main repo:
cd ../..
git ls-files -s drawing-room-video/  # Compare commit hash

# 4. Run smoke tests (if tests exist)
bash .claude/scripts/smoke-test.sh

# 5. Review final diff
git diff --cached --stat
```

---

## Common Workflows

### Workflow A: Fix Remotion Composition

```bash
# Make changes in submodule
cd drawing-room-video/drawing-room-remotion
# Edit files...
git add src/Root.tsx src/AutonomousSystemsPart1New.tsx
git commit -m "Fix: Autonomous Part 1 Scene 2 SVG text cutoff"

# Return to main repo and update pointer
cd ../..
git add drawing-room-video/
git commit -m "Update: Submodule pointer (Part 1 text cutoff fix)"
```

### Workflow B: Add New Python Skill/Agent

```bash
# Create file in main repo
# Edit .claude/skills/new-skill/SKILL.md
git add .claude/skills/new-skill/
git commit -m "Add: New skill for [purpose]"
```

### Workflow C: Update .beads/ (Work Tracking)

```bash
# Append to work tracking (never edit existing lines)
echo '{"timestamp":"...", "task": "...", "status": "completed"}' >> .beads/status.jsonl

git add .beads/status.jsonl
git commit -m "Track: Mark [task] as complete"
```

### Workflow D: Bulk Update (Harness, Standards, Docs)

```bash
# Update multiple files
git add .claude/standards/
git add docs/
git add .beads/decisions.jsonl

git commit -m "Harness Phase 4: Add standards documents (VIDEO_PRODUCTION_RULES, VOICEOVER_POLICY, DOC_TYPE_SYSTEM, METADATA_CONTRACT)"
```

---

## Troubleshooting

### "Submodule pointer is behind remote"

**Cause:** Submodule changed but pointer not committed to main repo

**Fix:**
```bash
# Update submodule
cd drawing-room-video/drawing-room-remotion
git pull origin main  # Or sync your changes

# Back in main repo
cd ../..
git add drawing-room-video/
git commit -m "Update: Submodule pointer to latest"
```

### "Committed wrong changes, need to undo"

**If not yet pushed:**
```bash
# Soft reset (keeps changes in working directory)
git reset --soft HEAD~1

# Re-stage only correct files
git add [correct-file]
git commit -m "Fix: Correct commit message"
```

**If already pushed:**
```bash
# Create new commit reverting changes
git revert HEAD

# Or (if certain): Force push
git push --force-with-lease  # Safer than --force
```

### "Merge conflict in submodule"

**Cause:** Both branches modified submodule pointer differently

**Fix:**
```bash
# Check which commit to use
git diff --ours drawing-room-video/
git diff --theirs drawing-room-video/

# Choose one side
git checkout --ours drawing-room-video/   # Keep current
# OR
git checkout --theirs drawing-room-video/  # Take incoming

# Commit merge resolution
git add drawing-room-video/
git commit -m "Merge: Resolve submodule conflict"
```

---

## Git Aliases (Optional but Helpful)

```bash
# Add to ~/.gitconfig
git config --global alias.subcommit '!git add drawing-room-video/ && git commit -m "Update: Submodule pointer"'

# Then use: git subcommit (faster for frequent submodule updates)
```

---

## Related Documentation

- **CLAUDE.md** — Critical git rules (never force-push to main)
- **render-all-videos agent** — Uses this workflow for final commit
- **daily-git-sync agent** — Auto-commit workflow

---

*Last verified: 2026-05-19*
