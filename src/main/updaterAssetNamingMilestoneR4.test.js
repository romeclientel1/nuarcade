// updaterAssetNamingMilestoneR4.test.js ----------------------------------
// Regression coverage for the release-asset naming mismatch discovered on
// the live public v6.0.0 release:
//   - electron-builder's old artifactName template ("${productName} Setup
//     ${version}.${ext}") produced a space-separated local/CI filename,
//     e.g. "Vespara Setup 6.0.0.exe".
//   - GitHub Releases normalizes uploaded asset filenames on upload --
//     spaces become dots -- so the actual asset GitHub served back was
//     "Vespara.Setup.6.0.0.exe", never the space-separated name.
//   - src/main/updater.js's selectExactAsset does an exact, case-sensitive,
//     no-wildcard string comparison against `installerName(version)`, which
//     (before this fix) still computed the space-separated name. Zero
//     assets ever matched, so downloadUpdate always failed at the
//     asset-selection step -- reproducing exactly the "detects v6.0.0 but
//     Update Now silently fails" bug.
//
// The fix moves the canonical convention itself to the dotted form (both
// package.json's artifactName and updater.js's installerName/checksumName),
// so what CI builds, what GitHub serves, and what the exact-match lookup
// expects are now all the same string -- GitHub's normalization becomes a
// no-op instead of a silent rename.
//
// No test here accesses GitHub or the network -- release.assets arrays are
// constructed by hand to model exactly what GitHub's API reports.
'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { EventEmitter } = require('node:events')

const updater = require('./updater')
const {
  installerName,
  checksumName,
  selectExactAsset,
  selectReleaseAssets,
  isUpdaterOwnedFilename,
  REDIRECT_STATUSES,
  getVerifiedArtifactForTest,
  clearVerifiedArtifactForTest,
} = updater._internal

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vespara-updater-naming-test-'))
}
function withTempDir(fn) {
  const dir = makeTempDir()
  return Promise.resolve().then(() => fn(dir)).finally(() => fs.rmSync(dir, { recursive: true, force: true }))
}

function makeFakeHttpsImpl(script) {
  let call = 0
  function fakeHttpsRequestImpl(url, _options, callback) {
    const step = script[call]
    call += 1
    const req = new EventEmitter()
    setImmediate(() => {
      if (!step) { req.emit('error', new Error('fake https: no more script steps')); return }
      if (step.requestError) { req.emit('error', step.requestError); return }
      const res = new EventEmitter()
      res.statusCode = step.status
      res.headers = step.headers || {}
      res.resume = () => {}
      res.destroy = () => {}
      res.setEncoding = () => {}
      res.pipe = (dest) => {
        res.on('data', (chunk) => dest.write(chunk))
        res.on('end', () => dest.end())
        return dest
      }
      callback(res)
      if (!REDIRECT_STATUSES.has(step.status)) {
        setImmediate(() => {
          if (step.body !== undefined) res.emit('data', Buffer.from(step.body))
          res.emit('end')
        })
      }
    })
    return req
  }
  return fakeHttpsRequestImpl
}

// -- 1. The canonical convention itself -------------------------------------

test('installerName/checksumName produce the canonical dotted convention', () => {
  assert.equal(installerName('6.0.0'), 'Vespara.Setup.6.0.0.exe')
  assert.equal(checksumName('6.0.0'), 'Vespara.Setup.6.0.0.exe.sha256')
})

test('isUpdaterOwnedFilename recognizes the dotted convention and no longer the old space-separated one', () => {
  assert.equal(isUpdaterOwnedFilename('Vespara.Setup.6.0.0.exe'), true)
  assert.equal(isUpdaterOwnedFilename('Vespara.Setup.6.0.0.exe.part'), true)
  assert.equal(isUpdaterOwnedFilename('Vespara.Setup.6.0.0.exe.sha256'), true)
  // The old space-separated name is deliberately no longer recognized --
  // this convention has moved, not gained a second accepted form.
  assert.equal(isUpdaterOwnedFilename('Vespara Setup 6.0.0.exe'), false)
})

// -- 2. Reproduction: GitHub's real, normalized release.assets shape --------

