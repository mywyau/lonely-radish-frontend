import { createError } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export async function requireAdmin(event: any) {
  const user = await requireUser(event)
  const { rows } = await db.query(`select role from users where id=$1 and account_status='active'`, [user.sub])
  if (rows[0]?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Administrator access required' })
  }
  return { ...user, role: 'admin' as const }
}
