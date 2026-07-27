import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const matchId = getRouterParam(event, 'id')
  const body = objectBody(await readBody(event))
  const message = text(body.message, 'Message', 500, true)!
  const client = await db.connect()
  try {
    await client.query('begin')
    const match = await client.query(`select ended_by as "recipientId",ended_at as "endedAt"
      from matches where id=$1 and status='unmatched' and ended_by is not null and ended_by<>$2
      and ($2=user_one_id or $2=user_two_id) for update`, [matchId, sub])
    if (!match.rows[0]) throw createError({ statusCode: 403, statusMessage: 'Only the person who was unmatched can send this message' })
    const currentMessage = await client.query(`select 1 from match_apology_notes
      where match_id=$1 and sender_id=$2 and message_type='contact' and created_at>$3 limit 1`,
      [matchId, sub, match.rows[0].endedAt])
    if (currentMessage.rows[0]) throw createError({ statusCode: 409, statusMessage: 'You have already sent a message for this ended match' })
    await client.query(`delete from daily_interests where sender_id=$1 and recipient_id=$2
      and created_at>$3`, [sub, match.rows[0].recipientId, match.rows[0].endedAt])
    await client.query(`delete from notifications where recipient_id=$1 and actor_id=$2
      and kind='interest_received' and created_at>$3`, [match.rows[0].recipientId, sub, match.rows[0].endedAt])
    await client.query(`insert into match_apology_notes(match_id,sender_id,recipient_id,message,message_type)
      values($1,$2,$3,$4,'contact')`, [matchId, sub, match.rows[0].recipientId, message])
    await client.query(`insert into notifications(recipient_id,actor_id,match_id,kind)
      values($1,$2,$3,'match_contact')`, [match.rows[0].recipientId, sub, matchId])
    await client.query('commit')
    return { sent: true }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally { client.release() }
})
