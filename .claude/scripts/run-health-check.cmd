@echo off
cd /d "c:\Users\Aroma Tahir\Downloads\Content Queen"
"C:\Program Files\Git\bin\bash.exe" -c "bash '.\.claude\scripts\infrastructure-check.sh' >> .claude/logs/health.log 2>&1"
