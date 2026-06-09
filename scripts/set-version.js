const fs = require('fs'), path = require('path')
const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node scripts/set-version.js 3.x.x'); process.exit(1)
}
const root = path.join(__dirname, '..')
const updates = [
  [path.join(root, 'package.json'), /"version":\s*"[^"]+"/, `"version": "${version}"`],
  [path.join(root, 'renderer/src/hooks/useVersionCheck.js'), /CURRENT_VERSION = "[^"]+"/, `CURRENT_VERSION = "${version}"`],
  [path.join(root, 'renderer/src/App.jsx'), /const VERSION = "[^"]+"/, `const VERSION = "${version}"`],
  [path.join(root, 'renderer/src/components/Intro/Intro.jsx'), /v\d+\.\d+\.\d+<\/div>/, `v${version}</div>`],
  [path.join(root, 'renderer/src/components/Wheel/AttractMode.jsx'), /v\d+\.\d+\.\d+<\/div>/, `v${version}</div>`],
]
updates.forEach(([file, pattern, replacement]) => {
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(pattern, replacement))
  console.log(`OK: ${path.basename(file)}`)
})
console.log(`\nAll files updated to v${version}`)
