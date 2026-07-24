import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { confirmNoShowCase } from '~/server/utils/dateReliability'
import { objectBody, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const proposalId = getRouterParam(event, 'id')
  const body = objectBody(await readBody(event))
  const response = text(body.response, 'Response', 20, true)!
  const note = text(body.note, 'Response note', 240)
  if (!['acknowledge','dispute'].includes(response)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid response' })
  const client = await db.connect()
  try {
    await client.query('begin')
    const result = await client.query(`select id,reporter_id as "reporterId" from date_no_show_cases
      where proposal_id=$1 and accused_user_id=$2 and status='pending' for update`, [proposalId,sub])
    const noShowCase = result.rows[0]
    if (!noShowCase) throw createError({ statusCode: 409, statusMessage: 'This report no longer needs a response' })
    if (response === 'dispute') {
      await client.query(`update date_no_show_cases set status='disputed',response_note=$2,resolved_at=now() where id=$1`, [noShowCase.id,note])
      await client.query(`insert into notifications(recipient_id,actor_id,proposal_id,kind)
        values($1,$2,$3,'no_show_disputed')`, [noShowCase.reporterId,sub,proposalId])
    } else await confirmNoShowCase(client, noShowCase.id)
    await client.query('commit')
    return { status: response === 'dispute' ? 'disputed' : 'confirmed' }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally { client.release() }
})
