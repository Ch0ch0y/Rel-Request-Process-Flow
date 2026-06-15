@echo off
setlocal enabledelayedexpansion
title RELDMS - Rel and CA Website Launcher
cd /d "%~dp0"
color 0B

REM Resolve python path - prefer venv, fallback to PATH
set "PYTHON_EXE="
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
) else (
    where python >nul 2>&1
    if !errorlevel! equ 0 (
        for /f "tokens=*" %%p in ('where python') do set "PYTHON_EXE=%%p"
    )
)

REM Window titles used for managing server processes
set "REL_WIN_TITLE=RELDMS-REL-Server"
set "CA_WIN_TITLE=RELDMS-CA-Server"

:menu
cls
echo.
echo  +======================================================+
echo  :                                                      :
echo  :       RELDMS - Rel ^& CA Website Launcher            :
echo  :       Auto-Setup Frontend + Backend                  :
echo  :                                                      :
echo  +======================================================+
echo  :                                                      :
echo  :   [1]  Local Only   (This PC only)                   :
echo  :        REL: http://localhost:8000                     :
echo  :        CA:  http://localhost:8001                     :
echo  :                                                      :
echo  :   [2]  Deploy All (LAN)  (All PCs on network)        :
echo  :        Accessible from any computer on your LAN      :
echo  :                                                      :
echo  :   [3]  Restart Servers  (Stop + relaunch)            :
echo  :                                                      :
echo  :   [4]  Stop All Servers                              :
echo  :                                                      :
echo  :   [5]  Build Frontend Only  (Rebuild React app)      :
echo  :                                                      :
echo  :   [6]  Exit                                          :
echo  :                                                      :
echo  +======================================================+
echo.
set /p choice="  Select option [1-6]: "

if "%choice%"=="1" goto :local
if "%choice%"=="2" goto :lan
if "%choice%"=="3" goto :restart
if "%choice%"=="4" goto :stop_all
if "%choice%"=="5" goto :build_only
if "%choice%"=="6" exit /b 0
echo.
echo  Invalid choice. Try again.
timeout /t 2 /nobreak >nul
goto :menu

REM ======================================================
REM  OPTION 5: Build Frontend Only
REM ======================================================
:build_only
cls
echo.
echo  Building frontends...
echo.
call :setup_rel_frontend
if exist "%~dp0..\ca-website\frontend\package.json" (
    call :setup_ca_frontend
)
echo.
color 0A
echo  Frontend builds complete!
echo.
pause
color 0B
goto :menu

REM ======================================================
REM  OPTION 3: Restart Servers
REM ======================================================
:restart
cls
echo.
echo  +----------------------------------------------+
echo  :   Restarting all RELDMS servers...           :
echo  +----------------------------------------------+
echo.
call :kill_servers
echo  Waiting for ports to clear...
timeout /t 3 /nobreak >nul
if not defined DEPLOY_MODE set "DEPLOY_MODE=local"
if not defined HOST_ADDR set "HOST_ADDR=localhost"
echo  Relaunching servers...
goto :launch

REM ======================================================
REM  OPTION 4: Stop All Servers
REM ======================================================
:stop_all
cls
echo.
echo  +----------------------------------------------+
echo  :   Stopping all RELDMS servers...             :
echo  +----------------------------------------------+
echo.
call :kill_servers
color 0A
echo.
echo  All servers stopped.
echo.
color 0B
pause
goto :menu

REM ======================================================
REM  OPTION 1: Local Only
REM ======================================================
:local
cls
set "DEPLOY_MODE=local"
set "HOST_ADDR=localhost"
echo.
echo  +----------------------------------------------+
echo  :   Mode: LOCAL (This PC only)                 :
echo  +----------------------------------------------+
echo.
goto :setup

REM ======================================================
REM  OPTION 2: Deploy All (LAN) / Shared Network
REM ======================================================
:lan
cls
set "DEPLOY_MODE=lan"

REM Detect LAN IP — uses PowerShell to get the real 10.x/172.x/192.168.x IP, not APIPA
set "LANIP="
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object -First 1).IPAddress"`) do set "LANIP=%%a"

