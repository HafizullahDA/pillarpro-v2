/**
 * Extracts raw base64 data and mime type from a base64 Data URL or raw base64 string.
 */
export function parseBase64Payload(input: string, defaultMime = 'image/jpeg'): { base64Data: string; mimeType: string } {
  if (!input) {
    return { base64Data: '', mimeType: defaultMime }
  }

  let mimeType = defaultMime
  let base64Data = input

  if (input.includes(',')) {
    const parts = input.split(',')
    const header = parts[0]
    base64Data = parts[1] || ''

    const match = header.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64/)
    if (match && match[1]) {
      mimeType = match[1]
    }
  } else {
    // If no header, detect common prefixes or signatures if possible
    if (input.startsWith('data:image/png')) mimeType = 'image/png'
    else if (input.startsWith('data:image/webp')) mimeType = 'image/webp'
    else if (input.startsWith('data:application/pdf')) mimeType = 'application/pdf'
  }

  return { base64Data, mimeType }
}

