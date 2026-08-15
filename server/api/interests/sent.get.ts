import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrls } from '~/server/utils/supabaseStorage'
import { expirePendingInterests } from '~/server/utils/interestLifecycle'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  await expirePendingInterests(db, { senderId: sub })
  const { rows } = await db.query(`with latest_sent as (
    select di.*,row_number() over(
      partition by di.recipient_id order by di.created_at desc,di.id desc
    ) as recipient_rank
    from daily_interests di where di.sender_id=$1
  )
    select di.id,di.sender_day as "sentOn",di.created_at as "createdAt",
    di.resolution,di.resolved_at as "resolvedAt",
    di.created_at+interval '14 days' as "expiresAt",
    p.slug,p.display_name as name,p.neighbourhood as place,matched.status as "matchStatus",
    (matched.status='unmatched' and matched.ended_by=$1 and di.created_at>matched.ended_at
      and exists(select 1 from match_apology_notes note where note.match_id=matched.id
        and note.sender_id=$1 and note.message_type='apology'
        and note.created_at>matched.ended_at and note.created_at<di.created_at)) as "reconnectRequest",
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl"
    from latest_sent di join profiles p on p.user_id=di.recipient_id
    left join lateral (select coalesce(thumbnail_storage_key,storage_key) as storage_key,public_url
      from profile_photos where user_id=p.user_id order by position limit 1) photo on true
    left join lateral (select m.id,m.status,m.ended_at,m.ended_by from matches m where
      (m.user_one_id=$1 and m.user_two_id=di.recipient_id) or (m.user_two_id=$1 and m.user_one_id=di.recipient_id)
      order by coalesce(m.ended_at,m.matched_at) desc limit 1) matched on true
    where di.recipient_rank=1 and not exists(select 1 from blocks b where
      (b.blocker_id=$1 and b.blocked_id=di.recipient_id)
      or (b.blocker_id=di.recipient_id and b.blocked_id=$1))
    order by di.created_at desc limit 100`, [sub])
  const photoUrls = await signedPhotoUrls(rows.map(row => row.photoStorageKey).filter(Boolean))
  const interests = rows.map(row => ({ ...row,
    matched: row.matchStatus === 'active', queued: row.matchStatus === 'queued',
    reconnectRequest: row.reconnectRequest === true,
    ended: (row.matchStatus === 'unmatched' || row.matchStatus === 'blocked')
      && row.reconnectRequest !== true,
    photoStorageKey: undefined, legacyPhotoUrl: undefined,
    photoUrl: row.photoStorageKey ? photoUrls.get(row.photoStorageKey) : row.legacyPhotoUrl || null,
  }))
  return { interests }
})
