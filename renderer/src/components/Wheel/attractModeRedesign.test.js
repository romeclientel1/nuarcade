import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const attract = readFileSync(join(HERE, "AttractMode.jsx"), "utf8").replace(/\r\n/g, "\n")
const css = readFileSync(join(HERE, "AttractMode.module.css"), "utf8").replace(/\r\n/g, "\n")
const wheel = readFileSync(join(HERE, "Wheel.jsx"), "utf8").replace(/\r\n/g, "\n")
const wheelCss = readFileSync(join(HERE, "Wheel.module.css"), "utf8").replace(/\r\n/g, "\n")
const music = readFileSync(join(HERE, "../../hooks/useMusicPlayer.js"), "utf8").replace(/\r\n/g, "\n")
const browserLibrary = readFileSync(join(HERE, "../../hooks/useGameLibrary.js"), "utf8").replace(/\r\n/g, "\n")

test("idle entry preserves the configured timeout and excludes empty/launcher-only libraries", () => {
  assert.match(wheel, /const attractGames = useMemo\(\(\) => games\.filter\(game => !game\.isLauncher\)/)
  assert.match(wheel, /attractGames\.length > 0 &&\s*\n\s*!libraryEmpty/)
  assert.match(wheel, /const timeoutMs = \(config\?\.attractTimeout \|\| 120\) \* 1000/)
  assert.match(wheel, /idleTimer\.current = setTimeout\(beginAttractMode, timeoutMs\)/)
})

test("Attract cannot enter over Library destinations, tools, nested overlays, prompts, or operations", () => {
  const eligibility = wheel.slice(wheel.indexOf("const attractEligible ="), wheel.indexOf("attractEligibleRef.current"))
  for (const guard of [
    "!showDetail", "currentDestination == null", "!showAchievements", "!showCollections",
    "!showCoach", "!showOperator", "!showSort", "!showVirtualKeyboard", "!showSearch",
    "!consoleOpen", "!showRetroArchPopup", "!showExitPopup", "!exitConfirm", "!showKonami",
    "!needsControllerPrompt", "!launching",
  ]) assert.match(eligibility, new RegExp(guard.replace(/[?!.]/g, "\\$&")))
})

test("keyboard wake is capture-phase, consumed, and blocked again at Wheel's action handler", () => {
  assert.match(attract, /window\.addEventListener\("keydown", wakeFromKeyboard, true\)/)
  assert.match(attract, /event\.preventDefault\(\)[\s\S]*event\.stopPropagation\(\)[\s\S]*event\.stopImmediatePropagation/)
  assert.match(wheel, /if \(attractModeRef\.current\) \{\s*e\.preventDefault\(\)\s*e\.stopPropagation\(\)\s*return/)
  assert.doesNotMatch(attract, /onSelect|setShowDetail|launchGame|navigate\(/)
})

test("controller, click, and mouse movement are wake-only", () => {
  assert.match(attract, /confirm: wakeFromController/)
  assert.match(attract, /launch: wakeFromController/)
  assert.match(attract, /enabled: isActive/)
  assert.match(attract, /onClick=\{wakeFromPointer\}/)
  assert.match(attract, /onMouseMove=\{wakeFromPointer\}/)
  assert.match(wheel, /enabled: [^\n]*!attractMode/)
})

test("focus is captured before entry, moved into the semantic overlay, and restored exactly or to the selected game", () => {
  assert.match(wheel, /attractRestoreFocusRef\.current =[\s\S]*document\.activeElement/)
  assert.match(wheel, /captured\?\.isConnected && !captured\.disabled[\s\S]*selectedGameFocusRef\.current/)
  assert.match(attract, /overlayRef\.current\?\.focus\(\{ preventScroll: true \}\)/)
  assert.match(attract, /tabIndex=\{-1\}[\s\S]*role="region"[\s\S]*aria-label="Vespara Library discovery/)
  assert.match(wheel, /data-library-selected-game=\{index === selectedIndex \? "true"/)
  assert.match(wheelCss, /\.cardSlot:focus-visible/)
})

test("cycle pacing has a safe hold floor, a neutral interval, and complete timer cleanup", () => {
  assert.match(attract, /const MIN_CYCLE_MS = 6000/)
  assert.match(attract, /Math\.max\(\s*MIN_CYCLE_MS/)
  for (const phase of ["gateway", "resolving", "hold", "receding", "neutral"]) {
    assert.match(attract, new RegExp(`setPhase\\("${phase}"\\)`))
  }
  assert.match(attract, /timersRef\.current\.forEach\(clearTimeout\)/)
  assert.match(attract, /return \(\) => \{\s*cancelled = true\s*clearPhaseTimers\(\)/)
})

test("selection reshuffles after a pass, avoids an immediate boundary repeat, and does not mutate Library selection", () => {
  assert.match(attract, /function reshuffle\(items, avoidFirstKey\)/)
  assert.match(attract, /next\.length > 1 && gameKey\(next\[0\]\) === avoidFirstKey/)
  assert.match(attract, /if \(order\.length <= 1\) return/)
  assert.match(attract, /if \(indexRef\.current \+ 1 < order\.length\)/)
  assert.match(attract, /const next = reshuffle\(order, lastShownKeyRef\.current\)/)
  assert.doesNotMatch(attract, /setSelectedIndex|onSelect/)
  assert.doesNotMatch(wheel.slice(wheel.indexOf("<AttractMode"), wheel.indexOf("<div className={styles.globalHeader}")), /onSelect=/)
})

test("media resolution prefers real videoPath, then safe legacy video, hero, capsule, and truthful geometry", () => {
  assert.match(attract, /const videoUrl = game\.videoPath \|\| legacyVideo/)
  assert.match(attract, /const mediaKind = hasVideo \? "video" : heroUrl \? "hero" : capsuleUrl \? "capsule" : "none"/)
  assert.match(attract, /muted\s*\n\s*loop/)
  assert.match(attract, /className=\{styles\.archivalImage\}/)
  assert.match(attract, /className=\{styles\.noMediaGeometry\}/)
  assert.match(attract, /ARCHIVE RECORD/)
  assert.doesNotMatch(attract, /GENRE_COLORS|bgColor|capsuleFloat/)
})

test("portal identity removes generic arcade HUD language and keeps restrained Library context", () => {
  assert.match(attract, />FROM THE LIBRARY</)
  assert.match(attract, />ENTER THE LIBRARY</)
  assert.doesNotMatch(attract + css + wheelCss, /INSERT COIN|Press Any Button|Exit Attract Mode|@keyframes insertCoin/)
  assert.doesNotMatch(attract, /gameCount|currentVersion|dots|scanlines|Orbitron/)
})

test("Library architecture remains visible beneath a transparent portal and dormant controls are inert", () => {
  assert.doesNotMatch(css.match(/\.overlay\s*\{[\s\S]*?\}/)?.[0] || "", /background:\s*#000/)
  assert.match(wheel, /attractMode \? " " \+ styles\.attractDormant/)
  assert.match(wheelCss, /\.attractDormant \.libraryEnvironment[\s\S]*brightness\(0\.52\)/)
  assert.match(wheelCss, /\.attractDormant \.globalHeader[\s\S]*pointer-events: none/)
})

test("reduced motion removes portal transitions and continuous motion", () => {
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"))
  assert.match(reduced, /transition: none/)
  assert.match(reduced, /transform: none/)
  assert.doesNotMatch(css, /animation:|@keyframes/)
  assert.match(css, /@media \(max-width: 1280px\), \(max-height: 870px\)/)
})

test("dedicated ambience is local, uses shared mute/ambient volume, and Library music is suspended rather than restarted", () => {
  const hook = readFileSync(join(HERE, "useAttractAmbience.js"), "utf8")
  assert.match(hook, /import attractAmbient from "\.\/assets\/vespara-attract-ambient\.mp3"/)
  assert.match(attract, /enabled: attractConfig\.musicEnabled !== false/)
  assert.match(attract, /volume: attractConfig\.ambientVolume \?\? 35/)
  assert.match(wheel, /musicEnabled:\s+config\?\.musicEnabled !== false/)
  assert.match(wheel, /suspended: attractMode/)
  assert.match(music, /active\.pause\(\)/)
  assert.match(music, /if \(!active\.playing\(\)\) active\.play\(\)/)
  assert.doesNotMatch(music.slice(music.indexOf("Attract Mode temporarily owns"), music.indexOf("// If the native track list")), /playTrack\(/)
  assert.match(music, /wasSuspended &&[\s\S]*!suspended &&[\s\S]*!howlRef\.current[\s\S]*playTrack\(tracks\[idx\]\)/)
})

test("the authored MP3 exists without production browser fixtures or storage writes", () => {
  const asset = join(HERE, "assets/vespara-attract-ambient.mp3")
  assert.equal(existsSync(asset), true)
  assert.ok(statSync(asset).size > 500_000)
  assert.match(browserLibrary, /const SAMPLE_GAMES = \[\]/)
  assert.match(browserLibrary, /setGames\(\[\]\)\s*\n\s*setLibraryEmpty\(true\)/)
  assert.doesNotMatch(attract, /localStorage|sessionStorage|SAMPLE_GAMES/)
})
