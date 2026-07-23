import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const action = text(objectBody(await readBody(event)).action, 'Action', 20, true)
  if (!['confirm','reschedule','cancel'].includes(action!)) {
    throw createError({ statusCode: 400, statusMessage: 'Choose confirm, reschedule, or cancel' })
  }
  const client = await db.connect()
  try {
    await client.query('begin')
    const { rows } = await client.query(`select dp.id,dp.status,dp.match_id as "matchId",
      dp.inviter_id as "inviterId",dp.invitee_id as "inviteeId",pt.proposed_at as "dateTime"
      from date_proposals dp join proposal_times pt on pt.id=dp.selected_time_id
      where dp.id=$1 and dp.status='accepted' and ($2=dp.inviter_id or $2=dp.invitee_id)
      for update of dp`, [id,sub])
    const proposal = rows[0]
    if (!proposal) throw createError({ statusCode: 409, statusMessage: 'This confirmed date can no longer be updated' })
    if (new Date(proposal.dateTime) <= new Date()) {
      throw createError({ statusCode: 409, statusMessage: 'This date has already started' })
    }
    const otherUserId = proposal.inviterId === sub ? proposal.inviteeId : proposal.inviterId
    if (action === 'confirm') {
      const response = await client.query(`insert into date_attendance_responses(proposal_id,user_id,response)
        values($1,$2,'confirmed') on conflict(proposal_id,user_id) do nothing returning proposal_id`, [id,sub])
      if (response.rows[0]) await client.query(`insert into notifications(recipient_id,actor_id,match_id,proposal_id,kind)
        values($1,$2,$3,$4,'date_attendance_confirmed')`, [otherUserId,sub,proposal.matchId,id])
    } else if (action === 'reschedule') {
      await client.query(`update date_proposals set status='draft',inviter_id=$2,invitee_id=$3,
        selected_time_id=null,confirmed_at=null,updated_at=now() where id=$1`, [id,sub,otherUserId])
      await client.query('delete from date_attendance_responses where proposal_id=$1', [id])
      await client.query(`insert into notifications(recipient_id,actor_id,match_id,proposal_id,kind)
        values($1,$2,$3,$4,'date_reschedule_requested')`, [otherUserId,sub,proposal.matchId,id])
    } else {
      await client.query(`update date_proposals set status='cancelled',selected_time_id=null,
        confirmed_at=null,updated_at=now() where id=$1`, [id])
      await client.query('delete from date_attendance_responses where proposal_id=$1', [id])
      await client.query(`insert into notifications(recipient_id,actor_id,match_id,proposal_id,kind)
        values($1,$2,$3,$4,'date_cancelled')`, [otherUserId,sub,proposal.matchId,id])
    }
    await client.query('commit')
    return { action, status: action === 'confirm' ? 'accepted' : action === 'reschedule' ? 'draft' : 'cancelled' }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
})
