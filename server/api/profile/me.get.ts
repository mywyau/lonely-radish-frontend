import { setHeader } from 'h3'
import { withDatabaseClient } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrls } from '~/server/utils/supabaseStorage'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const result = await withDatabaseClient(async (database) => {
    const profile = await database.query(`select slug,display_name as "displayName",gender_identity as "genderIdentity",sexual_orientation as "sexualOrientation",
      race_ethnicity as "raceEthnicity",race_ethnicity_self_description as "raceEthnicitySelfDescription",
      date_of_birth as "dateOfBirth",pronouns,bio,
      height_cm as "heightCm",weight_kg as "weightKg",drinking,smoking,daily_rhythm as "dailyRhythm",
      neighbourhood,visibility from profiles where user_id=$1`, [sub])
    const photos = await database.query(`select id,public_url as url,storage_key as "storageKey",alt_text as "altText",position
      from profile_photos where user_id=$1 order by position`, [sub])
    const availability = await database.query(`select label from availability where user_id=$1 order by position`, [sub])
    const activities = await database.query(`select coalesce(a.name,pa.custom_label) as name,coalesce(a.category,pa.custom_category) as category from profile_activities pa
      left join activities a on a.id=pa.activity_id where pa.user_id=$1 order by pa.position`, [sub])
    const personalInterests = await database.query(`select label from profile_interests where user_id=$1 order by position`, [sub])
    const contactDetails = await database.query(`select phone_number as "phoneNumber",contact_email as "contactEmail",
      social_handle as "socialHandle",share_with_matches as "shareWithMatches"
      from profile_contact_details where user_id=$1`, [sub])
    return { profile, photos, availability, activities, personalInterests, contactDetails }
  })
  const { profile, photos, availability, activities, personalInterests, contactDetails } = result
  const photoUrls = await signedPhotoUrls(photos.rows.map(photo => photo.storageKey).filter(Boolean))
  return { profile: profile.rows[0] ?? null, photos: photos.rows.map(photo => ({
    ...photo, url: photo.storageKey ? photoUrls.get(photo.storageKey) : photo.url,
  })), availability: availability.rows.map(row => row.label), activities: activities.rows.map(row => row.name),
    personalInterests: personalInterests.rows.map(row => row.label),
    contactDetails: contactDetails.rows[0] ?? null,
    interestCategories: [...new Set(activities.rows.map(row => ({ 'Food and drink': 'Food & drink', Gaming: 'Games', Learning: 'Learn & create' }[row.category as string] || row.category)).filter(Boolean))] }
})
