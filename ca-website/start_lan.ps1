#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Quickly start the CA Website server for LAN access with IP display
.DESCRIPTION
    This script displays the LAN IP and starts the FastAPI server
    making it accessible from other machines on the network
.EXAMPLE
    .\start_lan.ps1
#>

# Get repo root
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Helper function to get LAN IP
function Get-LanIP {
    try {
        $ip = (Get-NetIPAddress -AddressFamily IPv4 |
               Where-Object { 
                   $_.InterfaceAlias -notmatch 'Loopback' -and 
                   $_.IPAddress -ne '127.0.0.1' -and 
                   $_.IPAddress -notlike '169.254.*' -and
                   $_.PrefixOrigin -eq 'Dhcp' -or $_.PrefixOrigin -eq 'Manual'
               } |
               Select-Object -First 1).IPAddress
        return $ip
    } catch {
        return $null
    }
}

# Function to get local hostname
function Get-ComputerNetName {
    return [System.Net.Dns]::GetHostName()
}

Clear-Host

# ── Display startup information ──────────────────────────────────
Write-Host ""
Write-Host "  ══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   CA Website - LAN Server" -ForegroundColor Cyan
Write-Host "  ══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$lanIP = Get-LanIP
$computerName = Get-ComputerNetName

if ($lanIP) {
    Write-Host "  🌐 Network Access" -ForegroundColor Green
    Write-Host "     URL: http://${lanIP}:8001/login" -ForegroundColor Yellow
    Write-Host "     IP:  $lanIP" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "  💻 Local Access" -ForegroundColor Blue
Write-Host "     URL: http://localhost:8001/login" -ForegroundColor Yellow
Write-Host "     Hostname: ${computerName}.local" -ForegroundColor Gray
Write-Host ""

Write-Host "  ℹ️  Server Information" -ForegroundColor Cyan
Write-Host "     Host:    0.0.0.0 (all interfaces)" -ForegroundColor Gray
Write-Host "     Port:    8001 (CA Website)" -ForegroundColor Gray
Write-Host "     Status:  Starting..." -ForegroundColor Gray
Write-Host ""

Write-Host "  ⚠️  To Stop: Press Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# ── Check virtual environment ────────────────────────────────────
$venvPath = Join-Path $RepoRoot ".venv\Scripts\Activate.ps1"
if (-not (Test-Path $venvPath)) {
    Write-Host "  ❌ ERROR: Virtual environment not found at $venvPath" -ForegroundColor Red
    Write-Host "  Please run setup first: python -m venv .venv" -ForegroundColor Yellow
    Read-Host "  Press Enter to exit"
    exit 1
}

# ── Activate virtual environment ─────────────────────────────────
& $venvPath

# ── Start the server ─────────────────────────────────────────────
Write-Host ""
Write-Host "  🚀 Starting FastAPI server..." -ForegroundColor Green
Write-Host ""

Set-Location $RepoRoot
$env:PORT = 8001
python backend/server.py
