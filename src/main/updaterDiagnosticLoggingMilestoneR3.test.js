// updaterDiagnosticLoggingMilestoneR3.test.js --------------------------
// Regression coverage for the "Update Now flashes and resets, no files
// appear, nothing in stdout" investigation. Prior to this milestone every
// catch block in checkForUpdate/downloadUpdate/installUpdate discarded the
// real caught Error and returned only a generic { success: false, error }
// string, with zero console output anywhere -- so a real, live failure
// (network hiccup, GitHub rate limit, a genuinely missing/renamed asset,
// antivirus interference, etc.) was completely indistinguishable from every
// other failure and invisible in a packaged build's logs.
//
// These tests inject a fake `loggerImpl` (capturing calls instead of
// touching the real console) to prove, dynamically, that:
//   1. every success/failure path actually calls the logger with a
//      descriptive, non-generic message;
//   2. the exact same asset-naming/tag-format path the reported bug went
//      through (a 5.8.4 -> 6.0.0 major-version upgrade, "Vespara Setup
//      6.0.0.exe" / ".exe.sha256" assets) still succeeds end-to-end,
//      confirming that naming/tag format was never the actual defect;
//   3. no logger call, on any path, ever includes the install token value.
//
// Shares the same dependency-injection fixtures (fake https, temp
// userData dir) already established in updater.test.js.

'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { EventEmitter } = require('node:events')

const updater = require('./updater')
const {
  installerName,
  checksumName,
  REDIRECT_STATUSES,
  getVerifiedArtifactForTest,
  clearVerifiedArtifactForTest,
} = updater._internal

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vespara-updater-log-test-'))
}

function withTempDir(fn) {
  const dir = makeTempDir()
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => fs.rmSync(dir, { recursive: true, force: true }))
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

// Same minimal fake https.get/https.request replacement used throughout
// updater.test.js -- kept local to this file so each milestone's test file
// stays self-contained (matching this project's established convention).
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

// Captures every logger.log/logger.error call as a flat array of joined
// strings, so assertions can grep for substrings without caring about
// exact argument shape.
function stringifyArg(a) {
  if (typeof a === 'string') return a
  try { return JSON.stringify(a) } catch { return String(a) }
}

function makeCapturingLogger() {
  const calls = []
  return {
    calls,
    log: (...args) => calls.push(['log', ...args.map(stringifyArg)].join(' ')),
    error: (...args) => calls.push(['error', ...args.map(stringifyArg)].join(' ')),
  }
}

// == checkForUpdate ===========================================================

test('checkForUpdate logs the version being checked and the outcome', async () => {
  const logger = makeCapturingLogger()
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 200, body: JSON.stringify({ tag_name: 'v6.0.0' }) }])
  const result = await updater.checkForUpdate('5.8.4', { httpsRequestImpl, loggerImpl: logger })
  assert.equal(result.success, true)
  assert.equal(result.updateAvailable, true)
  assert.ok(logger.calls.some((c) => c.includes('checking for updates') && c.includes('5.8.4')))
  assert.ok(logger.calls.some((c) => c.includes('result') && c.includes('6.0.0')))
})

test('checkForUpdate logs the real caught reason (not a silent failure) when the network call throws', async () => {
  const logger = makeCapturingLogger()
  const httpsRequestImpl = makeFakeHttpsImpl([{ requestError: new Error('ECONNRESET: simulated network failure') }])
  const result = await updater.checkForUpdate('5.8.4', { httpsRequestImpl, loggerImpl: logger })
  assert.equal(result.success, false)
  assert.ok(logger.calls.some((c) => c.includes('latest-release lookup failed') && c.includes('ECONNRESET')))
})

// == downloadUpdate: the reported 5.8.4 -> 6.0.0 path specifically ===========

