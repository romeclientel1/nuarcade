// updater.js ------------------------------------------------------------
// R0 Commit 5 (amended after source-level verification): main-owned,
// exact-version, exact-asset, checksum-verified updater, plus a separate
// main-owned availability check. The renderer supplies only a version
// string to start a download, an opaque single-use token to install, and
// its own current version to ask "is anything newer" -- every URL, path,
// checksum comparison, and process-launch decision is made here, in the
// main process, never trusted from the renderer.
//
// All filesystem/network/hash/token/spawn/timer primitives are injectable
// so this module can be exercised in tests with zero real network access,
// zero real filesystem side effects outside an explicit test-owned
// directory, and zero real process launches -- see updater.test.js.
'use strict'

const path = require('path')
const crypto = require('crypto')
const https = require('https')
const fs = require('fs')
const { spawn } = require('child_process')
const { app } = require('electron')

const OWNER = 'romeclientel1'
const REPO = 'nuarcade'

// Strict allowlist: only the project's normal dotted-numeric release form
// (e.g. "5.8.4"). No prerelease/build suffix, no whitespace, no path or URL
// metacharacters -- anything not composed entirely of digits and dots is
// rejected outright, never trimmed or coerced into validity.
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/

// A release tag must be exactly "v" + the strict version form above --
// no prerelease suffix, no path-like content, nothing else.
const TAG_PATTERN = /^v(\d+)\.(\d+)\.(\d+)$/

const ALLOWED_HOSTS = new Set([
  'api.github.com',
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
])

const MAX_REDIRECTS = 5

// Only these redirect statuses are treated as "follow the Location header."
// 300 (Multiple Choices) and 304 (Not Modified) are deliberately NOT in
// this set -- they are unusual for the GitHub API/CDN responses this
// module ever expects, and are safer to reject as an ordinary non-success
// status than to silently treat as a redirect.
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

// <64 lowercase hex><exactly two spaces><bare filename>, per the exact
// Commit 4 checksum-file contract.
const CHECKSUM_LINE_PATTERN = /^([0-9a-f]{64})  (\S.*)$/

const TOKEN_PATTERN = /^[0-9a-f]{64}$/

// Conservative fixed ceilings, enforced by byte count (not JS string
// length) before any buffered content is handed to JSON.parse or the
// checksum parser. A real GitHub release JSON response is a few KB; a
// real checksum file is ~90 bytes.
const RELEASE_METADATA_MAX_BYTES = 1024 * 1024 // 1 MiB
const CHECKSUM_MAX_BYTES = 4 * 1024 // 4 KiB

function isValidVersion(version) {
  return typeof version === 'string' && VERSION_PATTERN.test(version)
}

function installerName(version) {
  return `Vespara Setup ${version}.exe`
}

function checksumName(version) {
  return `${installerName(version)}.sha256`
}

function releaseUrl(version) {
  return `https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/v${version}`
}

function latestReleaseUrl() {
  return `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`
}

function isAllowedUrl(urlString) {
  let parsed
  try {
    parsed = new URL(urlString)
  } catch {
    return false
  }
  return parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.hostname)
}

function resolveRedirectUrl(location, currentUrl) {
  if (typeof location !== 'string' || location.length === 0) return null
  try {
    return new URL(location, currentUrl).toString()
  } catch {
    return null
  }
}

// Parses a strict "v<N>.<N>.<N>" tag. Returns [major, minor, patch] as
// numbers, or null for anything else -- prerelease suffixes, build
// metadata, path-like content, or a missing/extra segment all fail this,
// not just a completely malformed string.
function parseStrictTag(tag) {
  if (typeof tag !== 'string') return null
  const match = TAG_PATTERN.exec(tag)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

// Strictly numeric, tuple-wise comparison -- never a string/lexicographic
// compare (which would wrongly rank "5.10.0" below "5.9.0").
function compareVersionTuples(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1
  }
  return 0
}

// Discards a response body without buffering it -- used for every
// non-success status so an oversized or slow-loris-style error response
// cannot accumulate unboundedly in memory or leave a request half-drained.
function discardResponse(res) {
  if (typeof res.resume === 'function') res.resume()
  else if (typeof res.destroy === 'function') res.destroy()
}

