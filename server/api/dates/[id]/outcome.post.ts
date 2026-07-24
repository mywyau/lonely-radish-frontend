import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'

const outcomes = new Set(['happened','cancelled','no_show'])

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = objectBody(await readBody(event))
  const outcome = text(body.outcome, 'Date outcome', 20, true)!
  const note = text(body.note, 'Optional note', 240)
  if (!outcomes.has(outcome)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid date outcome' })
  const client = await db.connect()
  try {
    await client.query('begin')
    const result = await client.query(`select dp.match_id as "matchId",
      case when dp.inviter_id=$2 then dp.invitee_id else dp.inviter_id end as "otherUserId"
      from date_proposals dp join proposal_times pt on pt.id=dp.selected_time_id
      where dp.id=$1 and dp.status='accepted' and pt.proposed_at<=now()
        and ($2=dp.inviter_id or $2=dp.invitee_id) for update of dp`, [id,sub])
    const date = result.rows[0]
    if (!date) throw createError({ statusCode: 409, statusMessage: 'You can check in after the confirmed date time' })
    await client.query(`insert into date_outcome_responses(proposal_id,user_id,outcome,note)
      values($1,$2,$3,$4)`, [id,sub,outcome,note])
    if (outcome === 'no_show') {
      const noShow = await client.query(`insert into date_no_show_cases(proposal_id,reporter_id,accused_user_id)
        values($1,$2,$3) returning id,response_deadline as "responseDeadline"`, [id,sub,date.otherUserId])
      await client.query(`insert into notifications(recipient_id,actor_id,match_id,proposal_id,kind)
        values($1,$2,$3,$4,'no_show_reported')`, [date.otherUserId,sub,date.matchId,id])
      await client.query('commit')
      return { outcome, case: noShow.rows[0] }
    }
    await client.query('commit')
    return { outcome }
  } catch (error) {
    await client.query('rollback')
    if ((error as { code?: string }).code === '23505') throw createError({ statusCode: 409, statusMessage: 'You have already completed this date check-in' })
    throw error
  } finally { client.release() }
})
