import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const message = text(objectBody(await readBody(event)).message, 'Apology note', 240, true)
  const client = await db.connect()
  try {
    await client.query('begin')
    const { rows } = await client.query(`select dp.match_id as "matchId",
      case when dp.inviter_id=$2 then dp.invitee_id else dp.inviter_id end as "recipientId"
      from date_proposals dp
      join date_follow_ups mine on mine.proposal_id=dp.id and mine.user_id=$2
      join date_follow_ups theirs on theirs.proposal_id=dp.id and theirs.user_id<>$2
      where dp.id=$1 and mine.meet_again=false and mine.reconsidered_at is null
        and theirs.meet_again=true for update of dp,mine`, [id,sub])
    const followUp = rows[0]
    if (!followUp) throw createError({ statusCode: 409, statusMessage: 'This follow-up cannot be changed' })
    await client.query(`update date_follow_ups set meet_again=true,message=$3,reconsidered_at=now(),updated_at=now()
      where proposal_id=$1 and user_id=$2`, [id,sub,message])
    await client.query(`update matches set status='active',ended_by=null,ended_reason=null,ended_at=null
      where id=$1 and status='unmatched'`, [followUp.matchId])
    await client.query(`update notifications set read_at=coalesce(read_at,now())
      where match_id=$1 and kind='date_follow_up_closed'`, [followUp.matchId])
    await client.query(`insert into notifications(recipient_id,actor_id,match_id,kind)
      values($1,$2,$3,'date_follow_up_changed')`, [followUp.recipientId,sub,followUp.matchId])
    await client.query('commit')
    return { reconsidered: true }
  } catch (error) {
    await client.query('rollback')
    if ((error as { code?: string }).code === '23514') throw createError({ statusCode: 409, statusMessage: 'You or your date already has five active matches' })
    throw error
  } finally { client.release() }
})
