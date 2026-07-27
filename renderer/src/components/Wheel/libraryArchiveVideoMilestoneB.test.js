import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "Wheel.jsx"), "utf8").replace(/\r\n/g, "\n")
const css = readFileSync(join(HERE, "Wheel.module.css"), "utf8").replace(/\r\n/g, "\n")
const packageJson = readFileSync(join(HERE, "../../../package.json"), "utf8")
const asset = readFileSync(join(HERE, "assets/vespara-library-overlook.png"))

const asideStart = jsx.indexOf("<aside className={styles.previewReservation}")
const asideEnd = jsx.indexOf("</aside>", asideStart)
const archiveMarkup = jsx.slice(asideStart, asideEnd)

test("both gameplay video elements render inside the approved Archive View frame", () => {
  assert.ok(asideStart >= 0 && asideEnd > asideStart)
  assert.equal((archiveMarkup.match(/<video/g) || []).length, 2)
  assert.match(archiveMarkup, /ref=\{bgVideoARef\}/)
  assert.match(archiveMarkup, /ref=\{bgVideoBRef\}/)
})

test("no active fullscreen gameplay-video layer remains", () => {
  assert.equal((jsx.match(/<video/g) || []).length, 2)
  assert.equal((archiveMarkup.match(/<video/g) || []).length, 2)
  assert.doesNotMatch(css, /\.bgVideo\s*\{|\.bgVideoHidden\s*\{|\.stage \.bgVideo/)
})

test("the existing dual refs and A/B source states remain independently wired", () => {
  assert.match(jsx, /const bgVideoARef = useRef\(null\)/)
  assert.match(jsx, /const bgVideoBRef = useRef\(null\)/)
  assert.match(jsx, /const \[bgVideoA, setBgVideoA\] = useState\(null\)/)
  assert.match(jsx, /const \[bgVideoB, setBgVideoB\] = useState\(null\)/)
  assert.match(archiveMarkup, /src=\{bgVideoA\.source\}[\s\S]*?data-archive-request=\{bgVideoA\.requestId\}/)
  assert.match(archiveMarkup, /src=\{bgVideoB\.source\}[\s\S]*?data-archive-request=\{bgVideoB\.requestId\}/)
})

test("selection prepares only the inactive slot and does not activate it immediately", () => {
  const selectionEffect = jsx.slice(jsx.indexOf("// Prepare the selected game's video"), jsx.indexOf("// Assigning a source"))
  assert.match(selectionEffect, /const ARCHIVE_SELECTION_SETTLE_MS = 100|ARCHIVE_SELECTION_SETTLE_MS/)
  assert.match(selectionEffect, /bgSelectionTimerRef\.current = setTimeout\(\(\) => \{/)
  assert.match(selectionEffect, /const incomingSlot = activeSlot === 'a' \? 'b' : 'a'/)
  assert.match(selectionEffect, /incomingRef\.current\?\.pause\(\)/)
  assert.match(selectionEffect, /if \(incomingSlot === 'a'\) setBgVideoA\(incoming\)\s*else setBgVideoB\(incoming\)/)
  assert.doesNotMatch(selectionEffect, /setBgActive\(incomingSlot\)/)
})

test("the 80ms elastic overshoot cannot release or load Archive View media", () => {
  assert.match(jsx, /const ARCHIVE_SELECTION_SETTLE_MS = 100/)
  assert.match(jsx, /Waiting just past that visual spring prevents the transient card/)
  assert.match(jsx, /return \(\) => \{[\s\S]*?clearTimeout\(bgSelectionTimerRef\.current\)/)
})

test("incoming content takes ownership only after readiness and play acceptance", () => {
  const ready = jsx.slice(jsx.indexOf("const handleArchiveVideoReady"), jsx.indexOf("const [showVirtualKeyboard"))
  assert.match(archiveMarkup, /onCanPlay=\{\(\) => handleArchiveVideoReady\('a'/)
  assert.match(archiveMarkup, /onCanPlay=\{\(\) => handleArchiveVideoReady\('b'/)
  assert.match(ready, /Promise\.resolve\(element\.play\(\)\)\.then\(\(\) => \{/)
  assert.ok(ready.indexOf("Promise.resolve(element.play())") < ready.indexOf("setBgActive(slot)"))
})

test("outgoing content remains active until the incoming source is ready", () => {
  assert.match(jsx, /const outgoing = bgActiveRef\.current[\s\S]*?bgActiveRef\.current = slot[\s\S]*?setBgActive\(slot\)/)
  assert.match(css, /\.archiveVideo\s*\{[^}]*opacity:\s*0[^}]*transition:\s*opacity 0\.6s ease/s)
  assert.match(css, /\.archiveVideoActive\s*\{[^}]*opacity:\s*1/s)
})

test("only the chosen slot receives the active class after transition", () => {
  assert.match(archiveMarkup, /bgActive === 'a' \? styles\.archiveVideoActive : ''/)
  assert.match(archiveMarkup, /bgActive === 'b' \? styles\.archiveVideoActive : ''/)
  assert.doesNotMatch(css, /\.archiveVideo\s*\{[^}]*opacity:\s*1/s)
})

test("rapid selection cannot revive a stale load or play callback", () => {
  assert.match(jsx, /const bgRequestIdRef = useRef\(0\)/)
  assert.match(jsx, /const requestId = \+\+bgRequestIdRef\.current/)
  assert.match(jsx, /pending\.requestId !== requestId/)
  assert.match(jsx, /latest\.requestId !== requestId/)
  assert.match(jsx, /element\.dataset\.archiveRequest !== String\(requestId\)/)
})

test("the outgoing slot is paused and its source is released after the fade", () => {
  assert.match(jsx, /const ARCHIVE_VIDEO_FADE_MS = 600/)
  assert.match(jsx, /setTimeout\(\(\) => \{[\s\S]*?releaseArchiveVideoSlot\(outgoing\)[\s\S]*?\}, ARCHIVE_VIDEO_FADE_MS\)/)
  assert.match(jsx, /element\.pause\(\)[\s\S]*?element\.removeAttribute\('src'\)[\s\S]*?element\.load\(\)/)
})

test("unmount invalidates callbacks, pauses both elements, and releases both sources", () => {
  assert.match(jsx, /useEffect\(\(\) => \(\) => \{[\s\S]*?bgRequestIdRef\.current \+= 1[\s\S]*?bgPendingRef\.current = null[\s\S]*?clearTimeout\(bgSelectionTimerRef\.current\)[\s\S]*?releaseAllArchiveVideo\(false\)[\s\S]*?\}, \[releaseAllArchiveVideo\]\)/)
  assert.match(jsx, /releaseArchiveVideoSlot\('a', clearState\)[\s\S]*?releaseArchiveVideoSlot\('b', clearState\)/)
})

test("focus changes and ordinary rerenders do not restart video selection", () => {
  assert.match(jsx, /\}, \[current\?\.id, current\?\.profile, current\?\.videoPath\]\)/)
  const selectionEffect = jsx.slice(jsx.indexOf("// Prepare the selected game's video"), jsx.indexOf("// Assigning a source"))
  assert.doesNotMatch(selectionEffect, /focusZone|topMenuIdx|tabFocusIdx|barFocusIdx|selectedIndex/)
})

test("fallback artwork order is hero, screenshot, capsule or cover, then logo", () => {
  assert.match(jsx, /const previewStill =\s*currentArtwork\?\.hero \|\|\s*currentArtwork\?\.screenshot \|\|\s*current\?\.snapPath \|\|\s*currentArtwork\?\.capsule \|\|\s*current\?\.boxArtPath \|\|\s*currentArtwork\?\.logo \|\|\s*null/s)
  assert.ok(archiveMarkup.indexOf("previewStill") < archiveMarkup.indexOf("bgVideoA &&"))
})

test("missing video immediately releases old playback and leaves current artwork visible", () => {
  assert.match(jsx, /if \(!current \|\| !videoPath\) \{[\s\S]*?setBgActive\(null\)[\s\S]*?releaseAllArchiveVideo\(\)/)
})

test("failed incoming video falls back once without retrying or retaining the previous game", () => {
  assert.match(archiveMarkup, /onError=\{\(\) => handleArchiveVideoError\('a'/)
  assert.match(archiveMarkup, /onError=\{\(\) => handleArchiveVideoError\('b'/)
  assert.match(jsx, /if \(pending\?\.slot === slot && pending\.requestId === requestId\) \{[\s\S]*?bgRequestIdRef\.current \+= 1[\s\S]*?releaseAllArchiveVideo\(\)[\s\S]*?return/)
  assert.doesNotMatch(jsx, /retryArchive|setInterval\([^)]*video/i)
})

test("empty selection still renders the Vespara symbol fallback", () => {
  assert.match(archiveMarkup, /<img src=\{vesparaMicroMark\} alt="" \/>/)
  assert.match(archiveMarkup, /\{current\?\.title \|\| "VESPARA"\}/)
})

test("Archive View is decorative with no native controls or tab stop", () => {
  assert.match(archiveMarkup, /aria-hidden="true"/)
  assert.doesNotMatch(archiveMarkup, /\bcontrols\b|onClick=|<button/)
  assert.equal((archiveMarkup.match(/tabIndex=\{-1\}/g) || []).length, 2)
  assert.match(archiveMarkup, /<img src=\{previewStill\} alt=""/)
})

test("Archive View keeps a framed, centered lower-band geometry and framed cover crop (D4: moved further up/grown modestly to fully clear the viewport)", () => {
  assert.match(css, /\.previewReservation\s*\{[^}]*left:\s*50%[^}]*transform:\s*translateX\(-50%\)[^}]*z-index:\s*7[^}]*width:\s*clamp\(440px,\s*28\.1vw,\s*540px\)/s)
  assert.match(css, /\.previewScreen\s*\{[^}]*aspect-ratio:\s*16 \/ 9[^}]*overflow:\s*hidden/s)
  assert.match(css, /\.archiveVideo\s*\{[^}]*object-fit:\s*cover[^}]*pointer-events:\s*none/s)
})

test("compact layout keeps Return, the Vespara lockup, and Console/Welcome Back in separate global-header columns, with the local Library title in its own row below, without shrinking Return's text", () => {
  const compactStart = css.indexOf("@media (max-width: 1280px), (max-height: 870px)")
  const compact = css.slice(compactStart, css.indexOf("/* Restrained entrance", compactStart))
  // .stage .globalHeader (Return | lockup | Console+WelcomeBack) keeps its
  // desktop 3-column grid (minmax(0,1fr) auto minmax(0,1fr)) at every
  // width -- only its top offset and side padding change in compact.
  assert.match(compact, /\.stage \.globalHeader\s*\{[^}]*top:\s*12px[^}]*padding:\s*0 20px/s)
  assert.doesNotMatch(compact, /\.stage \.globalHeader\s*\{[^}]*grid-template-columns:/s)
  assert.match(css, /\.stage \.globalHeader\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto\s*minmax\(0,\s*1fr\)/s)
  // THE LIBRARY's own row (D3: full-width left+right, not a fixed
  // collection-column width) below the global header.
  assert.match(compact, /\.stage \.libraryTitleRow\s*\{[^}]*top:\s*60px[^}]*left:\s*22px[^}]*right:\s*22px/s)
  assert.match(compact, /\.stage \.returnHomeBtn\s*\{[^}]*width:\s*174px[^}]*height:\s*42px[^}]*min-height:\s*42px[^}]*padding:\s*6px 12px/s)
  assert.match(css, /\.stage \.returnHomeBtn\s*\{[^}]*font-size:\s*12px/s)
  assert.doesNotMatch(compact, /\.stage \.returnHomeBtn\s*\{[^}]*font-size:/s)
})

test("the approved environment remains primary and byte-for-byte unchanged", () => {
  assert.match(jsx, /import libraryEnvironment from "\.\/assets\/vespara-library-overlook\.png"/)
  assert.match(jsx, /className=\{styles\.libraryEnvironment\}/)
  assert.equal(
    createHash("sha256").update(asset).digest("hex"),
    "4def2a5ef4216235300553a50ea6f61ac4d777cda01f31a3318e3d4cf03b8860",
  )
})

test("launch, favorite, category, Return, Console, and Depart handlers remain present", () => {
  assert.match(jsx, /onClick=\{launchGame\} disabled=\{launching\}/)
  assert.match(jsx, /onClick=\{\(\) => toggleFavorite\(current\.id \|\| current\.profile\)\}/)
  assert.match(jsx, /onClick=\{\(\) => \{ setTabFocusIdx\(tabIdx\); setActiveCategory\(cat\) \}\}/)
  assert.match(jsx, /if \(onReturnHome\) onReturnHome\(\)/)
  assert.match(jsx, /onClick=\{\(\) => setConsoleOpen\(v => !v\)\}/)
  assert.match(jsx, /className=\{styles\.departReservation\}[\s\S]*?onClick=\{openDepart\}/)
})

test("volume, launch pause, and return resume policies remain intact", () => {
  assert.match(jsx, /\(config\?\.ambientVolume \?\? 35\) \/ 100/)
  assert.match(jsx, /bgVideoARef\.current\?\.pause\(\)[\s\S]*?bgVideoBRef\.current\?\.pause\(\)/)
  assert.match(jsx, /activeRef\?\.current\?\.play\(\)\.catch\(\(\) => \{\}\)/)
})

test("reduced motion removes the framed crossfade transition but keeps presentation visible", () => {
  const reducedBlocks = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/g) || []
  assert.ok(reducedBlocks.some(block => /\.archiveVideo/.test(block) && /transition:\s*none/.test(block)))
  assert.match(css, /\.archiveVideoActive\s*\{[^}]*opacity:\s*1/s)
})

test("Milestone B adds no dependency or remote/base64 media system", () => {
  assert.doesNotMatch(archiveMarkup, /https?:\/\/|data:video|base64|canvas|controls/)
  const pkg = JSON.parse(packageJson)
  assert.equal(pkg.dependencies?.playwright, undefined)
  assert.equal(pkg.dependencies?.videojs, undefined)
  assert.equal(pkg.dependencies?.hls, undefined)
})
