import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, stringArray } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const names = stringArray(body.activities, 'Activities', 10)
  const client = await db.connect()
  try {
    await client.query('begin')
    const catalog = await client.query(`select id,name from activities where lower(name)=any($1::text[]) and is_active=true`, [names.map(name => name.toLowerCase())])
    const byName = new Map(catalog.rows.map(row => [String(row.name).toLowerCase(), row.id]))
    await client.query('delete from profile_activities where user_id=$1', [sub])
    for (const [index, name] of names.entries()) {
      const activityId = byName.get(name.toLowerCase()) ?? null
      await client.query(`insert into profile_activities(user_id,activity_id,custom_label,position) values($1,$2,$3,$4)`,
        [sub, activityId, activityId ? null : name, index + 1])
    }
    await client.query('commit')
    return { activities: names }
  } catch (error) {
    await client.query('rollback')
    if ((error as { code?: string }).code === '23505') throw createError({ statusCode: 409, statusMessage: 'Duplicate activity' })
    throw error
  } finally { client.release() }
})
