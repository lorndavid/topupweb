import sharp from 'sharp'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const logoPath = join(publicDir, 'logo.png')

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'pwa-icon-180x180.png', size: 180 },
  { name: 'pwa-icon-192x192.png', size: 192 },
  { name: 'pwa-icon-512x512.png', size: 512 },
]

async function main() {
  const logo = await readFile(logoPath)

  for (const { name, size } of sizes) {
    await sharp(logo)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(join(publicDir, name))
    console.log(`✅ ${name} (${size}x${size})`)
  }
}

main().catch(console.error)
