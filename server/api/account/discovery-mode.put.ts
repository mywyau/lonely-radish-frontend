import { createError, readBody, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requirePersonalUser } from '~/server/utils/requirePersonalUser'
import { objectBody, text } from '~/server/utils/productValidation'

const modes = new Set(['standard', 'incognito'])

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requirePersonalUser(event)
  const mode = text(objectBody(await readBody(event)).mode, 'Discovery mode', 20, true) as string
  if (!modes.has(mode)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid discovery mode' })
  const { rows } = await db.query(`update users set discovery_mode=$2,updated_at=now()
    where id=$1 and account_status in ('active','paused') returning discovery_mode as mode`, [sub,mode])
  if (!rows[0]) throw createError({ statusCode: 409, statusMessage: 'Discovery privacy cannot be changed right now' })
  return { mode: rows[0].mode }
})
