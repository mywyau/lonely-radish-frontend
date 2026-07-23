import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const result = await db.query('delete from notifications where recipient_id=$1', [sub])
  return { deleted: result.rowCount || 0 }
})
