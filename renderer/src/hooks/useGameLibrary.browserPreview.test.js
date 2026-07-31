import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(HERE, 'useGameLibrary.js'), 'utf8').replace(/\r\n/g, '\n')

function sliceBetween(startAnchor, endAnchor, label) {
  const start = source.indexOf(startAnchor)
  assert.notEqual(start, -1, `${label}: missing start anchor`)
  const end = source.indexOf(endAnchor, start)
  assert.notEqual(end, -1, `${label}: missing end anchor`)
  return source.slice(start, end)
}

test('the native win32 bridge continues through the existing scan path', () => {
  const nativeBranch = sliceBetween(
    "if (window.nuarcade && window.nuarcade.platform === 'win32') {",
    '} else {\n        // Browser-only visual preview:',
    'native bridge branch',
  )

  assert.match(nativeBranch, /const cfg = await window\.nuarcade\.getConfig\(\)/)
  assert.match(nativeBranch, /await window\.nuarcade\.scanGames\(/)
  assert.match(nativeBranch, /setLibraryEmpty\(libraryEmpty\)/)
  assert.match(nativeBranch, /setGames\(markedGames\)/)
})

test('a browser without the native bridge finishes with a truthful empty library', () => {
  const browserBranch = sliceBetween(
    '} else {\n        // Browser-only visual preview:',
    '      }\n    } catch (err) {',
    'browser preview branch',
  )

  assert.match(browserBranch, /setGames\(\[\]\)/)
  assert.match(browserBranch, /setLibraryEmpty\(true\)/)
  assert.match(browserBranch, /setStats\(\{ total: 0, visible: 0, hidden: 0, devMode: true \}\)/)
  assert.doesNotMatch(browserBranch, /localStorage\.setItem/)
  assert.doesNotMatch(browserBranch, /SAMPLE_GAMES|system:|artwork:|gamePath:/)
})

test('real native failures still use the existing error path and always finish loading', () => {
  const failurePath = sliceBetween(
    '    } catch (err) {',
    '  const toggleFavorite = (gameId) => {',
    'native failure path',
  )

  assert.match(failurePath, /setError\(err\.message\)/)
  assert.match(failurePath, /setGames\(\[\]\)/)
  assert.match(failurePath, /finally \{\s*setLoading\(false\)/)
  assert.doesNotMatch(failurePath, /setLibraryEmpty\(true\)/)
})

test('the browser fallback does not fabricate games or systems', () => {
  assert.match(source, /const SAMPLE_GAMES = \[\]/)
  const browserBranch = sliceBetween(
    '} else {\n        // Browser-only visual preview:',
    '      }\n    } catch (err) {',
    'browser preview branch',
  )
  assert.doesNotMatch(browserBranch, /push\(|concat\(|\.map\(|system|title|profile/)
})
