param(
    [ValidateSet('auto','backend','tests')]
    [string]$mode = 'auto'
)

function Test-Command($name) {
    return (Get-Command $name -ErrorAction SilentlyContinue) -ne $null
}

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoRoot

$python = 'python'
if (-not (Test-Command $python)) { $python = 'python3' }

if ($mode -eq 'auto') { $mode = 'backend' }

# Backend flow: venv -> install -> run server
if ($mode -eq 'backend') {
    if (-not (Test-Command $python)) { Write-Error "Python not found on PATH."; exit 1 }
    $venvDir = Join-Path $RepoRoot '.venv'
    if (-not (Test-Path $venvDir)) {
        Write-Host "Creating venv in .venv..."
        & $python -m venv "$venvDir"
    }
    $activate = Join-Path $venvDir 'Scripts\Activate.ps1'
    Write-Host "Activating venv and installing requirements..."
    & "$activate"
    & pip install --upgrade pip setuptools wheel
    if (Test-Path (Join-Path $RepoRoot 'backend\requirements.txt')) {
        & pip install -r (Join-Path $RepoRoot 'backend\requirements.txt')
    }
    Write-Host ""
    Write-Host "Starting server on http://localhost:8000"
    Write-Host ""
    & $python backend/server.py
    exit $LASTEXITCODE
}

# Tests-only flow
if ($mode -eq 'tests') {
    if (-not (Test-Command $python)) { Write-Error "Python not found on PATH."; exit 1 }
    & $python backend_test.py
    exit $LASTEXITCODE
}

Write-Host "Unknown mode. Use: auto, backend, tests"
exit 1
