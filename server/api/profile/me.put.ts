import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, stringArray, text } from '~/server/utils/productValidation'
import { isRaceEthnicity, raceEthnicitySelfDescriptionLimit, usesRaceEthnicitySelfDescription } from '~/utils/raceEthnicity'
import { sexualOrientationValues } from '~/utils/sexualOrientation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const displayName = text(body.displayName, 'Display name', 80, true)
  const genderIdentity = text(body.genderIdentity, 'Gender identity', 20, true)
  if (!['man', 'woman', 'neither'].includes(genderIdentity as string)) throw createError({ statusCode: 400, statusMessage: 'Select a valid gender identity' })
  const sexualOrientation = text(body.sexualOrientation, 'Sexual orientation', 30, true)
  if (!sexualOrientationValues.includes(sexualOrientation as typeof sexualOrientationValues[number])) throw createError({ statusCode: 400, statusMessage: 'Select a valid sexual orientation' })
  const raceEthnicity = text(body.raceEthnicity, 'Racial or ethnic identity', 100)
  if (raceEthnicity && !isRaceEthnicity(raceEthnicity)) throw createError({ statusCode: 400, statusMessage: 'Select a valid racial or ethnic identity' })
  const raceEthnicitySelfDescription = raceEthnicity && usesRaceEthnicitySelfDescription(raceEthnicity)
    ? text(body.raceEthnicitySelfDescription, 'Self-described racial or ethnic identity', raceEthnicitySelfDescriptionLimit, true)!
    : null
  const slug = text(body.slug, 'Profile slug', 80, true)?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Profile slug must contain letters or numbers' })
  const pronouns = text(body.pronouns, 'Pronouns', 40)
  const bio = text(body.bio, 'Bio', 1000)
  const heightCm = body.heightCm === null || body.heightCm === '' || body.heightCm === undefined ? null : Number(body.heightCm)
  if (heightCm !== null && (!Number.isInteger(heightCm) || heightCm < 120 || heightCm > 230)) throw createError({ statusCode: 400, statusMessage: 'Height must be between 120 and 230 cm' })
  const weightKg = body.weightKg === null || body.weightKg === '' || body.weightKg === undefined ? null : Number(body.weightKg)
  if (weightKg !== null && (!Number.isInteger(weightKg) || weightKg < 35 || weightKg > 300)) throw createError({ statusCode: 400, statusMessage: 'Weight must be between 35 and 300 kg' })
  const drinking = text(body.drinking, 'Drinking', 30)
  const smoking = text(body.smoking, 'Smoking', 30)
  const dailyRhythm = text(body.dailyRhythm, 'Daily rhythm', 30)
  const habitOptions = ['never', 'socially', 'regularly', 'prefer_not_to_say']
  if (drinking && !habitOptions.includes(drinking)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid drinking option' })
  if (smoking && !habitOptions.includes(smoking)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid smoking option' })
  if (dailyRhythm && !['early_bird', 'night_owl', 'flexible'].includes(dailyRhythm)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid daily rhythm' })
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
    const { rows } = await client.query(`insert into profiles(user_id,slug,display_name,gender_identity,sexual_orientation,race_ethnicity,race_ethnicity_self_description,date_of_birth,pronouns,bio,neighbourhood,height_cm,weight_kg,drinking,smoking,daily_rhythm)
      values($1,$2,$3,$4,$5,$6,$7,$8::date,$9,$10,$11,$12,$13,$14,$15,$16) on conflict(user_id) do update set slug=excluded.slug,
      display_name=excluded.display_name,gender_identity=excluded.gender_identity,sexual_orientation=excluded.sexual_orientation,
      race_ethnicity=excluded.race_ethnicity,race_ethnicity_self_description=excluded.race_ethnicity_self_description,
      date_of_birth=excluded.date_of_birth,pronouns=excluded.pronouns,
      bio=excluded.bio,neighbourhood=excluded.neighbourhood,height_cm=excluded.height_cm,weight_kg=excluded.weight_kg,
      drinking=excluded.drinking,smoking=excluded.smoking,daily_rhythm=excluded.daily_rhythm
      returning slug,display_name as "displayName",gender_identity as "genderIdentity",sexual_orientation as "sexualOrientation",
      race_ethnicity as "raceEthnicity",race_ethnicity_self_description as "raceEthnicitySelfDescription",
      date_of_birth as "dateOfBirth",pronouns,bio,
      neighbourhood,height_cm as "heightCm",weight_kg as "weightKg",drinking,smoking,daily_rhythm as "dailyRhythm",visibility`,
      [sub, slug, displayName, genderIdentity, sexualOrientation, raceEthnicity, raceEthnicitySelfDescription,
        dateOfBirth, pronouns, bio, neighbourhood, heightCm, weightKg, drinking, smoking, dailyRhythm])
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
