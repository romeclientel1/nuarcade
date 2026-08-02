import oceanOverlook from "./assets/attract-scenes/vespara-ocean-overlook.png"
import coliseum from "./assets/attract-scenes/vespara-coliseum.png"
import village from "./assets/attract-scenes/vespara-village.png"
import openSky from "./assets/attract-scenes/vespara-open-sky.png"
import palace from "./assets/attract-scenes/vespara-palace.png"
import sunsetIsle from "./assets/attract-scenes/vespara-sunset-isle.png"

// Approved fixed order. These backgrounds belong to Vespara, never to the
// selected game's artwork or metadata.
export const ATTRACT_SCENES = Object.freeze([
  { id: "ocean-overlook", name: "The Ocean Overlook", image: oceanOverlook },
  { id: "coliseum", name: "The Coliseum", image: coliseum },
  { id: "village", name: "The Village", image: village },
  { id: "open-sky", name: "The Open Sky", image: openSky },
  { id: "palace", name: "The Palace", image: palace },
  { id: "sunset-isle", name: "The Sunset Isle", image: sunsetIsle },
])
