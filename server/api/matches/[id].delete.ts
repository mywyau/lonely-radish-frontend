import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const client = await db.connect()
  try {
    await client.query('begin')
    const { rows } = await client.query(`update matches set status='unmatched',ended_by=$2,ended_reason='removed',ended_at=now()
      where id=$1 and status='active' and ($2=user_one_id or $2=user_two_id)
      returning id,case when user_one_id=$2 then user_two_id else user_one_id end as "recipientId"`, [id,sub])
    const match = rows[0]
    if (!match) throw createError({ statusCode: 404, statusMessage: 'Active match not found' })
    await client.query(`insert into notifications(recipient_id,actor_id,match_id,kind)
      values($1,$2,$3,'match_ended')`, [match.recipientId,sub,id])
    await client.query('commit')
    return { rejected: true }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally { client.release() }
})
