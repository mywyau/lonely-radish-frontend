import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const bio = text(objectBody(await readBody(event)).bio, 'About me', 1000, true)!
  const { rows } = await db.query(`update profiles set bio=$2,updated_at=now()
    where user_id=$1 returning bio`, [sub, bio])
  if (!rows[0]) throw createError({ statusCode: 409, statusMessage: 'Complete your profile basics first' })
  return rows[0]
})
