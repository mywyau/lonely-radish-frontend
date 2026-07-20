import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, stringArray, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const displayName = text(body.displayName, 'Display name', 80, true)
  const slug = text(body.slug, 'Profile slug', 80, true)?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Profile slug must contain letters or numbers' })
  const pronouns = text(body.pronouns, 'Pronouns', 40)
  const bio = text(body.bio, 'Bio', 1000)
  const neighbourhood = text(body.neighbourhood, 'Neighbourhood', 100)
  const dateOfBirth = text(body.dateOfBirth, 'Date of birth', 10)
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) throw createError({ statusCode: 400, statusMessage: 'Date of birth must use YYYY-MM-DD' })
  const availability = stringArray(body.availability ?? [], 'Availability', 10)
  const client = await db.connect()
  try {
    await client.query('begin')
    const { rows } = await client.query(`insert into profiles(user_id,slug,display_name,date_of_birth,pronouns,bio,neighbourhood)
      values($1,$2,$3,$4::date,$5,$6,$7) on conflict(user_id) do update set slug=excluded.slug,
      display_name=excluded.display_name,date_of_birth=excluded.date_of_birth,pronouns=excluded.pronouns,
      bio=excluded.bio,neighbourhood=excluded.neighbourhood returning slug,display_name as "displayName",
      date_of_birth as "dateOfBirth",pronouns,bio,neighbourhood,visibility`,
      [sub, slug, displayName, dateOfBirth, pronouns, bio, neighbourhood])
    await client.query('delete from availability where user_id=$1', [sub])
    for (const [index, label] of availability.entries()) await client.query('insert into availability(user_id,label,position) values($1,$2,$3)', [sub,label,index+1])
    await client.query('commit')
    return { profile: rows[0], availability }
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
})
