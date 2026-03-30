@echo off
REM Auto Clicker Launcher
REM This batch file launches the auto clicker application

title Auto Clicker / Website Scroller

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          AUTO CLICKER / WEBSITE SCROLLER                  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo MODES:
echo   1) Scroll mode (default) - scrolls page up/down
echo   2) Click mode - clicks at current mouse position
echo   3) Move mode - moves mouse to keep screen active
echo   4) Mixed mode - random actions
echo.

setlocal enabledelayedexpansion

if "%1"=="" (
    set /p choice="Select mode (1-4) or press Enter for default (scroll): "
    if "!choice!"=="" set choice=1
) else (
    set choice=%1
)

echo.
echo Starting Auto Clicker...
echo.
echo Press ESC at any time to stop
echo Move mouse to corner for emergency stop (failsafe)
echo.

cd /d "%~dp0"

if "!choice!"=="1" (
    python auto_clicker.py scroll
) else if "!choice!"=="2" (
    python auto_clicker.py click
) else if "!choice!"=="3" (
    python auto_clicker.py move
) else if "!choice!"=="4" (
    python auto_clicker.py mixed
) else (
    python auto_clicker.py scroll
)

echo.
echo Auto Clicker has stopped.
pause
