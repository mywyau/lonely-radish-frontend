import { createError, getQuery, getRouterParam, setHeader } from 'h3'
import { withDatabaseClient } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrls } from '~/server/utils/supabaseStorage'
import { discoveryCategory } from '~/utils/activityDiscovery'
import { discoveryDistanceSelect, recipientInterestAvailabilityWhere, viewerDiscoveryJoins, viewerDiscoveryWhere } from '~/server/utils/discoveryFilters'
import { decodeCursor, pageRows } from '~/server/utils/cursorPagination'
import { candidateDiscoveryVisibilityWhere } from '~/server/utils/profileVisibility'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const slug = getRouterParam(event, 'slug') || ''
  const category = discoveryCategory(slug)
  if (!category) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  const cursor = decodeCursor(getQuery(event).cursor)
  const pageSize = 20

  const { candidates, preferenceResult } = await withDatabaseClient(async (database) => {
    const candidates = await database.query(`select p.slug,p.display_name as name,p.updated_at::text as "sortAt",
    extract(year from age(current_date,p.date_of_birth))::int as age,
    coalesce(p.location_label,p.postcode_area,p.neighbourhood) as place,p.bio as detail,
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl",
    shared."activityTags",all_selected."allActivityTags",
    ${discoveryDistanceSelect}
    from profiles p join users u on u.id=p.user_id
    ${viewerDiscoveryJoins}
    left join lateral (select coalesce(thumbnail_storage_key,storage_key) as storage_key,public_url
      from profile_photos where user_id=p.user_id order by position limit 1) photo on true
    join lateral (select array_agg(coalesce(a.name,pa.custom_label) order by pa.position) as "activityTags"
      from profile_activities pa left join activities a on a.id=pa.activity_id
      where pa.user_id=p.user_id and (
        ($6::boolean and pa.custom_label is not null) or
        (not $6::boolean and ((a.is_active=true and a.category=any($1::text[])) or
          pa.custom_category=any($1::text[])))
      )) shared on cardinality(shared."activityTags")>0
    left join lateral (select array_agg(coalesce(a.name,pa.custom_label) order by pa.position) as "allActivityTags"
      from profile_activities pa left join activities a on a.id=pa.activity_id
      where pa.user_id=p.user_id and ((a.id is not null and a.is_active=true) or pa.custom_label is not null)) all_selected on true
    where p.user_id<>$2
      and u.onboarding_completed_at is not null
      and p.visibility='active' and (u.account_status='active' or
        (u.account_status='paused' and u.paused_until is not null and u.paused_until<=now()))
      and (u.discovery_restricted_until is null or u.discovery_restricted_until<=now())
      and not exists(select 1 from blocks b where
        (b.blocker_id=$2 and b.blocked_id=p.user_id) or (b.blocker_id=p.user_id and b.blocked_id=$2))
      and not exists(select 1 from matches m where m.status in ('active','queued') and
        ((m.user_one_id=$2 and m.user_two_id=p.user_id) or (m.user_two_id=$2 and m.user_one_id=p.user_id)))
      ${candidateDiscoveryVisibilityWhere}
      ${viewerDiscoveryWhere}
      ${recipientInterestAvailabilityWhere}
      and ($3::timestamptz is null or (p.updated_at,p.slug)<($3::timestamptz,$4::text))
    order by p.updated_at desc,p.slug desc limit $5`, [category.databaseCategories,sub,cursor?.sortAt || null,cursor?.tieBreaker || null,pageSize+1,category.customOnly === true])
    const preferenceResult = await database.query(`select mp.minimum_age as "minimumAge",mp.maximum_age as "maximumAge",
      mp.max_distance_km as "distance",mp.open_to_everyone as "openToEveryone",
      mp.interested_genders as genders,mp.no_orientation_preference as "noOrientationPreference",
      mp.interested_orientations as orientations,mp.no_ethnicity_preference as "noRacePreference",
      p.location_label as "locationLabel",p.postcode_area as "postcodeArea"
      from profiles p left join match_preferences mp on mp.user_id=p.user_id where p.user_id=$1`, [sub])
    return { candidates, preferenceResult }
  })

  const page = pageRows(candidates.rows, pageSize, row => ({ sortAt: row.sortAt, tieBreaker: row.slug }))
  const photoUrls = await signedPhotoUrls(page.items.map(person => person.photoStorageKey).filter(Boolean))
  const people = page.items.map(person => {
    const matchedActivityTags = (person.activityTags || []).filter(Boolean)
    const otherActivityTags = (person.allActivityTags || [])
      .filter((activity: string) => activity && !matchedActivityTags.includes(activity))
    return {
      slug: person.slug, name: person.name, age: person.age,
      place: person.place || 'Location not shared', distanceKm: person.distanceKm,
      matchedActivityTags: matchedActivityTags.slice(0, 3),
      otherActivityTags: otherActivityTags.slice(0, 3),
      activityTags: [...matchedActivityTags, ...otherActivityTags].slice(0, 6),
      photoUrl: person.photoStorageKey
        ? photoUrls.get(person.photoStorageKey) : person.legacyPhotoUrl || null,
    }
  })
  const preferences = preferenceResult.rows[0] ?? { minimumAge: 18, maximumAge: 100, distance: 10,
    openToEveryone: true, genders: [], noOrientationPreference: true, orientations: [], noRacePreference: true,
    locationLabel: null, postcodeArea: null }
  const searchLocation = [preferences.locationLabel, preferences.postcodeArea].filter((value, index, values) =>
    Boolean(value) && values.indexOf(value) === index).join(' · ') || null
  return {
    activityName: category.name, categoryName: category.name, people,
    nextCursor: page.nextCursor, hasMore: page.hasMore,
    filters: {
      minimumAge: preferences.minimumAge, maximumAge: preferences.maximumAge, distance: preferences.distance,
      genderLabel: preferences.openToEveryone ? 'Everyone' : preferences.genders.join(', '),
      orientationLabel: preferences.noOrientationPreference ? 'Any orientation' : `${preferences.orientations.length} orientation ${preferences.orientations.length === 1 ? 'choice' : 'choices'}`,
      racialPreferencesApplied: preferences.noRacePreference === false, searchLocation,
    },
  }
})
