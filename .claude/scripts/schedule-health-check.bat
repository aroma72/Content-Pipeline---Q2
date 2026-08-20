@echo off
REM Run this batch file as Administrator to schedule the daily health check
REM Right-click → Run as administrator

setlocal enabledelayedexpansion

echo.
echo ====== Drawing Room Daily Health Check Scheduler ======
echo.
echo This script will create a Windows Task Scheduler task to run
echo the infrastructure health check every day at 11:00 AM.
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run this batch file as Administrator
    echo Right-click the file and select "Run as administrator"
    pause
    exit /b 1
)

echo ✓ Running as Administrator
echo.

REM Set paths -- derived from this file's location, never hardcoded.
REM The project path contains a space ("Content Queen"), and an unquoted path
REM makes schtasks split it into Execute="c:\Users\Aroma" + stray arguments.
set "TASK_NAME=Drawing Room Daily Health Check"
set "WORK_DIR=%~dp0..\.."
set "RUNNER=%~dp0run-health-check.cmd"
set "SCRIPT_PATH=%~dp0infrastructure-check.sh"
set "BASH_PATH=C:\Program Files\Git\bin\bash.exe"

REM Normalise WORK_DIR to an absolute path without the ..\..
pushd "%WORK_DIR%" && set "WORK_DIR=%CD%" && popd

REM Check if bash exists
if not exist "%BASH_PATH%" (
    echo ERROR: Git Bash not found at "%BASH_PATH%"
    echo Please install Git for Windows from: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Check if script exists
if not exist "%SCRIPT_PATH%" (
    echo ERROR: Script not found at "%SCRIPT_PATH%"
    pause
    exit /b 1
)

REM Create the scheduled task
echo Creating scheduled task...
echo   Task: %TASK_NAME%
echo   Time: 11:00 AM daily
echo   Script: %SCRIPT_PATH%
echo.

REM /tr must receive the path wrapped in ESCAPED inner quotes ("\"...\""),
REM otherwise schtasks splits the command at the first space. The runner .cmd
REM handles cd, logging and redirection itself, so nothing else belongs here.
schtasks /create /tn "%TASK_NAME%" /tr "\"%RUNNER%\"" /sc daily /st 11:00 /f

if %errorLevel% equ 0 (
    echo.
    echo ✅ Task scheduled successfully!
    echo.
    echo Scheduled Task Details:
    echo   Name: %TASK_NAME%
    echo   Schedule: Daily at 11:00 AM
    echo   Working Dir: %WORK_DIR%
    echo   Script: %SCRIPT_PATH%
    echo   Log: %WORK_DIR%\.claude\logs\health.log
    echo.
    echo To verify:
    echo   schtasks /query /tn "%TASK_NAME%"
    echo.
    echo To remove:
    echo   schtasks /delete /tn "%TASK_NAME%" /f
    echo.
) else (
    echo ERROR: Failed to create scheduled task
    echo Error code: %errorLevel%
)

pause
