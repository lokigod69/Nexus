@echo off
echo Starting Nexus (Claude Build)...
cd /d "%~dp0"

:: Check if port 3001 is available
netstat -ano | findstr ":3001.*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo Port 3001 is in use, trying port 3002...
    call npm run dev -- -p 3002
) else (
    call npm run dev -- -p 3001
)
