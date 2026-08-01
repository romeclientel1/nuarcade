// releaseVersionConsistency.test.js -------------------------------------------
// Regression coverage for the actual repository state (not fixtures --
// scripts/setVersion.test.js already covers scripts/set-version.js's tool
// behavior generically against disposable fixtures). These tests read the
// real package.json, package-lock.json, README.md, and USER_MANUAL.md and
// assert they all agree on the current app version, and that the installer
// naming pattern is still the dotted "Vespara.Setup.X.Y.Z.exe" form. Every
// assertion here is a static read of committed source -- nothing is built,
// packaged, or executed.
//
// Written for the 6.0.3 release-validation pass, but not pinned to "6.0.3"
// anywhere except as a sanity check -- every other assertion derives its
// expected value from package.json itself, so it keeps passing across
// future version bumps as long as set-version.js (or an equivalent bump)
// keeps all four documents in sync.

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'))
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8')
const manual = fs.readFileSync(path.join(ROOT, 'USER_MANUAL.md'), 'utf8')
const versionCheckHook = fs.readFileSync(
  path.join(ROOT, 'renderer', 'src', 'hooks', 'useVersionCheck.js'), 'utf8'
)

const APP_VERSION = pkg.version

test('package.json has a valid dotted X.Y.Z version', () => {
  assert.match(APP_VERSION, /^\d+\.\d+\.\d+$/)
})

test('package.json version is currently 6.0.4 (sanity check for this release pass)', () => {
  assert.equal(APP_VERSION, '6.0.4')
})

test('package-lock.json top-level version and packages[""] version both match package.json', () => {
  assert.equal(lock.version, APP_VERSION)
  assert.equal(lock.packages[''].version, APP_VERSION)
})

test('README.md "Current version" badge matches package.json', () => {
  const m = readme.match(/\*\*Current version: v([^*]+)\*\*/)
  assert.ok(m, 'expected a "**Current version: vX.Y.Z**" line in README.md')
  assert.equal(m[1], APP_VERSION)
})

test('README.md\'s "verified against Vespara X" mentions all match package.json', () => {
  const matches = [...readme.matchAll(/verified against Vespara (\d+\.\d+\.\d+)/g)]
  assert.ok(matches.length >= 1, 'expected at least one "verified against Vespara X" mention in README.md')
  for (const m of matches) {
    assert.equal(m[1], APP_VERSION, `README.md mentions "verified against Vespara ${m[1]}", expected ${APP_VERSION}`)
  }
})

test('USER_MANUAL.md\'s "Verified against Vespara X" mentions all match package.json', () => {
  const matches = [...manual.matchAll(/Verified against Vespara (\d+\.\d+\.\d+)/g)]
  assert.ok(matches.length >= 2, 'expected the intro line and the Chapter 13 footer to both say "Verified against Vespara X"')
  for (const m of matches) {
    assert.equal(m[1], APP_VERSION, `USER_MANUAL.md mentions "Verified against Vespara ${m[1]}", expected ${APP_VERSION}`)
  }
})

test('useVersionCheck.js CURRENT_VERSION matches package.json', () => {
  const m = versionCheckHook.match(/CURRENT_VERSION = "([^"]+)"/)
  assert.ok(m, 'expected a CURRENT_VERSION constant in useVersionCheck.js')
  assert.equal(m[1], APP_VERSION)
})

// -- Installer naming stays dotted, resolves to Vespara.Setup.X.Y.Z.exe -----

test('nsis artifactName template is still the dotted Vespara.Setup.${version}.${ext} pattern', () => {
  assert.equal(pkg.build.nsis.artifactName, '${productName}.Setup.${version}.${ext}')
  assert.equal(pkg.build.productName, 'Vespara')
})

test('substituting the current productName/version/ext resolves to exactly Vespara.Setup.6.0.3.exe', () => {
  const resolved = pkg.build.nsis.artifactName
    .replace('${productName}', pkg.build.productName)
    .replace('${version}', APP_VERSION)
    .replace('${ext}', 'exe')
  assert.equal(resolved, 'Vespara.Setup.6.0.3.exe')
})

// -- Identity fields this release pass must NOT have touched ----------------

test('package name, appId, and executableName are untouched by the version bump', () => {
  assert.equal(pkg.name, 'nuarcade')
  assert.equal(pkg.build.appId, 'com.nuarcade.app')
  assert.equal(pkg.build.executableName, 'NuArcade')
})
