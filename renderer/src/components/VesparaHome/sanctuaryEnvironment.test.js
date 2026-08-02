import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, 'VesparaHome.jsx'), 'utf8').replace(/\r\n/g, '\n')
const css = readFileSync(join(HERE, 'VesparaHome.module.css'), 'utf8').replace(/\r\n/g, '\n')
const provenance = readFileSync(join(HERE, 'assets/README.md'), 'utf8')
const platePath = join(HERE, 'assets/sanctuary-sunset-archway.png')
const APPROVED_PLATE_SHA256 = '33ce9fe6d750bdb6f8a61e6750ccde4fcd8a5d12ed29fb54035599a854d96a75'

test('Sanctuary Home imports and renders the local architectural environment plate', () => {
  assert.match(jsx, /import sanctuaryBackground from "\.\/assets\/sanctuary-sunset-archway\.png"/)
  assert.match(jsx, /import sanctuaryArrivalHall from "\.\/assets\/sanctuary-arrival-hall\.png"/)
  assert.match(jsx, /<img\s+src=\{sanctuaryBackground\}[\s\S]*className=\{styles\.sanctuaryPlate\}/)
  assert.equal(existsSync(platePath), true)
})

test('the production plate preserves the approved 1672x941 PNG bytes', () => {
  const png = readFileSync(platePath)
  assert.equal(png.subarray(1, 4).toString(), 'PNG')
  assert.equal(png.readUInt32BE(16), 1672)
  assert.equal(png.readUInt32BE(20), 941)
  assert.equal(createHash('sha256').update(png).digest('hex'), APPROVED_PLATE_SHA256)
})

