const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const ROOT = path.join(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const nsis = fs.readFileSync(path.join(ROOT, 'assets', 'installer', 'folders.nsh'), 'utf8')
const iconSvg = fs.readFileSync(path.join(ROOT, 'assets', 'icons', 'icon.svg'), 'utf8')
const generator = fs.readFileSync(path.join(ROOT, 'scripts', 'generateInstallerBrandAssets.js'), 'utf8')
const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'build.yml'), 'utf8')
const updater = fs.readFileSync(path.join(ROOT, 'src', 'main', 'index.js'), 'utf8')

function icoSizes(file) {
  const data = fs.readFileSync(file)
  assert.equal(data.readUInt16LE(0), 0)
  assert.equal(data.readUInt16LE(2), 1)
  const count = data.readUInt16LE(4)
  const sizes = []
  for (let index = 0; index < count; index += 1) {
    const offset = 6 + index * 16
    sizes.push(data[offset] || 256)
  }
  return sizes
}

function bmpInfo(file) {
  const data = fs.readFileSync(file)
  return {
    signature: data.toString('ascii', 0, 2),
    width: data.readInt32LE(18),
    height: data.readInt32LE(22),
    bits: data.readUInt16LE(28),
  }
}

test('visible installer identity is Vespara while compatibility identifiers remain NuArcade', () => {
  assert.equal(pkg.name, 'nuarcade')
  assert.equal(pkg.build.productName, 'Vespara')
  assert.equal(pkg.build.appId, 'com.nuarcade.app')
  assert.equal(pkg.build.executableName, 'NuArcade')
  assert.equal(pkg.build.nsis.shortcutName, 'Vespara')
  assert.equal(pkg.build.nsis.uninstallDisplayName, 'Vespara')
  assert.equal(pkg.build.nsis.artifactName, '${productName} Setup ${version}.${ext}')
})

