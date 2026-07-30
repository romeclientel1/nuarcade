// layoutDiagnosticsMilestoneR9.test.js ---------------------------------------
//
// R9 diagnostic pass: after a packaged Windows PHOTO showed Depart's tile
// still visibly cropped at the physical screen edge, and this project's own
// source-level arithmetic model (sanctuaryPackagedLayoutMilestoneR6.test.js)
// could not explain the magnitude of that crop from source alone, this
// milestone adds OPT-IN runtime layout diagnostics (layoutDiagnostics.js,
// wired into VesparaHome.jsx) instead of another arithmetic guess. Per
// direction, the previously-applied R9 padding/test changes were reverted
// (see git history -- VesparaHome.module.css and
// sanctuaryPackagedLayoutMilestoneR6.test.js are back to their committed
// R5-R8 state); this file covers only the new diagnostics.
//
// This file is source-level for anything embedded in JSX (VesparaHome.jsx
// cannot be imported directly -- no jsdom/testing-library anywhere in this
// project) and genuinely executed for layoutDiagnostics.js itself, which is
// plain, importable JS with no JSX/React dependency -- so its logic (the
// disabled-by-default gate, the enabled measurement path, and the no-PII
// contract) is tested by real execution against constructed DOM-like
// fixtures, not just pattern-matched.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import {
  isLayoutDebugEnabled,
  logSanctuaryLayout,
  drawLayoutOutlines,
  clearLayoutOutlines,
  LOG_PREFIX,
} from "./layoutDiagnostics.js"

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (relPath) => readFileSync(join(HERE, relPath), "utf8").replace(/\r\n/g, "\n")
const jsx = read("VesparaHome.jsx")

// -- Fixture builders ---------------------------------------------------

function fakeRect({ left = 0, top = 0, width = 100, height = 50 } = {}) {
  return { left, top, right: left + width, bottom: top + height, width, height }
}

// Deliberately carries fields a REAL DOM element would have (textContent,
// innerText, dataset, value) so tests can prove layoutDiagnostics.js never
// reads them, even though they are present and "available" on the object.
function fakeElement(rectOverrides = {}, { gameDataMarker } = {}) {
  const rect = fakeRect(rectOverrides)
  return {
    getBoundingClientRect: () => rect,
    scrollWidth: rectOverrides.scrollWidth ?? rect.width,
    clientWidth: rectOverrides.clientWidth ?? rect.width,
    style: {},
    textContent: gameDataMarker,
    innerText: gameDataMarker,
    dataset: gameDataMarker ? { game: gameDataMarker } : undefined,
    value: gameDataMarker,
  }
}

function fakeElements(gameDataMarker) {
  return {
    home: fakeElement({ width: 1366, height: 768 }, { gameDataMarker }),
    sanctuary: fakeElement({ left: 64, top: 24, width: 1238, height: 720 }, { gameDataMarker }),
    actionRow: fakeElement({ left: 64, top: 500, width: 648, height: 84 }, { gameDataMarker }),
    tiles: {
      library: fakeElement({ left: 64, top: 500, width: 178 }, { gameDataMarker }),
      controlRoom: fakeElement({ left: 250, top: 500, width: 160 }, { gameDataMarker }),
      switchPlayer: fakeElement({ left: 418, top: 500, width: 155 }, { gameDataMarker }),
      depart: fakeElement({ left: 581, top: 500, width: 131 }, { gameDataMarker: gameDataMarker ? `${gameDataMarker}-depart` : undefined }),
    },
  }
}

function fakeComputedStyle() {
  return {
    gridTemplateColumns: "minmax(0, 1.8fr) minmax(0, 1.1fr) minmax(0, 0.9fr) minmax(0, 0.6fr)",
    gap: "8px",
    paddingLeft: "64px",
    paddingRight: "64px",
    transform: "none",
    overflow: "visible",
  }
}

function makeFakeNode(tag) {
  const node = {
    tagName: tag,
    style: {},
    children: [],
    appendChild(child) { node.children.push(child) },
    remove() { node.removed = true },
  }
  return node
}

