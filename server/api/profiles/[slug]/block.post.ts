import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { blockUser } from '~/server/utils/blockUser'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const slug = getRouterParam(event, 'slug')
  const client = await db.connect()
  try {
    await client.query('begin')
    const target = await client.query('select user_id from profiles where slug=$1 and user_id<>$2', [slug,sub])
    if (!target.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
    await blockUser(client, sub, target.rows[0].user_id)
    await client.query('commit')
    return { blocked: true }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally { client.release() }
})
