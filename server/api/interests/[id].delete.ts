import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { undoUntil } from '~/server/utils/undoWindow'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const client = await db.connect()
  try {
    await client.query('begin')
    const result = await client.query(`with passed as (
      update daily_interests set declined_at=now(),resolution='passed',resolved_at=now()
      where id=$1 and recipient_id=$2 and resolved_at is null
      returning id,sender_id,recipient_id
    ), removed_notification as (
      delete from notifications notification using passed
      where notification.kind='interest_received'
        and notification.recipient_id=passed.recipient_id
        and notification.actor_id=passed.sender_id
    ) select id from passed`, [id,sub])
    if (!result.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Received interest not found' })
    await client.query('commit')
    return { declined: true, undoUntil: undoUntil() }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
})
