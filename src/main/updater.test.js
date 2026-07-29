// updater.test.js -------------------------------------------------------
// Focused tests for the R0 Commit 5 hardened updater (src/main/updater.js).
// No test in this file accesses GitHub, downloads a real release, launches
// a real installer, quits the real application, or touches real userData:
// network calls are replaced with an injected fake https implementation,
// filesystem operations run against a unique, per-test temporary directory
// created with fs.mkdtempSync and removed afterward, and process launches
// use a fake EventEmitter-based child, matching the fakeChild()/spawnImpl
// dependency-injection convention already used in index.test.js.
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
  isValidVersion,
  installerName,
  checksumName,
  releaseUrl,
  latestReleaseUrl,
  isAllowedUrl,
  resolveRedirectUrl,
  parseStrictTag,
  compareVersionTuples,
  fetchReleaseByTag,
  fetchLatestRelease,
  selectReleaseAssets,
  parseChecksumContent,
  isUpdaterOwnedFilename,
  generateToken,
  requestFollowingRedirects,
  RELEASE_METADATA_MAX_BYTES,
  CHECKSUM_MAX_BYTES,
  REDIRECT_STATUSES,
  getVerifiedArtifactForTest,
  setVerifiedArtifactForTest,
  clearVerifiedArtifactForTest,
} = updater._internal

// -- test fixtures ------------------------------------------------------

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vespara-updater-test-'))
}

function sha256hex(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

function validChecksumLine(content, name) {
  return `${sha256hex(content)}  ${name}\n`
}

// A minimal fake https.get/https.request replacement. `script` is an array
// of steps consumed in call order (one step per hop, including redirects):
//   { status, headers, body }   -- a normal or redirect response
//   { requestError }             -- the request itself errors
// Each produced fake response records whether resume()/destroy() was
// called on it (res.resumed / res.destroyed), and never emits further
// 'data' after destroy() is called, so tests can prove a response was
// actually terminated rather than merely ignored.
function makeFakeHttpsImpl(script) {
  let call = 0
  const responses = []
  function fakeHttpsRequestImpl(url, _options, callback) {
    const step = script[call]
    call += 1
    const req = new EventEmitter()
    setImmediate(() => {
      if (!step) {
        req.emit('error', new Error('fake https: no more script steps'))
        return
      }
      if (step.requestError) {
        req.emit('error', step.requestError)
        return
      }
      const res = new EventEmitter()
      res.statusCode = step.status
      res.headers = step.headers || {}
      res.resumed = false
      res.destroyed = false
      res.resume = () => { res.resumed = true }
      res.destroy = () => { res.destroyed = true }
      res.setEncoding = () => {}
      res.pipe = (dest) => {
        res.on('data', (chunk) => { if (!res.destroyed) dest.write(chunk) })
        res.on('end', () => { if (!res.destroyed) dest.end() })
        return dest
      }
      responses.push(res)
      callback(res)
      const isRedirect = REDIRECT_STATUSES.has(step.status)
      if (!isRedirect) {
        setImmediate(() => {
          if (res.destroyed) return
          if (step.body !== undefined) res.emit('data', Buffer.from(step.body))
          if (!res.destroyed) res.emit('end')
        })
      }
    })
    return req
  }
  fakeHttpsRequestImpl.responses = responses
  return fakeHttpsRequestImpl
}

function fakeSpawnChild() {
  const child = new EventEmitter()
  child.pid = 4242
  child.unref = () => {}
  return child
}

function makeRelease(version, assets) {
  return { tag_name: `v${version}`, assets }
}

function installerAssetFor(version, url) {
  return { name: installerName(version), browser_download_url: url }
}
function checksumAssetFor(version, url) {
  return { name: checksumName(version), browser_download_url: url }
}

// == Version validation ======================================================

test('accepts a valid dotted numeric version', () => {
  assert.equal(isValidVersion('5.8.4'), true)
})

test('rejects leading or trailing whitespace', () => {
  assert.equal(isValidVersion(' 5.8.4'), false)
  assert.equal(isValidVersion('5.8.4 '), false)
  assert.equal(isValidVersion('5.8.4\n'), false)
})

test('rejects a version containing a slash or backslash', () => {
  assert.equal(isValidVersion('5.8/4'), false)
  assert.equal(isValidVersion('..\\5.8.4'), false)
})

test('rejects path traversal sequences', () => {
  assert.equal(isValidVersion('../../5.8.4'), false)
})

test('rejects query strings and fragments', () => {
  assert.equal(isValidVersion('5.8.4?x=1'), false)
  assert.equal(isValidVersion('5.8.4#frag'), false)
})

test('rejects a prerelease or arbitrary suffix, since the project convention does not use one', () => {
  assert.equal(isValidVersion('5.8.4-beta'), false)
  assert.equal(isValidVersion('5.8.4+build1'), false)
  assert.equal(isValidVersion('5.8.4; rm -rf /'), false)
  assert.equal(isValidVersion('5.8.4%00'), false)
  assert.equal(isValidVersion(''), false)
  assert.equal(isValidVersion(null), false)
  assert.equal(isValidVersion(undefined), false)
  assert.equal(isValidVersion(5.84), false)
})

// == Release lookup ===========================================================

test('constructs the exact API endpoint for romeclientel1/nuarcade and never uses /latest', () => {
  const url = releaseUrl('5.8.4')
  assert.equal(url, 'https://api.github.com/repos/romeclientel1/nuarcade/releases/tags/v5.8.4')
  assert.doesNotMatch(url, /\/latest/)
})

test('fetchReleaseByTag resolves only when the response tag exactly equals v${version}', async () => {
  const release = makeRelease('5.8.4', [])
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 200, body: JSON.stringify(release) }])
  const result = await fetchReleaseByTag('5.8.4', { httpsRequestImpl })
  assert.equal(result.tag_name, 'v5.8.4')
})

test('fetchReleaseByTag rejects a mismatched tag', async () => {
  const release = makeRelease('5.8.3', [])
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 200, body: JSON.stringify(release) }])
  await assert.rejects(() => fetchReleaseByTag('5.8.4', { httpsRequestImpl }))
})

test('fetchReleaseByTag fails safely on malformed release JSON', async () => {
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 200, body: '{not valid json' }])
  await assert.rejects(() => fetchReleaseByTag('5.8.4', { httpsRequestImpl }))
})