if defined LANIP (
    set "HOST_ADDR=!LANIP!"
) else (
    set "HOST_ADDR=%COMPUTERNAME%"
)

cls
color 0B
echo.
echo  +======================================================+
echo  :                                                      :
echo  :       RELDMS - Deploy All (LAN) Mode                :
echo  :                                                      :
echo  +======================================================+
echo  :                                                      :
echo  :   SHARE THIS URL WITH OTHER COMPUTERS:              :
echo  :                                                      :
echo  :     http://!HOST_ADDR!:8000                         :
echo  :                                                      :
echo  +======================================================+
echo.
echo    Copy and paste that URL into the browser on
echo    any computer connected to the same network.
echo.
echo  ----------------------------------------------------------
echo   NOTE: If others CANNOT connect, the company firewall
echo   may be blocking port 8000. Run open_firewall.bat as
echo   Administrator on this PC.
echo  ----------------------------------------------------------
echo.
pause
goto :setup

REM ======================================================
REM  SETUP: Python, Dependencies, Frontend Build
REM ======================================================
:setup

REM Check python is available
if not defined PYTHON_EXE (
    color 0C
    echo  [ERROR] Python not found.
    echo          Install Python and rerun, or create venv first.
    pause
    goto :menu
)

REM Stop any existing servers before deploying
call :kill_servers
timeout /t 2 /nobreak >nul

echo  -- Step 1: Python --------------------------------
echo     Using: !PYTHON_EXE!
echo.

REM -- REL Website Setup --
echo  -- Step 2: Setting up REL Website ----------------
call :setup_rel_backend
call :setup_rel_frontend
echo.

REM -- CA Website Setup --
echo  -- Step 3: Setting up CA Website -----------------
if exist "%~dp0..\ca-website\backend\server.py" (
    call :setup_ca_backend
    if exist "%~dp0..\ca-website\frontend\package.json" (
        call :setup_ca_frontend
    )
    set "CA_AVAILABLE=1"
    echo     CA Website found and ready.
) else (
    set "CA_AVAILABLE=0"
    echo     CA Website not found at ..\ca-website\
    echo     Skipping CA setup. Only REL will run.
)
echo.

REM -- Check Ports --
echo  -- Step 4: Checking ports ------------------------
call :check_port 8000 REL
if "!CA_AVAILABLE!"=="1" call :check_port 8001 CA
echo.

:launch
REM ======================================================
REM  LAUNCH: Start servers via helper bat files
REM  Uses individual echo >> lines with %VAR% regular expansion
REM  so the Python path is always correctly written to the helper file.
REM ======================================================
echo  -- Step 5: Launching servers ---------------------
echo.

if not defined CA_AVAILABLE set "CA_AVAILABLE=0"

REM --- Write REL server helper to %TEMP% (no spaces in %TEMP% path) ---
set "REL_HELPER=%TEMP%\reldms_rel.bat"
echo @echo off > "%REL_HELPER%"
echo cd /d "%~dp0" >> "%REL_HELPER%"
echo set HOST=0.0.0.0 >> "%REL_HELPER%"
echo set PORT=8000 >> "%REL_HELPER%"
echo "%PYTHON_EXE%" backend/server.py >> "%REL_HELPER%"

echo  Starting REL Website on port 8000...
start "!REL_WIN_TITLE!" cmd /k "%REL_HELPER%"
echo     REL server started in background window.
echo.

REM --- Write CA server helper ---
if not defined CA_DIR set "CA_DIR=%~dp0..\ca-website"
if not defined CA_PY (
    set "CA_PY=!CA_DIR!\.venv\Scripts\python.exe"
    if not exist "!CA_PY!" set "CA_PY=%PYTHON_EXE%"
)
set "CA_HELPER=%TEMP%\reldms_ca.bat"
echo @echo off > "%CA_HELPER%"
echo cd /d "%CA_DIR%" >> "%CA_HELPER%"
echo set HOST=0.0.0.0 >> "%CA_HELPER%"
echo set PORT=8001 >> "%CA_HELPER%"
echo "%CA_PY%" backend/server.py >> "%CA_HELPER%"

