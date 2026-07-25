!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!ifndef BUILD_UNINSTALLER

Var VesparaDesktopShortcutCheckbox
Var VesparaDesktopShortcutState

Function VesparaDesktopShortcutPageCreate
  # The directory/upgrade resolution has already run. An existing compatible
  # executable means this is an upgrade/reinstall, where electron-builder's
  # established shortcut migration policy remains completely authoritative.
  IfFileExists "$INSTDIR\${PRODUCT_FILENAME}.exe" 0 +2
    Abort

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "Choose how Vespara should appear on this computer."
  Pop $1

  ${NSD_CreateCheckbox} 0 34u 100% 14u "Create a Vespara desktop shortcut"
  Pop $VesparaDesktopShortcutCheckbox
  ${NSD_Check} $VesparaDesktopShortcutCheckbox

  ${NSD_CreateLabel} 0 58u 100% 28u "The Start Menu shortcut is always installed. You can opt out of the desktop shortcut."
  Pop $1

  nsDialogs::Show
FunctionEnd

Function VesparaDesktopShortcutPageLeave
  ${NSD_GetState} $VesparaDesktopShortcutCheckbox $VesparaDesktopShortcutState
FunctionEnd

!macro customInit
  StrCpy $VesparaDesktopShortcutState ${BST_CHECKED}
!macroend

!macro customPageAfterChangeDir
  Page custom VesparaDesktopShortcutPageCreate VesparaDesktopShortcutPageLeave
!macroend

!macro customInstall
  # electron-builder creates the standard shortcut first so its existing
  # upgrade/rename and uninstall bookkeeping remains authoritative. A fresh
  # install that opted out removes that just-created link before completion.
  ${If} $VesparaDesktopShortcutState != ${BST_CHECKED}
    WinShell::UninstShortcut "$newDesktopLink"
    Delete "$newDesktopLink"
    System::Call 'shell32::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
  ${EndIf}

  IfFileExists "F:\" 0 Done
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
    CreateDirectory "F:\Xemu"
    CreateDirectory "F:\Cxbx-Reloaded"
    CreateDirectory "F:\PPSSPP"
    CreateDirectory "F:\PCSX2"
    CreateDirectory "F:\RPCS3"
    CreateDirectory "F:\Xenia"
    CreateDirectory "F:\Dolphin"
    CreateDirectory "F:\Cemu"
    CreateDirectory "F:\Ryujinx"
    CreateDirectory "F:\vPinball"
    CreateDirectory "F:\ArcadeGames"
    CreateDirectory "F:\RetroArchGames"
    CreateDirectory "F:\N64Games"
    CreateDirectory "F:\PS1Games"
    CreateDirectory "F:\DreamcastGames"
    CreateDirectory "F:\XboxGames"
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
    CreateDirectory "F:\PCGames"
    CreateDirectory "F:\Media"
    CreateDirectory "F:\Media\Videos"
    CreateDirectory "F:\Media\Artwork"
  Done:
!macroend

!endif