function makeFakeDocument() {
  let outlineContainer = null
  const body = {
    appendChild(el) { outlineContainer = el },
  }
  return {
    createElement: (tag) => makeFakeNode(tag),
    getElementById: (id) => (id === "vespara-layout-debug-outlines" ? outlineContainer : null),
    get body() { return body },
    documentElement: { clientWidth: 1366, clientHeight: 768 },
  }
}

// Swaps globalThis.window/document for the duration of `fn`, always
// restoring the prior globals afterward (even if fn throws) -- mirrors the
// existing safeQuit() pattern in sanctuaryDepartMilestoneR5.test.js.
async function withFakeBrowserGlobals(flagValue, fn) {
  const priorWindow = globalThis.window
  const priorDocument = globalThis.document
  const store = { [Symbol.for("store")]: true }
  const localStorageValues = flagValue === undefined ? {} : { "vespara-layout-debug": flagValue }
  const fakeWindow = {
    innerWidth: 1366,
    innerHeight: 768,
    devicePixelRatio: 1,
    localStorage: {
      getItem: (key) => (key in localStorageValues ? localStorageValues[key] : null),
    },
    getComputedStyle: () => fakeComputedStyle(),
  }
  globalThis.window = fakeWindow
  globalThis.document = makeFakeDocument()
  try {
    await fn({ window: fakeWindow, document: globalThis.document })
  } finally {
    globalThis.window = priorWindow
    globalThis.document = priorDocument
  }
}

// -- 1. Disabled by default -----------------------------------------------

test("isLayoutDebugEnabled() is false with no window/localStorage at all (the real default before any DOM exists)", () => {
  const priorWindow = globalThis.window
  // eslint-disable-next-line no-undefined
  globalThis.window = undefined
  try {
    assert.equal(isLayoutDebugEnabled(), false)
  } finally {
    globalThis.window = priorWindow
  }
})

test("isLayoutDebugEnabled() is false when localStorage exists but the flag is unset -- the actual packaged-app default", async () => {
  await withFakeBrowserGlobals(undefined, () => {
    assert.equal(isLayoutDebugEnabled(), false)
  })
})

test("logSanctuaryLayout and drawLayoutOutlines are complete no-ops when disabled -- no console.log call, no DOM mutation", async () => {
  await withFakeBrowserGlobals(undefined, ({ document }) => {
    const priorLog = console.log
    let calls = 0
    console.log = () => { calls += 1 }
    try {
      logSanctuaryLayout("initial-render", fakeElements())
      drawLayoutOutlines(fakeElements())
    } finally {
      console.log = priorLog
    }
    assert.equal(calls, 0, "no console.log call should happen while diagnostics are disabled")
    assert.equal(document.getElementById("vespara-layout-debug-outlines"), null, "no outline container should be created while disabled")
  })
})

// -- 2. Enabling the flag activates measurement ---------------------------

test("setting the flag to \"1\" makes isLayoutDebugEnabled() true", async () => {
  await withFakeBrowserGlobals("1", () => {
    assert.equal(isLayoutDebugEnabled(), true)
  })
})

test("a non-\"1\" value (e.g. \"true\", \"0\", or any other string) does NOT enable diagnostics -- only the exact string \"1\" does", async () => {
  for (const value of ["true", "0", "yes", "TRUE", ""]) {
    // eslint-disable-next-line no-await-in-loop
    await withFakeBrowserGlobals(value, () => {
      assert.equal(isLayoutDebugEnabled(), false, `expected "${value}" to NOT enable diagnostics`)
    })
  }
})

