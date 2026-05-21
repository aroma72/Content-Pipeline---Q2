# Run this script as Administrator to schedule the daily health check
# Right-click PowerShell → Run as Administrator → paste: powershell -ExecutionPolicy Bypass -File "path\to\this\file.ps1"

$TaskName = "Drawing Room Daily Health Check"
$ScriptPath = "c:\Users\Aroma Tahir\Downloads\Content Queen\.claude\scripts\infrastructure-check.sh"
$WorkingDir = "c:\Users\Aroma Tahir\Downloads\Content Queen"
$BashPath = "C:\Program Files\Git\bin\bash.exe"

Write-Host "Setting up scheduled task..."
Write-Host "Task Name: $TaskName"
Write-Host "Time: 11:00 AM Daily"
Write-Host ""

# Verify prerequisites
if (!(Test-Path $BashPath)) {
    Write-Host "ERROR: Git bash not found at $BashPath"
    Write-Host "Please install Git for Windows from: https://git-scm.com/download/win"
    exit 1
}

if (!(Test-Path $ScriptPath)) {
    Write-Host "ERROR: Script not found at $ScriptPath"
    exit 1
}

# Create the scheduled task
$Action = New-ScheduledTaskAction `
  -Execute $BashPath `
  -Argument "-c `"cd '$WorkingDir' && bash '$ScriptPath' >> .claude/logs/health.log 2>&1`""

$Trigger = New-ScheduledTaskTrigger -Daily -At 11:00AM

$Principal = New-ScheduledTaskPrincipal `
  -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -RunLevel Highest

$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable

# Remove existing task if it exists
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($ExistingTask) {
    Write-Host "Removing existing task..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Register new task
Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Principal $Principal `
  -Settings $Settings `
  -Force | Out-Null

Write-Host ""
Write-Host "✅ Task scheduled successfully!"
Write-Host ""
Write-Host "Scheduled Task Details:"
Write-Host "  Name: $TaskName"
Write-Host "  Schedule: Daily at 11:00 AM"
Write-Host "  Working Dir: $WorkingDir"
Write-Host "  Script: $ScriptPath"
Write-Host "  Log Output: $WorkingDir\.claude\logs\health.log"
Write-Host ""
Write-Host "To verify:"
Write-Host "  Get-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
Write-Host "To remove:"
Write-Host "  Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
