$ErrorActionPreference = "Stop"
Write-Host "=== MSDS SYSTEM INSTALLATION MEDIA BUILDER ===" -ForegroundColor Cyan
npm.cmd run electron:build
$installer = Get-ChildItem ".\release" -Filter "*.exe" -File | Where-Object { $_.FullName -notmatch "\\win-unpacked\\" -and $_.Name -notmatch "uninstaller" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $installer) { throw "No Windows installer EXE found in .\release" }
$media = Join-Path (Get-Location) "MSDS-System-Installation-Media"
New-Item -ItemType Directory -Force $media | Out-Null
Copy-Item $installer.FullName (Join-Path $media "MSDS-System-Setup.exe") -Force
@"
MSDS SYSTEM - Installation Media

1. Run MSDS-System-Setup.exe.
2. Complete the Windows installer.
3. Launch MSDS System from the Desktop or Start Menu.
4. On first launch, allow the application time to prepare its local services and Whisper model.
5. Configure the camera and begin monitoring.

See the installation guide PDF for the complete procedure.
"@ | Set-Content (Join-Path $media "README.txt") -Encoding UTF8
Write-Host ""
Write-Host "DONE!" -ForegroundColor Green
Write-Host "Media folder: $media" -ForegroundColor Cyan
Write-Host "Installer: $(Join-Path $media 'MSDS-System-Setup.exe')" -ForegroundColor Cyan
