# NuArcade v3.2.1 - Cabinet Folder Setup Script
# Run this on your cabinet PC to create all required folders on F: drive
# Right-click PowerShell -> Run as Administrator
# Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
# .\nuarcade-setup-folders.ps1

Write-Host "NuArcade Cabinet Folder Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$folders = @(
    "F:\TeknoParrot", "F:\MAME", "F:\MAME\roms",
    "F:\Model2", "F:\Supermodel",
    "F:\RetroArch", "F:\RetroArch\system",
    "F:\Project64", "F:\DuckStation", "F:\Flycast",
    "F:\PPSSPP", "F:\PCSX2", "F:\RPCS3",
    "F:\Xenia", "F:\Dolphin", "F:\Cemu", "F:\Ryujinx", "F:\vPinball",
    "F:\ArcadeGames", "F:\RetroArchGames",
    "F:\N64Games", "F:\PS1Games", "F:\DreamcastGames",
    "F:\PSPGames", "F:\PS2Games", "F:\PS3Games",
    "F:\Xbox360Games", "F:\GCWiiGames", "F:\WiiUGames",
    "F:\SwitchGames", "F:\Model2Games", "F:\Model3Games",
    "F:\PinballTables", "F:\PCGames",
    "F:\Media", "F:\Media\Videos", "F:\Media\Artwork"
)

$created = 0; $existing = 0
foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Write-Host "  EXISTS  $folder" -ForegroundColor DarkGray; $existing++
    } else {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host "  CREATED $folder" -ForegroundColor Green; $created++
    }
}

Write-Host ""
Write-Host "Done! $created created, $existing already existed." -ForegroundColor Cyan
Write-Host ""
Write-Host "Emulator download links:" -ForegroundColor Yellow
Write-Host "  TeknoParrot  https://teknoparrot.com"
Write-Host "  MAME         https://www.mamedev.org/release.php"
Write-Host "  Model 2      https://github.com/m2emulator/m2emulator/releases"
Write-Host "  Supermodel   https://supermodel3.com"
Write-Host "  RetroArch    https://www.retroarch.com/index.php?page=platforms"
Write-Host "  Project64    https://www.pj64-emu.com"
Write-Host "  DuckStation  https://github.com/stenzek/duckstation/releases"
Write-Host "  Flycast      https://github.com/flyinghead/flycast/releases"
Write-Host "  PPSSPP       https://www.ppsspp.org/downloads.html"
Write-Host "  PCSX2        https://pcsx2.net/downloads"
Write-Host "  RPCS3        https://rpcs3.net/download"
Write-Host "  Xenia        https://xenia.jp/download"
Write-Host "  Dolphin      https://dolphin-emu.org/download"
Write-Host "  Cemu         https://cemu.info"
Write-Host "  Ryujinx      https://ryujinx.org/download"
Write-Host "  VPX          https://github.com/vpinball/vpinball/releases"
Write-Host "  Steam        https://store.steampowered.com/about"
Write-Host ""
Write-Host "NOTE: Steam games are scanned from C:\Program Files (x86)\Steam\steamapps" -ForegroundColor Yellow
Write-Host "      PC games go in F:\PCGames (one subfolder per game with a single .exe)" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to close"
