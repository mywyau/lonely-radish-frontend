import { createError, getQuery, setHeader } from 'h3'
import { withDatabaseClient } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrls } from '~/server/utils/supabaseStorage'
import { discoveryCategories } from '~/utils/activityDiscovery'
import { discoveryDistanceSelect, recipientInterestAvailabilitySelect, viewerDiscoveryJoins, viewerDiscoveryWhere } from '~/server/utils/discoveryFilters'
import { decodeCursor, pageRows } from '~/server/utils/cursorPagination'
import { candidateDiscoveryVisibilityWhere } from '~/server/utils/profileVisibility'
import { normalizeDiscoveryPreferences } from '~/server/utils/discoveryPreferences'

const categoryEntries = Object.entries(discoveryCategories)

function requestedCategorySlugs(value: unknown) {
  const values = (Array.isArray(value) ? value : [value])
    .flatMap(item => typeof item === 'string' ? item.split(',') : [])
    .map(item => item.trim())
    .filter(Boolean)
  if (values.length > categoryEntries.length || values.some(slug => !discoveryCategories[slug])) {
    throw createError({ statusCode: 400, statusMessage: 'Choose valid activity filters' })
  }
  return [...new Set(values)]
}

function slugsForSavedCategories(categories: string[], hasCustomIdeas: boolean) {
  const slugs = categoryEntries
    .filter(([, category]) => category.databaseCategories.some(value => categories.includes(value)))
    .map(([slug]) => slug)
  if (hasCustomIdeas) slugs.push('your-ideas')
  return [...new Set(slugs)]
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const query = getQuery(event)
  const requestedSlugs = requestedCategorySlugs(query.categories)
  const cursor = decodeCursor(query.cursor)
  const pageSize = 20

  const { candidates, preferenceResult, effectiveSlugs } = await withDatabaseClient(async (database) => {
    let effectiveSlugs = requestedSlugs
    if (!effectiveSlugs.length) {
      const saved = await database.query(`select array_remove(array_agg(distinct coalesce(a.category,pa.custom_category)),null) as categories,
        bool_or(pa.custom_label is not null) as "hasCustomIdeas"
        from profile_activities pa left join activities a on a.id=pa.activity_id where pa.user_id=$1`, [sub])
      effectiveSlugs = slugsForSavedCategories(saved.rows[0]?.categories || [], saved.rows[0]?.hasCustomIdeas === true)
    }
    if (!effectiveSlugs.length) effectiveSlugs = categoryEntries.map(([slug]) => slug)

    const selectedCategories = [...new Set(effectiveSlugs.flatMap(slug => discoveryCategories[slug].databaseCategories))]
    const includeCustomIdeas = effectiveSlugs.includes('your-ideas')
    const cursorRank = cursor?.rank ?? null

    const candidates = await database.query(`select p.slug,p.display_name as name,p.updated_at::text as "sortAt",
    extract(year from age(current_date,p.date_of_birth))::int as age,
    coalesce(p.location_label,p.postcode_area,p.neighbourhood) as place,p.bio as detail,
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl",
    filtered."activityTags",all_selected."allActivityTags",shared_exact."sharedActivityTags",
    coalesce(cardinality(shared_exact."sharedActivityTags"),0)::int as "sharedCount",${recipientInterestAvailabilitySelect},
    ${discoveryDistanceSelect}
    from profiles p join users u on u.id=p.user_id
    ${viewerDiscoveryJoins}
    left join lateral (select coalesce(thumbnail_storage_key,storage_key) as storage_key,public_url
      from profile_photos where user_id=p.user_id order by position limit 1) photo on true
    join lateral (select array_agg(coalesce(a.name,pa.custom_label) order by pa.position) as "activityTags"
      from profile_activities pa left join activities a on a.id=pa.activity_id
      where pa.user_id=p.user_id and (
        (a.is_active=true and a.category=any($1::text[])) or pa.custom_category=any($1::text[])
        or ($3::boolean and pa.custom_label is not null)
      )) filtered on cardinality(filtered."activityTags")>0
    left join lateral (select array_agg(coalesce(a.name,pa.custom_label) order by pa.position) as "allActivityTags"
      from profile_activities pa left join activities a on a.id=pa.activity_id
      where pa.user_id=p.user_id and ((a.id is not null and a.is_active=true) or pa.custom_label is not null)) all_selected on true
    left join lateral (select array_agg(coalesce(a.name,pa.custom_label) order by pa.position) as "sharedActivityTags"
      from profile_activities pa left join activities a on a.id=pa.activity_id
      where pa.user_id=p.user_id and exists (
        select 1 from profile_activities mine_pa left join activities mine_a on mine_a.id=mine_pa.activity_id
        where mine_pa.user_id=$2 and lower(coalesce(mine_a.name,mine_pa.custom_label))=lower(coalesce(a.name,pa.custom_label))
      )) shared_exact on true
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
      and ($4::int is null or (coalesce(cardinality(shared_exact."sharedActivityTags"),0),p.updated_at,p.slug)<($4::int,$5::timestamptz,$6::text))
    order by coalesce(cardinality(shared_exact."sharedActivityTags"),0) desc,p.updated_at desc,p.slug desc limit $7`,
    [selectedCategories,sub,includeCustomIdeas,cursorRank,cursor?.sortAt || null,cursor?.tieBreaker || null,pageSize+1])

    const preferenceResult = await database.query(`select mp.minimum_age as "minimumAge",mp.maximum_age as "maximumAge",
      mp.max_distance_km as "distance",mp.open_to_everyone as "openToEveryone",
      mp.interested_genders as genders,mp.no_orientation_preference as "noOrientationPreference",
      mp.interested_orientations as orientations,mp.no_ethnicity_preference as "noRacePreference",
      p.location_label as "locationLabel",p.postcode_area as "postcodeArea"
      from profiles p left join match_preferences mp on mp.user_id=p.user_id where p.user_id=$1`, [sub])
    return { candidates, preferenceResult, effectiveSlugs }
  })

  const page = pageRows(candidates.rows, pageSize, row => ({
    rank: Number(row.sharedCount || 0), sortAt: row.sortAt, tieBreaker: row.slug,
  }))
  const photoUrls = await signedPhotoUrls(page.items.map(person => person.photoStorageKey).filter(Boolean))
  const people = page.items.map(person => {
    const matchedActivityTags = (person.activityTags || []).filter(Boolean)
    const sharedActivityTags = (person.sharedActivityTags || []).filter(Boolean)
    const otherActivityTags = (person.allActivityTags || [])
      .filter((activity: string) => activity && !matchedActivityTags.includes(activity) && !sharedActivityTags.includes(activity))
    return {
      slug: person.slug, name: person.name, age: person.age,
      place: person.place || 'Location not shared', distanceKm: person.distanceKm,
      sharedActivityTags: sharedActivityTags.slice(0, 3), sharedCount: Number(person.sharedCount || 0),
      matchedActivityTags: matchedActivityTags.filter((activity: string) => !sharedActivityTags.includes(activity)).slice(0, 3),
      otherActivityTags: otherActivityTags.slice(0, 3),
      acceptingInterest: person.acceptingInterest === true,
      photoUrl: person.photoStorageKey ? photoUrls.get(person.photoStorageKey) : person.legacyPhotoUrl || null,
    }
  })
  const preferences = normalizeDiscoveryPreferences(preferenceResult.rows[0])
  const searchLocation = [preferences.locationLabel, preferences.postcodeArea].filter((value, index, values) =>
    Boolean(value) && values.indexOf(value) === index).join(' · ') || null

  return {
    people, nextCursor: page.nextCursor, hasMore: page.hasMore,
    selectedCategories: requestedSlugs, effectiveCategories: effectiveSlugs,
    filters: {
      minimumAge: preferences.minimumAge, maximumAge: preferences.maximumAge, distance: preferences.distance,
      genderLabel: preferences.openToEveryone ? 'All genders' : preferences.genders.join(', '),
      orientationLabel: preferences.noOrientationPreference ? 'Any orientation' : `${preferences.orientations.length} orientation ${preferences.orientations.length === 1 ? 'choice' : 'choices'}`,
      racialPreferencesApplied: preferences.noRacePreference === false, searchLocation,
    },
  }
})
