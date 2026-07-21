import { readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { badRequest, boolean, integer, objectBody, text } from '~/server/utils/productValidation'

const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  if (!Array.isArray(body.windows) || body.windows.length > 7) badRequest('Choose up to seven availability windows')
  const publicOnly = boolean(body.publicOnly, 'Public places only')
  const windows = body.windows.map(value => {
    const window = objectBody(value)
    const weekday = integer(window.weekday, 'Day', 0, 6)
    const startTime = text(window.startTime, 'Start time', 5, true)!
    const endTime = text(window.endTime, 'End time', 5, true)!
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) badRequest('Use a valid 24-hour time')
    if (startTime >= endTime) badRequest(`${dayNames[weekday]} end time must be after its start time`)
    return { weekday, startTime, endTime, label: `${dayNames[weekday]} · ${startTime}–${endTime}` }
  })
  if (new Set(windows.map(window => window.weekday)).size !== windows.length) badRequest('Each day can have one availability window')
  const client = await db.connect()
  try {
    await client.query('begin')
    await client.query('delete from availability where user_id=$1', [sub])
    for (const [index, window] of windows.entries()) await client.query(`insert into availability
      (user_id,label,position,weekday,start_time,end_time) values($1,$2,$3,$4,$5::time,$6::time)`,
      [sub,window.label,index+1,window.weekday,window.startTime,window.endTime])
    await client.query(`insert into match_preferences(user_id,public_places_only) values($1,$2)
      on conflict(user_id) do update set public_places_only=excluded.public_places_only`, [sub,publicOnly])
    await client.query('commit')
    return { windows, publicOnly }
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
})
