import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const result = await db.query('update notifications set read_at=now() where recipient_id=$1 and read_at is null', [sub])
  return { read: result.rowCount || 0 }
})