if "!CA_AVAILABLE!"=="1" (
    echo  Starting CA Website on port 8001...
    start "!CA_WIN_TITLE!" cmd /k "%CA_HELPER%"
    echo     CA server started in background window.
    echo.
)

REM Brief pause for servers to come up
timeout /t 3 /nobreak >nul

color 0A
echo.
echo  +======================================================+
echo  :                                                      :
echo  :   RELDMS is running!                                 :
echo  :                                                      :
if "!DEPLOY_MODE!"=="lan" (
echo  :   -- REL Website --                                  :
echo  :   Network:  http://!HOST_ADDR!:8000                  :
echo  :   Local:    http://localhost:8000                     :
echo  :                                                      :
if "!CA_AVAILABLE!"=="1" (
echo  :   -- CA Website --                                   :
echo  :   Network:  http://!HOST_ADDR!:8001                  :
echo  :   Local:    http://localhost:8001                     :
echo  :                                                      :
)
echo  :   Share the Network URLs with other computers!       :
) else (
echo  :   REL Website:  http://localhost:8000                :
if "!CA_AVAILABLE!"=="1" (
echo  :   CA Website:   http://localhost:8001                :
)
)
echo  :                                                      :
echo  :   Servers run in separate windows.                   :
echo  :   Use [3] Restart or [4] Stop All from the menu.     :
echo  :                                                      :
echo  +======================================================+
echo.

title RELDMS Launcher - Servers Running [REL:8000]

REM Open browser
if "!DEPLOY_MODE!"=="lan" (
    start "" http://!HOST_ADDR!:8000
) else (
    start "" http://localhost:8000
)
if "!CA_AVAILABLE!"=="1" (
    timeout /t 1 /nobreak >nul
    if "!DEPLOY_MODE!"=="lan" (
        start "" http://!HOST_ADDR!:8001
    ) else (
        start "" http://localhost:8001
    )
)

color 0B
echo.
pause
goto :menu

REM ======================================================
REM  SUBROUTINES
REM ======================================================

:kill_servers
echo  Stopping server windows...
REM Kill by window title (graceful named-window kill)
taskkill /FI "WINDOWTITLE eq !REL_WIN_TITLE!" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq !CA_WIN_TITLE!" /F >nul 2>&1
REM Also kill by port to catch any orphans
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000.*LISTENING" 2^>nul') do (
    taskkill /F /PID %%p >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8001.*LISTENING" 2^>nul') do (
    taskkill /F /PID %%p >nul 2>&1
)
echo  Servers stopped.
exit /b

:setup_rel_backend
echo     [REL Backend] Checking environment...
if not exist ".venv\Scripts\python.exe" (
    echo     Creating virtual environment...
    "!PYTHON_EXE!" -m venv ".venv"
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
)
set "REL_PIP=%~dp0.venv\Scripts\pip.exe"
if not exist ".venv\Scripts\uvicorn.exe" (
    echo     Installing dependencies...
    "!REL_PIP!" install --upgrade pip setuptools wheel >nul 2>&1
    "!REL_PIP!" install -r "backend\requirements.txt"
    echo     Dependencies installed.
) else (
    echo     [REL Backend] Dependencies OK.
)
set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
exit /b

:setup_rel_frontend
echo     [REL Frontend] Checking build...
if exist "frontend\dist\index.html" (
    echo     [REL Frontend] Already built.
    exit /b
)
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo     [WARNING] Node.js not found - frontend build skipped.
    echo     Install from: https://nodejs.org/
    exit /b
)
echo     Installing npm packages...
cd /d "%~dp0frontend"
call npm install
echo     Building React app...
call npm run build
cd /d "%~dp0"
if exist "frontend\dist\index.html" (
    echo     [REL Frontend] Build successful.
) else (
    echo     [WARNING] REL Frontend build may have failed.
)
exit /b

