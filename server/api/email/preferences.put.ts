import { readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { boolean, objectBody } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const values = [boolean(body.interests,'Interest emails'),boolean(body.matches,'Match emails'),
    boolean(body.datePlans,'Date plan emails'),boolean(body.followUps,'Follow-up emails')]
  const { rows } = await db.query(`insert into email_notification_preferences(user_id,interests,matches,date_plans,follow_ups)
    values($1,$2,$3,$4,$5) on conflict(user_id) do update set interests=excluded.interests,matches=excluded.matches,
    date_plans=excluded.date_plans,follow_ups=excluded.follow_ups,updated_at=now()
    returning interests,matches,date_plans as "datePlans",follow_ups as "followUps"`, [sub,...values])
  return rows[0]
})
