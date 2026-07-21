import { createError, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`update users set
    account_status=case when account_status='paused' and paused_until<=now() then 'active' else account_status end,
    paused_at=case when account_status='paused' and paused_until<=now() then null else paused_at end,
    paused_until=case when account_status='paused' and paused_until<=now() then null else paused_until end
    where id=$1 returning account_status as status,paused_at as "pausedAt",paused_until as "pausedUntil"`, [sub])
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Account not found' })
  return { paused: rows[0].status === 'paused', pausedAt: rows[0].pausedAt, pausedUntil: rows[0].pausedUntil }
})
