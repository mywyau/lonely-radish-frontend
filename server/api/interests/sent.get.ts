import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrl } from '~/server/utils/supabaseStorage'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`select di.id,di.sender_day as "sentOn",di.created_at as "createdAt",
    p.slug,p.display_name as name,p.neighbourhood as place,matched.status as "matchStatus",
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl"
    from daily_interests di join profiles p on p.user_id=di.recipient_id
    left join lateral (select storage_key,public_url from profile_photos where user_id=p.user_id order by position limit 1) photo on true
    left join lateral (select m.status from matches m where
      (m.user_one_id=$1 and m.user_two_id=di.recipient_id) or (m.user_two_id=$1 and m.user_one_id=di.recipient_id)
      order by m.matched_at desc limit 1) matched on true
    where di.sender_id=$1 order by di.created_at desc limit 100`, [sub])
  const interests = await Promise.all(rows.map(async row => ({ ...row,
    matched: row.matchStatus === 'active', ended: row.matchStatus === 'unmatched' || row.matchStatus === 'blocked',
    photoStorageKey: undefined, legacyPhotoUrl: undefined,
    photoUrl: row.photoStorageKey ? await signedPhotoUrl(row.photoStorageKey) : row.legacyPhotoUrl || null,
  })))
  return { interests }
})
