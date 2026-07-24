import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, 'VesparaHome.jsx'), 'utf8').replace(/\r\n/g, '\n')
const hook = readFileSync(join(HERE, 'useSanctuaryAmbience.js'), 'utf8').replace(/\r\n/g, '\n')
const engine = readFileSync(join(HERE, 'sanctuaryAmbienceEngine.js'), 'utf8').replace(/\r\n/g, '\n')
const gatewayHook = readFileSync(join(HERE, '../PlayerSelect/useGatewayMusic.js'), 'utf8')
const packageJson = JSON.parse(readFileSync(join(HERE, '../../../package.json'), 'utf8'))

test('Sanctuary Home mounts exactly one ambience hook independent of focus and selection state', () => {
  assert.equal((jsx.match(/useSanctuaryAmbience\(\)/g) || []).length, 1)
  const invocation = jsx.indexOf('useSanctuaryAmbience()')
  assert.ok(invocation > -1 && invocation < jsx.indexOf('const [focusZone'))
  assert.doesNotMatch(hook, /\[(?:[^\]]*focusZone|[^\]]*recentIndex|[^\]]*actionIndex)[^\]]*\]/)
})

test('the hook reuses Howler and the proven onload -> play, onplay -> fade lifecycle', () => {
  assert.match(hook, /import \{ Howl \} from 'howler'/)
  assert.match(engine, /onload:\s*\(\) => \{[\s\S]*howl\.play\(\)/)
  assert.match(engine, /onplay:\s*\(\) => \{[\s\S]*howl\.fade\(0, targetVolume, fadeInMs\)/)
  assert.doesNotMatch(engine.match(/onload:[\s\S]*?onplay:/)?.[0] || '', /\.fade\(/)
})

test('ambience uses existing music enablement and ambient/music volume preferences', () => {
  assert.match(hook, /cfg\?\.musicEnabled !== false/)
  assert.match(hook, /cfg\?\.ambientVolume \?\? cfg\?\.musicVolume \?\? 35/)
})

test('no unapproved audio is active: the explicit local-source handoff remains null', () => {
  assert.match(hook, /export const SANCTUARY_AMBIENCE_SRC = null/)
  assert.doesNotMatch(hook + engine, /vespara-gateway-theme|https?:\/\/|data:audio|base64/i)
})

test('Library and Switch Player initiate the non-blocking fade before unchanged route dispatch', () => {
  const block = jsx.slice(jsx.indexOf('const activateAction'), jsx.indexOf('const confirmDepart'))
  assert.match(block, /if \(action === "library" \|\| action === "switchPlayer"\) fadeOutSanctuaryAmbience\(\)/)
  assert.match(block, /runAction\(action\)/)
  assert.ok(block.indexOf('fadeOutSanctuaryAmbience()') < block.indexOf('runAction(action)'))
  assert.doesNotMatch(block, /await|setTimeout|Promise/)
})

test('confirmed Depart initiates fade before the existing quit bridge call', () => {
  const block = jsx.slice(jsx.indexOf('const confirmDepart'), jsx.indexOf('const launchFocused'))
  assert.match(block, /fadeOutSanctuaryAmbience\(\)/)
  assert.match(block, /window\.nuarcade\?\.quit\?\.\(\)/)
  assert.ok(block.indexOf('fadeOutSanctuaryAmbience()') < block.indexOf('window.nuarcade?.quit?.()'))
})

test('opening or cancelling Depart does not permanently silence a Sanctuary the Traveler remains in', () => {
  const runAction = jsx.slice(jsx.indexOf('const runAction'), jsx.indexOf('const activateAction'))
  assert.doesNotMatch(runAction, /fadeOutSanctuaryAmbience/)
  assert.match(jsx, /sounds\.back\(\); setShowDepartConfirm\(false\)/)
})

test('unmount cancels pending config start and cleans the controller', () => {
  assert.match(hook, /let cancelled = false/)
  assert.match(hook, /if \(!cancelled\) controller\.start\(enabled, volume\)/)
  assert.match(hook, /cancelled = true\s*\n\s*controller\.cleanup\(\)/)
})

test('load and play errors are explicit terminal cleanup paths', () => {
  assert.match(engine, /onloaderror:[\s\S]*terminateOnError/)
  assert.match(engine, /onplayerror:[\s\S]*terminateOnError/)
  assert.match(engine, /console\.warn\(`\[SanctuaryAmbience\]/)
  assert.match(engine, /active\?\.unload\(\)/)
})

test('the implementation introduces no second audio dependency or global audio object', () => {
  assert.equal(packageJson.dependencies.howler, '^2.2.4')
  assert.doesNotMatch(hook + engine, /new Audio\(|AudioContext|webkitAudioContext/)
})

test('existing UI-sound wiring remains unchanged and separate', () => {
  assert.match(jsx, /const sounds = useArcadeSounds\(\{ enabled: uiSoundsEnabled, volume: uiSoundVolume \}\)/)
  assert.match(jsx, /playLaunchSound: sounds\.launch/)
})

test('Traveler Recognition retains its own unchanged gateway hook contract', () => {
  assert.match(gatewayHook, /createGatewayMusicController/)
  assert.match(gatewayHook, /export function useGatewayMusic\(src\)/)
  assert.doesNotMatch(gatewayHook, /SanctuaryAmbience|sanctuary/i)
})
