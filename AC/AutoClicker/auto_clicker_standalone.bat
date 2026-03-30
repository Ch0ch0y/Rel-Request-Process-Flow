@echo off
REM Auto Clicker - No Python Required
REM Pure Windows batch/VBScript solution

setlocal enabledelayedexpansion

title Auto Clicker / Website Scroller - No Python Required

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║    AUTO CLICKER / WEBSITE SCROLLER (No Python Required)   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo MODES:
echo   1) Scroll mode (default)
echo   2) Mouse movement mode
echo   3) Key press mode (spacebar)
echo.
echo.

if "%1"=="" (
    set /p mode="Select mode (1-3) or press Enter for default (scroll): "
    if "!mode!"=="" set mode=1
) else (
    set mode=%1
)

echo.
echo Starting Auto Clicker...
echo.
echo Press Ctrl+C to stop (or close this window)
echo.
timeout /t 3 /nobreak

REM Create VBScript
set vbs_file=%TEMP%\autoclicker.vbs

if "!mode!"=="1" (
    echo Creating scroll mode...
    call :CreateScrollScript
) else if "!mode!"=="2" (
    echo Creating mouse movement mode...
    call :CreateMouseScript
) else if "!mode!"=="3" (
    echo Creating key press mode...
    call :CreateKeyScript
) else (
    echo Creating scroll mode...
    call :CreateScrollScript
)

REM Run the VBScript
cscript.exe //nologo "!vbs_file!"

REM Cleanup
if exist "!vbs_file!" del "!vbs_file!"

echo.
echo Auto Clicker stopped.
pause
exit /b 0

REM ==================== SCROLL MODE ====================
:CreateScrollScript
(
    echo ' Auto Clicker - Scroll Mode
    echo ' Random scrolling to keep screen active
    echo.
    echo Set objMouse = CreateObject("WScript.Shell"^)
    echo.
    echo WScript.Echo "Auto Clicker started - Scroll Mode"
    echo WScript.Echo "Press Ctrl+C to stop"
    echo WScript.Echo ""
    echo.
    echo Randomize
    echo action_count = 0
    echo.
    echo On Error Resume Next
    echo.
    echo Do
    echo   ' Random interval between 1-3 seconds
    echo   interval = Int(Rnd * 2000 + 1000^)
    echo   WScript.Sleep interval
    echo.
    echo   ' Random scroll direction and amount
    echo   direction = Int(Rnd * 2^)
    echo   If direction = 0 Then
    echo     ' Scroll down using Page Down key
    echo     objMouse.SendKeys "{PAGEDOWN}"
    echo   Else
    echo     ' Scroll up using Page Up key
    echo     objMouse.SendKeys "{PAGEUP}"
    echo   End If
    echo.
    echo   action_count = action_count + 1
    echo   WScript.Echo "[" ^& Now() ^& "] Action " ^& action_count ^& " completed"
    echo Loop
) > "!vbs_file!"
exit /b 0

REM ==================== MOUSE MOVEMENT MODE ====================
:CreateMouseScript
(
    echo ' Auto Clicker - Mouse Movement Mode
    echo ' Moves mouse to keep screen from locking
    echo.
    echo Set objMouse = CreateObject("WScript.Shell"^)
    echo Set objScreen = CreateObject("WScript.Shell"^)
    echo.
    echo WScript.Echo "Auto Clicker started - Mouse Movement Mode"
    echo WScript.Echo "Press Ctrl+C to stop"
    echo WScript.Echo ""
    echo.
    echo Randomize
    echo action_count = 0
    echo.
    echo On Error Resume Next
    echo.
    echo Do
    echo   ' Random interval between 1-3 seconds
    echo   interval = Int(Rnd * 2000 + 1000^)
    echo   WScript.Sleep interval
    echo.
    echo   ' Move mouse right
    echo   objMouse.SendKeys "{RIGHT}"
    echo   WScript.Sleep 100
    echo.
    echo   ' Move mouse left
    echo   objMouse.SendKeys "{LEFT}"
    echo.
    echo   action_count = action_count + 1
    echo   WScript.Echo "[" ^& Now() ^& "] Action " ^& action_count ^& " - Mouse moved"
    echo Loop
) > "!vbs_file!"
exit /b 0

REM ==================== KEY PRESS MODE ====================
:CreateKeyScript
(
    echo ' Auto Clicker - Key Press Mode
    echo ' Presses spacebar repeatedly to keep screen active
    echo.
    echo Set objMouse = CreateObject("WScript.Shell"^)
    echo.
    echo WScript.Echo "Auto Clicker started - Key Press Mode (Spacebar"^)
    echo WScript.Echo "Press Ctrl+C to stop"
    echo WScript.Echo ""
    echo.
    echo Randomize
    echo action_count = 0
    echo.
    echo On Error Resume Next
    echo.
    echo Do
    echo   ' Random interval between 1-3 seconds
    echo   interval = Int(Rnd * 2000 + 1000^)
    echo   WScript.Sleep interval
    echo.
    echo   ' Press spacebar
    echo   objMouse.SendKeys " "
    echo.
    echo   action_count = action_count + 1
    echo   WScript.Echo "[" ^& Now() ^& "] Action " ^& action_count ^& " - Spacebar pressed"
    echo Loop
) > "!vbs_file!"
exit /b 0
