import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`select label from profile_interests
    where user_id=$1 order by position`, [sub])
  return { interests: rows.map(row => row.label), limit: 5, labelLimit: 40 }
})
