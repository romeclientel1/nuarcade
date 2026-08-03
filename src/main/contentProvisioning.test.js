const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const installerSource = fs.readFileSync(path.join(__dirname, '../../assets/installer/folders.nsh'), 'utf8')
const mainSource = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8')
const p = require('./contentProvisioning')

function tempRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), 'nuarcade-provision-')) }

test('fresh packaged-style root creates the established tree without requiring F:', () => {
  const root = tempRoot()
  const result = p.provisionDirectories(root)
  assert.equal(result.success, true)
  for (const relative of ['TeknoParrot', 'PCGames', 'Media/Videos', 'Media/Artwork', 'Media/EmuMovies', 'RetroArchGames/roms/nes']) {
    assert.equal(fs.existsSync(path.join(root, relative)), true, relative)
  }
})

test('custom installation directory is used and app.asar/resources roots are rejected', () => {
  const root = tempRoot()
  assert.equal(p.resolveInstallDirectory({ isPackaged: true, execPath: path.join(root, 'NuArcade.exe') }), root)
  assert.throws(() => p.assertContentRoot(path.join(root, 'resources', 'app.asar')), /app\.asar/)
})

test('an explicitly configured F: path remains supported without becoming a default', () => {
  const created = []
  const result = p.provisionConfiguredRoots(
    { customContentPath: 'F:\\Media' },
    { fsImpl: { existsSync: () => false, mkdirSync: dir => created.push(dir) }, logger: { error() {} } },
  )
  assert.equal(result.success, true)
  assert.equal(created.length, 1)
  assert.match(created[0], /F:[\\/]Media/i)
  assert.doesNotMatch(JSON.stringify(p.defaultContentPaths('C:\\Install')), /F:/i)
})

test('provisioning is idempotent, repairs missing folders, and never overwrites files', () => {
  const root = tempRoot()
  const first = p.provisionDirectories(root)
  const marker = path.join(root, 'PCGames', 'keep.txt')
  fs.writeFileSync(marker, 'user content')
  fs.rmSync(path.join(root, 'Media', 'Videos'), { recursive: true })
  const second = p.provisionDirectories(root)
  const third = p.provisionDirectories(root)
  assert.equal(second.success, true)
  assert.equal(third.created.length, 0)
  assert.equal(fs.readFileSync(marker, 'utf8'), 'user content')
  assert.ok(first.created.length > 0)
})

test('media and RetroArch repairs are scoped to configured roots', () => {
  const root = tempRoot()
  const media = path.join(root, 'custom-media')
  const retro = path.join(root, 'custom-roms')
  assert.equal(p.provisionDirectories(media, { profile: 'media' }).success, true)
  assert.equal(p.provisionDirectories(retro, { profile: 'retroarch' }).success, true)
  assert.equal(fs.existsSync(path.join(media, 'EmuMovies')), true)
  assert.equal(fs.existsSync(path.join(retro, 'nes')), true)
  assert.equal(fs.existsSync(path.join(root, 'TeknoParrot')), false)
})

test('permission failures are reported and never reported as success', () => {
  const calls = []
  const fakeFs = { existsSync: () => false, mkdirSync: dir => { calls.push(dir); throw new Error('denied') } }
  const result = p.provisionDirectories(tempRoot(), { fsImpl: fakeFs, logger: { error() {} } })
  assert.equal(result.success, false)
  assert.ok(result.failures.length > 0)
  assert.ok(calls.length > 0)
})

test('installer seeds only the selected install root; main process owns the complete schema', () => {
  assert.match(installerSource, /CreateDirectory "\$INSTDIR\\Media\\EmuMovies"/)
  assert.doesNotMatch(installerSource, /CreateDirectory "F:\\Media/) 
  assert.match(installerSource, /!macro customRemoveFiles/)
  assert.doesNotMatch(installerSource, /RMDir \/r \"\$INSTDIR\"/)
})

test('main process contains no obsolete legacy EmuMovies descendant schema', () => {
  assert.doesNotMatch(mainSource, /ensure-media-folders-legacy|emumoviesSubFolders|emumoviesSystems|FOLDER_SCHEMA_VERSION = ['"]4\.4\.7['"]/
  )
})
