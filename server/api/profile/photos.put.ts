import { readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text, badRequest } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  if (!Array.isArray(body.photos) || body.photos.length > 6) badRequest('You can save up to six photos')
  const photos = body.photos.map((value, index) => {
    const photo = objectBody(value)
    return { url: text(photo.url, 'Photo URL', 2000, true), storageKey: text(photo.storageKey, 'Storage key', 500),
      altText: text(photo.altText, 'Alternative text', 200), position: index + 1 }
  })
  const client = await db.connect()
  try {
    await client.query('begin')
    await client.query('delete from profile_photos where user_id=$1', [sub])
    for (const photo of photos) await client.query(`insert into profile_photos(user_id,public_url,storage_key,alt_text,position)
      values($1,$2,$3,$4,$5)`, [sub,photo.url,photo.storageKey,photo.altText,photo.position])
    await client.query('commit')
    return { photos }
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
})
