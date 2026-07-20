import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, stringArray, text, badRequest } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const profileSlug = text(body.profileSlug, 'Profile', 80, true)
  const activity = text(body.activity, 'Activity', 100, true)
  const inviteNote = text(body.inviteNote, 'Invite note', 240)
  const venue = text(body.venue, 'Venue', 200, true)
  const times = stringArray(body.times, 'Proposed times', 3, 40).map(value => new Date(value))
  if (!times.length || times.some(value => Number.isNaN(value.getTime()) || value <= new Date())) badRequest('Choose one to three future times')
  const client = await db.connect()
  try {
    await client.query('begin')
    const match = await client.query(`select m.id,p.user_id from profiles p join matches m on m.status='active'
      and ((m.user_one_id=$1 and m.user_two_id=p.user_id) or (m.user_two_id=$1 and m.user_one_id=p.user_id)) where p.slug=$2`, [sub,profileSlug])
    if (!match.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Active match not found' })
    const proposal = await client.query(`insert into date_proposals(match_id,inviter_id,invitee_id,activity_label,invite_note,venue)
      values($1,$2,$3,$4,$5,$6) returning id,status,created_at as "createdAt"`,
      [match.rows[0].id,sub,match.rows[0].user_id,activity,inviteNote,venue])
    for (const [index,time] of times.entries()) await client.query('insert into proposal_times(proposal_id,proposed_at,position) values($1,$2,$3)', [proposal.rows[0].id,time.toISOString(),index+1])
    await client.query('commit')
    return { ...proposal.rows[0], activity, inviteNote, venue, times: times.map(value => value.toISOString()) }
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
})