// Buffers a response into a UTF-8 string, but destroys the connection and
// rejects the instant the accumulated BYTE length (not JS string length)
// exceeds maxBytes -- so an oversized response never fully accumulates in
// memory, whether or not it would eventually have been valid content.
function bufferResponseWithLimit(res, maxBytes, resolve, reject) {
  const chunks = []
  let total = 0
  let stopped = false
  res.on('data', (chunk) => {
    if (stopped) return
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buf.length
    if (total > maxBytes) {
      stopped = true
      if (typeof res.destroy === 'function') res.destroy()
      reject(new Error(`Response exceeded the maximum allowed size of ${maxBytes} bytes.`))
      return
    }
    chunks.push(buf)
  })
  res.on('end', () => {
    if (stopped) return
    resolve(Buffer.concat(chunks).toString('utf8'))
  })
  res.on('error', (e) => {
    if (!stopped) reject(e)
  })
}

// Generic redirect-following GET. Every hop -- including the very first URL
// -- is validated against isAllowedUrl before any request is issued; a
// redirect to a disallowed host, to a non-HTTPS URL, with a missing or
// malformed Location header, or past MAX_REDIRECTS hops fails closed. Only
// the deliberately-supported redirect statuses (301/302/303/307/308) are
// followed -- any other status (including 300 and 304) is passed straight
// to onResponse as an ordinary non-redirect response.
// `onResponse(res, statusCode, resolve, reject)` is invoked only once a
// genuinely terminal (non-redirect) response arrives -- callers decide how
// to consume it (bounded-buffer for JSON/checksum text, or pipe for a
// binary download), and are responsible for discarding non-success bodies.
function requestFollowingRedirects(url, { headers, httpsRequestImpl, onResponse, maxRedirects = MAX_REDIRECTS }) {
  const doRequest = httpsRequestImpl || https.get
  return new Promise((resolve, reject) => {
    function attempt(currentUrl, hopsRemaining) {
      if (!isAllowedUrl(currentUrl)) {
        reject(new Error('Refusing to request an untrusted or non-HTTPS host.'))
        return
      }
      if (hopsRemaining < 0) {
        reject(new Error('Too many redirects.'))
        return
      }
      let req
      try {
        req = doRequest(currentUrl, { headers }, (res) => {
          const status = res.statusCode
          if (REDIRECT_STATUSES.has(status)) {
            const nextUrl = resolveRedirectUrl(res.headers && res.headers.location, currentUrl)
            if (!nextUrl) {
              discardResponse(res)
              reject(new Error('Redirect response had a missing or malformed Location header.'))
              return
            }
            discardResponse(res)
            attempt(nextUrl, hopsRemaining - 1)
            return
          }
          onResponse(res, status, resolve, reject)
        })
      } catch (e) {
        reject(e)
        return
      }
      req.on('error', (e) => reject(e))
    }
    attempt(url, maxRedirects)
  })
}

async function fetchReleaseByTag(version, { httpsRequestImpl } = {}) {
  const url = releaseUrl(version)
  const headers = { 'User-Agent': 'Vespara-Updater', Accept: 'application/vnd.github+json' }

  const body = await requestFollowingRedirects(url, {
    headers,
    httpsRequestImpl,
    onResponse: (res, status, resolve, reject) => {
      if (status !== 200) {
        discardResponse(res)
        reject(new Error(`GitHub release lookup failed with HTTP ${status}.`))
        return
      }
      bufferResponseWithLimit(res, RELEASE_METADATA_MAX_BYTES, resolve, reject)
    },
  })

  let release
  try {
    release = JSON.parse(body)
  } catch {
    throw new Error('Release metadata was not valid JSON.')
  }
  if (!release || typeof release !== 'object' || typeof release.tag_name !== 'string') {
    throw new Error('Release metadata did not include a tag_name.')
  }
  if (release.tag_name !== `v${version}`) {
    throw new Error('Release tag did not match the requested version.')
  }
  return release
}

// Main-owned "is anything newer" check. Independent of, and never reused
// as authority for, the exact-tag download lookup above -- a later
// downloadUpdate call always performs its own fresh releases/tags/v${...}
// lookup and tag-match check regardless of what this function reports.
async function fetchLatestRelease({ httpsRequestImpl } = {}) {
  const url = latestReleaseUrl()
  const headers = { 'User-Agent': 'Vespara-Updater', Accept: 'application/vnd.github+json' }

  const body = await requestFollowingRedirects(url, {
    headers,
    httpsRequestImpl,
    onResponse: (res, status, resolve, reject) => {
      if (status !== 200) {
        discardResponse(res)
        reject(new Error(`GitHub latest-release lookup failed with HTTP ${status}.`))
        return
      }
      bufferResponseWithLimit(res, RELEASE_METADATA_MAX_BYTES, resolve, reject)
    },
  })

  let release
  try {
    release = JSON.parse(body)
  } catch {
    throw new Error('Latest-release metadata was not valid JSON.')
  }
  if (!release || typeof release !== 'object') {
    throw new Error('Latest-release metadata was not an object.')
  }
  return release
}

