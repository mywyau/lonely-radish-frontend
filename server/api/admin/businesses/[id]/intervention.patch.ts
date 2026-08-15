import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireAdmin } from '~/server/utils/requireAdmin'
import { objectBody, text } from '~/server/utils/productValidation'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const actions = new Set(['pause', 'restore'])

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const businessId = getRouterParam(event, 'id') || ''
  if (!uuidPattern.test(businessId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid business' })
  }

  const body = objectBody(await readBody(event))
  const action = text(body.action, 'Intervention action', 20, true)!
  const reason = text(body.reason, 'Private intervention reason', 500, true)!
  if (!actions.has(action)) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a valid intervention action' })
  }

  const client = await db.connect()
  try {
    await client.query('begin')
    const currentResult = await client.query<{ id: string; status: string }>(
      'select id,status from businesses where id=$1 for update',
      [businessId],
    )
    const current = currentResult.rows[0]
    if (!current) throw createError({ statusCode: 404, statusMessage: 'Business not found' })

    const expectedStatus = action === 'pause' ? 'active' : 'paused'
    if (current.status !== expectedStatus) {
      throw createError({
        statusCode: 409,
        statusMessage: action === 'pause'
          ? 'Only an active business can be paused'
          : 'Only an intervention-paused business can be restored',
      })
    }

    const nextStatus = action === 'pause' ? 'paused' : 'active'
    await client.query(
      'update businesses set status=$2,updated_at=now() where id=$1',
      [businessId, nextStatus],
    )

    let disabledOfferCount = 0
    let revokedClaimCount = 0
    if (action === 'pause') {
      const disabledOffers = await client.query(
        `update business_offers set active=false,updated_at=now()
        where business_id=$1 and active=true`,
        [businessId],
      )
      disabledOfferCount = disabledOffers.rowCount || 0

      const revokedClaims = await client.query(
        `update business_offer_claims claim set status='revoked'
        from business_offers offer
        where claim.offer_id=offer.id and offer.business_id=$1 and claim.status='issued'`,
        [businessId],
      )
      revokedClaimCount = revokedClaims.rowCount || 0
    }

    await client.query(
      `insert into admin_review_events(reviewer_id,entity_type,entity_id,decision,note)
      values($1,'business',$2,$3,$4)`,
      [admin.sub, businessId, action === 'pause' ? 'paused' : 'restored', reason],
    )
    await client.query('commit')

    return {
      business: { id: businessId, status: nextStatus },
      disabledOfferCount,
      revokedClaimCount,
    }
  } catch (error) {
    try { await client.query('rollback') } catch { /* Preserve the original error. */ }
    throw error
  } finally {
    client.release()
  }
})