test('a release exposing only GitHub-normalized dotted asset names is matched exactly by the fixed installerName/checksumName', () => {
  // This models the ACTUAL response shape of the public v6.0.0 release:
  // whatever electron-builder produced locally, GitHub's asset store only
  // ever reports the post-normalization (dotted) name.
  const release = {
    tag_name: 'v6.0.0',
    assets: [
      { name: 'Vespara.Setup.6.0.0.exe', browser_download_url: 'https://objects.githubusercontent.com/installer' },
      { name: 'Vespara.Setup.6.0.0.exe.sha256', browser_download_url: 'https://objects.githubusercontent.com/checksum' },
    ],
  }
  const { installerAsset, checksumAsset } = selectReleaseAssets(release, '6.0.0')
  assert.equal(installerAsset.name, 'Vespara.Setup.6.0.0.exe')
  assert.equal(checksumAsset.name, 'Vespara.Setup.6.0.0.exe.sha256')
})

test('REGRESSION GUARD: a release exposing only the old space-separated name is NOT matched (reproduces the original live bug)', () => {
  // If this ever starts passing, the naming convention has drifted back to
  // the broken space-separated form -- selectExactAsset's exact, no-
  // wildcard, no-case-insensitive-fallback comparison must keep rejecting
  // it, exactly as it did (correctly) when the live bug was reported.
  const release = {
    tag_name: 'v6.0.0',
    assets: [
      { name: 'Vespara Setup 6.0.0.exe', browser_download_url: 'https://objects.githubusercontent.com/installer' },
      { name: 'Vespara Setup 6.0.0.exe.sha256', browser_download_url: 'https://objects.githubusercontent.com/checksum' },
    ],
  }
  assert.equal(selectExactAsset(release, installerName('6.0.0')), null)
  assert.throws(() => selectReleaseAssets(release, '6.0.0'), /installer asset was not found/)
})

test('case-insensitive and partial-name matches remain rejected under the new convention (no fallback of any kind)', () => {
  const release = {
    tag_name: 'v6.0.0',
    assets: [
      { name: 'vespara.setup.6.0.0.exe', browser_download_url: 'https://objects.githubusercontent.com/lowercase' },
      { name: 'Vespara.Setup.6.0.0.EXE', browser_download_url: 'https://objects.githubusercontent.com/upperext' },
      { name: 'Vespara.Setup.6.0.0', browser_download_url: 'https://objects.githubusercontent.com/noext' },
    ],
  }
  assert.equal(selectExactAsset(release, installerName('6.0.0')), null)
})

test('checksum content must still record the exact dotted installer basename -- a mismatched or old-form recorded name is rejected', () => {
  const { parseChecksumContent } = updater._internal
  const digest = 'a'.repeat(64)
  // Correct: recorded name matches the canonical dotted installer basename.
  assert.equal(
    parseChecksumContent(`${digest}  Vespara.Setup.6.0.0.exe\n`, 'Vespara.Setup.6.0.0.exe'),
    digest
  )
  // Rejected: checksum still records the old space-separated basename even
  // though the installer itself is the new dotted name.
  assert.throws(() => parseChecksumContent(`${digest}  Vespara Setup 6.0.0.exe\n`, 'Vespara.Setup.6.0.0.exe'))
})

// -- 3. End-to-end: the exact reported 5.8.4 -> 6.0.0 upgrade path ----------

test('downloadUpdate succeeds end-to-end for an installed-5.8.4 client fetching the real, GitHub-normalized public v6.0.0 release assets', () => withTempDir(async (userDataPath) => {
  const installerBytes = 'fake installer bytes for the canonical 6.0.0 release'
  const digest = crypto.createHash('sha256').update(installerBytes).digest('hex')
  const release = {
    tag_name: 'v6.0.0',
    assets: [
      { name: 'Vespara.Setup.6.0.0.exe', browser_download_url: 'https://objects.githubusercontent.com/installer' },
      { name: 'Vespara.Setup.6.0.0.exe.sha256', browser_download_url: 'https://objects.githubusercontent.com/checksum' },
    ],
  }
  const httpsRequestImpl = makeFakeHttpsImpl([
    { status: 200, body: JSON.stringify(release) },
    { status: 200, body: installerBytes },
    { status: 200, body: `${digest}  Vespara.Setup.6.0.0.exe\n` },
  ])

  const result = await updater.downloadUpdate('6.0.0', { userDataPath, httpsRequestImpl })
  assert.equal(result.success, true, JSON.stringify(result))
  assert.ok(result.token)

  const dir = path.join(userDataPath, 'updater')
  assert.deepEqual(fs.readdirSync(dir), ['Vespara.Setup.6.0.0.exe'])

  clearVerifiedArtifactForTest()
}))
