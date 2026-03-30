@echo off
title CA Request - LAN Production Deploy
cd /d "%~dp0"

echo.
echo  =====================================================
echo   CA Request Process Flow - LAN Production Deploy
echo   Builds the frontend and starts the server so
echo   anyone on your network can access it.
echo   Backend port: 8001
echo  =====================================================
echo.

REM ── Find real python (bypass Windows Store alias) ────
set "PYTHON_EXE="
if exist "backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=backend\.venv\Scripts\python.exe"
    goto :py_found
)
py -3 --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('py -3 -c "import sys; print(sys.executable)"') do set "PYTHON_EXE=%%i"
    goto :py_found
)
for %%P in (
    "%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
) do ( if exist %%P ( set "PYTHON_EXE=%%~P" & goto :py_found ) )
echo [ERROR] Python not found. Download: https://www.python.org/downloads/
pause & exit /b 1
:py_found
echo [OK] Python: %PYTHON_EXE%

where node >nul 2>&1
if %errorlevel% neq 0 ( echo [ERROR] Node.js not found. & pause & exit /b 1 )
echo [OK] Node.js found.

REM ── Backend venv setup ───────────────────────────────
if not exist "backend\.venv\Scripts\python.exe" (
    echo [Backend] Creating virtual environment...
    "%PYTHON_EXE%" -m venv "backend\.venv"
    if %errorlevel% neq 0 ( echo [ERROR] Failed to create venv. & pause & exit /b 1 )
)
if not exist "backend\.venv\Scripts\uvicorn.exe" (
    echo [Backend] Installing dependencies...
    "backend\.venv\Scripts\python.exe" -m pip install --upgrade pip setuptools wheel >nul 2>&1
    "backend\.venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt"
    if %errorlevel% neq 0 ( echo [ERROR] Failed to install backend deps. & pause & exit /b 1 )
) else (
    echo [Backend] Dependencies OK.
)

REM ── Frontend build ───────────────────────────────────
if not exist "frontend\node_modules" (
    echo [Frontend] Installing npm dependencies...
    cd /d "%~dp0frontend"
    call npm install
    if %errorlevel% neq 0 ( echo [ERROR] npm install failed. & pause & exit /b 1 )
    cd /d "%~dp0"
)

echo [Frontend] Building production bundle...
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 ( echo [ERROR] Frontend build failed. & pause & exit /b 1 )
cd /d "%~dp0"
echo [Frontend] Build complete - dist/ folder ready.

REM ── Get local IP ─────────────────────────────────────
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do ( set "LOCAL_IP=%%a" )
set LOCAL_IP=%LOCAL_IP: =%

echo.
echo  =====================================================
echo   CA Server starting on port 8001
echo.
echo   Access from THIS computer:
echo     http://localhost:8001
echo.
echo   Access from OTHER computers on your network:
echo     http://%LOCAL_IP%:8001
echo.
echo   Keep this window open to keep the server running.
echo   Press Ctrl+C to stop.
echo  =====================================================
echo.

REM ── Start backend (serves API + built frontend) ──────
cd /d "%~dp0backend"
"%~dp0backend\.venv\Scripts\python.exe" -m uvicorn server:app --host 0.0.0.0 --port 8001 --workers 1
pause
