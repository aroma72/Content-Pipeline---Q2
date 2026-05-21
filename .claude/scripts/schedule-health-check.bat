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

REM Set paths
set "TASK_NAME=Drawing Room Daily Health Check"
set "SCRIPT_PATH=c:\Users\Aroma Tahir\Downloads\Content Queen\.claude\scripts\infrastructure-check.sh"
set "WORK_DIR=c:\Users\Aroma Tahir\Downloads\Content Queen"
set "BASH_PATH=C:\Program Files\Git\bin\bash.exe"

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

schtasks /create /tn "%TASK_NAME%" /tr "cmd /c cd /d \"%WORK_DIR%\" && \"%BASH_PATH%\" -c \"bash '%SCRIPT_PATH%' >> .claude/logs/health.log 2>&1\"" /sc daily /st 11:00 /f

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
