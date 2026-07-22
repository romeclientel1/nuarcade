// set-version.js -----------------------------------------------------------
// Bumps the four authoritative NuArcade version sources in one pass:
//   package.json                          ("version")
//   package-lock.json                     (top-level "version" + packages[""].version)
//   README.md                             ("**Current version: vX.Y.Z**")
//   renderer/src/hooks/useVersionCheck.js  (CURRENT_VERSION)
//
// Every other player-facing version display reads it dynamically from
// useVersionCheck.js at runtime -- there is nothing static left in those
// components for this script to touch.
//
// Two-phase, fail-before-write: every target is read and validated first;
// nothing is written to disk unless every target validates cleanly. A
// target must match its expected pattern exactly once (package-lock.json
// exactly twice, once per authoritative field) -- zero matches, more than
// expected matches, or a missing file are all treated as a hard failure,
// not a silent no-op.

const fs = require('fs')
const path = require('path')

const USAGE = 'Usage: node scripts/set-version.js X.Y.Z'

function validateVersion(v) {
  return typeof v === 'string' && /^\d+\.\d+\.\d+$/.test(v)
}

// -- per-target preparers ----------------------------------------------
// Each takes the current file content + the new version and returns either
// { ok: true, newContent } or { ok: false, error }. None of these write
// anything -- they only prepare what *would* be written.

function preparePackageJson(content, version) {
  const pattern = /"version":\s*"[^"]+"/g
  const matches = content.match(pattern) || []
  if (matches.length !== 1) {
    return { ok: false, error: `package.json: expected exactly 1 "version" match, found ${matches.length}` }
  }
  return { ok: true, newContent: content.replace(pattern, `"version": "${version}"`) }
}

function preparePackageLockJson(content, version) {
  // Anchored on the surrounding structure (not a bare "version" regex,
  // which would also match every dependency's own "version" field) --
  // the top-level self-entry and the packages[""] self-entry are the
  // only two places "name": "nuarcade" is immediately followed by a
  // "version" field, so anchoring on that pair is unique and safe.
  const topPattern  = /(^\{\n {2}"name": "nuarcade",\n {2}"version": ")[^"]+(")/
  const selfPattern = /("packages": \{\n {4}"": \{\n {6}"name": "nuarcade",\n {6}"version": ")[^"]+(")/

  const topMatches  = content.match(new RegExp(topPattern.source, 'g')) || []
  const selfMatches = content.match(new RegExp(selfPattern.source, 'g')) || []

  const errors = []
  if (topMatches.length !== 1) {
    errors.push(`package-lock.json: expected exactly 1 top-level "version" match, found ${topMatches.length}`)
  }
  if (selfMatches.length !== 1) {
    errors.push(`package-lock.json: expected exactly 1 packages[""] "version" match, found ${selfMatches.length}`)
  }
  if (errors.length > 0) return { ok: false, error: errors.join('; ') }

  let newContent = content.replace(topPattern, `$1${version}$2`)
  newContent = newContent.replace(selfPattern, `$1${version}$2`)
  return { ok: true, newContent }
}

function prepareReadme(content, version) {
  const pattern = /\*\*Current version: v[^*]+\*\*/g
  const matches = content.match(pattern) || []
  if (matches.length !== 1) {
    return { ok: false, error: `README.md: expected exactly 1 current-version line, found ${matches.length}` }
  }
  return { ok: true, newContent: content.replace(pattern, `**Current version: v${version}**`) }
}

function prepareVersionCheckHook(content, version) {
  const pattern = /CURRENT_VERSION = "[^"]+"/g
  const matches = content.match(pattern) || []
  if (matches.length !== 1) {
    return { ok: false, error: `useVersionCheck.js: expected exactly 1 CURRENT_VERSION match, found ${matches.length}` }
  }
  return { ok: true, newContent: content.replace(pattern, `CURRENT_VERSION = "${version}"`) }
}

const TARGETS = [
  { relPath: 'package.json', prepare: preparePackageJson },
  { relPath: 'package-lock.json', prepare: preparePackageLockJson },
  { relPath: 'README.md', prepare: prepareReadme },
  { relPath: path.join('renderer', 'src', 'hooks', 'useVersionCheck.js'), prepare: prepareVersionCheckHook },
]

// run() is the pure, testable core -- it takes an explicit root directory
// (never process.cwd(), never an env var) so tests can point it at a
// disposable fixture directory instead of the real repository. Phase 1
// (read + validate every target) is fully complete before phase 2 (write)
// ever begins; a validation failure anywhere means zero files are written.
function run(rootDir, version) {
  const errors = []
  const prepared = []

  for (const target of TARGETS) {
    const filePath = path.join(rootDir, target.relPath)
    let content
    try {
      content = fs.readFileSync(filePath, 'utf8')
    } catch (e) {
      errors.push(`${target.relPath}: could not read file (${e.code || e.message})`)
      continue
    }
    const result = target.prepare(content, version)
    if (!result.ok) {
      errors.push(result.error)
      continue
    }
    prepared.push({ filePath, relPath: target.relPath, newContent: result.newContent })
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  // Phase 2 -- every target validated; write all of them.
  for (const { filePath, newContent } of prepared) {
    fs.writeFileSync(filePath, newContent)
  }

  return { ok: true, updated: prepared.map(p => p.relPath) }
}

module.exports = { run, validateVersion, TARGETS }

if (require.main === module) {
  const version = process.argv[2]
  if (!validateVersion(version)) {
    console.error(USAGE)
    process.exit(1)
  }

  const root = path.join(__dirname, '..')
  const result = run(root, version)

  if (!result.ok) {
    console.error('Version update failed -- no files were changed:')
    result.errors.forEach(e => console.error(`  - ${e}`))
    process.exit(1)
  }

  result.updated.forEach(f => console.log(`Updated: ${f}`))
  console.log(`\nAll files updated to v${version}`)
}