test('fetchReleaseByTag fails safely when tag_name is missing', async () => {
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 200, body: JSON.stringify({ assets: [] }) }])
  await assert.rejects(() => fetchReleaseByTag('5.8.4', { httpsRequestImpl }))
})

// == checkForUpdate: main-owned availability check ===========================

test('constructs the exact /latest endpoint for romeclientel1/nuarcade', () => {
  assert.equal(latestReleaseUrl(), 'https://api.github.com/repos/romeclientel1/nuarcade/releases/latest')
})

test('parseStrictTag accepts only v<N>.<N>.<N> and returns a numeric tuple', () => {
  assert.deepEqual(parseStrictTag('v5.9.0'), [5, 9, 0])
  assert.equal(parseStrictTag('5.9.0'), null)
  assert.equal(parseStrictTag('v5.9.0-beta'), null)
  assert.equal(parseStrictTag('v5.9'), null)
  assert.equal(parseStrictTag('v5.9.0/../x'), null)
  assert.equal(parseStrictTag(null), null)
  assert.equal(parseStrictTag(42), null)
})

test('compareVersionTuples compares numerically, not lexicographically', () => {
  assert.equal(compareVersionTuples([5, 10, 0], [5, 9, 0]), 1)
  assert.equal(compareVersionTuples([5, 9, 0], [5, 10, 0]), -1)
  assert.equal(compareVersionTuples([5, 8, 4], [5, 8, 4]), 0)
})

test('checkForUpdate reports updateAvailable=true only when the latest tag is strictly newer', async () => {
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 200, body: JSON.stringify(makeRelease('5.9.0', [])) }])
  const result = await updater.checkForUpdate('5.8.4', { httpsRequestImpl })
  assert.deepEqual(result, { success: true, updateAvailable: true, version: '5.9.0' })
})

test('checkForUpdate reports updateAvailable=false when the latest tag equals the current version', async () => {
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 200, body: JSON.stringify(makeRelease('5.8.4', [])) }])
  const result = await updater.checkForUpdate('5.8.4', { httpsRequestImpl })
  assert.deepEqual(result, { success: true, updateAvailable: false, version: null })
})

test('checkForUpdate reports updateAvailable=false when the latest tag is older than the current version (not merely "different")', async () => {
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 200, body: JSON.stringify(makeRelease('5.7.0', [])) }])
  const result = await updater.checkForUpdate('5.8.4', { httpsRequestImpl })
  assert.deepEqual(result, { success: true, updateAvailable: false, version: null })
})

test('checkForUpdate numerically compares 5.10.0 as newer than 5.9.0', async () => {
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 200, body: JSON.stringify(makeRelease('5.10.0', [])) }])
  const result = await updater.checkForUpdate('5.9.0', { httpsRequestImpl })
  assert.deepEqual(result, { success: true, updateAvailable: true, version: '5.10.0' })
})

test('checkForUpdate treats a malformed, prerelease, or path-like tag as "nothing newer", never surfacing it as available', async () => {
  for (const tag of ['v5.9.0-beta', 'v5.9', 'not-a-tag', 'v5.9.0/../evil']) {
    const httpsRequestImpl = makeFakeHttpsImpl([{ status: 200, body: JSON.stringify({ tag_name: tag }) }])
    const result = await updater.checkForUpdate('5.8.4', { httpsRequestImpl })
    assert.deepEqual(result, { success: true, updateAvailable: false, version: null })
  }
})

test('checkForUpdate fails safely on a network or parse error, never throwing', async () => {
  const httpsRequestImpl = makeFakeHttpsImpl([{ requestError: new Error('network down') }])
  const result = await updater.checkForUpdate('5.8.4', { httpsRequestImpl })
  assert.equal(result.success, false)
})

test('checkForUpdate rejects an invalid currentVersion before any network request', async () => {
  let called = false
  const httpsRequestImpl = () => { called = true; return new EventEmitter() }
  const result = await updater.checkForUpdate('../../etc/passwd', { httpsRequestImpl })
  assert.equal(result.success, false)
  assert.equal(called, false)
})

test('checkForUpdate never returns a release URL, asset array, or browser_download_url to its caller', async () => {
  const release = { ...makeRelease('5.9.0', [installerAssetFor('5.9.0', 'https://objects.githubusercontent.com/a')]), html_url: 'https://github.com/x' }
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 200, body: JSON.stringify(release) }])
  const result = await updater.checkForUpdate('5.8.4', { httpsRequestImpl })
  const keys = Object.keys(result)
  assert.deepEqual(keys.sort(), ['success', 'updateAvailable', 'version'].sort())
})

// == Host and redirect validation ============================================

test('accepts exactly the allowed hosts over https', () => {
  for (const host of ['api.github.com', 'github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com']) {
    assert.equal(isAllowedUrl(`https://${host}/path`), true)
  }
})

test('rejects http even for an allowed host', () => {
  assert.equal(isAllowedUrl('http://api.github.com/path'), false)
})

test('rejects lookalike and suffix hosts', () => {
  assert.equal(isAllowedUrl('https://api.github.com.evil.example/path'), false)
  assert.equal(isAllowedUrl('https://evil-api.github.com/path'), false)
  assert.equal(isAllowedUrl('https://notgithub.com/path'), false)
  assert.equal(isAllowedUrl('https://objects.githubusercontent.com.evil.example/x'), false)
})

test('redirect to a disallowed host is rejected', async () => {
  const httpsRequestImpl = makeFakeHttpsImpl([
    { status: 302, headers: { location: 'https://evil.example/steal' } },
  ])
  await assert.rejects(() => requestFollowingRedirects('https://api.github.com/x', {
    httpsRequestImpl,
    onResponse: (_res, _status, resolve) => resolve('unreachable'),
  }))
})

test('excessive redirects are rejected', async () => {
  const hops = Array.from({ length: 10 }, () => ({
    status: 302, headers: { location: 'https://github.com/next' },
  }))
  const httpsRequestImpl = makeFakeHttpsImpl(hops)
  await assert.rejects(() => requestFollowingRedirects('https://github.com/start', {
    httpsRequestImpl,
    maxRedirects: 3,
    onResponse: (_res, _status, resolve) => resolve('unreachable'),
  }))
})

