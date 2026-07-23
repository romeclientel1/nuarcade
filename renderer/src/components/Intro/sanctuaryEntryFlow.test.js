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

test("the full sanctuary-entry film is resolved before the legacy intro", () => {
  const block = sliceBetween(
    app,
    "const resolveLaunchVideo = async () => {",
    "resolveLaunchVideo()",
    "launch-video resolver"
  )

  const sanctuary = block.indexOf(
    'resolveCinematicMediaPath(\n        "sanctuary-entry.mp4"'
  )
  const intro = block.indexOf(
    'resolveCinematicMediaPath(\n        "intro.mp4"'
  )

  assert.notEqual(sanctuary, -1)
  assert.notEqual(intro, -1)
  assert.ok(sanctuary < intro)
})

test("external Windows media remains the first choice before bundled defaults", () => {
  assert.match(
    app,
    /window\.nuarcade\?\.platform === "win32"[\s\S]*?window\.nuarcade\?\.checkPath/
  )
  assert.match(
    app,
    /window\.nuarcade\?\.getBundledCinematicMediaPath\?\.\(fileName\)/
  )
})

test("the full sanctuary film goes directly to Traveler Recognition", () => {
  const block = sliceBetween(
    app,
    "const handleLaunchVideoComplete",
    "const handleIntroComplete",
    "launch-video completion"
  )

  assert.match(block, /launchVideo\?\.isFullArrival/)
  assert.match(block, /setPhase\("playerSelect"\)/)
  assert.match(block, /setPhase\("intro"\)/)
})

test("profile, guest, and new-traveler selection now enter Home directly", () => {
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
  assert.match(profileBlock, /setPhase\("main"\)/)
  assert.doesNotMatch(profileBlock, /beginMainEntry/)

  assert.match(guestBlock, /selectGuest\(\)/)
  assert.match(guestBlock, /setPhase\("main"\)/)
  assert.doesNotMatch(guestBlock, /beginMainEntry/)

  assert.match(addBlock, /addProfile\(name\)/)
  assert.match(addBlock, /setPhase\("main"\)/)
  assert.doesNotMatch(addBlock, /beginMainEntry/)
})

test("there is no post-selection sanctuary-entry phase", () => {
  assert.doesNotMatch(app, /phase === "sanctuaryEntry"/)
  assert.doesNotMatch(app, /sanctuaryEntryPlayedRef/)
  assert.doesNotMatch(app, /beginMainEntry/)
})

test("the launch phase renders the selected cinematic filename", () => {
  const block = sliceBetween(
    app,
    '{phase === "launchVideo" && launchVideo && (',
    '{phase === "intro" && (',
    "launch-video render"
  )

  assert.match(block, /<IntroVideo/)
  assert.match(block, /mediaPath=\{launchVideo\.mediaPath\}/)
  assert.match(block, /fileName=\{launchVideo\.fileName\}/)
  assert.match(block, /onComplete=\{handleLaunchVideoComplete\}/)
})

test("the shared video component remains immediately skippable and fails open", () => {
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
