import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, stringArray, text, badRequest } from '~/server/utils/productValidation'
import { ensureTimesFitSharedAvailability } from '~/server/utils/proposalAvailability'
import { isUkPostcode, normalizeUkPostcode } from '~/utils/ukPostcode'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const profileSlug = text(body.profileSlug, 'Profile', 80, true)
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
    const match = await client.query(`select m.id,p.user_id from profiles p join matches m on m.status='active'
      and ((m.user_one_id=$1 and m.user_two_id=p.user_id) or (m.user_two_id=$1 and m.user_one_id=p.user_id)) where p.slug=$2`, [sub,profileSlug])
    if (!match.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Active match not found' })
    await ensureTimesFitSharedAvailability(client, [sub,match.rows[0].user_id], times)
    const proposal = await client.query(`insert into date_proposals(match_id,inviter_id,invitee_id,
      activity_label,invite_note,venue,venue_address,venue_postcode,venue_details,public_venue_confirmed_at,status)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),'draft') returning id,status,created_at as "createdAt"`,
      [match.rows[0].id,sub,match.rows[0].user_id,activity,inviteNote,venue,venueAddress,venuePostcode,venueDetails])
    for (const [index,time] of times.entries()) await client.query('insert into proposal_times(proposal_id,proposed_at,position) values($1,$2,$3)', [proposal.rows[0].id,time.toISOString(),index+1])
    await client.query(`update matches set action_completed_at=now()
      where id=$1 and action_required_by=$2 and action_completed_at is null`, [match.rows[0].id,sub])
    await client.query('commit')
    return { ...proposal.rows[0], activity, inviteNote, venue, venueAddress, venuePostcode,
      meetingPoint: venueDetails, venueDetails, times: times.map(value => value.toISOString()) }
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
})