test('a malformed redirect Location header is rejected', () => {
  assert.equal(resolveRedirectUrl('', 'https://github.com/x'), null)
  assert.equal(resolveRedirectUrl(undefined, 'https://github.com/x'), null)
  assert.equal(resolveRedirectUrl('http://[::1', 'https://github.com/x'), null)
})

test('missing Location header on a redirect status is rejected', async () => {
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 302, headers: {} }])
  await assert.rejects(() => requestFollowingRedirects('https://api.github.com/x', {
    httpsRequestImpl,
    onResponse: (_res, _status, resolve) => resolve('unreachable'),
  }))
})

// == Redirect-status specifics ================================================
// Only 301/302/303/307/308 are followed. 300 and 304 -- ordinary, valid HTTP
// statuses that are not part of this module's supported redirect set -- are
// passed straight through to onResponse as terminal, non-redirect responses.

for (const status of [301, 302, 303, 307, 308]) {
  test(`redirect status ${status} with a valid allowed-host Location is followed to completion`, async () => {
    const httpsRequestImpl = makeFakeHttpsImpl([
      { status, headers: { location: 'https://github.com/next' } },
      { status: 200, body: 'final body' },
    ])
    const result = await requestFollowingRedirects('https://api.github.com/x', {
      httpsRequestImpl,
      onResponse: (res, respStatus, resolve) => { if (respStatus === 200) resolve('ok') },
    })
    assert.equal(result, 'ok')
  })
}

test('status 300 (Multiple Choices) is NOT followed as a redirect -- passed through as a terminal response', async () => {
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 300, headers: { location: 'https://github.com/next' }, body: 'unused' }])
  let seenStatus = null
  await requestFollowingRedirects('https://api.github.com/x', {
    httpsRequestImpl,
    onResponse: (res, status, resolve) => { seenStatus = status; resolve('handled') },
  })
  assert.equal(seenStatus, 300)
})

test('status 304 (Not Modified) is NOT followed as a redirect -- passed through as a terminal response', async () => {
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 304, headers: { location: 'https://github.com/next' } }])
  let seenStatus = null
  await requestFollowingRedirects('https://api.github.com/x', {
    httpsRequestImpl,
    onResponse: (res, status, resolve) => { seenStatus = status; resolve('handled') },
  })
  assert.equal(seenStatus, 304)
})

test('a disallowed redirect host is rejected even for each individually supported redirect status', async () => {
  for (const status of [301, 302, 303, 307, 308]) {
    const httpsRequestImpl = makeFakeHttpsImpl([{ status, headers: { location: 'https://evil.example/x' } }])
    await assert.rejects(() => requestFollowingRedirects('https://api.github.com/x', {
      httpsRequestImpl,
      onResponse: (_res, _status, resolve) => resolve('unreachable'),
    }))
  }
})

test('a non-200 file response is drained via resume()/destroy(), never piped or buffered', async () => {
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 404, body: 'not found body' }])
  await assert.rejects(() => downloadToFileForTest(httpsRequestImpl))
  const res = httpsRequestImpl.responses[0]
  assert.ok(res.resumed || res.destroyed, 'expected the non-200 response to be resumed or destroyed')
})

function downloadToFileForTest(httpsRequestImpl) {
  const { downloadToFile } = updater._internal
  const dest = path.join(os.tmpdir(), 'vespara-updater-test-download-' + Date.now())
  return downloadToFile('https://objects.githubusercontent.com/x', dest, { httpsRequestImpl }).finally(() => {
    try { fs.rmSync(dest, { force: true }) } catch { /* best-effort */ }
  })
}

test('no response settles more than once when a redirect is followed by a request-level error', async () => {
  const httpsRequestImpl = makeFakeHttpsImpl([
    { status: 302, headers: { location: 'https://github.com/next' } },
    { requestError: new Error('connection reset') },
  ])
  let resolveCount = 0
  let rejectCount = 0
  try {
    await requestFollowingRedirects('https://api.github.com/x', {
      httpsRequestImpl,
      onResponse: (_res, _status, resolve) => { resolveCount += 1; resolve('ok') },
    })
  } catch {
    rejectCount += 1
  }
  assert.equal(resolveCount + rejectCount, 1)
})

// == Response size bounds =====================================================

test('release metadata just under the byte limit is accepted', async () => {
  const { fetchReleaseByTag: fetchTag } = updater._internal
  const padding = 'x'.repeat(RELEASE_METADATA_MAX_BYTES - 200)
  const release = { tag_name: 'v5.8.4', assets: [], _pad: padding }
  const body = JSON.stringify(release)
  assert.ok(Buffer.byteLength(body, 'utf8') < RELEASE_METADATA_MAX_BYTES)
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 200, body }])
  const result = await fetchTag('5.8.4', { httpsRequestImpl })
  assert.equal(result.tag_name, 'v5.8.4')
})

test('release metadata over the byte limit is rejected and the response is destroyed, not fully buffered', async () => {
  const oversizedBody = 'x'.repeat(RELEASE_METADATA_MAX_BYTES + 1000)
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 200, body: oversizedBody }])
  await assert.rejects(() => fetchReleaseByTag('5.8.4', { httpsRequestImpl }))
  const res = httpsRequestImpl.responses[0]
  assert.equal(res.destroyed, true)
})

test('an oversized non-200 (4xx/5xx) release response does not accumulate unboundedly -- it is discarded immediately, never buffered', async () => {
  const oversizedBody = 'x'.repeat(RELEASE_METADATA_MAX_BYTES * 2)
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 500, body: oversizedBody }])
  await assert.rejects(() => fetchReleaseByTag('5.8.4', { httpsRequestImpl }))
  const res = httpsRequestImpl.responses[0]
  assert.ok(res.resumed || res.destroyed)
})

test('a checksum response just under its byte limit succeeds', () => withTempDir(async (userDataPath) => {
  const installerBytes = 'fake installer bytes for 5.8.4'
  const validLine = validChecksumLine(installerBytes, 'Vespara.Setup.5.8.4.exe')
  assert.ok(Buffer.byteLength(validLine, 'utf8') < CHECKSUM_MAX_BYTES)
  const release = makeRelease('5.8.4', [
    installerAssetFor('5.8.4', 'https://objects.githubusercontent.com/installer'),
    checksumAssetFor('5.8.4', 'https://objects.githubusercontent.com/checksum'),
  ])
  const httpsRequestImpl = makeFakeHttpsImpl([
    { status: 200, body: JSON.stringify(release) },
    { status: 200, body: installerBytes },
    { status: 200, body: validLine },
  ])
  const result = await updater.downloadUpdate('5.8.4', { userDataPath, httpsRequestImpl })
  assert.equal(result.success, true)
  clearVerifiedArtifactForTest()
}))

