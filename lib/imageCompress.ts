/**
 * Client-side canvas image compression utility.
 * Compresses oversized phone camera photos (10-25 MB) down to lightweight JPEGs (< 1 MB)
 * before uploading or sending to the Gemini Vision API.
 */

export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image.'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to decode image.'))
      img.onload = () => {
        let { width, height } = img

        // Calculate aspect-ratio-preserved scaled dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          // Fallback to raw base64 if canvas 2D context unavailable
          resolve(reader.result as string)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedBase64)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
