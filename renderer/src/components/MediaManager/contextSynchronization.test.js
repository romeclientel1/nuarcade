import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const mediaJsx = readFileSync(join(HERE, "MediaManager.jsx"), "utf8").replace(/\r\n/g, "\n")
const controlRoomJsx = readFileSync(join(HERE, "../ControlRoom/ControlRoom.jsx"), "utf8").replace(/\r\n/g, "\n")
const english = readFileSync(join(HERE, "../../i18n/en.js"), "utf8").replace(/\r\n/g, "\n")

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex)
  assert.ok(startIndex >= 0, `missing start anchor: ${start}`)
  assert.ok(endIndex > startIndex, `missing end anchor after ${start}: ${end}`)
  return source.slice(startIndex, endIndex)
}

function parseArchiveMediaStations() {
  const block = sliceBetween(controlRoomJsx, "const ARCHIVES_STATIONS", "// Media Manager owns")
  return [...block.matchAll(/\{ id: "([^"]+)", module: "media", tab: "([^"]+)"/g)]
    .map(([, id, tab]) => ({ id, tab }))
}

function parseContextLabelKeys() {
  const block = sliceBetween(controlRoomJsx, "const MEDIA_TAB_LABEL_KEYS", "// Contextual-return contract")
  return Object.fromEntries(
    [...block.matchAll(/^\s*(\w+): "([^"]+)",?$/gm)].map(([, tab, key]) => [tab, key]),
  )
}

function englishLabel(key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = english.match(new RegExp(`"${escaped}":\\s*"([^"]+)"`))
  assert.ok(match, `missing English label for ${key}`)
  return match[1]
}

const EXPECTED_STATIONS = [
  { id: "artwork", tab: "artwork", label: "Artwork" },
  { id: "videos", tab: "library", label: "Videos" },
  { id: "scraping", tab: "emumovies", label: "Scraping" },
  { id: "bezels", tab: "bezels", label: "Bezels" },
]

const EXPECTED_CONTEXTS = [
  { tab: "library", label: "Videos" },
  { tab: "artwork", label: "Artwork" },
  { tab: "emumovies", label: "Scraping" },
  { tab: "bezels", label: "Bezels" },
  { tab: "about", label: "About" },
]

test("Archives Wing stations retain their exact initial Media Manager tab and visible outer label", () => {
  const stations = parseArchiveMediaStations()
  const labelKeys = parseContextLabelKeys()

  assert.deepEqual(stations, EXPECTED_STATIONS.map(({ id, tab }) => ({ id, tab })))
  for (const expected of EXPECTED_STATIONS) {
    assert.equal(englishLabel(labelKeys[expected.tab]), expected.label)
  }

  assert.match(
    mediaJsx,
    /const \[tab, setTab\] = useState\(TABS\.includes\(initialTab\) \? initialTab : "library"\)/,
  )
  assert.match(
    controlRoomJsx,
    /initialTab=\{ARCHIVES_STATIONS\.find\(s => s\.id === activeStationId\)\?\.tab\}/,
  )
})

test("every user-visible internal tab selects itself and resolves the truthful outer Archives Wing label", () => {
  const labelKeys = parseContextLabelKeys()
  const tabList = sliceBetween(mediaJsx, '<div className={styles.tabs} role="tablist"', "</div>")

  for (const expected of EXPECTED_CONTEXTS) {
    const selected = new RegExp(`role="tab" aria-selected=\\{tab === "${expected.tab}"\\}`)
    const activation = new RegExp(`onClick=\\{\\(\\) => setTab\\("${expected.tab}"\\)\\}`)
    assert.match(tabList, selected, `${expected.tab} must expose its active state through aria-selected`)
    assert.match(tabList, activation, `${expected.tab} must update the shared active tab state`)
    assert.equal(englishLabel(labelKeys[expected.tab]), expected.label)
  }

  const outerFrame = sliceBetween(
    controlRoomJsx,
    '{activeModule === "media" && (',
    "{showDepart && (",
  )
  assert.match(outerFrame, /activeMediaTab && MEDIA_TAB_LABEL_KEYS\[activeMediaTab\]/)
  assert.match(outerFrame, /t\(MEDIA_TAB_LABEL_KEYS\[activeMediaTab\]\)/)
  assert.match(outerFrame, /onContextChange=\{setActiveMediaTab\}/)
})

test("Media Manager publishes one current semantic tab with no duplicate or stale context callback", () => {
  const contextEffect = sliceBetween(
    mediaJsx,
    "// Control Room renders the architectural frame outside this component",
    "  useOverlayGamepad({",
  )

  assert.match(contextEffect, /onContextChange\?\.\(tab\)/)
  assert.match(contextEffect, /\}, \[tab, onContextChange\]\)/)
  assert.equal((mediaJsx.match(/onContextChange\?\.\(tab\)/g) || []).length, 1)
  assert.doesNotMatch(contextEffect, /initialTab|setTab|addEventListener|window\.nuarcade|localStorage|sessionStorage/)

  // The context publisher is a React state effect, not a listener or
  // subscription, so it has no external resource requiring unmount cleanup.
  // Depending on `tab` makes each committed tab change emit its current value;
  // depending on the callback prevents a stale callback closure.
  assert.doesNotMatch(contextEffect, /addEventListener|subscribe|setInterval|setTimeout/)
})

