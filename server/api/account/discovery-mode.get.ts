import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requirePersonalUser } from '~/server/utils/requirePersonalUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requirePersonalUser(event)
  const { rows } = await db.query(`select discovery_mode as mode from users where id=$1`, [sub])
  return { mode: rows[0]?.mode === 'incognito' ? 'incognito' : 'standard' }
})
