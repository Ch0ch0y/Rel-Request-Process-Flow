@echo off
title Rel Request Process Flow - Starting...
cd /d "%~dp0"

echo.
echo  ========================================
echo   Rel Request Process Flow - Easy Start
echo   Database: SQLite (no setup needed)
echo  ========================================
echo.

REM ── Check prerequisites ──────────────────────────────
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not on PATH.
    echo         Download it from https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo [OK] Python found
echo.

REM ── Backend setup ────────────────────────────────────
if not exist ".venv\Scripts\python.exe" (
    echo [Backend] Creating Python virtual environment...
    python -m venv ".venv"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

if not exist ".venv\Scripts\uvicorn.exe" (
    echo [Backend] Installing dependencies - please wait...
    call ".venv\Scripts\activate.bat"
    pip install --upgrade pip setuptools wheel >nul 2>&1
    pip install -r "backend\requirements.txt"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Python dependencies.
        pause
        exit /b 1
    )
) else (
    echo [Backend] Dependencies OK.
)

echo.
echo  ========================================
echo   Starting server...
echo   Website: http://localhost:8000
echo  ========================================
echo.

REM ── Start backend ────────────────────────────────────
title Rel Request Process Flow - Running

REM ── Open browser ─────────────────────────────────────
start "" http://localhost:8000
echo [Browser] Opening http://localhost:8000 ...
echo.
echo  ============================================
echo   Website is running at http://localhost:8000
echo.
echo   Press Ctrl+C here to stop the server.
echo  ============================================
echo.

call ".venv\Scripts\activate.bat"
python backend/server.py

echo.
echo Shutting down...
echo Done.
pause
