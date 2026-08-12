import { createError, getRouterParam, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrls } from '~/server/utils/supabaseStorage'
import { directProfileVisibilityWhere } from '~/server/utils/profileVisibility'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const viewer = await requireUser(event)
  const slug = getRouterParam(event, 'slug')
  const { rows } = await db.query(`select p.user_id as "userId",p.slug,p.display_name as name,
    extract(year from age(current_date,p.date_of_birth))::int as age,p.gender_identity as "genderIdentity",p.pronouns,p.bio,
    coalesce(p.location_label,p.postcode_area,p.neighbourhood) as place,
    p.height_cm as "heightCm",p.weight_kg as "weightKg",p.drinking,p.smoking,p.daily_rhythm as "dailyRhythm",
    relationship.id as "matchId",relationship.status as "relationshipStatus",
    relationship.status='active' as "isMatched",relationship.ended_by=$2 as "endedByMe",
    (relationship.status='unmatched' and relationship.ended_by is distinct from $2) as "wasUnmatched",
    exists(select 1 from match_apology_notes man where man.match_id=relationship.id and man.sender_id=$2
      and man.message_type='apology' and man.created_at>relationship.ended_at) as "apologySent",
    exists(select 1 from match_apology_notes man where man.match_id=relationship.id
      and man.sender_id=$2 and man.created_at>relationship.ended_at
      and relationship.ended_by=$2 and man.message_type='apology') as "secondChanceAvailable",
    exists(select 1 from daily_interests di where di.sender_id=$2 and di.recipient_id=p.user_id
      and (relationship.status is distinct from 'unmatched' or (di.created_at>relationship.ended_at
        and exists(select 1 from match_apology_notes man where man.match_id=relationship.id
          and man.sender_id=$2 and man.created_at>relationship.ended_at
          and relationship.ended_by=$2 and man.message_type='apology')))) as "interestSent"
    ,coalesce(mp.availability_visible_before_match,false) as "availabilityVisibleBeforeMatch",
    coalesce(photos.items,'[]'::json) as photos,
    coalesce(activity_rows.items,'[]'::json) as "activityRows",
    coalesce(personal_interests.items,'[]'::json) as "personalInterests",
    coalesce(schedule.items,'[]'::json) as availability,contact.item as "contactDetails"
    from profiles p join users u on u.id=p.user_id left join match_preferences mp on mp.user_id=p.user_id
    left join lateral (select m.id,m.status,m.ended_by,m.ended_at from matches m where
      (m.user_one_id=$2 and m.user_two_id=p.user_id) or (m.user_two_id=$2 and m.user_one_id=p.user_id)
      order by coalesce(m.ended_at,m.matched_at) desc limit 1) relationship on true
    left join lateral (select json_agg(json_build_object(
      'src',public_url,'storageKey',storage_key,'alt',alt_text,'position',position
    ) order by position) as items from profile_photos where user_id=p.user_id) photos on true
    left join lateral (select json_agg(json_build_object(
      'name',coalesce(a.name,pa.custom_label),'category',coalesce(a.category,pa.custom_category)
    ) order by pa.position) as items from profile_activities pa
      left join activities a on a.id=pa.activity_id where pa.user_id=p.user_id) activity_rows on true
    left join lateral (select json_agg(label order by position) as items
      from profile_interests where user_id=p.user_id) personal_interests on true
    left join lateral (select json_agg(label order by position) as items
      from availability where user_id=p.user_id) schedule
      on relationship.status='active' or coalesce(mp.availability_visible_before_match,false)
    left join lateral (select json_build_object(
      'phoneNumber',phone_number,'contactEmail',contact_email,'socialHandle',social_handle
    ) as item from profile_contact_details where user_id=p.user_id and share_with_matches=true) contact
      on relationship.status='active'
    where p.slug=$1 and u.onboarding_completed_at is not null and p.visibility='active' and (u.account_status='active' or
      (u.account_status='paused' and u.paused_until is not null and u.paused_until<=now()))
      and p.user_id<>$2 and not exists(select 1 from blocks b where
        (b.blocker_id=$2 and b.blocked_id=p.user_id) or (b.blocker_id=p.user_id and b.blocked_id=$2))
      ${directProfileVisibilityWhere}`, [slug,viewer.sub])
  const profile = rows[0]
  if (!profile) throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
  const { photos, activityRows, ...profileData } = profile
  const photoUrls = await signedPhotoUrls(photos.map((photo: any) => photo.storageKey).filter(Boolean))
  return { ...profileData, photos: photos.map((photo: any) => ({ ...photo,
    src: photo.storageKey ? photoUrls.get(photo.storageKey) : photo.src, storageKey: undefined,
  })), activities: activityRows.map((row: any) => row.name),
    interestCategories: [...new Set(activityRows.map((row: any) => ({ 'Food and drink': 'Food & drink', Gaming: 'Games', Learning: 'Learn & create' }[row.category as string] || row.category)).filter(Boolean))] }
})
