import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { nextAttractSceneIndex } from "./attractSceneCycle.js"
import { getAttractReason } from "./attractReason.js"

const HERE = dirname(fileURLToPath(import.meta.url))
const sceneModel = readFileSync(join(HERE, "attractScenes.js"), "utf8").replace(/\r\n/g, "\n")
const attract = readFileSync(join(HERE, "AttractMode.jsx"), "utf8").replace(/\r\n/g, "\n")

const approved = [
  ["vespara-ocean-overlook.png", "8cf0ce3f90074020ba2280f390ceaa54668aa230306578a103761c8729e9c012"],
  ["vespara-coliseum.png", "7ad47517e75a27f0aa1b8d4659815e6251cf71104363c7f152b0aaada36a676a"],
  ["vespara-village.png", "0d5a67a90ee4db1b8820723016097896bee3ddd212308d9ba32b23781e8ca91b"],
  ["vespara-open-sky.png", "c9774669b54cbe40d53a65cc12db6d94b2b123da4af5fb429a0bc4375f4fa95e"],
  ["vespara-palace.png", "9f249a952469167cb78312c85b9c5e76e52ce413105fa4db080df48612bfbad3"],
  ["vespara-sunset-isle.png", "2015909adf669f089ad296db13266f8b55a319ce98a730456c6000a2d2df9c69"],
]

test("the fixed model imports all six clearly named approved scene files without byte mutation", () => {
  for (const [filename, expectedHash] of approved) {
    const path = join(HERE, "assets/attract-scenes", filename)
    assert.equal(existsSync(path), true, filename)
    assert.match(sceneModel, new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    assert.equal(createHash("sha256").update(readFileSync(path)).digest("hex"), expectedHash)
  }
})

test("scene order is fixed and advances sequentially even when the game list has one item", () => {
  const ids = ["ocean-overlook", "coliseum", "village", "open-sky", "palace", "sunset-isle"]
  let cursor = -1
  for (const id of ids) {
    const position = sceneModel.indexOf(`id: "${id}"`)
    assert.ok(position > cursor, id)
    cursor = position
  }

  assert.equal(nextAttractSceneIndex(0, 6), 1)
  assert.equal(nextAttractSceneIndex(4, 6), 5)
  assert.equal(nextAttractSceneIndex(5, 6), 0)
  assert.ok(attract.indexOf("nextAttractSceneIndex") < attract.indexOf("if (order.length <= 1) return"))
})

test("approved scenes, never selected-game artwork, own the full-screen background", () => {
  assert.match(attract, /ATTRACT_SCENES\.map/)
  assert.match(attract, /src=\{scene\.image\}/)
  assert.doesNotMatch(sceneModel, /game\.|artwork\?\[|heroPath|capsulePath|videoPath/)
})

test("the concise reason line uses only real system or genre metadata and a neutral fallback", () => {
  assert.equal(getAttractReason({ system: "Arcade", genre: "Racing" }), "From your Arcade collection")
  assert.equal(getAttractReason({ genre: "Adventure" }), "From your Adventure archive")
  assert.equal(getAttractReason({}), "From your library")
  assert.equal(getAttractReason({ system: "   ", genre: "" }), "From your library")
})
