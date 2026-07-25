import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const wheel = readFileSync(join(HERE, "Wheel.jsx"), "utf8").replace(/\r\n/g, "\n")
const wheelCss = readFileSync(join(HERE, "Wheel.module.css"), "utf8").replace(/\r\n/g, "\n")
const home = readFileSync(join(HERE, "../VesparaHome/VesparaHome.jsx"), "utf8").replace(/\r\n/g, "\n")
const homeCss = readFileSync(join(HERE, "../VesparaHome/VesparaHome.module.css"), "utf8").replace(/\r\n/g, "\n")
const dialog = readFileSync(join(HERE, "../Depart/DepartConfirmation.jsx"), "utf8").replace(/\r\n/g, "\n")
const dialogCss = readFileSync(join(HERE, "../Depart/DepartConfirmation.module.css"), "utf8").replace(/\r\n/g, "\n")
const gamepad = readFileSync(join(HERE, "../../hooks/useGamepad.js"), "utf8")
const overlayGamepad = readFileSync(join(HERE, "../../hooks/useOverlayGamepad.js"), "utf8")
const en = readFileSync(join(HERE, "../../i18n/en.js"), "utf8")
const es = readFileSync(join(HERE, "../../i18n/es.js"), "utf8")

test("Sanctuary and Library share one localized Depart confirmation component", () => {
  assert.match(home, /import DepartConfirmation from "\.\.\/Depart\/DepartConfirmation\.jsx"/)
  assert.match(wheel, /import DepartConfirmation from "\.\.\/Depart\/DepartConfirmation\.jsx"/)
  assert.equal((home.match(/<DepartConfirmation/g) || []).length, 1)
  assert.equal((wheel.match(/<DepartConfirmation/g) || []).length, 1)
  assert.doesNotMatch(wheel, /EXIT VESPARA\?|styles\.exitBtn/)
})

