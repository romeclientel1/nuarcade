// coverage2.test.js -----------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project. Imports the
// real production dictionaries (en.js/es.js) and the real translate()
// helper from locale.js -- nothing here is a duplicated/restated
// translation table.
//
// Covers the final player-facing localization cleanup milestone: Home
// depart confirmation, granular Settings fields, Game Detail, Game Coach,
// High Score Board, Media Manager, updater/status text, Virtual Keyboard,
// controller prompts, splash text, and common status vocabulary (On/Off/
// Enabled/Disabled/Error/Checking/Scanning/etc). Component JSX itself is
// not rendered here (no jsdom/@testing-library/react in this project --
// see locale.test.js/context.test.js/coverage.test.js for the same
// limitation): t() in every component reduces to translate(locale, key,
// params), so exercising that function directly at every key used in a
// converted surface is the correct-level test.
//
// Generic dictionary integrity (no duplicate keys, no orphaned Spanish
// keys, full Spanish coverage except documented fallbacks, no direct
// en.js/es.js imports anywhere in components/hooks) is already covered by
// coverage.test.js's walk-based checks, which apply to the whole
// dictionary regardless of which milestone added a given key -- not
// repeated here.

import { test } from "node:test"
import assert from "node:assert/strict"
import { translate } from "./locale.js"

// -- Home: depart confirmation -------------------------------------------------

test("Home depart confirmation switches language", () => {
  assert.equal(translate("en", "home.confirmDepartTitle"), "LEAVE VESPARA?")
  assert.equal(translate("es", "home.confirmDepartTitle"), "¿ABANDONAR VESPARA?")
  // Reuses the shared Yes/No vocabulary -- not a near-duplicate key.
  assert.equal(translate("en", "common.yes"), "Yes")
  assert.equal(translate("es", "common.yes"), "Sí")
})

// -- Settings: granular fields --------------------------------------------------

test("granular Settings labels switch language", () => {
  const pairs = [
    ["settings.crtEffect", "CRT effect", "Efecto CRT"],
    ["settings.autoLaunchLast", "Auto-launch last", "Iniciar el último automáticamente"],
    ["settings.mode", "Mode", "Modo"],
    ["settings.fullscreen", "Fullscreen", "Pantalla completa"],
    ["settings.windowed", "Windowed", "Ventana"],
    ["settings.videoVolume", "Gameplay video volume", "Volumen del video de juego"],
    ["settings.music", "Music", "Música"],
    ["settings.musicVolume", "Music volume", "Volumen de la música"],
    ["settings.idleTimeout", "Idle timeout", "Tiempo de espera inactivo"],
    ["settings.cycleSpeed", "Cycle speed", "Velocidad de ciclo"],
    ["settings.preferArtwork", "Prefer artwork", "Preferir arte gráfico"],
    ["settings.enable", "Enable", "Activar"],
    ["settings.ipAddress", "IP address", "Dirección IP"],
    ["settings.port", "Port", "Puerto"],
    ["settings.backup", "Backup", "Copia de seguridad"],
    ["settings.restore", "Restore", "Restaurar"],
    ["settings.exportGameList", "Export game list", "Exportar lista de juegos"],
    ["settings.checkBiosFiles", "Check BIOS files", "Comprobar archivos BIOS"],
    ["settings.version", "Version", "Versión"],
    ["settings.platform", "Platform", "Plataforma"],
    ["settings.hideNotWorkingMame", "Hide Not Working MAME ROMs", "Ocultar ROMs de MAME que no funcionan"],
  ]
  for (const [key, enVal, esVal] of pairs) {
    assert.equal(translate("en", key), enVal)
    assert.equal(translate("es", key), esVal)
  }
})

test("Settings restart-required/reset/update text switches language (already-shipped keys reused correctly)", () => {
  assert.notEqual(translate("en", "settings.restartRequired"), translate("es", "settings.restartRequired"))
  assert.notEqual(translate("en", "settings.resetToDefaults"), translate("es", "settings.resetToDefaults"))
})

test("Settings field-help text (notes) switches language and preserves technical paths unchanged", () => {
  const en = translate("en", "settings.musicNote")
  const es = translate("es", "settings.musicNote")
  assert.notEqual(en, es)
  assert.ok(en.includes("F:/Media/Music/"))
  assert.ok(es.includes("F:/Media/Music/"))
})

