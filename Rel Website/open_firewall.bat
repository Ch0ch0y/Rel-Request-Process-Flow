@echo off
title Firewall Rule - Rel Request + CA Website
echo.
echo  Adding Windows Firewall rules for LAN access...
echo  (Requires Administrator privileges)
echo.

REM Remove old rules if they exist
netsh advfirewall firewall delete rule name="Rel Request Web Server" >nul 2>&1
netsh advfirewall firewall delete rule name="CA Website Server" >nul 2>&1

REM Add inbound rule for port 8000 (REL Website)
echo  [1/2] Adding rule for REL Website (port 8000)...
netsh advfirewall firewall add rule name="Rel Request Web Server" dir=in action=allow protocol=TCP localport=8000 profile=domain,private
if %errorlevel% equ 0 (
    echo        [OK] Port 8000 opened successfully!
) else (
    echo        [ERROR] Failed. Run this script as Administrator.
    goto :done
)

REM Add inbound rule for port 8001 (CA Website)
echo  [2/2] Adding rule for CA Website (port 8001)...
netsh advfirewall firewall add rule name="CA Website Server" dir=in action=allow protocol=TCP localport=8001 profile=domain,private
if %errorlevel% equ 0 (
    echo        [OK] Port 8001 opened successfully!
) else (
    echo        [ERROR] Failed. Run this script as Administrator.
    goto :done
)

echo.
echo  ======================================================
echo   Firewall rules added successfully!
echo   Other computers on your network can now access:
echo     REL Website: http://YOUR_IP:8000
echo     CA  Website: http://YOUR_IP:8001
echo  ======================================================

:done
echo.
pause
