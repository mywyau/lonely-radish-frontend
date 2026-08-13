import { createError, getQuery } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { PROFILE_NAME_LIMIT } from '~/utils/profileName'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const value = getQuery(event).name
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name || name.length > PROFILE_NAME_LIMIT) throw createError({ statusCode: 400, statusMessage: `Profile names can be up to ${PROFILE_NAME_LIMIT} characters` })
  const result = await db.query('select 1 from profiles where lower(trim(display_name))=lower(trim($1)) and user_id<>$2 limit 1', [name, sub])
  return { available: result.rowCount === 0 }
})
