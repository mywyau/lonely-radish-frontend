import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { PROFILE_PHOTO_BUCKET, storageAdmin } from '~/server/utils/supabaseStorage'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const { rows } = await db.query('select storage_key from profile_photos where id=$1 and user_id=$2', [id, sub])
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
  const storageKey = rows[0].storage_key
  if (storageKey) {
    const { error } = await storageAdmin().storage.from(PROFILE_PHOTO_BUCKET).remove([storageKey])
    if (error) throw createError({ statusCode: 502, statusMessage: 'Could not delete stored photo' })
  }
  const client = await db.connect()
  try {
    await client.query('begin')
    await client.query('delete from profile_photos where id=$1 and user_id=$2', [id, sub])
    const remaining = await client.query(`select id,public_url,storage_key,alt_text from profile_photos
      where user_id=$1 order by position`, [sub])
    await client.query('delete from profile_photos where user_id=$1', [sub])
    for (const [index, photo] of remaining.rows.entries()) await client.query(`insert into profile_photos
      (id,user_id,public_url,storage_key,alt_text,position) values($1,$2,$3,$4,$5,$6)`,
      [photo.id,sub,photo.public_url,photo.storage_key,photo.alt_text,index+1])
    await client.query('commit')
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
  return { deleted: true }
})
