import { getQuery, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireAdmin } from '~/server/utils/requireAdmin'
import { decodeCursor, pageRows } from '~/server/utils/cursorPagination'
import { badRequest, text } from '~/server/utils/productValidation'

const entityTypes = new Set(['business', 'venue', 'offer'])
const reviewStatuses = new Set(['all', 'pending', 'approved', 'rejected'])
const ageFilters = new Set(['all', 'day', 'week', 'month'])

function databaseStatus(entityType: string, status: string) {
  if (status === 'all') return null
  if (entityType === 'business') return status === 'approved' ? 'active' : status === 'rejected' ? 'suspended' : 'pending'
  if (entityType === 'venue') return status === 'approved' ? 'active' : status === 'rejected' ? 'rejected' : 'pending'
  return status
}

function normalizedStatus(entityType: string, status: string) {
  if (entityType === 'business') return status === 'active' ? 'approved' : status === 'suspended' ? 'rejected' : 'pending'
  if (entityType === 'venue') return status === 'active' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending'
  return status
}

function submittedAfter(age: string) {
  const durations: Record<string, number> = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  }
  return age === 'all' ? null : new Date(Date.now() - durations[age]).toISOString()
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const query = getQuery(event)
  const entityType = text(query.entityType, 'Approval type', 20) || 'business'
  const status = text(query.status, 'Approval status', 20) || 'pending'
  const age = text(query.age, 'Submission date', 20) || 'all'
  const search = text(query.q, 'Search', 80)
  if (!entityTypes.has(entityType)) badRequest('Choose a valid approval type')
  if (!reviewStatuses.has(status)) badRequest('Choose a valid approval status')
  if (!ageFilters.has(age)) badRequest('Choose a valid submission date')
  const cursor = decodeCursor(query.cursor)
  if (cursor && !/^[0-9a-f-]{36}$/i.test(cursor.tieBreaker)) badRequest('Invalid pagination cursor')

  const pageSize = 25
  const params = [
    search,
    databaseStatus(entityType, status),
    submittedAfter(age),
    cursor?.sortAt || null,
    cursor?.tieBreaker || null,
    pageSize + 1,
  ]

  const countsPromise = db.query(`select
    (select count(*)::int from businesses where status='pending') as businesses,
    (select count(*)::int from business_venues where status='pending') as venues,
    (select count(*)::int from business_offers where approval_status='pending') as offers`)

  let rows
  if (entityType === 'business') {
    ;({ rows } = await db.query(`select b.id,b.name,b.slug,b.contact_email as "contactEmail",
      b.status as "databaseStatus",b.created_at as "createdAt",b.reviewed_at as "reviewedAt",
      reviewer.email as "reviewedBy",
      (select count(*)::int from business_venues v where v.business_id=b.id and v.status<>'archived') as "venueCount",
      (select count(*)::int from business_offers o where o.business_id=b.id and o.approval_status<>'archived') as "offerCount",
      latest.note as "latestReviewNote"
      from businesses b
      left join users reviewer on reviewer.id=b.reviewed_by
      left join lateral (select e.note from admin_review_events e
        where e.entity_type='business' and e.entity_id=b.id order by e.created_at desc limit 1) latest on true
      where b.status<>'draft'
        and ($1::text is null or concat_ws(' ',b.name,b.slug,b.contact_email) ilike '%'||$1||'%')
        and ($2::text is null or b.status=$2)
        and ($3::timestamptz is null or b.created_at >= $3)
        and ($4::timestamptz is null or (b.created_at,b.id::text)<($4,$5::text))
      order by b.created_at desc,b.id::text desc limit $6`, params))
  } else if (entityType === 'venue') {
    ;({ rows } = await db.query(`select v.id,v.name,v.category,v.address_line as "addressLine",
      v.city,v.postcode,v.status as "databaseStatus",v.created_at as "createdAt",
      v.reviewed_at as "reviewedAt",reviewer.email as "reviewedBy",
      b.id as "businessId",b.name as "businessName",b.contact_email as "contactEmail",
      (select count(*)::int from business_offers o where o.venue_id=v.id) as "offerCount",
      latest.note as "latestReviewNote"
      from business_venues v join businesses b on b.id=v.business_id
      left join users reviewer on reviewer.id=v.reviewed_by
      left join lateral (select e.note from admin_review_events e
        where e.entity_type='venue' and e.entity_id=v.id order by e.created_at desc limit 1) latest on true
      where v.status not in ('draft','archived')
        and ($1::text is null or concat_ws(' ',v.name,v.address_line,v.city,v.postcode,b.name,b.contact_email) ilike '%'||$1||'%')
        and ($2::text is null or v.status=$2)
        and ($3::timestamptz is null or v.created_at >= $3)
        and ($4::timestamptz is null or (v.created_at,v.id::text)<($4,$5::text))
      order by v.created_at desc,v.id::text desc limit $6`, params))
  } else {
    ;({ rows } = await db.query(`select o.id,o.title,o.description,o.discount_type as "discountType",
      o.discount_value::float as "discountValue",o.terms,o.active,o.starts_at as "startsAt",
      o.ends_at as "endsAt",o.venue_scope as "venueScope",
      o.approval_status as "databaseStatus",o.created_at as "createdAt",
      o.reviewed_at as "reviewedAt",reviewer.email as "reviewedBy",
      b.id as "businessId",b.name as "businessName",b.contact_email as "contactEmail",
      v.name as "venueName",v.city,v.postcode,
      case when o.venue_scope='all' then (select count(*)::int from business_venues all_v where all_v.business_id=o.business_id)
        when o.venue_scope='selected' then (select count(*)::int from business_offer_venues ov where ov.offer_id=o.id)
        else 1 end as "locationCount",
      coalesce(latest.note,o.rejection_note) as "latestReviewNote"
      from business_offers o join businesses b on b.id=o.business_id
      join business_venues v on v.id=o.venue_id
      left join users reviewer on reviewer.id=o.reviewed_by
      left join lateral (select e.note from admin_review_events e
        where e.entity_type='offer' and e.entity_id=o.id order by e.created_at desc limit 1) latest on true
      where o.approval_status not in ('draft','archived')
        and ($1::text is null or concat_ws(' ',o.title,o.description,o.terms,b.name,b.contact_email,v.name,v.city,v.postcode) ilike '%'||$1||'%')
        and ($2::text is null or o.approval_status=$2)
        and ($3::timestamptz is null or o.created_at >= $3)
        and ($4::timestamptz is null or (o.created_at,o.id::text)<($4,$5::text))
      order by o.created_at desc,o.id::text desc limit $6`, params))
  }

  const [countsResult, page] = await Promise.all([
    countsPromise,
    Promise.resolve(pageRows(rows, pageSize, row => ({
      sortAt: new Date(row.createdAt).toISOString(),
      tieBreaker: row.id,
    }))),
  ])
  return {
    items: page.items.map((item) => ({
      ...item,
      entityType,
      status: normalizedStatus(entityType, item.databaseStatus),
      databaseStatus: undefined,
    })),
    pendingCounts: countsResult.rows[0],
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  }
})
