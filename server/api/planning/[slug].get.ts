import { createError, getRouterParam, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const slug = getRouterParam(event, 'slug')
  const { rows } = await db.query(`select p.user_id as "userId",p.display_name as name,
    coalesce(u.timezone,'UTC') as timezone from profiles p join users u on u.id=p.user_id
    join matches m on m.status='active' and ((m.user_one_id=$1 and m.user_two_id=p.user_id) or (m.user_two_id=$1 and m.user_one_id=p.user_id))
    where p.slug=$2`, [sub,slug])
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Active match not found' })
  const [activities, proposal, availability] = await Promise.all([db.query(`select coalesce(a.name,pa.custom_label) as name from profile_activities pa
    left join activities a on a.id=pa.activity_id where pa.user_id=$1 order by pa.position`, [rows[0].userId])
    , db.query(`select dp.id,dp.status,dp.activity_label as activity,dp.invite_note as "inviteNote",dp.venue,
      dp.venue_address as "venueAddress",dp.venue_postcode as "venuePostcode",
      dp.venue_details as "venueDetails",dp.venue_details as "meetingPoint",
      dp.public_venue_confirmed_at is not null as "publicVenueConfirmed",
      dp.replaces_proposal_id as "replacesProposalId",
      dp.inviter_id as "inviterId",dp.invitee_id as "inviteeId",dp.selected_time_id as "selectedTimeId",
      coalesce(json_agg(json_build_object('id',pt.id,'proposedAt',pt.proposed_at) order by pt.position)
        filter(where pt.id is not null),'[]'::json) as times
      from date_proposals dp left join proposal_times pt on pt.proposal_id=dp.id
      where dp.match_id=(select m.id from matches m where m.status='active' and
        ((m.user_one_id=$1 and m.user_two_id=$2) or (m.user_two_id=$1 and m.user_one_id=$2)))
        and dp.status in ('draft','pending','accepted') and (dp.status<>'draft' or dp.inviter_id=$1)
      group by dp.id order by dp.created_at desc limit 1`, [sub,rows[0].userId]),
    db.query(`select label,weekday,start_time::text as "startTime",end_time::text as "endTime"
      from availability where user_id=$1 order by coalesce(weekday,position)`, [rows[0].userId])])
  const activeProposal = proposal.rows[0] ?? null
  const currentConfirmed = activeProposal?.replacesProposalId
    ? (await db.query(`select dp.id,dp.activity_label as activity,dp.venue,
        dp.venue_address as "venueAddress",dp.venue_postcode as "venuePostcode",
        dp.venue_details as "venueDetails",dp.venue_details as "meetingPoint",
        selected.proposed_at as "confirmedTime"
        from date_proposals dp left join proposal_times selected on selected.id=dp.selected_time_id
        where dp.id=$1 and dp.status='accepted'`, [activeProposal.replacesProposalId])).rows[0] ?? null
    : activeProposal?.status === 'accepted'
      ? { id: activeProposal.id, activity: activeProposal.activity, venue: activeProposal.venue,
          venueAddress: activeProposal.venueAddress, venuePostcode: activeProposal.venuePostcode,
          venueDetails: activeProposal.venueDetails, meetingPoint: activeProposal.meetingPoint,
          confirmedTime: activeProposal.times.find((time: { id: string }) => time.id === activeProposal.selectedTimeId)?.proposedAt || null }
      : null
  return { person: rows[0], activities: activities.rows.map(row => row.name), proposal: activeProposal,
    currentConfirmed,
    availability: availability.rows,
    availabilityTimezone: rows[0].timezone, viewerId: sub }
})
