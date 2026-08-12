import { createError } from 'h3'
import type { Database, DatabaseClient } from '../repositories/db'
import type {
  BusinessOfferSubmissionRequest,
  BusinessSubmissionAction,
  BusinessVenueSubmissionRequest,
} from '../../types/api/businessSubmissions'

type VenueRow = BusinessVenueSubmissionRequest & {
  id: string
  businessId: string
  status: string
  revision: number
  rejectionNote: string | null
  archivedAt: string | null
}

type OfferRow = {
  id: string
  businessId: string
  venueId: string
  venueScope: BusinessOfferSubmissionRequest['venueScope']
  title: string
  description: string | null
  discountType: BusinessOfferSubmissionRequest['discountType']
  discountValue: number
  terms: string | null
  redemptionLimitTotal: number | null
  redemptionLimitPerUser: number
  approvalStatus: string
  active: boolean
  revision: number
  rejectionNote: string | null
  archivedAt: string | null
}

async function recordVersion(
  client: DatabaseClient,
  input: { businessId: string; entityType: 'venue' | 'offer'; entityId: string; revision: number;
    action: 'material_edit' | 'operational_edit' | BusinessSubmissionAction; actorId: string; snapshot: unknown },
) {
  await client.query(`insert into business_submission_versions
    (business_id,entity_type,entity_id,revision,action,changed_by,snapshot)
    values($1,$2,$3,$4,$5,$6,$7::jsonb)`,
  [input.businessId, input.entityType, input.entityId, input.revision, input.action,
    input.actorId, JSON.stringify(input.snapshot)])
}

async function takeOffersWithoutApprovedVenueOffline(client: DatabaseClient, businessId: string) {
  await client.query(`update business_offers offer set active=false,updated_at=now()
    where offer.business_id=$1 and offer.active=true and not exists(
      select 1 from business_venues venue
      where venue.business_id=offer.business_id and venue.status='active' and (
        offer.venue_scope='all'
        or (offer.venue_scope='single' and venue.id=offer.venue_id)
        or (offer.venue_scope='selected' and exists(select 1 from business_offer_venues selected
          where selected.offer_id=offer.id and selected.venue_id=venue.id))
      ))`, [businessId])
}

export async function updateVenueSubmission(
  database: Database,
  input: { businessId: string; venueId: string; actorId: string; submission: BusinessVenueSubmissionRequest },
) {
  const client = await database.connect()
  try {
    await client.query('begin')
    const result = await client.query<VenueRow>(`select id,business_id as "businessId",name,category,
      address_line as "addressLine",city,postcode,status,revision,rejection_note as "rejectionNote",
      archived_at as "archivedAt" from business_venues where id=$1 and business_id=$2 for update`,
    [input.venueId, input.businessId])
    const existing = result.rows[0]
    if (!existing) throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
    const duplicate = await client.query(`select 1 from business_venues where business_id=$1 and id<>$2
      and status<>'archived' and lower(name)=lower($3)
      and replace(upper(postcode),' ','')=replace(upper($4),' ','') limit 1`,
    [input.businessId, input.venueId, input.submission.name, input.submission.postcode])
    if (duplicate.rows[0]) throw createError({ statusCode: 409, statusMessage: 'A venue with this name and postcode already exists' })
    const changed = existing.name !== input.submission.name || existing.category !== input.submission.category
      || existing.addressLine !== input.submission.addressLine || existing.city !== input.submission.city
      || existing.postcode !== input.submission.postcode
    if (!changed) {
      await client.query('commit')
      return { venue: existing, approvalReset: false }
    }
    await recordVersion(client, { businessId: input.businessId, entityType: 'venue', entityId: existing.id,
      revision: existing.revision, action: 'material_edit', actorId: input.actorId, snapshot: existing })
    const updated = await client.query(`update business_venues set name=$3,category=$4,address_line=$5,
      city=$6,postcode=$7,status='draft',reviewed_by=null,reviewed_at=null,rejection_note=null,
      archived_at=null,submitted_at=null,revision=revision+1,updated_at=now()
      where id=$1 and business_id=$2 returning id,name,category,address_line as "addressLine",city,postcode,
      status,revision,rejection_note as "rejectionNote",archived_at as "archivedAt"`,
    [input.venueId, input.businessId, input.submission.name, input.submission.category,
      input.submission.addressLine, input.submission.city, input.submission.postcode])
    await takeOffersWithoutApprovedVenueOffline(client, input.businessId)
    await client.query('commit')
    return { venue: updated.rows[0], approvalReset: true }
  } catch (error) {
    try { await client.query('rollback') } catch { /* Preserve original error. */ }
    throw error
  } finally { client.release() }
}

