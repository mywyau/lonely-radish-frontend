import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrls } from '~/server/utils/supabaseStorage'
import { getActiveMatchLimit } from '~/server/utils/planLimits'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const [{ rows }, receivedInterest, activeCount, manualCount, activeMatchLimit] = await Promise.all([
    db.query(`select m.id,m.status,p.slug,p.display_name as name,p.neighbourhood as place,
    count(*) over()::int as "totalMatches",
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl",m.matched_at as "matchedAt",
    proposal.id as "proposalId",proposal.status as "proposalStatus",proposal.activity_label as activity,
    proposal.venue,proposal.inviter_id as "inviterId",proposal.invitee_id as "inviteeId",
    proposal.replaces_proposal_id as "replacesProposalId",
    proposal.confirmed_at as "confirmedAt",selected.proposed_at as "confirmedTime",
    replaced_selected.proposed_at as "currentConfirmedTime",
    attached_offer.id as "offerClaimId",attached_offer.offer_id as "attachedOfferId",
    attached_offer.offer_title as "attachedOfferTitle",
    m.action_required_by=$1 and m.action_completed_at is null as "yourMove",
    my_attendance.response as "myAttendance",their_attendance.response as "theirAttendance",
    my_followup.meet_again as "myMeetAgain",my_followup.responded_at as "myFollowUpAt",
    their_followup.meet_again as "theirMeetAgain",their_followup.responded_at as "theirFollowUpAt",
    coalesce((select json_agg(json_build_object('id',pt.id,'proposedAt',pt.proposed_at) order by pt.position)
      from proposal_times pt where pt.proposal_id=proposal.id),'[]'::json) as times
    from matches m
    join profiles p on p.user_id=case when m.user_one_id=$1 then m.user_two_id else m.user_one_id end
    left join lateral (select coalesce(thumbnail_storage_key,storage_key) as storage_key,public_url
      from profile_photos where user_id=p.user_id order by position limit 1) photo on true
    left join lateral (select dp.* from date_proposals dp where dp.match_id=m.id
      and (dp.status<>'draft' or dp.inviter_id=$1)
      order by (dp.status in ('draft','pending','accepted')) desc,dp.created_at desc limit 1) proposal on true
    left join proposal_times selected on selected.id=proposal.selected_time_id
    left join date_proposals replaced on replaced.id=proposal.replaces_proposal_id and replaced.status='accepted'
    left join proposal_times replaced_selected on replaced_selected.id=replaced.selected_time_id
    left join lateral (select c.id,c.offer_id,c.offer_title from business_offer_claims c
      where c.proposal_id=proposal.id and c.status<>'revoked'
      order by c.claimed_at desc limit 1) attached_offer on true
    left join date_attendance_responses my_attendance on my_attendance.proposal_id=proposal.id and my_attendance.user_id=$1
    left join date_attendance_responses their_attendance on their_attendance.proposal_id=proposal.id and their_attendance.user_id<>$1
    left join date_follow_ups my_followup on my_followup.proposal_id=proposal.id and my_followup.user_id=$1
    left join date_follow_ups their_followup on their_followup.proposal_id=proposal.id and their_followup.user_id<>$1
    where m.status in ('active','queued') and (m.user_one_id=$1 or m.user_two_id=$1)
      and p.visibility='active' order by (m.status='active') desc,coalesce(proposal.updated_at,m.matched_at) desc limit 25`, [sub]),
    db.query(`select count(distinct di.sender_id)::int as count
      from daily_interests di
      join users u on u.id=di.sender_id and (u.account_status='active' or
        (u.account_status='paused' and u.paused_until is not null and u.paused_until<=now()))
      join profiles p on p.user_id=di.sender_id and p.visibility='active'
      where di.recipient_id=$1 and di.declined_at is null and not exists(select 1 from blocks b where
        (b.blocker_id=$1 and b.blocked_id=di.sender_id) or (b.blocker_id=di.sender_id and b.blocked_id=$1))
      and not exists(select 1 from matches ended where ended.status='unmatched'
        and ((ended.user_one_id=$1 and ended.user_two_id=di.sender_id)
          or (ended.user_two_id=$1 and ended.user_one_id=di.sender_id))
        and (di.created_at<=ended.ended_at or not exists(select 1 from match_apology_notes man
          where man.match_id=ended.id and man.sender_id=di.sender_id and man.created_at>ended.ended_at
            and ((di.sender_id=ended.ended_by and man.message_type='apology')
              or (di.sender_id is distinct from ended.ended_by and man.message_type='contact')))))`, [sub]),
    db.query(`select count(*)::int as count from matches where status='active'
      and (user_one_id=$1 or user_two_id=$1)`, [sub]),
    db.query(`select count(*)::int as count from matches where status='active'
      and action_required_by=$1 and action_completed_at is null`, [sub]),
    getActiveMatchLimit(sub),
  ])

  const photoUrls = await signedPhotoUrls(rows.map(row => row.photoStorageKey).filter(Boolean))
  const matches = rows.map(row => {
    const proposalStatus = row.proposalStatus as string | null
    const stage = row.status === 'queued' ? 'queued' : proposalStatus === 'accepted' ? 'confirmed'
      : ['draft','pending'].includes(proposalStatus || '') ? 'planning' : 'fresh'
    const photoUrl = row.photoStorageKey ? photoUrls.get(row.photoStorageKey) : row.legacyPhotoUrl || null
    const dateHasPassed = Boolean(row.confirmedTime && new Date(row.confirmedTime) <= new Date())
    const bothFollowedUp = Boolean(row.myFollowUpAt && row.theirFollowUpAt)
    const followUpResult = !bothFollowedUp ? null : row.myMeetAgain === true && row.theirMeetAgain === true ? 'mutual' : 'closed'
    const hasActiveProposal = ['draft','pending','accepted'].includes(proposalStatus || '')
    return { ...row, activity: hasActiveProposal ? row.activity : null, venue: hasActiveProposal ? row.venue : null,
      photoStorageKey: undefined, legacyPhotoUrl: undefined, theirMeetAgain: undefined, photoUrl, stage,
      dateHasPassed, bothFollowedUp, followUpResult, hasFollowedUp: Boolean(row.myFollowUpAt),
      attendanceConfirmed: row.myAttendance === 'confirmed', otherAttendanceConfirmed: row.theirAttendance === 'confirmed',
      isInviter: row.inviterId === sub, isReschedule: Boolean(row.replacesProposalId),
      needsResponse: proposalStatus === 'pending' && row.inviteeId === sub }
  })
  return { matches, totalMatches: rows[0]?.totalMatches || 0,
    activeMatchCount: activeCount.rows[0]?.count || 0,
    manualMatchCount: manualCount.rows[0]?.count || 0, manualMatchLimit: 1,
    interestReceivedCount: receivedInterest.rows[0]?.count || 0, activeMatchLimit }
})