// { success: true, updateAvailable, version } | { success: false, error }.
// version is the validated available version string only when a strictly
// newer, syntactically valid release tag was found; otherwise null. A
// malformed, prerelease, or path-like tag is treated the same as "nothing
// newer" (safe default) rather than surfaced as an available version.
async function checkForUpdate(currentVersion, options = {}) {
  const { httpsRequestImpl } = options

  if (!isValidVersion(currentVersion)) {
    return { success: false, error: 'Invalid current version.' }
  }

  let release
  try {
    release = await fetchLatestRelease({ httpsRequestImpl })
  } catch {
    return { success: false, error: 'Could not check for updates.' }
  }

  const tuple = parseStrictTag(release.tag_name)
  if (!tuple) {
    // Malformed/prerelease/path-like tag -- never report it as available.
    return { success: true, updateAvailable: false, version: null }
  }

  const currentTuple = currentVersion.split('.').map(Number)
  const isNewer = compareVersionTuples(tuple, currentTuple) > 0
  if (!isNewer) {
    return { success: true, updateAvailable: false, version: null }
  }

  return { success: true, updateAvailable: true, version: tuple.join('.') }
}

function selectExactAsset(release, exactName) {
  const assets = Array.isArray(release.assets) ? release.assets : []
  const matches = assets.filter((a) => a && a.name === exactName)
  if (matches.length !== 1) return null
  const asset = matches[0]
  if (typeof asset.browser_download_url !== 'string' || !isAllowedUrl(asset.browser_download_url)) return null
  return asset
}

function selectReleaseAssets(release, version) {
  const installerAsset = selectExactAsset(release, installerName(version))
  if (!installerAsset) throw new Error('Expected installer asset was not found or was ambiguous.')
  const checksumAsset = selectExactAsset(release, checksumName(version))
  if (!checksumAsset) throw new Error('Expected checksum asset was not found or was ambiguous.')
  return { installerAsset, checksumAsset }
}

// Rejects: BOM, anything other than exactly one line plus one trailing LF,
// CR characters, wrong hex case/length, wrong spacing, a recorded filename
// containing a path separator, and a recorded filename that isn't the exact
// expected installer basename. Never trusts a digest merely because it is
// 64 characters.
function parseChecksumContent(content, expectedInstallerName) {
  if (typeof content !== 'string' || content.length === 0) {
    throw new Error('Checksum content was empty.')
  }
  if (content.charCodeAt(0) === 0xfeff) {
    throw new Error('Checksum content must not include a byte-order mark.')
  }
  const lines = content.split('\n')
  if (lines.length !== 2 || lines[1] !== '') {
    throw new Error('Checksum content must contain exactly one line terminated by a single trailing newline.')
  }
  const line = lines[0]
  if (line.includes('\r')) {
    throw new Error('Checksum content must not contain carriage returns.')
  }
  const match = CHECKSUM_LINE_PATTERN.exec(line)
  if (!match) {
    throw new Error('Checksum content is not in the expected format.')
  }
  const digest = match[1]
  const recordedName = match[2]
  if (/[\\/]/.test(recordedName)) {
    throw new Error('Checksum content must reference a bare filename, not a path.')
  }
  if (recordedName !== expectedInstallerName) {
    throw new Error('Checksum content names a different installer file.')
  }
  return digest
}

function computeSha256(filePath, { createReadStreamImpl, hashImpl } = {}) {
  return new Promise((resolve, reject) => {
    const createStream = createReadStreamImpl || fs.createReadStream
    const hash = (hashImpl || crypto.createHash)('sha256')
    let stream
    try {
      stream = createStream(filePath)
    } catch (e) {
      reject(e)
      return
    }
    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex').toLowerCase()))
  })
}

function generateToken(randomBytesImpl) {
  const bytes = (randomBytesImpl || crypto.randomBytes)(32)
  return bytes.toString('hex')
}

function updaterDir(userDataPath) {
  return path.join(userDataPath, 'updater')
}

