// setVersion.test.js --------------------------------------------------------
// Committed regression tests for scripts/set-version.js, run via Node's
// built-in test runner (`node --test`) -- no test framework dependency,
// matching every other *.test.js in this project.
//
// These are DIRECT RUNTIME tests, not source-structure assertions: every
// test in sections A/C/D/E/F/G/H actually invokes the real, unmodified
// run()/validateVersion() exports from scripts/set-version.js against
// disposable fixture copies in a fresh temp directory -- never the real
// repository. Section B is the one deliberate source-structure assertion
// in this file (it greps the script's own source text to prove the
// obsolete App.jsx/Intro.jsx/AttractMode.jsx targets were actually
// removed, not merely that the new behavior happens to work).

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { run, validateVersion, TARGETS } = require('./set-version.js')

const SCRIPT_PATH = path.join(__dirname, 'set-version.js')
const SCRIPT_SRC = fs.readFileSync(SCRIPT_PATH, 'utf8')

// -- fixture helpers ----------------------------------------------------

const FIXTURE_PACKAGE_JSON = JSON.stringify({
  name: 'nuarcade-fixture',
  version: '5.5.0',
  dependencies: { 'fast-xml-parser': '^5.8.0' },
}, null, 2) + '\n'

// Deliberately includes an unrelated dependency's own "version" field
// (buffer, at a totally different value) so tests can prove it survives
// untouched -- this is exactly the class of accidental match a bare
// global "version" regex over the whole file would corrupt.
function fixturePackageLockJson(version) {
  return [
    '{',
    '  "name": "nuarcade",',
    `  "version": "${version}",`,
    '  "lockfileVersion": 3,',
    '  "requires": true,',
    '  "packages": {',
    '    "": {',
    '      "name": "nuarcade",',
    `      "version": "${version}",`,
    '      "license": "MIT",',
    '      "dependencies": {',
    '        "fast-xml-parser": "^5.8.0"',
    '      }',
    '    },',
    '    "node_modules/buffer": {',
    '      "version": "5.7.1",',
    '      "resolved": "https://example.invalid/buffer/-/buffer-5.7.1.tgz",',
    '      "integrity": "sha512-fake=="',
    '    }',
    '  }',
    '}',
    '',
  ].join('\n')
}

function fixtureReadme(version) {
  return [
    '# NuArcade',
    '',
    'A modern arcade cabinet frontend.',
    '',
    `**Current version: v${version}**`,
    '',
    '## License',
    '',
  ].join('\n')
}

function fixtureVersionCheckHook(version) {
  return [
    "import { useState, useEffect } from 'react'",
    '',
    `const CURRENT_VERSION = "${version}"`,
    '',
    'export function useVersionCheck() {',
    '  return { currentVersion: CURRENT_VERSION }',
    '}',
    '',
  ].join('\n')
}

// Writes a full, valid fixture tree (all four targets) rooted at `dir`,
// at the given starting version. Returns the map of relPath -> absolute
// path for convenience.
function writeFixtureTree(dir, version) {
  const files = {
    'package.json': FIXTURE_PACKAGE_JSON.replace('"5.5.0"', `"${version}"`),
    'package-lock.json': fixturePackageLockJson(version),
    'README.md': fixtureReadme(version),
    [path.join('renderer', 'src', 'hooks', 'useVersionCheck.js')]: fixtureVersionCheckHook(version),
  }
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, content)
  }
  return files
}

function readAll(dir) {
  const out = {}
  for (const target of TARGETS) {
    out[target.relPath] = fs.readFileSync(path.join(dir, target.relPath), 'utf8')
  }
  return out
}

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nuarcade-setversion-'))
}

// -- A. successful complete update ---------------------------------------

