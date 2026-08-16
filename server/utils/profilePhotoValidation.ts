import sharp, { type Sharp } from 'sharp'

export type ProfilePhotoContentType = 'image/jpeg' | 'image/webp'
type PhotoVariant = 'full' | 'thumbnail'

const VARIANT_LIMITS: Record<PhotoVariant, { bytes: number; dimension: number }> = {
  full: { bytes: 1024 * 1024, dimension: 1600 },
  thumbnail: { bytes: 200 * 1024, dimension: 480 },
}
const MAX_INPUT_PIXELS = 25_000_000

function expectedFormat(contentType: ProfilePhotoContentType) {
  return contentType === 'image/jpeg' ? 'jpeg' : 'webp'
}

async function encode(image: Sharp, contentType: ProfilePhotoContentType, quality: number) {
  return contentType === 'image/jpeg'
    ? image.clone().jpeg({ quality, mozjpeg: true }).toBuffer()
    : image.clone().webp({ quality }).toBuffer()
}

export async function sanitizeProfilePhoto(
  input: Buffer,
  contentType: ProfilePhotoContentType,
  variant: PhotoVariant,
) {
  const limits = VARIANT_LIMITS[variant]
  if (!Buffer.isBuffer(input) || input.byteLength < 1 || input.byteLength > limits.bytes) {
    throw new Error('Photo size is invalid')
  }

  const source = sharp(input, { failOn: 'warning', limitInputPixels: MAX_INPUT_PIXELS })
  const metadata = await source.metadata()
  if (metadata.format !== expectedFormat(contentType) || !metadata.width || !metadata.height) {
    throw new Error('Photo content does not match its declared file type')
  }

  // Re-encoding strips EXIF/GPS metadata and rejects malformed image payloads.
  const normalized = source.rotate().resize({
    width: limits.dimension,
    height: limits.dimension,
    fit: 'inside',
    withoutEnlargement: true,
  })
  for (const quality of [82, 72, 62, 52]) {
    const output = await encode(normalized, contentType, quality)
    if (output.byteLength <= limits.bytes) return output
  }
  throw new Error('Photo could not be stored within the size limit')
}