test('the environment is local and contains no source-code remote image or base64 path', () => {
  const environmentImports = jsx.match(/import .* from "\.\/assets\/[^"]+"/g)?.join('\n') || ''
  assert.doesNotMatch(environmentImports, /https?:\/\/|data:image|base64/i)
  assert.doesNotMatch(css, /url\(\s*["']?(?:https?:|data:)/i)
})

test('the plate remains decorative, aria-hidden, and non-interactive', () => {
  const world = jsx.slice(jsx.indexOf('<div className={styles.worldLayer}'), jsx.indexOf('<main className={styles.sanctuary}>'))
  const worldRule = css.match(/\.worldLayer\s*\{([^}]*)\}/)?.[1] || ''
  const sanctuaryRule = css.match(/\.sanctuary\s*\{([^}]*)\}/)?.[1] || ''
  assert.match(world, /aria-hidden="true"/)
  assert.match(world, /alt=""/)
  assert.match(css, /\.worldLayer,\s*\n\.sanctuaryPlate,\s*\n\.environmentVeil\s*\{[\s\S]*pointer-events:\s*none/)
  assert.match(worldRule, /z-index:\s*0/)
  assert.doesNotMatch(worldRule, /z-index:\s*-/)
  assert.match(sanctuaryRule, /z-index:\s*1/)
})

test('the environment is a responsive cover plate with no blur reducing architectural detail', () => {
  const rule = css.match(/\.sanctuaryPlate\s*\{([^}]*)\}/)?.[1] || ''
  assert.match(rule, /width:\s*100%/)
  assert.match(rule, /height:\s*100%/)
  assert.match(rule, /object-fit:\s*cover/)
  assert.doesNotMatch(rule, /blur\(/)
})

test('the contrast veil is a separate decorative layer, never baked UI', () => {
  assert.match(jsx, /<div className=\{styles\.environmentVeil\} \/>/)
  assert.match(css, /\.environmentVeil\s*\{[\s\S]*linear-gradient/)
  assert.match(provenance, /No live UI, game cards, buttons/)
})

test('the old abstract star, planet, sun, and moon layers are no longer active or retained', () => {
  assert.doesNotMatch(jsx, /starFieldAsset|planetAsset|sunAsset|moonAsset/)
  assert.doesNotMatch(jsx, /styles\.(?:deepField|starField|planetDisc|sunDisc|moonDisc|distantCrown|horizonGlow)/)
  for (const name of ['starField.svg', 'planet.svg', 'sun.svg', 'moon.svg']) {
    assert.equal(existsSync(join(HERE, 'assets', name)), false)
  }
})

test('the background contains no baked interface and all identity/actions remain live DOM', () => {
  assert.match(provenance, /No live UI, game cards, buttons,[\s\S]*readable text/)
  assert.match(jsx, /<div className=\{styles\.worldName\}>\{t\("home\.worldName"\)\}<\/div>/)
  assert.match(jsx, /\{displayedRecentGames\.map\(\(g, i\) => \{/)
  assert.match(jsx, /\{ACTIONS\.map\(\(action, i\) => \{/)
})

test('ACTIONS order and the existing runAction route handlers remain unchanged, plus the Control Room destination Milestone C2 added', () => {
  assert.match(jsx, /const ACTIONS = \["library", "controlRoom", "switchPlayer", "depart"\]/)
  assert.match(jsx, /if \(action === "library"\) onEnterLibrary\?\.\(\)/)
  assert.match(jsx, /else if \(action === "controlRoom"\) onEnterControlRoom\?\.\(\)/)
  assert.match(jsx, /else if \(action === "switchPlayer"\) onSwitchPlayer\?\.\(\)/)
  assert.match(jsx, /else if \(action === "depart"\) \{ setDepartChoice\(1\); setShowDepartConfirm\(true\) \}/)
})

test('Recently Played content, order, and direct-launch handler remain intact', () => {
  assert.match(jsx, /const displayedRecentGames = useMemo\(\s*\(\) => validRecentGames\.slice\(0, RECENT_LIMIT\)/)
  assert.match(jsx, /\{displayedRecentGames\.map\(\(g, i\) => \{/)
  assert.match(jsx, /onClick=\{\(\) => \{ acceptManualFocus\(\); setFocusZone\("recents"\); setRecentIndex\(i\); launch\(g\) \}\}/)
})

test('profile identity, loading, and empty-state rendering remain live and unchanged', () => {
  assert.match(jsx, /const playerName = activeProfile \? activeProfile\.name : t\("common\.guest"\)/)
  assert.match(jsx, /<div className=\{styles\.welcome\}>\{welcomeText\}<\/div>/)
  assert.match(jsx, /\{loading \? \(/)
  assert.match(jsx, /!hasRecents \? \(/)
})

test('gold edging is restrained and limited to world/place/destination language', () => {
  for (const selector of ['worldName', 'worldPlace', 'sectionTitle', 'destinationName']) {
    const rule = css.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`))?.[1] || ''
    assert.match(rule, /-webkit-text-stroke:\s*0\.(?:55|6|7)px\s+rgba\(214, 178, 116/)
    assert.match(rule, /paint-order:\s*stroke fill/)
  }
})

test('game-card titles and metadata receive no gold stroke', () => {
  for (const selector of ['recentTitle', 'recentSystem', 'memoryIndex', 'destinationDetail']) {
    const rule = css.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`))?.[1] || ''
    assert.doesNotMatch(rule, /text-stroke/)
  }
})

test('focus, selected state, couch-distance sizing, and reduced motion remain intact', () => {
  assert.match(css, /\.recentCard\.focused,\s*\n\.recentCard:focus-visible/)
  assert.match(css, /\.actionBtn\.focused,\s*\n\.actionBtn:focus-visible/)
  assert.match(css, /\.worldName\s*\{[\s\S]*font-size:\s*clamp\(28px,\s*3\.8vw,\s*54px\)/)
  assert.match(css, /\.libraryDestination \.destinationName\s*\{[\s\S]*font-size:\s*clamp\(19px,\s*2vw,\s*30px\)/)
  const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
  assert.match(reduced, /\.home/)
  assert.match(reduced, /animation:\s*none/)
  assert.doesNotMatch(reduced, /outline:\s*none|box-shadow:\s*none/)
})
