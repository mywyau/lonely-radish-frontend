import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { badRequest, objectBody, stringArray, text } from '~/server/utils/productValidation'
import { ensureTimesFitSharedAvailability } from '~/server/utils/proposalAvailability'
import { enforceRateLimit } from '~/server/utils/rate-limiting/rateLimit'
import { isUkPostcode, normalizeUkPostcode } from '~/utils/ukPostcode'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  await enforceRateLimit(`rl:proposal-update:${sub}`, 20, 60 * 60)
  const id = getRouterParam(event, 'id')
  const body = objectBody(await readBody(event))
  const fullReproposal = body.fullReproposal === true
  const activity = text(body.activity, 'Activity', 100, true)
  const inviteNote = text(body.inviteNote, 'Invite note', 240)
  const venue = text(body.venue, 'Venue', 200, true)
  const venueAddress = text(body.venueAddress, 'Public address', 300, true)
  const venuePostcode = normalizeUkPostcode(text(body.venuePostcode, 'Postcode', 12, true))
  if (!isUkPostcode(venuePostcode)) badRequest('Enter a valid UK postcode')
  const venueDetails = text(body.meetingPoint ?? body.venueDetails, 'Meeting point', 300)
  if (body.publicVenueConfirmed !== true) badRequest('Confirm that this is a public meeting place')
  const times = stringArray(body.times, 'Proposed time', 1, 40).map(value => new Date(value))
  if (times.length !== 1 || times.some(value => Number.isNaN(value.getTime()) || value <= new Date())) badRequest('Choose one future time')
  const client = await db.connect()
  try {
    await client.query('begin')
    const existing = await client.query(`select id,status,inviter_id as "inviterId",invitee_id as "inviteeId",
      match_id as "matchId",activity_label as activity,invite_note as "inviteNote",venue_details as "venueDetails"
      from date_proposals where id=$1 and status in ('draft','pending')
        and ($2=inviter_id or $2=invitee_id) for update`, [id,sub])
    const current = existing.rows[0]
    if (!current) throw createError({ statusCode: 404, statusMessage: 'Date proposal not found' })
    const senderEditingDraft = current.inviterId === sub && ['draft','pending'].includes(current.status)
    const recipientSuggestingChange = current.inviteeId === sub && current.status === 'pending'
    const recipientReproposing = current.inviteeId === sub && current.status === 'pending' && fullReproposal
    if (!senderEditingDraft && !recipientSuggestingChange) {
      throw createError({ statusCode: 404, statusMessage: 'Date proposal not found' })
    }
    const otherUserId = current.inviterId === sub ? current.inviteeId : current.inviterId
    await ensureTimesFitSharedAvailability(client, [sub,otherUserId], times)
    const proposal = await client.query(`update date_proposals set
      activity_label=$3,invite_note=$4,venue=$5,venue_address=$6,venue_postcode=$7,venue_details=$8,
      public_venue_confirmed_at=now(),status=$9,selected_time_id=null,confirmed_at=null,inviter_id=$2,invitee_id=$10
      where id=$1 returning id,status,match_id as "matchId",invitee_id as "inviteeId",
        activity_label as activity,invite_note as "inviteNote"`,
      [id,sub,senderEditingDraft || recipientReproposing ? activity : current.activity,
        senderEditingDraft || recipientSuggestingChange ? inviteNote : current.inviteNote,
        venue,venueAddress,venuePostcode,venueDetails,senderEditingDraft ? 'draft' : 'pending',
        current.inviterId === sub ? current.inviteeId : current.inviterId])
    await client.query('delete from proposal_times where proposal_id=$1', [id])
    for (const [index,time] of times.entries()) await client.query(`insert into proposal_times(proposal_id,proposed_at,position)
      values($1,$2,$3)`, [id,time.toISOString(),index+1])
    if (senderEditingDraft && current.status === 'pending') await client.query(`update notifications
      set read_at=coalesce(read_at,now())
      where proposal_id=$1 and recipient_id=$2
        and kind in ('proposal_received','date_reschedule_requested','proposal_updated')`, [id,current.inviteeId])
    if (!senderEditingDraft) await client.query(`insert into notifications(recipient_id,actor_id,match_id,proposal_id,kind)
      values($1,$2,$3,$4,'proposal_updated')
      on conflict(recipient_id,proposal_id,kind)
        where proposal_id is not null
          and kind in ('proposal_received','date_reschedule_requested','proposal_updated')
      do update set actor_id=excluded.actor_id,match_id=excluded.match_id,
        read_at=null,created_at=now()`, [proposal.rows[0].inviteeId,sub,proposal.rows[0].matchId,id])
    await client.query('commit')
    return { ...proposal.rows[0], venue, venueAddress, venuePostcode, meetingPoint: venueDetails,
      venueDetails, times: times.map(time => time.toISOString()) }
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
})
