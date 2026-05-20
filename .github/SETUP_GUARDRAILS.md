# Setup Guardrails — Infrastructure Protection

**One-time setup to activate all 6 protection layers.**

---

## Step 1: GitHub Actions (Automatic)

**Status:** ✅ **Already active**

File: `.github/workflows/test.yml`

**What it does:**
- Runs on every push and pull request
- Blocks merge if any test fails
- No setup needed

**Check status:**
- Visit: https://github.com/{org}/{repo}/actions
- Look for "Test & Validate Infrastructure" workflow
- Should show ✅ on all recent commits

---

## Step 2: Pre-commit Hooks (Requires Installation)

**Status:** ⏳ **Needs setup**

### Install (One time)

#### macOS / Linux:
```bash
cd /path/to/Content\ Queen
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

#### Windows (PowerShell):
```powershell
cd "c:\Users\Aroma Tahir\Downloads\Content Queen"
Copy-Item ".github\hooks\pre-commit" ".git\hooks\pre-commit"
```

### Verify:
```bash
git commit --allow-empty -m "test"
# Should output: "Running pre-commit checks..."
# If it runs without "error" → ✅ Working
```

### What it blocks:
- ❌ Hardcoded SYSTEM_PROMPT in skills/ or agents/
- ❌ Deletion of prompts/, tests/, .claude/logs/
- ❌ Removing pytest from requirements.txt
- ❌ Committing secrets (AWS keys, API keys, etc.)

---

## Step 3: Daily Health Check (Requires Scheduling)

**Status:** ⏳ **Needs scheduling**

### Schedule (One time setup)

#### macOS / Linux (Cron):
```bash
# Open crontab
crontab -e

# Add this line (runs at 6 AM daily)
0 6 * * * cd /path/to/Content\ Queen && bash .claude/scripts/infrastructure-check.sh >> .claude/logs/health.log 2>&1
```

#### Windows (Task Scheduler):
```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "C:\Windows\System32\bash.exe" `
  -Argument "-c 'cd /mnt/c/Users/Aroma\ Tahir/Downloads/Content\ Queen && bash .claude/scripts/infrastructure-check.sh'"

$trigger = New-ScheduledTaskTrigger -Daily -At 6am

Register-ScheduledTask -TaskName "Drawing Room Daily Health Check" `
  -Action $action -Trigger $trigger
```

#### Alternative: Run Manually
```bash
bash .claude/scripts/infrastructure-check.sh
```

### What it checks (10 items):
1. ✅ prompts/ directory exists
2. ✅ No hardcoded prompts
3. ✅ Skills load prompts correctly
4. ✅ Logger is writing
5. ✅ Eval dataset exists
6. ✅ Test files exist
7. ✅ Unit tests pass
8. ✅ Pipeline structure valid
9. ✅ pytest in requirements.txt
10. ✅ Memory system operational

### View Results:
```bash
cat .claude/logs/health.json | jq .
# Status: "healthy" or "unhealthy"
```

---

## Step 4: Team Practices (Documentation)

**Status:** ✅ **Already set up**

File: `docs/infrastructure-maintenance.md`

**What the team needs to know:**
- Before pushing: Run `pytest tests/ -v` locally
- Code review: Check no hardcoded prompts
- Monthly: Review health.json for failures
- When adding a skill: Create prompt file + test file

**Share with team:**
```bash
# Print checklist
cat docs/infrastructure-maintenance.md | grep -A 20 "Weekly Maintenance"
```

---

## Step 5: Memory Tracking (Documentation)

**Status:** ✅ **Already updated**

Files:
- Memory index: `~/.claude/projects/*/memory/MEMORY.md`
- Context loss resolution: `~/.claude/projects/*/memory/context_loss_audit_resolved.md`

**What's tracked:**
- Infrastructure is operational (not aspirational)
- Testing framework established
- Prompts versioned
- Next steps for expansion

---

## Step 6: Health Dashboard (Already Initialized)

**Status:** ✅ **Ready to use**

File: `.claude/logs/health.json`

**View the latest check:**
```bash
cat .claude/logs/health.json
```

**View all historical checks:**
```bash
tail -50 .claude/logs/health.log
```

**Example output:**
```json
{
  "check_time": "2026-05-20T06:00:00Z",
  "status": "healthy",
  "checks": {
    "prompts_directory": {"status": "pass", "detail": "4 files"},
    "unit_tests": {"status": "pass", "detail": "8/8 passing"}
  },
  "next_check": "2026-05-21T06:00:00Z"
}
```

---

## Verification Checklist

After setup, verify all layers are active:

- [ ] **GitHub Actions**: Visit Actions tab, see "Test & Validate Infrastructure" passing
- [ ] **Pre-commit hooks**: Run `git commit --allow-empty -m "test"` → see "pre-commit checks"
- [ ] **Daily health check**: Run `.claude/scripts/infrastructure-check.sh` → all checks pass
- [ ] **Team practices**: Share `docs/infrastructure-maintenance.md` with team
- [ ] **Memory**: Check `context_loss_audit_resolved.md` exists in memory
- [ ] **Health dashboard**: Run `cat .claude/logs/health.json` → status is "healthy"

---

## Quick Troubleshooting

### Pre-commit hook not running?
```bash
# Check if installed
ls -la .git/hooks/pre-commit

# Reinstall
cp .github/hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

### Health check script errors?
```bash
# Run with verbose output
bash -x .claude/scripts/infrastructure-check.sh

# Check for missing dependencies
python -m pytest --version
```

### Tests failing?
```bash
# Run locally first
pytest tests/test_signal_intake.py -v --tb=short

# Install dependencies
pip install -r requirements.txt
```

---

## Next Steps

1. **Install pre-commit hook** (Linux/macOS users)
2. **Schedule daily health check** (optional but recommended)
3. **Share maintenance guide** with team: `docs/infrastructure-maintenance.md`
4. **Monitor health.json** weekly for any "unhealthy" status
5. **Review memory** every 60 days to keep it fresh

---

## Timeline

| When | What | Status |
|------|------|--------|
| Now | GitHub Actions (auto) | ✅ Active |
| This week | Pre-commit hooks | ⏳ Needs setup |
| This week | Health check cron | ⏳ Needs setup |
| Ongoing | Team practices | ✅ Documented |
| Ongoing | Memory tracking | ✅ Active |
| Ongoing | Health monitoring | ✅ Initialized |

---

*Setup started: 2026-05-20*  
*Expected completion: 2026-05-21*

For questions, see: `docs/infrastructure-maintenance.md`
