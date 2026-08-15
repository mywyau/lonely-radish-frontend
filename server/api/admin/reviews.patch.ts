import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireAdmin } from '~/server/utils/requireAdmin'
import { objectBody, text } from '~/server/utils/productValidation'

const entityTypes = new Set(['business','venue','offer'])
const decisions = new Set(['pending','approved','rejected'])

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = objectBody(await readBody(event))
  const entityType = text(body.entityType, 'Review type', 20, true)!
  const entityId = text(body.entityId, 'Review target', 50, true)!
  const decision = text(body.decision, 'Decision', 20, true)!
  const note = text(body.note, 'Review note', 500)
  if (!entityTypes.has(entityType) || !decisions.has(decision)) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a valid review decision' })
  }
  const client = await db.connect()
  try {
    await client.query('begin')
    let result
    if (entityType === 'business') {
      const status = decision === 'approved' ? 'active' : decision === 'rejected' ? 'suspended' : 'pending'
      result = await client.query(`update businesses set status=$2,reviewed_by=$3,
        reviewed_at=case when $2='pending' then null else now() end,updated_at=now()
        where id=$1 and status<>'paused' returning id,status`, [entityId,status,admin.sub])
      if (!result.rows[0]) {
        const current = await client.query('select status from businesses where id=$1', [entityId])
        if (current.rows[0]?.status === 'paused') {
          throw createError({
            statusCode: 409,
            statusMessage: 'Restore this business through the intervention control',
          })
        }
      }
      if (status !== 'active') {
        await client.query(`update business_offers set active=false,updated_at=now()
          where business_id=$1 and active=true`, [entityId])
      }
    } else if (entityType === 'venue') {
      const status = decision === 'approved' ? 'active' : decision === 'rejected' ? 'rejected' : 'pending'
      result = await client.query(`update business_venues set status=$2,reviewed_by=$3,
        reviewed_at=case when $2='pending' then null else now() end,
        rejection_note=case when $2='rejected' then $4 else null end,updated_at=now()
        where id=$1 and status<>'archived' returning id,status,business_id as "businessId"`, [entityId,status,admin.sub,note])
      if (status !== 'active' && result.rows[0]) {
        await client.query(`update business_offers offer set active=false,updated_at=now()
          where offer.business_id=$1 and offer.active=true and not exists(
            select 1 from business_venues venue
            where venue.business_id=offer.business_id and venue.status='active' and (
              offer.venue_scope='all'
              or (offer.venue_scope='single' and venue.id=offer.venue_id)
              or (offer.venue_scope='selected' and exists(select 1 from business_offer_venues selected
                where selected.offer_id=offer.id and selected.venue_id=venue.id))
            ))`, [result.rows[0].businessId])
      }
    } else {
      result = await client.query(`update business_offers set approval_status=$2,reviewed_by=$3,
        reviewed_at=case when $2='pending' then null else now() end,
        rejection_note=case when $2='rejected' then $4 else null end,
        active=case when $2='approved' then active else false end,updated_at=now()
        where id=$1 and approval_status<>'archived'
        returning id,approval_status as "approvalStatus"`, [entityId,decision,admin.sub,note])
    }
    if (!result.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Review target not found' })
    await client.query(`insert into admin_review_events(reviewer_id,entity_type,entity_id,decision,note)
      values($1,$2,$3,$4,$5)`, [admin.sub,entityType,entityId,decision,note])
    await client.query('commit')
    return { review: result.rows[0] }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
})
