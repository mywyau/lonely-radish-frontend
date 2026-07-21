import { randomUUID } from 'node:crypto'
import { readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { badRequest, integer, objectBody, text } from '~/server/utils/productValidation'
import { photoOwnerFolder, PROFILE_PHOTO_BUCKET, storageAdmin } from '~/server/utils/supabaseStorage'
import { enforceRateLimit } from '~/server/utils/rate-limiting/rateLimit'

const allowedTypes: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  await enforceRateLimit(`rl:photo-upload:${sub}`, 12, 60 * 60)
  const body = objectBody(await readBody(event))
  const contentType = text(body.contentType, 'File type', 100, true)!
  const size = integer(body.size, 'File size', 1, 5 * 1024 * 1024)
  if (!allowedTypes[contentType]) badRequest('Photos must be JPEG, PNG, or WebP')
  const { rows } = await db.query('select count(*)::int as count from profile_photos where user_id=$1', [sub])
  if (Number(rows[0]?.count || 0) >= 6) badRequest('You can upload up to six photos')
  const storageKey = `${photoOwnerFolder(sub)}/${randomUUID()}.${allowedTypes[contentType]}`
  const { data, error } = await storageAdmin().storage.from(PROFILE_PHOTO_BUCKET).createSignedUploadUrl(storageKey)
  if (error) throw createError({ statusCode: 502, statusMessage: 'Could not prepare photo upload' })
  return { path: data.path, token: data.token, contentType, size }
})
