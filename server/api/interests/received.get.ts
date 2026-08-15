import { setHeader } from 'h3'
import { withDatabaseClient } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrls } from '~/server/utils/supabaseStorage'
import { getActiveMatchLimit } from '~/server/utils/planLimits'
import { expirePendingInterests } from '~/server/utils/interestLifecycle'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const result = await withDatabaseClient(async (database) => {
    await expirePendingInterests(database, { recipientId: sub })
    const interestsResult = await database.query(`select di.id,di.created_at as "createdAt",p.slug,p.display_name as name,
    extract(year from age(current_date,p.date_of_birth))::int as age,p.neighbourhood as place,
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl",
    case when matched.status='unmatched' and di.created_at>matched.ended_at then null else matched.status end as "matchStatus",
    coalesce(matched.status='unmatched' and matched.ended_by=di.sender_id
      and di.created_at>matched.ended_at and reconnect_note.message is not null,false) as "reconnectRequest",
    reconnect_note.message as "reconnectNote",
    coalesce(tags.items,'{}'::text[]) as "activityTags",count(*) over()::int as "pendingInterestCount"
    from daily_interests di
    join profiles p on p.user_id=di.sender_id and p.visibility='active'
    join users u on u.id=di.sender_id and (u.account_status='active' or
      (u.account_status='paused' and u.paused_until is not null and u.paused_until<=now()))
    left join lateral (select coalesce(thumbnail_storage_key,storage_key) as storage_key,public_url
      from profile_photos where user_id=p.user_id order by position limit 1) photo on true
    left join lateral (select m.id,m.status,m.ended_at,m.ended_by from matches m where
      (m.user_one_id=$1 and m.user_two_id=di.sender_id) or (m.user_two_id=$1 and m.user_one_id=di.sender_id)
      order by m.matched_at desc limit 1) matched on true
    left join lateral (select man.message from match_apology_notes man
      where man.match_id=matched.id and man.sender_id=di.sender_id and man.recipient_id=$1
        and man.message_type='apology' and man.created_at>matched.ended_at and man.created_at<di.created_at
      order by man.created_at desc limit 1) reconnect_note on true
    left join lateral (select array_agg(coalesce(a.name,pa.custom_label) order by pa.position) as items
      from profile_activities pa left join activities a on a.id=pa.activity_id where pa.user_id=di.sender_id) tags on true
    where di.recipient_id=$1 and di.resolved_at is null and di.inbox_bypassed=false and not exists(select 1 from blocks b where
      (b.blocker_id=$1 and b.blocked_id=di.sender_id) or (b.blocker_id=di.sender_id and b.blocked_id=$1))
    and not exists(select 1 from matches ended where ended.status='unmatched'
      and ((ended.user_one_id=$1 and ended.user_two_id=di.sender_id) or (ended.user_two_id=$1 and ended.user_one_id=di.sender_id))
      and (di.sender_id is distinct from ended.ended_by or di.created_at<=ended.ended_at or not exists(select 1 from match_apology_notes man
        where man.match_id=ended.id and man.sender_id=di.sender_id and man.created_at>ended.ended_at
          and di.sender_id=ended.ended_by and man.message_type='apology')))
    order by di.created_at asc limit 5`, [sub])
    const closedInterests = await database.query(`with ranked_closed as (
      select di.*,row_number() over(partition by di.sender_id order by di.created_at desc,di.id desc) as sender_rank
      from daily_interests di
      where di.recipient_id=$1 and di.resolution in ('expired','withdrawn')
        and not exists(select 1 from daily_interests pending where pending.sender_id=di.sender_id
          and pending.recipient_id=di.recipient_id and pending.resolved_at is null)
    ) select di.id,di.created_at as "createdAt",
      di.resolution,di.resolved_at as "resolvedAt",p.slug,p.display_name as name,
      photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl",
      coalesce(matched.status='unmatched' and matched.ended_by=di.sender_id
        and di.created_at>matched.ended_at and exists(select 1 from match_apology_notes man
          where man.match_id=matched.id and man.sender_id=di.sender_id
            and man.message_type='apology' and man.created_at>matched.ended_at
            and man.created_at<di.created_at),false) as "reconnectRequest"
      from ranked_closed di join profiles p on p.user_id=di.sender_id
      left join lateral (select coalesce(thumbnail_storage_key,storage_key) as storage_key,public_url
        from profile_photos where user_id=p.user_id order by position limit 1) photo on true
      left join lateral (select m.id,m.status,m.ended_at,m.ended_by from matches m where
        (m.user_one_id=$1 and m.user_two_id=di.sender_id) or (m.user_two_id=$1 and m.user_one_id=di.sender_id)
        order by m.matched_at desc limit 1) matched on true
      where di.sender_rank=1 and not exists(select 1 from blocks b where
          (b.blocker_id=$1 and b.blocked_id=di.sender_id)
          or (b.blocker_id=di.sender_id and b.blocked_id=$1))
      order by di.resolved_at desc limit 25`, [sub])
    const active = await database.query(`select count(*)::int as count from matches where status='active'
      and (user_one_id=$1 or user_two_id=$1)`, [sub])
    const activeMatchLimit = await getActiveMatchLimit(sub, database)
    const pendingAction = await database.query(`select m.id,p.display_name as name from matches m join profiles p
      on p.user_id=case when m.user_one_id=$1 then m.user_two_id else m.user_one_id end
      where m.status='active' and m.action_required_by=$1 and m.action_completed_at is null
      order by m.matched_at limit 1`, [sub])
    return { rows: interestsResult.rows, closedRows: closedInterests.rows,
      active, activeMatchLimit, pendingAction }
  })
  const { rows, closedRows, active, activeMatchLimit, pendingAction } = result
  const photoUrls = await signedPhotoUrls([...rows,...closedRows]
    .map(row => row.photoStorageKey).filter(Boolean))
  const interests = rows.map(row => ({
    id: row.id, slug: row.slug, name: row.name, age: row.age, place: row.place || 'Nearby',
    createdAt: row.createdAt, activityTags: row.activityTags.slice(0, 5), matchStatus: row.matchStatus || null,
    reconnectRequest: row.reconnectRequest === true, reconnectNote: row.reconnectNote || null,
    photoUrl: row.photoStorageKey ? photoUrls.get(row.photoStorageKey) : row.legacyPhotoUrl || null,
  }))
  const closedInterests = closedRows.map(row => ({
    id: row.id, slug: row.slug, name: row.name, createdAt: row.createdAt,
    resolution: row.resolution, resolvedAt: row.resolvedAt, reconnectRequest: row.reconnectRequest,
    photoUrl: row.photoStorageKey ? photoUrls.get(row.photoStorageKey) : row.legacyPhotoUrl || null,
  }))
  const pendingInterestCount = rows[0]?.pendingInterestCount || 0
  return { interests, closedInterests, pendingInterestCount, interestLimit: 5,
    hasMore: pendingInterestCount > interests.length,
    activeMatchCount: active.rows[0]?.count || 0, activeMatchLimit,
    yourMoveMatch: pendingAction.rows[0] || null }
})