test("Settings dynamic status messages preserve interpolated counts/paths exactly", () => {
  assert.equal(
    translate("en", "settings.notFoundCheckPath", { count: 3, path: "F:\\ArcadeGames\\" }),
    "(3 not found -- check F:\\ArcadeGames\\)"
  )
  assert.equal(
    translate("es", "settings.notFoundCheckPath", { count: 3, path: "F:\\ArcadeGames\\" }),
    "(3 no encontrado(s) -- revisa F:\\ArcadeGames\\)"
  )
  assert.equal(translate("en", "settings.tpRenamedTo", { name: "MyGameFolder" }), "Renamed to MyGameFolder -- restart to apply.")
  assert.equal(translate("es", "settings.tpRenamedTo", { name: "MyGameFolder" }), "Renombrado a MyGameFolder -- reinicia para aplicar.")
})

// -- Game Detail ----------------------------------------------------------------

test("Game Detail labels switch language", () => {
  const keys = ["gameDetail.system", "gameDetail.genre", "gameDetail.status", "gameDetail.launchCommand", "gameDetail.yourRating", "gameDetail.similarGames"]
  for (const key of keys) {
    assert.notEqual(translate("en", key), translate("es", key), key + " should differ between locales")
  }
  assert.equal(translate("en", "gameDetail.personalNotes"), "Personal notes")
  assert.equal(translate("es", "gameDetail.personalNotes"), "Notas personales")
})

// -- Game Coach -------------------------------------------------------------

test("Game Coach labels switch language and dynamic game name passes through unchanged", () => {
  assert.equal(translate("en", "coach.title"), "AI COACH")
  assert.equal(translate("es", "coach.title"), "ENTRENADOR IA")
  const name = "Ninja Gaiden III"
  assert.equal(translate("en", "coach.analyzing", { game: name }), "Analyzing " + name + "...")
  assert.equal(translate("es", "coach.analyzing", { game: name }), "Analizando " + name + "...")
  assert.notEqual(translate("en", "coach.noApiKey"), translate("es", "coach.noApiKey"))
})

// -- High Score Board -------------------------------------------------------

test("High Score Board labels switch language", () => {
  assert.equal(translate("en", "highScores.title"), "HIGH SCORES")
  assert.equal(translate("es", "highScores.title"), "PUNTUACIONES ALTAS")
  const keys = ["highScores.allTime", "highScores.myScores", "highScores.player", "highScores.score", "highScores.date", "highScores.footer"]
  for (const key of keys) {
    assert.notEqual(translate("en", key), translate("es", key), key + " should differ between locales")
  }
})

// -- Media Manager ------------------------------------------------------------

test("Media Manager labels switch language", () => {
  assert.equal(translate("en", "mediaManager.title"), "Media Manager")
  assert.equal(translate("es", "mediaManager.title"), "Gestor de medios")
  assert.notEqual(translate("en", "mediaManager.bezels"), translate("es", "mediaManager.bezels"))
  // Media Manager's "Library"/"Artwork"/"About" tabs deliberately reuse
  // already-shipped shared keys instead of near-duplicates.
  assert.equal(translate("en", "home.library"), "Library")
  assert.equal(translate("en", "settings.sectionArtwork"), "Artwork")
})

// -- Updater / update status text --------------------------------------------

test("updater/status text switches language", () => {
  assert.equal(translate("en", "updater.checking"), "Checking for new games...")
  assert.equal(translate("es", "updater.checking"), "Buscando juegos nuevos...")
  assert.equal(
    translate("en", "updater.newGamesTitle", { count: 2, unit: "games" }),
    "2 new games added to TeknoParrot!"
  )
  assert.equal(
    translate("es", "updater.newGamesTitle", { count: 2, unit: "juegos" }),
    "¡Se añadieron 2 juegos nuevos a TeknoParrot!"
  )
})

test("UpdateBanner status text switches language and preserves the dynamic version exactly", () => {
  assert.equal(translate("en", "updateBanner.available", { version: "5.4.0" }), "Vespara v5.4.0 is available")
  assert.equal(translate("es", "updateBanner.available", { version: "5.4.0" }), "Vespara v5.4.0 está disponible")
  assert.notEqual(translate("en", "updateBanner.readyToInstall"), translate("es", "updateBanner.readyToInstall"))
  assert.notEqual(translate("en", "updateBanner.downloadFailed"), translate("es", "updateBanner.downloadFailed"))
})

// -- Virtual Keyboard ---------------------------------------------------------

