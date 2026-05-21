---
type: operations
last_verified: 2026-05-20
owner: Aroma Tahir
---

# Scheduling Daily Health Check at 11:00 AM

**Purpose:** Run infrastructure health check automatically every day at 11:00 AM

---

## Option 1: Automatic Setup (Recommended) - Batch File

**Easiest way for Windows users**

1. **Locate the setup file:**
   ```
   .claude/scripts/schedule-health-check.bat
   ```

2. **Right-click and select "Run as administrator"**

3. **Confirm when prompted**

4. **Done!** Task will run daily at 11:00 AM

---

## Option 2: PowerShell Setup - Script File

**If batch file doesn't work**

1. **Open PowerShell as Administrator:**
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)"

2. **Run the setup script:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File ".claude\scripts\schedule-health-check.ps1"
   ```

3. **Done!** Task will run daily at 11:00 AM

---

## Option 3: Manual Task Scheduler Setup

**If automated scripts don't work**

1. **Open Task Scheduler:**
   - Press `Win + R`
   - Type `taskschd.msc`
   - Press Enter

2. **Create New Task:**
   - Right-click "Task Scheduler Library"
   - Select "Create Basic Task..."
   - Name: `Drawing Room Daily Health Check`
   - Click Next

3. **Set Trigger:**
   - Select "Daily"
   - Set time to `11:00 AM`
   - Click Next

4. **Set Action:**
   - Select "Start a program"
   - Program: `C:\Program Files\Git\bin\bash.exe`
   - Arguments: `-c "cd 'c:\Users\Aroma Tahir\Downloads\Content Queen' && bash '.claude\scripts\infrastructure-check.sh' >> .claude/logs/health.log 2>&1"`
   - Click Next

5. **Finish:**
   - Review settings
   - Click Finish

---

## Verification

### Check if task is scheduled:

**PowerShell:**
```powershell
Get-ScheduledTask -TaskName "Drawing Room Daily Health Check" | Select-Object *
```

**Command Prompt:**
```cmd
schtasks /query /tn "Drawing Room Daily Health Check"
```

### View health check results:

```bash
# View latest health check
tail .claude/logs/health.log

# View health status JSON
cat .claude/logs/health.json
```

---

## What Happens Daily at 11:00 AM

The scheduled task runs:
```bash
bash .claude/scripts/infrastructure-check.sh
```

This checks 10 infrastructure items:
1. ✅ prompts/ directory exists
2. ✅ No hardcoded prompts
3. ✅ Skills load prompts correctly
4. ✅ Logger writing
5. ✅ Eval dataset exists
6. ✅ Test files exist
7. ✅ Unit tests pass
8. ✅ Pipeline structure valid
9. ✅ pytest in requirements.txt
10. ✅ Memory system operational

Results are appended to: `.claude/logs/health.log`
Latest status: `.claude/logs/health.json`

---

## Troubleshooting

### Task not running at 11:00 AM?

1. **Verify the task exists:**
   ```powershell
   Get-ScheduledTask -TaskName "Drawing Room Daily Health Check"
   ```

2. **Check if task is enabled:**
   ```powershell
   (Get-ScheduledTask -TaskName "Drawing Room Daily Health Check").State
   # Should show: "Ready"
   ```

3. **Run the task manually to test:**
   ```powershell
   Start-ScheduledTask -TaskName "Drawing Room Daily Health Check"
   ```

4. **Check the log:**
   ```bash
   tail -20 .claude/logs/health.log
   ```

### "Git bash not found" error?

Install Git for Windows:
- https://git-scm.com/download/win
- Use default installation path: `C:\Program Files\Git`

### Task removed accidentally?

Run the setup script again:
```powershell
powershell -ExecutionPolicy Bypass -File ".claude\scripts\schedule-health-check.ps1"
```

---

## Remove the scheduled task (if needed)

**PowerShell:**
```powershell
Unregister-ScheduledTask -TaskName "Drawing Room Daily Health Check" -Confirm:$false
```

**Command Prompt:**
```cmd
schtasks /delete /tn "Drawing Room Daily Health Check" /f
```

---

## Timeline

- **11:00 AM daily** → Health check runs
- **< 5 seconds** → Check completes
- **Append to** `.claude/logs/health.log`
- **Update** `.claude/logs/health.json`
- **Status**: "healthy" or "unhealthy"

---

*Setup instructions created: 2026-05-20*
