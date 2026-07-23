import { createError, getQuery, getRouterParam, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrl } from '~/server/utils/supabaseStorage'
import { discoveryCategory } from '~/utils/activityDiscovery'
import { discoveryDistanceSelect, viewerDiscoveryJoins, viewerDiscoveryWhere } from '~/server/utils/discoveryFilters'
import { decodeCursor, pageRows } from '~/server/utils/cursorPagination'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const slug = getRouterParam(event, 'slug') || ''
  const category = discoveryCategory(slug)
  if (!category) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  const cursor = decodeCursor(getQuery(event).cursor)
  const pageSize = 20

  const [candidates, preferenceResult] = await Promise.all([
    db.query(`select p.slug,p.display_name as name,p.updated_at::text as "sortAt",
    extract(year from age(current_date,p.date_of_birth))::int as age,p.neighbourhood as place,p.bio as detail,
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl",shared."activityTags",
    ${discoveryDistanceSelect}
    ,exists(select 1 from daily_interests di where di.sender_id=$2 and di.recipient_id=p.user_id) as "interestSent"
    from profiles p join users u on u.id=p.user_id
    ${viewerDiscoveryJoins}
    left join lateral (select storage_key,public_url from profile_photos where user_id=p.user_id order by position limit 1) photo on true
    join lateral (select array_agg(coalesce(a.name,pa.custom_label) order by pa.position) as "activityTags"
      from profile_activities pa left join activities a on a.id=pa.activity_id
      where pa.user_id=p.user_id and ((a.is_active=true and a.category=any($1::text[])) or
        pa.custom_category=any($1::text[]))) shared on cardinality(shared."activityTags")>0
    where p.user_id<>$2
      and p.visibility='active' and (u.account_status='active' or
        (u.account_status='paused' and u.paused_until is not null and u.paused_until<=now()))
      and not exists(select 1 from blocks b where
        (b.blocker_id=$2 and b.blocked_id=p.user_id) or (b.blocker_id=p.user_id and b.blocked_id=$2))
      and not exists(select 1 from matches m where m.status='active' and
        ((m.user_one_id=$2 and m.user_two_id=p.user_id) or (m.user_two_id=$2 and m.user_one_id=p.user_id)))
      ${viewerDiscoveryWhere}
      and ($3::timestamptz is null or (p.updated_at,p.slug)<($3::timestamptz,$4::text))
    order by p.updated_at desc,p.slug desc limit $5`, [category.databaseCategories,sub,cursor?.sortAt || null,cursor?.tieBreaker || null,pageSize+1]),
    db.query(`select minimum_age as "minimumAge",maximum_age as "maximumAge",max_distance_km as "distance",
      open_to_everyone as "openToEveryone",interested_genders as genders,
      no_ethnicity_preference as "noRacePreference" from match_preferences where user_id=$1`, [sub]),
  ])

  const page = pageRows(candidates.rows, pageSize, row => ({ sortAt: row.sortAt, tieBreaker: row.slug }))
  const people = await Promise.all(page.items.map(async person => ({
    slug: person.slug, name: person.name, age: person.age,
    place: person.distanceKm != null ? `${person.distanceKm} km away` : person.place || 'Nearby',
    detail: person.detail || `Interested in ${category.name.toLowerCase()} activities.`,
    activityTags: person.activityTags || [], reason: 'Selected interests', interestSent: person.interestSent === true, photoUrl: person.photoStorageKey
      ? await signedPhotoUrl(person.photoStorageKey) : person.legacyPhotoUrl || null,
  })))
  const preferences = preferenceResult.rows[0] ?? { minimumAge: 18, maximumAge: 100, distance: 10, openToEveryone: true, genders: [], noRacePreference: true }
  return {
    activityName: category.name, categoryName: category.name, people,
    nextCursor: page.nextCursor, hasMore: page.hasMore,
    filters: {
      minimumAge: preferences.minimumAge, maximumAge: preferences.maximumAge, distance: preferences.distance,
      genderLabel: preferences.openToEveryone ? 'Everyone' : preferences.genders.join(', '),
      racialPreferencesApplied: preferences.noRacePreference === false,
    },
  }
})
