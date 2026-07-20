import { createError, getRouterParam, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const slug = getRouterParam(event, 'slug')
  const { rows } = await db.query(`select p.user_id as "userId",p.display_name as name from profiles p
    join matches m on m.status='active' and ((m.user_one_id=$1 and m.user_two_id=p.user_id) or (m.user_two_id=$1 and m.user_one_id=p.user_id))
    where p.slug=$2`, [sub,slug])
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Active match not found' })
  const activities = await db.query(`select coalesce(a.name,pa.custom_label) as name from profile_activities pa
    left join activities a on a.id=pa.activity_id where pa.user_id=$1 order by pa.position`, [rows[0].userId])
  return { person: rows[0], activities: activities.rows.map(row => row.name) }
})