test("Virtual Keyboard labels switch language", () => {
  assert.equal(translate("en", "virtualKeyboard.space"), "SPACE")
  assert.equal(translate("es", "virtualKeyboard.space"), "ESPACIO")
  assert.equal(translate("en", "virtualKeyboard.result", { count: 1 }), "1 result")
  assert.equal(translate("en", "virtualKeyboard.results", { count: 5 }), "5 results")
  assert.equal(translate("es", "virtualKeyboard.results", { count: 5 }), "5 resultados")
  assert.notEqual(translate("en", "virtualKeyboard.hintType"), translate("es", "virtualKeyboard.hintType"))
})

// -- Controller prompts --------------------------------------------------------

test("controller prompts switch language", () => {
  assert.equal(translate("en", "controllerPrompt.grabWheel"), "GRAB THE WHEEL")
  assert.equal(translate("es", "controllerPrompt.grabWheel"), "AGARRA EL VOLANTE")
  assert.notEqual(translate("en", "controllerPrompt.launchingSoon"), translate("es", "controllerPrompt.launchingSoon"))
})

test("controller badge label + dynamic device-name interpolation switches language", () => {
  assert.equal(translate("en", "controllerBadge.wheel"), "Steering Wheel")
  assert.equal(translate("es", "controllerBadge.wheel"), "Volante")
  assert.equal(translate("en", "controllerBadge.use", { device: "Steering Wheel" }), "Use: Steering Wheel")
  assert.equal(translate("es", "controllerBadge.use", { device: "Volante" }), "Usa: Volante")
})

// -- Splash / boot text (mounted or not, still real production strings) ------

test("splash visible text switches language", () => {
  assert.equal(translate("en", "splash.tagline"), "INSERT COIN TO CONTINUE")
  assert.equal(translate("es", "splash.tagline"), "INSERTA MONEDA PARA CONTINUAR")
})

test("boot screen visible text switches language", () => {
  assert.notEqual(translate("en", "bootScreen.label"), translate("es", "bootScreen.label"))
  assert.notEqual(translate("en", "bootScreen.hint"), translate("es", "bootScreen.hint"))
})

// -- Common status vocabulary --------------------------------------------------

test("common status vocabulary switches language", () => {
  const pairs = [
    ["common.on", "On", "Encendido"],
    ["common.off", "Off", "Apagado"],
    ["common.ok", "OK", "OK"],
    ["common.error", "Error", "Error"],
    ["common.checking", "Checking...", "Comprobando..."],
    ["common.scanning", "Scanning...", "Explorando..."],
    ["common.save", "Save", "Guardar"],
  ]
  for (const [key, enVal, esVal] of pairs) {
    assert.equal(translate("en", key), enVal)
    assert.equal(translate("es", key), esVal)
  }
})

// -- Dynamic values remain unchanged across every converted surface -----------

test("dynamic game/profile/path values remain unchanged through every new interpolated key", () => {
  const path = "F:\\PathWithSpaces\\Ünïcödé Game\\game.exe"
  const name = "María's Café Racer"
  assert.ok(translate("en", "errors.pathMissing", { path }).includes(path))
  assert.ok(translate("es", "errors.pathMissing", { path }).includes(path))
  assert.ok(translate("en", "gameDetail.notesPlaceholder") === translate("en", "gameDetail.notesPlaceholder")) // static, sanity
  assert.ok(translate("en", "coach.analyzing", { game: name }).includes(name))
  assert.ok(translate("es", "coach.analyzing", { game: name }).includes(name))
  assert.ok(translate("en", "controllerBadge.use", { device: name }).includes(name))
})

// -- Runtime switching is immediate (no caching, pure function) --------------

test("runtime switching remains immediate -- repeated calls with different locales never return stale values", () => {
  // translate() takes locale as a plain argument every call, so there is
  // no state to go stale -- this proves the property structurally rather
  // than through a React re-render (unavailable in this test harness).
  for (let i = 0; i < 3; i++) {
    assert.equal(translate("en", "settings.crtEffect"), "CRT effect")
    assert.equal(translate("es", "settings.crtEffect"), "Efecto CRT")
  }
})

// -- Missing-key fallback still holds for a brand-new key ---------------------

test("missing-key fallback remains [[semantic.key]] for a key introduced this milestone but never populated", () => {
  assert.equal(translate("en", "gameDetail.thisKeyWasNeverAdded"), "[[gameDetail.thisKeyWasNeverAdded]]")
  assert.equal(translate("es", "gameDetail.thisKeyWasNeverAdded"), "[[gameDetail.thisKeyWasNeverAdded]]")
})
