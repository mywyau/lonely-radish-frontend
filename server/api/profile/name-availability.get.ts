import { createError, getQuery } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const value = getQuery(event).name
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name || name.length > 80) throw createError({ statusCode: 400, statusMessage: 'Enter a valid profile name' })
  const result = await db.query('select 1 from profiles where lower(trim(display_name))=lower(trim($1)) and user_id<>$2 limit 1', [name, sub])
  return { available: result.rowCount === 0 }
})