:setup_ca_backend
echo     [CA Backend] Checking environment...
set "CA_DIR=%~dp0..\ca-website"
if not exist "!CA_DIR!\.venv\Scripts\python.exe" (
    echo     Creating CA virtual environment...
    "!PYTHON_EXE!" -m venv "!CA_DIR!\.venv"
)
set "CA_PIP=!CA_DIR!\.venv\Scripts\pip.exe"
if exist "!CA_DIR!\backend\requirements.txt" (
    if not exist "!CA_DIR!\.venv\Scripts\uvicorn.exe" (
        echo     Installing CA dependencies...
        "!CA_PIP!" install --upgrade pip setuptools wheel >nul 2>&1
        "!CA_PIP!" install -r "!CA_DIR!\backend\requirements.txt"
        echo     CA dependencies installed.
    ) else (
        echo     [CA Backend] Dependencies OK.
    )
)
exit /b

:setup_ca_frontend
echo     [CA Frontend] Checking build...
set "CA_DIR=%~dp0..\ca-website"
if exist "!CA_DIR!\frontend\dist\index.html" (
    echo     [CA Frontend] Already built.
    exit /b
)
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo     [WARNING] Node.js not found - CA frontend build skipped.
    exit /b
)
echo     Installing CA npm packages...
cd /d "!CA_DIR!\frontend"
call npm install
echo     Building CA React app...
call npm run build
cd /d "%~dp0"
if exist "!CA_DIR!\frontend\dist\index.html" (
    echo     [CA Frontend] Build successful.
) else (
    echo     [WARNING] CA Frontend build may have failed.
)
exit /b

:check_port
set "PORT_NUM=%~1"
set "PORT_NAME=%~2"
netstat -ano | findstr ":%PORT_NUM%.*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo     Port %PORT_NUM% (%PORT_NAME%) in use - clearing...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT_NUM%.*LISTENING"') do (
        taskkill /F /PID %%p >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
    echo     Port %PORT_NUM% cleared.
) else (
    echo     Port %PORT_NUM% (%PORT_NAME%) available.
)
exit /b

cls
echo.
echo  +======================================================+
echo  :                                                      :
echo  :       RELDMS - Rel ^& CA Website Launcher            :
echo  :       Auto-Setup Frontend + Backend                  :
echo  :                                                      :
echo  +======================================================+
echo  :                                                      :
echo  :   [1]  Local Only   (This PC only)                   :
echo  :        REL: http://localhost:8000                     :
echo  :        CA:  http://localhost:8001                     :
echo  :                                                      :
echo  :   [2]  Shared Network / LAN  (All PCs on network)    :
echo  :        Accessible from any computer on your LAN      :
echo  :                                                      :
echo  :   [3]  Build Frontend Only  (Rebuild React app)      :
echo  :                                                      :
echo  :   [4]  Exit                                          :
echo  :                                                      :
echo  +======================================================+
echo.
set /p choice="  Select option [1-4]: "

if "%choice%"=="1" goto :local
if "%choice%"=="2" goto :lan
if "%choice%"=="3" goto :build_only
if "%choice%"=="4" exit /b 0
echo.
echo  Invalid choice. Try again.
timeout /t 2 /nobreak >nul
goto :menu

REM ======================================================
REM  OPTION 3: Build Frontend Only
REM ======================================================
:build_only
cls
echo.
echo  Building frontends...
echo.
call :setup_rel_frontend
if exist "%~dp0..\ca-website\frontend\package.json" (
    call :setup_ca_frontend
)
echo.
color 0A
echo  Frontend builds complete!
echo.
pause
color 0B
goto :menu

REM ======================================================
REM  OPTION 1: Local Only
REM ======================================================
:local
cls
set "DEPLOY_MODE=local"
set "HOST_ADDR=localhost"
echo.
echo  +----------------------------------------------+
echo  :   Mode: LOCAL (This PC only)                 :
echo  +----------------------------------------------+
echo.
goto :setup

REM ======================================================
REM  OPTION 2: LAN / Shared Network
REM ======================================================
:lan
cls
set "DEPLOY_MODE=lan"

REM Detect LAN IP — uses PowerShell to get the real 10.x/172.x IP, not APIPA
set "LANIP="
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object -First 1).IPAddress"`) do set "LANIP=%%a"

if defined LANIP (
    set "HOST_ADDR=!LANIP!"
) else (
    set "HOST_ADDR=%COMPUTERNAME%"
)

