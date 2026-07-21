import { readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'
import { photoOwnerFolder, PROFILE_PHOTO_BUCKET, signedPhotoUrl, storageAdmin } from '~/server/utils/supabaseStorage'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const storageKey = text(body.storageKey, 'Storage key', 500, true)!
  const altText = text(body.altText, 'Alternative text', 200)
  if (!storageKey.startsWith(`${photoOwnerFolder(sub)}/`)) throw createError({ statusCode: 403, statusMessage: 'Invalid photo path' })
  const { data: object, error } = await storageAdmin().storage.from(PROFILE_PHOTO_BUCKET).info(storageKey)
  if (error || !object) throw createError({ statusCode: 409, statusMessage: 'Upload could not be verified' })
  const contentType = String(object.contentType || object.metadata?.mimetype || '').toLowerCase().split(';')[0]
  const size = Number(object.size || object.metadata?.size || object.metadata?.contentLength || 0)
  const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp']
  if (!acceptedTypes.includes(contentType) || size < 1 || size > 5 * 1024 * 1024) {
    await storageAdmin().storage.from(PROFILE_PHOTO_BUCKET).remove([storageKey])
    throw createError({ statusCode: 415, statusMessage: 'Uploaded file is not an accepted photo' })
  }
  const { rows } = await db.query(`insert into profile_photos(user_id,public_url,storage_key,alt_text,position)
    select $1,$2,$2,$3,coalesce(max(position),0)+1 from profile_photos where user_id=$1
    having coalesce(max(position),0)<6 returning id,storage_key as "storageKey",alt_text as "altText",position`, [sub, storageKey, altText])
  if (!rows[0]) {
    await storageAdmin().storage.from(PROFILE_PHOTO_BUCKET).remove([storageKey])
    throw createError({ statusCode: 409, statusMessage: 'You can save up to six photos' })
  }
  return { ...rows[0], url: await signedPhotoUrl(storageKey) }
})
