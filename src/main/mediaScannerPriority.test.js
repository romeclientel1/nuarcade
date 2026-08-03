const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { scanMedia } = require('./mediaScanner')

test('scanMedia resolves EmuMovies before scraped media per category', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nuarcade-media-'))
  fs.mkdirSync(path.join(root, 'PC', 'Images', 'Box Art'), { recursive: true })
  fs.mkdirSync(path.join(root, 'PC', 'Video'), { recursive: true })
  fs.mkdirSync(path.join(root, 'EmuMovies', 'PC', 'Box'), { recursive: true })
  fs.writeFileSync(path.join(root, 'PC', 'Images', 'Box Art', 'demo.png'), '')
  fs.writeFileSync(path.join(root, 'PC', 'Video', 'demo.mp4'), '')
  fs.writeFileSync(path.join(root, 'EmuMovies', 'PC', 'Box', 'demo.png'), '')
  const result = scanMedia([{ id: 'demo', title: 'Demo', emulator: 'PC' }], root)[0]
  assert.match(result.boxArtPath, /EmuMovies[\\/]PC[\\/]Box/)
  assert.match(result.videoPath, /PC[\\/]Video/)
})
