const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

async function generateIcons() {
  const svgPath = path.join(__dirname, '../public/icon.svg')
  const publicDir = path.join(__dirname, '../public')

  if (!fs.existsSync(svgPath)) {
    console.error('icon.svg not found at:', svgPath)
    process.exit(1)
  }

  const svgBuffer = fs.readFileSync(svgPath)

  console.log('Generating PWA icons from public/icon.svg...')

  // 1. icon-192.png (192x192)
  await sharp(svgBuffer)
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'icon-192.png'))
  console.log('✓ Generated public/icon-192.png')

  // 2. icon-512.png (512x512)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'icon-512.png'))
  console.log('✓ Generated public/icon-512.png')

  // 3. apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'))
  console.log('✓ Generated public/apple-touch-icon.png')

  // 4. icon-maskable.png (512x512 with 60px safe padding on all sides with royal blue background #2563EB)
  // Maskable icons require the graphic to be inside the safe inner 80% circle
  const innerSize = Math.round(512 * 0.76) // ~390px
  const innerBuffer = await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 37, g: 99, b: 235, alpha: 1 }, // #2563EB
    },
  })
    .composite([
      {
        input: innerBuffer,
        gravity: 'center',
      },
    ])
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'icon-maskable.png'))
  console.log('✓ Generated public/icon-maskable.png (with safe-zone adaptive padding)')

  console.log('All PWA icons generated successfully!')
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err)
  process.exit(1)
})

