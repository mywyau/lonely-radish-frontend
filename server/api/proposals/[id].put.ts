import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { badRequest, objectBody, stringArray, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = objectBody(await readBody(event))
  const fullReproposal = body.fullReproposal === true
  const activity = text(body.activity, 'Activity', 100, true)
  const inviteNote = text(body.inviteNote, 'Invite note', 240)
  const venue = text(body.venue, 'Venue', 200, true)
  const venueDetails = text(body.venueDetails, 'Address or meeting details', 300)
  const times = stringArray(body.times, 'Proposed time', 1, 40).map(value => new Date(value))
  if (times.length !== 1 || times.some(value => Number.isNaN(value.getTime()) || value <= new Date())) badRequest('Choose one future time')
  const client = await db.connect()
  try {
    await client.query('begin')
    const existing = await client.query(`select id,status,inviter_id as "inviterId",invitee_id as "inviteeId",
      match_id as "matchId",activity_label as activity,invite_note as "inviteNote",venue_details as "venueDetails"
      from date_proposals where id=$1 and status in ('draft','pending','accepted')
        and ($2=inviter_id or $2=invitee_id) for update`, [id,sub])
    const current = existing.rows[0]
    if (!current) throw createError({ statusCode: 404, statusMessage: 'Date proposal not found' })
    const senderEditingDraft = current.inviterId === sub && ['draft','pending'].includes(current.status)
    const recipientReproposing = current.inviteeId === sub && current.status === 'pending' && fullReproposal
    const proposal = await client.query(`update date_proposals set
      activity_label=$3,invite_note=$4,venue=$5,venue_details=$6,status=$7,selected_time_id=null,confirmed_at=null,
      inviter_id=$2,invitee_id=$8
      where id=$1 returning id,status,match_id as "matchId",invitee_id as "inviteeId",
        activity_label as activity,invite_note as "inviteNote"`,
      [id,sub,senderEditingDraft || recipientReproposing ? activity : current.activity,
        senderEditingDraft || recipientReproposing ? inviteNote : current.inviteNote,
        venue,venueDetails,senderEditingDraft ? 'draft' : 'pending',current.inviterId === sub ? current.inviteeId : current.inviterId])
    await client.query('delete from proposal_times where proposal_id=$1', [id])
    for (const [index,time] of times.entries()) await client.query(`insert into proposal_times(proposal_id,proposed_at,position)
      values($1,$2,$3)`, [id,time.toISOString(),index+1])
    if (senderEditingDraft && current.status === 'pending') await client.query(`delete from notifications
      where proposal_id=$1 and recipient_id=$2 and kind in ('proposal_received','proposal_updated')`, [id,current.inviteeId])
    if (!senderEditingDraft) await client.query(`insert into notifications(recipient_id,actor_id,match_id,proposal_id,kind)
      values($1,$2,$3,$4,'proposal_updated')`, [proposal.rows[0].inviteeId,sub,proposal.rows[0].matchId,id])
    await client.query('commit')
    return { ...proposal.rows[0], venue, venueDetails, times: times.map(time => time.toISOString()) }
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
})
