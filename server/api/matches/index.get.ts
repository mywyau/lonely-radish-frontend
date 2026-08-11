import { getQuery, setHeader } from 'h3'
import { withDatabaseClient } from '~/server/repositories/db'
import { listNotifications } from '~/server/repositories/notifications'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrls } from '~/server/utils/supabaseStorage'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const includeNotifications = getQuery(event).includeNotifications === 'true'
  const { rows, notificationPage } = await withDatabaseClient(async (database) => {
    const matchResult = await database.query(`with member_matches as materialized (
    select m.* from matches m
    where m.user_one_id=$1 and m.status in ('active','queued')
    union all
    select m.* from matches m
    where m.user_two_id=$1 and m.status in ('active','queued')
  ), visible_matches as materialized (
    select m.*,p.slug,p.display_name as name,p.neighbourhood as place,p.user_id as "profileUserId"
    from member_matches m
    join profiles p on p.user_id=case when m.user_one_id=$1 then m.user_two_id else m.user_one_id end
      and p.visibility='active'
  ), summary as (
    select (select count(*)::int from visible_matches) as "totalMatches",
      count(*) filter(where status='active')::int as "activeMatchCount",
      count(*) filter(where status='active' and action_required_by=$1 and action_completed_at is null)::int
        as "manualMatchCount"
    from member_matches
  ), settings as (
    select case when exists(select 1 from entitlements e where e.user_id=$1
      and e.plan in ('monthly','quarterly','yearly')
      and e.subscription_status in ('active','trialing','past_due')) then 5 else 3 end as "activeMatchLimit",
      coalesce((select pending_count from interest_inbox_state where user_id=$1),0)::int as "interestReceivedCount"
  ), prepared as (
    select m.*,proposal.id as "proposalId",proposal.status as "proposalStatus",
      proposal.activity_label as activity,proposal.venue,proposal.inviter_id as "inviterId",
      proposal.invitee_id as "inviteeId",proposal.replaces_proposal_id as "replacesProposalId",
      proposal.confirmed_at as "confirmedAt",proposal.selected_time_id as "selectedTimeId",
      coalesce(proposal.updated_at,m.matched_at) as "sortAt"
    from visible_matches m
    left join lateral (select dp.id,dp.status,dp.activity_label,dp.venue,dp.inviter_id,dp.invitee_id,
      dp.replaces_proposal_id,dp.confirmed_at,dp.selected_time_id,dp.updated_at
      from date_proposals dp where dp.match_id=m.id
        and (dp.status<>'draft' or dp.inviter_id=$1)
      order by (dp.status in ('draft','pending','accepted')) desc,dp.created_at desc limit 1) proposal on true
  ), limited as materialized (
    select * from prepared
    order by (status='active') desc,"sortAt" desc limit 25
  )
  select limited.id,limited.status,limited.slug,limited.name,limited.place,
    limited."proposalId",limited."proposalStatus",limited.activity,limited.venue,
    limited."inviterId",limited."inviteeId",limited."replacesProposalId",limited."confirmedAt",
    limited.matched_at as "matchedAt",selected.proposed_at as "confirmedTime",
    replaced_selected.proposed_at as "currentConfirmedTime",
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl",
    attached_offer.id as "offerClaimId",attached_offer.offer_id as "attachedOfferId",
    attached_offer.offer_title as "attachedOfferTitle",
    limited.action_required_by=$1 and limited.action_completed_at is null as "yourMove",
    my_attendance.response as "myAttendance",their_attendance.response as "theirAttendance",
    my_followup.meet_again as "myMeetAgain",my_followup.responded_at as "myFollowUpAt",
    their_followup.meet_again as "theirMeetAgain",their_followup.responded_at as "theirFollowUpAt",
    coalesce((select json_agg(json_build_object('id',pt.id,'proposedAt',pt.proposed_at) order by pt.position)
      from proposal_times pt where pt.proposal_id=limited."proposalId"),'[]'::json) as times,
    summary."totalMatches",summary."activeMatchCount",summary."manualMatchCount",
    settings."interestReceivedCount",settings."activeMatchLimit"
  from summary cross join settings
  left join limited on true
  left join lateral (select coalesce(thumbnail_storage_key,storage_key) as storage_key,public_url
    from profile_photos where user_id=limited."profileUserId" order by position limit 1) photo on true
  left join proposal_times selected on selected.id=limited."selectedTimeId"
  left join date_proposals replaced on replaced.id=limited."replacesProposalId" and replaced.status='accepted'
  left join proposal_times replaced_selected on replaced_selected.id=replaced.selected_time_id
  left join lateral (select c.id,c.offer_id,c.offer_title from business_offer_claims c
    where c.proposal_id=limited."proposalId" and c.status<>'revoked'
    order by c.claimed_at desc limit 1) attached_offer on true
  left join date_attendance_responses my_attendance
    on my_attendance.proposal_id=limited."proposalId" and my_attendance.user_id=$1
  left join date_attendance_responses their_attendance
    on their_attendance.proposal_id=limited."proposalId" and their_attendance.user_id<>$1
  left join date_follow_ups my_followup
    on my_followup.proposal_id=limited."proposalId" and my_followup.user_id=$1
  left join date_follow_ups their_followup
    on their_followup.proposal_id=limited."proposalId" and their_followup.user_id<>$1
  order by (limited.status='active') desc,limited."sortAt" desc`, [sub])
    const notificationPage = includeNotifications
      ? await listNotifications(database, sub)
      : null
    return { rows: matchResult.rows, notificationPage }
  })

  const summary = rows[0]
  const matchRows = rows.filter(row => row.id)
  const photoUrls = await signedPhotoUrls(matchRows.map(row => row.photoStorageKey).filter(Boolean))
  const matches = matchRows.map(row => {
    const proposalStatus = row.proposalStatus as string | null
    const stage = row.status === 'queued' ? 'queued' : proposalStatus === 'accepted' ? 'confirmed'
      : ['draft','pending'].includes(proposalStatus || '') ? 'planning' : 'fresh'
    const photoUrl = row.photoStorageKey ? photoUrls.get(row.photoStorageKey) : row.legacyPhotoUrl || null
    const dateHasPassed = Boolean(row.confirmedTime && new Date(row.confirmedTime) <= new Date())
    const bothFollowedUp = Boolean(row.myFollowUpAt && row.theirFollowUpAt)
    const followUpResult = !bothFollowedUp ? null : row.myMeetAgain === true && row.theirMeetAgain === true ? 'mutual' : 'closed'
    const hasActiveProposal = ['draft','pending','accepted'].includes(proposalStatus || '')
    return { ...row, activity: hasActiveProposal ? row.activity : null, venue: hasActiveProposal ? row.venue : null,
      photoStorageKey: undefined, legacyPhotoUrl: undefined, theirMeetAgain: undefined,
      profileUserId: undefined, selectedTimeId: undefined, sortAt: undefined,
      totalMatches: undefined, activeMatchCount: undefined, manualMatchCount: undefined,
      interestReceivedCount: undefined, activeMatchLimit: undefined, photoUrl, stage,
      dateHasPassed, bothFollowedUp, followUpResult, hasFollowedUp: Boolean(row.myFollowUpAt),
      attendanceConfirmed: row.myAttendance === 'confirmed', otherAttendanceConfirmed: row.theirAttendance === 'confirmed',
      isInviter: row.inviterId === sub, isReschedule: Boolean(row.replacesProposalId),
      needsResponse: proposalStatus === 'pending' && row.inviteeId === sub }
  })
  return { matches, totalMatches: summary?.totalMatches || 0,
    activeMatchCount: summary?.activeMatchCount || 0,
    manualMatchCount: summary?.manualMatchCount || 0, manualMatchLimit: 1,
    interestReceivedCount: summary?.interestReceivedCount || 0,
    activeMatchLimit: summary?.activeMatchLimit || 3,
    ...(notificationPage ? {
      notifications: notificationPage.notifications,
      unreadNotificationCount: notificationPage.unreadCount,
    } : {}),
  }
})