test('an oversized checksum response is rejected, the download fails, and no verified token survives', () => withTempDir(async (userDataPath) => {
  const installerBytes = 'fake installer bytes for 5.8.4'
  const oversizedChecksum = validChecksumLine(installerBytes, 'Vespara.Setup.5.8.4.exe') + 'x'.repeat(CHECKSUM_MAX_BYTES * 2)
  const release = makeRelease('5.8.4', [
    installerAssetFor('5.8.4', 'https://objects.githubusercontent.com/installer'),
    checksumAssetFor('5.8.4', 'https://objects.githubusercontent.com/checksum'),
  ])
  const httpsRequestImpl = makeFakeHttpsImpl([
    { status: 200, body: JSON.stringify(release) },
    { status: 200, body: installerBytes },
    { status: 200, body: oversizedChecksum },
  ])
  const result = await updater.downloadUpdate('5.8.4', { userDataPath, httpsRequestImpl })
  assert.equal(result.success, false)
  assert.equal(getVerifiedArtifactForTest(), null)

  const checksumRes = httpsRequestImpl.responses[2]
  assert.equal(checksumRes.destroyed, true)

  const dir = path.join(userDataPath, 'updater')
  const remaining = fs.existsSync(dir) ? fs.readdirSync(dir) : []
  assert.deepEqual(remaining, [])
}))

// == Asset selection ==========================================================

test('selects the exact installer and checksum asset names', () => {
  const release = makeRelease('5.8.4', [
    installerAssetFor('5.8.4', 'https://objects.githubusercontent.com/a'),
    checksumAssetFor('5.8.4', 'https://objects.githubusercontent.com/b'),
  ])
  const { installerAsset, checksumAsset } = selectReleaseAssets(release, '5.8.4')
  assert.equal(installerAsset.name, 'Vespara.Setup.5.8.4.exe')
  assert.equal(checksumAsset.name, 'Vespara.Setup.5.8.4.exe.sha256')
})

test('zero installer matches is rejected', () => {
  const release = makeRelease('5.8.4', [checksumAssetFor('5.8.4', 'https://objects.githubusercontent.com/b')])
  assert.throws(() => selectReleaseAssets(release, '5.8.4'))
})

test('duplicate installer matches are rejected', () => {
  const release = makeRelease('5.8.4', [
    installerAssetFor('5.8.4', 'https://objects.githubusercontent.com/a1'),
    installerAssetFor('5.8.4', 'https://objects.githubusercontent.com/a2'),
    checksumAssetFor('5.8.4', 'https://objects.githubusercontent.com/b'),
  ])
  assert.throws(() => selectReleaseAssets(release, '5.8.4'))
})

test('zero checksum matches is rejected', () => {
  const release = makeRelease('5.8.4', [installerAssetFor('5.8.4', 'https://objects.githubusercontent.com/a')])
  assert.throws(() => selectReleaseAssets(release, '5.8.4'))
})

test('duplicate checksum matches are rejected', () => {
  const release = makeRelease('5.8.4', [
    installerAssetFor('5.8.4', 'https://objects.githubusercontent.com/a'),
    checksumAssetFor('5.8.4', 'https://objects.githubusercontent.com/b1'),
    checksumAssetFor('5.8.4', 'https://objects.githubusercontent.com/b2'),
  ])
  assert.throws(() => selectReleaseAssets(release, '5.8.4'))
})

test('a case-only alternate asset name is rejected, not treated as a match', () => {
  const release = makeRelease('5.8.4', [
    { name: 'VESPARA SETUP 5.8.4.EXE', browser_download_url: 'https://objects.githubusercontent.com/a' },
    checksumAssetFor('5.8.4', 'https://objects.githubusercontent.com/b'),
  ])
  assert.throws(() => selectReleaseAssets(release, '5.8.4'))
})

test('there is no fallback to the first asset when the exact name is absent', () => {
  const release = makeRelease('5.8.4', [
    { name: 'some-other-file.exe', browser_download_url: 'https://objects.githubusercontent.com/a' },
    checksumAssetFor('5.8.4', 'https://objects.githubusercontent.com/b'),
  ])
  assert.throws(() => selectReleaseAssets(release, '5.8.4'))
})

// == Checksum handling ========================================================

test('a valid Commit 4 checksum line is accepted', () => {
  const line = validChecksumLine('installer bytes', 'Vespara.Setup.5.8.4.exe')
  assert.equal(parseChecksumContent(line, 'Vespara.Setup.5.8.4.exe'), sha256hex('installer bytes'))
})

test('a byte-order mark is rejected', () => {
  const line = '﻿' + validChecksumLine('installer bytes', 'Vespara.Setup.5.8.4.exe')
  assert.throws(() => parseChecksumContent(line, 'Vespara.Setup.5.8.4.exe'))
})

test('an uppercase digest is rejected', () => {
  const line = `${sha256hex('x').toUpperCase()}  Vespara.Setup.5.8.4.exe\n`
  assert.throws(() => parseChecksumContent(line, 'Vespara.Setup.5.8.4.exe'))
})

test('wrong spacing (one space, or three spaces) is rejected', () => {
  const hash = sha256hex('x')
  assert.throws(() => parseChecksumContent(`${hash} Vespara.Setup.5.8.4.exe\n`, 'Vespara.Setup.5.8.4.exe'))
  assert.throws(() => parseChecksumContent(`${hash}   Vespara.Setup.5.8.4.exe\n`, 'Vespara.Setup.5.8.4.exe'))
})

test('a checksum line naming the wrong filename is rejected', () => {
  const line = validChecksumLine('x', 'Vespara.Setup.5.8.3.exe')
  assert.throws(() => parseChecksumContent(line, 'Vespara.Setup.5.8.4.exe'))
})