test("when enabled, logSanctuaryLayout logs exactly once with the [sanctuary-layout] prefix and a JSON payload", async () => {
  await withFakeBrowserGlobals("1", () => {
    const priorLog = console.log
    const calls = []
    console.log = (...args) => { calls.push(args) }
    try {
      logSanctuaryLayout("initial-render", fakeElements())
    } finally {
      console.log = priorLog
    }
    assert.equal(calls.length, 1, "expected exactly one console.log call")
    assert.equal(calls[0][0], LOG_PREFIX)
    assert.equal(LOG_PREFIX, "[sanctuary-layout]")
    const payload = JSON.parse(calls[0][1])
    assert.equal(payload.stage, "initial-render")
    assert.equal(payload.window.innerWidth, 1366)
    assert.equal(payload.window.innerHeight, 768)
    assert.equal(payload.window.devicePixelRatio, 1)
    assert.equal(payload.documentElement.clientWidth, 1366)
    assert.equal(payload.documentElement.clientHeight, 768)
    assert.ok(payload.rects.home, "home rect present")
    assert.ok(payload.rects.sanctuary, "sanctuary rect present")
    assert.ok(payload.rects.actionRow, "actionRow rect present")
    assert.ok(payload.rects.tiles.library && payload.rects.tiles.controlRoom && payload.rects.tiles.switchPlayer && payload.rects.tiles.depart, "every destination tile rect present")
    assert.equal(payload.depart.left, 581)
    assert.equal(payload.depart.width, 131)
    assert.equal(payload.depart.right, 712)
    assert.equal(payload.computed.actionRowGridTemplateColumns, "minmax(0, 1.8fr) minmax(0, 1.1fr) minmax(0, 0.9fr) minmax(0, 0.6fr)")
    assert.equal(payload.computed.actionRowGap, "8px")
    assert.equal(payload.computed.sanctuaryPaddingLeft, "64px")
    assert.equal(payload.computed.sanctuaryPaddingRight, "64px")
    assert.equal(payload.computed.homeTransform, "none")
    assert.equal(payload.computed.homeOverflow, "visible")
    assert.ok(payload.scroll.home && payload.scroll.sanctuary && payload.scroll.actionRow, "scrollWidth/clientWidth present for home, sanctuary, and actionRow")
  })
})

test("when enabled, drawLayoutOutlines creates an outline box for home, sanctuary, actionRow, and every destination tile", async () => {
  await withFakeBrowserGlobals("1", ({ document }) => {
    drawLayoutOutlines(fakeElements())
    const container = document.getElementById("vespara-layout-debug-outlines")
    assert.ok(container, "outline container should be created once enabled")
    assert.equal(container.children.length, 7, "expected 7 outlined boxes: home, sanctuary, actionRow, and 4 destination tiles")
  })
})

test("clearLayoutOutlines removes the outline container", async () => {
  await withFakeBrowserGlobals("1", ({ document }) => {
    drawLayoutOutlines(fakeElements())
    const container = document.getElementById("vespara-layout-debug-outlines")
    assert.ok(container)
    clearLayoutOutlines()
    assert.equal(container.removed, true)
  })
})

// -- 3. No personal/game data is ever logged -------------------------------

test("logSanctuaryLayout never reads or logs textContent/innerText/dataset/value, even though real elements carry them -- game names, paths, and other content cannot reach the log", async () => {
  await withFakeBrowserGlobals("1", () => {
    const marker = "TOTALLY-SECRET-GAME-TITLE-AND-FILE-PATH-C:/Users/jerome/roms/foo.rom"
    const priorLog = console.log
    const calls = []
    console.log = (...args) => { calls.push(args) }
    try {
      logSanctuaryLayout("initial-render", fakeElements(marker))
    } finally {
      console.log = priorLog
    }
    const loggedString = JSON.stringify(calls)
    assert.doesNotMatch(loggedString, /TOTALLY-SECRET/, "the game/path marker must never appear in the logged payload")
    assert.doesNotMatch(loggedString, /roms|\.rom\b/i, "no file path fragment must appear in the logged payload")
  })
})

test("drawLayoutOutlines' generated labels contain only the fixed element name and its own numeric geometry, never element content", async () => {
  await withFakeBrowserGlobals("1", ({ document }) => {
    const marker = "SHOULD-NEVER-APPEAR-IN-ANY-LABEL"
    drawLayoutOutlines(fakeElements(marker))
    const container = document.getElementById("vespara-layout-debug-outlines")
    const allLabelText = container.children.map((box) => box.children[0]?.textContent || "").join(" | ")
    assert.doesNotMatch(allLabelText, /SHOULD-NEVER-APPEAR/, "outline labels must never include element content/data")
    assert.match(allLabelText, /\bdepart L:\d+ W:\d+ R:\d+\b/, "expected a depart label with its fixed name and numeric geometry")
  })
})