test("internal tab changes are presentation-only and cannot mutate routing, persistence, or native state", () => {
  const tabList = sliceBetween(mediaJsx, '<div className={styles.tabs} role="tablist"', "</div>")
  const contextEffect = sliceBetween(
    mediaJsx,
    "// Control Room renders the architectural frame outside this component",
    "  useOverlayGamepad({",
  )
  const mediaFrame = sliceBetween(
    controlRoomJsx,
    '{activeModule === "media" && (',
    "{showDepart && (",
  )
  const presentationPath = tabList + contextEffect + mediaFrame

  assert.doesNotMatch(presentationPath, /setActiveStationId|setActiveModule|openStation|navigate|localStorage|sessionStorage|window\.nuarcade/)
  assert.match(mediaFrame, /onContextChange=\{setActiveMediaTab\}/)
  assert.doesNotMatch(mediaFrame, /onContextChange=\{setActiveStationId\}|onContextChange=\{openStation\}/)
})

test("closing after an internal tab change restores the original Archives station, not the selected tab", () => {
  const openStation = sliceBetween(controlRoomJsx, "const openStation = (station) => {", "  const closeStation")
  const closeStation = sliceBetween(controlRoomJsx, "const closeStation = () => {", "  const activateHeaderItem")

  assert.match(openStation, /restoreFocusRef\.current = \{ zone: "root", column: columnRef\.current \}/)
  assert.match(openStation, /setActiveStationId\(station\.id\)/)
  assert.match(openStation, /setActiveMediaTab\(station\.module === "media" \? station\.tab : null\)/)

  assert.match(closeStation, /const restore = restoreFocusRef\.current/)
  assert.match(closeStation, /setFocusZone\(restore\.zone\); setColumn\(restore\.column\)/)
  assert.match(closeStation, /setActiveMediaTab\(null\)/)
  assert.doesNotMatch(closeStation, /MEDIA_TAB_LABEL_KEYS|activeMediaTab|setArchivesIdx/)

  // The exact originating station index remains owned by archivesIdx; closing
  // only restores the captured zone/column, so the existing focus effect lands
  // back on that same station rather than interpreting an internal tab as one.
  assert.match(controlRoomJsx, /const \[archivesIdx, setArchivesIdx\] = useState\(0\)/)
  assert.match(
    controlRoomJsx,
    /const stationRefs = column === "systems" \? systemsBtnRef : archivesBtnRef/,
  )
  assert.match(
    controlRoomJsx,
    /const stationIndex = column === "systems" \? systemsIdx : archivesIdx/,
  )
  assert.match(controlRoomJsx, /stationRefs\.current\[stationIndex\]\?\.focus\(\)/)
})