// Anchored to the exact updater naming convention -- only the current
// installer, its in-progress partial, its checksum, or (for any future
// updater metadata file this commit introduces) an updater-prefixed name
// may ever be removed by cleanup. No broad "all .exe" / "all .part" /
// whole-directory deletion is possible through this matcher.
function isUpdaterOwnedFilename(name) {
  return /^Vespara Setup \d+\.\d+\.\d+\.exe(\.part|\.sha256)?$/.test(name)
     || /^Vespara Setup \d+\.\d+\.\d+\.updater-meta\.json$/.test(name)
}

function cleanupStaleUpdaterFiles(dir, { readdirImpl, unlinkImpl } = {}) {
  const readdir = readdirImpl || fs.readdirSync
  const unlink = unlinkImpl || fs.unlinkSync
  let names
  try {
    names = readdir(dir)
  } catch {
    return
  }
  for (const name of names) {
    if (isUpdaterOwnedFilename(name)) {
      try { unlink(path.join(dir, name)) } catch { /* best-effort */ }
    }
  }
}

function downloadToFile(url, destPath, { httpsRequestImpl, createWriteStreamImpl, onProgress } = {}) {
  const createStream = createWriteStreamImpl || fs.createWriteStream
  return requestFollowingRedirects(url, {
    headers: { 'User-Agent': 'Vespara-Updater' },
    httpsRequestImpl,
    onResponse: (res, status, resolve, reject) => {
      if (status !== 200) {
        discardResponse(res)
        reject(new Error(`Download failed with HTTP ${status}.`))
        return
      }
      let out
      try {
        out = createStream(destPath)
      } catch (e) {
        reject(e)
        return
      }
      let downloaded = 0
      const total = parseInt((res.headers && res.headers['content-length']) || '0', 10)
      res.on('data', (chunk) => {
        downloaded += chunk.length
        if (onProgress && total > 0) {
          onProgress({ pct: Math.round((downloaded / total) * 100), downloaded, total })
        }
      })
      res.pipe(out)
      out.on('finish', () => (out.close ? out.close(() => resolve(undefined)) : resolve(undefined)))
      out.on('error', (e) => reject(e))
      res.on('error', (e) => reject(e))
    },
  })
}

// Bounded to CHECKSUM_MAX_BYTES -- the real checksum asset is ~90 bytes, so
// even a generous margin (4 KiB) is orders of magnitude more than any
// legitimate response, while still rejecting-and-destroying long before an
// oversized or malicious response could accumulate meaningfully in memory.
function downloadToString(url, { httpsRequestImpl, maxBytes = CHECKSUM_MAX_BYTES } = {}) {
  return requestFollowingRedirects(url, {
    headers: { 'User-Agent': 'Vespara-Updater' },
    httpsRequestImpl,
    onResponse: (res, status, resolve, reject) => {
      if (status !== 200) {
        discardResponse(res)
        reject(new Error(`Download failed with HTTP ${status}.`))
        return
      }
      bufferResponseWithLimit(res, maxBytes, resolve, reject)
    },
  })
}

// -- Single main-owned verified-artifact slot --------------------------------
// { path, sha256, version, token } for at most one currently verified
// download. Starting a new download always invalidates (and best-effort
// deletes) whatever was verified before; a failed download never leaves a
// token behind; a consumed or replaced token can never install again.
let verifiedArtifact = null

function invalidateVerifiedArtifact(unlink) {
  if (verifiedArtifact) {
    try { unlink(verifiedArtifact.path) } catch { /* best-effort */ }
  }
  verifiedArtifact = null
}

