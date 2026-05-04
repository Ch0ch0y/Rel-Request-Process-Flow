# Creates a desktop shortcut for "Amkor Apps Launcher" with the amkor.ico icon.
# Run this script once. After that, use the shortcut on your desktop.

$ROOT        = Split-Path -Parent $MyInvocation.MyCommand.Definition
$launcherPyw = Join-Path $ROOT "launcher.pyw"
$pythonw     = Join-Path $ROOT "Rel Website\backend\.venv\Scripts\pythonw.exe"
$iconFile    = Join-Path $ROOT "amkor.ico"
$shortcutDest = [System.IO.Path]::Combine(
    [Environment]::GetFolderPath("Desktop"),
    "Amkor Apps Launcher.lnk"
)

$WshShell   = New-Object -ComObject WScript.Shell
$shortcut   = $WshShell.CreateShortcut($shortcutDest)

$shortcut.TargetPath       = $pythonw
$shortcut.Arguments        = "`"$launcherPyw`""
$shortcut.WorkingDirectory = $ROOT
$shortcut.IconLocation     = "$iconFile,0"
$shortcut.Description      = "Launch REL + CA Request Apps"
$shortcut.WindowStyle      = 1   # 1 = Normal window

$shortcut.Save()

Write-Host ""
Write-Host "  Shortcut created on your Desktop:" -ForegroundColor Green
Write-Host "  $shortcutDest" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Double-click 'Amkor Apps Launcher' to start all services." -ForegroundColor Green
Write-Host ""
