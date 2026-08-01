// nsisGeneratedBehavior.slowtest.js ------------------------------------------
// Verifies the REAL, generated Windows installer -- not source text. This
// runs an actual `electron-builder --win --x64` build (using the native
// macOS-hosted `makensis` binary electron-builder caches; no Wine needed)
// and inspects its real output, closing the gap the static
// scripts/installerBranding.test.js regex assertions cannot: those prove
// assets/installer/folders.nsh SAYS the right thing; this proves the real
// build pipeline actually COMPILES it in.
//
// Deliberately named *.slowtest.js (not *.test.js) so it is excluded from
// the default fast `npm test` glob -- it takes tens of seconds (renderer
// build + a full electron-builder pass) and produces a ~130MB artifact.
// Run explicitly via `npm run test:nsis`, and as part of the P1 validation
// checklist before a Windows-facing release.
//
// What this DOES prove (see the P1 audit report for full detail):
//   - the assisted (non-one-click) installer flow is what's active
//   - assets/installer/folders.nsh's customPageAfterChangeDir hook compiles
//     into the real installer as a genuine extra wizard page
//   - the compiled page count is exactly what assistedInstaller.nsh's base
//     flow (4 pages) + one custom page (5 total) predicts
//   - the identity-critical defines (appId, GUID, executableName, shortcut
//     name) that reach makensis are exactly what package.json specifies
//
// What this does NOT and CANNOT prove on this host (left for physical
// Windows validation, see the P1 report's "still requires Windows" list):
//   - the checkbox is visibly rendered and clickable in the real installer
//     UI, for a genuinely interactive FRESH MANUAL install
//   - checking/unchecking it actually creates/omits the desktop shortcut
//     on disk
//   - uninstall actually removes it, and upgrades don't duplicate it
//   - the app's own in-app updater's silent `/S` install (see
//     src/main/index.js's 'install-update' handler) genuinely skips all UI
//     while still applying the checked-by-default outcome -- that's a
//     documented, intentional NSIS behavior (silent installs never show
//     any page), not something a compiled-page-count test can observe.

const { test } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const fs = require("node:fs")
const { execFileSync } = require("node:child_process")

const ROOT = path.join(__dirname, "..")
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))

function run(cmd, args, opts) {
  return execFileSync(cmd, args, Object.assign({ cwd: ROOT, encoding: "utf8" }, opts || {}))
}

test("real NSIS build: renderer builds and electron-builder --win --x64 succeeds", () => {
  run(process.execPath, [process.env.npm_execpath, "run", "build:renderer"], { stdio: "pipe" })
  const output = run(process.execPath, [require.resolve("electron-builder/cli.js"), "--win", "--x64"], {
    stdio: "pipe",
    env: Object.assign({}, process.env, { DEBUG: "electron-builder" }),
    maxBuffer: 64 * 1024 * 1024,
  })

  // -- Assisted mode + the custom shortcut-choice page really compiled in --
  // assistedInstaller.nsh's base flow (install-mode, directory, instfiles,
  // finish) is 4 pages; folders.nsh's customPageAfterChangeDir hook adds
  // exactly one more. "Install: 5 pages" is makensis's own real compile
  // report, not a source-text guess. This must stay exactly 5 even after
  // adding VesparaDirectoryPageLeave -- that's a Leave callback attached to
  // the existing Directory page, not a new page. makensis ran with -WX
  // (warnings-as-errors), so a clean exit also proves there was no
  // duplicate-include compile collision from the shared StrContains.nsh
  // helper (assistedInstaller.nsh re-includes it unconditionally later).
  assert.match(output, /Install:\s*5 pages/, "expected the real compiled installer to report exactly 5 pages (4 base assisted-installer pages + the custom shortcut-choice page)")

  // -- Identity-critical defines reaching the real compiler --
  assert.match(output, new RegExp("-DAPP_ID=" + pkg.build.appId.replace(/\./g, "\\.")))
  assert.match(output, /-DPRODUCT_FILENAME=NuArcade\b/)
  assert.match(output, /-DAPP_FILENAME=NuArcade\b/)
  assert.match(output, new RegExp("-DSHORTCUT_NAME=" + pkg.build.nsis.shortcutName))
  assert.match(output, new RegExp("-DUNINSTALL_DISPLAY_NAME=" + pkg.build.nsis.uninstallDisplayName))

  // -- The real generated script actually includes OUR file, not a stale copy --
  const debugYml = path.join(ROOT, "dist", "builder-debug.yml")
  assert.ok(fs.existsSync(debugYml), "expected electron-builder's debug log at dist/builder-debug.yml (DEBUG=electron-builder should always emit it)")
  const debugContent = fs.readFileSync(debugYml, "utf8").replace(/\\/g, "/")
  assert.match(debugContent, /!include "[^"]*assets\/installer\/folders\.nsh"/)
  assert.match(output, /Install:\s*5 pages/, "adding the Directory-page Leave hook must not add or remove a page")

  // -- A real, named installer artifact exists --
  const expectedArtifact = path.join(ROOT, "dist", `Vespara.Setup.${pkg.version}.exe`)
  assert.ok(fs.existsSync(expectedArtifact), `expected installer artifact at ${expectedArtifact}`)
  assert.ok(fs.statSync(expectedArtifact).size > 10_000_000, "installer artifact is implausibly small")
})
