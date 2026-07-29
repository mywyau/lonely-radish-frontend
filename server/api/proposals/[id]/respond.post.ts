import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = objectBody(await readBody(event))
  const status = text(body.status, 'Response', 20, true)
  if (!['accepted', 'declined'].includes(status!)) throw createError({ statusCode: 400, statusMessage: 'Choose accepted or declined' })
  const timeId = text(body.timeId, 'Selected time', 80)
  if (status === 'accepted' && !timeId) throw createError({ statusCode: 400, statusMessage: 'Choose a proposed time' })
  if (timeId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(timeId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid proposed time' })
  }
  const client = await db.connect()
  try {
    await client.query('begin')
    const { rows } = await client.query(`update date_proposals dp set status=$3,
      selected_time_id=case when $3='accepted' then $4::uuid else null end,
      confirmed_at=case when $3='accepted' then now() else null end,
      updated_at=now()
      where dp.id=$1 and dp.invitee_id=$2 and dp.status='pending'
        and ($3='declined' or exists(select 1 from proposal_times pt where pt.id=$4::uuid and pt.proposal_id=dp.id))
      returning id,status,selected_time_id as "selectedTimeId",confirmed_at as "confirmedAt",
        inviter_id as "inviterId",match_id as "matchId",replaces_proposal_id as "replacesProposalId"`,
    [id,sub,status,timeId])
    const proposal = rows[0]
    if (!proposal) throw createError({ statusCode: 409, statusMessage: 'This proposal can no longer be updated' })
    if (status === 'accepted' && proposal.replacesProposalId) {
      await client.query(`update date_proposals set status='cancelled',selected_time_id=null,
        confirmed_at=null,updated_at=now() where id=$1 and status='accepted'`, [proposal.replacesProposalId])
      await client.query('delete from date_attendance_responses where proposal_id=$1', [proposal.replacesProposalId])
    }
    await client.query(`insert into notifications(recipient_id,actor_id,match_id,proposal_id,kind)
      values($1,$2,$3,$4,$5)`, [proposal.inviterId,sub,proposal.matchId,id,
      status === 'accepted' ? 'date_confirmed' : 'proposal_declined'])
    await client.query('commit')
    return proposal
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
})