async function downloadUpdate(version, options = {}) {
  const {
    userDataPath,
    httpsRequestImpl,
    createWriteStreamImpl,
    existsSyncImpl,
    renameImpl,
    unlinkImpl,
    mkdirImpl,
    readdirImpl,
    computeSha256Impl,
    randomBytesImpl,
    onProgress,
  } = options

  if (!isValidVersion(version)) {
    return { success: false, error: 'Invalid version.' }
  }
  if (typeof userDataPath !== 'string' || userDataPath.length === 0) {
    return { success: false, error: 'Updater storage location was unavailable.' }
  }

  const exists = existsSyncImpl || fs.existsSync
  const mkdir = mkdirImpl || fs.mkdirSync
  const rename = renameImpl || fs.renameSync
  const unlink = unlinkImpl || fs.unlinkSync

  const dir = updaterDir(userDataPath)
  try {
    mkdir(dir, { recursive: true })
  } catch {
    return { success: false, error: 'Could not prepare the updater directory.' }
  }

  // A fresh download always invalidates whatever was verified before, and
  // clears stale updater-owned files -- never mixing state across attempts.
  invalidateVerifiedArtifact(unlink)
  cleanupStaleUpdaterFiles(dir, { readdirImpl, unlinkImpl: unlink })

  let release
  try {
    release = await fetchReleaseByTag(version, { httpsRequestImpl })
  } catch {
    return { success: false, error: 'Could not verify the requested release.' }
  }

  let assets
  try {
    assets = selectReleaseAssets(release, version)
  } catch {
    return { success: false, error: 'Expected release assets were not found.' }
  }

  const finalInstallerName = installerName(version)
  const finalInstallerPath = path.join(dir, finalInstallerName)
  const partialPath = finalInstallerPath + '.part'
  const checksumPath = path.join(dir, checksumName(version))

  function cleanupAttempt() {
    for (const p of [partialPath, finalInstallerPath, checksumPath]) {
      try { if (exists(p)) unlink(p) } catch { /* best-effort */ }
    }
  }

  try {
    await downloadToFile(assets.installerAsset.browser_download_url, partialPath, {
      httpsRequestImpl, createWriteStreamImpl, onProgress,
    })
  } catch {
    cleanupAttempt()
    return { success: false, error: 'Installer download failed.' }
  }

  let checksumContent
  try {
    checksumContent = await downloadToString(assets.checksumAsset.browser_download_url, { httpsRequestImpl })
  } catch {
    cleanupAttempt()
    return { success: false, error: 'Checksum download failed.' }
  }

  let expectedDigest
  try {
    expectedDigest = parseChecksumContent(checksumContent, finalInstallerName)
  } catch {
    cleanupAttempt()
    return { success: false, error: 'Checksum content was invalid.' }
  }

  let actualDigest
  try {
    actualDigest = await (computeSha256Impl || computeSha256)(partialPath, {})
  } catch {
    cleanupAttempt()
    return { success: false, error: 'Could not hash the downloaded installer.' }
  }

  if (actualDigest !== expectedDigest) {
    cleanupAttempt()
    return { success: false, error: 'Installer checksum did not match.' }
  }

  try {
    rename(partialPath, finalInstallerPath)
  } catch {
    cleanupAttempt()
    return { success: false, error: 'Could not finalize the downloaded installer.' }
  }

  const token = generateToken(randomBytesImpl)
  verifiedArtifact = { path: finalInstallerPath, sha256: actualDigest, version, token }

  return { success: true, token }
}

