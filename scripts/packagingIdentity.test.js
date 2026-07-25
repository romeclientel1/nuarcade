// packagingIdentity.test.js ---------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// These assert on the real, committed root package.json against the
// Vespara Brand Identity Milestone 2 compatibility rule: the VISIBLE
// productName is now "Vespara", but every migration-sensitive technical
// identifier (package name, appId, and the actual installed executable
// filename) must stay exactly "nuarcade"/"com.nuarcade.app"/"NuArcade" --
// changing any of those risks parallel installs, lost settings, update
// failures, or firewall/AV-exclusion breakage for existing users.

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const PKG_PATH = path.join(__dirname, '..', 'package.json')
const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'))

test('package name remains the technical identifier "nuarcade"', () => {
  assert.equal(pkg.name, 'nuarcade')
})

test('appId remains "com.nuarcade.app" -- this is the migration-sensitive key Windows uses to recognize an in-place upgrade', () => {
  assert.equal(pkg.build.appId, 'com.nuarcade.app')
})

test('the visible productName is now "Vespara"', () => {
  assert.equal(pkg.build.productName, 'Vespara')
})

test('executableName is pinned to "NuArcade" so the installed .exe filename never changes, preserving firewall rules, AV/Defender exclusions (see the Wizard security screen), and any external shortcut/tool references', () => {
  assert.equal(pkg.build.executableName, 'NuArcade')
})

test('no installer GUID, update-channel, or repository-targeting field was touched by this pass', () => {
  // These fields simply don't exist in this project's config today (NSIS
  // without an explicit GUID, no publish/update-channel block) -- this
  // test exists so that if one is EVER added, its presence is deliberate
  // and reviewed, not an accidental packaging change slipped in alongside
  // a future branding tweak.
  assert.equal('guid' in pkg.build, false)
  assert.equal('publish' in pkg.build, false)
})

test('the NSIS surfaces use the local Vespara icon while the existing include remains authoritative', () => {
  assert.equal(pkg.build.nsis.installerIcon, 'assets/icons/icon.ico')
  assert.equal(pkg.build.nsis.installerHeaderIcon, 'assets/icons/icon.ico')
  assert.equal(pkg.build.nsis.uninstallerIcon, 'assets/icons/icon.ico')
  assert.equal(pkg.build.nsis.include, 'assets/installer/folders.nsh')
})

test('description mentions the new Vespara-by-NuArcade lockup without dropping the technical NuArcade attribution', () => {
  assert.match(pkg.description, /Vespara/)
  assert.match(pkg.description, /NuArcade/)
})