test("logSanctuaryLayout and drawLayoutOutlines never throw even if a measurement step fails (diagnostics must not crash the app)", async () => {
  await withFakeBrowserGlobals("1", () => {
    const broken = { getBoundingClientRect: () => { throw new Error("boom") } }
    assert.doesNotThrow(() => logSanctuaryLayout("initial-render", { home: broken, sanctuary: null, actionRow: null, tiles: {} }))
    assert.doesNotThrow(() => drawLayoutOutlines({ home: broken, sanctuary: null, actionRow: null, tiles: {} }))
  })
})

// =============================================================================
// -- 4. VesparaHome.jsx wiring (source-level) --------------------------------
// =============================================================================

test("VesparaHome.jsx imports the diagnostics module and does not import anything extra from it", () => {
  assert.match(jsx, /import \{ logSanctuaryLayout, drawLayoutOutlines, clearLayoutOutlines, isLayoutDebugEnabled \} from "\.\/layoutDiagnostics\.js"/)
})

test("home, sanctuary, and actionRow each gained a diagnostics ref without changing their className/structure -- no new elements, no new styling", () => {
  assert.match(jsx, /<div className=\{styles\.home\} ref=\{homeRef\}>/)
  assert.match(jsx, /<main className=\{styles\.sanctuary\} ref=\{sanctuaryRef\}>/)
  assert.match(jsx, /<div className=\{styles\.actionRow\} ref=\{actionRowRef\}>/)
})

test("the pre-existing Depart focus ref line is completely untouched by this diagnostic pass (still the exact literal from the R5 milestone)", () => {
  assert.match(jsx, /ref=\{action === "depart" \? departTriggerRef : undefined\}/)
})

test("all four required diagnostic trigger points are wired: initial render, document.fonts.ready, Recently Played rendering, and window resize", () => {
  assert.match(jsx, /requestAnimationFrame\(\(\) => runLayoutDiagnostics\("initial-render"\)\)/)
  assert.match(jsx, /document\.fonts\.ready\.then\(\(\) => \{\s*\n\s*if \(!cancelled\) runLayoutDiagnostics\("fonts-ready"\)/)
  assert.match(jsx, /if \(loading \|\| hasLoggedRecentlyPlayedRef\.current\) return[\s\S]{0,200}runLayoutDiagnostics\("recently-played"\)/)
  assert.match(jsx, /window\.addEventListener\("resize", onResize\)[\s\S]{0,50}return \(\) => \{\s*\n\s*window\.removeEventListener\("resize", onResize\)/)
})

test("the Recently Played diagnostic log fires only once per mount (guarded by a ref flag, not on every loading-state change)", () => {
  const block = jsx.slice(jsx.indexOf("hasLoggedRecentlyPlayedRef.current = true") - 100, jsx.indexOf("hasLoggedRecentlyPlayedRef.current = true") + 50)
  assert.match(block, /if \(loading \|\| hasLoggedRecentlyPlayedRef\.current\) return/)
  assert.match(block, /hasLoggedRecentlyPlayedRef\.current = true/)
})

test("diagnostics are gated behind isLayoutDebugEnabled() at the call site too, not only inside layoutDiagnostics.js (defense in depth, and avoids scheduling work at all when disabled)", () => {
  assert.match(jsx, /const runLayoutDiagnostics = useCallback\(\(stage\) => \{\s*\n\s*if \(!isLayoutDebugEnabled\(\)\) return/)
  assert.match(jsx, /if \(typeof window === "undefined" \|\| !isLayoutDebugEnabled\(\)\) return undefined/)
})

test("the outline overlay is cleared on unmount so it can never persist past this screen", () => {
  assert.match(jsx, /useEffect\(\(\) => \(\) => clearLayoutOutlines\(\), \[\]\)/)
})

test("this diagnostic pass does not touch the Remain/Depart confirmation dialog, the safe quit bridge, or Depart's own activation logic", () => {
  assert.match(jsx, /yesLabel=\{t\("depart\.depart"\)\}/)
  assert.match(jsx, /noLabel=\{t\("depart\.remain"\)\}/)
  assert.match(jsx, /window\.nuarcade\?\.quit\?\.\(\)\?\.catch\?\.\(\(\) => \{\}\)/)
  assert.match(jsx, /else if \(action === "depart"\) \{ setDepartChoice\(1\); setShowDepartConfirm\(true\) \}/)
})
