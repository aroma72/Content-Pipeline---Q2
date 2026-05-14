#!/usr/bin/env pwsh
<#
.SYNOPSIS
Daily git sync script - commits and pushes all changes to GitHub at 12pm
.DESCRIPTION
Runs `git add`, `git commit`, and `git push` to keep the repository synchronized.
Logs output to daily_git_sync.log for audit trail.
#>

$ErrorActionPreference = "Continue"
$LogPath = "C:\Users\Aroma Tahir\Downloads\Content Queen\daily_git_sync.log"
$RepoPath = "C:\Users\Aroma Tahir\Downloads\Content Queen"

function Log-Message {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Add-Content -Path $LogPath -Value $LogEntry
    Write-Host $LogEntry
}

Log-Message "====== Daily Git Sync Started ======"

try {
    Set-Location $RepoPath

    # Check if repository is clean or has changes
    $Status = git status --porcelain

    if ($Status) {
        Log-Message "Changes detected. Committing..."

        # Stage all changes
        git add -A
        Log-Message "Staged all changes"

        # Create commit with timestamp
        $CommitMessage = "Daily sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git commit -m $CommitMessage
        Log-Message "Committed with message: $CommitMessage"

        # Push to remote
        git push origin main
        Log-Message "Pushed to origin/main"
    } else {
        Log-Message "No changes to commit"
    }

    Log-Message "====== Daily Git Sync Completed Successfully ======"
}
catch {
    Log-Message "Error during git sync: $_" "ERROR"
    Log-Message "====== Daily Git Sync Failed ======"
    exit 1
}
