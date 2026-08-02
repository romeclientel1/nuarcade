export function resolveAttractMedia({ game = {}, artwork = {}, errors = {}, reducedMotion = false }) {
  const videoUrl = game.videoPath || null
  const heroUrl = artwork.hero || game.heroPath || null
  const capsuleUrl = artwork.capsule || game.boxArtPath || null

  if (!reducedMotion && videoUrl && !errors.video) {
    return { mediaKind: "video", videoUrl, heroUrl, capsuleUrl }
  }
  if (heroUrl && !errors.hero) {
    return { mediaKind: "hero", videoUrl, heroUrl, capsuleUrl }
  }
  if (capsuleUrl && !errors.capsule) {
    return { mediaKind: "capsule", videoUrl, heroUrl, capsuleUrl }
  }
  return { mediaKind: "none", videoUrl, heroUrl, capsuleUrl }
}
