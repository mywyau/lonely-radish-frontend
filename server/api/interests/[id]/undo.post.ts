import { createError, getRouterParam, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { undoWindowSeconds } from '~/server/utils/undoWindow'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const client = await db.connect()
  try {
    await client.query('begin')
    const { rows } = await client.query<{ recipientId: string; senderId: string; resolution: 'passed' | 'withdrawn' }>(`select
      recipient_id as "recipientId",sender_id as "senderId",resolution
      from daily_interests where id=$1 and resolved_at>now()-($3::text || ' seconds')::interval
        and ((recipient_id=$2 and resolution='passed') or (sender_id=$2 and resolution='withdrawn'))
        and not exists(select 1 from blocks where
          (blocker_id=sender_id and blocked_id=recipient_id)
          or (blocker_id=recipient_id and blocked_id=sender_id))
      for update`, [id,sub,undoWindowSeconds])
    const interest = rows[0]
    if (!interest) throw createError({ statusCode: 409, statusMessage: 'The undo time for this interest has ended' })

    await client.query(`update daily_interests set declined_at=null,resolution=null,resolved_at=null
      where id=$1`, [id])
    if (interest.resolution === 'withdrawn' || interest.resolution === 'passed') {
      await client.query(`insert into notifications(recipient_id,actor_id,kind)
        select $1,$2,'interest_received' where not exists(select 1 from notifications
          where recipient_id=$1 and actor_id=$2 and kind='interest_received' and read_at is null)`,
      [interest.recipientId,interest.senderId])
    }
    await client.query('commit')
    return { restored: true }
  } catch (error) {
    await client.query('rollback')
    const databaseError = error as { code?: string; constraint?: string }
    if (databaseError.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'A newer interest already exists between these accounts' })
    }
    throw error
  } finally { client.release() }
})
