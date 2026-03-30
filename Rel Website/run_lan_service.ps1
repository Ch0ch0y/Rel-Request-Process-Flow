<#
.SYNOPSIS
    Runs the Rel Request website as a background service with auto-restart.
    The server will keep running 24/7, automatically restarting if it crashes.

.DESCRIPTION
    Option 1: Run this script directly (keeps running in PowerShell window)
    Option 2: Register as a Windows Scheduled Task to auto-start on boot

.EXAMPLE
    .\run_lan_service.ps1                  # Run interactively
    .\run_lan_service.ps1 -Install         # Install as Scheduled Task (auto-start on boot)
    .\run_lan_service.ps1 -Uninstall       # Remove the Scheduled Task
#>

param(
    [switch]$Install,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Continue'
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$TaskName = "RelRequestWebsite"
$LogFile  = Join-Path $RepoRoot "backend\service.log"
$PidFile  = Join-Path $RepoRoot "backend\server.pid"

# ── Helper: Get LAN IP ───────────────────────────────
function Get-LanIP {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 |
           Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*' } |
           Select-Object -First 1).IPAddress
    return $ip
}

# ── INSTALL as Windows Scheduled Task ────────────────
if ($Install) {
    $lanIP = Get-LanIP
    Write-Host ""
    Write-Host "  Installing Rel Request as a Scheduled Task..." -ForegroundColor Cyan
    Write-Host "  Task Name: $TaskName"
    Write-Host ""

    # Remove existing task if present
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

    $scriptPath = Join-Path $RepoRoot "run_lan_service.ps1"
    $action = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`"" `
        -WorkingDirectory $RepoRoot

    $trigger = New-ScheduledTaskTrigger -AtStartup
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -RestartCount 999 `
        -ExecutionTimeLimit (New-TimeSpan -Days 365)

    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Highest

    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Rel Request Process Flow - LAN Web Server (24/7)" `
        -Force

    Write-Host ""
    Write-Host "  [OK] Scheduled Task '$TaskName' installed!" -ForegroundColor Green
    Write-Host "       The server will auto-start when Windows boots."
    Write-Host ""
    Write-Host "  To start it NOW without rebooting:" -ForegroundColor Yellow
    Write-Host "    Start-ScheduledTask -TaskName '$TaskName'"
    Write-Host ""
    Write-Host "  Access URL: http://${lanIP}:8000" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

# ── UNINSTALL Scheduled Task ─────────────────────────
if ($Uninstall) {
    Write-Host ""
    Write-Host "  Removing Scheduled Task '$TaskName'..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    # Kill any running server
    if (Test-Path $PidFile) {
        $pid = Get-Content $PidFile
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  [OK] Task removed." -ForegroundColor Green
    Write-Host ""
    exit 0
}

# ── BUILD FRONTEND (if needed) ───────────────────────
$distDir = Join-Path $RepoRoot "frontend\dist"
if (-not (Test-Path $distDir)) {
    Write-Host "[Build] Frontend dist/ not found. Building now..."
    Push-Location (Join-Path $RepoRoot "frontend")
    if (-not (Test-Path "node_modules")) {
        Write-Host "[Build] Installing npm dependencies..."
        npm install
    }
    npm run build
    Pop-Location
    if (-not (Test-Path $distDir)) {
        Write-Host "[ERROR] Frontend build failed. Run 'deploy_lan.bat' first to build." -ForegroundColor Red
        exit 1
    }
}

# ── RUN WITH AUTO-RESTART (watchdog loop) ─────────────
$backendDir = Join-Path $RepoRoot "backend"
$pythonExe  = Join-Path $backendDir ".venv\Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    Write-Host "[ERROR] Backend not set up. Run 'deploy_lan.bat' first." -ForegroundColor Red
    exit 1
}

$lanIP = Get-LanIP
Write-Host ""
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host "   Rel Request Process Flow - 24/7 LAN Server" -ForegroundColor Cyan
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Local:   http://localhost:8000" -ForegroundColor White
Write-Host "   Network: http://${lanIP}:8000" -ForegroundColor Green
Write-Host ""
Write-Host "   Server will auto-restart on crash." -ForegroundColor Yellow
Write-Host "   Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host "   Logs: $LogFile" -ForegroundColor Gray
Write-Host ""

$restartDelay = 5  # seconds between restarts

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $msg = "[$timestamp] Starting uvicorn server..."
    Write-Host $msg -ForegroundColor Cyan
    Add-Content -Path $LogFile -Value $msg

    # Start uvicorn via python -m uvicorn (avoids broken .exe launcher)
    $proc = Start-Process -FilePath $pythonExe `
        -ArgumentList "-m uvicorn server:app --host 0.0.0.0 --port 8000 --workers 1 --log-level info" `
        -WorkingDirectory $backendDir `
        -NoNewWindow `
        -PassThru `
        -RedirectStandardOutput (Join-Path $backendDir "stdout.log") `
        -RedirectStandardError (Join-Path $backendDir "stderr.log")

    # Save PID for cleanup
    $proc.Id | Out-File -FilePath $PidFile -Force

    # Wait for process to exit
    $proc.WaitForExit()
    $exitCode = $proc.ExitCode

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $msg = "[$timestamp] Server exited with code $exitCode. Restarting in $restartDelay seconds..."
    Write-Host $msg -ForegroundColor Yellow
    Add-Content -Path $LogFile -Value $msg

    # Brief delay before restart
    Start-Sleep -Seconds $restartDelay
}
