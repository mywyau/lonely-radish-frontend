import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const matchId = getRouterParam(event, 'id')
  const body = objectBody(await readBody(event))
  const message = text(body.message, 'Apology note', 500, true)!
  const client = await db.connect()
  try {
    await client.query('begin')
    const match = await client.query(`select case when user_one_id=$2 then user_two_id else user_one_id end as "recipientId"
      from matches where id=$1 and status='unmatched' and ended_by=$2 and ($2=user_one_id or $2=user_two_id)`, [matchId, sub])
    if (!match.rows[0]) throw createError({ statusCode: 403, statusMessage: 'Only the person who ended this match can send an apology' })
    await client.query(`insert into match_apology_notes(match_id,sender_id,recipient_id,message) values($1,$2,$3,$4)`,
      [matchId, sub, match.rows[0].recipientId, message])
    await client.query(`insert into notifications(recipient_id,actor_id,match_id,kind) values($1,$2,$3,'match_apology')`,
      [match.rows[0].recipientId, sub, matchId])
    await client.query('commit')
    return { sent: true }
  } catch (error: any) {
    await client.query('rollback')
    if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'You have already sent an apology for this match' })
    throw error
  } finally { client.release() }
})