test('a checksum line whose filename contains a path component is rejected', () => {
  const hash = sha256hex('x')
  assert.throws(() => parseChecksumContent(`${hash}  dist/Vespara.Setup.5.8.4.exe\n`, 'Vespara.Setup.5.8.4.exe'))
  assert.throws(() => parseChecksumContent(`${hash}  C:\\dist\\Vespara.Setup.5.8.4.exe\n`, 'Vespara.Setup.5.8.4.exe'))
})

test('an extra non-empty line is rejected', () => {
  const line = validChecksumLine('x', 'Vespara.Setup.5.8.4.exe') + validChecksumLine('y', 'Vespara.Setup.5.8.4.exe')
  assert.throws(() => parseChecksumContent(line, 'Vespara.Setup.5.8.4.exe'))
})

test('CR-only line endings are rejected', () => {
  const hash = sha256hex('x')
  assert.throws(() => parseChecksumContent(`${hash}  Vespara.Setup.5.8.4.exe\r\n`, 'Vespara.Setup.5.8.4.exe'))
})

test('empty content is rejected', () => {
  assert.throws(() => parseChecksumContent('', 'Vespara.Setup.5.8.4.exe'))
})

test('a digest mismatch (well-formed content, wrong hash) is rejected downstream by comparison, not by parsing', () => {
  const line = validChecksumLine('actual content', 'Vespara.Setup.5.8.4.exe')
  const parsedDigest = parseChecksumContent(line, 'Vespara.Setup.5.8.4.exe')
  const recomputed = sha256hex('tampered content')
  assert.notEqual(parsedDigest, recomputed)
})

// == updater-owned filename matching (cleanup) ===============================

test('the strict matcher accepts only updater-owned filenames', () => {
  assert.equal(isUpdaterOwnedFilename('Vespara.Setup.5.8.4.exe'), true)
  assert.equal(isUpdaterOwnedFilename('Vespara.Setup.5.8.4.exe.part'), true)
  assert.equal(isUpdaterOwnedFilename('Vespara.Setup.5.8.4.exe.sha256'), true)
})

test('the strict matcher rejects unrelated or broad-looking filenames', () => {
  assert.equal(isUpdaterOwnedFilename('some-other-app.exe'), false)
  assert.equal(isUpdaterOwnedFilename('my-important-file.exe'), false)
  assert.equal(isUpdaterOwnedFilename('download.part'), false)
  assert.equal(isUpdaterOwnedFilename('Vespara.Setup.5.8.4.exe.bak'), false)
  assert.equal(isUpdaterOwnedFilename('Vespara.Setup.notaversion.exe'), false)
})

// == downloadUpdate: end-to-end against a real temp directory + fake network

function withTempDir(fn) {
  const dir = makeTempDir()
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => fs.rmSync(dir, { recursive: true, force: true }))
}

test('downloadUpdate succeeds end-to-end with a valid checksum, returning a token only after verification', () => withTempDir(async (userDataPath) => {
  const installerBytes = 'fake installer bytes for 5.8.4'
  const release = makeRelease('5.8.4', [
    installerAssetFor('5.8.4', 'https://objects.githubusercontent.com/installer'),
    checksumAssetFor('5.8.4', 'https://objects.githubusercontent.com/checksum'),
  ])
  const httpsRequestImpl = makeFakeHttpsImpl([
    { status: 200, body: JSON.stringify(release) },
    { status: 200, body: installerBytes },
    { status: 200, body: validChecksumLine(installerBytes, 'Vespara.Setup.5.8.4.exe') },
  ])

  const result = await updater.downloadUpdate('5.8.4', { userDataPath, httpsRequestImpl })
  assert.equal(result.success, true)
  assert.equal(typeof result.token, 'string')
  assert.match(result.token, /^[0-9a-f]{64}$/)

  const artifact = getVerifiedArtifactForTest()
  assert.ok(artifact)
  assert.equal(artifact.version, '5.8.4')
  assert.equal(path.basename(artifact.path), 'Vespara.Setup.5.8.4.exe')
  assert.equal(fs.existsSync(artifact.path), true)
  clearVerifiedArtifactForTest()
}))

test('downloadUpdate rejects an invalid version before any network request', async () => {
  let called = false
  const httpsRequestImpl = () => { called = true; return new EventEmitter() }
  const result = await updater.downloadUpdate('../../etc/passwd', { userDataPath: '/tmp/whatever', httpsRequestImpl })
  assert.equal(result.success, false)
  assert.equal(called, false)
})

test('a digest mismatch during download fails and removes the partial/unverified files', () => withTempDir(async (userDataPath) => {
  const installerBytes = 'fake installer bytes for 5.8.4'
  const release = makeRelease('5.8.4', [
    installerAssetFor('5.8.4', 'https://objects.githubusercontent.com/installer'),
    checksumAssetFor('5.8.4', 'https://objects.githubusercontent.com/checksum'),
  ])
  const httpsRequestImpl = makeFakeHttpsImpl([
    { status: 200, body: JSON.stringify(release) },
    { status: 200, body: installerBytes },
    { status: 200, body: validChecksumLine('different content entirely', 'Vespara.Setup.5.8.4.exe') },
  ])

  const result = await updater.downloadUpdate('5.8.4', { userDataPath, httpsRequestImpl })
  assert.equal(result.success, false)
  assert.equal(getVerifiedArtifactForTest(), null)

  const updaterDirPath = path.join(userDataPath, 'updater')
  const remaining = fs.existsSync(updaterDirPath) ? fs.readdirSync(updaterDirPath) : []
  assert.deepEqual(remaining, [])
}))

test('the renderer cannot provide a download URL or destination path -- downloadUpdate takes only a version string', () => withTempDir(async (userDataPath) => {
  // downloadUpdate's signature only accepts (version, options) where options
  // is main-supplied; passing extra renderer-shaped fields as part of the
  // version argument itself is meaningless because isValidVersion only
  // accepts a bare dotted-numeric string.
  const smuggled = '5.8.4","downloadUrl":"https://evil.example/x'
  const result = await updater.downloadUpdate(smuggled, { userDataPath, httpsRequestImpl: () => { throw new Error('must not be called') } })
  assert.equal(result.success, false)
}))

