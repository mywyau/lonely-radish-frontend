import { readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'
import { sanitizeProfilePhoto, type ProfilePhotoContentType } from '~/server/utils/profilePhotoValidation'
import { photoOwnerFolder, PROFILE_PHOTO_BUCKET, signedPhotoUrl, storageAdmin } from '~/server/utils/supabaseStorage'

const MAX_PHOTO_BYTES = 1024 * 1024
const MAX_THUMBNAIL_BYTES = 200 * 1024
const ACCEPTED_CONTENT_TYPES = new Set(['image/webp', 'image/jpeg'])

function objectMetadata(object: any) {
  return {
    contentType: String(object?.contentType || object?.metadata?.mimetype || '').toLowerCase().split(';')[0],
    size: Number(object?.size || object?.metadata?.size || object?.metadata?.contentLength || 0),
  }
}

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const storageKey = text(body.storageKey, 'Storage key', 500, true)!
  const thumbnailStorageKey = text(body.thumbnailStorageKey, 'Thumbnail storage key', 500, true)!
  const altText = text(body.altText, 'Alternative text', 200)
  const ownerPrefix = `${photoOwnerFolder(sub)}/`
  if (!storageKey.startsWith(ownerPrefix) || !thumbnailStorageKey.startsWith(ownerPrefix) || storageKey === thumbnailStorageKey) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid photo path' })
  }

  const bucket = storageAdmin().storage.from(PROFILE_PHOTO_BUCKET)
  const [photoInfo, thumbnailInfo] = await Promise.all([
    bucket.info(storageKey),
    bucket.info(thumbnailStorageKey),
  ])
  if (photoInfo.error || !photoInfo.data || thumbnailInfo.error || !thumbnailInfo.data) {
    await bucket.remove([storageKey, thumbnailStorageKey])
    throw createError({ statusCode: 409, statusMessage: 'Upload could not be verified' })
  }

  const photo = objectMetadata(photoInfo.data)
  const thumbnail = objectMetadata(thumbnailInfo.data)
  if (!ACCEPTED_CONTENT_TYPES.has(photo.contentType) || !ACCEPTED_CONTENT_TYPES.has(thumbnail.contentType)
    || photo.size < 1 || photo.size > MAX_PHOTO_BYTES
    || thumbnail.size < 1 || thumbnail.size > MAX_THUMBNAIL_BYTES) {
    await bucket.remove([storageKey, thumbnailStorageKey])
    throw createError({ statusCode: 415, statusMessage: 'Uploaded file is not an accepted photo' })
  }

  const [photoDownload, thumbnailDownload] = await Promise.all([
    bucket.download(storageKey),
    bucket.download(thumbnailStorageKey),
  ])
  if (photoDownload.error || !photoDownload.data || thumbnailDownload.error || !thumbnailDownload.data) {
    await bucket.remove([storageKey, thumbnailStorageKey])
    throw createError({ statusCode: 409, statusMessage: 'Upload could not be inspected' })
  }

  let normalizedPhoto: Buffer
  let normalizedThumbnail: Buffer
  try {
    [normalizedPhoto, normalizedThumbnail] = await Promise.all([
      sanitizeProfilePhoto(
        Buffer.from(await photoDownload.data.arrayBuffer()),
        photo.contentType as ProfilePhotoContentType,
        'full',
      ),
      sanitizeProfilePhoto(
        Buffer.from(await thumbnailDownload.data.arrayBuffer()),
        thumbnail.contentType as ProfilePhotoContentType,
        'thumbnail',
      ),
    ])
  } catch {
    await bucket.remove([storageKey, thumbnailStorageKey])
    throw createError({ statusCode: 415, statusMessage: 'Uploaded file is not a valid photo' })
  }

  const [photoUpdate, thumbnailUpdate] = await Promise.all([
    bucket.update(storageKey, normalizedPhoto, {
      contentType: photo.contentType,
      cacheControl: '31536000',
      upsert: true,
    }),
    bucket.update(thumbnailStorageKey, normalizedThumbnail, {
      contentType: thumbnail.contentType,
      cacheControl: '31536000',
      upsert: true,
    }),
  ])
  if (photoUpdate.error || thumbnailUpdate.error) {
    await bucket.remove([storageKey, thumbnailStorageKey])
    throw createError({ statusCode: 502, statusMessage: 'Photo could not be secured for storage' })
  }

  const { rows } = await db.query(`insert into profile_photos(
      user_id,public_url,storage_key,thumbnail_storage_key,alt_text,position
    )
    select $1,$2,$2,$3,$4,coalesce(max(position),0)+1 from profile_photos where user_id=$1
    having coalesce(max(position),0)<6
    returning id,storage_key as "storageKey",thumbnail_storage_key as "thumbnailStorageKey",
      alt_text as "altText",position`, [sub, storageKey, thumbnailStorageKey, altText])
  if (!rows[0]) {
    await bucket.remove([storageKey, thumbnailStorageKey])
    throw createError({ statusCode: 409, statusMessage: 'You can save up to six photos' })
  }
  return { ...rows[0], url: await signedPhotoUrl(storageKey) }
})
