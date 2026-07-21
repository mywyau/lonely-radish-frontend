import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrl } from '~/server/utils/supabaseStorage'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`select m.id,p.slug,p.display_name as name,p.neighbourhood as place,
    count(*) over()::int as "totalMatches",
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl",m.matched_at as "matchedAt",
    proposal.id as "proposalId",proposal.status as "proposalStatus",proposal.activity_label as activity,
    proposal.venue,proposal.inviter_id as "inviterId",proposal.invitee_id as "inviteeId",
    proposal.confirmed_at as "confirmedAt",selected.proposed_at as "confirmedTime",
    my_followup.meet_again as "myMeetAgain",my_followup.responded_at as "myFollowUpAt",
    their_followup.meet_again as "theirMeetAgain",their_followup.responded_at as "theirFollowUpAt",
    coalesce((select json_agg(json_build_object('id',pt.id,'proposedAt',pt.proposed_at) order by pt.position)
      from proposal_times pt where pt.proposal_id=proposal.id),'[]'::json) as times
    from matches m
    join profiles p on p.user_id=case when m.user_one_id=$1 then m.user_two_id else m.user_one_id end
    left join lateral (select storage_key,public_url from profile_photos where user_id=p.user_id order by position limit 1) photo on true
    left join lateral (select dp.* from date_proposals dp where dp.match_id=m.id order by dp.created_at desc limit 1) proposal on true
    left join proposal_times selected on selected.id=proposal.selected_time_id
    left join date_follow_ups my_followup on my_followup.proposal_id=proposal.id and my_followup.user_id=$1
    left join date_follow_ups their_followup on their_followup.proposal_id=proposal.id and their_followup.user_id<>$1
    where m.status='active' and (m.user_one_id=$1 or m.user_two_id=$1)
      and p.visibility='active' order by coalesce(proposal.updated_at,m.matched_at) desc limit 5`, [sub])

  const matches = await Promise.all(rows.map(async row => {
    const proposalStatus = row.proposalStatus as string | null
    const stage = proposalStatus === 'accepted' ? 'confirmed'
      : proposalStatus === 'pending' ? 'planning' : 'fresh'
    const photoUrl = row.photoStorageKey ? await signedPhotoUrl(row.photoStorageKey) : row.legacyPhotoUrl || null
    const dateHasPassed = Boolean(row.confirmedTime && new Date(row.confirmedTime) <= new Date())
    const bothFollowedUp = Boolean(row.myFollowUpAt && row.theirFollowUpAt)
    const followUpResult = !bothFollowedUp ? null : row.myMeetAgain === true && row.theirMeetAgain === true ? 'mutual' : 'closed'
    return { ...row, photoStorageKey: undefined, legacyPhotoUrl: undefined, theirMeetAgain: undefined, photoUrl, stage,
      dateHasPassed, bothFollowedUp, followUpResult, hasFollowedUp: Boolean(row.myFollowUpAt),
      isInviter: row.inviterId === sub, needsResponse: proposalStatus === 'pending' && row.inviteeId === sub }
  }))
  return { matches, totalMatches: rows[0]?.totalMatches || 0 }
})
