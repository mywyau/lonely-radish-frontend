import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { badRequest, objectBody, stringArray } from '~/server/utils/productValidation'
import { signedPhotoUrls } from '~/server/utils/supabaseStorage'

interface StoredPhoto {
  id: string
  public_url: string | null
  storage_key: string
  thumbnail_storage_key: string | null
  alt_text: string | null
}

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const ids = stringArray(objectBody(await readBody(event)).photoIds, 'Photo order', 6)
  if (new Set(ids).size !== ids.length) badRequest('Photo order contains duplicates')
  const current = await db.query<StoredPhoto>(`select id,public_url,storage_key,thumbnail_storage_key,alt_text
    from profile_photos where user_id=$1`, [sub])
  const currentIds = new Set(current.rows.map(photo => String(photo.id)))
  if (current.rows.length !== ids.length || ids.some(id => !currentIds.has(id))) {
    throw createError({ statusCode: 409, statusMessage: 'Photo list changed; refresh before reordering' })
  }
  const byId = new Map(current.rows.map(photo => [String(photo.id), photo]))
  const orderedPhotos = ids.map((id) => {
    const photo = byId.get(id)
    if (!photo) throw createError({ statusCode: 409, statusMessage: 'Photo list changed; refresh before reordering' })
    return photo
  })
  const client = await db.connect()
  try {
    await client.query('begin')
    await client.query('delete from profile_photos where user_id=$1', [sub])
    for (const [index, photo] of orderedPhotos.entries()) {
      await client.query(`insert into profile_photos(
          id,user_id,public_url,storage_key,thumbnail_storage_key,alt_text,position
        ) values($1,$2,$3,$4,$5,$6,$7)`,
      [photo.id,sub,photo.public_url,photo.storage_key,photo.thumbnail_storage_key,photo.alt_text,index+1])
    }
    await client.query('commit')
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
  const photoUrls = await signedPhotoUrls(orderedPhotos.map(photo => photo.storage_key))
  return { photos: orderedPhotos.map((photo, index) => {
    return { id: photo.id, storageKey: photo.storage_key,
      thumbnailStorageKey: photo.thumbnail_storage_key, altText: photo.alt_text,
      position: index + 1, url: photoUrls.get(photo.storage_key) }
  }) }
})
