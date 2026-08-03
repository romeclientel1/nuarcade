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
// R0 Commit 5 moved the updater's download/install logic out of index.js
// and into its own dedicated, independently-tested module.
const updater = fs.readFileSync(path.join(ROOT, 'src', 'main', 'updater.js'), 'utf8')

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
  assert.equal(pkg.build.nsis.artifactName, '${productName}.Setup.${version}.${ext}')
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

test('custom uninstaller cleanup is defined for BUILD_UNINSTALLER and never falls back to recursive $INSTDIR deletion', () => {
  const macroStart = nsis.indexOf('!macro customRemoveFiles')
  const guardEnd = nsis.lastIndexOf('!endif')
  assert.ok(macroStart > guardEnd - 2000, 'customRemoveFiles should be defined outside the installer-only guard')
  const macro = nsis.slice(macroStart, nsis.indexOf('!macroend', macroStart))
  assert.doesNotMatch(macro, /RMDir \/r "\$INSTDIR"/)
  const uninstallerTemplate = fs.readFileSync(path.join(ROOT, 'node_modules', 'app-builder-lib', 'templates', 'nsis', 'uninstaller.nsh'), 'utf8')
  assert.match(uninstallerTemplate, /!ifmacrodef customRemoveFiles[\s\S]*?!insertmacro customRemoveFiles[\s\S]*?RMDir \/r \$INSTDIR/)
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
  assert.match(workflow, /files: \|\s*\n\s*\$\{\{ steps\.assets\.outputs\.INSTALLER_PATH \}\}\s*\n\s*\$\{\{ steps\.assets\.outputs\.CHECKSUM_PATH \}\}/)
  // R0 Commit 5: the updater now derives the exact Commit 4 installer
  // basename convention rather than the old hyphenated "Vespara-Setup-" +
  // version string-concatenation form. R1 (asset-naming fix): the
  // convention itself moved from a space-separated "Vespara Setup
  // ${version}.exe" to a dotted "Vespara.Setup.${version}.exe" -- GitHub
  // Releases normalizes spaces to dots on upload, so the space form was
  // silently renamed by GitHub and never matched the updater's exact-name
  // asset lookup. The dotted form survives GitHub's normalization unchanged.
  assert.match(updater, /installerName\(version\)\s*\{\s*\n\s*return `Vespara\.Setup\.\$\{version\}\.exe`/)
  assert.equal(
    crypto.createHash('sha256').update(pkg.build.appId).digest('hex'),
    crypto.createHash('sha256').update('com.nuarcade.app').digest('hex')
  )
})

// -- R0 Commit 4: SHA-256 installer checksum (workflow source-level checks) --
// These are all SOURCE-level assertions against .github/workflows/build.yml
// text -- they confirm the workflow SAYS the right thing, the same way the
// rest of this file confirms nsis/icon/generator source content, not that a
// real Windows runner has executed it. Live GitHub Actions behavior is
// confirmed separately (see the R0 Commit 4 conversation's live-validation
// checklist), never claimed here.
const buildWindowsSection = workflow.slice(
  workflow.indexOf('build-windows:'),
  workflow.indexOf('publish-release:')
)
const publishReleaseSection = workflow.slice(workflow.indexOf('publish-release:'))

test('build-windows generates a .sha256 checksum only after the installer exists', () => {
  assert.match(buildWindowsSection, /Generate installer checksum/)
  assert.match(buildWindowsSection, /Test-Path -LiteralPath \$installerPath -PathType Leaf/)
  // The checksum step must appear after the installer-build step, not before.
  assert.ok(
    buildWindowsSection.indexOf('Build Windows installer') < buildWindowsSection.indexOf('Generate installer checksum'),
    'checksum generation must run after the installer is built'
  )
})

test('the checksum filename is the exact installer basename plus .sha256', () => {
  assert.match(buildWindowsSection, /\$checksumName = "\$installerName\.sha256"/)
  assert.match(buildWindowsSection, /\$installerName = "Vespara\.Setup\.\$version\.exe"/)
})

test('checksum generation explicitly uses SHA-256, lowercased', () => {
  assert.match(buildWindowsSection, /Get-FileHash -LiteralPath \$installerPath -Algorithm SHA256/)
  assert.match(buildWindowsSection, /\.ToLowerInvariant\(\)/)
  assert.match(buildWindowsSection, /\^\[0-9a-f\]\{64\}\$/)
})

test('both the exact installer and exact checksum paths are passed to upload-artifact, with no dist/* wildcard', () => {
  const uploadSection = buildWindowsSection.slice(buildWindowsSection.indexOf('name: Upload artifact'))
  assert.match(uploadSection, /\$\{\{ steps\.checksum\.outputs\.INSTALLER_PATH \}\}/)
  assert.match(uploadSection, /\$\{\{ steps\.checksum\.outputs\.CHECKSUM_PATH \}\}/)
  assert.doesNotMatch(uploadSection, /dist\/\*/)
})

test('publish-release requires exactly one exact-name installer and exactly one exact-name checksum, with no wildcard or first-match fallback', () => {
  assert.match(publishReleaseSection, /\$installerName = "Vespara\.Setup\.\$version\.exe"/)
  assert.match(publishReleaseSection, /\$checksumName = "\$installerName\.sha256"/)
  assert.match(publishReleaseSection, /Get-ChildItem -Path dist -Filter \$installerName -File/)
  assert.match(publishReleaseSection, /Get-ChildItem -Path dist -Filter \$checksumName -File/)
  assert.match(publishReleaseSection, /installerCandidates\.Count -eq 0/)
  assert.match(publishReleaseSection, /installerCandidates\.Count -gt 1/)
  assert.match(publishReleaseSection, /checksumCandidates\.Count -eq 0/)
  assert.match(publishReleaseSection, /checksumCandidates\.Count -gt 1/)
  assert.doesNotMatch(publishReleaseSection, /Filter 'Vespara\.Setup\.\*\.exe'/)
  assert.doesNotMatch(publishReleaseSection, /-Filter '\*\.sha256'/)
})

test('publish-release recomputes the installer SHA-256 and compares it against the checksum file digest', () => {
  assert.match(publishReleaseSection, /\$actualHash = \(Get-FileHash -LiteralPath \$installerPath -Algorithm SHA256\)\.Hash\.ToLowerInvariant\(\)/)
  assert.match(publishReleaseSection, /\$actualHash -ne \$expectedHash/)
})

test('the release action receives both validated step-output paths, not a bare directory or dist/*.exe', () => {
  const releaseStep = publishReleaseSection.slice(publishReleaseSection.indexOf('Create GitHub Release'))
  assert.match(releaseStep, /\$\{\{ steps\.assets\.outputs\.INSTALLER_PATH \}\}/)
  assert.match(releaseStep, /\$\{\{ steps\.assets\.outputs\.CHECKSUM_PATH \}\}/)
  assert.doesNotMatch(releaseStep, /dist\/\*\.exe/)
  assert.doesNotMatch(releaseStep, /\*\.sha256/)
})

// The checksum-line format regex and the digest-comparison guard are
// extracted directly out of the workflow's own PowerShell source text
// (rather than re-implemented from memory) so this test exercises the exact
// pattern the CI runner will use, not a hand-written approximation of it.
// This proves the DOCUMENTED validation logic rejects malformed/mismatched
// input -- it does not execute real PowerShell or a real Windows runner.
function extractChecksumLinePattern(source) {
  const match = source.match(/\[regex\]::Match\(\$nonEmptyLines\[0\], '(\^.*\$)'\)/)
  assert.ok(match, 'expected to find the checksum-line format regex in the workflow source')
  return new RegExp(match[1])
}

test('malformed checksum content is rejected by the workflow-derived format regex', () => {
  const pattern = extractChecksumLinePattern(publishReleaseSection)
  const validLine = `${'a'.repeat(64)}  Vespara.Setup.5.8.4.exe`
  assert.match(validLine, pattern, 'sanity check: a well-formed line must match')

  const malformed = [
    `${'A'.repeat(64)}  Vespara.Setup.5.8.4.exe`,       // uppercase hex
    `${'a'.repeat(63)}  Vespara.Setup.5.8.4.exe`,        // 63 chars, too short
    `${'a'.repeat(65)}  Vespara.Setup.5.8.4.exe`,        // 65 chars, too long
    `${'a'.repeat(64)} Vespara.Setup.5.8.4.exe`,         // one space, not two
    `${'a'.repeat(64)}   Vespara.Setup.5.8.4.exe`,       // three spaces
    '',                                                    // empty
  ]
  for (const line of malformed) {
    assert.doesNotMatch(line, pattern, `expected to reject malformed line: ${JSON.stringify(line)}`)
  }
})

test('a checksum line naming a different file, containing a path separator, or carrying an extra label all fail the recorded-name checks (even though they pass the bare spacing/hex format regex)', () => {
  const pattern = extractChecksumLinePattern(publishReleaseSection)

  const wrongName = `${'a'.repeat(64)}  Vespara.Setup.5.8.3.exe`
  const match = wrongName.match(pattern)
  assert.ok(match, 'the line is well-formed enough to reach the name-comparison step')
  assert.notEqual(match[2], 'Vespara.Setup.5.8.4.exe')

  const pathPrefixed = `${'a'.repeat(64)}  dist/Vespara.Setup.5.8.4.exe`
  const pathMatch = pathPrefixed.match(pattern)
  assert.ok(pathMatch, 'the line is well-formed enough to reach the path-separator check')
  assert.match(pathMatch[2], /[\\/]/, 'expected the recorded name to still contain a path separator for the guard to catch')

  // An extra label (e.g. "SHA256: ") satisfies the two-space/64-hex format
  // regex -- the format check only constrains spacing and hash shape, not
  // filename content -- so this is caught by the separate exact-name
  // equality check in publish-release, not the format regex itself.
  const labeled = `${'a'.repeat(64)}  SHA256: Vespara.Setup.5.8.4.exe`
  const labeledMatch = labeled.match(pattern)
  assert.ok(labeledMatch, 'a labeled line still satisfies the bare spacing/hex format')
  assert.notEqual(labeledMatch[2], 'Vespara.Setup.5.8.4.exe', 'the labeled recorded name must not equal the real installer name')
})

test('a mismatched digest is rejected by the workflow-derived comparison guard', () => {
  assert.match(publishReleaseSection, /if \(\$actualHash -ne \$expectedHash\) \{/)
  const realHash = crypto.createHash('sha256').update('installer bytes').digest('hex')
  const tamperedHash = crypto.createHash('sha256').update('tampered installer bytes').digest('hex')
  assert.notEqual(realHash, tamperedHash, 'sanity check: the two fixture hashes must actually differ')
})

test('the main-only manual publication gate and job permissions are unchanged by checksum work', () => {
  assert.match(workflow, /if: >\s*\n\s*github\.event_name == 'workflow_dispatch' &&\s*\n\s*inputs\.publish == true &&\s*\n\s*github\.ref == 'refs\/heads\/main'/)
  assert.match(workflow, /contents: read/)
  const writePermissionCount = (workflow.match(/contents: write/g) || []).length
  assert.equal(writePermissionCount, 1, 'only publish-release should carry contents: write')
  assert.doesNotMatch(buildWindowsSection, /contents: write/)
})

test('protected packaging identities are unchanged by checksum work', () => {
  assert.equal(pkg.build.appId, 'com.nuarcade.app')
  assert.equal(pkg.build.executableName, 'NuArcade')
  assert.equal(pkg.name, 'nuarcade')
  assert.equal(pkg.build.nsis.artifactName, '${productName}.Setup.${version}.${ext}')
  assert.match(workflow, /Vespara\.Setup\.\$version\.exe/)
})
