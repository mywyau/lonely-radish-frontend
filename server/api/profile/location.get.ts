import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`select postcode_area as "postcodeArea",location_label as label,
    location is not null as "hasLocation" from profiles where user_id=$1`, [sub])
  return rows[0] ?? { postcodeArea: null, label: null, hasLocation: false }
})
