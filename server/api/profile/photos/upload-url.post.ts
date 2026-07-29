import { randomUUID } from 'node:crypto'
import { readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { badRequest, integer, objectBody, text } from '~/server/utils/productValidation'
import { photoOwnerFolder, PROFILE_PHOTO_BUCKET, storageAdmin } from '~/server/utils/supabaseStorage'
import { enforceRateLimit } from '~/server/utils/rate-limiting/rateLimit'

const MAX_PHOTO_BYTES = 1024 * 1024
const MAX_THUMBNAIL_BYTES = 200 * 1024

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  await enforceRateLimit(`rl:photo-upload:${sub}`, 12, 60 * 60)
  const body = objectBody(await readBody(event))
  const contentType = text(body.contentType, 'File type', 100, true)!
  const size = integer(body.size, 'File size', 1, MAX_PHOTO_BYTES)
  const thumbnailSize = integer(body.thumbnailSize, 'Thumbnail size', 1, MAX_THUMBNAIL_BYTES)
  if (contentType !== 'image/webp') badRequest('Photos must be optimised as WebP before upload')
  const { rows } = await db.query('select count(*)::int as count from profile_photos where user_id=$1', [sub])
  if (Number(rows[0]?.count || 0) >= 6) badRequest('You can upload up to six photos')
  const id = randomUUID()
  const storageKey = `${photoOwnerFolder(sub)}/${id}.webp`
  const thumbnailStorageKey = `${photoOwnerFolder(sub)}/${id}-thumbnail.webp`
  const bucket = storageAdmin().storage.from(PROFILE_PHOTO_BUCKET)
  const [photoUpload, thumbnailUpload] = await Promise.all([
    bucket.createSignedUploadUrl(storageKey),
    bucket.createSignedUploadUrl(thumbnailStorageKey),
  ])
  if (photoUpload.error || thumbnailUpload.error) {
    throw createError({ statusCode: 502, statusMessage: 'Could not prepare photo upload' })
  }
  return {
    photo: { path: photoUpload.data.path, token: photoUpload.data.token },
    thumbnail: { path: thumbnailUpload.data.path, token: thumbnailUpload.data.token },
    contentType,
    size,
    thumbnailSize,
  }
})
