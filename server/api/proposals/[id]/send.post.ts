import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const client = await db.connect()
  try {
    await client.query('begin')
    const { rows } = await client.query(`update date_proposals dp set status='pending'
      where dp.id=$1 and dp.inviter_id=$2 and dp.status='draft'
        and exists(select 1 from matches m where m.id=dp.match_id and m.status='active')
        and exists(select 1 from proposal_times pt where pt.proposal_id=dp.id and pt.proposed_at>now())
      returning dp.id,dp.match_id as "matchId",dp.invitee_id as "inviteeId",dp.status`, [id,sub])
    const proposal = rows[0]
    if (!proposal) throw createError({ statusCode: 409, statusMessage: 'Save a complete draft with a future time before sending' })
    await client.query(`insert into notifications(recipient_id,actor_id,match_id,proposal_id,kind)
      values($1,$2,$3,$4,'proposal_received')`, [proposal.inviteeId,sub,proposal.matchId,id])
    await client.query('commit')
    return { id: proposal.id, status: proposal.status }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally { client.release() }
})