test('stale cleanup removes only strict updater-owned filenames and leaves unrelated files untouched', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'Vespara.Setup.5.8.3.exe'), 'stale')
  fs.writeFileSync(path.join(dir, 'Vespara.Setup.5.8.3.exe.part'), 'stale-part')
  fs.writeFileSync(path.join(dir, 'Vespara.Setup.5.8.3.exe.sha256'), 'stale-sum')
  fs.writeFileSync(path.join(dir, 'unrelated-user-file.txt'), 'do not touch me')

  const installerBytes = 'fresh installer bytes'
  const release = makeRelease('5.8.4', [
    installerAssetFor('5.8.4', 'https://objects.githubusercontent.com/installer'),
    checksumAssetFor('5.8.4', 'https://objects.githubusercontent.com/checksum'),
  ])
  const httpsRequestImpl = makeFakeHttpsImpl([
    { status: 200, body: JSON.stringify(release) },
    { status: 200, body: installerBytes },
    { status: 200, body: validChecksumLine(installerBytes, 'Vespara.Setup.5.8.4.exe') },
  ])

  const result = await updater.downloadUpdate('5.8.4', { userDataPath, httpsRequestImpl })
  assert.equal(result.success, true)

  const remaining = fs.readdirSync(dir).sort()
  assert.deepEqual(remaining, ['Vespara.Setup.5.8.4.exe', 'unrelated-user-file.txt'].sort())
  clearVerifiedArtifactForTest()
}))

test('a new download invalidates the previously verified artifact', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const oldPath = path.join(dir, 'Vespara.Setup.5.8.3.exe')
  fs.writeFileSync(oldPath, 'old verified installer')
  setVerifiedArtifactForTest({ path: oldPath, sha256: sha256hex('old verified installer'), version: '5.8.3', token: 'a'.repeat(64) })

  const installerBytes = 'fresh installer bytes'
  const release = makeRelease('5.8.4', [
    installerAssetFor('5.8.4', 'https://objects.githubusercontent.com/installer'),
    checksumAssetFor('5.8.4', 'https://objects.githubusercontent.com/checksum'),
  ])
  const httpsRequestImpl = makeFakeHttpsImpl([
    { status: 200, body: JSON.stringify(release) },
    { status: 200, body: installerBytes },
    { status: 200, body: validChecksumLine(installerBytes, 'Vespara.Setup.5.8.4.exe') },
  ])

  await updater.downloadUpdate('5.8.4', { userDataPath, httpsRequestImpl })
  assert.equal(fs.existsSync(oldPath), false, 'the prior verified artifact file should have been cleaned up')
  const artifact = getVerifiedArtifactForTest()
  assert.equal(artifact.version, '5.8.4')
  clearVerifiedArtifactForTest()
}))

test('token is generated by the injected secure token source', async () => {
  let called = false
  const fakeRandomBytes = (n) => { called = true; return Buffer.alloc(n, 7) }
  const token = generateToken(fakeRandomBytes)
  assert.equal(called, true)
  assert.equal(token, Buffer.alloc(32, 7).toString('hex'))
})

// == installUpdate: token lifecycle and install-time reverification ==========

test('installUpdate rejects a malformed token without consulting verified state', async () => {
  setVerifiedArtifactForTest({ path: '/nowhere', sha256: 'x'.repeat(64), version: '5.8.4', token: 'a'.repeat(64) })
  const result = await updater.installUpdate('not-a-real-token', { userDataPath: '/tmp/whatever' })
  assert.equal(result.success, false)
  clearVerifiedArtifactForTest()
})

test('installUpdate rejects an unknown token', async () => {
  clearVerifiedArtifactForTest()
  const result = await updater.installUpdate('a'.repeat(64), { userDataPath: '/tmp/whatever' })
  assert.equal(result.success, false)
})

test('installUpdate rejects a replaced token (one that no longer matches current verified state)', async () => {
  setVerifiedArtifactForTest({ path: '/nowhere', sha256: 'x'.repeat(64), version: '5.8.4', token: 'b'.repeat(64) })
  const result = await updater.installUpdate('a'.repeat(64), { userDataPath: '/tmp/whatever' })
  assert.equal(result.success, false)
  clearVerifiedArtifactForTest()
})

test('installUpdate rejects a path outside the updater-owned directory', () => withTempDir(async (userDataPath) => {
  const outsidePath = path.join(os.tmpdir(), 'Vespara.Setup.5.8.4.exe')
  fs.writeFileSync(outsidePath, 'not really in the updater dir')
  const token = 'c'.repeat(64)
  setVerifiedArtifactForTest({ path: outsidePath, sha256: sha256hex('not really in the updater dir'), version: '5.8.4', token })
  const result = await updater.installUpdate(token, { userDataPath })
  assert.equal(result.success, false)
  fs.rmSync(outsidePath, { force: true })
  clearVerifiedArtifactForTest()
}))

test('installUpdate rejects a wrong basename', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const wrongPath = path.join(dir, 'not-the-installer.exe')
  fs.writeFileSync(wrongPath, 'content')
  const token = 'd'.repeat(64)
  setVerifiedArtifactForTest({ path: wrongPath, sha256: sha256hex('content'), version: '5.8.4', token })
  const result = await updater.installUpdate(token, { userDataPath })
  assert.equal(result.success, false)
  clearVerifiedArtifactForTest()
}))

test('installUpdate rejects a missing file', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const missingPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  const token = 'e'.repeat(64)
  setVerifiedArtifactForTest({ path: missingPath, sha256: 'x'.repeat(64), version: '5.8.4', token })
  const result = await updater.installUpdate(token, { userDataPath })
  assert.equal(result.success, false)
  clearVerifiedArtifactForTest()
}))

test('installUpdate rejects a changed installer digest and clears verified state', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const installerPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.writeFileSync(installerPath, 'original verified content')
  const token = 'f'.repeat(64)
  setVerifiedArtifactForTest({ path: installerPath, sha256: sha256hex('original verified content'), version: '5.8.4', token })

  // Tamper with the file after verification but before install.
  fs.writeFileSync(installerPath, 'tampered content')

  const result = await updater.installUpdate(token, { userDataPath })
  assert.equal(result.success, false)
  assert.equal(getVerifiedArtifactForTest(), null)
}))

// == installUpdate: symlink / realpath containment ===========================

