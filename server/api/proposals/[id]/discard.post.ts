import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const { rows } = await db.query(`update date_proposals replacement set
    status='cancelled',selected_time_id=null,confirmed_at=null,updated_at=now()
    where replacement.id=$1 and replacement.inviter_id=$2 and replacement.status='draft'
      and replacement.replaces_proposal_id is not null
      and exists(select 1 from date_proposals current
        where current.id=replacement.replaces_proposal_id and current.status='accepted')
    returning replacement.id,replacement.status`, [id,sub])
  if (!rows[0]) {
    throw createError({ statusCode: 409, statusMessage: 'This reschedule draft can no longer be discarded' })
  }
  return rows[0]
})
