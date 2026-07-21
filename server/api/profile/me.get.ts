import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrl } from '~/server/utils/supabaseStorage'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const [profile, photos, availability] = await Promise.all([
    db.query(`select slug,display_name as "displayName",date_of_birth as "dateOfBirth",pronouns,bio,
      neighbourhood,visibility from profiles where user_id=$1`, [sub]),
    db.query(`select id,public_url as url,storage_key as "storageKey",alt_text as "altText",position
      from profile_photos where user_id=$1 order by position`, [sub]),
    db.query(`select label from availability where user_id=$1 order by position`, [sub]),
  ])
  return { profile: profile.rows[0] ?? null, photos: await Promise.all(photos.rows.map(async photo => ({
    ...photo, url: photo.storageKey ? await signedPhotoUrl(photo.storageKey) : photo.url,
  }))), availability: availability.rows.map(row => row.label) }
})
