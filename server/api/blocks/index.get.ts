import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrl } from '~/server/utils/supabaseStorage'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`select p.slug,p.display_name as name,b.created_at as "blockedAt",
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl"
    from blocks b
    join profiles p on p.user_id=b.blocked_id
    left join lateral (select storage_key,public_url from profile_photos
      where user_id=b.blocked_id order by position limit 1) photo on true
    where b.blocker_id=$1 order by b.created_at desc`, [sub])
  const blockedUsers = await Promise.all(rows.map(async row => ({
    slug: row.slug, name: row.name, blockedAt: row.blockedAt,
    photoUrl: row.photoStorageKey ? await signedPhotoUrl(row.photoStorageKey) : row.legacyPhotoUrl || null,
  })))
  return { blockedUsers }
})
