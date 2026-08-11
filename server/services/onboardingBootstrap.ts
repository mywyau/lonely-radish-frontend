import { createError } from 'h3'
import type { DatabaseQueryable } from '../repositories/db'
import type {
  OnboardingBootstrapResponse,
  OnboardingProfileResponse,
  OnboardingStatusResponse,
} from '../../types/api/onboarding'
import { groupSexualOrientationPreferences } from '../../utils/sexualOrientation'

type CoreRow = {
  completedAt: string | null
  profileUserId: string | null
  profileComplete: boolean
  racialIdentityComplete: boolean
  activityCount: number | string
  photoCount: number | string
  locationComplete: boolean
  preferencesComplete: boolean
  datingComplete: boolean
  paidAccess: boolean
  slug: string | null
  displayName: string | null
  genderIdentity: string | null
  sexualOrientation: string | null
  raceEthnicity: string | null
  raceEthnicitySelfDescription: string | null
  dateOfBirth: string | null
  pronouns: string | null
  bio: string | null
  heightCm: number | null
  weightKg: number | null
  drinking: string | null
  smoking: string | null
  dailyRhythm: string | null
  postcodeArea: string | null
  locationLabel: string | null
  distance: number | null
  minimumAge: number | null
  maximumAge: number | null
  timing: string[] | null
  publicOnly: boolean | null
  availabilityVisibleBeforeMatch: boolean | null
  genders: string[] | null
  orientations: string[] | null
  noOrientationPreference: boolean | null
  openToEveryone: boolean | null
  raceEthnicities: string[] | null
  noRaceEthnicityPreference: boolean | null
}

export function resolveOnboardingStatus(core: Pick<CoreRow,
  'completedAt' | 'profileComplete' | 'racialIdentityComplete' | 'activityCount' | 'photoCount'
  | 'locationComplete' | 'preferencesComplete' | 'datingComplete'>): OnboardingStatusResponse {
  const profileComplete = core.profileComplete === true
  const racialIdentityComplete = core.racialIdentityComplete === true
  const activityCount = Number(core.activityCount || 0)
  const photoCount = Number(core.photoCount || 0)
  const preferencesComplete = core.preferencesComplete === true
  const datingComplete = core.datingComplete === true
  const locationComplete = core.locationComplete === true
  const nextStep = (!profileComplete ? 1 : !racialIdentityComplete ? 2 : activityCount < 1 ? 3
    : !preferencesComplete || !locationComplete ? 4 : !datingComplete ? 5 : 6) as OnboardingStatusResponse['nextStep']
  return {
    complete: Boolean(core.completedAt) && profileComplete && racialIdentityComplete
      && activityCount > 0 && preferencesComplete && datingComplete && locationComplete,
    completedAt: core.completedAt,
    nextStep,
    profileComplete,
    racialIdentityComplete,
    activityCount,
    photoCount,
    preferencesComplete,
    datingComplete,
    locationComplete,
  }
}

