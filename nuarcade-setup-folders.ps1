# NuArcade content-folder setup helper
# Supply an explicit root; no drive is assumed.
# Right-click PowerShell -> Run as Administrator
# Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
# .\nuarcade-setup-folders.ps1 -Root 'C:\NuArcadeContent'

param([Parameter(Mandatory=$true)][string]$Root)

Write-Host "NuArcade Content Folder Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$folders = @('TeknoParrot','MAME','MAME\roms','RetroArch','RetroArch\system','Project64','DuckStation','Flycast','Xemu','Cxbx-Reloaded','PPSSPP','PCSX2','RPCS3','Xenia','Dolphin','Cemu','Ryujinx','vPinball','ArcadeGames','RetroArchGames','N64Games','PS1Games','DreamcastGames','XboxGames','PSPGames','PS2Games','PS3Games','Xbox360Games','GCWiiGames','WiiUGames','SwitchGames','Model2Games','Model3Games','PinballTables','PCGames','SteamGames','Media','Media\Videos','Media\Artwork','Media\EmuMovies') | ForEach-Object { Join-Path $Root $_ }

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
Write-Host "  Xemu         https://xemu.app"
Write-Host "  Cxbx-Reloaded https://github.com/Cxbx-Reloaded/Cxbx-Reloaded/releases"
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
Write-Host "      PC games go in the configured PCGames folder (one subfolder per game with a single .exe)" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to close"