test('all active Windows icon surfaces use the approved local Vespara icon', () => {
  assert.equal(pkg.build.win.icon, 'assets/icons/icon.ico')
  assert.equal(pkg.build.nsis.installerIcon, 'assets/icons/icon.ico')
  assert.equal(pkg.build.nsis.installerHeaderIcon, 'assets/icons/icon.ico')
  assert.equal(pkg.build.nsis.uninstallerIcon, 'assets/icons/icon.ico')
  assert.match(iconSvg, /vesparaThresholdLightAppIcon/)
  assert.match(iconSvg, /#d6b274/)
  assert.doesNotMatch(iconSvg, />N<|>Nu<|#00c8ff|Arial Black/)
})

test('the ICO contains all required Windows sizes and preserves an alpha-capable 256px image', () => {
  const sizes = icoSizes(path.join(ROOT, 'assets', 'icons', 'icon.ico'))
  for (const required of [16, 24, 32, 48, 64, 128, 256]) {
    assert.ok(sizes.includes(required), `missing ${required}px icon`)
  }
})

// This is a SOURCE-level assertion against assets/installer/folders.nsh --
// it proves the file itself says the right thing. It does not prove the
// real electron-builder build actually compiles this file in as a genuine
// extra wizard page; scripts/nsisGeneratedBehavior.slowtest.js proves that
// against a real `electron-builder --win --x64` build (real makensis
// compile, page-count assertion, generated-script inspection).
//
// This checkbox is only ever visible for a FRESH, MANUAL install (the user
// downloads and double-clicks the installer themselves). It has no bearing
// on the app's own in-app updater, which always launches the installer
// with the NSIS `/S` silent flag (see src/main/index.js's 'install-update'
// handler) -- `/S` intentionally skips every wizard page, this one
// included, and silently applies the checked-by-default outcome below.
test('assisted fresh manual installs show a default-checked desktop shortcut option', () => {
  assert.equal(pkg.build.nsis.oneClick, false)
  assert.equal(pkg.build.nsis.createDesktopShortcut, true)
  assert.match(nsis, /customPageAfterChangeDir/)
  assert.match(nsis, /Create a Vespara desktop shortcut/)
  assert.match(nsis, /\$\{NSD_Check\} \$VesparaDesktopShortcutCheckbox/)
  assert.match(nsis, /VesparaDesktopShortcutPageLeave/)
})

test('silent /S installs (the in-app updater path) skip the page entirely and default to checked', () => {
  assert.match(updater, /\['\/S'\]/, "the in-app updater must keep launching the installer silently -- updates must not become interactive")
  // customInit runs during Function .onInit, before any page (including
  // ours) is ever shown -- this is what makes the checked default apply
  // uniformly whether or not the page itself is ever displayed.
  assert.match(nsis, /!macro customInit\s*\n\s*StrCpy \$VesparaDesktopShortcutState \$\{BST_CHECKED\}\s*\n!macroend/)
})

test('desktop opt-out removes the installer-created Vespara link, while upgrade installs skip the page and preserve electron-builder shortcut migration', () => {
  assert.match(nsis, /IfFileExists "\$INSTDIR\\\$\{PRODUCT_FILENAME\}\.exe" 0 \+2\s+Abort/)
  assert.match(nsis, /\$VesparaDesktopShortcutState != \$\{BST_CHECKED\}[\s\S]*?Delete "\$newDesktopLink"/)
  assert.doesNotMatch(nsis, /CreateShortCut/)
  assert.equal(pkg.build.nsis.createStartMenuShortcut, true)
})

test('shortcut target, duplicate prevention, and uninstall cleanup remain owned by the pinned electron-builder implementation', () => {
  const installerTemplate = fs.readFileSync(path.join(ROOT, 'node_modules', 'app-builder-lib', 'templates', 'nsis', 'include', 'installer.nsh'), 'utf8')
  const uninstallerTemplate = fs.readFileSync(path.join(ROOT, 'node_modules', 'app-builder-lib', 'templates', 'nsis', 'uninstaller.nsh'), 'utf8')
  assert.match(installerTemplate, /CreateShortCut "\$newDesktopLink" "\$appExe"/)
  assert.match(installerTemplate, /\$\{ifNot\} \$\{isUpdated\}/)
  assert.match(uninstallerTemplate, /Delete "\$oldDesktopLink"/)
  assert.equal(pkg.build.executableName, 'NuArcade')
})

test('installer header and sidebar are correctly sized local 24-bit bitmaps', () => {
  assert.deepEqual(bmpInfo(path.join(ROOT, pkg.build.nsis.installerHeader)), {
    signature: 'BM', width: 150, height: 57, bits: 24,
  })
  assert.deepEqual(bmpInfo(path.join(ROOT, pkg.build.nsis.installerSidebar)), {
    signature: 'BM', width: 164, height: 314, bits: 24,
  })
  assert.equal(pkg.build.nsis.uninstallerSidebar, pkg.build.nsis.installerSidebar)
})

test('brand generation is deterministic, local, and uses only existing dependencies', () => {
  assert.match(generator, /svg2img/)
  assert.match(generator, /png2icons/)
  assert.match(generator, /pngjs/)
  assert.doesNotMatch(generator, /https?:|base64|fetch\(|fontFiles/)
  for (const source of [iconSvg, generator, nsis]) {
    assert.doesNotMatch(source, /(?:href|src)=["']https?:\/\/|data:image|base64,/)
  }
})

test('upgrade and build discovery identities remain unchanged', () => {
  assert.equal('guid' in pkg.build, false)
  assert.equal('publish' in pkg.build, false)
  assert.match(workflow, /npm run build:win/)
  assert.match(workflow, /files: dist\/\*\.exe/)
  assert.match(updater, /Vespara-Setup-' \+ version \+ '\.exe/)
  assert.equal(
    crypto.createHash('sha256').update(pkg.build.appId).digest('hex'),
    crypto.createHash('sha256').update('com.nuarcade.app').digest('hex')
  )
})
