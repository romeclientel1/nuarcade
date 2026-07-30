// layoutDiagnostics.js -------------------------------------------------------
// Opt-in RUNTIME layout diagnostics for the Sanctuary Depart clipping
// investigation (R9 diagnostic pass).
//
// CONTEXT: a packaged Windows PHOTO showed Depart's tile still visibly
// cropped at the physical screen edge even though this project's own
// source-level arithmetic model (sanctuaryPackagedLayoutMilestoneR6.test.js)
// computed Depart's right edge at roughly 648px inside a 1366px viewport --
// over 700px of apparent margin. That gap between "the model says it fits
// comfortably" and "the photo shows it clipped at the extreme edge" cannot be
// resolved from source alone (this sandbox has no live renderer -- see that
// test file's evidence-tier note). This module exists to capture the ACTUAL
// runtime geometry from a real packaged build, so the next investigation
// pass has real numbers instead of another arithmetic estimate.
//
// DISABLED BY DEFAULT. Every exported function here is a no-op unless
// `localStorage.getItem("vespara-layout-debug") === "1"` -- checked fresh on
// every call (not cached at import time or module load), so a tester can
// flip the flag on/off via devtools without reloading twice, and normal
// players never pay for or see any of this.
//
// STRICT NO-PII / NO-GAME-DATA CONTRACT: every function below accepts only
// DOM element references and a fixed `stage` label string supplied by this
// project's own call sites (never arbitrary user-facing text). The
// measurement functions read ONLY geometry (getBoundingClientRect,
// scrollWidth/clientWidth) and a fixed allowlist of computed-style
// properties (grid-template-columns, gap, padding-left/right, transform,
// overflow) -- never textContent, innerText, innerHTML, value, or any DOM
// attribute that could carry a game name, file path, profile name, or
// token. There is no code path through which such data could reach these
// logs or the debug outlines.

const DEBUG_FLAG_KEY = "vespara-layout-debug"
export const LOG_PREFIX = "[sanctuary-layout]"
const OUTLINE_CONTAINER_ID = "vespara-layout-debug-outlines"

// -- Flag check ---------------------------------------------------------

export function isLayoutDebugEnabled() {
  try {
    return (
      typeof window !== "undefined"
      && typeof window.localStorage !== "undefined"
      && window.localStorage !== null
      && window.localStorage.getItem(DEBUG_FLAG_KEY) === "1"
    )
  } catch {
    // Some embedders (or a locked-down storage policy) throw on
    // localStorage access -- treat that as "disabled", never as a crash.
    return false
  }
}

// -- Geometry helpers (read-only; never touch textContent/innerHTML) ----

function round(n) {
  return Math.round(n * 100) / 100
}

function rectSnapshot(el) {
  if (!el || typeof el.getBoundingClientRect !== "function") return null
  const r = el.getBoundingClientRect()
  return {
    left: round(r.left), top: round(r.top), right: round(r.right), bottom: round(r.bottom),
    width: round(r.width), height: round(r.height),
  }
}

function scrollSnapshot(el) {
  if (!el) return null
  return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
}

function computedStyleOf(el) {
  if (!el || typeof window === "undefined" || typeof window.getComputedStyle !== "function") return null
  try {
    return window.getComputedStyle(el)
  } catch {
    return null
  }
}

// -- 1. Console measurement log ------------------------------------------
//
// elements: {
//   home, sanctuary, actionRow,
//   tiles: { library, controlRoom, switchPlayer, depart },
// }
// `stage` is one of "initial-render" | "fonts-ready" | "recently-played" |
// "resize" (fixed, internal labels -- see the call sites in VesparaHome.jsx;
// never derived from user/game data).

