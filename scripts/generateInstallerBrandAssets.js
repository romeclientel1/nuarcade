const fs = require('node:fs')
const path = require('node:path')
const svg2img = require('svg2img')
const png2icons = require('png2icons')
const { PNG } = require('pngjs')

const ROOT = path.join(__dirname, '..')
const ICON_SVG = path.join(ROOT, 'assets', 'icons', 'icon.svg')
const ICON_PNG = path.join(ROOT, 'assets', 'icons', 'icon.png')
const ICON_ICO = path.join(ROOT, 'assets', 'icons', 'icon.ico')
const ICON_ICNS = path.join(ROOT, 'assets', 'icons', 'icon.icns')
const HEADER_SVG = path.join(ROOT, 'assets', 'installer', 'vespara-installer-header.svg')
const HEADER_BMP = path.join(ROOT, 'assets', 'installer', 'vespara-installer-header.bmp')
const SIDEBAR_SVG = path.join(ROOT, 'assets', 'installer', 'vespara-installer-sidebar.svg')
const SIDEBAR_BMP = path.join(ROOT, 'assets', 'installer', 'vespara-installer-sidebar.bmp')

function renderSvg(source, width) {
  return new Promise((resolve, reject) => {
    svg2img(source, {
      resvg: {
        fitTo: { mode: 'width', value: width },
        font: { loadSystemFonts: false },
        logLevel: 'off',
      },
    }, (error, buffer) => error ? reject(error) : resolve(buffer))
  })
}

function pngToBmp(pngBuffer) {
  const image = PNG.sync.read(pngBuffer)
  const rowBytes = Math.ceil((image.width * 3) / 4) * 4
  const pixelBytes = rowBytes * image.height
  const output = Buffer.alloc(54 + pixelBytes)

  output.write('BM', 0, 'ascii')
  output.writeUInt32LE(output.length, 2)
  output.writeUInt32LE(54, 10)
  output.writeUInt32LE(40, 14)
  output.writeInt32LE(image.width, 18)
  output.writeInt32LE(image.height, 22)
  output.writeUInt16LE(1, 26)
  output.writeUInt16LE(24, 28)
  output.writeUInt32LE(pixelBytes, 34)
  output.writeInt32LE(2835, 38)
  output.writeInt32LE(2835, 42)

  for (let y = 0; y < image.height; y += 1) {
    const sourceY = image.height - 1 - y
    const rowOffset = 54 + y * rowBytes
    for (let x = 0; x < image.width; x += 1) {
      const sourceOffset = (sourceY * image.width + x) * 4
      const targetOffset = rowOffset + x * 3
      const alpha = image.data[sourceOffset + 3] / 255
      output[targetOffset] = Math.round(image.data[sourceOffset + 2] * alpha)
      output[targetOffset + 1] = Math.round(image.data[sourceOffset + 1] * alpha)
      output[targetOffset + 2] = Math.round(image.data[sourceOffset] * alpha)
    }
  }

  return output
}

async function main() {
  const iconPng = await renderSvg(ICON_SVG, 1024)
  fs.writeFileSync(ICON_PNG, iconPng)

  const iconIco = png2icons.createICO(iconPng, png2icons.BICUBIC2, 0, false, true)
  const iconIcns = png2icons.createICNS(iconPng, png2icons.BICUBIC2, 0)
  if (!iconIco || !iconIcns) throw new Error('Platform icon generation failed')
  fs.writeFileSync(ICON_ICO, iconIco)
  fs.writeFileSync(ICON_ICNS, iconIcns)

  const headerPng = await renderSvg(HEADER_SVG, 150)
  const sidebarPng = await renderSvg(SIDEBAR_SVG, 164)
  fs.writeFileSync(HEADER_BMP, pngToBmp(headerPng))
  fs.writeFileSync(SIDEBAR_BMP, pngToBmp(sidebarPng))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
