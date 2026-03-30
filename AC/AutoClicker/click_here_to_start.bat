@echo off
REM Simple Auto Clicker Launcher (No Python)
REM This file runs the AutoClicker.vbs script

cd /d "%~dp0"

cls
echo.
echo Starting Auto Clicker...
echo.

REM Launch VBScript in a new command window
start "Auto Clicker" cscript.exe //nologo AutoClicker.vbs

exit /b 0
