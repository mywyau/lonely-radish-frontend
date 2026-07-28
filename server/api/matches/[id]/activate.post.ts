import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const matchId = getRouterParam(event, 'id')
  const client = await db.connect()
  try {
    await client.query('begin')
    const { rows } = await client.query(`update matches set status='active',matched_at=now()
      where id=$1 and status='queued' and ($2=user_one_id or $2=user_two_id)
      returning id,case when user_one_id=$2 then user_two_id else user_one_id end as "otherUserId"`, [matchId,sub])
    if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Queued match not found' })
    await client.query(`delete from notifications where match_id=$1 and kind='match_queued'`, [matchId])
    await client.query(`insert into notifications(recipient_id,actor_id,match_id,kind) values
      ($1,$2,$3,'new_match'),($2,$1,$3,'new_match')`, [sub,rows[0].otherUserId,matchId])
    await client.query('commit')
    return { activated: true }
  } catch (error) {
    await client.query('rollback')
    if ((error as { code?: string }).code === '23514') {
      throw createError({ statusCode: 409, statusMessage: 'Both people need an available match space before this match can be activated' })
    }
    throw error
  } finally { client.release() }
})
