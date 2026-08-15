import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { enforceRateLimit } from '~/server/utils/rate-limiting/rateLimit'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  await enforceRateLimit(`rl:proposal-send:${sub}`, 10, 60 * 60)
  const id = getRouterParam(event, 'id')
  const client = await db.connect()
  try {
    await client.query('begin')
    const { rows } = await client.query(`update date_proposals dp set status='pending'
      where dp.id=$1 and dp.inviter_id=$2 and dp.status='draft'
        and exists(select 1 from matches m where m.id=dp.match_id and m.status='active')
        and exists(select 1 from proposal_times pt where pt.proposal_id=dp.id and pt.proposed_at>now())
      returning dp.id,dp.match_id as "matchId",dp.invitee_id as "inviteeId",dp.status,
        dp.replaces_proposal_id as "replacesProposalId"`, [id,sub])
    const proposal = rows[0]
    if (!proposal) throw createError({ statusCode: 409, statusMessage: 'Save a complete draft with a future time before sending' })
    await client.query(`update matches set action_completed_at=now()
      where id=$1 and status='active' and action_required_by=$2 and action_completed_at is null`,
    [proposal.matchId,sub])
    await client.query(`insert into notifications(recipient_id,actor_id,match_id,proposal_id,kind)
      values($1,$2,$3,$4,$5)
      on conflict(recipient_id,proposal_id,kind)
        where proposal_id is not null
          and kind in ('proposal_received','date_reschedule_requested','proposal_updated')
      do update set actor_id=excluded.actor_id,match_id=excluded.match_id,
        read_at=null,created_at=now()`, [proposal.inviteeId,sub,proposal.matchId,id,
      proposal.replacesProposalId ? 'date_reschedule_requested' : 'proposal_received'])
    await client.query('commit')
    return { id: proposal.id, status: proposal.status }
  } catch (error) {
    await client.query('rollback')
    const databaseError = error as { code?: string, constraint?: string }
    if (databaseError.code === '23505'
      && databaseError.constraint === 'date_proposals_one_pending_per_match_idx') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Another date proposal is already waiting for a response',
      })
    }
    throw error
  } finally { client.release() }
})
