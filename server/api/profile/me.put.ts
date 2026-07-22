import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, stringArray, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const displayName = text(body.displayName, 'Display name', 80, true)
  const genderIdentity = text(body.genderIdentity, 'Gender identity', 20, true)
  if (!['man', 'woman', 'neither'].includes(genderIdentity as string)) throw createError({ statusCode: 400, statusMessage: 'Select a valid gender identity' })
  const raceEthnicity = text(body.raceEthnicity, 'Racial or ethnic identity', 100)
  const raceEthnicityOptions = ['Asian', 'Black / African / Caribbean', 'Hispanic / Latino', 'Middle Eastern', 'North African', 'Native / Indigenous', 'Pacific Islander', 'White', 'Multiracial / multi-ethnic', 'Prefer not to say']
  if (raceEthnicity && !raceEthnicityOptions.includes(raceEthnicity)) throw createError({ statusCode: 400, statusMessage: 'Select a valid racial or ethnic identity' })
  const slug = text(body.slug, 'Profile slug', 80, true)?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Profile slug must contain letters or numbers' })
  const pronouns = text(body.pronouns, 'Pronouns', 40)
  const bio = text(body.bio, 'Bio', 1000)
  const neighbourhood = text(body.neighbourhood, 'Neighbourhood', 100)
  const dateOfBirth = text(body.dateOfBirth, 'Date of birth', 10)
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) throw createError({ statusCode: 400, statusMessage: 'Date of birth must use YYYY-MM-DD' })
  if (dateOfBirth) {
    const birth = new Date(`${dateOfBirth}T00:00:00Z`)
    const today = new Date()
    const adultBefore = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()))
    if (Number.isNaN(birth.getTime()) || birth.toISOString().slice(0, 10) !== dateOfBirth) throw createError({ statusCode: 400, statusMessage: 'Enter a valid date of birth' })
    if (birth > adultBefore) throw createError({ statusCode: 400, statusMessage: 'You must be at least 18 years old' })
  }
  const availability = stringArray(body.availability ?? [], 'Availability', 10)
  const client = await db.connect()
  try {
    await client.query('begin')
    const existingName = await client.query('select 1 from profiles where lower(trim(display_name))=lower(trim($1)) and user_id<>$2 limit 1', [displayName, sub])
    if (existingName.rowCount) throw createError({ statusCode: 409, statusMessage: 'That profile name is already in use' })
    const { rows } = await client.query(`insert into profiles(user_id,slug,display_name,gender_identity,race_ethnicity,date_of_birth,pronouns,bio,neighbourhood)
      values($1,$2,$3,$4,$5,$6::date,$7,$8,$9) on conflict(user_id) do update set slug=excluded.slug,
      display_name=excluded.display_name,gender_identity=excluded.gender_identity,race_ethnicity=excluded.race_ethnicity,date_of_birth=excluded.date_of_birth,pronouns=excluded.pronouns,
      bio=excluded.bio,neighbourhood=excluded.neighbourhood returning slug,display_name as "displayName",
      gender_identity as "genderIdentity",race_ethnicity as "raceEthnicity",date_of_birth as "dateOfBirth",pronouns,bio,neighbourhood,visibility`,
      [sub, slug, displayName, genderIdentity, raceEthnicity, dateOfBirth, pronouns, bio, neighbourhood])
    await client.query('delete from availability where user_id=$1', [sub])
    for (const [index, label] of availability.entries()) await client.query('insert into availability(user_id,label,position) values($1,$2,$3)', [sub,label,index+1])
    await client.query('commit')
    return { profile: rows[0], availability }
  } catch (error: any) {
    await client.query('rollback')
    if (error?.code === '23505' && error?.constraint === 'profiles_display_name_unique') throw createError({ statusCode: 409, statusMessage: 'That profile name is already in use' })
    throw error
  } finally { client.release() }
})
