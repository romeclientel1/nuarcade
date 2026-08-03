const path = require('path')

function isSameOrInside(candidate, root) {
  if (!candidate || !root) return false
  const c = path.resolve(candidate).toLowerCase()
  const r = path.resolve(root).toLowerCase().replace(/[\\/]$/, '')
  return c === r || c.startsWith(r + path.sep)
}

// Resolve one media category independently. EmuMovies always wins, then the
// NuArcade-scraped asset, then an existing/placeholder value.
function resolveMediaAsset({ emuMovies, scraped, existing, placeholder } = {}) {
  return emuMovies || scraped || existing || placeholder || null
}

function resolveMediaCategories(categories = {}) {
  const result = {}
  for (const [category, values] of Object.entries(categories)) {
    result[category] = resolveMediaAsset(values)
  }
  return result
}

module.exports = { isSameOrInside, resolveMediaAsset, resolveMediaCategories }
