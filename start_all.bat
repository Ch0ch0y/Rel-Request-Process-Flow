@echo off
setlocal EnableDelayedExpansion
title Amkor Apps - Starting...
cd /d "%~dp0"

echo.
echo  ================================================================
echo    Amkor Apps Launcher
echo    Starting REL Request  ^|^|  CA Request
echo  ================================================================
echo.

REM ── Resolve absolute paths ───────────────────────────────────────
set "ROOT=%~dp0"
set "REL_ROOT=%ROOT%Rel Website"
set "CA_ROOT=%ROOT%ca-website"

set "REL_BACKEND=%REL_ROOT%\backend"
set "REL_FRONTEND=%REL_ROOT%\frontend"
set "CA_BACKEND=%CA_ROOT%\backend"
set "CA_FRONTEND=%CA_ROOT%\frontend"

set "REL_VENV=%REL_BACKEND%\.venv"
set "CA_VENV=%CA_BACKEND%\.venv"

REM ── Find a real Python executable (bypasses Windows Store alias) ─
set "PYTHON_EXE="

REM 1) Prefer the REL venv python if it already exists
if exist "%REL_VENV%\Scripts\python.exe" (
    set "PYTHON_EXE=%REL_VENV%\Scripts\python.exe"
    goto :python_found
)

REM 2) Try the "py" launcher (Python Launcher for Windows)
py -3 --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('py -3 -c "import sys; print(sys.executable)"') do set "PYTHON_EXE=%%i"
    goto :python_found
)

REM 3) Try common install locations
for %%P in (
    "%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python39\python.exe"
    "C:\Python313\python.exe"
    "C:\Python312\python.exe"
    "C:\Python311\python.exe"
    "C:\Python310\python.exe"
) do (
    if exist %%P (
        set "PYTHON_EXE=%%~P"
        goto :python_found
    )
)

echo [ERROR] Could not locate a real Python installation.
echo         Download Python from https://www.python.org/downloads/
echo         Make sure to check "Add Python to PATH" during install.
pause & exit /b 1

:python_found
echo [OK] Python found: %PYTHON_EXE%

REM ── Check Node.js ───────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Download: https://nodejs.org/
    pause & exit /b 1
)
echo [OK] Node.js found
echo.

REM ── REL Backend venv ────────────────────────────────────────────
echo [REL Backend] Checking virtual environment...
if not exist "%REL_VENV%\Scripts\python.exe" (
    echo [REL Backend] Creating virtual environment...
    "%PYTHON_EXE%" -m venv "%REL_VENV%"
    if %errorlevel% neq 0 ( echo [ERROR] Failed to create REL venv. & pause & exit /b 1 )
)
if not exist "%REL_VENV%\Scripts\uvicorn.exe" (
    echo [REL Backend] Installing dependencies...
    "%REL_VENV%\Scripts\python.exe" -m pip install --upgrade pip setuptools wheel >nul 2>&1
    "%REL_VENV%\Scripts\python.exe" -m pip install -r "%REL_BACKEND%\requirements.txt"
    if %errorlevel% neq 0 ( echo [ERROR] Failed to install REL backend deps. & pause & exit /b 1 )
) else (
    echo [REL Backend] Dependencies OK.
)

REM ── CA Backend venv ──────────────────────────────────────────────
REM   Use the REL venv's real python.exe to create the CA venv
echo [CA  Backend] Checking virtual environment...
if not exist "%CA_VENV%\Scripts\python.exe" (
    echo [CA  Backend] Creating virtual environment...
    "%REL_VENV%\Scripts\python.exe" -m venv "%CA_VENV%"
    if %errorlevel% neq 0 ( echo [ERROR] Failed to create CA venv. & pause & exit /b 1 )
)
if not exist "%CA_VENV%\Scripts\uvicorn.exe" (
    echo [CA  Backend] Installing dependencies...
    "%CA_VENV%\Scripts\python.exe" -m pip install --upgrade pip setuptools wheel >nul 2>&1
    "%CA_VENV%\Scripts\python.exe" -m pip install -r "%CA_BACKEND%\requirements.txt"
    if %errorlevel% neq 0 ( echo [ERROR] Failed to install CA backend deps. & pause & exit /b 1 )
) else (
    echo [CA  Backend] Dependencies OK.
)

