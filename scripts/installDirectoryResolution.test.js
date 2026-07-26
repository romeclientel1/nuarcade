// installDirectoryResolution.test.js -----------------------------------------
// Vespara Platform Milestone P1 (installer directory follow-up): a real
// Windows tester reported the assisted installer required manually creating
// a NuArcade/Vespara folder before installing. Root cause: NSIS's classic
// Directory-page "Browse..." button can only target an EXISTING folder (a
// native Windows folder-picker limitation), so a user who browses to a bare
// parent location was stuck unless the installer itself completed and
// created the final application directory. assets/installer/folders.nsh now
// does this on the Directory page's own Leave callback
// (VesparaDirectoryPageLeave), via a suffix check implemented with plain
// StrLen/IntOp/StrCpy (not the shared StrContains.nsh helper, which
// assistedInstaller.nsh unconditionally re-includes later and would
// otherwise collide -- see the comment in folders.nsh).
//
// This file has two halves:
//   1. A pure-JS reimplementation of that exact suffix algorithm, exercised
//      against many representative $INSTDIR values -- fast, deterministic,
//      comprehensive coverage of the append/no-append/idempotency logic
//      that would be slow and awkward to prove by compiling+running NSIS
//      for every case.
//   2. Source-level assertions cross-checking that folders.nsh's actual NSIS
//      implementation is structurally what the JS above models (StrLen/
//      IntOp/StrCpy shape, not naive concatenation, no colliding include).
//
// Neither half replaces scripts/nsisGeneratedBehavior.slowtest.js, which is
// the one test that proves this logic actually compiles into the real
// installer (generated behavior, not source text).

const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const ROOT = path.join(__dirname, "..")
const nsis = fs.readFileSync(path.join(ROOT, "assets", "installer", "folders.nsh"), "utf8")
const APP_FILENAME = "NuArcade"

// Mirrors VesparaDirectoryPageLeave exactly: trims one trailing "\" (as
// the NSIS code does via StrLen/StrCpy before the length compare), then if
// $INSTDIR's last len(APP_FILENAME) characters don't already equal
// APP_FILENAME case-insensitively (or $INSTDIR is shorter than
// APP_FILENAME), appends "\APP_FILENAME". CreateDirectory always runs
// afterward (not representable in a pure string function -- covered
// separately by source assertion below).
function nsisResolveInstallDir(instDir) {
  if (instDir.length > 0 && instDir[instDir.length - 1] === "\\") {
    instDir = instDir.slice(0, -1)
  }
  if (instDir.length < APP_FILENAME.length) {
    return instDir + "\\" + APP_FILENAME
  }
  const suffix = instDir.slice(instDir.length - APP_FILENAME.length)
  if (suffix.toLowerCase() !== APP_FILENAME.toLowerCase()) {
    return instDir + "\\" + APP_FILENAME
  }
  return instDir
}

test("a bare parent folder gets the application folder appended exactly once", () => {
  assert.equal(nsisResolveInstallDir("D:\\Games"), "D:\\Games\\NuArcade")
  assert.equal(nsisResolveInstallDir("C:\\Users\\Test\\AppData\\Local\\Programs"), "C:\\Users\\Test\\AppData\\Local\\Programs\\NuArcade")
})

test("a path that already ends in the application folder is left unchanged (no NuArcade\\NuArcade nesting)", () => {
  assert.equal(nsisResolveInstallDir("D:\\Games\\NuArcade"), "D:\\Games\\NuArcade")
  assert.equal(nsisResolveInstallDir("C:\\Users\\Test\\AppData\\Local\\Programs\\NuArcade"), "C:\\Users\\Test\\AppData\\Local\\Programs\\NuArcade")
})

test("the algorithm is idempotent -- applying it twice never double-nests", () => {
  for (const input of ["D:\\Games", "C:\\", "D:\\Games\\NuArcade", "NuArcade"]) {
    const once = nsisResolveInstallDir(input)
    const twice = nsisResolveInstallDir(once)
    assert.equal(twice, once, `expected idempotency for '${input}'`)
    assert.doesNotMatch(twice, /NuArcade\\NuArcade/i)
  }
})

test("a path shorter than the application folder name is always appended, never truncated/compared incorrectly", () => {
  assert.equal(nsisResolveInstallDir("D:\\"), "D:" + "\\" + "NuArcade")
})

test("a trailing separator is normalized away, not doubled -- a bare drive root or a hand-typed trailing backslash never produces NuArcade\\\\NuArcade", () => {
  assert.equal(nsisResolveInstallDir("D:\\Games\\NuArcade\\"), "D:\\Games\\NuArcade")
  assert.equal(nsisResolveInstallDir("D:\\Games\\"), "D:\\Games\\NuArcade")
  assert.equal(nsisResolveInstallDir("D:\\"), "D:\\NuArcade")
})

test("case-insensitive: an already-suffixed path in any case is recognized and left unchanged, matching Windows path semantics", () => {
  assert.equal(nsisResolveInstallDir("D:\\Games\\nuarcade"), "D:\\Games\\nuarcade")
  assert.equal(nsisResolveInstallDir("D:\\Games\\NUARCADE"), "D:\\Games\\NUARCADE")
  assert.equal(nsisResolveInstallDir("D:\\Games\\NuArCade"), "D:\\Games\\NuArCade")
})

test("repeated execution (Leave firing more than once, e.g. Back then Next) converges after the first application and stays stable", () => {
  for (const input of ["D:\\Games", "D:\\Games\\NuArcade\\", "D:\\Games\\nuarcade", "D:\\"]) {
    const first = nsisResolveInstallDir(input)
    const second = nsisResolveInstallDir(first)
    const third = nsisResolveInstallDir(second)
    assert.equal(second, first)
    assert.equal(third, first)
  }
})

