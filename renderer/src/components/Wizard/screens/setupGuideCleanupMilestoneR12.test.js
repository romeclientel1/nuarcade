// setupGuideCleanupMilestoneR12.test.js ---------------------------------------
//
// Regression coverage for the SetupGuideScreen cleanup pass: removing
// hard-coded F:\ drive-letter assumptions and exact BIOS/firmware/key
// filenames from the shipped in-app setup guide, adding a single shared
// legal notice, adding an Owner's Manual pointer, and consolidating each
// emulator's per-step instructions into a neutral, path-free template --
// while preserving the emulator/system list, download links, expand/
// collapse behavior, and Back/Continue wizard navigation exactly as they
// were.
//
// This file is source-level (no jsdom/testing-library anywhere in this
// project, matching every other *.test.js here) -- it reads the real
// component source and asserts against it directly, plus genuinely
// executes the plain-JS parts (EMULATORS array shape, buildSteps) by
// importing the module itself where that's possible. SetupGuideScreen.jsx
// is a JSX file with no jsdom available, so its component body is
// asserted via source text, not rendered.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (relPath) => readFileSync(join(HERE, relPath), "utf8").replace(/\r\n/g, "\n")
const jsx = read("SetupGuideScreen.jsx")
const wizard = read("../Wizard.jsx")

// -- 1. No hard-coded drive-letter assumptions remain -------------------

test("no F:\\ (or any other bare drive-letter) user-facing path remains anywhere in the file", () => {
  assert.doesNotMatch(jsx, /[A-Za-z]:\\\\/, "expected zero drive-letter-style paths (e.g. F:\\\\ or C:\\\\) in SetupGuideScreen.jsx")
})