export async function transitionVenueSubmission(
  database: Database,
  input: { businessId: string; venueId: string; actorId: string; action: BusinessSubmissionAction },
) {
  const client = await database.connect()
  try {
    await client.query('begin')
    const result = await client.query<VenueRow>(`select id,business_id as "businessId",name,category,
      address_line as "addressLine",city,postcode,status,revision,rejection_note as "rejectionNote",
      archived_at as "archivedAt" from business_venues where id=$1 and business_id=$2 for update`,
    [input.venueId, input.businessId])
    const existing = result.rows[0]
    if (!existing) throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
    if (input.action === 'resubmit' && !['draft', 'rejected', 'archived'].includes(existing.status)) {
      throw createError({ statusCode: 409, statusMessage: 'Only draft, rejected or archived venues can be submitted' })
    }
    if (input.action === 'archive' && existing.status === 'archived') {
      await client.query('commit')
      return { venue: existing, unchanged: true }
    }
    await recordVersion(client, { businessId: input.businessId, entityType: 'venue', entityId: existing.id,
      revision: existing.revision, action: input.action, actorId: input.actorId, snapshot: existing })
    const status = input.action === 'archive' ? 'archived' : 'pending'
    const updated = await client.query(`update business_venues set status=$3,
      archived_at=case when $3='archived' then now() else null end,
      submitted_at=case when $3='pending' then now() else submitted_at end,
      reviewed_by=null,reviewed_at=null,rejection_note=null,revision=revision+1,updated_at=now()
      where id=$1 and business_id=$2 returning id,name,category,address_line as "addressLine",city,postcode,
      status,revision,rejection_note as "rejectionNote",archived_at as "archivedAt"`,
    [input.venueId, input.businessId, status])
    if (status === 'archived') await takeOffersWithoutApprovedVenueOffline(client, input.businessId)
    await client.query('commit')
    return { venue: updated.rows[0], unchanged: false }
  } catch (error) {
    try { await client.query('rollback') } catch { /* Preserve original error. */ }
    throw error
  } finally { client.release() }
}

async function loadOfferForUpdate(client: DatabaseClient, offerId: string, businessId: string) {
  const result = await client.query<OfferRow>(`select id,business_id as "businessId",venue_id as "venueId",
    venue_scope as "venueScope",title,description,discount_type as "discountType",
    discount_value::float as "discountValue",terms,redemption_limit_total as "redemptionLimitTotal",
    redemption_limit_per_user as "redemptionLimitPerUser",approval_status as "approvalStatus",active,
    revision,rejection_note as "rejectionNote",archived_at as "archivedAt"
    from business_offers where id=$1 and business_id=$2 for update`, [offerId, businessId])
  const offer = result.rows[0]
  if (!offer) throw createError({ statusCode: 404, statusMessage: 'Offer not found' })
  const venues = await client.query<{ id: string }>(`select venue_id as id from business_offer_venues
    where offer_id=$1 order by venue_id`, [offerId])
  return { offer, venueIds: venues.rows.map(row => row.id) }
}

