import { readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { badRequest, objectBody, stringArray } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const interests = stringArray(body.interests, 'Personal interest', 5, 40)
  if (new Set(interests.map(interest => interest.toLocaleLowerCase())).size !== interests.length) {
    badRequest('Personal interests must be unique')
  }
  const client = await db.connect()
  try {
    await client.query('begin')
    await client.query('delete from profile_interests where user_id=$1', [sub])
    for (const [index, interest] of interests.entries()) {
      await client.query(`insert into profile_interests(user_id,label,position)
        values($1,$2,$3)`, [sub,interest,index + 1])
    }
    await client.query('commit')
    return { interests, limit: 5, labelLimit: 40 }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally { client.release() }
})
