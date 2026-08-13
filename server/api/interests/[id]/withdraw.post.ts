import { createError, getRouterParam, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { expirePendingInterests } from '~/server/utils/interestLifecycle'
import { undoUntil } from '~/server/utils/undoWindow'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  await expirePendingInterests(db, { senderId: sub })
  const client = await db.connect()
  try {
    await client.query('begin')
    const result = await client.query<{ recipientId: string }>(`update daily_interests set
      resolution='withdrawn',resolved_at=now()
      where id=$1 and sender_id=$2 and resolved_at is null
      returning recipient_id as "recipientId"`, [id,sub])
    const interest = result.rows[0]
    if (!interest) {
      throw createError({ statusCode: 404, statusMessage: 'Pending interest not found' })
    }
    await client.query(`delete from notifications where kind='interest_received'
      and recipient_id=$1 and actor_id=$2`, [interest.recipientId,sub])
    await client.query('commit')
    const resolvedAt = new Date()
    return { withdrawn: true, resolvedAt: resolvedAt.toISOString(), undoUntil: undoUntil(resolvedAt) }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
})
