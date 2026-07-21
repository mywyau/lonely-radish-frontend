import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { boolean, objectBody, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = objectBody(await readBody(event))
  const meetAgain = boolean(body.meetAgain, 'Meet again choice')
  const message = text(body.message, 'Message', 240)
  const client = await db.connect()
  try {
    await client.query('begin')
    const eligible = await client.query(`select dp.id from date_proposals dp join proposal_times pt on pt.id=dp.selected_time_id
      where dp.id=$1 and dp.status='accepted' and pt.proposed_at<=now()
        and ($2=dp.inviter_id or $2=dp.invitee_id) for update of dp`, [id,sub])
    if (!eligible.rows[0]) throw createError({ statusCode: 409, statusMessage: 'You can respond after the confirmed date' })
    const { rows } = await client.query(`insert into date_follow_ups(proposal_id,user_id,meet_again,message)
      values($1,$2,$3,$4) returning meet_again as "meetAgain",message,responded_at as "respondedAt"`, [id,sub,meetAgain,message])
    await client.query(`update notifications set read_at=coalesce(read_at,now())
      where recipient_id=$2 and proposal_id=$1 and kind='follow_up_ready'`, [id,sub])
    const outcome = await client.query(`select count(*)::int as responses,bool_and(meet_again) as mutual
      from date_follow_ups where proposal_id=$1`, [id])
    if (outcome.rows[0].responses === 1) await client.query(`insert into notifications(recipient_id,actor_id,match_id,proposal_id,kind)
      select case when dp.inviter_id=$2 then dp.invitee_id else dp.inviter_id end,$2,dp.match_id,dp.id,'follow_up_ready'
      from date_proposals dp where dp.id=$1`, [id,sub])
    if (outcome.rows[0].responses === 2 && outcome.rows[0].mutual !== true) {
      await client.query(`update matches m set status='unmatched',ended_by=null,ended_reason='post_date',ended_at=now() from date_proposals dp
        where dp.id=$1 and m.id=dp.match_id`, [id])
      await client.query(`insert into notifications(recipient_id,match_id,kind)
        select case when dp.inviter_id=$2 then dp.invitee_id else dp.inviter_id end,dp.match_id,'date_follow_up_closed'
        from date_proposals dp where dp.id=$1`, [id,sub])
    }
    await client.query('commit')
    return rows[0]
  } catch (error) {
    await client.query('rollback')
    if ((error as { code?: string }).code === '23505') throw createError({ statusCode: 409, statusMessage: 'Your private answer has already been submitted' })
    throw error
  } finally { client.release() }
})