test("all production Library destinations keep a visible fixed Depart control", () => {
  const audited = [
    "showDetail",
    'currentDestination === "help"',
    'currentDestination === "stats"',
    "showAchievements",
    "showCollections",
    "showSettings",
    "showMediaManager",
    "showCoach",
    "showOperator",
    "!!needsControllerPrompt",
  ]
  const auditBlock = wheel.slice(wheel.indexOf("const departOverlayActive"), wheel.indexOf("const showUniversalDepart"))
  for (const destination of audited) assert.match(auditBlock, new RegExp(destination.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.match(wheel, /const showUniversalDepart = !showExitPopup && \(departOverlayActive \|\| !consoleVisible\)/)
  assert.match(wheel, /\{showUniversalDepart && \(\s*<button[\s\S]*?className=\{styles\.departReservation\}/)
  assert.match(wheelCss, /\.departReservation\s*\{[^}]*position:\s*fixed[^}]*z-index:\s*900/s)
})

test("Library Console exposes Depart without a duplicate software-style Exit control", () => {
  assert.match(wheel, /\{!departOverlayActive && \(\s*<button[\s\S]*?className=\{styles\.consoleDepartBtn[\s\S]*?onClick=\{openDepart\}[\s\S]*?\{t\("wheel\.depart"\)\}/)
  assert.doesNotMatch(wheel, /className=\{styles\.exitBtn/)
  assert.match(wheelCss, /\.consoleDepartBtn\s*\{[^}]*rgba\(214,\s*178,\s*116[^}]*"Times New Roman"/s)
  assert.doesNotMatch(wheelCss, /\.consoleDepartBtn\s*\{[^}]*255,\s*80,\s*80/s)
})

test("all Depart entry points converge on the same safe confirmation and existing quit bridge", () => {
  assert.match(wheel, /const openDepart = useCallback\([\s\S]*?setExitChoice\(1\)[\s\S]*?setShowExitPopup\(true\)/)
  assert.match(wheel, /onClick=\{openDepart\}/)
  assert.match(wheel, /\(\) => openDepart\(consoleDepartRef\.current\),\s*\/\/ 11 Depart/)
  assert.match(wheel, /const acceptDepart = useCallback\(\(\) => \{[\s\S]*?window\.nuarcade\?\.quit\?\.\(\)/)
  assert.match(home, /const confirmDepart = useCallback\(\(\) => \{[\s\S]*?window\.nuarcade\?\.quit\?\.\(\)/)
  assert.match(dialog, /if \(choice === 0\) confirmOnce\(\)\s*\n\s*else onCancel\(\)/)
})

test("cancel defaults to No and restores focus to the exact invoking control", () => {
  assert.match(dialog, /const noButtonRef = useRef\(null\)/)
  assert.match(dialog, /noButtonRef\.current\?\.focus\(\)/)
  assert.match(wheel, /departInvokerRef\.current = resolveDepartInvoker\([\s\S]*?consoleDepartRef\.current[\s\S]*?departTriggerRef\.current/)
  assert.match(wheel, /restoreDepartFocus\(departInvokerRef\.current\)/)
  assert.match(wheel, /ref=\{consoleDepartRef\}/)
  assert.match(home, /requestAnimationFrame\(\(\) => departTriggerRef\.current\?\.focus\(\)\)/)
  assert.match(home, /ref=\{action === "depart" \? departTriggerRef : undefined\}/)
})

test("Depart works by mouse, keyboard, and controller without leaking input below the modal", () => {
  assert.match(dialog, /onClick=\{confirmOnce\}/)
  assert.match(dialog, /onClick=\{onCancel\}/)
  for (const key of ["ArrowLeft", "ArrowRight", "Enter", "Escape"]) assert.match(dialog, new RegExp(`event\\.key === "${key}"`))
  assert.match(dialog, /event\.stopImmediatePropagation\(\)/)
  assert.match(dialog, /departDialog:\s*true/)
  assert.match(dialog, /left:\s*\(\) => choose\(0\)/)
  assert.match(dialog, /right:\s*\(\) => choose\(1\)/)
  assert.match(dialog, /confirm:\s*acceptChoice/)
  assert.match(dialog, /back:\s*onCancel/)
  assert.match(wheel, /enabled:\s*departOverlayActive && !showExitPopup,[\s\S]*?settings:\s*openDepart/)
  assert.match(gamepad, /!departDialogActive \|\| h\.departDialog === true/)
  assert.match(overlayGamepad, /inputGateRef\.current\.suppress\(now\)/)
})

test("the shared dialog is semantic, visibly focused, and not color-only", () => {
  assert.match(dialog, /role="dialog"/)
  assert.match(dialog, /aria-modal="true"/)
  assert.match(dialog, /aria-labelledby="vespara-depart-title"/)
  assert.match(dialog, /aria-describedby="vespara-depart-hint"/)
  assert.match(dialog, /aria-pressed=\{choice === 0\}/)
  assert.match(dialogCss, /\.choice:focus-visible\s*\{[^}]*outline:\s*2px solid #d6b274/s)
  assert.match(dialogCss, /\.active::before\s*\{[^}]*content:\s*"◆"/s)
})

test("world labels receive restrained gold edging while metadata and support copy do not", () => {
  assert.match(homeCss, /\.departDestination \.destinationName\s*\{[^}]*#f7ecd6[^}]*-webkit-text-stroke:\s*0\.35px/s)
  assert.match(wheelCss, /\.departReservation span\s*\{[^}]*-webkit-text-stroke:\s*0\.35px/s)
  assert.match(wheelCss, /\.consoleDepartBtn\s*\{[^}]*-webkit-text-stroke:\s*0\.3px/s)
  assert.match(dialogCss, /\.title\s*\{[^}]*#f7ecd6[^}]*-webkit-text-stroke:\s*0\.4px/s)
  assert.match(homeCss, /\.departDestination \.destinationDetail\s*\{[^}]*-webkit-text-stroke:\s*0/s)
  assert.doesNotMatch(dialogCss.match(/\.hint\s*\{([^}]*)\}/)?.[1] || "", /text-stroke/)
  assert.doesNotMatch(wheelCss.match(/\.departReservation small\s*\{([^}]*)\}/)?.[1] || "", /text-stroke/)
})

test("Return to Sanctuary remains separate and localized world language replaces software Exit", () => {
  assert.match(wheel, /className=\{styles\.returnHomeBtn \+[\s\S]*?onClick=\{\(\) => \{ if \(onReturnHome\) onReturnHome\(\) \}\}/)
  assert.match(en, /"wheel\.depart":\s*"Depart"/)
  assert.match(en, /"wheel\.confirmExitTitle":\s*"LEAVE VESPARA\?"/)
  assert.match(es, /"wheel\.depart":\s*"Partir"/)
  assert.match(es, /"wheel\.confirmExitTitle":\s*"¿ABANDONAR VESPARA\?"/)
})

test("Depart motion is scoped and reduced-motion safe", () => {
  assert.match(dialogCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.overlay \{ animation: none; \}[\s\S]*?\.choice \{ transition: none; \}/)
  assert.doesNotMatch(dialogCss, /transition:\s*all/)
  assert.doesNotMatch(dialogCss, /outline:\s*none/)
})