cls
color 0B
echo.
echo  +======================================================+
echo  :                                                      :
echo  :       RELDMS - LAN / Shared Network Mode            :
echo  :                                                      :
echo  +======================================================+
echo  :                                                      :
echo  :   SHARE THIS URL WITH OTHER COMPUTERS:              :
echo  :                                                      :
echo  :     http://!HOST_ADDR!:8000                         :
echo  :                                                      :
echo  +======================================================+
echo.
echo  ^ Copy and paste that URL into the browser on
echo    any computer connected to the same network.
echo.
echo  ----------------------------------------------------------
echo   NOTE: If others CANNOT connect, the company firewall
echo   may be blocking port 8000. Ask your IT department to
echo   run open_firewall.bat as Administrator on this PC.
echo  ----------------------------------------------------------
echo.
pause
goto :setup

REM ======================================================
REM  SETUP: Python, Dependencies, Frontend Build
REM ======================================================
:setup

REM Check python is available
if not defined PYTHON_EXE (
    color 0C
    echo  [ERROR] Python not found.
    echo          Install Python and rerun, or create venv first.
    pause
    goto :menu
)
echo  -- Step 1: Python --------------------------------
echo     Using: !PYTHON_EXE!
echo.

REM -- REL Website Setup --
echo  -- Step 2: Setting up REL Website ----------------
call :setup_rel_backend
call :setup_rel_frontend
echo.

REM -- CA Website Setup --
echo  -- Step 3: Setting up CA Website -----------------
if exist "%~dp0..\ca-website\backend\server.py" (
    call :setup_ca_backend
    if exist "%~dp0..\ca-website\frontend\package.json" (
        call :setup_ca_frontend
    )
    set "CA_AVAILABLE=1"
    echo     CA Website found and ready.
) else (
    set "CA_AVAILABLE=0"
    echo     CA Website not found at ..\ca-website\
    echo     Skipping CA setup. Only REL will run.
)
echo.

REM -- Check Ports --
echo  -- Step 4: Checking ports ------------------------
call :check_port 8000 REL
if "!CA_AVAILABLE!"=="1" call :check_port 8001 CA
echo.

REM -- Launch --
echo  -- Step 5: Launching servers ---------------------
echo.

REM Start CA in background if available
if "!CA_AVAILABLE!"=="1" (
    set "CA_DIR=%~dp0..\ca-website"
    set "CA_PY=!CA_DIR!\.venv\Scripts\python.exe"
    if not exist "!CA_PY!" set "CA_PY=!PYTHON_EXE!"
    echo  Starting CA Website on port 8001...
    start "CA Website - Port 8001" cmd /k "cd /d "!CA_DIR!" && set HOST=0.0.0.0&& set PORT=8001&& "!CA_PY!" backend/server.py"
    echo     CA server started in background window.
    echo.
)

color 0A
echo.
echo  +======================================================+
echo  :                                                      :
echo  :   RELDMS is running!                                 :
echo  :                                                      :
if "!DEPLOY_MODE!"=="lan" (
echo  :   -- REL Website --                                  :
echo  :   Network:  http://!HOST_ADDR!:8000                  :
echo  :   Local:    http://localhost:8000                     :
echo  :                                                      :
if "!CA_AVAILABLE!"=="1" (
echo  :   -- CA Website --                                   :
echo  :   Network:  http://!HOST_ADDR!:8001                  :
echo  :   Local:    http://localhost:8001                     :
echo  :                                                      :
)
echo  :   Share the Network URLs with other computers!       :
) else (
echo  :   REL Website:  http://localhost:8000                :
if "!CA_AVAILABLE!"=="1" (
echo  :   CA Website:   http://localhost:8001                :
)
)
echo  :                                                      :
echo  :   Press Ctrl+C to stop the server.                   :
echo  :                                                      :
echo  +======================================================+
echo.

title RELDMS - Running [REL :8000] [CA :8001]

REM Open browser
if "!DEPLOY_MODE!"=="lan" (
    start "" http://!HOST_ADDR!:8000
) else (
    start "" http://localhost:8000
)
if "!CA_AVAILABLE!"=="1" (
    timeout /t 1 /nobreak >nul
    if "!DEPLOY_MODE!"=="lan" (
        start "" http://!HOST_ADDR!:8001
    ) else (
        start "" http://localhost:8001
    )
)

