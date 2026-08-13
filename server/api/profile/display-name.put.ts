import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { PROFILE_NAME_LIMIT } from '~/utils/profileName'
import { objectBody, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const displayName = text(body.displayName, 'Profile name', PROFILE_NAME_LIMIT, true)!

  const { rows } = await db.query(
    `update profiles
     set display_name=$2
     where user_id=$1
       and not exists (
         select 1 from profiles other
         where other.user_id<>$1
           and lower(trim(other.display_name))=lower(trim($2))
       )
     returning display_name as "displayName",slug`,
    [sub, displayName],
  )

  if (rows[0]) return rows[0]

  const profile = await db.query('select 1 from profiles where user_id=$1', [sub])
  if (!profile.rows[0]) throw createError({ statusCode: 409, statusMessage: 'Complete your profile basics first' })
  throw createError({ statusCode: 409, statusMessage: 'That profile name is already in use' })
})