export async function loadOnboardingBootstrap(
  database: DatabaseQueryable,
  userId: string,
): Promise<OnboardingBootstrapResponse> {
  const coreResult = await database.query<CoreRow>(`select
    u.onboarding_completed_at::text as "completedAt",p.user_id as "profileUserId",
    (nullif(trim(u.first_name),'') is not null and nullif(trim(u.last_name),'') is not null
      and p.user_id is not null and p.gender_identity is not null and p.sexual_orientation is not null
      and p.date_of_birth is not null and nullif(trim(p.bio),'') is not null) as "profileComplete",
    p.race_ethnicity is not null as "racialIdentityComplete",
    (select count(*)::int from profile_activities pa where pa.user_id=u.id) as "activityCount",
    (select count(*)::int from profile_photos pp where pp.user_id=u.id) as "photoCount",
    p.location is not null as "locationComplete",mp.user_id is not null as "preferencesComplete",
    (mp.user_id is not null and mp.dating_preferences_set=true
      and (mp.open_to_everyone=true or cardinality(mp.interested_genders)>0)
      and mp.no_orientation_preference=false and cardinality(mp.interested_orientations)>0) as "datingComplete",
    exists(select 1 from entitlements e where e.user_id=u.id and e.plan<>'free'
      and e.subscription_status in ('active','trialing','past_due')) as "paidAccess",
    p.slug,p.display_name as "displayName",p.gender_identity as "genderIdentity",
    p.sexual_orientation as "sexualOrientation",p.race_ethnicity as "raceEthnicity",
    p.race_ethnicity_self_description as "raceEthnicitySelfDescription",
    p.date_of_birth::text as "dateOfBirth",p.pronouns,p.bio,p.height_cm as "heightCm",
    p.weight_kg as "weightKg",p.drinking,p.smoking,p.daily_rhythm as "dailyRhythm",
    p.postcode_area as "postcodeArea",p.location_label as "locationLabel",
    mp.max_distance_km as distance,mp.minimum_age as "minimumAge",mp.maximum_age as "maximumAge",
    mp.timing,mp.public_places_only as "publicOnly",
    mp.availability_visible_before_match as "availabilityVisibleBeforeMatch",
    mp.interested_genders as genders,mp.interested_orientations as orientations,
    mp.no_orientation_preference as "noOrientationPreference",mp.open_to_everyone as "openToEveryone",
    mp.preferred_ethnicities as "raceEthnicities",mp.no_ethnicity_preference as "noRaceEthnicityPreference"
    from users u left join profiles p on p.user_id=u.id
    left join match_preferences mp on mp.user_id=u.id where u.id=$1`, [userId])
  const core = coreResult.rows[0]
  if (!core) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const activitiesResult = await database.query<OnboardingBootstrapResponse['activities']['selected'][number]>(
    `select coalesce(a.name,pa.custom_label) as name,pa.activity_id is null as custom,
      coalesce(a.category,pa.custom_category) as category from profile_activities pa
      left join activities a on a.id=pa.activity_id where pa.user_id=$1 order by pa.position`, [userId],
  )
  const scheduleResult = await database.query<OnboardingBootstrapResponse['schedule']['windows'][number]>(
    `select weekday,start_time::text as "startTime",end_time::text as "endTime"
      from availability where user_id=$1 and weekday is not null order by weekday`, [userId],
  )

  const profile: OnboardingProfileResponse | null = core.profileUserId ? {
    slug: core.slug || '', displayName: core.displayName || '', genderIdentity: core.genderIdentity,
    sexualOrientation: core.sexualOrientation, raceEthnicity: core.raceEthnicity,
    raceEthnicitySelfDescription: core.raceEthnicitySelfDescription, dateOfBirth: core.dateOfBirth,
    pronouns: core.pronouns, bio: core.bio, heightCm: core.heightCm, weightKg: core.weightKg,
    drinking: core.drinking, smoking: core.smoking, dailyRhythm: core.dailyRhythm,
  } : null

  return {
    status: resolveOnboardingStatus(core),
    profile,
    activities: { selected: activitiesResult.rows, selectionLimit: core.paidAccess ? 10 : 5 },
    general: {
      distance: Number(core.distance ?? 10), minimumAge: Number(core.minimumAge ?? 18),
      maximumAge: Number(core.maximumAge ?? 80), timing: core.timing || [], publicOnly: core.publicOnly ?? true,
    },
    dating: {
      genders: core.genders || [], orientations: groupSexualOrientationPreferences(core.orientations || []),
      noOrientationPreference: core.noOrientationPreference ?? true,
      openToEveryone: core.openToEveryone ?? true, raceEthnicities: core.raceEthnicities || [],
      noRaceEthnicityPreference: core.noRaceEthnicityPreference ?? true,
    },
    schedule: { windows: scheduleResult.rows, publicOnly: core.publicOnly ?? true,
      availabilityVisibleBeforeMatch: core.availabilityVisibleBeforeMatch ?? false },
    location: { postcodeArea: core.postcodeArea, label: core.locationLabel,
      hasLocation: core.locationComplete === true },
  }
}
