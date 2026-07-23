import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  await db.query(`update profiles set postcode_area=null,location_label=null,latitude=null,longitude=null,location=null
    where user_id=$1`, [sub])
  return { removed: true }
})