test('an ordinary regular installer file is accepted (baseline for the symlink tests below)', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const installerPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.writeFileSync(installerPath, 'verified content')
  const token = 'b2'.repeat(32)
  setVerifiedArtifactForTest({ path: installerPath, sha256: sha256hex('verified content'), version: '5.8.4', token })

  let spawnCalled = false
  const spawnImpl = () => {
    spawnCalled = true
    const child = fakeSpawnChild()
    setImmediate(() => child.emit('spawn'))
    return child
  }
  const result = await updater.installUpdate(token, { userDataPath, spawnImpl, quitImpl: () => {} })
  assert.equal(result.success, true)
  assert.equal(spawnCalled, true)
}))

function symlinksSupported(dir) {
  try {
    const target = path.join(dir, '__symlink_probe_target.txt')
    const link = path.join(dir, '__symlink_probe_link.txt')
    fs.writeFileSync(target, 'probe')
    fs.symlinkSync(target, link)
    fs.rmSync(link, { force: true })
    fs.rmSync(target, { force: true })
    return true
  } catch {
    return false
  }
}

test('a symbolic-link installer path is rejected, the token is invalidated, and spawn is never called', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  if (!symlinksSupported(dir)) return // skip: platform/sandbox does not support symlink creation

  const realFile = path.join(userDataPath, 'real-installer-elsewhere.exe')
  fs.writeFileSync(realFile, 'verified content')
  const linkPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.symlinkSync(realFile, linkPath)

  const token = 'c3'.repeat(32)
  setVerifiedArtifactForTest({ path: linkPath, sha256: sha256hex('verified content'), version: '5.8.4', token })

  let spawnCalled = false
  const spawnImpl = () => { spawnCalled = true; return fakeSpawnChild() }
  const result = await updater.installUpdate(token, { userDataPath, spawnImpl, quitImpl: () => {} })

  assert.equal(result.success, false)
  assert.equal(spawnCalled, false)
  assert.equal(getVerifiedArtifactForTest(), null)
  assert.equal(fs.existsSync(linkPath), false, 'the symlink itself should have been removed')
}))

test('a symlink installer pointing outside the updater directory is rejected', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  if (!symlinksSupported(dir)) return

  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vespara-updater-outside-'))
  const realFile = path.join(outsideDir, 'attacker-controlled.exe')
  fs.writeFileSync(realFile, 'verified content')
  const linkPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.symlinkSync(realFile, linkPath)

  const token = 'd4'.repeat(32)
  setVerifiedArtifactForTest({ path: linkPath, sha256: sha256hex('verified content'), version: '5.8.4', token })

  let spawnCalled = false
  const spawnImpl = () => { spawnCalled = true; return fakeSpawnChild() }
  const result = await updater.installUpdate(token, { userDataPath, spawnImpl, quitImpl: () => {} })

  assert.equal(result.success, false)
  assert.equal(spawnCalled, false)
  fs.rmSync(outsideDir, { recursive: true, force: true })
}))

test('a realpath that escapes the updater directory (via injected lstat/realpath) is rejected even when lstat itself reports a regular file', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const installerPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.writeFileSync(installerPath, 'verified content')
  const token = 'e5'.repeat(32)
  setVerifiedArtifactForTest({ path: installerPath, sha256: sha256hex('verified content'), version: '5.8.4', token })

  // Simulate a parent-directory reparse point: lstat says "regular file"
  // (so the direct-symlink check passes), but realpath resolves the
  // installer to somewhere outside the updater directory entirely.
  const lstatSyncImpl = (p) => fs.lstatSync(p)
  const realpathSyncImpl = (p) => {
    if (p === installerPath) return path.join(os.tmpdir(), 'escaped-installer.exe')
    return fs.realpathSync(p)
  }

  let spawnCalled = false
  const spawnImpl = () => { spawnCalled = true; return fakeSpawnChild() }
  const result = await updater.installUpdate(token, {
    userDataPath, spawnImpl, quitImpl: () => {}, lstatSyncImpl, realpathSyncImpl,
  })

  assert.equal(result.success, false)
  assert.equal(spawnCalled, false)
  assert.equal(getVerifiedArtifactForTest(), null)
}))

// The timer itself is injected (setTimeoutImpl) rather than a real
// setTimeout -- this both speeds the test up and lets it assert exactly
// how many timers were scheduled and with what delay, rather than only
// observing that quit eventually happened after a real wait.
function fakeTimerRecorder() {
  const calls = []
  const setTimeoutImpl = (fn, ms) => { calls.push({ fn, ms }); return calls.length }
  return { calls, setTimeoutImpl }
}

test('a successful rehash proceeds to an array-based spawn of the exact verified path with fixed arguments and no shell', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const installerPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.writeFileSync(installerPath, 'verified content')
  const token = '1'.repeat(64)
  setVerifiedArtifactForTest({ path: installerPath, sha256: sha256hex('verified content'), version: '5.8.4', token })

  let spawnArgs = null
  let quitCalled = false
  const spawnImpl = (exe, args, opts) => {
    spawnArgs = { exe, args, opts }
    const child = fakeSpawnChild()
    setImmediate(() => child.emit('spawn'))
    return child
  }
  const { calls: timerCalls, setTimeoutImpl } = fakeTimerRecorder()

  const result = await updater.installUpdate(token, {
    userDataPath,
    spawnImpl,
    quitImpl: () => { quitCalled = true },
    setTimeoutImpl,
  })

  assert.equal(result.success, true)
  assert.equal(spawnArgs.exe, installerPath)
  assert.deepEqual(spawnArgs.args, ['/S'])
  assert.equal(spawnArgs.opts.shell, undefined)
  // Exactly one quit timer is scheduled, with the inherited 1500ms delay,
  // and quit has not fired yet (the timer callback was recorded, not
  // invoked) -- proving quit-after-spawn without needing a real wait.
  assert.equal(timerCalls.length, 1)
  assert.equal(timerCalls[0].ms, 1500)
  assert.equal(quitCalled, false)
  timerCalls[0].fn()
  assert.equal(quitCalled, true)
}))

