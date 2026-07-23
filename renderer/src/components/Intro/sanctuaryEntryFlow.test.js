import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))

const read = (relativePath) =>
  readFileSync(join(HERE, relativePath), "utf8").replace(/\r\n/g, "\n")

const app = read("../../App.jsx")
const video = read("../Wheel/IntroVideo.jsx")

function sliceBetween(source, startAnchor, endAnchor, label) {
  const start = source.indexOf(startAnchor)
  if (start === -1) {
    throw new Error(`${label}: missing start anchor ${JSON.stringify(startAnchor)}`)
  }

  const end = source.indexOf(endAnchor, start)
  if (end === -1) {
    throw new Error(`${label}: missing end anchor ${JSON.stringify(endAnchor)}`)
  }

  return source.slice(start, end)
}

test("the optional startup video and sanctuary-entry video use distinct filenames", () => {
  assert.match(app, /buildMediaVideoPath\(mediaPath, "intro\.mp4"\)/)
  assert.match(app, /buildMediaVideoPath\(mediaPath, "sanctuary-entry\.mp4"\)/)
})

test("sanctuary entry is guarded to play only once per App session", () => {
  assert.match(app, /const sanctuaryEntryPlayedRef = useRef\(false\)/)

  const block = sliceBetween(
    app,
    "const beginMainEntry = () => {",
    "const handlePlayerSelect",
    "beginMainEntry"
  )

  assert.match(block, /if \(sanctuaryEntryPlayedRef\.current\) \{\s*setPhase\("main"\)\s*return/)
  assert.match(block, /sanctuaryEntryPlayedRef\.current = true/)
})

test("reduced motion bypasses the cinematic and enters Home directly", () => {
  const block = sliceBetween(
    app,
    "const beginMainEntry = () => {",
    "const handlePlayerSelect",
    "beginMainEntry"
  )

  assert.match(
    block,
    /window\.matchMedia\?\.\("\(prefers-reduced-motion: reduce\)"\)\?\.matches === true/
  )
  assert.match(block, /if \(\s*reducedMotion \|\|/)
  assert.match(block, /setPhase\("main"\)/)
})

test("cinematic resolution prefers a Windows external override and then uses the bundled default", () => {
  assert.match(
    app,
    /window\.nuarcade\?\.platform === "win32"[\s\S]*?window\.nuarcade\?\.checkPath/
  )
  assert.match(
    app,
    /window\.nuarcade\?\.getBundledCinematicMediaPath\?\.\(fileName\)/
  )
  assert.match(
    app,
    /resolveCinematicMediaPath\("intro\.mp4", mediaPath\)/
  )
  assert.match(
    app,
    /resolveCinematicMediaPath\("sanctuary-entry\.mp4", mediaPath\)/
  )
})

test("the sanctuary-entry file check has a bounded fail-open timer", () => {
  const block = sliceBetween(
    app,
    "const beginMainEntry = () => {",
    "const handlePlayerSelect",
    "beginMainEntry"
  )

  assert.match(block, /setPhase\("sanctuaryEntryCheck"\)/)
  assert.match(block, /const fallback = setTimeout\(\(\) => \{/)
  assert.match(block, /\}, 1500\)/)
  assert.match(block, /\.catch\(\(\) => \{[\s\S]*?setPhase\("main"\)/)
})

test("profile, guest, and new-traveler selection all enter through the same cinematic gate", () => {
  const profileBlock = sliceBetween(
    app,
    "const handlePlayerSelect",
    "const handleGuest",
    "profile handler"
  )
  const guestBlock = sliceBetween(
    app,
    "const handleGuest",
    "const handleAddProfile",
    "guest handler"
  )
  const addBlock = sliceBetween(
    app,
    "const handleAddProfile",
    "const handleReturnToPlayerSelect",
    "add-profile handler"
  )

  assert.match(profileBlock, /selectProfile\(player\.id\)/)
  assert.match(profileBlock, /beginMainEntry\(\)/)

  assert.match(guestBlock, /selectGuest\(\)/)
  assert.match(guestBlock, /beginMainEntry\(\)/)

  assert.match(addBlock, /addProfile\(name\)/)
  assert.match(addBlock, /beginMainEntry\(\)/)
})

test("the sanctuary-entry phase renders the shared skippable video component", () => {
  const block = sliceBetween(
    app,
    '{phase === "sanctuaryEntry" && (',
    '{phase === "playerSelect" && (',
    "sanctuary-entry render block"
  )

  assert.match(block, /<IntroVideo/)
  assert.match(block, /mediaPath=\{sanctuaryEntryMediaPath\}/)
  assert.match(block, /fileName="sanctuary-entry\.mp4"/)
  assert.match(block, /onComplete=\{handleSanctuaryEntryComplete\}/)
})

test("the shared video component supports a configurable filename while preserving intro.mp4 as its default", () => {
  assert.match(video, /const buildVideoUrl = \(mediaPath, fileName\) =>/)
  assert.match(video, /return `file:\/\/\/\$\{base\}\/\$\{fileName\}`/)
  assert.match(video, /fileName = "intro\.mp4"/)
  assert.match(video, /const videoPath = buildVideoUrl\(mediaPath, fileName\)/)
  assert.match(video, /src=\{videoPath\}/)
})

test("ended, error, keyboard, mouse, and controller completion remain available", () => {
  assert.match(video, /onEnded=\{finish\}/)
  assert.match(video, /onError=\{finish\}/)
  assert.match(video, /window\.addEventListener\("keydown", finish\)/)
  assert.match(video, /window\.addEventListener\("click", finish\)/)
  assert.match(video, /useOverlayGamepad\(\{/)

  for (const handler of [
    "onClose",
    "onUp",
    "onDown",
    "onLeft",
    "onRight",
    "onConfirm",
  ]) {
    assert.match(video, new RegExp(`${handler}: finish`))
  }
})