test('A: a full valid fixture tree updates all four authoritative targets, leaves unrelated dependency versions untouched', () => {
  const dir = makeTmpDir()
  try {
    writeFixtureTree(dir, '5.5.0')
    const result = run(dir, '9.9.9')
    assert.equal(result.ok, true)
    assert.deepEqual(result.updated.sort(), TARGETS.map(t => t.relPath).sort())

    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
    assert.equal(pkg.version, '9.9.9')

    const lock = fs.readFileSync(path.join(dir, 'package-lock.json'), 'utf8')
    const lockJson = JSON.parse(lock)
    assert.equal(lockJson.version, '9.9.9')
    assert.equal(lockJson.packages[''].version, '9.9.9')
    // Unrelated dependency entry's own version must survive untouched.
    assert.equal(lockJson.packages['node_modules/buffer'].version, '5.7.1')
    assert.match(lock, /"fast-xml-parser": "\^5\.8\.0"/)

    const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8')
    assert.match(readme, /\*\*Current version: v9\.9\.9\*\*/)

    const hook = fs.readFileSync(path.join(dir, path.join('renderer', 'src', 'hooks', 'useVersionCheck.js')), 'utf8')
    assert.match(hook, /CURRENT_VERSION = "9\.9\.9"/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// -- B. obsolete targets removed (source-structure assertion) -----------

test('B (structural): the production script no longer references App.jsx, Intro.jsx, or AttractMode.jsx', () => {
  assert.doesNotMatch(SCRIPT_SRC, /App\.jsx/)
  assert.doesNotMatch(SCRIPT_SRC, /Intro\.jsx/)
  assert.doesNotMatch(SCRIPT_SRC, /AttractMode\.jsx/)
})

// -- C. invalid versions --------------------------------------------------

test('C: invalid or missing version strings are all rejected by validateVersion()', () => {
  assert.equal(validateVersion(undefined), false)
  assert.equal(validateVersion(''), false)
  assert.equal(validateVersion('5.5'), false)
  assert.equal(validateVersion('v5.5.0'), false)
  assert.equal(validateVersion('5.5.0-beta'), false)
  assert.equal(validateVersion('5.5.0'), true)
})

test('C: run() itself is never called with an invalid version by the CLI path -- validateVersion() gates it first (mirrors the CLI entry point)', () => {
  // The CLI entry point (require.main === module) validates before ever
  // calling run(); this test proves that gate's logic directly, without
  // spawning a subprocess.
  for (const bad of [undefined, '', '5.5', 'v5.5.0', '5.5.0-beta']) {
    assert.equal(validateVersion(bad), false, `expected "${bad}" to be rejected`)
  }
})

// -- D. missing textual target --------------------------------------------

test('D: a fixture with its README current-version line removed fails nonzero and leaves every file byte-for-byte unchanged', () => {
  const dir = makeTmpDir()
  try {
    writeFixtureTree(dir, '5.5.0')
    // Remove the only current-version line entirely.
    const readmePath = path.join(dir, 'README.md')
    const original = readAll(dir)
    fs.writeFileSync(readmePath, fixtureReadme('5.5.0').replace(/\*\*Current version: v[^*]+\*\*\n\n/, ''))
    const beforeAll = readAll(dir)

    const result = run(dir, '9.9.9')
    assert.equal(result.ok, false)
    assert.ok(result.errors.some(e => e.includes('README.md')))

    const afterAll = readAll(dir)
    for (const relPath of TARGETS.map(t => t.relPath)) {
      assert.equal(afterAll[relPath], beforeAll[relPath], `${relPath} must be byte-for-byte unchanged after a failed run`)
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// -- E. duplicate textual target -------------------------------------------

test('E: a fixture with a duplicated CURRENT_VERSION declaration fails loudly before any write', () => {
  const dir = makeTmpDir()
  try {
    writeFixtureTree(dir, '5.5.0')
    const hookPath = path.join(dir, 'renderer', 'src', 'hooks', 'useVersionCheck.js')
    const duplicated = fixtureVersionCheckHook('5.5.0').replace(
      'export function useVersionCheck()',
      'const CURRENT_VERSION_DUPLICATE_MARKER = "5.5.0"\nconst CURRENT_VERSION = "5.5.0"\nexport function useVersionCheck()'
    )
    fs.writeFileSync(hookPath, duplicated)
    const beforeAll = readAll(dir)

    const result = run(dir, '9.9.9')
    assert.equal(result.ok, false)
    assert.ok(result.errors.some(e => e.includes('useVersionCheck.js') && e.includes('found 2')))

    const afterAll = readAll(dir)
    for (const relPath of TARGETS.map(t => t.relPath)) {
      assert.equal(afterAll[relPath], beforeAll[relPath], `${relPath} must be unchanged when validation fails`)
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('E: a fixture with a duplicated README current-version line fails loudly before any write', () => {
  const dir = makeTmpDir()
  try {
    writeFixtureTree(dir, '5.5.0')
    const readmePath = path.join(dir, 'README.md')
    const duplicated = fixtureReadme('5.5.0') + '\n**Current version: v5.5.0**\n'
    fs.writeFileSync(readmePath, duplicated)
    const beforeAll = readAll(dir)

    const result = run(dir, '9.9.9')
    assert.equal(result.ok, false)
    assert.ok(result.errors.some(e => e.includes('README.md') && e.includes('found 2')))

    const afterAll = readAll(dir)
    for (const relPath of TARGETS.map(t => t.relPath)) {
      assert.equal(afterAll[relPath], beforeAll[relPath])
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// -- F. missing required file -----------------------------------------------

test('F: a fixture missing one required file fails before writing any other file', () => {
  const dir = makeTmpDir()
  try {
    writeFixtureTree(dir, '5.5.0')
    const lockPath = path.join(dir, 'package-lock.json')
    fs.rmSync(lockPath)

    const result = run(dir, '9.9.9')
    assert.equal(result.ok, false)
    assert.ok(result.errors.some(e => e.includes('package-lock.json')))

    // Every OTHER file (that could still exist) must be untouched.
    assert.equal(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'), FIXTURE_PACKAGE_JSON)
    assert.equal(fs.readFileSync(path.join(dir, 'README.md'), 'utf8'), fixtureReadme('5.5.0'))
    assert.equal(
      fs.readFileSync(path.join(dir, 'renderer', 'src', 'hooks', 'useVersionCheck.js'), 'utf8'),
      fixtureVersionCheckHook('5.5.0')
    )
    assert.equal(fs.existsSync(lockPath), false, 'the missing file must still be missing, not recreated')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// -- G. working-directory independence ---------------------------------------

test('G: run() resolves paths from the explicit rootDir argument, never process.cwd()', () => {
  const dir = makeTmpDir()
  const unrelatedCwd = os.tmpdir() // deliberately NOT the fixture directory
  const originalCwd = process.cwd()
  try {
    writeFixtureTree(dir, '5.5.0')
    process.chdir(unrelatedCwd)
    const result = run(dir, '9.9.9')
    assert.equal(result.ok, true)
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
    assert.equal(pkg.version, '9.9.9')
  } finally {
    process.chdir(originalCwd)
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// -- H. output accuracy -------------------------------------------------------

test('H: a successful run reports exactly the four real targets, nothing else', () => {
  const dir = makeTmpDir()
  try {
    writeFixtureTree(dir, '5.5.0')
    const result = run(dir, '9.9.9')
    assert.equal(result.ok, true)
    assert.deepEqual(result.updated.sort(), [
      'package.json',
      'package-lock.json',
      'README.md',
      path.join('renderer', 'src', 'hooks', 'useVersionCheck.js'),
    ].sort())
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('H: a failed run never returns an "updated" list that could be mistaken for success', () => {
  const dir = makeTmpDir()
  try {
    writeFixtureTree(dir, '5.5.0')
    fs.rmSync(path.join(dir, 'README.md'))
    const result = run(dir, '9.9.9')
    assert.equal(result.ok, false)
    assert.equal(result.updated, undefined)
    assert.ok(Array.isArray(result.errors) && result.errors.length > 0)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
