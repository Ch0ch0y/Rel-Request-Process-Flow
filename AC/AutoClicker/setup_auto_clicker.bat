@echo off
REM Setup Auto Clicker Dependencies
REM This batch file installs required Python packages

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          AUTO CLICKER SETUP - Installing Dependencies    ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ✗ ERROR: Python is not installed or not in PATH
    echo.
    echo Please install Python from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo ✓ Python found
echo.
echo Installing required packages...
echo   - pyautogui (mouse/keyboard control)
echo   - keyboard (keyboard event detection)
echo.

pip install pyautogui keyboard

if errorlevel 1 (
    echo.
    echo ✗ Installation failed
    echo.
    echo Troubleshooting:
    echo   1. Ensure you have internet connection
    echo   2. Try running as Administrator
    echo   3. Ensure pip is updated: python -m pip install --upgrade pip
    echo.
    pause
    exit /b 1
)

echo.
echo ✓ Installation successful!
echo.
echo You can now use the auto clicker:
echo   1. Double-click: start_auto_clicker.bat
echo   2. Or run: python auto_clicker.py
echo.
pause
