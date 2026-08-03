const test = require('node:test')
const assert = require('node:assert/strict')
const { resolveMediaAsset, resolveMediaCategories } = require('./mediaResolution')

test('EmuMovies wins per category while scraped media fills missing categories', () => {
  const resolved = resolveMediaCategories({
    boxArt: { emuMovies: 'emu-box.png', scraped: 'scraped-box.png' },
    hero: { scraped: 'scraped-hero.png' },
    video: { emuMovies: 'emu.mp4', scraped: 'scraped.mp4' },
    logo: {},
  })
  assert.deepEqual(resolved, {
    boxArt: 'emu-box.png', hero: 'scraped-hero.png', video: 'emu.mp4', logo: null,
  })
})

test('existing user content is only a fallback and never displaces EmuMovies', () => {
  assert.equal(resolveMediaAsset({ existing: 'old.png', scraped: 'new.png' }), 'new.png')
  assert.equal(resolveMediaAsset({ existing: 'old.png', emuMovies: 'emu.png', scraped: 'new.png' }), 'emu.png')
})