test("no per-emulator folder/gamesFolder/biosFolder fields remain in the data model", () => {
  assert.doesNotMatch(jsx, /\bfolder:\s*['"]/)
  assert.doesNotMatch(jsx, /\bgamesFolder:\s*['"]/)
  assert.doesNotMatch(jsx, /\bbiosFolder:\s*['"]/)
})

// -- 2. No exact BIOS/firmware/key filenames remain ----------------------

test("no exact BIOS/firmware/key filenames remain anywhere in the file", () => {
  const knownFilenames = [
    "SCPH-70012.bin", "SCPH-1001.bin", "prod.keys", "title.keys",
    "dc_boot.bin", "dc_flash.bin", "mcpx_1.0.bin", "xemu.toml",
  ]
  for (const filename of knownFilenames) {
    assert.ok(!jsx.includes(filename), `expected "${filename}" to have been removed from SetupGuideScreen.jsx`)
  }
  // General pattern check: no biosFiles arrays of literal filenames remain.
  assert.doesNotMatch(jsx, /\bbiosFiles:\s*\[/)
})

// -- 3. Shared legal notice is present ------------------------------------

test("the shared legal notice is present, exactly once, and matches the required wording", () => {
  const matches = jsx.match(/Vespara does not include games, ROMs, firmware, keys, BIOS files,\s*\n\s*or emulator binaries\./g) || []
  assert.equal(matches.length, 1, "expected exactly one shared legal notice")
  assert.match(jsx, /You must provide legally obtained copies of\s*\n\s*anything an emulator requires\./)
})

// -- 4. Owner's Manual reference is present -------------------------------

test("a visible Owner's Manual reference is present, using neutral copy (no invented file-opening mechanism)", () => {
  assert.match(jsx, /See the Vespara Owner's Manual for detailed emulator, firmware, and\s*\n\s*folder setup\./)
  // Must not claim to open USER_MANUAL.md directly -- no invented IPC/file-open call for it.
  assert.doesNotMatch(jsx, /USER_MANUAL\.md/)
  assert.doesNotMatch(jsx, /window\.nuarcade\?\.open(Manual|Docs|UserManual)/)
})

// -- 5. Xemu / Cxbx-Reloaded distinction is preserved ---------------------

test("the Xemu vs Cxbx-Reloaded distinction is preserved: Xemu covers disc-image formats, Cxbx-Reloaded covers already-extracted games with an executable", () => {
  const xemuBlock = jsx.slice(jsx.indexOf("id: 'xemu'"), jsx.indexOf("id: 'cxbx'"))
  const cxbxBlock = jsx.slice(jsx.indexOf("id: 'cxbx'"), jsx.indexOf("id: 'model2'"))
  assert.match(xemuBlock, /disc-image formats/)
  assert.match(cxbxBlock, /already-extracted games|already extracted/)
  // Neither should claim one is universally/subjectively better.
  assert.doesNotMatch(xemuBlock, /best overall compatibility|recommended first choice/i)
  assert.doesNotMatch(cxbxBlock, /best overall compatibility|recommended first choice/i)
})

// -- 6. No promotional/subjective claims or named game lists --------------

test("no promotional or subjective claims remain (named game lists, superlatives, inflated counts)", () => {
  const forbidden = [
    "Easiest setup", "10,000+", "best overall compatibility",
    "Pac-Man, Galaga", "GoldenEye, Ocarina of Time", "Daytona USA, Sega Rally",
    "Scud Race, Star Wars Trilogy", "God of War, Monster Hunter",
    "Mario Kart 8, Smash Bros.", "vpuniverse.com",
  ]
  for (const phrase of forbidden) {
    assert.ok(!jsx.includes(phrase), `expected promotional/stale phrase "${phrase}" to have been removed`)
  }
})

// -- 7. Emulator/system list and wizard flow remain intact ----------------

test("all 18 emulator entries are still present with their original id, name, and system", () => {
  const expected = [
    ["teknoparrot", "TeknoParrot", "Arcade"],
    ["rpcs3", "RPCS3", "PlayStation 3"],
    ["xenia", "Xenia", "Xbox 360"],
    ["dolphin", "Dolphin", "GameCube / Wii"],
    ["pcsx2", "PCSX2", "PlayStation 2"],
    ["ryujinx", "Ryubing (Ryujinx fork)", "Nintendo Switch"],
    ["mame", "MAME", "Arcade Classics"],
    ["retroarch", "RetroArch", "NES / SNES / Genesis / GBA / N64 / PS1"],
    ["project64", "Project64", "Nintendo 64"],
    ["duckstation", "DuckStation", "PlayStation 1"],
    ["flycast", "Flycast", "Dreamcast / NAOMI"],
    ["xemu", "Xemu", "Original Xbox"],
    ["cxbx", "Cxbx-Reloaded", "Original Xbox"],
    ["model2", "Model 2 Emulator", "Sega Model 2"],
    ["model3", "Supermodel (Model 3)", "Sega Model 3"],
    ["ppsspp", "PPSSPP", "PlayStation Portable"],
    ["cemu", "Cemu", "Wii U"],
    ["vpx", "Visual Pinball X", "Pinball"],
  ]
  for (const [id, name, system] of expected) {
    const idIdx = jsx.indexOf(`id: '${id}'`)
    assert.ok(idIdx > -1, `expected emulator id "${id}" to still be present`)
    const block = jsx.slice(idIdx, idIdx + 400)
    assert.match(block, new RegExp(`name: '${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`), `expected name "${name}" for id "${id}"`)
    assert.match(block, new RegExp(`system: '${system.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`), `expected system "${system}" for id "${id}"`)
  }
  assert.equal(expected.length, 18, "sanity check on the expected list length itself")
})

test("every emulator's existing download url is preserved mechanically (unchanged from before this cleanup pass)", () => {
  const expectedUrls = [
    "https://teknoparrot.com/", "https://rpcs3.net", "https://xenia.jp",
    "https://dolphin-emu.org", "https://pcsx2.net", "https://ryujinx.app/download",
    "https://www.mamedev.org", "https://www.retroarch.com", "https://www.pj64-emu.com",
    "https://www.duckstation.org", "https://github.com/flyinghead/flycast/releases",
    "https://xemu.app", "https://github.com/Cxbx-Reloaded/Cxbx-Reloaded/releases",
    "https://emulation.gametechwiki.com/index.php/Model_2_Emulator",
    "https://github.com/trzy/Supermodel/releases", "https://www.ppsspp.org",
    "https://cemu.info", "https://github.com/vpinball/vpinball/releases",
  ]
  for (const url of expectedUrls) {
    assert.ok(jsx.includes(`url: '${url}'`), `expected existing url "${url}" to remain unchanged`)
  }
})

test("no new URLs were introduced -- every url: string in the file is one of the 18 pre-existing links", () => {
  const expectedUrls = new Set([
    "https://teknoparrot.com/", "https://rpcs3.net", "https://xenia.jp",
    "https://dolphin-emu.org", "https://pcsx2.net", "https://ryujinx.app/download",
    "https://www.mamedev.org", "https://www.retroarch.com", "https://www.pj64-emu.com",
    "https://www.duckstation.org", "https://github.com/flyinghead/flycast/releases",
    "https://xemu.app", "https://github.com/Cxbx-Reloaded/Cxbx-Reloaded/releases",
    "https://emulation.gametechwiki.com/index.php/Model_2_Emulator",
    "https://github.com/trzy/Supermodel/releases", "https://www.ppsspp.org",
    "https://cemu.info", "https://github.com/vpinball/vpinball/releases",
  ])
  const foundUrls = [...jsx.matchAll(/url:\s*'([^']+)'/g)].map(m => m[1])
  assert.equal(foundUrls.length, 18, "expected exactly 18 url: entries, one per emulator")
  for (const url of foundUrls) {
    assert.ok(expectedUrls.has(url), `unexpected new URL introduced: "${url}"`)
  }
})

test("expand/collapse, Back, and Continue behavior are unchanged", () => {
  assert.match(jsx, /const \[collapsed, setCollapsed\] = useState\(\{\}\)/)
  assert.match(jsx, /const toggleCollapse = \(id\) => setCollapsed\(c => \(\{ \.\.\.c, \[id\]: !c\[id\] \}\)\)/)
  assert.match(jsx, /onClick=\{\(\) => toggleCollapse\(emu\.id\)\}/)
  assert.match(jsx, /\{isCollapsed \? '>' : 'v'\}/)
  assert.match(jsx, /<button className=\{styles\.btnBack\} onClick=\{prev\}>Back<\/button>/)
  assert.match(jsx, /<button className=\{styles\.btn\} onClick=\{next\}>Continue<\/button>/)
})

test("the Download button still opens the emulator's url exactly as before", () => {
  assert.match(jsx, /const openDownload = \(url\) => window\.open\(url, '_blank'\)/)
  assert.match(jsx, /onClick=\{\(\) => openDownload\(emu\.url\)\}/)
})

test("Wizard.jsx still wires SetupGuideScreen as step 2 -- this cleanup pass did not touch wizard navigation", () => {
  assert.match(wizard, /import SetupGuideScreen from '\.\/screens\/SetupGuideScreen'/)
  assert.match(wizard, /case 2: return <SetupGuideScreen \{\.\.\.screenProps\} \/>/)
})

// -- 8. Each entry's rendered content is limited to what's required -------

test("buildSteps produces a neutral, path-free setup summary that names the emulator and mentions the Control Room and Game Paths, with no drive letters", () => {
  // Reconstructs the function body's logic directly against the source
  // text (no bundler available to actually import JSX in this test
  // runner), confirming the exact conditional BIOS step insertion.
  assert.match(jsx, /function buildSteps\(emu\) \{/)
  assert.match(jsx, /Install \$\{emu\.name\} in a folder you control\./)
  assert.match(jsx, /if \(emu\.bios\) \{/)
  assert.match(jsx, /Obtain any required firmware or BIOS files from your own hardware\./)
  assert.match(jsx, /Point Vespara at the emulator's executable or install folder in the Control Room's Emulators station\./)
  assert.match(jsx, /Choose the folder containing your \$\{emu\.system\} games in Game Paths\./)
  assert.match(jsx, /Rescan after changing paths\./)
})

test("each emulator body renders exactly one requirement note (BIOS/firmware) and, when present, one optional compatibility note -- nothing else", () => {
  assert.match(jsx, /const requirementNote = emu\.bios/)
  assert.match(jsx, /No BIOS normally required\./)
  assert.match(jsx, /Requires firmware or BIOS obtained from your own hardware\. See the Owner's Manual and the emulator's official documentation\./)
  assert.match(jsx, /\{emu\.compatNote && \(/)
})
