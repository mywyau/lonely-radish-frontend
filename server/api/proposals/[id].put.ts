import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { badRequest, objectBody, stringArray, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = objectBody(await readBody(event))
  const activity = text(body.activity, 'Activity', 100, true)
  const inviteNote = text(body.inviteNote, 'Invite note', 240)
  const venue = text(body.venue, 'Venue', 200, true)
  const times = stringArray(body.times, 'Proposed times', 3, 40).map(value => new Date(value))
  if (!times.length || times.some(value => Number.isNaN(value.getTime()) || value <= new Date())) badRequest('Choose one to three future times')
  const client = await db.connect()
  try {
    await client.query('begin')
    const proposal = await client.query(`update date_proposals set activity_label=$3,invite_note=$4,venue=$5,
      status='pending',selected_time_id=null,confirmed_at=null,inviter_id=$2,
      invitee_id=case when inviter_id=$2 then invitee_id else inviter_id end
      where id=$1 and (inviter_id=$2 or invitee_id=$2) returning id,status,match_id as "matchId",invitee_id as "inviteeId"`, [id,sub,activity,inviteNote,venue])
    if (!proposal.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Date proposal not found' })
    await client.query('delete from proposal_times where proposal_id=$1', [id])
    for (const [index,time] of times.entries()) await client.query(`insert into proposal_times(proposal_id,proposed_at,position)
      values($1,$2,$3)`, [id,time.toISOString(),index+1])
    await client.query(`insert into notifications(recipient_id,actor_id,match_id,proposal_id,kind)
      values($1,$2,$3,$4,'proposal_updated')`, [proposal.rows[0].inviteeId,sub,proposal.rows[0].matchId,id])
    await client.query('commit')
    return { ...proposal.rows[0], activity, inviteNote, venue, times: times.map(time => time.toISOString()) }
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
})
