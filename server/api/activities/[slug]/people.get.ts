import { createError, getRouterParam, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrl } from '~/server/utils/supabaseStorage'
import { discoveryCategory } from '~/utils/activityDiscovery'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const slug = getRouterParam(event, 'slug') || ''
  const category = discoveryCategory(slug)
  if (!category) throw createError({ statusCode: 404, statusMessage: 'Category not found' })

  const { rows } = await db.query(`select p.slug,p.display_name as name,
    extract(year from age(current_date,p.date_of_birth))::int as age,p.neighbourhood as place,p.bio as detail,
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl",shared."activityTags"
    ,exists(select 1 from daily_interests di where di.sender_id=$2 and di.recipient_id=p.user_id) as "interestSent"
    from profiles p join users u on u.id=p.user_id
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
    order by p.updated_at desc limit 30`, [category.databaseCategories,sub])

  const people = await Promise.all(rows.map(async person => ({
    slug: person.slug, name: person.name, age: person.age, place: person.place || 'Nearby',
    detail: person.detail || `Interested in ${category.name.toLowerCase()} activities.`,
    activityTags: person.activityTags || [], reason: 'Selected interests', interestSent: person.interestSent === true, photoUrl: person.photoStorageKey
      ? await signedPhotoUrl(person.photoStorageKey) : person.legacyPhotoUrl || null,
  })))
  return { activityName: category.name, categoryName: category.name, people }
})
