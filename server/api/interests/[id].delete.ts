import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const client = await db.connect()
  try {
    await client.query('begin')
    const result = await client.query(`update daily_interests set
      declined_at=now(),resolution='passed',resolved_at=now()
      where id=$1 and recipient_id=$2 and resolved_at is null returning id`, [id,sub])
    if (!result.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Received interest not found' })
    const { rows } = await client.query<{ inboxReopensAt: string }>(`update users set
      interest_inbox_reopens_at=greatest(
        coalesce(interest_inbox_reopens_at,'-infinity'::timestamptz),
        ((date_trunc('day',now() at time zone coalesce(timezone,'UTC'))+interval '1 day')
          at time zone coalesce(timezone,'UTC')))
      where id=$1 returning interest_inbox_reopens_at as "inboxReopensAt"`, [sub])
    await client.query('commit')
    return { declined: true, inboxReopensAt: rows[0]?.inboxReopensAt ?? null }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
})
