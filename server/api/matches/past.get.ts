import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrl } from '~/server/utils/supabaseStorage'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`select m.id,m.ended_reason as "endedReason",m.ended_at as "endedAt",
    m.ended_by=$1 as "endedByMe",p.slug,p.display_name as name,
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl",
    proposal.id as "proposalId",proposal.activity_label as activity,
    coalesce(followup.can_reconsider,false) as "canReconsider"
    from matches m join profiles p on p.user_id=case when m.user_one_id=$1 then m.user_two_id else m.user_one_id end
    left join lateral (select storage_key,public_url from profile_photos where user_id=p.user_id order by position limit 1) photo on true
    left join lateral (select dp.id,dp.activity_label from date_proposals dp where dp.match_id=m.id order by dp.created_at desc limit 1) proposal on true
    left join lateral (select mine.meet_again=false and theirs.meet_again=true and mine.reconsidered_at is null as can_reconsider
      from date_follow_ups mine join date_follow_ups theirs on theirs.proposal_id=mine.proposal_id and theirs.user_id<>$1
      where mine.proposal_id=proposal.id and mine.user_id=$1) followup on true
    where m.status='unmatched' and ($1=m.user_one_id or $1=m.user_two_id)
    order by coalesce(m.ended_at,m.matched_at) desc limit 100`, [sub])
  const connections = await Promise.all(rows.map(async row => ({ ...row,
    canViewProfile: row.endedByMe === true || row.canReconsider === true,
    photoStorageKey: undefined, legacyPhotoUrl: undefined,
    photoUrl: row.photoStorageKey ? await signedPhotoUrl(row.photoStorageKey) : row.legacyPhotoUrl || null,
  })))
  return { connections }
})
