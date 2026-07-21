import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'

const choices = new Set(['7_days', '30_days', 'indefinite', 'resume'])

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const choice = text(objectBody(await readBody(event)).choice, 'Pause choice', 20, true) as string
  if (!choices.has(choice)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid pause duration' })
  const { rows } = await db.query(`update users set
    account_status=case when $2='resume' then 'active' else 'paused' end,
    paused_at=case when $2='resume' then null else now() end,
    paused_until=case when $2='7_days' then now()+interval '7 days'
      when $2='30_days' then now()+interval '30 days' else null end,
    updated_at=now()
    where id=$1 and account_status not in ('suspended','deleting')
    returning account_status as status,paused_at as "pausedAt",paused_until as "pausedUntil"`, [sub,choice])
  if (!rows[0]) throw createError({ statusCode: 409, statusMessage: 'This account cannot be paused right now' })
  return { paused: rows[0].status === 'paused', pausedAt: rows[0].pausedAt, pausedUntil: rows[0].pausedUntil }
})
