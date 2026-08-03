import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { resolveAttractMedia } from "./attractMediaResolution.js"

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

test("controller, click, mouse movement, and wheel input are wake-only", () => {
  assert.match(attract, /confirm: wakeFromController/)
  assert.match(attract, /launch: wakeFromController/)
  assert.match(attract, /enabled: isActive/)
  assert.match(attract, /onClick=\{wakeFromPointer\}/)
  assert.match(attract, /onMouseMove=\{wakeFromPointer\}/)
  assert.match(attract, /onWheel=\{wakeFromPointer\}/)
  assert.match(wheel, /enabled: [^\n]*!attractMode/)
})

test("genuine Library controller and mouse-wheel activity reset the idle window", () => {
  assert.match(wheel, /useGamepad\(\{\s*enabled: [^\n]*!attractMode[^\n]*,\s*activity: scheduleIdle,/)
  assert.match(wheel, /window\.addEventListener\("wheel", resetFromLibraryInput\)/)
  assert.match(wheel, /window\.removeEventListener\("wheel", resetFromLibraryInput\)/)
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

test("media resolution uses only real videoPath, then hero, capsule, and truthful geometry", () => {
  const media = readFileSync(join(HERE, "attractMediaResolution.js"), "utf8")
  assert.match(media, /const videoUrl = game\.videoPath \|\| null/)
  assert.doesNotMatch(attract + media, /F:\/Media\/Videos|legacyVideo/)
  assert.match(attract, /muted\s*\n\s*loop/)
  assert.match(attract, /className=\{styles\.archivalImage\}/)
  assert.match(attract, /className=\{styles\.noMediaGeometry\}/)
  assert.match(attract, /ARCHIVE RECORD/)
  assert.doesNotMatch(attract, /GENRE_COLORS|bgColor|capsuleFloat/)
})

test("reduced motion behavior suppresses video playback and resolves a truthful still", () => {
  const game = { videoPath: "game.mp4", heroPath: "hero.jpg", boxArtPath: "capsule.jpg" }
  assert.deepEqual(
    resolveAttractMedia({ game, reducedMotion: true }).mediaKind,
    "hero",
  )
  assert.equal(resolveAttractMedia({ game: { videoPath: "game.mp4" }, reducedMotion: true }).mediaKind, "none")
  assert.match(attract, /!videoRef\.current \|\| !isActive \|\| reducedMotion/)
  assert.match(attract, /mediaKind === "video"/)
})

test("failed portal media advances from video to hero to capsule to geometry", () => {
  const game = { videoPath: "game.mp4", heroPath: "hero.jpg", boxArtPath: "capsule.jpg" }
  assert.equal(resolveAttractMedia({ game }).mediaKind, "video")
  assert.equal(resolveAttractMedia({ game, errors: { video: true } }).mediaKind, "hero")
  assert.equal(resolveAttractMedia({ game, errors: { video: true, hero: true } }).mediaKind, "capsule")
  assert.equal(resolveAttractMedia({ game, errors: { video: true, hero: true, capsule: true } }).mediaKind, "none")
  assert.match(attract, /onError=\{\(\) => markMediaError\("hero"\)\}/)
  assert.match(attract, /onError=\{\(\) => markMediaError\("capsule"\)\}/)
})

test("the showcase keeps restrained discovery copy without generic arcade HUD language", () => {
  assert.match(attract, /<h1>\{game\.title\}<\/h1>/)
  assert.match(attract, /<p>\{reason\}<\/p>/)
  assert.match(attract, />ENTER THE LIBRARY</)
  assert.doesNotMatch(attract + css + wheelCss, /INSERT COIN|Press Any Button|Exit Attract Mode|@keyframes insertCoin/)
  assert.doesNotMatch(attract, /gameCount|currentVersion|dots|scanlines|Orbitron/)
})

test("the approved scene dominates while the mounted Library remains dormant and inert", () => {
  assert.match(attract, /className=\{styles\.sceneStack\}/)
  assert.match(css, /\.scene\s*\{[\s\S]*object-fit: cover/)
  assert.match(wheel, /attractMode \? " " \+ styles\.attractDormant/)
  assert.match(wheelCss, /\.attractDormant \.libraryEnvironment[\s\S]*brightness\(0\.52\)/)
  assert.match(wheelCss, /\.attractDormant \.globalHeader[\s\S]*pointer-events: none/)
})

test("scene plates use a non-overlapping 800ms out, hidden swap, and 800ms in sequence", () => {
  const transition = attract.slice(
    attract.indexOf("const startSceneTransition"),
    attract.indexOf("const clearShootingStarTimer"),
  )
  const fadeOutAt = transition.indexOf('setSceneTransitionPhase("fade-out")')
  const swapAt = transition.indexOf("advanceScene()", fadeOutAt)
  const hiddenAt = transition.indexOf('setSceneTransitionPhase("swap")', swapAt)
  const fadeInAt = transition.indexOf('setSceneTransitionPhase("fade-in")', hiddenAt)
  const idleAt = transition.indexOf('setSceneTransitionPhase("idle")', fadeInAt)

  assert.match(attract, /const SCENE_FADE_MS = 800/)
  assert.match(attract, /const SCENE_SWAP_HOLD_MS = 16/)
  assert.ok(fadeOutAt < swapAt && swapAt < hiddenAt && hiddenAt < fadeInAt && fadeInAt < idleAt)
  assert.match(attract, /sceneTransition !== "fade-out" \? styles\.sceneVisible/)
  assert.doesNotMatch(attract + css, /sceneActive|opacity 1600ms/)
})

test("outgoing scene is fully hidden before the index swap and incoming reveal", () => {
  const sceneRule = css.slice(css.indexOf(".scene {"), css.indexOf(".sceneVisible"))
  assert.match(sceneRule, /opacity: 0;/)
  assert.match(sceneRule, /transition: opacity 800ms ease-in-out;/)
  assert.doesNotMatch(sceneRule, /transform|filter|blur|scale|animation:/)
  assert.match(css, /\.sceneVisible \{ opacity: 1; \}/)
  assert.match(attract, /setTimeout\(\(\) => \{[\s\S]*advanceScene\(\)[\s\S]*setSceneTransitionPhase\("swap"\)[\s\S]*setTimeout\(\(\) => \{[\s\S]*setSceneTransitionPhase\("fade-in"\)/)
})

test("scene transitions cannot overlap and all transition callbacks are cancellable", () => {
  assert.match(attract, /sceneTransitionRef\.current !== "idle"\) return false/)
  assert.match(attract, /sceneTransitionTimersRef\.current\.forEach\(clearTimeout\)/)
  assert.match(attract, /if \(!activeSessionRef\.current \|\| !sceneSwapPendingRef\.current\) return/)
  assert.match(attract, /if \(!activeSessionRef\.current \|\| !sceneAdvancePendingRef\.current\) return/)
  assert.match(attract, /if \(!isActive\) \{[\s\S]*clearSceneTransition\(\)[\s\S]*return clearSceneTransition/)
  assert.match(attract, /return clearSceneTransitionTimers/)
})

test("reduced motion swaps scenes immediately without transition phases or pending timers", () => {
  const transition = attract.slice(
    attract.indexOf("const startSceneTransition"),
    attract.indexOf("const clearShootingStarTimer"),
  )
  assert.ok(transition.indexOf("if (reducedMotionRef.current)") < transition.indexOf("const swapTimer = setTimeout"))
  assert.match(transition, /if \(reducedMotionRef\.current\) \{\s*advanceScene\(\)\s*return true/)
  assert.match(attract, /if \(reducedMotion\) \{\s*const shouldAdvance = sceneSwapPendingRef\.current\s*clearSceneTransition\(\)\s*if \(shouldAdvance\) advanceScene\(\)/)
  assert.match(css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)")), /\.scene,[\s\S]*transition: none;/)
})

test("the teal-black dip stays below a continuous atmospheric sibling", () => {
  const sceneStackAt = attract.indexOf('className={styles.sceneStack}')
  const atmosphereAt = attract.indexOf('className={styles.atmosphere}')
  const sceneStackRuleAt = css.indexOf(".sceneStack {")
  const sceneStackRule = css.slice(sceneStackRuleAt, css.indexOf("\n.scene {", sceneStackRuleAt))
  assert.ok(sceneStackAt < atmosphereAt)
  assert.match(sceneStackRule, /background: #03100e;/)
  assert.doesNotMatch(attract.slice(sceneStackAt, atmosphereAt), /className=\{styles\.atmosphere\}/)
  assert.equal((attract.match(/className=\{styles\.atmosphere\}/g) || []).length, 1)
})

test("reduced motion removes portal transitions and continuous motion", () => {
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"))
  assert.match(reduced, /transition: none/)
  assert.match(reduced, /transform: none/)
  assert.doesNotMatch(css, /\.scene\s*\{[^}]*animation:/)
  assert.match(css, /@media \(max-width: 1280px\), \(max-height: 870px\)/)
})

test("restrained atmosphere is inert, scene-scoped, and layered below all portal UI", () => {
  const sceneStackAt = attract.indexOf('className={styles.sceneStack}')
  const atmosphereAt = attract.indexOf('className={styles.atmosphere}')
  const portalAt = attract.indexOf('className={styles.portalStage}')
  const invitationAt = attract.indexOf('className={styles.invitation}')
  assert.ok(sceneStackAt < atmosphereAt && atmosphereAt < portalAt && portalAt < invitationAt)
  assert.match(attract, /data-scene=\{ATTRACT_SCENES\[sceneIndex\]\.id\}/)
  assert.match(attract, /className=\{styles\.atmosphere\} aria-hidden="true"/)
  assert.match(css, /\.atmosphere\s*\{[\s\S]*?z-index: -2;[\s\S]*?pointer-events: none;/)
  for (const id of ["open-sky", "ocean-overlook", "village"]) {
    assert.match(css, new RegExp(`data-scene="${id}"`))
  }
  assert.doesNotMatch(css, /data-scene="(?:coliseum|palace|sunset-isle)"/)
})

test("atmosphere never animates scene images, portal content, or baked-text UI", () => {
  const animationRules = [...css.matchAll(/([^{}]+)\{[^{}]*animation:\s*vespara[^;}]+[;}]/g)]
    .map((match) => match[1])
    .join("\n")
  assert.doesNotMatch(animationRules, /\.scene(?:Active)?|\.portalStage|\.portalFrame|\.discoveryCopy|\.invitation/)
  assert.doesNotMatch(css, /\.scene\s*\{[^}]*animation:/)
  assert.doesNotMatch(css, /mix-blend-mode|background-position[^:]*:/)
  assert.doesNotMatch(attract, /<canvas|webgl|getContext\(/i)
  const atmosphereMarkup = attract.slice(
    attract.indexOf("<div className={styles.atmosphere}"),
    attract.indexOf("<div className={styles.portalStage}"),
  )
  assert.doesNotMatch(atmosphereMarkup, /<video/)
})

test("atmospheric keyframes animate only transform and opacity within restrained bounds", () => {
  for (const name of ["vesparaSkyDrift", "vesparaLightShimmer", "vesparaShootingStar"]) {
    const start = css.indexOf(`@keyframes ${name}`)
    const nextRule = css.indexOf("\n}\n", start)
    const keyframes = css.slice(start, nextRule + 3)
    assert.match(keyframes, /opacity/)
    assert.doesNotMatch(keyframes, /filter|background-position|width|height|\btop\b|\bleft\b/)
  }
  assert.match(css, /animation: vesparaSkyDrift 84s[^;]*alternate/)
  assert.match(css, /translate3d\(-1\.6vw, -0\.2vh[\s\S]*translate3d\(1\.6vw, 0\.2vh/)
  assert.match(css, /animation: vesparaLightShimmer 16s[^;]*alternate/)
  assert.match(css, /animation: vesparaShootingStar 1100ms/)
  assert.match(css, /width: 120px/)
  assert.match(css, /opacity: 0\.36/)
  assert.match(css, /translate3d\(-18vw, 0\.35vh/)
})

test("shooting star keeps one randomized delay and one scheduling gate per activation", () => {
  assert.match(attract, /SHOOTING_STAR_MIN_DELAY_MS = 28000/)
  assert.match(attract, /SHOOTING_STAR_DELAY_RANGE_MS = 27000/)
  assert.match(attract, /if \(shootingStarScheduledRef\.current\) return clearPendingShootingStar/)
  assert.match(attract, /shootingStarScheduledRef\.current = true/)
  assert.equal((attract.match(/shootingStarTimerRef\.current = setTimeout/g) || []).length, 1)
  assert.doesNotMatch(attract, /setInterval/)
})

test("timer expiry arms the star and triggers immediately on a supported scene", () => {
  assert.match(attract, /shootingStarTimerRef\.current = setTimeout\(\(\) => \{[\s\S]*shootingStarArmedRef\.current = true[\s\S]*triggerArmedShootingStar\(\)/)
  assert.match(attract, /!ATMOSPHERIC_SCENES\.has\(sceneIdRef\.current\)[\s\S]*\) return false/)
  assert.match(attract, /shootingStarArmedRef\.current = false[\s\S]*shootingStarFiredRef\.current = true[\s\S]*setShootingStarActive\(true\)/)
})

test("unsupported expiry stays armed until the next supported scene", () => {
  const trigger = attract.slice(
    attract.indexOf("const triggerArmedShootingStar"),
    attract.indexOf("// The randomized delay arms"),
  )
  assert.ok(trigger.indexOf("!ATMOSPHERIC_SCENES.has(sceneIdRef.current)") < trigger.indexOf("shootingStarArmedRef.current = false"))
  assert.doesNotMatch(trigger.slice(0, trigger.indexOf("shootingStarArmedRef.current = false")), /shootingStarArmedRef\.current = false/)
  assert.match(attract, /useEffect\(\(\) => \{\s*if \(isActive && !reducedMotion\) triggerArmedShootingStar\(\)\s*\}, \[sceneIndex,/)
})

test("shooting star cannot fire more than once per activation", () => {
  assert.match(attract, /\|\| shootingStarFiredRef\.current/)
  assert.match(attract, /shootingStarFiredRef\.current = true/)
  assert.match(attract, /if \(!isActive\)[\s\S]*shootingStarFiredRef\.current = false/)
})

test("deactivation and cleanup clear both the timer and armed event", () => {
  assert.match(attract, /const clearPendingShootingStar = useCallback\(\(\) => \{\s*clearShootingStarTimer\(\)\s*shootingStarArmedRef\.current = false/)
  assert.match(attract, /if \(!isActive\)[\s\S]*shootingStarScheduledRef\.current = false/)
  assert.match(attract, /if \(!isActive\)[\s\S]*clearPendingShootingStar\(\)[\s\S]*return clearPendingShootingStar/)
  assert.match(attract, /return clearPendingShootingStar/)
})

test("reduced motion prevents scheduling and clears pending or armed star state", () => {
  assert.match(attract, /if \(reducedMotion \|\| shuffled\.length === 0\)[\s\S]*clearPendingShootingStar\(\)[\s\S]*setShootingStarActive\(false\)/)
  assert.ok(attract.indexOf("if (reducedMotion || shuffled.length === 0)") < attract.indexOf("shootingStarTimerRef.current = setTimeout"))
  assert.match(attract, /!reducedMotion && ATMOSPHERIC_SCENES\.has/)
})

test("unmount cleanup cancels a late timeout and discards an armed event", () => {
  assert.match(attract, /return clearPendingShootingStar\s*\n\s*\}, \[/)
  assert.match(attract, /clearTimeout\(shootingStarTimerRef\.current\)/)
  assert.match(attract, /shootingStarTimerRef\.current = null/)
})

test("reduced-motion fallback hides and disables every atmospheric effect", () => {
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"))
  for (const selector of [".atmosphere", ".skyDrift", ".lightShimmer", ".shootingStar", ".shootingStarActive"]) {
    assert.match(reduced, new RegExp(selector.replace(".", "\\.")))
  }
  assert.match(reduced, /display: none;[\s\S]*animation: none;[\s\S]*opacity: 0;/)
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
