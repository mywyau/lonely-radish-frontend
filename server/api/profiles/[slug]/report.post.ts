import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { blockUser } from '~/server/utils/blockUser'
import { requireUser } from '~/server/utils/requireUser'
import { boolean, objectBody, text } from '~/server/utils/productValidation'

const categories = new Set(['spam', 'harassment', 'safety', 'impersonation', 'other'])

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const slug = getRouterParam(event, 'slug')
  const body = objectBody(await readBody(event))
  const category = text(body.category, 'Category', 30, true) as string
  const details = text(body.details, 'Details', 2000)
  const alsoBlock = body.alsoBlock == null ? true : boolean(body.alsoBlock, 'Also block')
  if (!categories.has(category)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid report category' })
  const client = await db.connect()
  try {
    await client.query('begin')
    const target = await client.query('select user_id from profiles where slug=$1 and user_id<>$2', [slug,sub])
    if (!target.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
    const reportedId = target.rows[0].user_id
    const recent = await client.query(`select count(*)::int as count from reports
      where reporter_id=$1 and created_at>now()-interval '24 hours'`, [sub])
    if ((recent.rows[0]?.count || 0) >= 10) throw createError({ statusCode: 429, statusMessage: 'Report limit reached. Please contact support for urgent help.' })
    const match = await client.query(`select id from matches where
      (user_one_id=$1 and user_two_id=$2) or (user_one_id=$2 and user_two_id=$1)
      order by matched_at desc limit 1`, [sub,reportedId])
    const priority = category === 'safety' ? 1 : category === 'harassment' || category === 'impersonation' ? 2 : 3
    const report = await client.query(`insert into reports(reporter_id,reported_id,category,details,priority,related_match_id)
      values($1,$2,$3,$4,$5,$6) returning id,status`, [sub,reportedId,category,details,priority,match.rows[0]?.id || null])
    if (alsoBlock) await blockUser(client, sub, reportedId)
    await client.query('commit')
    return { reportId: report.rows[0].id, status: report.rows[0].status, blocked: alsoBlock }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally { client.release() }
})
