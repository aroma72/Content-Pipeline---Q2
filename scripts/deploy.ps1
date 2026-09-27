# Deploy content-queen from PowerShell.
#
#   .\scripts\deploy.ps1
#
# WHY THIS EXISTS. `bash scripts/deploy.sh` looks like it should work and does
# not: on this machine `bash` resolves to C:\Windows\System32\bash.exe, which is
# the Microsoft WSL launcher, not Git Bash. With no WSL distro installed it exits
# with "The system cannot find the file specified" -- an error that names no
# file, mentions neither bash nor WSL, and reads exactly like a missing
# deploy.sh. Someone lost a deploy window to it on 2026-09-28.
#
# This finds the real Git Bash and hands it the script, so the deploy has one
# entry point per shell and neither of them is a guess.
#
# Every argument is forwarded, so `.\scripts\deploy.ps1 --dry-run` reaches
# deploy.sh unchanged.

$ErrorActionPreference = 'Stop'

$candidates = @(
    "$env:ProgramFiles\Git\bin\bash.exe",
    "${env:ProgramFiles(x86)}\Git\bin\bash.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\bash.exe"
)

# `git.exe` is almost always on PATH even when Git Bash is installed somewhere
# unusual, and bash sits two directories up from it. Cheaper than guessing again.
$gitCmd = Get-Command git.exe -ErrorAction SilentlyContinue
if ($gitCmd) {
    $candidates += (Join-Path (Split-Path (Split-Path $gitCmd.Source -Parent) -Parent) 'bin\bash.exe')
}

$bash = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $bash) {
    Write-Error ("Git Bash was not found. Looked in:`n  " + ($candidates -join "`n  ") + @"

Do NOT fall back to plain ``bash``: on this machine that is the WSL launcher and
it fails with a message that names no file.
"@)
    exit 1
}

# Repo root, so the deploy works from any directory.
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root
try {
    & $bash 'scripts/deploy.sh' @args
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
