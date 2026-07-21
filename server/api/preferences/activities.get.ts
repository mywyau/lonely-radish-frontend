import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const [catalog, selected] = await Promise.all([
    db.query(`select id, name, category from activities where is_active=true order by category,name`),
    db.query(`select coalesce(a.name, pa.custom_label) as name,pa.activity_id is null as custom,
      coalesce(a.category,pa.custom_category) as category
      from profile_activities pa left join activities a on a.id=pa.activity_id
      where pa.user_id=$1 order by pa.position`, [sub]),
  ])
  return { catalog: catalog.rows, selected: selected.rows }
})
