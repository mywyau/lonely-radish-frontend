import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const heightCm = body.heightCm === null || body.heightCm === '' || body.heightCm === undefined ? null : Number(body.heightCm)
  if (heightCm !== null && (!Number.isInteger(heightCm) || heightCm < 120 || heightCm > 230)) throw createError({ statusCode: 400, statusMessage: 'Height must be between 120 and 230 cm' })
  const weightKg = body.weightKg === null || body.weightKg === '' || body.weightKg === undefined ? null : Number(body.weightKg)
  if (weightKg !== null && (!Number.isInteger(weightKg) || weightKg < 35 || weightKg > 300)) throw createError({ statusCode: 400, statusMessage: 'Weight must be between 35 and 300 kg' })
  const drinking = text(body.drinking, 'Drinking', 30)
  const smoking = text(body.smoking, 'Smoking', 30)
  const dailyRhythm = text(body.dailyRhythm, 'Daily rhythm', 30)
  const habits = ['never', 'socially', 'regularly', 'prefer_not_to_say']
  if (drinking && !habits.includes(drinking)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid drinking option' })
  if (smoking && !habits.includes(smoking)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid smoking option' })
  if (dailyRhythm && !['early_bird', 'night_owl', 'flexible'].includes(dailyRhythm)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid daily rhythm' })
  const { rows } = await db.query(`update profiles set height_cm=$2,weight_kg=$3,drinking=$4,smoking=$5,daily_rhythm=$6
    where user_id=$1 returning height_cm as "heightCm",weight_kg as "weightKg",drinking,smoking,daily_rhythm as "dailyRhythm"`,
  [sub, heightCm, weightKg, drinking, smoking, dailyRhythm])
  if (!rows[0]) throw createError({ statusCode: 409, statusMessage: 'Complete your profile basics first' })
  return rows[0]
})
