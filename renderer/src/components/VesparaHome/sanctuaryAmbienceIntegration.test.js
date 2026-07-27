import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, 'VesparaHome.jsx'), 'utf8').replace(/\r\n/g, '\n')
const hook = readFileSync(join(HERE, 'useSanctuaryAmbience.js'), 'utf8').replace(/\r\n/g, '\n')
const engine = readFileSync(join(HERE, 'sanctuaryAmbienceEngine.js'), 'utf8').replace(/\r\n/g, '\n')
const gatewayHook = readFileSync(join(HERE, '../PlayerSelect/useGatewayMusic.js'), 'utf8')
const packageJson = JSON.parse(readFileSync(join(HERE, '../../../package.json'), 'utf8'))
const viteConfig = readFileSync(join(HERE, '../../../vite.config.js'), 'utf8')
const ambiencePath = join(HERE, 'assets/sanctuary-ambience.mp3')

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

test('the approved Sanctuary ambience is a local imported production asset', () => {
  assert.match(hook, /import sanctuaryAmbienceAsset from '\.\/assets\/sanctuary-ambience\.mp3'/)
  assert.match(hook, /export const SANCTUARY_AMBIENCE_SRC = sanctuaryAmbienceAsset/)
  assert.doesNotMatch(hook + engine, /vespara-gateway-theme|https?:\/\/|data:audio|base64/i)
})

test('the ambience remains a standalone Vite asset rather than an inline payload', () => {
  const file = readFileSync(ambiencePath)
  assert.ok(file.length > 4096)
  assert.ok(file.subarray(0, 3).toString() === 'ID3' || (file[0] === 0xff && (file[1] & 0xe0) === 0xe0))
  assert.doesNotMatch(viteConfig, /assetsInlineLimit\s*:/)
  assert.equal(statSync(ambiencePath).size, 1441196)
})

test('Library, Control Room, and Switch Player initiate the non-blocking fade before unchanged route dispatch', () => {
  const block = jsx.slice(jsx.indexOf('const activateAction'), jsx.indexOf('const confirmDepart'))
  assert.match(block, /if \(action === "library" \|\| action === "controlRoom" \|\| action === "switchPlayer"\) fadeOutSanctuaryAmbience\(\)/)
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
  assert.match(jsx, /const declineDepart = useCallback\(\(\) => \{\s*sounds\.back\(\)\s*cancelDepart\(\)/)
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

// -- VES-R0-001 regression: Sanctuary ambience must silence for a real game
// launch (Recently Played and any future Home launch surface), not only for
// in-app navigation and Depart, and must come back once the external game
// exits -- without duplicating the ambience instance.

test('the hook exposes pauseForLaunch/resumeFromLaunch distinct from fadeOutAndStop', () => {
  assert.match(hook, /pauseForLaunch = useCallback\(\(\) => \{\s*controllerRef\.current\?\.pause\(\)/)
  assert.match(hook, /resumeFromLaunch = useCallback\(\(\) => \{/)
  assert.match(hook, /return \{ fadeOutAndStop, pauseForLaunch, resumeFromLaunch \}/)
})

test('resumeFromLaunch re-reads current config rather than reusing the mount-time value', () => {
  const resumeBlock = hook.slice(hook.indexOf('const resumeFromLaunch'), hook.indexOf('return { fadeOutAndStop'))
  assert.match(resumeBlock, /window\.nuarcade\?\.getConfig/)
  assert.match(resumeBlock, /cfg\?\.musicEnabled !== false/)
  assert.match(resumeBlock, /cfg\?\.ambientVolume \?\? cfg\?\.musicVolume \?\? 35/)
})

test('the engine exposes reversible pause/resume, separate from the permanent fadeOutAndStop/cleanup latch', () => {
  assert.match(engine, /function pause\(\) \{/)
  assert.match(engine, /function resume\(enabled, volumePercent\) \{/)
  assert.match(engine, /return \{ start, fadeOutAndStop, pause, resume, cleanup \}/)
  // pause()/resume() must never unload() the Howl instance -- only
  // fadeOutAndStop/cleanup are allowed to do that.
  const pauseBlock = engine.slice(engine.indexOf('function pause()'), engine.indexOf('function resume('))
  assert.doesNotMatch(pauseBlock, /\.unload\(\)/)
  const resumeBlock = engine.slice(engine.indexOf('function resume('), engine.indexOf('return { start,'))
  assert.doesNotMatch(resumeBlock, /\.unload\(\)/)
})

test("VesparaHome wires the shared useGameLauncher onLaunchStart/onReturn callbacks to pause/resume Sanctuary ambience, so every Home launch path (including Recently Played) is covered", () => {
  assert.match(jsx, /pauseForLaunch: pauseSanctuaryAmbienceForLaunch,\s*resumeFromLaunch: resumeSanctuaryAmbienceFromLaunch,/)
  const launcherBlock = jsx.slice(jsx.indexOf('} = useGameLauncher({'), jsx.indexOf('originDestination: "home"'))
  assert.match(launcherBlock, /onLaunchStart: pauseSanctuaryAmbienceForLaunch,/)
  assert.match(launcherBlock, /onReturn: resumeSanctuaryAmbienceFromLaunch,/)
  // The old comment claiming Home has "nothing equivalent" to Wheel's
  // background video must be gone -- it described the exact gap this
  // regression fix closes.
  assert.doesNotMatch(jsx, /Home\s*\n\s*\/\/ has nothing equivalent, so both are simply omitted\./)
})

test('Recently Played launches (click and gamepad/keyboard confirm) both go through the single launch() call this useGameLauncher instance owns, so neither path can bypass the ambience pause', () => {
  assert.match(jsx, /setRecentIndex\(i\); launch\(g\)/)
  const launchFocusedBlock = jsx.slice(jsx.indexOf('const launchFocused'), jsx.indexOf('const launchFocusedRef'))
  assert.match(launchFocusedBlock, /launch\(displayedRecentGames\[recentIndex\]\)/)
})
