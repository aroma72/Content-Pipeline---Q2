@echo off
REM Runs the daily infrastructure health check.
REM Location-independent: derives the project root from this file's own path,
REM so it keeps working if the project moves. Do NOT hardcode paths here --
REM "Content Queen" contains a space and unquoted paths split on it.

setlocal

cd /d "%~dp0..\.." || exit /b 1
if not exist ".claude\logs" mkdir ".claude\logs"

set "BASH=C:\Program Files\Git\bin\bash.exe"
if not exist "%BASH%" (
    echo [%DATE% %TIME%] ERROR: Git bash not found at "%BASH%" >> ".claude\logs\health.log"
    exit /b 1
)

echo.>> ".claude\logs\health.log"
echo ===== health check run %DATE% %TIME% =====>> ".claude\logs\health.log"

REM Redirection is done by cmd, not inside bash -c, to avoid nested quoting.
REM The script path uses forward slashes so bash resolves it correctly.
"%BASH%" -c "bash .claude/scripts/infrastructure-check.sh" >> ".claude\logs\health.log" 2>&1
set "RC=%ERRORLEVEL%"

echo ===== exit code %RC% =====>> ".claude\logs\health.log"
exit /b %RC%
