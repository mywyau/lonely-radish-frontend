import { createError, getRouterParam, setHeader } from 'h3'
import { withDatabaseClient } from '~/server/repositories/db'
import { sharedAvailabilitySuggestions, type AvailabilityWindow } from '~/server/utils/proposalAvailability'
import { requireUser } from '~/server/utils/requireUser'

function structuredWindows(rows: Array<Record<string, unknown>>): AvailabilityWindow[] {
  return rows.filter(row => Number.isInteger(row.weekday) && typeof row.startTime === 'string'
      && typeof row.endTime === 'string')
    .map(row => ({ weekday: Number(row.weekday), startTime: String(row.startTime), endTime: String(row.endTime) }))
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const slug = getRouterParam(event, 'slug')
  const result = await withDatabaseClient(async (database) => {
    const { rows } = await database.query(`select p.user_id as "userId",p.display_name as name,
      coalesce(u.timezone,'UTC') as timezone,coalesce(viewer.timezone,'UTC') as "viewerTimezone"
      from profiles p join users u on u.id=p.user_id join users viewer on viewer.id=$1
      join matches m on m.status='active' and ((m.user_one_id=$1 and m.user_two_id=p.user_id) or (m.user_two_id=$1 and m.user_one_id=p.user_id))
      where p.slug=$2`, [sub,slug])
    if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Active match not found' })
    const activities = await database.query(`select coalesce(a.name,pa.custom_label) as name from profile_activities pa
      left join activities a on a.id=pa.activity_id where pa.user_id=$1 order by pa.position`, [rows[0].userId])
    const proposal = await database.query(`select dp.id,dp.status,dp.activity_label as activity,dp.invite_note as "inviteNote",dp.venue,
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
      group by dp.id order by dp.created_at desc limit 1`, [sub,rows[0].userId])
    const availability = await database.query(`select label,weekday,start_time::text as "startTime",end_time::text as "endTime"
      from availability where user_id=$1 order by coalesce(weekday,position)`, [rows[0].userId])
    const viewerAvailability = await database.query(`select label,weekday,start_time::text as "startTime",end_time::text as "endTime"
      from availability where user_id=$1 order by coalesce(weekday,position)`, [sub])
    const activeProposal = proposal.rows[0] ?? null
    const currentConfirmed = activeProposal?.status === 'accepted'
      ? { id: activeProposal.id, activity: activeProposal.activity, venue: activeProposal.venue,
          venueAddress: activeProposal.venueAddress, venuePostcode: activeProposal.venuePostcode,
          venueDetails: activeProposal.venueDetails, meetingPoint: activeProposal.meetingPoint,
          confirmedTime: activeProposal.times.find((time: { id: string }) => time.id === activeProposal.selectedTimeId)?.proposedAt || null }
      : activeProposal?.replacesProposalId
        ? (await database.query(`select dp.id,dp.activity_label as activity,dp.venue,
          dp.venue_address as "venueAddress",dp.venue_postcode as "venuePostcode",
          dp.venue_details as "venueDetails",dp.venue_details as "meetingPoint",
          selected.proposed_at as "confirmedTime"
          from date_proposals dp left join proposal_times selected on selected.id=dp.selected_time_id
          where dp.id=$1 and dp.status='accepted'`, [activeProposal.replacesProposalId])).rows[0] ?? null
        : null
    return { rows, activities, availability, viewerAvailability, activeProposal, currentConfirmed }
  })
  const { rows, activities, availability, viewerAvailability, activeProposal, currentConfirmed } = result
  const suggestedTimes = sharedAvailabilitySuggestions({
    viewerWindows: structuredWindows(viewerAvailability.rows),
    viewerTimeZone: rows[0].viewerTimezone,
    matchWindows: structuredWindows(availability.rows),
    matchTimeZone: rows[0].timezone,
  })
  return { person: rows[0], activities: activities.rows.map(row => row.name), proposal: activeProposal,
    currentConfirmed,
    availability: availability.rows,
    availabilityTimezone: rows[0].timezone,
    viewerAvailability: viewerAvailability.rows,
    viewerTimezone: rows[0].viewerTimezone,
    suggestedTimes,
    viewerId: sub }
})
