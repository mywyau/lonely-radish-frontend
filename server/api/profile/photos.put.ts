import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { badRequest, objectBody, stringArray } from '~/server/utils/productValidation'
import { signedPhotoUrl } from '~/server/utils/supabaseStorage'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const ids = stringArray(objectBody(await readBody(event)).photoIds, 'Photo order', 6)
  if (new Set(ids).size !== ids.length) badRequest('Photo order contains duplicates')
  const current = await db.query(`select id,public_url,storage_key,alt_text from profile_photos where user_id=$1`, [sub])
  const currentIds = new Set(current.rows.map(photo => String(photo.id)))
  if (current.rows.length !== ids.length || ids.some(id => !currentIds.has(id))) {
    throw createError({ statusCode: 409, statusMessage: 'Photo list changed; refresh before reordering' })
  }
  const byId = new Map(current.rows.map(photo => [String(photo.id), photo]))
  const client = await db.connect()
  try {
    await client.query('begin')
    await client.query('delete from profile_photos where user_id=$1', [sub])
    for (const [index, id] of ids.entries()) {
      const photo = byId.get(id)
      await client.query(`insert into profile_photos(id,user_id,public_url,storage_key,alt_text,position)
        values($1,$2,$3,$4,$5,$6)`, [id,sub,photo.public_url,photo.storage_key,photo.alt_text,index+1])
    }
    await client.query('commit')
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
  return { photos: await Promise.all(ids.map(async (id, index) => {
    const photo = byId.get(id); return { id, storageKey: photo.storage_key, altText: photo.alt_text,
      position: index + 1, url: await signedPhotoUrl(photo.storage_key) }
  })) }
})
