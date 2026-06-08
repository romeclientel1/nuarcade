; NuArcade Cabinet Folder Setup
; Runs silently during installation -- creates all required F: drive folders
; User never sees this, it just works.

!macro customInstall
  ; Only create folders if F: drive exists
  IfFileExists "F:\" 0 +2
    Goto CreateFolders
  Goto Done

  CreateFolders:
    ; Emulator folders
    CreateDirectory "F:\TeknoParrot"
    CreateDirectory "F:\MAME"
    CreateDirectory "F:\MAME\roms"
    CreateDirectory "F:\Model2"
    CreateDirectory "F:\Supermodel"
    CreateDirectory "F:\RetroArch"
    CreateDirectory "F:\RetroArch\system"
    CreateDirectory "F:\Project64"
    CreateDirectory "F:\DuckStation"
    CreateDirectory "F:\Flycast"
    CreateDirectory "F:\PPSSPP"
    CreateDirectory "F:\PCSX2"
    CreateDirectory "F:\RPCS3"
    CreateDirectory "F:\Xenia"
    CreateDirectory "F:\Dolphin"
    CreateDirectory "F:\Cemu"
    CreateDirectory "F:\Ryujinx"
    CreateDirectory "F:\vPinball"

    ; Games folders
    CreateDirectory "F:\ArcadeGames"
    CreateDirectory "F:\RetroArchGames"
    CreateDirectory "F:\N64Games"
    CreateDirectory "F:\PS1Games"
    CreateDirectory "F:\DreamcastGames"
    CreateDirectory "F:\PSPGames"
    CreateDirectory "F:\PS2Games"
    CreateDirectory "F:\PS3Games"
    CreateDirectory "F:\Xbox360Games"
    CreateDirectory "F:\GCWiiGames"
    CreateDirectory "F:\WiiUGames"
    CreateDirectory "F:\SwitchGames"
    CreateDirectory "F:\Model2Games"
    CreateDirectory "F:\Model3Games"
    CreateDirectory "F:\PinballTables"

    ; Media
    CreateDirectory "F:\Media"
    CreateDirectory "F:\Media\Videos"
    CreateDirectory "F:\Media\Artwork"

  Done:
!macroend
