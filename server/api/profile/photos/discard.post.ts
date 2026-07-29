import { readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'
import { photoOwnerFolder, PROFILE_PHOTO_BUCKET, storageAdmin } from '~/server/utils/supabaseStorage'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const storageKey = text(body.storageKey, 'Storage key', 500, true)!
  const thumbnailStorageKey = text(body.thumbnailStorageKey, 'Thumbnail storage key', 500, true)!
  const ownerPrefix = `${photoOwnerFolder(sub)}/`
  if (!storageKey.startsWith(ownerPrefix) || !thumbnailStorageKey.startsWith(ownerPrefix)) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid photo path' })
  }

  const saved = await db.query(`select 1 from profile_photos where user_id=$1 and
    (storage_key=any($2::text[]) or thumbnail_storage_key=any($2::text[])) limit 1`,
  [sub, [storageKey, thumbnailStorageKey]])
  if (saved.rows[0]) {
    throw createError({ statusCode: 409, statusMessage: 'Saved photos cannot be discarded' })
  }

  const { error } = await storageAdmin().storage.from(PROFILE_PHOTO_BUCKET)
    .remove([storageKey, thumbnailStorageKey])
  if (error) throw createError({ statusCode: 502, statusMessage: 'Temporary photo cleanup failed' })
  return { discarded: true }
})