export function logSanctuaryLayout(stage, elements) {
  if (!isLayoutDebugEnabled()) return
  try {
    const { home, sanctuary, actionRow, tiles = {} } = elements || {}
    const departRect = rectSnapshot(tiles.depart)
    const actionRowCs = computedStyleOf(actionRow)
    const sanctuaryCs = computedStyleOf(sanctuary)
    const homeCs = computedStyleOf(home)

    const payload = {
      stage,
      timestamp: typeof Date !== "undefined" ? Date.now() : null,
      window: typeof window !== "undefined"
        ? { innerWidth: window.innerWidth, innerHeight: window.innerHeight, devicePixelRatio: window.devicePixelRatio }
        : null,
      documentElement: typeof document !== "undefined" && document.documentElement
        ? { clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight }
        : null,
      rects: {
        home: rectSnapshot(home),
        sanctuary: rectSnapshot(sanctuary),
        actionRow: rectSnapshot(actionRow),
        tiles: {
          library: rectSnapshot(tiles.library),
          controlRoom: rectSnapshot(tiles.controlRoom),
          switchPlayer: rectSnapshot(tiles.switchPlayer),
          depart: departRect,
        },
      },
      // Depart's own edges, called out explicitly per this investigation's
      // focus (also present in rects.tiles.depart above -- duplicated flat
      // here purely for at-a-glance readability in the console).
      depart: departRect ? {
        left: departRect.left, width: departRect.width, right: departRect.right,
        top: departRect.top, height: departRect.height, bottom: departRect.bottom,
      } : null,
      computed: {
        actionRowGridTemplateColumns: actionRowCs ? actionRowCs.gridTemplateColumns : null,
        actionRowGap: actionRowCs ? actionRowCs.gap : null,
        sanctuaryPaddingLeft: sanctuaryCs ? sanctuaryCs.paddingLeft : null,
        sanctuaryPaddingRight: sanctuaryCs ? sanctuaryCs.paddingRight : null,
        homeTransform: homeCs ? homeCs.transform : null,
        homeOverflow: homeCs ? homeCs.overflow : null,
        sanctuaryTransform: sanctuaryCs ? sanctuaryCs.transform : null,
        sanctuaryOverflow: sanctuaryCs ? sanctuaryCs.overflow : null,
        actionRowTransform: actionRowCs ? actionRowCs.transform : null,
        actionRowOverflow: actionRowCs ? actionRowCs.overflow : null,
      },
      scroll: {
        home: scrollSnapshot(home),
        sanctuary: scrollSnapshot(sanctuary),
        actionRow: scrollSnapshot(actionRow),
      },
    }
    // eslint-disable-next-line no-console -- this is the diagnostic's entire
    // point; gated behind isLayoutDebugEnabled() above.
    console.log(LOG_PREFIX, JSON.stringify(payload))
  } catch (err) {
    // Diagnostics must never crash the app they're diagnosing.
    // eslint-disable-next-line no-console
    console.log(LOG_PREFIX, "measurement failed:", err && err.message)
  }
}

// -- 2. Temporary visual outlines (opt-in only) --------------------------
//
// Draws fixed-position outline boxes with left/width/right labels over
// .home, .sanctuary, .actionRow, and every destination tile. Purely an
// overlay -- it never modifies the layout elements themselves (no class,
// style, or attribute is ever written to home/sanctuary/actionRow/tiles),
// so this cannot change real layout behavior, only render debug boxes on
// top of it.

export function drawLayoutOutlines(elements) {
  if (!isLayoutDebugEnabled()) return
  if (typeof document === "undefined" || typeof document.createElement !== "function") return
  try {
    let container = typeof document.getElementById === "function" ? document.getElementById(OUTLINE_CONTAINER_ID) : null
    if (!container) {
      container = document.createElement("div")
      container.id = OUTLINE_CONTAINER_ID
      Object.assign(container.style, {
        position: "fixed", inset: "0", zIndex: "999999", pointerEvents: "none",
      })
      if (document.body && typeof document.body.appendChild === "function") {
        document.body.appendChild(container)
      }
    }
    if (typeof container.replaceChildren === "function") {
      container.replaceChildren()
    } else {
      container.innerHTML = ""
    }

    const { home, sanctuary, actionRow, tiles = {} } = elements || {}
    const entries = [
      ["home", home], ["sanctuary", sanctuary], ["actionRow", actionRow],
      ["library", tiles.library], ["controlRoom", tiles.controlRoom],
      ["switchPlayer", tiles.switchPlayer], ["depart", tiles.depart],
    ]
    for (const [label, el] of entries) {
      if (!el || typeof el.getBoundingClientRect !== "function") continue
      const r = el.getBoundingClientRect()
      const box = document.createElement("div")
      Object.assign(box.style, {
        position: "fixed", left: `${r.left}px`, top: `${r.top}px`,
        width: `${r.width}px`, height: `${r.height}px`,
        outline: label === "depart" ? "2px solid #ff3b3b" : "1px dashed #4ad2ff",
        boxSizing: "border-box",
      })
      const tag = document.createElement("div")
      // Fixed, structurally-generated label text only (element name + its
      // own numeric geometry) -- never derived from game/app content.
      tag.textContent = `${label} L:${round(r.left)} W:${round(r.width)} R:${round(r.right)}`
      Object.assign(tag.style, {
        position: "absolute", top: "-16px", left: "0", fontSize: "10px",
        color: "#fff", background: "rgba(0,0,0,0.7)", padding: "1px 4px", whiteSpace: "nowrap",
      })
      box.appendChild(tag)
      container.appendChild(box)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(LOG_PREFIX, "outline draw failed:", err && err.message)
  }
}

export function clearLayoutOutlines() {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return
  const container = document.getElementById(OUTLINE_CONTAINER_ID)
  if (container && typeof container.remove === "function") container.remove()
}
