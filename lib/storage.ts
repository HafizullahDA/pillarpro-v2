import { createClient } from '@/lib/supabase/client'
import { AppError } from '@/lib/errors/AppError'

/**
 * Clean and sanitize a filename for safe cloud storage keys.
 */
export function sanitizeStorageFileName(originalName: string): string {
  const clean = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${Date.now()}_${clean}`
}

/**
 * Upload a File or Blob to Supabase Storage with standardized error handling and path generation.
 *
 * @param bucket Storage bucket name (default: 'documents')
 * @param folder Target directory inside bucket (e.g. 'ra_bills', 'receipts', 'supplier_bills')
 * @param file The browser File or Blob object
 * @returns Public or storage download URL
 */
export async function uploadDocumentToStorage(
  folder: string,
  file: File | Blob,
  fileName?: string,
  bucket = 'documents'
): Promise<string> {
  const supabase = createClient()
  const name = fileName || (file instanceof File ? file.name : 'upload.jpg')
  const sanitized = sanitizeStorageFileName(name)
  const filePath = `${folder}/${sanitized}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { cacheControl: '3600', upsert: true })

  if (uploadError) {
    throw new AppError(`Failed to upload attachment: ${uploadError.message}`, 500)
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return data.publicUrl
}

