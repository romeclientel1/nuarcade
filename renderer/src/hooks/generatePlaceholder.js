// Generates a styled SVG data URL as a fallback when no artwork is found
// Produces a unique card per game using title + system as seeds

const SYSTEM_PALETTES = {
  MAME:               { bg: '#0d0600', accent: '#ff6600', text: '#ffaa44' },
  NES:                { bg: '#00060d', accent: '#e60012', text: '#ff4455' },
  SNES:               { bg: '#060010', accent: '#7b12e6', text: '#bb66ff' },
  Genesis:            { bg: '#000d06', accent: '#0099cc', text: '#44ccff' },
  'Game Boy':         { bg: '#060c00', accent: '#8bac0f', text: '#c4dc2a' },
  GBC:                { bg: '#050010', accent: '#9900cc', text: '#cc44ff' },
  GBA:                { bg: '#000510', accent: '#0044aa', text: '#4488ff' },
  'Nintendo 64':      { bg: '#0a0010', accent: '#e4000f', text: '#ff4444' },
  PlayStation:        { bg: '#000510', accent: '#003791', text: '#4488ff' },
  'PlayStation 2':    { bg: '#00001a', accent: '#003791', text: '#3366cc' },
  'PlayStation 3':    { bg: '#000d1a', accent: '#0070d1', text: '#44aaff' },
  'PlayStation Portable': { bg: '#000a15', accent: '#0057a8', text: '#4499ee' },
  Dreamcast:          { bg: '#0d0600', accent: '#ff6600', text: '#ffaa00' },
  'Nintendo Wii':     { bg: '#0a0a10', accent: '#c0c0c0', text: '#ffffff' },
  GameCube:           { bg: '#0d001a', accent: '#6b21a8', text: '#aa66ff' },
  'Wii U':            { bg: '#000510', accent: '#009ac7', text: '#44ccff' },
  'Nintendo Switch':  { bg: '#1a0000', accent: '#e4000f', text: '#ff4444' },
  'Xbox 360':         { bg: '#001a00', accent: '#107c10', text: '#44cc44' },
  'Visual Pinball X': { bg: '#1a0a00', accent: '#ff6600', text: '#ffaa44' },
  RetroArch:           { bg: '#12001f', accent: '#9933ff', text: '#c88cff' },
}

function hashStr(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function wrapText(text, maxLen) {
  if (text.length <= maxLen) return [text]
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxLen) {
      if (line) lines.push(line.trim())
      line = word
    } else {
      line = (line + ' ' + word).trim()
    }
  }
  if (line) lines.push(line.trim())
  return lines.slice(0, 3)
}

export function generatePlaceholderSvg(game) {
  const palette = SYSTEM_PALETTES[game.system] || { bg: '#0a0a0a', accent: '#444', text: '#888' }
  const hash = hashStr(game.title || '')

  // Generate subtle grid lines for texture
  const gridSpacing = 20 + (hash % 20)
  const gridOpacity = 0.04 + (hash % 5) * 0.01

  // Glow position varies by hash
  const glowX = 30 + (hash % 40)
  const glowY = 20 + ((hash >> 4) % 40)

  const titleLines = wrapText(game.title || 'Unknown', 14)
  const system = game.system || ''

  // Icon is first 2 chars of system acronym or emulator
  const iconText = game.icon && game.icon.length <= 3
    ? game.icon
    : (game.system || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  const titleY = titleLines.length === 1 ? 178 : titleLines.length === 2 ? 170 : 162

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width="200" height="280">
  <defs>
    <radialGradient id="glow" cx="${glowX}%" cy="${glowY}%" r="60%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${palette.bg}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="transparent"/>
      <stop offset="60%" stop-color="${palette.bg}" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="${palette.bg}" stop-opacity="0.98"/>
    </linearGradient>
    <clipPath id="round"><rect width="200" height="280" rx="8"/></clipPath>
  </defs>
  <g clip-path="url(#round)">
    <rect width="200" height="280" fill="${palette.bg}"/>
    <rect width="200" height="280" fill="url(#glow)"/>
    ${Array.from({ length: Math.ceil(280 / gridSpacing) }, (_, i) =>
      `<line x1="0" y1="${i * gridSpacing}" x2="200" y2="${i * gridSpacing}" stroke="${palette.accent}" stroke-opacity="${gridOpacity}" stroke-width="0.5"/>`
    ).join('')}
    ${Array.from({ length: Math.ceil(200 / gridSpacing) }, (_, i) =>
      `<line x1="${i * gridSpacing}" y1="0" x2="${i * gridSpacing}" y2="280" stroke="${palette.accent}" stroke-opacity="${gridOpacity}" stroke-width="0.5"/>`
    ).join('')}
    <text x="100" y="118" text-anchor="middle" font-family="monospace" font-size="42" font-weight="900" fill="${palette.accent}" opacity="0.9">${iconText}</text>
    <circle cx="100" cy="100" r="38" fill="none" stroke="${palette.accent}" stroke-opacity="0.15" stroke-width="1"/>
    <rect width="200" height="280" fill="url(#fade)"/>
    ${titleLines.map((line, i) =>
      `<text x="100" y="${titleY + i * 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="${palette.text}">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`
    ).join('')}
    <text x="100" y="${titleY + titleLines.length * 18 + 6}" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="${palette.accent}" opacity="0.6">${system.replace(/&/g, '&amp;')}</text>
    <rect x="0" y="0" width="200" height="280" rx="8" fill="none" stroke="${palette.accent}" stroke-opacity="0.12" stroke-width="1"/>
  </g>
</svg>`

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
