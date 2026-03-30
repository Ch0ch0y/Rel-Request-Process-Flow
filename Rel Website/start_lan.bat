@echo off
REM Quick starter script for LAN access
REM Shows the LAN IP and starts both REL and CA servers

setlocal enabledelayedexpansion

title Rel Request Process Flow - LAN Server
cd /d "%~dp0"

REM ── Get LAN IP Address ──────────────────────────────────
for /f "tokens=2 delims=: " %%a in ('ipconfig^|find "IPv4"') do (
    set "lanip=%%a"
)

REM ── Display startup info ───────────────────────────────────
echo.
echo ======================================================
echo  Rel Request Process Flow - LAN Server
echo ======================================================
echo.
echo  Server is starting on all network interfaces...
echo.
if defined lanip (
    echo  ── REL Website ──────────────────────────────
    echo    Network:  http://!lanip!:8000
    echo    Local:    http://localhost:8000
    echo.
    echo  ── CA Website ───────────────────────────────
    echo    Network:  http://!lanip!:8001
    echo    Local:    http://localhost:8001
) else (
    echo  [Note: Could not auto-detect LAN IP]
    echo  Use: ipconfig  to find your IPv4 Address
    echo  Local REL:  http://localhost:8000
    echo  Local CA:   http://localhost:8001
)
echo.
echo  Share the Network URLs with other computers!
echo.
echo  IMPORTANT: Run open_firewall.bat as Administrator first
echo             to allow other computers to connect.
echo.
echo  Press Ctrl+C to stop the server
echo ======================================================
echo.

REM ── Start the CA server in background ──────────────────
if exist "..\ca-website\backend\server.py" (
    echo Starting CA Website server on port 8001...
    start "CA Website Server" cmd /c "cd /d "%~dp0..\ca-website" && call .venv\Scripts\activate.bat 2>nul && set PORT=8001 && python backend/server.py"
    echo CA server started in background window.
    echo.
)

REM ── Start the REL server ───────────────────────────────
call .venv\Scripts\activate.bat
python backend/server.py

pause
