import { getQuery, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { decodeCursor, pageRows } from '~/server/utils/cursorPagination'
import { badRequest, text } from '~/server/utils/productValidation'

const venueCategories = new Set(['cafe','restaurant','bar','activity','culture','wellness','other'])

export default defineEventHandler(async (event) => {
  await requireUser(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const query = getQuery(event)
  const search = text(query.q, 'Search', 80)
  const location = text(query.location, 'Location', 80)
  const category = text(query.category, 'Category', 30)
  const discountType = text(query.discountType, 'Discount type', 20)
  if (category && !venueCategories.has(category)) badRequest('Choose a valid offer category')
  if (discountType && !['percentage','fixed'].includes(discountType)) badRequest('Choose a valid discount type')
  const cursor = decodeCursor(query.cursor)
  let cursorRank: number | null = null
  let cursorId: string | null = null
  if (cursor) {
    const [rank, id] = cursor.tieBreaker.split(':')
    cursorRank = Number(rank)
    cursorId = id
    if (![0,1].includes(cursorRank) || !/^[0-9a-f-]{36}$/i.test(cursorId || '')) badRequest('Invalid pagination cursor')
  }
  const pageSize = 20
  const { rows } = await db.query(`with available_offers as (
    select o.id,o.title,o.description,o.discount_type as "discountType",
      o.discount_value::float as "discountValue",o.terms,o.starts_at as "startsAt",o.ends_at as "endsAt",
      o.created_at as "createdAt",b.name as "businessName",o.venue_scope as "venueScope",
      locations."locationCount",locations.venues,locations.categories,locations."locationSearch",
      locations.venues->0->>'name' as "venueName",locations.venues->0->>'category' as category,
      locations.venues->0->>'city' as city,
      case when exists(select 1 from business_subscriptions bs where bs.business_id=b.id
        and bs.plan='featured' and bs.subscription_status in ('active','trialing','past_due')) then 0 else 1 end as "featuredRank"
    from business_offers o join businesses b on b.id=o.business_id
    join lateral (
      select count(*)::int as "locationCount",
        coalesce(json_agg(json_build_object('id',eligible.id,'name',eligible.name,'category',eligible.category,
          'city',eligible.city,'postcode',eligible.postcode) order by eligible.name,eligible.id)
          filter(where eligible.preview_position<=5),'[]'::json) as venues,
        coalesce(array_agg(distinct eligible.category),'{}'::text[]) as categories,
        coalesce(string_agg(concat_ws(' ',eligible.name,eligible.city,eligible.postcode),' '),'') as "locationSearch"
      from (
        select v.id,v.name,v.category,v.city,v.postcode,
          row_number() over(order by v.name,v.id) as preview_position
        from business_venues v
        where v.business_id=o.business_id and v.status='active' and (
          o.venue_scope='all' or
          (o.venue_scope='single' and v.id=o.venue_id) or
          (o.venue_scope='selected' and exists(select 1 from business_offer_venues ov
            where ov.offer_id=o.id and ov.venue_id=v.id))
        )
      ) eligible
    ) locations on locations."locationCount">0
    where o.approval_status='approved' and o.active=true and b.status='active'
      and (o.starts_at is null or o.starts_at<=now()) and (o.ends_at is null or o.ends_at>now())
  )
  select * from available_offers
  where ($1::text is null or concat_ws(' ',title,description,"businessName","locationSearch") ilike '%'||$1||'%')
    and ($2::text is null or $2=any(categories))
    and ($3::text is null or "locationSearch" ilike '%'||$3||'%')
    and ($4::text is null or "discountType"=$4)
    and ($5::int is null or "featuredRank">$5 or ("featuredRank"=$5
      and ("createdAt",id::text)<($6::timestamptz,$7::text)))
  order by "featuredRank","createdAt" desc,id::text desc
  limit $8`, [search,category,location,discountType,cursorRank,cursor?.sortAt ?? null,
    cursorId,pageSize + 1])
  const page = pageRows(rows, pageSize, row => ({
    sortAt: new Date(row.createdAt).toISOString(),
    tieBreaker: `${row.featuredRank}:${row.id}`,
  }))
  return {
    offers: page.items.map(({ featuredRank: _featuredRank, createdAt: _createdAt,
      categories: _categories, locationSearch: _locationSearch, ...offer }) => offer),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  }
})
