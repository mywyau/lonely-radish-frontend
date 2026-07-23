import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`insert into email_notification_preferences(user_id) values($1)
    on conflict(user_id) do update set user_id=excluded.user_id
    returning interests,matches,date_plans as "datePlans",follow_ups as "followUps"`, [sub])
  return rows[0]
})
