@echo off
title Rel Request - LAN Production Deploy
cd /d "%~dp0"

echo.
echo  =====================================================
echo   Rel Request Process Flow - LAN Production Deploy
echo   This builds the frontend and starts the server
echo   so anyone on your network can access it.
echo  =====================================================
echo.

REM ── Check prerequisites ──────────────────────────────
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not on PATH.
    pause & exit /b 1
)
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not on PATH.
    pause & exit /b 1
)
echo [OK] Python and Node.js found.

REM ── Backend venv setup ───────────────────────────────
if not exist "backend\.venv\Scripts\python.exe" (
    echo [Backend] Creating virtual environment...
    python -m venv "backend\.venv"
)
if not exist "backend\.venv\Scripts\uvicorn.exe" (
    echo [Backend] Installing dependencies...
    call "backend\.venv\Scripts\activate.bat"
    pip install --upgrade pip setuptools wheel >nul 2>&1
    pip install -r "backend\requirements.txt"
) else (
    echo [Backend] Dependencies OK.
)

REM ── Frontend build ───────────────────────────────────
if not exist "frontend\node_modules" (
    echo [Frontend] Installing dependencies...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
)

echo [Frontend] Building production bundle...
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    pause & exit /b 1
)
cd /d "%~dp0"
echo [Frontend] Build complete - dist/ folder ready.

REM ── Get local IP ─────────────────────────────────────
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "LOCAL_IP=%%a"
)
set LOCAL_IP=%LOCAL_IP: =%

echo.
echo  =====================================================
echo   Server starting on port 8000
echo.
echo   Access from THIS computer:
echo     http://localhost:8000
echo.
echo   Access from OTHER computers on your network:
echo     http://%LOCAL_IP%:8000
echo.
echo   Keep this window open to keep the server running.
echo   Press Ctrl+C to stop.
echo  =====================================================
echo.

REM ── Start backend (serves API + built frontend) ──────
cd /d "%~dp0backend"
call "%~dp0backend\.venv\Scripts\activate.bat"
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 1
pause