REM ── REL Frontend deps ───────────────────────────────────────────
echo [REL Frontend] Checking node_modules...
if not exist "%REL_FRONTEND%\node_modules" (
    echo [REL Frontend] Installing dependencies...
    cd /d "%REL_FRONTEND%"
    call npm install
    if %errorlevel% neq 0 ( echo [ERROR] Failed to install REL frontend deps. & pause & exit /b 1 )
    cd /d "%ROOT%"
) else (
    echo [REL Frontend] Dependencies OK.
)

REM ── CA Frontend deps ────────────────────────────────────────────
echo [CA  Frontend] Checking node_modules...
if not exist "%CA_FRONTEND%\node_modules" (
    echo [CA  Frontend] Installing dependencies...
    cd /d "%CA_FRONTEND%"
    call npm install
    if %errorlevel% neq 0 ( echo [ERROR] Failed to install CA frontend deps. & pause & exit /b 1 )
    cd /d "%ROOT%"
) else (
    echo [CA  Frontend] Dependencies OK.
)

echo.
echo  ================================================================
echo    All dependencies ready. Launching all services...
echo.
echo    REL Backend  ->  http://localhost:8000
echo    REL Frontend ->  http://localhost:3000
echo    CA  Backend  ->  http://localhost:8001
echo    CA  Frontend ->  http://localhost:3001
echo  ================================================================
echo.

REM ── Write helper cmd scripts ────────────────────────────────────
> "%ROOT%_start_rel_backend.cmd" (
    echo @echo off
    echo title REL Backend ^(port 8000^)
    echo cd /d "%REL_BACKEND%"
    echo "%REL_VENV%\Scripts\python.exe" -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
)

> "%ROOT%_start_ca_backend.cmd" (
    echo @echo off
    echo title CA Backend ^(port 8001^)
    echo cd /d "%CA_BACKEND%"
    echo "%CA_VENV%\Scripts\python.exe" -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
)

> "%ROOT%_start_rel_frontend.cmd" (
    echo @echo off
    echo title REL Frontend ^(port 3000^)
    echo cd /d "%REL_FRONTEND%"
    echo call npm run dev
)

> "%ROOT%_start_ca_frontend.cmd" (
    echo @echo off
    echo title CA Frontend ^(port 3001^)
    echo cd /d "%CA_FRONTEND%"
    echo call npm run dev
)

REM ── Start backends (minimized) ──────────────────────────────────
start "REL-Backend" /min cmd /c "%ROOT%_start_rel_backend.cmd"
echo [REL Backend] Started (minimized)
timeout /t 2 /nobreak >nul

start "CA-Backend" /min cmd /c "%ROOT%_start_ca_backend.cmd"
echo [CA  Backend] Started (minimized)
timeout /t 3 /nobreak >nul

REM ── Start CA frontend (minimized) ───────────────────────────────
start "CA-Frontend" /min cmd /c "%ROOT%_start_ca_frontend.cmd"
echo [CA  Frontend] Started (minimized)
timeout /t 2 /nobreak >nul

REM ── Open browsers ───────────────────────────────────────────────
start "" http://localhost:3000
start "" http://localhost:3001
echo [Browser] Opening REL -> http://localhost:3000
echo [Browser] Opening CA  -> http://localhost:3001
echo.

echo  ================================================================
echo    All services are running.
echo    Close this window (or press Ctrl+C) to STOP everything.
echo  ================================================================
echo.

REM ── Start REL frontend in foreground (blocks until closed) ──────
title Amkor Apps - Running (close to stop all)
cd /d "%REL_FRONTEND%"
call npm run dev

REM ── Cleanup on exit ─────────────────────────────────────────────
echo.
echo Shutting down all services...
taskkill /fi "WINDOWTITLE eq REL-Backend*"  /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq CA-Backend*"   /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq CA-Frontend*"  /f >nul 2>&1
cd /d "%ROOT%"
del "%ROOT%_start_rel_backend.cmd"  >nul 2>&1
del "%ROOT%_start_ca_backend.cmd"   >nul 2>&1
del "%ROOT%_start_rel_frontend.cmd" >nul 2>&1
del "%ROOT%_start_ca_frontend.cmd"  >nul 2>&1
echo Done. All services stopped.
pause