test('no quit timer is scheduled after a synchronous spawn throw', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const installerPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.writeFileSync(installerPath, 'verified content')
  const token = '8'.repeat(64)
  setVerifiedArtifactForTest({ path: installerPath, sha256: sha256hex('verified content'), version: '5.8.4', token })

  const { calls: timerCalls, setTimeoutImpl } = fakeTimerRecorder()
  const spawnImpl = () => { throw new Error('ENOENT') }
  const result = await updater.installUpdate(token, { userDataPath, spawnImpl, quitImpl: () => {}, setTimeoutImpl })
  assert.equal(result.success, false)
  assert.equal(timerCalls.length, 0)
}))

test('no quit timer is scheduled after a child error event without a prior spawn', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const installerPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.writeFileSync(installerPath, 'verified content')
  const token = '9'.repeat(64)
  setVerifiedArtifactForTest({ path: installerPath, sha256: sha256hex('verified content'), version: '5.8.4', token })

  const { calls: timerCalls, setTimeoutImpl } = fakeTimerRecorder()
  const spawnImpl = () => {
    const child = fakeSpawnChild()
    setImmediate(() => child.emit('error', new Error('boom')))
    return child
  }
  const result = await updater.installUpdate(token, { userDataPath, spawnImpl, quitImpl: () => {}, setTimeoutImpl })
  assert.equal(result.success, false)
  assert.equal(timerCalls.length, 0)
}))

test('conflicting events (spawn then a later spurious error) never schedule a second timer', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const installerPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.writeFileSync(installerPath, 'verified content')
  const token = 'a1'.repeat(32)
  setVerifiedArtifactForTest({ path: installerPath, sha256: sha256hex('verified content'), version: '5.8.4', token })

  const { calls: timerCalls, setTimeoutImpl } = fakeTimerRecorder()
  const spawnImpl = () => {
    const child = fakeSpawnChild()
    setImmediate(() => {
      child.emit('spawn')
      child.emit('error', new Error('late spurious error'))
    })
    return child
  }
  const result = await updater.installUpdate(token, { userDataPath, spawnImpl, quitImpl: () => {}, setTimeoutImpl })
  assert.equal(result.success, true)
  assert.equal(timerCalls.length, 1)
}))

test('a synchronous spawn throw returns failure and does not quit', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const installerPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.writeFileSync(installerPath, 'verified content')
  const token = '2'.repeat(64)
  setVerifiedArtifactForTest({ path: installerPath, sha256: sha256hex('verified content'), version: '5.8.4', token })

  let quitCalled = false
  const spawnImpl = () => { throw new Error('ENOENT') }
  const result = await updater.installUpdate(token, { userDataPath, spawnImpl, quitImpl: () => { quitCalled = true } })
  assert.equal(result.success, false)
  assert.equal(quitCalled, false)
}))

test('a child error event returns failure and does not quit', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const installerPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.writeFileSync(installerPath, 'verified content')
  const token = '3'.repeat(64)
  setVerifiedArtifactForTest({ path: installerPath, sha256: sha256hex('verified content'), version: '5.8.4', token })

  let quitCalled = false
  const spawnImpl = () => {
    const child = fakeSpawnChild()
    setImmediate(() => child.emit('error', new Error('boom')))
    return child
  }
  const result = await updater.installUpdate(token, { userDataPath, spawnImpl, quitImpl: () => { quitCalled = true } })
  assert.equal(result.success, false)
  assert.equal(quitCalled, false)
}))

test('duplicate terminal events (spawn then error) resolve exactly once, keeping the first outcome', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const installerPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.writeFileSync(installerPath, 'verified content')
  const token = '4'.repeat(64)
  setVerifiedArtifactForTest({ path: installerPath, sha256: sha256hex('verified content'), version: '5.8.4', token })

  const spawnImpl = () => {
    const child = fakeSpawnChild()
    setImmediate(() => {
      child.emit('spawn')
      child.emit('error', new Error('late spurious error'))
    })
    return child
  }
  const result = await updater.installUpdate(token, { userDataPath, spawnImpl, quitImpl: () => {} })
  assert.equal(result.success, true)
}))

test('the token is single-use: a second install attempt with the same token fails because verified state was already consumed', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const installerPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.writeFileSync(installerPath, 'verified content')
  const token = '5'.repeat(64)
  setVerifiedArtifactForTest({ path: installerPath, sha256: sha256hex('verified content'), version: '5.8.4', token })

  const spawnImpl = () => {
    const child = fakeSpawnChild()
    setImmediate(() => child.emit('spawn'))
    return child
  }
  const first = await updater.installUpdate(token, { userDataPath, spawnImpl, quitImpl: () => {} })
  assert.equal(first.success, true)

  const second = await updater.installUpdate(token, { userDataPath, spawnImpl, quitImpl: () => {} })
  assert.equal(second.success, false)
}))

test('rapid duplicate install calls allow at most one success', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const installerPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.writeFileSync(installerPath, 'verified content')
  const token = '6'.repeat(64)
  setVerifiedArtifactForTest({ path: installerPath, sha256: sha256hex('verified content'), version: '5.8.4', token })

  const spawnImpl = () => {
    const child = fakeSpawnChild()
    setImmediate(() => child.emit('spawn'))
    return child
  }
  const [a, b] = await Promise.all([
    updater.installUpdate(token, { userDataPath, spawnImpl, quitImpl: () => {} }),
    updater.installUpdate(token, { userDataPath, spawnImpl, quitImpl: () => {} }),
  ])
  const successes = [a, b].filter((r) => r.success).length
  assert.equal(successes, 1)
}))

test('the token is never present in a failure error message', () => withTempDir(async (userDataPath) => {
  const dir = path.join(userDataPath, 'updater')
  fs.mkdirSync(dir, { recursive: true })
  const installerPath = path.join(dir, 'Vespara.Setup.5.8.4.exe')
  fs.writeFileSync(installerPath, 'original')
  const token = '7'.repeat(64)
  setVerifiedArtifactForTest({ path: installerPath, sha256: sha256hex('original'), version: '5.8.4', token })
  fs.writeFileSync(installerPath, 'tampered')

  const result = await updater.installUpdate(token, { userDataPath })
  assert.equal(result.success, false)
  assert.equal((result.error || '').includes(token), false)
}))

test('the renderer cannot substitute an installer path -- installUpdate only accepts a token, never a path field', async () => {
  // installUpdate's declared (non-default) parameter is only a token
  // string -- options is main-owned and defaults to {} -- there is no path
  // parameter for a caller to populate even if it tried.
  assert.equal(updater.installUpdate.length, 1)
})