test("never produces a doubled path separator", () => {
  for (const input of ["D:\\Games", "D:\\Games\\", "D:\\Games\\NuArcade", "D:\\Games\\NuArcade\\", "D:\\Games\\nuarcade", "D:\\"]) {
    assert.doesNotMatch(nsisResolveInstallDir(input), /\\\\/)
  }
})

test("never produces NuArcade\\NuArcade, nuarcade\\NuArcade, or Vespara\\Vespara in any case combination", () => {
  const cases = ["D:\\Games", "D:\\Games\\NuArcade", "D:\\Games\\NuArcade\\", "D:\\Games\\nuarcade", "D:\\Games\\NUARCADE", "D:\\"]
  for (const input of cases) {
    const result = nsisResolveInstallDir(input)
    assert.doesNotMatch(result, /nuarcade\\nuarcade/i)
    assert.doesNotMatch(result, /vespara\\vespara/i)
  }
})

test("the default install-mode target already includes the application folder, per electron-builder's vendored multiUser.nsh (pinned dependency, not ours -- flags if a future electron-builder upgrade removes it)", () => {
  const multiUser = fs.readFileSync(
    path.join(ROOT, "node_modules", "app-builder-lib", "templates", "nsis", "multiUser.nsh"),
    "utf8"
  )
  assert.match(multiUser, /StrCpy \$INSTDIR "\$0\\\$\{APP_FILENAME\}"/)
})

// -- Source-level structural checks (cross-checking the JS model above) -----

test("VesparaDirectoryPageLeave is wired to the Directory page via the standard MUI_PAGE_CUSTOMFUNCTION_LEAVE hook", () => {
  assert.match(nsis, /!define MUI_PAGE_CUSTOMFUNCTION_LEAVE VesparaDirectoryPageLeave/)
  assert.match(nsis, /Function VesparaDirectoryPageLeave[\s\S]*?FunctionEnd/)
})

test("the directory fixup uses a length/suffix comparison, not unsafe naive concatenation", () => {
  const fn = nsis.slice(nsis.indexOf("Function VesparaDirectoryPageLeave"), nsis.indexOf("FunctionEnd", nsis.indexOf("Function VesparaDirectoryPageLeave")))
  assert.match(fn, /StrLen \$0 "\$\{APP_FILENAME\}"/)
  assert.match(fn, /StrLen \$1 \$INSTDIR/)
  assert.match(fn, /IntOp \$2 \$1 - \$0/)
  assert.match(fn, /StrCpy \$3 \$INSTDIR \$0 \$2/)
})

test("a trailing separator is trimmed before the suffix comparison runs", () => {
  const fn = nsis.slice(nsis.indexOf("Function VesparaDirectoryPageLeave"), nsis.indexOf("FunctionEnd", nsis.indexOf("Function VesparaDirectoryPageLeave")))
  const trimIdx = fn.search(/\$5 == "\\"/)
  const suffixCheckIdx = fn.indexOf('StrCpy $3 $INSTDIR $0 $2')
  assert.ok(trimIdx >= 0, "expected a trailing-separator trim check before the suffix comparison")
  assert.ok(trimIdx < suffixCheckIdx, "the trim must happen before the suffix comparison, not after")
})

test("the suffix comparison relies on LogicLib's default case-insensitive StrCmp (== / !=), matching Windows path semantics", () => {
  const fn = nsis.slice(nsis.indexOf("Function VesparaDirectoryPageLeave"), nsis.indexOf("FunctionEnd", nsis.indexOf("Function VesparaDirectoryPageLeave")))
  assert.match(fn, /\$3 != "\$\{APP_FILENAME\}"/)
  assert.doesNotMatch(fn, /StrCmpS/, "must not switch to the case-SENSITIVE StrCmpS variant")
})

test("the resolved directory is created automatically, unconditionally, before any file is written", () => {
  const fn = nsis.slice(nsis.indexOf("Function VesparaDirectoryPageLeave"), nsis.indexOf("FunctionEnd", nsis.indexOf("Function VesparaDirectoryPageLeave")))
  assert.match(fn, /CreateDirectory "\$INSTDIR"/)
})

test("folders.nsh does not include StrContains.nsh itself -- assistedInstaller.nsh includes it unconditionally later with no include guard, so a second include would fail the real compile", () => {
  assert.doesNotMatch(nsis, /!include\s+"?StrContains\.nsh"?/)
})

test("the new Directory-page Leave hook is positioned before the desktop-shortcut checkbox page in source order (so the checkbox page always sees a fully-resolved $INSTDIR)", () => {
  const leaveIdx = nsis.indexOf("Function VesparaDirectoryPageLeave")
  const checkboxIdx = nsis.indexOf("Function VesparaDesktopShortcutPageCreate")
  assert.ok(leaveIdx >= 0 && checkboxIdx >= 0 && leaveIdx < checkboxIdx)
})

test("upgrades never run the new fixup: the Directory page (and therefore its Leave callback) remains gated by electron-builder's own skipPageIfUpdated, unmodified by this change", () => {
  const assistedInstaller = fs.readFileSync(
    path.join(ROOT, "node_modules", "app-builder-lib", "templates", "nsis", "assistedInstaller.nsh"),
    "utf8"
  )
  assert.match(assistedInstaller, /!insertmacro skipPageIfUpdated\s*\n\s*!insertmacro MUI_PAGE_DIRECTORY/)
})