async function installUpdate(token, options = {}) {
  const {
    userDataPath,
    existsSyncImpl,
    statSyncImpl,
    lstatSyncImpl,
    realpathSyncImpl,
    spawnImpl,
    computeSha256Impl,
    unlinkImpl,
    quitImpl,
    setTimeoutImpl,
    quitDelayMs,
  } = options

  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
    return { success: false, error: 'Invalid install token.' }
  }
  if (!verifiedArtifact || verifiedArtifact.token !== token) {
    return { success: false, error: 'Unknown or expired install token.' }
  }

  const artifact = verifiedArtifact
  // Consume before any further validation -- a second call, even with the
  // exact same token, now finds no active artifact and fails cleanly rather
  // than being able to race a second launch.
  verifiedArtifact = null

  const exists = existsSyncImpl || fs.existsSync
  const stat = statSyncImpl || fs.statSync
  const lstat = lstatSyncImpl || fs.lstatSync
  const realpath = realpathSyncImpl || fs.realpathSync
  const unlink = unlinkImpl || fs.unlinkSync

  if (typeof userDataPath !== 'string' || userDataPath.length === 0) {
    return { success: false, error: 'Updater storage location was unavailable.' }
  }
  const resolvedDir = path.resolve(updaterDir(userDataPath))
  const resolvedPath = path.resolve(artifact.path)
  if (resolvedPath !== path.join(resolvedDir, path.basename(resolvedPath))) {
    return { success: false, error: 'Installer path was outside the updater-owned directory.' }
  }
  if (path.basename(resolvedPath) !== installerName(artifact.version)) {
    return { success: false, error: 'Installer filename did not match the expected convention.' }
  }
  if (!exists(resolvedPath)) {
    return { success: false, error: 'Installer file was missing.' }
  }

  // Reject a symlink at the installer path itself, before any hashing or
  // spawning. lstat (unlike stat) reports on the link itself rather than
  // following it.
  let linkStats
  try {
    linkStats = lstat(resolvedPath)
  } catch {
    return { success: false, error: 'Installer file could not be inspected.' }
  }
  if (linkStats.isSymbolicLink()) {
    try { unlink(resolvedPath) } catch { /* best-effort */ }
    return { success: false, error: 'Installer path was a symbolic link, not a regular file.' }
  }

  // Additionally resolve the real (symlink-free) path of both the
  // installer and the updater directory, and require the real installer
  // path to still land directly inside the real updater directory. This
  // catches a symlink further up the directory chain (e.g. a reparse
  // point on a parent folder) that the direct lstat check above cannot see
  // by itself. It does NOT close every possible race: a symlink could
  // still be swapped in between this check and the hash/spawn steps below
  // (a TOCTOU window that a plain synchronous fs API cannot fully close
  // without an atomic open-and-verify primitive this codebase does not
  // have). That narrower race is a known, disclosed limitation, not
  // something this check claims to prevent.
  let realInstallerPath
  let realDirPath
  try {
    realInstallerPath = realpath(resolvedPath)
    realDirPath = realpath(resolvedDir)
  } catch {
    return { success: false, error: 'Installer file could not be resolved.' }
  }
  if (realInstallerPath !== path.join(realDirPath, path.basename(realInstallerPath))) {
    try { unlink(resolvedPath) } catch { /* best-effort */ }
    return { success: false, error: 'Installer real path escaped the updater-owned directory.' }
  }

  let stats
  try {
    stats = stat(resolvedPath)
  } catch {
    return { success: false, error: 'Installer file could not be inspected.' }
  }
  if (!stats.isFile()) {
    return { success: false, error: 'Installer path was not a regular file.' }
  }

  let currentDigest
  try {
    currentDigest = await (computeSha256Impl || computeSha256)(resolvedPath, {})
  } catch {
    return { success: false, error: 'Installer file could not be verified.' }
  }
  if (currentDigest !== artifact.sha256) {
    try { unlink(resolvedPath) } catch { /* best-effort */ }
    return { success: false, error: 'Installer file changed since it was verified.' }
  }

  return new Promise((resolve) => {
    let settled = false
    function settle(result) {
      if (settled) return
      settled = true
      resolve(result)
    }
    const doSpawn = spawnImpl || spawn
    let child
    try {
      child = doSpawn(resolvedPath, ['/S'], { detached: true, stdio: 'ignore' })
    } catch {
      settle({ success: false, error: 'Failed to start the installer.' })
      return
    }
    child.on('error', function () {
      settle({ success: false, error: 'Installer process error.' })
    })
    child.on('spawn', function () {
      if (child.unref) child.unref()
      settle({ success: true })
      // This delay is inherited from the pre-Commit-5 install-update
      // handler (which quit unconditionally 1500ms after calling spawn,
      // with the comment "give the installer a moment to start, then quit
      // so it can replace files"). It is NOT inherited from, or related
      // to, Commit 2's Defender-exclusion handler, which never quits the
      // app at all -- an earlier version of this comment incorrectly
      // drew that comparison. The 1500ms figure itself has not been
      // independently re-derived or proven necessary/sufficient by this
      // commit; it is preserved, unexamined, legacy behavior. It is
      // explicitly NOT used as proof that installation completed --
      // that proof is the 'spawn' event above, which has already
      // resolved success before this timer is even scheduled.
      const doQuit = quitImpl || (() => app.quit())
      const scheduleTimeout = setTimeoutImpl || setTimeout
      const delay = typeof quitDelayMs === 'number' ? quitDelayMs : 1500
      scheduleTimeout(() => doQuit(), delay)
    })
  })
}

module.exports = {
  downloadUpdate,
  installUpdate,
  checkForUpdate,
  _internal: {
    OWNER,
    REPO,
    VERSION_PATTERN,
    TAG_PATTERN,
    ALLOWED_HOSTS,
    MAX_REDIRECTS,
    REDIRECT_STATUSES,
    CHECKSUM_LINE_PATTERN,
    TOKEN_PATTERN,
    RELEASE_METADATA_MAX_BYTES,
    CHECKSUM_MAX_BYTES,
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
    selectExactAsset,
    selectReleaseAssets,
    parseChecksumContent,
    computeSha256,
    generateToken,
    updaterDir,
    isUpdaterOwnedFilename,
    cleanupStaleUpdaterFiles,
    downloadToFile,
    downloadToString,
    requestFollowingRedirects,
    bufferResponseWithLimit,
    discardResponse,
    getVerifiedArtifactForTest: () => verifiedArtifact,
    setVerifiedArtifactForTest: (artifact) => { verifiedArtifact = artifact },
    clearVerifiedArtifactForTest: () => { verifiedArtifact = null },
  },
}
