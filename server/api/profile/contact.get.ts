import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`select phone_number as "phoneNumber",contact_email as "contactEmail",
    social_handle as "socialHandle",share_with_matches as "shareWithMatches"
    from profile_contact_details where user_id=$1`, [sub])
  return rows[0] ?? { phoneNumber: '', contactEmail: '', socialHandle: '', shareWithMatches: false }
})