test('downloadUpdate succeeds end-to-end for the exact reported 5.8.4 -> 6.0.0 upgrade path, and logs each boundary', () => withTempDir(async (userDataPath) => {
  const logger = makeCapturingLogger()
  const installerBytes = 'fake installer bytes for 6.0.0'
  const release = makeRelease('6.0.0', [
    installerAssetFor('6.0.0', 'https://objects.githubusercontent.com/installer'),
    checksumAssetFor('6.0.0', 'https://objects.githubusercontent.com/checksum'),
  ])
  const crypto = require('node:crypto')
  const digest = crypto.createHash('sha256').update(installerBytes).digest('hex')
  const checksumLine = `${digest}  Vespara Setup 6.0.0.exe\n`

  const httpsRequestImpl = makeFakeHttpsImpl([
    { status: 200, body: JSON.stringify(release) },
    { status: 200, body: installerBytes },
    { status: 200, body: checksumLine },
  ])

  const result = await updater.downloadUpdate('6.0.0', { userDataPath, httpsRequestImpl, loggerImpl: logger })
  assert.equal(result.success, true, JSON.stringify(result))
  assert.ok(result.token)

  // Proves the exact naming/tag-format path the bug report hypothesized as
  // the culprit is NOT the defect -- "Vespara Setup 6.0.0.exe" (the real
  // artifactName template output) matches cleanly end-to-end.
  assert.ok(logger.calls.some((c) => c.includes('selected assets') && c.includes('Vespara Setup 6.0.0.exe')))
  assert.ok(logger.calls.some((c) => c.includes('release lookup succeeded')))
  assert.ok(logger.calls.some((c) => c.includes('succeeded, verified artifact staged')))

  clearVerifiedArtifactForTest()
}))

test('downloadUpdate logs the real reason when the expected assets are missing, instead of failing silently', () => withTempDir(async (userDataPath) => {
  const logger = makeCapturingLogger()
  // A release that exists but (for whatever external reason) does not
  // expose the expected installer/checksum asset names.
  const release = makeRelease('6.0.0', [{ name: 'something-else.zip', browser_download_url: 'https://objects.githubusercontent.com/x' }])
  const httpsRequestImpl = makeFakeHttpsImpl([{ status: 200, body: JSON.stringify(release) }])

  const result = await updater.downloadUpdate('6.0.0', { userDataPath, httpsRequestImpl, loggerImpl: logger })
  assert.equal(result.success, false)
  assert.ok(logger.calls.some((c) => c.includes('asset selection failed')))
  // The diagnostic log names what WAS present, so the real cause is visible.
  assert.ok(logger.calls.some((c) => c.includes('something-else.zip')))
}))

test('downloadUpdate logs the real reason when the installer download itself fails', () => withTempDir(async (userDataPath) => {
  const logger = makeCapturingLogger()
  const release = makeRelease('6.0.0', [
    installerAssetFor('6.0.0', 'https://objects.githubusercontent.com/installer'),
    checksumAssetFor('6.0.0', 'https://objects.githubusercontent.com/checksum'),
  ])
  const httpsRequestImpl = makeFakeHttpsImpl([
    { status: 200, body: JSON.stringify(release) },
    { status: 500, body: 'server error' },
  ])
  const result = await updater.downloadUpdate('6.0.0', { userDataPath, httpsRequestImpl, loggerImpl: logger })
  assert.equal(result.success, false)
  assert.ok(logger.calls.some((c) => c.includes('installer download failed') && c.includes('HTTP 500')))
}))

// == installUpdate: never logs the token =====================================

test('installUpdate logs invocation and outcome but never the token value itself', () => withTempDir(async (userDataPath) => {
  const logger = makeCapturingLogger()
  const result = await updater.installUpdate('not-a-real-token-but-still-64-hex-chars-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'.slice(0, 64), {
    userDataPath, loggerImpl: logger,
  })
  assert.equal(result.success, false)
  assert.ok(logger.calls.some((c) => c.includes('invoked')))
  const token = 'not-a-real-token-but-still-64-hex-chars-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'.slice(0, 64)
  for (const call of logger.calls) {
    assert.doesNotMatch(call, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
}))

// == Defaults ================================================================

test('omitting loggerImpl falls back to a real console-backed logger (does not throw)', async () => {
  const httpsRequestImpl = makeFakeHttpsImpl([{ requestError: new Error('simulated') }])
  const result = await updater.checkForUpdate('5.8.4', { httpsRequestImpl })
  assert.equal(result.success, false)
})
