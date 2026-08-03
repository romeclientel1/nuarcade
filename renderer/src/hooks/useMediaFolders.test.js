import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeMediaFolders } from './useMediaFolders.js'

function createHarness() {
  const statuses = []
  const results = []
  const writes = []
  const logs = []
  const errors = []

  return {
    statuses,
    results,
    writes,
    logs,
    errors,
    options: {
      storage: { setItem: (...args) => writes.push(args) },
      setStatus: value => statuses.push(value),
      setResult: value => results.push(value),
      logger: {
        log: (...args) => logs.push(args),
        error: (...args) => errors.push(args),
      },
    },
  }
}

test('calls the native bridge and preserves the successful Electron initialization contract', async () => {
  const harness = createHarness()
  const response = { success: true, created: 3, mediaRoot: 'C:/Vespara/Media' }
  let calls = 0

  await initializeMediaFolders({
    ...harness.options,
    nativeBridge: {
      ensureMediaFolders: async () => {
        calls += 1
        return response
      },
    },
  })

  assert.equal(calls, 1)
  assert.deepEqual(harness.statuses, ['running', 'done'])
  assert.deepEqual(harness.results, [response])
  assert.deepEqual(harness.writes, [['nuarcade_media_folders_created', '1']])
  assert.deepEqual(harness.errors, [])
})

test('reports an unavailable browser-preview state without calling or persisting native initialization', async () => {
  const harness = createHarness()

  await initializeMediaFolders({
    ...harness.options,
    nativeBridge: undefined,
  })

  assert.deepEqual(harness.statuses, ['unavailable'])
  assert.deepEqual(harness.results, [])
  assert.deepEqual(harness.writes, [])
  assert.deepEqual(harness.logs, [])
  assert.deepEqual(harness.errors, [])
})

test('preserves real Electron bridge failures as errors', async () => {
  const harness = createHarness()
  const failure = new Error('IPC unavailable')

  await initializeMediaFolders({
    ...harness.options,
    nativeBridge: {
      ensureMediaFolders: async () => { throw failure },
    },
  })

  assert.deepEqual(harness.statuses, ['running', 'error'])
  assert.deepEqual(harness.results, [])
  assert.deepEqual(harness.writes, [])
  assert.equal(harness.errors.length, 1)
  assert.deepEqual(harness.errors[0], ['[MediaFolders] IPC error:', failure])
})

test('a stale renderer completion flag cannot suppress filesystem verification', () => {
  const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'useMediaFolders.js'), 'utf8')
  assert.equal(source.includes('localStorage.getItem'), false)
  assert.equal(source.includes('ensureMediaFolders'), true)
})