export async function updateOfferSubmission(
  database: Database,
  input: { businessId: string; offerId: string; actorId: string; submission: BusinessOfferSubmissionRequest },
) {
  const client = await database.connect()
  try {
    await client.query('begin')
    const { offer, venueIds: existingVenueIds } = await loadOfferForUpdate(client, input.offerId, input.businessId)
    const requestedVenueIds = input.submission.venueScope === 'single' ? [input.submission.venueId!]
      : input.submission.venueScope === 'selected' ? [...(input.submission.venueIds || [])] : []
    const venues = requestedVenueIds.length ? await client.query<{ id: string }>(`select id from business_venues
      where business_id=$1 and status<>'archived' and id=any($2::uuid[])`, [input.businessId, requestedVenueIds])
      : await client.query<{ id: string }>(`select id from business_venues where business_id=$1
        and status<>'archived' order by created_at,id limit 1`, [input.businessId])
    const owned = new Set(venues.rows.map(row => row.id))
    if (!venues.rows[0] || requestedVenueIds.some(id => !owned.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Choose venues belonging to this business' })
    }
    const sortedRequested = [...requestedVenueIds].sort()
    const moderationChanged = offer.title !== input.submission.title
      || offer.description !== (input.submission.description || null)
      || offer.discountType !== input.submission.discountType || Number(offer.discountValue) !== input.submission.discountValue
      || offer.terms !== (input.submission.terms || null) || offer.venueScope !== input.submission.venueScope
      || JSON.stringify(existingVenueIds) !== JSON.stringify(sortedRequested)
    const operationalChanged = offer.redemptionLimitTotal !== (input.submission.redemptionLimitTotal ?? null)
      || offer.redemptionLimitPerUser !== (input.submission.redemptionLimitPerUser ?? 1)
    if (!moderationChanged && !operationalChanged) {
      await client.query('commit')
      return { offer, approvalReset: false }
    }
    await recordVersion(client, { businessId: input.businessId, entityType: 'offer', entityId: offer.id,
      revision: offer.revision, action: moderationChanged ? 'material_edit' : 'operational_edit',
      actorId: input.actorId, snapshot: { ...offer, venueIds: existingVenueIds } })
    const primaryVenueId = requestedVenueIds[0] || venues.rows[0].id
    const updated = await client.query(`update business_offers set venue_id=$3,venue_scope=$4,title=$5,
      description=$6,discount_type=$7,discount_value=$8,terms=$9,redemption_limit_total=$10,
      redemption_limit_per_user=$11,approval_status=case when $12 then 'draft' else approval_status end,
      active=case when $12 then false else active end,reviewed_by=case when $12 then null else reviewed_by end,
      reviewed_at=case when $12 then null else reviewed_at end,
      rejection_note=case when $12 then null else rejection_note end,
      archived_at=case when $12 then null else archived_at end,
      submitted_at=case when $12 then null else submitted_at end,revision=revision+1,updated_at=now()
      where id=$1 and business_id=$2 returning id,title,description,discount_type as "discountType",
      discount_value::float as "discountValue",terms,active,approval_status as "approvalStatus",
      venue_scope as "venueScope",redemption_limit_total as "redemptionLimitTotal",
      redemption_limit_per_user as "redemptionLimitPerUser",revision,rejection_note as "rejectionNote",
      archived_at as "archivedAt"`,
    [input.offerId, input.businessId, primaryVenueId, input.submission.venueScope, input.submission.title,
      input.submission.description || null, input.submission.discountType, input.submission.discountValue,
      input.submission.terms || null, input.submission.redemptionLimitTotal ?? null,
      input.submission.redemptionLimitPerUser ?? 1, moderationChanged])
    if (moderationChanged) {
      await client.query(`delete from business_offer_venues where offer_id=$1`, [input.offerId])
      if (input.submission.venueScope !== 'all') await client.query(`insert into business_offer_venues
        (offer_id,business_id,venue_id) select $1,$2,selected.venue_id
        from unnest($3::uuid[]) selected(venue_id)`, [input.offerId, input.businessId, requestedVenueIds])
    }
    await client.query('commit')
    return { offer: { ...updated.rows[0], venueIds: requestedVenueIds }, approvalReset: moderationChanged }
  } catch (error) {
    try { await client.query('rollback') } catch { /* Preserve original error. */ }
    throw error
  } finally { client.release() }
}

export async function transitionOfferSubmission(
  database: Database,
  input: { businessId: string; offerId: string; actorId: string; action: BusinessSubmissionAction },
) {
  const client = await database.connect()
  try {
    await client.query('begin')
    const { offer, venueIds } = await loadOfferForUpdate(client, input.offerId, input.businessId)
    if (input.action === 'resubmit' && !['draft', 'rejected', 'archived'].includes(offer.approvalStatus)) {
      throw createError({ statusCode: 409, statusMessage: 'Only draft, rejected or archived offers can be submitted' })
    }
    if (input.action === 'archive' && offer.approvalStatus === 'archived') {
      await client.query('commit')
      return { offer, unchanged: true }
    }
    await recordVersion(client, { businessId: input.businessId, entityType: 'offer', entityId: offer.id,
      revision: offer.revision, action: input.action, actorId: input.actorId, snapshot: { ...offer, venueIds } })
    const status = input.action === 'archive' ? 'archived' : 'pending'
    const updated = await client.query(`update business_offers set approval_status=$3,active=false,
      archived_at=case when $3='archived' then now() else null end,
      submitted_at=case when $3='pending' then now() else submitted_at end,
      reviewed_by=null,reviewed_at=null,rejection_note=null,revision=revision+1,updated_at=now()
      where id=$1 and business_id=$2 returning id,title,approval_status as "approvalStatus",active,
      revision,rejection_note as "rejectionNote",archived_at as "archivedAt"`,
    [input.offerId, input.businessId, status])
    await client.query('commit')
    return { offer: updated.rows[0], unchanged: false }
  } catch (error) {
    try { await client.query('rollback') } catch { /* Preserve original error. */ }
    throw error
  } finally { client.release() }
}
