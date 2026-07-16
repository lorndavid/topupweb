/**
 * Generate PNG PWA icons from the SVG source.
 * 
 * Usage: node scripts/generate-pwa-icons.js
 * 
 * Requires: npm install canvas
 * If canvas fails to install, SVG icons in the manifest still work
 * for Chrome/Android (the majority of users).
 */
const fs = require('fs')
const path = require('path')

const SIZES = [180, 192, 512]
const SVG_PATH = path.resolve(__dirname, '../frontend/public/pwa-icon.svg')

async function generate() {
  let sharp
  try {
    sharp = require('sharp')
  } catch {
    console.log('⚠️  sharp not installed. Run: npm install --save-dev sharp')
    console.log('   SVG icons will work for Chrome/Android users.')
    console.log('   iOS users will see a generic icon on home screen.')
    process.exit(0)
  }

  const svgBuffer = fs.readFileSync(SVG_PATH)

  for (const size of SIZES) {
    const pngPath = path.resolve(__dirname, `../frontend/public/pwa-icon-${size}x${size}.png`)
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(pngPath)
    
    console.log(`✅ Generated ${pngPath} (${size}x${size})`)
  }

  console.log('\n🎉 All PWA icons generated!')
}

generate().catch(console.error)
