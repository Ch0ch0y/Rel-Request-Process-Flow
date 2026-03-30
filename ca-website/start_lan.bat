@echo off
REM Quick starter script for CA Website LAN access
REM Shows the LAN IP and starts the server

setlocal enabledelayedexpansion

title CA Website - LAN Server
cd /d "%~dp0"

REM ── Get LAN IP Address ──────────────────────────────────
for /f "tokens=2 delims=: " %%a in ('ipconfig^|find "IPv4"') do (
    set "lanip=%%a"
)

REM ── Display startup info ───────────────────────────────────
echo.
echo ======================================================
echo  CA Website - LAN Server
echo ======================================================
echo.
echo  Server is starting on all network interfaces...
echo.
if defined lanip (
    echo  Network URL:  http://!lanip!:8001
) else (
    echo  [Note: Could not auto-detect LAN IP]
    echo  Use: ipconfig  to find your IPv4 Address
)
echo  Local URL:    http://localhost:8001
echo.
echo  Login Page:   http://localhost:8001/login
echo.
echo  Press Ctrl+C to stop the server
echo ======================================================
echo.

REM ── Start the server ───────────────────────────────────
call .venv\Scripts\activate.bat
set PORT=8001
python backend/server.py

pause
