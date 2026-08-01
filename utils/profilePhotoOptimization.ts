export const MAX_SOURCE_PHOTO_BYTES = 20 * 1024 * 1024
export const MAX_STORED_PHOTO_BYTES = 1024 * 1024
export const MAX_STORED_THUMBNAIL_BYTES = 200 * 1024

const FULL_MAX_DIMENSION = 1600
const FULL_TARGET_BYTES = 450 * 1024
const THUMBNAIL_MAX_DIMENSION = 480
const THUMBNAIL_TARGET_BYTES = 80 * 1024
const OUTPUT_QUALITIES = [.82, .74, .66, .58, .5]

type LoadedImage = {
  source: CanvasImageSource
  width: number
  height: number
  dispose: () => void
}

export type OptimizedProfilePhoto = {
  full: File
  thumbnail: File
  originalBytes: number
}

export function scaledDimensions(width: number, height: number, maxDimension: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error('The photo dimensions could not be read.')
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function optimizedName(name: string, contentType: string, suffix = '') {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'profile-photo'
  return `${base}${suffix}.${contentType === 'image/webp' ? 'webp' : 'jpg'}`
}

function canvasToBlob(canvas: HTMLCanvasElement, contentType: 'image/webp' | 'image/jpeg', quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob?.type === contentType ? blob : null)
    }, contentType, quality)
  })
}

async function loadImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      }
    } catch {
      // Older WebKit versions expose createImageBitmap but reject its orientation option.
      // Loading through an HTML image keeps those browsers on the supported path below.
    }
  }

  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  image.decoding = 'async'
  image.src = objectUrl
  await image.decode()
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dispose: () => URL.revokeObjectURL(objectUrl),
  }
}

async function encodeVariant(
  image: LoadedImage,
  maxDimension: number,
  targetBytes: number,
) {
  let smallest: Blob | null = null
  let contentType: 'image/webp' | 'image/jpeg' = 'image/webp'

  for (const dimensionScale of [1, .88, .76]) {
    const dimensions = scaledDimensions(image.width, image.height, Math.round(maxDimension * dimensionScale))
    const canvas = document.createElement('canvas')
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('The browser could not prepare this photo.')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image.source, 0, 0, dimensions.width, dimensions.height)

    for (const quality of OUTPUT_QUALITIES) {
      let blob = await canvasToBlob(canvas, contentType, quality)
      if (!blob && contentType === 'image/webp') {
        contentType = 'image/jpeg'
        blob = await canvasToBlob(canvas, contentType, quality)
      }
      if (!blob) throw new Error('This browser could not optimise the photo. Try a different JPEG or PNG image.')
      if (!smallest || blob.size < smallest.size) smallest = blob
      if (blob.size <= targetBytes) return blob
    }
  }

  if (!smallest) throw new Error('The photo could not be optimised.')
  return smallest
}

export async function optimizeProfilePhoto(file: File): Promise<OptimizedProfilePhoto> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP photo.')
  }
  if (file.size < 1 || file.size > MAX_SOURCE_PHOTO_BYTES) {
    throw new Error('Choose a photo up to 20 MB.')
  }

  const image = await loadImage(file)
  try {
    const [fullBlob, thumbnailBlob] = await Promise.all([
      encodeVariant(image, FULL_MAX_DIMENSION, FULL_TARGET_BYTES),
      encodeVariant(image, THUMBNAIL_MAX_DIMENSION, THUMBNAIL_TARGET_BYTES),
    ])

    if (fullBlob.size > MAX_STORED_PHOTO_BYTES || thumbnailBlob.size > MAX_STORED_THUMBNAIL_BYTES) {
      throw new Error('This photo could not be reduced enough. Try a smaller image.')
    }

    return {
      full: new File([fullBlob], optimizedName(file.name, fullBlob.type), { type: fullBlob.type, lastModified: file.lastModified }),
      thumbnail: new File([thumbnailBlob], optimizedName(file.name, thumbnailBlob.type, '-thumbnail'), { type: thumbnailBlob.type, lastModified: file.lastModified }),
      originalBytes: file.size,
    }
  } finally {
    image.dispose()
  }
}
