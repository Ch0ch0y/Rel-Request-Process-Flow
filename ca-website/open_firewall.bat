@echo off
title Firewall Rule - CA Request
echo.
echo  Adding Windows Firewall rule to allow port 8001 (CA Request)...
echo  (Requires Administrator privileges)
echo.

REM Remove old rule if exists
netsh advfirewall firewall delete rule name="CA Request Web Server" >nul 2>&1

REM Add inbound rule for port 8001
netsh advfirewall firewall add rule name="CA Request Web Server" dir=in action=allow protocol=TCP localport=8001 profile=domain,private

if %errorlevel% equ 0 (
    echo.
    echo  [OK] Firewall rule added successfully!
    echo  Other computers on your network can now access port 8001.
) else (
    echo.
    echo  [ERROR] Failed to add firewall rule.
    echo  Please run this script as Administrator:
    echo    Right-click ^> Run as Administrator
)
echo.
pause
