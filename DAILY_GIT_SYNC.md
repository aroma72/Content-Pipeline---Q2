# Daily Git Sync System

## Overview
Automated daily git commit and push system that synchronizes all project changes to GitHub at 12pm every day.

## Components

### 1. Automated Sync Script
**File:** `daily_git_sync.ps1`
- PowerShell script that runs daily at 12pm
- Automatically stages all changes: `git add -A`
- Creates timestamped commit: `git commit -m "Daily sync: [TIMESTAMP]"`
- Pushes to remote: `git push origin main`
- Logs all operations to `daily_git_sync.log`

### 2. Windows Task Scheduler
**Task Name:** `ContentQueenDailyGitSync`
- Scheduled to run daily at 12:00 PM
- Runs with network availability check
- Automatically retries if network unavailable
- Can be managed via Windows Task Scheduler UI or PowerShell

### 3. Git Hooks

#### Pre-Push Hook (`.git/hooks/pre-push`)
- Validates commit freshness before any push
- Warns if last commit is older than 24 hours
- Requires user confirmation to push stale commits
- Enforces daily sync discipline

#### Post-Commit Hook (`.git/hooks/post-commit`)
- Logs every commit to `.git_audit.log`
- Records:
  - Commit timestamp
  - Commit hash
  - Number of files changed
  - Commit message
- Creates audit trail for compliance

## Usage

### Manual Run
To manually trigger the sync outside of scheduled time:
```powershell
C:\Users\Aroma Tahir\Downloads\Content Queen\daily_git_sync.ps1
```

### View Logs
Check sync history:
```powershell
Get-Content "C:\Users\Aroma Tahir\Downloads\Content Queen\daily_git_sync.log" -Tail 20
```

Check commit audit trail:
```powershell
Get-Content "C:\Users\Aroma Tahir\Downloads\Content Queen\.git_audit.log"
```

### Manage Scheduled Task
```powershell
# View task details
Get-ScheduledTask -TaskName ContentQueenDailyGitSync

# Disable task temporarily
Disable-ScheduledTask -TaskName ContentQueenDailyGitSync

# Re-enable task
Enable-ScheduledTask -TaskName ContentQueenDailyGitSync

# Remove task permanently
Unregister-ScheduledTask -TaskName ContentQueenDailyGitSync
```

## Daily Workflow

1. **Work on project** - make changes throughout the day
2. **12:00 PM** - Automatic sync triggers:
   - All changes are staged
   - Timestamped commit created
   - Changes pushed to GitHub
3. **Log check** - Optional: review `daily_git_sync.log` for confirmation

## Enforcement

### Pre-Push Validation
The pre-push hook prevents pushing if commits are stale:
```
⚠️  WARNING: Last commit was 25 hours ago
Daily git sync should run at 12pm each day.
Continue push anyway? (y/n)
```

### Commit Audit Trail
All commits are logged to `.git_audit.log` for audit purposes:
```
[COMMIT] 2026-05-14 12:00:15 -0500
  Hash: abc1234def567...
  Files changed: 8
  Message: Daily sync: 2026-05-14 12:00:15
```

## Troubleshooting

### Task Not Running
1. Check Task Scheduler: `Get-ScheduledTask -TaskName ContentQueenDailyGitSync`
2. Verify script path exists
3. Check event logs: `Get-WinEvent -LogName Microsoft-Windows-TaskScheduler/Operational`

### Git Push Failures
- Check internet connectivity
- Verify GitHub credentials/SSH key
- Review last commit: `git log -1`
- Manual push: `git push origin main`

### Permission Errors
- Ensure running PowerShell as Administrator
- Check file permissions on script and hooks
- Verify git is installed and accessible

## Security Notes

- Script runs with user credentials
- GitHub credentials should be SSH key-based (no plaintext passwords)
- Log files may contain file path information
- .git_audit.log is local only (not pushed to remote)

## Integration with Development Workflow

**Before Daily Sync:**
- Complete all work for the day
- Verify changes are as intended
- No additional manual commits needed

**During Daily Sync:**
- All staged changes are automatically committed
- All commits are pushed to GitHub
- Log file updated with timestamp

**After Daily Sync:**
- GitHub repository reflects current project state
- Full audit trail maintained
- Team members can pull latest changes anytime
