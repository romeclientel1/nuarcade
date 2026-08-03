!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!ifndef BUILD_UNINSTALLER

# NSIS's classic Directory-page "Browse..." button can only target an
# EXISTING folder (a native Windows folder-picker limitation, not an NSIS
# scripting issue) -- so a user who browses to a parent location (e.g.
# "D:\Games") rather than typing a full path must never be required to
# pre-create "D:\Games\NuArcade" themselves first. electron-builder's own
# stock instFilesPre (installer.nsi) already does an append-if-missing
# fixup, but only right before the INSTFILES page -- AFTER our own
# VesparaDesktopShortcutPageCreate below has already read $INSTDIR. Doing
# the same fixup here, on the Directory page's own Leave (a standard,
# supported MUI2 hook: MUI_PAGE_CUSTOMFUNCTION_LEAVE), means every later
# page always sees a complete, dedicated, already-created Vespara
# application directory, whatever the user typed or browsed to. This is
# skipped entirely on upgrades along with the rest of the Directory page
# (see electron-builder's skipPageIfUpdated), so an existing installation
# directory read from the registry is never touched or renamed.
#
# Implemented with plain StrLen/StrCpy suffix comparison rather than the
# shared StrContains.nsh helper -- assistedInstaller.nsh unconditionally
# !includes that same file later (it has no include guard of its own), so
# including it a second time here would redefine its Function/Vars and
# fail the compile.
#
# A trailing separator (e.g. a bare drive root "D:\" returned by the native
# folder-browse dialog, or "D:\Games\NuArcade\" typed by hand) is trimmed
# before the suffix check, so it can never throw off the length comparison
# and produce a doubled separator or a re-appended "\NuArcade\NuArcade".
# The suffix comparison itself (LogicLib's != / ==) is case-insensitive by
# default (StrCmp, not StrCmpS) -- intentional, since Windows paths are
# themselves case-insensitive and "D:\Games\nuarcade" must be recognized as
# already-suffixed, not doubled into "nuarcade\NuArcade".
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE VesparaDirectoryPageLeave

Function VesparaDirectoryPageLeave
  StrLen $4 $INSTDIR
  IntOp $4 $4 - 1
  StrCpy $5 $INSTDIR 1 $4
  ${If} $5 == "\"
    StrCpy $INSTDIR $INSTDIR $4
  ${EndIf}

  StrLen $0 "${APP_FILENAME}"
  StrLen $1 $INSTDIR
  IntOp $2 $1 - $0
  ${If} $2 < 0
    StrCpy $INSTDIR "$INSTDIR\${APP_FILENAME}"
  ${Else}
    StrCpy $3 $INSTDIR $0 $2
    ${If} $3 != "${APP_FILENAME}"
      StrCpy $INSTDIR "$INSTDIR\${APP_FILENAME}"
    ${EndIf}
  ${EndIf}
  CreateDirectory "$INSTDIR"
FunctionEnd

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

  # The main process is the authoritative schema and repairs the complete
  # tree on first launch. These base directories are a best-effort installer
  # hint under the user-selected install root; no legacy F: content is moved.
  CreateDirectory "$INSTDIR\Media"
  CreateDirectory "$INSTDIR\Media\Videos"
  CreateDirectory "$INSTDIR\Media\Artwork"
  CreateDirectory "$INSTDIR\Media\EmuMovies"
  CreateDirectory "$INSTDIR\RetroArchGames"
  CreateDirectory "$INSTDIR\PCGames"
!macroend

!endif

# electron-builder inserts customRemoveFiles before its destructive fallback
# in uninstaller.nsh. Keep this macro outside BUILD_UNINSTALLER so it is
# defined when the generated uninstaller is compiled.
!macro customRemoveFiles
  # Preserve user content rooted beside the application. Remove only files
  # installed by Electron; never recursively remove $INSTDIR.
  Delete "$INSTDIR\NuArcade.exe"
  Delete "$INSTDIR\chrome_100_percent.pak"
  Delete "$INSTDIR\chrome_200_percent.pak"
  Delete "$INSTDIR\d3dcompiler_47.dll"
  Delete "$INSTDIR\ffmpeg.dll"
  Delete "$INSTDIR\icudtl.dat"
  Delete "$INSTDIR\libEGL.dll"
  Delete "$INSTDIR\libGLESv2.dll"
  Delete "$INSTDIR\LICENSE.electron.txt"
  Delete "$INSTDIR\LICENSES.chromium.html"
  Delete "$INSTDIR\resources.pak"
  Delete "$INSTDIR\snapshot_blob.bin"
  Delete "$INSTDIR\v8_context_snapshot.bin"
  Delete "$INSTDIR\vk_swiftshader_icd.json"
  Delete "$INSTDIR\vk_swiftshader.dll"
  Delete "$INSTDIR\vulkan-1.dll"
  RMDir /r "$INSTDIR\locales"
  RMDir /r "$INSTDIR\resources"
!macroend
