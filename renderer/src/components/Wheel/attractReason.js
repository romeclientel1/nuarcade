const clean = (value) => typeof value === "string" ? value.trim() : ""

export function getAttractReason(game = {}) {
  const system = clean(game.system)
  if (system) return `From your ${system} collection`

  const genre = clean(game.genre)
  if (genre) return `From your ${genre} archive`

  return "From your library"
}