REM Start REL server (blocks until Ctrl+C)
set HOST=0.0.0.0
set PORT=8000
"!PYTHON_EXE!" backend/server.py

echo.
color 0C
echo  +----------------------------------------------+
echo  :   RELDMS servers stopped.                    :
echo  +----------------------------------------------+
echo.

REM Kill CA server if it was running
if "!CA_AVAILABLE!"=="1" (
    taskkill /FI "WINDOWTITLE eq CA Website - Port 8001" /F >nul 2>&1
)
pause
goto :menu

REM ======================================================
REM  SUBROUTINES
REM ======================================================

:setup_rel_backend
echo     [REL Backend] Checking environment...
if not exist ".venv\Scripts\python.exe" (
    echo     Creating virtual environment...
    "!PYTHON_EXE!" -m venv ".venv"
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
)
set "REL_PIP=%~dp0.venv\Scripts\pip.exe"
if not exist ".venv\Scripts\uvicorn.exe" (
    echo     Installing dependencies...
    "!REL_PIP!" install --upgrade pip setuptools wheel >nul 2>&1
    "!REL_PIP!" install -r "backend\requirements.txt"
    echo     Dependencies installed.
) else (
    echo     [REL Backend] Dependencies OK.
)
set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
exit /b

:setup_rel_frontend
echo     [REL Frontend] Checking build...
if exist "frontend\dist\index.html" (
    echo     [REL Frontend] Already built.
    exit /b
)
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo     [WARNING] Node.js not found - frontend build skipped.
    echo     Install from: https://nodejs.org/
    exit /b
)
echo     Installing npm packages...
cd /d "%~dp0frontend"
call npm install
echo     Building React app...
call npm run build
cd /d "%~dp0"
if exist "frontend\dist\index.html" (
    echo     [REL Frontend] Build successful.
) else (
    echo     [WARNING] REL Frontend build may have failed.
)
exit /b

:setup_ca_backend
echo     [CA Backend] Checking environment...
set "CA_DIR=%~dp0..\ca-website"
if not exist "!CA_DIR!\.venv\Scripts\python.exe" (
    echo     Creating CA virtual environment...
    "!PYTHON_EXE!" -m venv "!CA_DIR!\.venv"
)
set "CA_PIP=!CA_DIR!\.venv\Scripts\pip.exe"
if exist "!CA_DIR!\backend\requirements.txt" (
    if not exist "!CA_DIR!\.venv\Scripts\uvicorn.exe" (
        echo     Installing CA dependencies...
        "!CA_PIP!" install --upgrade pip setuptools wheel >nul 2>&1
        "!CA_PIP!" install -r "!CA_DIR!\backend\requirements.txt"
        echo     CA dependencies installed.
    ) else (
        echo     [CA Backend] Dependencies OK.
    )
)
exit /b

:setup_ca_frontend
echo     [CA Frontend] Checking build...
set "CA_DIR=%~dp0..\ca-website"
if exist "!CA_DIR!\frontend\dist\index.html" (
    echo     [CA Frontend] Already built.
    exit /b
)
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo     [WARNING] Node.js not found - CA frontend build skipped.
    exit /b
)
echo     Installing CA npm packages...
cd /d "!CA_DIR!\frontend"
call npm install
echo     Building CA React app...
call npm run build
cd /d "%~dp0"
if exist "!CA_DIR!\frontend\dist\index.html" (
    echo     [CA Frontend] Build successful.
) else (
    echo     [WARNING] CA Frontend build may have failed.
)
exit /b

:check_port
set "PORT_NUM=%~1"
set "PORT_NAME=%~2"
netstat -ano | findstr ":%PORT_NUM%.*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo     Port %PORT_NUM% (%PORT_NAME%) in use - clearing...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT_NUM%.*LISTENING"') do (
        taskkill /F /PID %%p >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
    echo     Port %PORT_NUM% cleared.
) else (
    echo     Port %PORT_NUM% (%PORT_NAME%) available.
)
exit /b
