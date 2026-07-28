// sanctuaryFirstRunControlRoomMilestoneR2.test.js ----------------------------
// Committed regression test, run via `node --test`. Follows this directory's
// existing convention (see worldShell.test.js) of reading VesparaHome.jsx/
// .module.css and the locale files as text, since VesparaHome.jsx itself
// can't be imported directly here (JSX + .module.css, no Node loader).
//
// R2 -- Sanctuary's true first-run onboarding (installationReadiness ===
// "unconfigured", i.e. no playable game and no play history at all) now
// directs new users to the Control Room instead of the Library: the
// instructional copy, the CTA button's relabeled tile, and the derived
// initial focus target all moved from the "library" action to the
// "controlRoom" action. Established users (any other installationReadiness/
// initialFocus outcome) are completely unaffected -- same key, same
// "library" default, same handlers.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "VesparaHome.jsx"), "utf8").replace(/\r\n/g, "\n")
const en = readFileSync(join(HERE, "../../i18n/en.js"), "utf8")
const es = readFileSync(join(HERE, "../../i18n/es.js"), "utf8")

const { selectInstallationReadiness } = await import("../../selectors/profileReadiness.js")
const { selectInitialHomeFocus } = await import("../../selectors/homeEntry.js")

// -- 1. The new copy is shown for a new (true first-run) user ---------------

test("home.emptyUnconfigured is the exact required English copy directing new users to the Control Room", () => {
  assert.match(en, /"home\.emptyUnconfigured":\s*"Your Sanctuary is ready\. Visit the Control Room to connect your systems and prepare the Library\."/)
})

test("home.emptyUnconfigured is the exact required Spanish translation", () => {
  assert.match(es, /"home\.emptyUnconfigured":\s*"Tu Santuario está listo\. Visita la Sala de Control para conectar tus sistemas\s*\n?\s*y preparar la Biblioteca\."/)
})

test("VesparaHome still renders home.emptyUnconfigured only for the true first-run (isSetupFocus) state", () => {
  assert.match(jsx, /const isSetupFocus = installationReadiness === "unconfigured"/)
  assert.match(jsx, /const emptyStateText = isSetupFocus\s*\n\s*\? t\("home\.emptyUnconfigured"\)/)
})

test("a genuinely new profile (no playable game, no play history) is classified as unconfigured -- the condition this copy depends on", () => {
  assert.equal(selectInstallationReadiness([], []), "unconfigured")
  assert.equal(selectInstallationReadiness([{ status: "not-configured" }], []), "unconfigured")
})

// -- 2. The CTA opens the Control Room ---------------------------------------

test("the CTA label 'Enter the Control Room' (home.enterControlRoom) is defined in both locales", () => {
  assert.match(en, /"home\.enterControlRoom":\s*"Enter the Control Room"/)
  assert.match(es, /"home\.enterControlRoom":\s*"Entra en la Sala de Control"/)
})

test("the first-run CTA relabels the Control Room tile (not Library) to home.enterControlRoom", () => {
  assert.match(jsx, /\{action === "controlRoom" && isSetupFocus \? t\("home\.enterControlRoom"\) : ACTION_LABELS\[action\]\}/)
  // The old Library-tile relabel is gone -- this isn't a second CTA sitting
  // alongside the first, it replaced it.
  assert.doesNotMatch(jsx, /action === "library" && isSetupFocus/)
})

test("first-run (setup-connection) focus targets the Control Room action slot", () => {
  assert.match(jsx, /if \(initialFocus\.type === "setup-connection"\) \{\s*setFocusZone\("actions"\)\s*setActionIndex\(ACTIONS\.indexOf\("controlRoom"\)\)\s*return\s*\}/)
})

test("activating the controlRoom action still calls onEnterControlRoom -- the CTA navigates directly, via the existing, unchanged handler", () => {
  assert.match(jsx, /if \(action === "library"\) onEnterLibrary\?\.\(\)/)
  assert.match(jsx, /else if \(action === "controlRoom"\) onEnterControlRoom\?\.\(\)/)
})

test("selectInitialHomeFocus still returns 'setup-connection' for a truly unconfigured installation -- the exact type value the new focus branch checks for", () => {
  const focus = selectInitialHomeFocus({
    profileHistoryStatus: "empty",
    installationReadiness: "unconfigured",
    recentGames: [],
    availableGames: [],
  })
  assert.deepEqual(focus, { type: "setup-connection" })
})

// -- 3. No first-run setup instruction directs the user to the Library ------

test("the old Library-directed first-run copy and CTA label are gone", () => {
  assert.doesNotMatch(en, /"home\.emptyUnconfigured":\s*"No games configured yet/)
  assert.doesNotMatch(es, /"home\.emptyUnconfigured":\s*"Aún no hay juegos configurados/)
  assert.doesNotMatch(en, /"home\.setUp":/)
  assert.doesNotMatch(es, /"home\.setUp":/)
  assert.doesNotMatch(jsx, /t\("home\.setUp"\)/)
})

// -- 4. Established users do not unexpectedly see the prompt -----------------

test("an established, playable installation is never classified as unconfigured -- isSetupFocus stays false", () => {
  assert.equal(selectInstallationReadiness([{ status: "ready" }], []), "playable")
  assert.notEqual(selectInstallationReadiness([{ status: "ready" }], []), "unconfigured")
})

test("an installation with prior play history but no currently-playable game is 'degraded', not 'unconfigured' -- still not the first-run prompt", () => {
  assert.equal(selectInstallationReadiness([], [{ id: "g1" }]), "degraded")
})

test("established users' derived focus still defaults to the Library action slot (index 0), unchanged", () => {
  const focus = selectInitialHomeFocus({
    profileHistoryStatus: "established",
    installationReadiness: "playable",
    recentGames: [],
    availableGames: [],
  })
  assert.deepEqual(focus, { type: "library" })
  assert.match(jsx, /setFocusZone\("actions"\)\s*\n\s*setActionIndex\(0\)/)
})

test("home.emptyNoRecent (established profile, no history yet) is untouched -- still Library-directed, a distinct case from true first-run", () => {
  assert.match(en, /"home\.emptyNoRecent":\s*"No recent memories yet -- enter the Library to begin\."/)
  assert.match(es, /"home\.emptyNoRecent":\s*"Aún no hay recuerdos recientes -- entra en la Biblioteca para comenzar\."/)
})
